A server on a network can be reached by anything that can reach its address. A **firewall** decides which of those packets are let in and which are thrown away, so that only the services you mean to offer can be reached. Most "it works from here but not from there" problems end at a firewall rule somewhere.

This topic explains how a Linux firewall looks at packets, using iptables on beta, and then locks beta down one step at a time. By the end you can read a rule set, say which rule a packet will hit, build a default-deny rule set that allows only SSH and HTTP, avoid the order mistakes that lock you out, and save the rules so they can be restored.

## Packet filtering

A **packet filter** looks at each packet's headers, compares them with a list of **rules**, and acts on the first rule that matches. The headers carry everything earlier topics introduced: source and destination IP address, protocol (TCP, UDP or ICMP), source and destination port, and the interface the packet came in on or is going out of.

Each rule pairs a **match** on some of those fields with a **target**, which is what to do with a matching packet:

| Target | Effect | What the sender sees |
| --- | --- | --- |
| `ACCEPT` | Let the packet through | A normal connection |
| `DROP` | Discard it silently | Nothing; the connection times out |
| `REJECT` | Discard it and send an error back | `Connection refused` or similar, at once |
| `LOG` | Record it and carry on to the next rule | No change |

On Linux the filtering is done by the kernel, in a part called **netfilter**. `iptables` is the long-standing command for managing its rules. You used it already for NAT in the *NAT* topic.

## Tables and chains

iptables groups rules into **tables** by purpose. The two you need are `filter`, for deciding whether a packet passes, and `nat`, for rewriting addresses. When you leave out `-t`, you get `filter`.

Inside each table, rules are kept in **chains**, and each chain is checked at a different point on a packet's way through the machine:

| Chain | Checks packets that are | Example |
| --- | --- | --- |
| `INPUT` | Arriving for this machine | alpha connecting to nginx on beta |
| `OUTPUT` | Created by this machine | beta running `curl example.com` |
| `FORWARD` | Passing through, from one interface to another | router moving a packet from `lab2` to `lab` |

A packet goes through exactly one of these in the `filter` table. On a server you mostly care about `INPUT`. On a router, `FORWARD` is the one that matters.

## Reading and changing rules

`iptables -L -n -v` lists beta's `filter` table: `-L` lists, `-n` shows numbers instead of looking up names, and `-v` adds counters and interfaces. On a fresh container it shows three empty chains, each with a **policy** of `ACCEPT`. The policy is what happens to a packet that reaches the end of a chain without matching any rule. With no rules and `ACCEPT`, everything is allowed.

Add two rules: refuse TCP port 8000, and silently drop pings from alpha. `-A` appends a rule to the end of a chain, and `-j` names the target:

```bash
root@beta:/# iptables -A INPUT -p tcp --dport 8000 -j REJECT
root@beta:/# iptables -A INPUT -s 10.10.0.2 -p icmp -j DROP
root@beta:/# iptables -L INPUT -n -v --line-numbers
Chain INPUT (policy ACCEPT 2 packets, 183 bytes)
num   pkts bytes target     prot opt in     out     source               destination
1        0     0 REJECT     6    --  *      *       0.0.0.0/0            0.0.0.0/0            tcp dpt:8000 reject-with icmp-port-unreachable
2        0     0 DROP       1    --  *      *       10.10.0.2            0.0.0.0/0
```

`prot` shows protocol numbers with `-n`: 6 is TCP, 1 is ICMP, 0 is any. `0.0.0.0/0` means any address, and `*` any interface. `-S` prints the same rules as the commands that would create them, which is the better view when you want to copy or delete one:

```bash
root@beta:/# iptables -S INPUT
-P INPUT ACCEPT
-A INPUT -p tcp -m tcp --dport 8000 -j REJECT --reject-with icmp-port-unreachable
-A INPUT -s 10.10.0.2/32 -p icmp -j DROP
```

Test both from alpha with `nc -zv`:

```bash
root@alpha:/# nc -zv -w 2 beta 8000
nc: connect to beta (10.10.0.3) port 8000 (tcp) failed: Connection refused
root@alpha:/# ping -c 2 -W 1 beta | grep loss
2 packets transmitted, 0 received, 100% packet loss, time 1012ms
```

REJECT gives an instant, clear answer. DROP gives silence. Run `iptables -L INPUT -n -v` again and the `pkts` counters show which rule each packet hit. To delete a rule, give `-D` either its line number or the same spec you added it with. `-F` flushes a whole chain:

```bash
root@beta:/# iptables -D INPUT 1
root@beta:/# iptables -D INPUT -s 10.10.0.2 -p icmp -j DROP
```

## Rule order and default policies

Rules are checked from the top, and the **first match wins**. Once a packet hits `ACCEPT`, `DROP` or `REJECT`, no later rule sees it. `LOG` is the exception: it records the packet and lets it carry on down the list.

So order matters. With these two rules, port 80 is open, because the `ACCEPT` comes first:

```text
-A INPUT -p tcp --dport 80 -j ACCEPT
-A INPUT -p tcp -j DROP
```

Swap them, and port 80 is closed: every TCP packet matches the `DROP` first. `-A` always adds to the end, and `-I INPUT 1` inserts at the top, or at any line number you give.

There are two ways to build a rule set:

- **Default allow**: policy `ACCEPT`, plus rules that block what you do not want. Easy to start, but anything you forget is open.
- **Default deny**: policy `DROP`, plus rules that allow only what you need. Anything you forget is closed. This is the safer choice for servers.

## The rule for established connections

With a default-deny `INPUT` chain, you might allow port 22 and port 80 and think you are done. Then beta tries `curl example.com` and it hangs. The request leaves through `OUTPUT`, which allows it. The reply comes back through `INPUT`, and no rule allows a packet from `example.com`'s port 80 to some random high port on beta.

You cannot list every reply port in advance. Instead, use **connection tracking**, the same table the *NAT* topic read from `/proc`. The kernel knows which packets belong to connections that are already set up, and a rule can match on that state:

```bash
root@beta:/# iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
```

- `ESTABLISHED` matches packets of a connection that has already seen traffic both ways, including replies to connections beta started.
- `RELATED` matches packets that belong to an existing connection without being part of it, such as an ICMP error about it.

A firewall that tracks connections like this is called **stateful**. With this rule near the top, you only need to write rules for the first packet of connections you want to accept. It also makes the rule set faster, because most packets match here and stop.

## Lock down a server

Clear beta's rules with `iptables -F`. Then start the SSH server, nginx, and a stand-in for a service that should not be reachable from outside, such as an admin tool someone left listening on port 8000:

```bash
root@beta:/# service ssh start
root@beta:/# echo "hello from beta" > /var/www/html/index.html
root@beta:/# nginx
root@beta:/# python3 -m http.server 8000 > /dev/null 2>&1 &
```

From alpha, `nc -zv -w 2 beta 22`, `80` and `8000` all succeed. The goal: 22 and 80 stay open, 8000 and anything else get dropped, and beta itself can still reach the outside.

Before you touch the rules of a remote server, make sure you have a way in that does not depend on them. In this lab, the terminal you started beta in is a console, not a network connection, so rules cannot cut it. A cloud server usually has a serial console in the provider's web interface. Otherwise, schedule an undo before you start. This line clears the rules in five minutes unless you stop it with `kill %1`:

```bash
root@beta:/# (sleep 300; iptables -P INPUT ACCEPT; iptables -F INPUT) &
```

The safe order is: allow rules first, then the rule that drops, then the default policy. Until the last step, nothing is blocked, so a mistake cannot lock you out.

**Step 1. Loopback and established connections.** Programs on beta talk to each other over `lo`, including the lab's DNS resolver. On a real server you are connected over SSH while you type this, and the established rule is what keeps that session alive when the policy changes:

```bash
root@beta:/# iptables -A INPUT -i lo -j ACCEPT
root@beta:/# iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
```

**Step 2. The services you offer.** SSH and HTTP, plus ICMP so that `ping` and the error messages that path MTU discovery relies on still work:

```bash
root@beta:/# iptables -A INPUT -p tcp --dport 22 -j ACCEPT
root@beta:/# iptables -A INPUT -p tcp --dport 80 -j ACCEPT
root@beta:/# iptables -A INPUT -p icmp -j ACCEPT
```

**Step 3. Drop the rest.** Add a final rule that drops everything that got this far, and set the policy to `DROP` as a backstop in case the rule is ever deleted:

```bash
root@beta:/# iptables -A INPUT -j DROP
root@beta:/# iptables -P INPUT DROP
```

Now test each service from alpha:

```bash
root@alpha:/# nc -zv -w 2 beta 22
Connection to beta (10.10.0.3) 22 port [tcp/ssh] succeeded!
root@alpha:/# nc -zv -w 2 beta 8000
nc: connect to beta (10.10.0.3) port 8000 (tcp) timed out: Operation now in progress
root@alpha:/# curl http://beta
hello from beta
```

`nc` only shows that a port accepts connections. `curl` shows the service behind it actually answers. Test both. From beta, `curl -sI http://example.com` still works, thanks to the established rule.

To see what is being dropped, add a `LOG` rule just before the drop rule: `iptables -I INPUT 6 -m limit --limit 10/min -j LOG --log-prefix "INPUT DROP: "`. The messages go to the kernel log, which you read with `journalctl -k` or `dmesg`, and `-m limit` stops a flood of blocked packets filling the disk. The kernel does not write `LOG` messages from inside a container, so in the lab the `pkts` counters in `iptables -L INPUT -n -v` are the way to see which rule a packet hit.

## The mistakes that lock you out

**Adding a rule after the drop.** Someone asks for port 8000 to be opened. `-A` appends, so the new rule lands below the drop rule and is never reached:

```bash
root@beta:/# iptables -A INPUT -p tcp --dport 8000 -j ACCEPT
root@beta:/# iptables -L INPUT -n --line-numbers | tail -2
6    DROP       0    --  0.0.0.0/0            0.0.0.0/0
7    ACCEPT     6    --  0.0.0.0/0            0.0.0.0/0            tcp dpt:8000
```

Delete it and insert it above the drop rule instead: `iptables -D INPUT 7`, then `iptables -I INPUT 6 -p tcp --dport 8000 -j ACCEPT`. If the new rule were for SSH, this mistake would leave you unable to log in to fix it.

**Setting the policy first, or flushing under it.** `iptables -P INPUT DROP` on a server with no allow rules cuts everything at once. The same happens later if you clear the rules with `iptables -F` while the policy is `DROP`: the rules go, the policy stays, and even established connections are dropped. An SSH session freezes, and on a cloud server you would now need the serial console. The habits that prevent it:

- Add allow rules before the drop rule, and set the policy last.
- Before flushing, set the policy back: `iptables -P INPUT ACCEPT`, then `iptables -F`.
- Keep a second SSH session open while you work, and test a new login before closing it.

## Save and restore the rules

Rules made with `iptables` live in the kernel and disappear on reboot. `iptables-save` prints the current rules in a form that `iptables-restore` can load back:

```bash
root@beta:/# iptables-save > /root/rules.v4
```

The file lists each chain's policy and every rule in `-S` form, between `*filter` and `COMMIT`. It also holds a `*nat` section with Docker's DNS rules; leave it in. `iptables-restore < /root/rules.v4` replaces the whole table at once, so there is no moment with half the rules loaded. It is a safer way to make big changes than typing rules one by one: edit the file, then restore it. On Ubuntu or Debian, the `iptables-persistent` package restores `/etc/iptables/rules.v4` at boot.

## Other tools, same idea

nftables (`nft`) is the newer interface to netfilter, and on current distributions `iptables` often writes nftables rules for you. ufw on Ubuntu (`ufw allow 22/tcp`) and firewalld on other distributions are simpler front ends that write the rules underneath.

A **cloud security group** is the same idea, run by the cloud provider outside the server: a list of allow rules on ports, protocols and source addresses, with an implicit deny for everything else. It is stateful, so replies to allowed connections are let through without a rule, exactly like the `ESTABLISHED,RELATED` rule. A cloud network ACL, where the provider offers one, is usually stateless and needs rules for both directions.

## Tasks

### Task 1: Open a port the right way

With beta locked down as above, and any rule for port 8000 deleted, open port 8000 to alpha only. Prove it works from alpha and is still blocked from another machine on `lab`, such as gamma.

<details>
<summary>Check your work</summary>

```bash
root@beta:/# iptables -I INPUT 6 -s 10.10.0.2 -p tcp --dport 8000 -j ACCEPT
root@alpha:/# nc -zv -w 2 beta 8000
Connection to beta (10.10.0.3) 8000 port [tcp/*] succeeded!
root@gamma:/# nc -zv -w 2 beta 8000
nc: connect to beta (10.10.0.3) port 8000 (tcp) timed out: Operation now in progress
```

`-I INPUT 6` puts the rule above the drop rule; check with `iptables -L INPUT -n --line-numbers` that your line number is right. If you used `-A`, the rule sits below the drop and alpha times out too.

</details>

### Task 2: Recover from a lockout

Save beta's rules with `iptables-save > /root/rules.v4`. Then run `iptables -F` and confirm that alpha can no longer reach port 22 or 80. Get beta back to the saved state from its console, and confirm alpha can reach both again.

<details>
<summary>Check your work</summary>

```bash
root@beta:/# iptables -P INPUT ACCEPT
root@beta:/# iptables-restore < /root/rules.v4
root@alpha:/# nc -zv -w 2 beta 22
Connection to beta (10.10.0.3) 22 port [tcp/ssh] succeeded!
```

`iptables-restore` alone would have worked as well, because the file sets the policy and every rule. Setting `ACCEPT` first is the habit that matters when you are not sure what the file contains. If `nc` still times out, check that you saved the file before flushing; a file saved after the flush holds no rules.

</details>

## Quiz

**1. A packet arrives at beta for nginx on port 80. Which chain in the `filter` table checks it, and which chain would check it if beta were only passing it on to another machine?**

<details>
<summary>Show answer</summary>

`INPUT`, because it is addressed to beta itself. If beta were routing it to another machine, it would go through `FORWARD` instead.

</details>

**2. You run `iptables -A INPUT -p tcp --dport 443 -j ACCEPT` on a locked-down server, but HTTPS still times out. The service is listening. What is the likely cause?**

<details>
<summary>Show answer</summary>

The rule was appended below the final drop rule, so packets are dropped before they reach it. List the rules with line numbers, delete it, and insert it above the drop with `-I`.

</details>

**3. A web service on a server cannot be reached from a client. `nc -zv` from the client says `Connection refused` immediately. Is a `DROP` rule on the server the likely cause?**

<details>
<summary>Show answer</summary>

No. A `DROP` rule produces silence and a timeout. An immediate refusal means something answered: either nothing is listening on that port, or a `REJECT` rule sent the refusal. Check with `ss -ltn` on the server, then look for `REJECT` in `iptables -S`.

</details>

**4. Why does a cloud security group not need a rule for the reply traffic of an allowed inbound connection?**

<details>
<summary>Show answer</summary>

It is stateful. It tracks connections, so packets belonging to a connection it already allowed are let through in both directions, just like an iptables `ESTABLISHED,RELATED` rule.

</details>

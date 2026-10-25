A server on a network can be reached by anything that can reach its address. A **firewall** decides which of those packets are let in and which are thrown away, so that only the services you mean to offer can be reached. Most "it works from here but not from there" problems end at a firewall rule somewhere.

This topic explains how a Linux firewall looks at packets, using iptables on beta. By the end you can read a rule set, say which rule a packet will hit, add and delete rules, and explain why almost every firewall starts with a rule for established connections. The *Firewall practice* topic then uses all of this to lock a server down.

## Packet filtering

A **packet filter** looks at each packet's headers, compares them with a list of **rules**, and acts on the first rule that matches. The headers carry everything earlier topics introduced:

- source and destination IP address
- protocol, such as TCP, UDP or ICMP
- source and destination port, for TCP and UDP
- the interface the packet came in on or is going out of

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

A packet goes through exactly one of these in the `filter` table. On a server you mostly care about `INPUT`. On a router, `FORWARD` is the one that matters. The `nat` table uses `PREROUTING` and `POSTROUTING`, which you met in the *NAT* topic.

## Reading the rules

Start beta and list its `filter` table. `-L` lists, `-n` shows numbers instead of looking up names, and `-v` adds counters and interfaces:

```bash
root@beta:/# iptables -L -n -v
Chain INPUT (policy ACCEPT 0 packets, 0 bytes)
 pkts bytes target     prot opt in     out     source               destination

Chain FORWARD (policy ACCEPT 0 packets, 0 bytes)
 pkts bytes target     prot opt in     out     source               destination

Chain OUTPUT (policy ACCEPT 0 packets, 0 bytes)
 pkts bytes target     prot opt in     out     source               destination
```

Three empty chains, each with a **policy** of `ACCEPT`. The policy is what happens to a packet that reaches the end of a chain without matching any rule. With no rules and `ACCEPT`, everything is allowed.

Add two rules: refuse TCP port 8000, and silently drop pings from alpha. `-A` appends a rule to the end of a chain:

```bash
root@beta:/# iptables -A INPUT -p tcp --dport 8000 -j REJECT
root@beta:/# iptables -A INPUT -s 10.10.0.2 -p icmp -j DROP
```

- `-p tcp --dport 8000` matches TCP packets for port 8000.
- `-s 10.10.0.2 -p icmp` matches ICMP, which `ping` uses, from alpha only.
- `-j` names the target.

Now list them, with line numbers:

```bash
root@beta:/# iptables -L INPUT -n -v --line-numbers
Chain INPUT (policy ACCEPT 2 packets, 183 bytes)
num   pkts bytes target     prot opt in     out     source               destination
1        0     0 REJECT     6    --  *      *       0.0.0.0/0            0.0.0.0/0            tcp dpt:8000 reject-with icmp-port-unreachable
2        0     0 DROP       1    --  *      *       10.10.0.2            0.0.0.0/0
```

`prot` shows protocol numbers with `-n`: 6 is TCP, 1 is ICMP, 0 is any. `0.0.0.0/0` means any address. `in` and `out` are interfaces, and `*` means any. Without `-n`, iptables prints `tcp`, `icmp`, `anywhere` and host names instead, which is easier to read but slow when names do not resolve.

`-S` prints the same rules as the commands that would create them. It is the better view when you want to copy a rule or delete one:

```bash
root@beta:/# iptables -S INPUT
-P INPUT ACCEPT
-A INPUT -p tcp -m tcp --dport 8000 -j REJECT --reject-with icmp-port-unreachable
-A INPUT -s 10.10.0.2/32 -p icmp -j DROP
```

Test both from alpha. `nc -zv` from the *Netcat* topic tries a connection and reports:

```bash
root@alpha:/# nc -zv -w 2 beta 8000
nc: connect to beta (10.10.0.3) port 8000 (tcp) failed: Connection refused
root@alpha:/# ping -c 2 -W 1 beta
PING beta (10.10.0.3) 56(84) bytes of data.

--- beta ping statistics ---
2 packets transmitted, 0 received, 100% packet loss, time 1012ms
```

REJECT gives an instant, clear answer. DROP gives silence. Pings from router or gamma still work, because the rule only matches alpha's address. The counters now show which rule each packet hit:

```bash
root@beta:/# iptables -L INPUT -n -v
Chain INPUT (policy ACCEPT 3 packets, 267 bytes)
 pkts bytes target     prot opt in     out     source               destination
    1    60 REJECT     6    --  *      *       0.0.0.0/0            0.0.0.0/0            tcp dpt:8000 reject-with icmp-port-unreachable
    2   168 DROP       1    --  *      *       10.10.0.2            0.0.0.0/0
```

To delete a rule, give `-D` either its line number or the same spec you added it with. `-F` flushes a whole chain:

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
- **Default deny**: policy `DROP`, plus rules that allow only what you need. Anything you forget is closed. This is the safer choice for servers, and the one the *Firewall practice* topic builds.

Set a policy with `-P`, for example `iptables -P INPUT DROP`. Do not run that yet: with no allow rules, it cuts off everything, including replies to beta's own connections, as the next section shows.

## The rule for established connections

With a default-deny `INPUT` chain, you might allow port 22 and port 80 and think you are done. Then beta tries `curl example.com` and it hangs. The request leaves through `OUTPUT`, which allows it. The reply comes back through `INPUT`, and no rule allows a packet from `example.com`'s port 80 to some random high port on beta.

You cannot list every reply port in advance. Instead, use **connection tracking**, the same table the *NAT* topic read from `/proc`. The kernel knows which packets belong to connections that are already set up, and a rule can match on that state:

```bash
root@beta:/# iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
```

- `ESTABLISHED` matches packets of a connection that has already seen traffic both ways, including replies to connections beta started.
- `RELATED` matches packets that belong to an existing connection without being part of it, such as an ICMP error about it.

A firewall that tracks connections like this is called **stateful**. With this rule near the top, you only need to write rules for the first packet of connections you want to accept. Everything after it, in both directions, is allowed by this one rule. It also makes the rule set faster, because most packets match here and stop.

## Other tools, same idea

iptables is not the only way to manage netfilter:

| Tool | What it is |
| --- | --- |
| nftables (`nft`) | The newer interface to netfilter, with its own rule syntax. On current distributions, `iptables` often writes nftables rules for you. |
| ufw | A simpler front end on Ubuntu: `ufw allow 22/tcp`, `ufw enable`. It writes iptables rules underneath. |
| firewalld | A similar front end on other distributions, built around zones. |

A **cloud security group** is the same idea, run by the cloud provider outside the server. It is a list of allow rules on ports, protocols and source addresses, with an implicit deny for everything else. It is stateful, so replies to allowed connections are let through without a rule, exactly like the `ESTABLISHED,RELATED` rule. A cloud network ACL, where the provider offers one, is usually stateless and needs rules for both directions.

Whatever the tool, the questions are the same: which packets does each rule match, in what order are the rules checked, and what happens to a packet that matches none.

## Tasks

### Task 1: DROP or REJECT

Start a test server on beta on port 8000 with `python3 -m http.server 8000 &`. Block port 8000 with `DROP`, try `nc -zv -w 2 beta 8000` from alpha, and note the message and how long it took. Then replace the rule with `REJECT` and try again.

<details>
<summary>Check your work</summary>

```bash
root@beta:/# iptables -A INPUT -p tcp --dport 8000 -j DROP
root@alpha:/# nc -zv -w 2 beta 8000
nc: connect to beta (10.10.0.3) port 8000 (tcp) timed out: Operation now in progress
root@beta:/# iptables -R INPUT 1 -p tcp --dport 8000 -j REJECT
root@alpha:/# nc -zv -w 2 beta 8000
nc: connect to beta (10.10.0.3) port 8000 (tcp) failed: Connection refused
```

`-R INPUT 1` replaces rule 1. With DROP, `nc` waits for the full two seconds and gives up. With REJECT, it fails at once. Without `-w 2`, a dropped connection waits much longer before giving up. If you see `succeeded`, list the rules: there may be an earlier `ACCEPT` that matches first.

</details>

### Task 2: Break and fix replies

On beta, add `iptables -A INPUT -i lo -j ACCEPT`, then `iptables -A INPUT -p icmp -j ACCEPT`, then set the policy with `iptables -P INPUT DROP`. Try `curl -m 4 -sI http://example.com` and `ping -c 1 alpha` from beta. Then add the established rule and try both again.

<details>
<summary>Check your work</summary>

```bash
root@beta:/# curl -m 4 -sI http://example.com
root@beta:/# echo $?
28
root@beta:/# ping -c 1 alpha | tail -2
1 packets transmitted, 1 received, 0% packet loss, time 0ms
rtt min/avg/max/mdev = 0.100/0.100/0.100/0.000 ms
```

The ping works because ICMP is allowed in both directions. The curl times out (exit code 28): the name resolves, because the lab's DNS answers over the loopback rule, but the reply from example.com is dropped. Add the rule and curl gets `HTTP/1.1 200 OK` at once:

```bash
root@beta:/# iptables -I INPUT 1 -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
```

Put beta back to normal with `iptables -P INPUT ACCEPT` and `iptables -F`. Set the policy first; flushing first under a `DROP` policy leaves nothing allowed.

</details>

## Quiz

**1. A packet arrives at beta for nginx on port 80. Which chain in the `filter` table checks it, and which chain would check it if beta were only passing it on to another machine?**

<details>
<summary>Show answer</summary>

`INPUT`, because it is addressed to beta itself. If beta were routing it to another machine, it would go through `FORWARD` instead.

</details>

**2. The `INPUT` chain has `-A INPUT -j DROP` followed by `-A INPUT -p tcp --dport 443 -j ACCEPT`. Is port 443 open?**

<details>
<summary>Show answer</summary>

No. The first rule matches every packet and drops it, so the second is never reached. Insert the allow rule above it with `iptables -I`, or delete and re-add the drop at the end.

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

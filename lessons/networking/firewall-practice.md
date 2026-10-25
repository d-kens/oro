Writing firewall rules is easy. Writing them on a remote server, over the very connection the rules might cut, is where people get into trouble. One rule in the wrong order and you are locked out of a machine you can no longer reach.

This topic locks down beta one step at a time, testing from alpha after each step, the way you would on a real server. By the end you can build a default-deny rule set that allows only SSH and HTTP, log what it drops, avoid the order mistakes that lock you out, and save the rules so they can be restored.

## Set up beta with three services

Start alpha and beta as usual. On beta, start the SSH server, nginx, and a stand-in for a service that should not be reachable from outside, such as an admin tool someone left listening on port 8000:

```bash
root@beta:/# service ssh start
 * Starting OpenBSD Secure Shell server sshd
   ...done.
root@beta:/# echo "hello from beta" > /var/www/html/index.html
root@beta:/# nginx
root@beta:/# python3 -m http.server 8000 > /dev/null 2>&1 &
root@beta:/# ss -ltn
State  Recv-Q Send-Q Local Address:Port  Peer Address:PortProcess
LISTEN 0      4096      127.0.0.11:33793      0.0.0.0:*
LISTEN 0      128          0.0.0.0:22         0.0.0.0:*
LISTEN 0      511          0.0.0.0:80         0.0.0.0:*
LISTEN 0      5            0.0.0.0:8000       0.0.0.0:*
```

Port 127.0.0.11 is Docker's DNS resolver for the container; ignore it. Before changing anything, record what alpha can reach, so you can compare later:

```bash
root@alpha:/# nc -zv -w 2 beta 22
Connection to beta (10.10.0.3) 22 port [tcp/ssh] succeeded!
root@alpha:/# nc -zv -w 2 beta 80
Connection to beta (10.10.0.3) 80 port [tcp/http] succeeded!
root@alpha:/# nc -zv -w 2 beta 8000
Connection to beta (10.10.0.3) 8000 port [tcp/*] succeeded!
```

The goal: 22 and 80 stay open, 8000 and anything else get dropped, and beta itself can still reach the outside.

## Keep a way back in

Before you touch the rules of a remote server, make sure you have a way in that does not depend on them:

- In this lab you have it already: the terminal you started beta in is a console, not a network connection. Rules cannot cut it.
- A cloud server usually has a serial console in the provider's web interface. Check that it works before you need it.
- Otherwise, schedule an undo before you start. This line clears the rules in five minutes unless you stop it with `kill %1`:

```bash
root@beta:/# (sleep 300; iptables -P INPUT ACCEPT; iptables -F INPUT) &
```

`iptables-apply`, which comes with iptables, does a similar thing for a saved rule file: it applies the file and rolls it back unless you confirm within a timeout.

## Build the rules in a safe order

The safe order is: allow rules first, then the rule that drops, then the default policy. Until the last steps, nothing is blocked, so a mistake cannot lock you out.

**Step 1. Loopback and established connections.** Programs on beta talk to each other over `lo`, including the lab's DNS resolver. Then allow every packet that belongs to a connection already set up, which the *Firewall basics* topic explained:

```bash
root@beta:/# iptables -A INPUT -i lo -j ACCEPT
root@beta:/# iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
```

On a real server you are connected over SSH while you type this. The established rule is what keeps that session alive later, when the policy changes.

**Step 2. The services you offer.** SSH and HTTP, plus ICMP so that `ping` and the error messages that path MTU discovery relies on still work:

```bash
root@beta:/# iptables -A INPUT -p tcp --dport 22 -j ACCEPT
root@beta:/# iptables -A INPUT -p tcp --dport 80 -j ACCEPT
root@beta:/# iptables -A INPUT -p icmp -j ACCEPT
```

Test from alpha. Nothing should have changed yet, because nothing is blocked:

```bash
root@alpha:/# nc -zv -w 2 beta 8000
Connection to beta (10.10.0.3) 8000 port [tcp/*] succeeded!
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
root@alpha:/# nc -zv -w 2 beta 80
Connection to beta (10.10.0.3) 80 port [tcp/http] succeeded!
root@alpha:/# nc -zv -w 2 beta 8000
nc: connect to beta (10.10.0.3) port 8000 (tcp) timed out: Operation now in progress
root@alpha:/# curl http://beta
hello from beta
```

`nc` only shows that a port accepts connections. `curl` shows the service behind it actually answers. Test both. And from beta, check that its own outgoing connections still work, thanks to the established rule:

```bash
root@beta:/# curl -sI http://example.com | head -1
HTTP/1.1 200 OK
```

## Log what you drop

When something stops working after a firewall change, you want to know what is being dropped. On a normal Linux server, add a `LOG` rule just before the drop rule:

```bash
iptables -I INPUT 6 -m limit --limit 10/min -j LOG --log-prefix "INPUT DROP: "
```

The messages go to the kernel log, which you read with `journalctl -k` or `dmesg`. `-m limit` caps it at ten a minute, so a flood of blocked packets cannot fill the disk. Because `LOG` does not stop the packet, it still reaches the drop rule after it.

The kernel does not write `LOG` messages from inside a container, so in the lab use `NFLOG` instead. It hands packets to a program, and tcpdump can read them:

```bash
root@beta:/# iptables -I INPUT 6 -m limit --limit 10/min -j NFLOG --nflog-group 1 --nflog-prefix dropped
root@beta:/# tcpdump -n -i nflog:1
```

Try port 8000 from alpha again, and beta shows each dropped packet:

```text
listening on nflog:1, link-type NFLOG (Linux netfilter log messages), snapshot length 262144 bytes
07:48:55.454916 IP 10.10.0.2.55712 > 10.10.0.3.8000: Flags [S], seq 2609138987, win 64240, options [mss 1460,sackOK,TS val 760223028 ecr 0,nop,wscale 7], length 0
07:48:56.472750 IP 10.10.0.2.55712 > 10.10.0.3.8000: Flags [S], seq 2609138987, win 64240, options [mss 1460,sackOK,TS val 760224040 ecr 0,nop,wscale 7], length 0
```

Two attempts from alpha to port 8000, the second a retry one second later. Stop tcpdump with <kbd>Ctrl</kbd>+<kbd>C</kbd>. The counters tell the same story without a log:

```bash
root@beta:/# iptables -L INPUT -n -v --line-numbers
Chain INPUT (policy DROP 0 packets, 0 bytes)
num   pkts bytes target     prot opt in     out     source               destination
1        0     0 ACCEPT     0    --  lo     *       0.0.0.0/0            0.0.0.0/0
2       11   627 ACCEPT     0    --  *      *       0.0.0.0/0            0.0.0.0/0            ctstate RELATED,ESTABLISHED
3        1    60 ACCEPT     6    --  *      *       0.0.0.0/0            0.0.0.0/0            tcp dpt:22
4        2   120 ACCEPT     6    --  *      *       0.0.0.0/0            0.0.0.0/0            tcp dpt:80
5        1    84 ACCEPT     1    --  *      *       0.0.0.0/0            0.0.0.0/0
6        2   120 NFLOG      0    --  *      *       0.0.0.0/0            0.0.0.0/0            limit: avg 10/min burst 5 nflog-prefix dropped nflog-group 1
7        2   120 DROP       0    --  *      *       0.0.0.0/0            0.0.0.0/0
```

## The mistakes that lock you out

**Adding a rule after the drop.** Someone asks for port 8000 to be opened. `-A` appends, so the new rule lands below the drop rule and is never reached:

```bash
root@beta:/# iptables -A INPUT -p tcp --dport 8000 -j ACCEPT
root@beta:/# iptables -L INPUT -n --line-numbers | tail -3
6    NFLOG      0    --  0.0.0.0/0            0.0.0.0/0            limit: avg 10/min burst 5 nflog-prefix dropped nflog-group 1
7    DROP       0    --  0.0.0.0/0            0.0.0.0/0
8    ACCEPT     6    --  0.0.0.0/0            0.0.0.0/0            tcp dpt:8000
root@alpha:/# nc -zv -w 2 beta 8000
nc: connect to beta (10.10.0.3) port 8000 (tcp) timed out: Operation now in progress
```

Delete it and insert it above the log and drop rules instead: `iptables -D INPUT 8`, then `iptables -I INPUT 6 -p tcp --dport 8000 -j ACCEPT`. If the new rule were for SSH, this mistake would leave you unable to log in to fix it.

**Setting the policy first, or flushing under it.** `iptables -P INPUT DROP` on a server with no allow rules cuts everything at once. The same happens later if you clear the rules with `iptables -F` while the policy is `DROP`: the rules go, the policy stays. Try it in the lab. Start `ping beta` on alpha and leave it running, as a stand-in for an SSH session. Then flush beta's rules from beta's console:

```bash
root@beta:/# iptables -F
root@beta:/# iptables -S
-P INPUT DROP
-P FORWARD ACCEPT
-P OUTPUT ACCEPT
```

alpha's ping stops getting replies at once, and a new connection to SSH times out. An SSH session would freeze in the same way:

```text
64 bytes from beta.lab (10.10.0.3): icmp_seq=3 ttl=64 time=0.366 ms
64 bytes from beta.lab (10.10.0.3): icmp_seq=4 ttl=64 time=0.084 ms
```

```bash
root@alpha:/# nc -zv -w 2 beta 22
nc: connect to beta (10.10.0.3) port 22 (tcp) timed out: Operation now in progress
```

On a cloud server, you would now need the serial console. The habits that prevent it:

- Add allow rules before the drop rule, and set the policy last.
- Before flushing, set the policy back: `iptables -P INPUT ACCEPT`, then `iptables -F`.
- Keep a second SSH session open while you work, and test a new login before closing it.
- Have the scheduled undo running.

## Save and restore the rules

Rules made with `iptables` live in the kernel and disappear on reboot. `iptables-save` prints the current rules in a form that `iptables-restore` can load back:

```bash
root@beta:/# iptables-save > /root/rules.v4
root@beta:/# grep -A12 '^\*filter' /root/rules.v4
*filter
:INPUT DROP [0:0]
:FORWARD ACCEPT [0:0]
:OUTPUT ACCEPT [197:38178]
-A INPUT -i lo -j ACCEPT
-A INPUT -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
-A INPUT -p tcp -m tcp --dport 22 -j ACCEPT
-A INPUT -p tcp -m tcp --dport 80 -j ACCEPT
-A INPUT -p icmp -j ACCEPT
-A INPUT -m limit --limit 10/min -j NFLOG --nflog-prefix dropped --nflog-group 1
-A INPUT -j DROP
COMMIT
```

The numbers in brackets are packet and byte counters for each chain's policy. The file also holds a `*nat` section with Docker's DNS rules; leave it in. To load the rules back, in one step:

```bash
root@beta:/# iptables-restore < /root/rules.v4
```

`iptables-restore` replaces the whole table at once, so there is no moment with half the rules loaded. It is a safer way to make big changes than typing rules one by one: edit the file, then restore it.

To load the rules at boot on Ubuntu or Debian, install the `iptables-persistent` package. It restores `/etc/iptables/rules.v4` when the machine starts, and `netfilter-persistent save` writes the current rules there. The lab containers start fresh every time, so there is nothing to persist here.

## Tasks

### Task 1: Open a port the right way

With beta locked down as above, and any rule for port 8000 from the earlier example deleted, open port 8000 to alpha only, not to other machines. Prove it works from alpha and is still blocked from another machine on `lab`, such as gamma or router.

<details>
<summary>Check your work</summary>

```bash
root@beta:/# iptables -I INPUT 6 -s 10.10.0.2 -p tcp --dport 8000 -j ACCEPT
root@alpha:/# nc -zv -w 2 beta 8000
Connection to beta (10.10.0.3) 8000 port [tcp/*] succeeded!
root@gamma:/# nc -zv -w 2 beta 8000
nc: connect to beta (10.10.0.3) port 8000 (tcp) timed out: Operation now in progress
```

`-I INPUT 6` puts the rule above the log and drop rules; check with `iptables -L INPUT -n --line-numbers` that your line number is right. If you used `-A`, the rule sits below the drop and alpha times out too.

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

**1. Why does the established rule go near the top of the `INPUT` chain?**

<details>
<summary>Show answer</summary>

It lets through replies to beta's own connections and every later packet of connections already accepted, including your SSH session. Most packets match it, so putting it early keeps both your session safe and the rule set fast.

</details>

**2. You run `iptables -A INPUT -p tcp --dport 443 -j ACCEPT` on a locked-down server, but HTTPS still times out. The service is listening. What is the likely cause?**

<details>
<summary>Show answer</summary>

The rule was appended below the final drop rule, so packets are dropped before they reach it. List the rules with line numbers, delete it, and insert it above the drop with `-I`.

</details>

**3. A service on a server cannot be reached after a colleague tidied up the firewall. `iptables -S` shows only `-P INPUT DROP` and no rules, yet their SSH session to the server also froze. What happened, and how do you fix it safely?**

<details>
<summary>Show answer</summary>

They flushed the rules with `iptables -F` while the policy was `DROP`, so nothing is allowed, not even established connections. From a console that does not depend on the network, set `iptables -P INPUT ACCEPT`, then restore the saved rules with `iptables-restore`.

</details>

**4. Why does a `LOG` rule not stop a packet from being dropped by the rule after it?**

<details>
<summary>Show answer</summary>

`LOG` is a non-terminating target: it records the packet and passes it on to the next rule. That is why it goes just before the drop rule, so it sees exactly the packets that are about to be dropped.

</details>

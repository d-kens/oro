Your laptop has a private address such as `192.168.1.20`, and so do millions of other laptops. None of those addresses can appear on the internet, yet every one of those laptops can load a web page. Something on the way out swaps the private address for a public one and swaps it back on the replies. That is **network address translation**, or **NAT**.

NAT is everywhere in the cloud: a private subnet reaches the internet through a NAT gateway, and a container is reached through a port that Docker forwards to it. By the end you can explain source and destination NAT, set up a router that lets a private network reach the outside, forward a port to a machine inside, and read the table that keeps track of it all.

## Why NAT exists

There are only about 4 billion IPv4 addresses, far fewer than the devices that want one. The *IP addresses* topic introduced the private ranges, such as `10.0.0.0/8` and `192.168.0.0/16`, which anyone can use inside their own network. Routers on the internet do not carry traffic for private addresses, because thousands of networks use the same ones and there would be no way to know which one a packet belongs to.

So a host with a private address can send a packet out, but a reply addressed to `10.20.0.2` has nowhere to go. NAT solves this at the edge of the private network. The router there rewrites addresses in the packet headers as packets pass through it:

| Kind | What changes | Typical use |
| --- | --- | --- |
| Source NAT (SNAT) | The source address of outgoing packets | Private hosts sharing one public address to reach the internet |
| Masquerade | The same, using whatever address the outgoing interface has | A router whose public address can change |
| Destination NAT (DNAT) | The destination address, and often the port, of incoming packets | Port forwarding to a server inside the network |

A home router does both. A cloud NAT gateway does source NAT for private subnets. A load balancer in front of private servers does a form of destination NAT.

## Source NAT and masquerade

With **source NAT**, a host inside sends a packet as usual. When the packet leaves the router, the router replaces its private source address with the router's own outside address. The server on the other end sees the router as the sender, so it replies to the router. The router recognises the reply, puts the original private address back as the destination, and passes the packet inside.

**Masquerade** is source NAT where you do not name the new address. The router uses whatever address the outgoing interface has at that moment. That suits a router whose outside address is handed out by someone else and may change.

On Linux both are rules in the `nat` table of iptables, in the `POSTROUTING` chain, which runs just before a packet leaves. The *Firewall basics* topic covers tables and chains properly. For now, a rule has a match (which packets) and a target (what to do with them).

The router has to remember which inside host each translated connection belongs to, or it could not send replies to the right place. That memory is **connection tracking**, covered at the end of this topic.

## Build the two-network lab

This topic needs a private network behind a router. If `lab2` already exists from the *Routing and gateways* topic, keep it. If not, create it:

```bash
$ docker network create --subnet 10.20.0.0/24 lab2
```

Start fresh machines, so that no routes are left over from earlier topics. Start `alpha` and `beta` on `lab` as usual. Then start `router` the same way as in the *Routing and gateways* topic, with fixed addresses and forwarding turned on, and start `delta` on `lab2` only:

```bash
$ docker run -it --rm --name router --hostname router --network lab --ip 10.10.0.254 --cap-add NET_ADMIN --sysctl net.ipv4.ip_forward=1 netlab
$ docker network connect --ip 10.20.0.254 lab2 router
$ docker run -it --rm --name delta --hostname delta --network lab2 --cap-add NET_ADMIN netlab
```

router is `10.10.0.254` on `lab` and `10.20.0.254` on `lab2`, and delta is `10.20.0.2`.

Docker's gateway on each network leads out of your computer, and Docker's own rules there can carry some traffic between its networks. That would hide the problem NAT solves, so set the lab up the way a real network looks:

```bash
root@router:/# ip route replace default via 10.10.0.1
root@delta:/# ip route replace default via 10.20.0.254
root@alpha:/# ip route del default
```

- router sends everything that is not local out through `lab`, which plays the internet.
- delta sends everything through router, like a host in a private subnet.
- alpha plays a server on the internet. Without its default route it only knows its own network, just as an internet server knows nothing about your private addresses.

Now try it. delta pings alpha, and alpha watches with `tcpdump`, which the *tcpdump* topic covers:

```bash
root@alpha:/# tcpdump -n -i eth0 icmp
root@delta:/# ping -c 2 -W 1 10.10.0.2
PING 10.10.0.2 (10.10.0.2) 56(84) bytes of data.

--- 10.10.0.2 ping statistics ---
2 packets transmitted, 0 received, 100% packet loss, time 1009ms
```

```text
07:28:18.473635 IP 10.20.0.2 > 10.10.0.2: ICMP echo request, id 34, seq 1, length 64
07:28:19.485369 IP 10.20.0.2 > 10.10.0.2: ICMP echo request, id 34, seq 2, length 64
```

The requests arrive, but alpha never answers. It sees a sender at `10.20.0.2`, has no route to that network, and drops its reply. Try it yourself on alpha:

```bash
root@alpha:/# ping -c 1 10.20.0.2
ping: connect: Network is unreachable
```

## Masquerade on router

Add one rule on router: packets from `lab2` that leave through `eth0`, the `lab` side, get router's address as their source.

```bash
root@router:/# iptables -t nat -A POSTROUTING -s 10.20.0.0/24 -o eth0 -j MASQUERADE
```

- `-t nat` works on the `nat` table instead of the default `filter` table.
- `-A POSTROUTING` appends the rule to the chain that runs as packets leave.
- `-s 10.20.0.0/24 -o eth0` matches packets from `lab2` going out to `lab`.
- `-j MASQUERADE` rewrites the source to `eth0`'s address.

Run the same ping again:

```bash
root@delta:/# ping -c 2 -W 1 10.10.0.2
PING 10.10.0.2 (10.10.0.2) 56(84) bytes of data.
64 bytes from 10.10.0.2: icmp_seq=1 ttl=63 time=0.166 ms
64 bytes from 10.10.0.2: icmp_seq=2 ttl=63 time=0.176 ms
```

```text
07:28:29.942869 IP 10.10.0.254 > 10.10.0.2: ICMP echo request, id 36, seq 1, length 64
07:28:29.942943 IP 10.10.0.2 > 10.10.0.254: ICMP echo reply, id 36, seq 1, length 64
```

alpha now sees router (`10.10.0.254`) as the sender, which is on its own network, so it can reply. router translates the reply back to delta. `ttl=63` instead of 64 shows that the packet crossed one router.

List the rule with its counters:

```bash
root@router:/# iptables -t nat -L POSTROUTING -n -v
Chain POSTROUTING (policy ACCEPT 0 packets, 0 bytes)
 pkts bytes target     prot opt in     out     source               destination
    0     0 DOCKER_POSTROUTING  0    --  *      *       0.0.0.0/0            127.0.0.11
    1    84 MASQUERADE  0    --  *      eth0    10.20.0.0/24         0.0.0.0/0
```

Two pings, but the counter says 1 packet. The `nat` table only sees the **first packet of each connection**. Its decision is stored, and every later packet in the same connection is translated the same way without going through the rules again. The `DOCKER_POSTROUTING` line is Docker's own NAT for the container's DNS resolver at `127.0.0.11`; leave it alone.

Put alpha's default route back when you are done with this part, so it can reach the internet again:

```bash
root@alpha:/# ip route add default via 10.10.0.1
```

## Destination NAT and port forwarding

Masquerade lets inside hosts start connections out. Nothing outside can start a connection in, because outside hosts cannot address delta at all. To offer a service from inside, you forward a port: connections to a port on router's outside address are sent on to a machine inside. That is **destination NAT**.

Start a web server on delta:

```bash
root@delta:/# echo "hello from delta" > /var/www/html/index.html
root@delta:/# nginx
```

On router, rewrite the destination of TCP connections that arrive on `eth0` for port 8080. The rule goes in `PREROUTING`, which runs as packets arrive, before router decides where to send them:

```bash
root@router:/# iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 8080 -j DNAT --to-destination 10.20.0.2:80
```

On a real network that one rule is enough. In this lab, Docker's own NAT on your computer also sees the packet as it enters `lab2` and rewrites its source, so delta's reply goes the wrong way and the connection hangs. Work around it by having router put its own `lab2` address on packets it forwards to delta:

```bash
root@router:/# iptables -t nat -A POSTROUTING -o eth1 -d 10.20.0.2 -j MASQUERADE
```

Now connect to router's port 8080 from alpha:

```bash
root@alpha:/# curl http://10.10.0.254:8080
hello from delta
root@delta:/# tail -1 /var/log/nginx/access.log
10.20.0.254 - - [25/Oct/2026:07:34:11 +0000] "GET / HTTP/1.1" 200 17 "-" "curl/8.5.0"
```

Because of that second rule, delta's log shows router (`10.20.0.254`) as the client, not alpha. Load balancers that translate both addresses have the same effect, which is why they often pass the original client address in a header instead.

### Docker's -p is DNAT

When you run a container with `-p 8080:80`, Docker adds a DNAT rule on the machine that runs Docker. You can read it from a container that shares that machine's network. This works on Linux, macOS and Windows:

```bash
$ docker run -d --rm --name web -p 8080:80 netlab nginx -g "daemon off;"
$ docker run --rm --privileged --net host netlab iptables -t nat -S DOCKER
-N DOCKER
-A DOCKER -p tcp -m tcp --dport 8080 -j DNAT --to-destination 172.17.0.2:80
```

Connections to port 8080 on your computer are sent to port 80 on the container. You may also see a warning about legacy tables, and one rule for each other published port; ignore those. Stop it with `docker stop web`.

## Connection tracking

Every translation relies on the **conntrack** table, which the kernel keeps for each connection it has seen. On router, read it straight from `/proc` after a request from alpha and a ping from delta:

```bash
root@router:/# cat /proc/net/nf_conntrack
ipv4     2 icmp     1 29 src=10.20.0.2 dst=10.10.0.2 type=8 code=0 id=58 src=10.10.0.2 dst=10.10.0.254 type=0 code=0 id=58 mark=0 zone=0 use=2
ipv4     2 tcp      6 109 TIME_WAIT src=10.10.0.2 dst=10.10.0.254 sport=43896 dport=8080 src=10.20.0.2 dst=10.20.0.254 sport=80 dport=43896 [ASSURED] mark=0 zone=0 use=2
```

Each line holds two views of one connection. The first `src=… dst=…` is the packet as it arrived. The second is what a reply should look like. In the ICMP line, delta pinged alpha, and the reply is expected from alpha to router: that is the masquerade. In the TCP line, alpha asked for router's port 8080, and the reply is expected from delta's port 80: that is the port forward. The number after the protocol (`29`, `109`) is the seconds left before the entry expires.

The `conntrack` command, in the package of the same name, shows the same table in a friendlier form and can delete entries. The firewall topics use conntrack too, to let reply packets through.

## Tasks

### Task 1: Prove what alpha sees

Set up the lab with alpha's default route removed and no NAT rules on router. Run `tcpdump -n -i eth0 icmp` on alpha and ping alpha from delta. Then add the masquerade rule and ping again. Note the source address alpha sees each time, and the packet count on the `MASQUERADE` rule after each ping.

<details>
<summary>Check your work</summary>

Before the rule, alpha sees requests from `10.20.0.2` and sends no replies. After it, alpha sees requests from `10.10.0.254` and replies to them:

```text
07:28:29.942869 IP 10.10.0.254 > 10.10.0.2: ICMP echo request, id 36, seq 1, length 64
07:28:29.942943 IP 10.10.0.2 > 10.10.0.254: ICMP echo reply, id 36, seq 1, length 64
```

`iptables -t nat -L POSTROUTING -n -v` goes up by 1 for each `ping` command, not for each packet, because only a connection's first packet passes through the `nat` table. If nothing changes after you add the rule, check that `-o eth0` is router's `lab` side with `ip -br addr`, and that delta's default route points at router.

</details>

### Task 2: Forward SSH to delta

Start the SSH server on delta with `service ssh start`. On router, forward port 2222 to port 22 on delta. From alpha, check that the port answers with `nc -v -w 2 10.10.0.254 2222`.

<details>
<summary>Check your work</summary>

```bash
root@router:/# iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 2222 -j DNAT --to-destination 10.20.0.2:22
root@alpha:/# echo | nc -v -w 2 10.10.0.254 2222
Connection to 10.10.0.254 2222 port [tcp/*] succeeded!
SSH-2.0-OpenSSH_9.6p1 Ubuntu-3ubuntu13.20
Invalid SSH identification string.
```

The `SSH-2.0-OpenSSH` line is delta's SSH server greeting you. It complains because `nc` sent an empty line instead of speaking SSH, which is fine. If the connection hangs, the `POSTROUTING -o eth1 -d 10.20.0.2 -j MASQUERADE` rule from earlier is missing. Your OpenSSH version may differ.

</details>

## Quiz

**1. What is the difference between SNAT and DNAT?**

<details>
<summary>Show answer</summary>

SNAT changes the source address of packets, usually as they leave a private network, so replies come back to the router. DNAT changes the destination address, usually as packets arrive, so a connection to the router reaches a machine behind it.

</details>

**2. When would you use MASQUERADE instead of SNAT with a fixed `--to-source` address?**

<details>
<summary>Show answer</summary>

When the router's outside address is not fixed, for example when it is handed out by a provider and can change. MASQUERADE always uses the current address of the outgoing interface. With a fixed address, SNAT does the same job with slightly less work.

</details>

**3. Servers in a private subnet can download updates, but a colleague cannot connect to a web server on one of them from the internet. The NAT gateway is working. Why?**

<details>
<summary>Show answer</summary>

A NAT gateway only does source NAT: it lets connections start from inside. Nothing outside can address the private server, so a connection cannot start from outside. To accept incoming connections you need destination NAT, such as a port forward or a load balancer with a public address in front of the server.

</details>

**4. You add a MASQUERADE rule while a long download is running from a private host. Does the download start using the new rule?**

<details>
<summary>Show answer</summary>

No. The `nat` table only looks at the first packet of each connection, and the decision is kept in the conntrack table for the rest of it. The running download keeps the translation it started with. New connections use the new rule.

</details>

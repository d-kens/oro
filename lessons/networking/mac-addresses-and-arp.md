An IP address says where a packet should end up. It does not say which machine on the local network should receive it next. For that, every network card has a second address of its own, a hardware address, and a machine needs to find the hardware address behind an IP before it can send anything on its own network.

This topic covers MAC addresses, ARP, the protocol that links them to IP addresses, and the table where a machine keeps what it has learned. By the end you can find a machine's MAC address, read the neighbour table with `ip neigh`, watch ARP happen with `tcpdump`, and recognise what a failed lookup looks like.

## MAC addresses

A **MAC address** (media access control) is the hardware address of a network interface. It is 48 bits, written as six pairs of hexadecimal digits:

```text
36:c0:c2:4d:58:0c
```

A physical network card has a MAC address set at the factory. The first three pairs identify the maker, and the last three are a serial number. Virtual interfaces, such as those of containers and cloud servers, are given a made-up MAC when they are created. These have a particular bit set in the first pair to mark them as **locally administered**, which is why a container's MAC address often starts with something like `02`, `36`, `8e` or `c6`.

One MAC address is special: `ff:ff:ff:ff:ff:ff` is the **broadcast** address. A frame sent to it goes to every machine on the local network.

You can find a machine's MAC address with `ip link`, on the `link/ether` line:

```bash
root@alpha:/# ip link show eth0
11: eth0@if33: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP mode DEFAULT group default 
    link/ether 36:c0:c2:4d:58:0c brd ff:ff:ff:ff:ff:ff link-netnsid 0
root@alpha:/# cat /sys/class/net/eth0/address
36:c0:c2:4d:58:0c
```

Your MAC addresses will be different, and they change every time you start a container, because Docker makes up a new one each time.

## Why a packet needs two addresses

The two addresses do different jobs:

| Address | Scope | Changes along the way? |
| --- | --- | --- |
| IP address | From the original sender to the final destination, across any number of networks | No |
| MAC address | From one machine to the next on a single local network | Yes, at every router |

A packet is wrapped in a **frame** for each local network it crosses. The frame's header carries the source and destination MAC addresses. A switch reads only that header: it keeps a table of which MAC address it has seen on which port, and passes each frame to the right one.

When alpha sends to beta, which is on its own network, the frame goes to beta's MAC address. When alpha sends to example.com, the IP destination is example.com's address, but the frame goes to the MAC address of the gateway, `10.10.0.1`, because that is the next machine on the path. The gateway takes the packet out of the frame, puts it in a new frame for the next network, and so on. The topic *The layers model* shows this wrapping in detail.

## ARP

Before alpha can send a frame to `10.10.0.3`, it needs that machine's MAC address. It finds it with **ARP**, the address resolution protocol. ARP has two messages:

1. A **request**, sent to the broadcast address so every machine on the network hears it: "who has `10.10.0.3`? Tell `10.10.0.2`."
2. A **reply**, sent only to the asker by the machine that owns the address: "`10.10.0.3` is at `8e:2c:e5:59:e6:6e`."

ARP only works inside one local network, because broadcasts do not cross routers. That is exactly why a machine sends to its gateway for anything outside its subnet: the only MAC it needs is the gateway's.

IPv6 does the same job with a different protocol called **neighbour discovery**, but the idea and the table it fills are the same.

## The neighbour table

A machine keeps the answers it gets in its **neighbour table**, also called the ARP cache, so it does not have to ask before every packet. `ip neigh` shows it:

```bash
root@alpha:/# ip neigh
10.10.0.1 dev eth0 lladdr c6:33:61:9e:3f:d3 REACHABLE 
10.10.0.3 dev eth0 lladdr 8e:2c:e5:59:e6:6e STALE 
```

Each line is an IP address, the interface it was seen on, the MAC address (`lladdr`, link-layer address) and a state. The table is short: only machines on the local network that alpha has talked to recently. Note that example.com is not in it, even if alpha has just fetched a page from it. Only the gateway is, because that is where those frames went.

| State | Meaning |
| --- | --- |
| `REACHABLE` | Confirmed recently. Used as it is. |
| `STALE` | Not confirmed for a while. Still used, but checked again on next use. |
| `DELAY`, `PROBE` | Being checked again right now. |
| `INCOMPLETE` | A request has been sent and no answer has come yet. |
| `FAILED` | Nobody answered. Packets to this address are dropped. |
| `PERMANENT` | Added by hand. Never expires or gets checked. |

Entries go stale and expire after a few minutes without traffic. That is by design: machines come and go, and addresses get reused.

You can clear the table with `ip neigh flush all`, or remove one entry with `ip neigh del 10.10.0.3 dev eth0`. The machine simply asks again next time.

## Watching ARP with tcpdump

`tcpdump` shows packets as they pass an interface; the *tcpdump* topic covers it in full. Here you need only three options: `-n` to show numbers rather than names, `-e` to show the MAC addresses from the frame header, and the filter `arp` to show only ARP.

On alpha, start a capture:

```bash
root@alpha:/# tcpdump -n -e -i eth0 arp
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
```

On beta, clear its table so it has to ask, then ping alpha:

```bash
root@beta:/# ip neigh flush all
root@beta:/# ping -c 1 alpha
```

alpha's capture shows the exchange:

```text
07:27:28.404754 8e:2c:e5:59:e6:6e > ff:ff:ff:ff:ff:ff, ethertype ARP (0x0806), length 42: Request who-has 10.10.0.2 tell 10.10.0.3, length 28
07:27:28.404758 36:c0:c2:4d:58:0c > 8e:2c:e5:59:e6:6e, ethertype ARP (0x0806), length 42: Reply 10.10.0.2 is-at 36:c0:c2:4d:58:0c, length 28
```

Read each line as source MAC `>` destination MAC, then the message. The request comes from beta's MAC and goes to `ff:ff:ff:ff:ff:ff`, every machine. The reply comes from alpha's MAC and goes only to beta's. Stop the capture with <kbd>Ctrl</kbd>+<kbd>C</kbd>, then look at beta's table:

```bash
root@beta:/# ip neigh
10.10.0.2 dev eth0 lladdr 36:c0:c2:4d:58:0c REACHABLE 
```

## When ARP fails

If nobody owns the address, nobody answers. Ping an address on the lab network where no machine exists:

```bash
root@alpha:/# ping -c 3 10.10.0.99
PING 10.10.0.99 (10.10.0.99) 56(84) bytes of data.
From 10.10.0.2 icmp_seq=1 Destination Host Unreachable
From 10.10.0.2 icmp_seq=2 Destination Host Unreachable
From 10.10.0.2 icmp_seq=3 Destination Host Unreachable

--- 10.10.0.99 ping statistics ---
3 packets transmitted, 0 received, +3 errors, 100% packet loss, time 2025ms
root@alpha:/# ip neigh show 10.10.0.99
10.10.0.99 dev eth0 FAILED 
```

Look at who reports the error: `From 10.10.0.2`, alpha itself. No ping ever left alpha, because it never found a MAC to send it to. A capture would show only requests, about one a second, with no replies:

```text
07:27:40.212521 36:c0:c2:4d:58:0c > ff:ff:ff:ff:ff:ff, ethertype ARP (0x0806), length 42: Request who-has 10.10.0.99 tell 10.10.0.2, length 28
07:27:41.213685 36:c0:c2:4d:58:0c > ff:ff:ff:ff:ff:ff, ethertype ARP (0x0806), length 42: Request who-has 10.10.0.99 tell 10.10.0.2, length 28
07:27:42.237277 36:c0:c2:4d:58:0c > ff:ff:ff:ff:ff:ff, ethertype ARP (0x0806), length 42: Request who-has 10.10.0.99 tell 10.10.0.2, length 28
```

You may see each request printed twice, a few microseconds apart, depending on how Docker runs on your computer. Go by the timestamps: the kernel asks about once a second, a few times, then marks the entry `FAILED`.

So `Destination Host Unreachable` from your own address, on your own subnet, means the target is switched off, has a different address from the one you think, or is on a different network segment. It is a different symptom from a ping that simply gets no answer, where the frame was delivered but nothing came back.

The other ARP problem is a **wrong** entry. If an address moves from one machine to another, for example when a server is replaced and the new one takes over the old IP, other machines may keep sending to the old MAC until their entry is checked again. Usually that is a matter of seconds, because a new machine often announces itself with a **gratuitous ARP**, a reply nobody asked for, which updates everyone's table. A static entry added by hand never updates, which is why they are rare and worth checking for.

## Tasks

### Task 1: Catch an ARP exchange

Run a capture on alpha that shows ARP with MAC addresses. From beta, make alpha's address appear in beta's neighbour table from scratch. Then match each MAC address in the capture to the machine it belongs to, using `ip link` on each.

<details>
<summary>Check your work</summary>

```bash
root@alpha:/# tcpdump -n -e -i eth0 arp
root@beta:/# ip neigh flush all
root@beta:/# ping -c 1 alpha
```

```text
07:27:28.404754 8e:2c:e5:59:e6:6e > ff:ff:ff:ff:ff:ff, ethertype ARP (0x0806), length 42: Request who-has 10.10.0.2 tell 10.10.0.3, length 28
07:27:28.404758 36:c0:c2:4d:58:0c > 8e:2c:e5:59:e6:6e, ethertype ARP (0x0806), length 42: Reply 10.10.0.2 is-at 36:c0:c2:4d:58:0c, length 28
```

```bash
root@beta:/# ip -br link show eth0
eth0@if34        UP             8e:2c:e5:59:e6:6e <BROADCAST,MULTICAST,UP,LOWER_UP> 
```

`8e:2c:…` is beta, the asker, and `36:c0:…` is alpha, the owner. Your MACs will differ. If the capture shows nothing, beta still had alpha in its table: flush it first. If you see a request from alpha instead, alpha was checking a stale entry for beta at the same moment, which is normal.

</details>

### Task 2: A wrong entry

On alpha, add a static neighbour entry that points beta's IP address at a MAC that does not exist:

```bash
root@alpha:/# ip neigh replace 10.10.0.3 lladdr 02:00:00:00:00:99 dev eth0 nud permanent
```

Ping beta from alpha and note what happens. Then, imagining you did not know about the entry, find the cause with `ip neigh` and fix it.

<details>
<summary>Check your work</summary>

```bash
root@alpha:/# ping -c 2 -W 1 beta
PING beta (10.10.0.3) 56(84) bytes of data.

--- beta ping statistics ---
2 packets transmitted, 0 received, 100% packet loss, time 1054ms

root@alpha:/# ip neigh show 10.10.0.3
10.10.0.3 dev eth0 lladdr 02:00:00:00:00:99 PERMANENT 
root@alpha:/# ip neigh del 10.10.0.3 dev eth0
root@alpha:/# ping -c 1 beta
64 bytes from beta.lab (10.10.0.3): icmp_seq=1 ttl=64 time=0.110 ms
root@alpha:/# ip neigh show 10.10.0.3
10.10.0.3 dev eth0 lladdr 8e:2c:e5:59:e6:6e REACHABLE 
```

The frames went to a MAC no machine has, so they were dropped silently: no error, just lost packets. The clue is `PERMANENT` with a MAC that does not match beta's `ip link`. Flushing the table with `ip neigh flush all` does not remove permanent entries; you have to delete it by name.

</details>

## Quiz

**1. alpha has just downloaded a page from example.com. Which MAC address did it put on those frames, and would example.com's address appear in `ip neigh`?**

<details>
<summary>Show answer</summary>

The gateway's MAC, the one for `10.10.0.1`. example.com is on another network, so alpha sends to the gateway and lets it pass the packet on. example.com's address does not appear in alpha's neighbour table, only the gateway's.

</details>

**2. Why is an ARP request sent to `ff:ff:ff:ff:ff:ff` but the reply is not?**

<details>
<summary>Show answer</summary>

The asker does not yet know which machine has the address, so it has to ask everyone on the network. The owner does know who asked, because the request includes the asker's IP and MAC, so it replies to that machine alone.

</details>

**3. What is the difference between ping printing `From 10.10.0.2 icmp_seq=1 Destination Host Unreachable` on alpha and ping printing nothing at all and ending with 100% packet loss?**

<details>
<summary>Show answer</summary>

`Destination Host Unreachable` from alpha's own address means alpha could not find a MAC address for the target: ARP got no answer, so nothing was sent. No output at all means the packets were sent but no reply came back, for example because a firewall dropped them, the reply took a different path, or the target ignores ping.

</details>

**4. A database server was replaced, and the new one was given the old server's IP address. Most application servers connect to it fine, but one keeps timing out for several minutes after the switch. What could cause that, and how would you check?**

<details>
<summary>Show answer</summary>

That one application server may still be sending to the old server's MAC address, from a neighbour entry that has not been checked again, or from a static entry that never will be. Compare `ip neigh show <database IP>` on it with the MAC in `ip link` on the new database server. If they differ, delete the entry with `ip neigh del` and the next packet will trigger a fresh ARP lookup.

</details>

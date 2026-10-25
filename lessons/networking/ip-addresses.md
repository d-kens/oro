Every packet carries the address it comes from and the address it is going to. On almost every network you will work with, those are IP addresses. When a service cannot be reached, one of the first questions is which address it is on and whether that address can be reached from where you are.

This topic covers the two kinds of IP address, IPv4 and IPv6, the ranges set aside for private networks, and how to find the addresses a machine has. By the end you can read an address, tell a private one from a public one, and list a machine's addresses with `ip`.

## IPv4 addresses

An **IPv4 address** is a 32-bit number. Nobody writes it as one long number. Instead it is split into four bytes, each written in decimal and separated by dots, like `10.10.0.2`. Each of the four parts is called an **octet** and can be anything from 0 to 255.

```text
10.10.0.2   =   00001010 . 00001010 . 00000000 . 00000010
```

32 bits allow about 4.3 billion addresses. That sounds like a lot, but there are more devices than that, and the free pool ran out years ago. Two things keep IPv4 going: private ranges that many networks reuse, and NAT, which lets many private addresses share one public one (the *NAT* topic covers it).

An address has two parts. The first part says which **network** the host is on, and the rest says which **host** it is on that network. On the lab, `10.10.0` is the network and the last number is the host, so alpha (`10.10.0.2`) and beta (`10.10.0.3`) are on the same network. Where exactly the split falls is written after a slash, as in `10.10.0.2/24`. The *Subnets and CIDR* topic explains that number in full. For now, read `/24` as "the first three octets are the network".

## Private, public and special ranges

Some ranges are set aside for **private** networks: homes, offices, data centres and cloud virtual networks. Anyone can use them, and the same addresses are reused on millions of separate networks. Routers on the internet will not carry packets to them, so a private address is only reachable from inside its own network, or through something that bridges into it, such as NAT, a VPN or a load balancer.

| Range | Written as | Typical use |
| --- | --- | --- |
| 10.0.0.0 – 10.255.255.255 | `10.0.0.0/8` | Cloud virtual networks, large company networks, this lab |
| 172.16.0.0 – 172.31.255.255 | `172.16.0.0/12` | Docker's default networks, some cloud defaults |
| 192.168.0.0 – 192.168.255.255 | `192.168.0.0/16` | Home and small office routers |

Every other ordinary address is **public**: it is unique across the whole internet and can be routed to from anywhere. A web server that the world can reach has a public address somewhere in front of it, even if the server itself only has a private one.

A few more ranges are worth knowing because you will meet them:

| Range | Meaning |
| --- | --- |
| `127.0.0.0/8` | **Loopback**. Always the machine itself. `127.0.0.1` is the one you will use. |
| `169.254.0.0/16` | **Link-local**. A machine gives itself one of these when it cannot get an address from DHCP. Cloud platforms also use `169.254.169.254` for the instance metadata service. |
| `100.64.0.0/10` | Shared address space used by internet providers for their own NAT. Not yours to use, and not public either. |
| `0.0.0.0` | "No particular address". A server listening on `0.0.0.0` listens on all of its addresses, as the *Ports and sockets* topic shows. |
| `192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24` | Reserved for documentation. These lessons use them for made-up public addresses. |

A useful habit: when you see an address in a log or an error, decide first which kind it is. A connection from `10.x` came from inside your network. A connection from a public address came from outside, or from something that changes addresses on the way in. An address starting `169.254` usually means a machine that failed to get its proper address.

## IPv6 addresses

**IPv6** was designed to end the shortage for good. An IPv6 address is 128 bits, written as eight groups of four hexadecimal digits separated by colons:

```text
2001:0db8:0000:0000:0000:0000:0000:0002
```

That is long, so two shortening rules apply:

- Leading zeros in a group can be dropped: `0db8` becomes `db8`, `0002` becomes `2`.
- One run of all-zero groups can be replaced by `::`. Only one, or the address would be ambiguous.

So the address above is usually written `2001:db8::2`. Both forms mean the same address, and tools may show either.

The special ranges have IPv6 versions too:

| Address or range | Meaning |
| --- | --- |
| `::1` | Loopback, the same as `127.0.0.1` |
| `fe80::/10` | Link-local. Every IPv6 interface gives itself one automatically. |
| `fc00::/7` (in practice `fd..`) | Unique local addresses, the private ranges of IPv6 |
| `2001:db8::/32` | Reserved for documentation |
| Most addresses starting `2` or `3` | Global, public addresses |

There is so much IPv6 space that a network does not need NAT. Every device can have a public address, and a firewall decides what may reach it.

Most networks today run both at once, which is called **dual stack**. A name can have an IPv4 address and an IPv6 address, and a client may try either. When something works from one machine and not another, it is worth checking which of the two each one used.

The lab network runs on IPv4 only. Docker turns IPv6 off on networks that were not created with it, so on alpha you will only see the IPv6 loopback:

```bash
root@alpha:/# ip -6 addr
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 state UNKNOWN qlen 1000
    inet6 ::1/128 scope host 
       valid_lft forever preferred_lft forever
```

## Finding a machine's addresses

On Linux, `ip addr` lists every interface and the addresses on it. You saw the brief form in the first topic. The full form shows more:

```bash
root@alpha:/# ip addr show eth0
11: eth0@if33: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default 
    link/ether 36:c0:c2:4d:58:0c brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 10.10.0.2/24 brd 10.10.0.255 scope global eth0
       valid_lft forever preferred_lft forever
```

- `inet` is an IPv4 address, with its prefix length after the slash. `inet6` would be an IPv6 one.
- `brd` is the broadcast address of that network, covered in the *Subnets and CIDR* topic.
- `scope global` means the address can be used to talk to other machines. The loopback's addresses have `scope host`, meaning this machine only.
- `link/ether` is the hardware address, which the *MAC addresses and ARP* topic covers.

Some variations save time:

| Command | Shows |
| --- | --- |
| `ip -br addr` | One line per interface, with state and addresses |
| `ip -4 addr` / `ip -6 addr` | Only IPv4 or only IPv6 addresses |
| `ip addr show eth0` | One interface |
| `hostname -I` | Just the addresses, all on one line, without the loopback |

```bash
root@alpha:/# ip -4 -br addr
lo               UNKNOWN        127.0.0.1/8 
eth0@if33        UP             10.10.0.2/24 
root@alpha:/# hostname -I
10.10.0.2 
```

On your own computer the commands differ. On Linux it is the same `ip addr`. On macOS, `ifconfig` lists interfaces, and `ipconfig getifaddr en0` prints the address of the main one. On Windows, `ipconfig` in a terminal.

You will notice that your own computer almost certainly has a private address, such as `192.168.1.20`. Your **public address** is not on any of your interfaces. It belongs to your home router, which shares it among every device in the house. The only way to see it from inside is to ask a server on the internet what address your request came from. Cloud servers work the same way: the server's interface has a private address, and the public address the world uses is mapped onto it by the provider's network.

To see which of its addresses a machine will use to reach a given destination, ask the routing table:

```bash
root@alpha:/# ip route get 10.10.0.3
10.10.0.3 dev eth0 src 10.10.0.2 uid 0 
    cache 
```

`src` is the address the reply will be sent back to. That matters on machines with several addresses, and the *Routing and gateways* topic explains the rest of the line.

## Checking addresses with Python

The lab image has `python3`, whose standard `ipaddress` module knows all the special ranges. It is handy for checking your reading of an address:

```bash
root@alpha:/# python3 -c "import ipaddress; a = ipaddress.ip_address('10.10.0.2'); print(a.is_private, a.is_global)"
True False
root@alpha:/# python3 -c "import ipaddress; print(ipaddress.ip_address('2001:db8::2').exploded)"
2001:0db8:0000:0000:0000:0000:0000:0002
```

`is_global` is the one to trust for "reachable from the internet". `is_private` is broader than the three private ranges: it is also true for loopback, link-local and the documentation ranges, because none of them are public.

## Tasks

### Task 1: Classify some addresses

Without running anything, decide for each address whether it is private, public, loopback, link-local or something else: `172.20.4.9`, `192.168.0.254`, `172.32.0.1`, `127.0.0.53`, `169.254.10.20`, `100.64.3.3`, `fd12:3456::1`. Then check your answers on alpha with Python's `ipaddress` module.

<details>
<summary>Check your work</summary>

A short loop prints both flags for each address:

```bash
root@alpha:/# python3 -c "
import ipaddress
for a in ['172.20.4.9', '192.168.0.254', '172.32.0.1', '127.0.0.53', '169.254.10.20', '100.64.3.3', 'fd12:3456::1']:
    x = ipaddress.ip_address(a)
    print(a, x.is_private, x.is_global, x.is_loopback, x.is_link_local)
"
172.20.4.9 True False False False
192.168.0.254 True False False False
172.32.0.1 False True False False
127.0.0.53 True False True False
169.254.10.20 True False False True
100.64.3.3 False False False False
fd12:3456::1 True False False False
```

The common mistake is `172.32.0.1`. The private range is `172.16` to `172.31`, so `172.32` is public. `127.0.0.53` is loopback, because all of `127.0.0.0/8` is, not only `127.0.0.1`. `100.64.3.3` is neither private nor global: it is the shared range providers use for their own NAT. `fd12:3456::1` is an IPv6 unique local address, the IPv6 private range.

</details>

### Task 2: Every address alpha has, and one it uses

On alpha, list all of its IPv4 and IPv6 addresses. Then find an IPv4 address of `example.com` with `dig +short`, and ask alpha which of its own addresses it would use to reach it.

<details>
<summary>Check your work</summary>

```bash
root@alpha:/# ip -br addr
lo               UNKNOWN        127.0.0.1/8 ::1/128 
eth0@if33        UP             10.10.0.2/24 
root@alpha:/# dig +short example.com
104.20.23.154
172.66.147.243
root@alpha:/# ip route get 104.20.23.154
104.20.23.154 via 10.10.0.1 dev eth0 src 10.10.0.2 uid 0 
    cache 
```

alpha has two IPv4 addresses (`127.0.0.1` and `10.10.0.2`) and one IPv6 address (`::1`). The addresses for example.com will probably differ for you, and there may be one or several. alpha sends from `10.10.0.2`, its only address that can leave the machine, through `10.10.0.1`, Docker's gateway. You may also see several `DOWN` interfaces such as `tunl0` with no address; they are unused and can be ignored.

</details>

## Quiz

**1. Which of these addresses are private: `10.200.1.1`, `172.15.0.1`, `192.168.255.1`, `198.51.100.4`?**

<details>
<summary>Show answer</summary>

`10.200.1.1` and `192.168.255.1` are private. `172.15.0.1` is public, because the private block starts at `172.16`. `198.51.100.4` is in a documentation range: it is not private, but it is not used on the real internet either.

</details>

**2. Write `2001:0db8:0000:0000:0001:0000:0000:0010` in its shortest form.**

<details>
<summary>Show answer</summary>

`2001:db8::1:0:0:10`. Leading zeros go from every group, and the longest run of zero groups (the first two) becomes `::`. The second run has to stay as `0:0`, because `::` can only be used once.

</details>

**3. A new server cannot be reached by anything. `ip -br addr` on it shows `eth0 UP 169.254.83.12/16`. What does that suggest?**

<details>
<summary>Show answer</summary>

The server did not get its proper address. An address in `169.254.0.0/16` is one a machine picks for itself when it asks for an address and gets no answer, so the likely problem is DHCP: the server cannot reach the DHCP server, or no DHCP server is configured for that network. The *DHCP* topic covers how that exchange works.

</details>

**4. A colleague runs `ip addr` on a cloud server and sees only `10.0.3.17`, yet people on the internet reach the server at `203.0.113.40`. Is something misconfigured?**

<details>
<summary>Show answer</summary>

No. That is normal. The server only has its private address on its interface. The provider's network maps the public address onto it and translates packets on the way in and out, which is a form of NAT. The server never sees the public address in its own interface list.

</details>

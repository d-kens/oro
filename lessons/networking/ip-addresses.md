Every packet carries the address it comes from and the address it is going to. On almost every network you will work with, those are IP addresses. When a service cannot be reached, one of the first questions is which address it is on and whether that address can be reached from where you are.

This topic covers the two kinds of IP address, IPv4 and IPv6, the ranges set aside for private networks, and the network interfaces that addresses belong to. By the end you can tell a private address from a public one, list a machine's interfaces and addresses with `ip`, bring an interface down and up, add an address, and check an interface's MTU.

## IPv4 addresses

An **IPv4 address** is a 32-bit number. Nobody writes it as one long number. Instead it is split into four bytes, each written in decimal and separated by dots, like `10.10.0.2`. Each of the four parts is called an **octet** and can be anything from 0 to 255.

32 bits allow about 4.3 billion addresses. There are more devices than that, and the free pool ran out years ago. Two things keep IPv4 going: private ranges that many networks reuse, and NAT, which lets many private addresses share one public one (the *NAT* topic covers it).

An address has two parts. The first part says which **network** the host is on, and the rest says which **host** it is on that network. On the lab, `10.10.0` is the network and the last number is the host, so alpha (`10.10.0.2`) and beta (`10.10.0.3`) are on the same network. Where exactly the split falls is written after a slash, as in `10.10.0.2/24`. The *Subnets and CIDR* topic explains that number in full. For now, read `/24` as "the first three octets are the network".

## Private, public and special ranges

Some ranges are set aside for **private** networks: homes, offices, data centres and cloud virtual networks. Anyone can use them, and the same addresses are reused on millions of separate networks. Routers on the internet will not carry packets to them, so a private address is only reachable from inside its own network, or through something that bridges into it, such as NAT, a VPN or a load balancer.

| Range | Written as | Typical use |
| --- | --- | --- |
| 10.0.0.0 – 10.255.255.255 | `10.0.0.0/8` | Cloud virtual networks, large company networks, this lab |
| 172.16.0.0 – 172.31.255.255 | `172.16.0.0/12` | Docker's default networks, some cloud defaults |
| 192.168.0.0 – 192.168.255.255 | `192.168.0.0/16` | Home and small office routers |

Every other ordinary address is **public**: it is unique across the whole internet and can be routed to from anywhere. A web server that the world can reach has a public address somewhere in front of it, even if the server itself only has a private one.

A few more ranges come up often:

| Range | Meaning |
| --- | --- |
| `127.0.0.0/8` | **Loopback**. Always the machine itself. `127.0.0.1` is the one you will use. |
| `169.254.0.0/16` | **Link-local**. A machine gives itself one of these when it asks the network for an address and gets no answer. Cloud platforms also use `169.254.169.254` for the instance metadata service. |
| `100.64.0.0/10` | Shared address space used by internet providers for their own NAT. Not yours to use, and not public either. |
| `0.0.0.0` | "No particular address". A server listening on `0.0.0.0` listens on all of its addresses, as the *Ports and sockets* topic shows. |
| `192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24` | Reserved for documentation. These lessons use them for made-up public addresses. |

Most machines get their address automatically when they join a network, through **DHCP**: the machine broadcasts a request, and a DHCP server, usually the router or the cloud provider's network, replies with an address, a gateway and a DNS server. A `169.254` address means that exchange failed.

When you see an address in a log or an error, decide first which kind it is. A connection from `10.x` came from inside your network. A connection from a public address came from outside, or from something that changes addresses on the way in.

## IPv6 addresses

**IPv6** was designed to end the shortage for good. An IPv6 address is 128 bits, written as eight groups of four hexadecimal digits separated by colons:

```text
2001:0db8:0000:0000:0000:0000:0000:0002
```

That is long, so two shortening rules apply:

- Leading zeros in a group can be dropped: `0db8` becomes `db8`, `0002` becomes `2`.
- One run of all-zero groups can be replaced by `::`. Only one, or the address would be ambiguous.

So the address above is usually written `2001:db8::2`. `::1` is the IPv6 loopback, addresses starting `fe80:` are link-local, addresses starting `fd` are the private range, and most addresses starting `2` or `3` are public. There is so much IPv6 space that a network does not need NAT: every device can have a public address, and a firewall decides what may reach it.

Most networks today run both at once, which is called **dual stack**. A name can have an IPv4 address and an IPv6 address, and a client may try either. When something works from one machine and not another, check which of the two each one used. The lab network runs on IPv4 only; Docker turns IPv6 off on networks that were not created with it.

## Interfaces

A machine does not have an IP address on its own. The address belongs to one of its **network interfaces**, the points where it connects to a network. An interface is anything the kernel can send packets out of and receive packets from. Some match real hardware, such as `eth0` or `ens5` for a network card, and many are virtual: the loopback `lo`, bridges such as `docker0` that act as software switches, tunnels such as `wg0` for a VPN, and virtual pairs that connect containers.

In the lab, each container's `eth0` is one end of a virtual pair. The other end is plugged into the bridge Docker made for the `lab` network, and the `@if33` is the number of the interface at the other end. Your number will differ.

`ip addr` lists every interface and the addresses on it:

```bash
root@alpha:/# ip addr show eth0
11: eth0@if33: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default 
    link/ether 36:c0:c2:4d:58:0c brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 10.10.0.2/24 brd 10.10.0.255 scope global eth0
       valid_lft forever preferred_lft forever
```

- The flags in angle brackets. `UP` means the interface has been switched on. `LOWER_UP` means the link underneath is working: on real hardware, a cable is plugged in and the other end is up. You need both for traffic to flow.
- `mtu 1500` is the largest packet the interface will send, covered below.
- `link/ether` is the interface's **MAC address**, a hardware address used to deliver packets between machines on the same local network. *The layers model* topic shows it in use.
- `inet` is an IPv4 address, with its prefix length after the slash. `inet6` would be an IPv6 one. `brd` is the broadcast address of that network.
- `scope global` means the address can be used to talk to other machines. The loopback's addresses have `scope host`, meaning this machine only.

`ip -br addr` gives one line per interface, `ip -4 addr` and `ip -6 addr` show one family, and `ip -s link` adds counters of packets received (`RX`) and sent (`TX`), with errors and drops. On a real server, `errors` or `dropped` counters that keep climbing point to a problem with the card, the cable or the driver, below anything IP can see.

A machine's **public address** is often not on any of its interfaces. A home computer has a private address, and the public one belongs to the router. A cloud server's interface has a private address, and the provider's network maps the public one onto it.

To see which of its addresses a machine will use to reach a given destination, ask the routing table:

```bash
root@alpha:/# ip route get 10.10.0.3
10.10.0.3 dev eth0 src 10.10.0.2 uid 0 
    cache 
```

`src` is the address the packet is sent from. The *Routing and gateways* topic explains the rest of the line.

## The loopback

Every machine has a **loopback** interface, `lo`. Packets sent to it never leave the machine; they come straight back in. It holds `127.0.0.1` and `::1`, and programs use it to talk to other programs on the same machine. Docker's DNS server in the lab listens on `127.0.0.11`, so even name lookups in the lab depend on `lo`:

```bash
root@alpha:/# ip link set lo down
root@alpha:/# ping -c 1 beta
ping: beta: Temporary failure in name resolution
root@alpha:/# ip link set lo up
```

## Changing an interface by hand

`ip link set` and `ip addr` change interfaces. These changes need root, and in the lab they work because the containers were started with `--cap-add NET_ADMIN`.

```bash
root@alpha:/# ip link set eth0 down
root@alpha:/# ping -c 1 10.10.0.3
ping: connect: Network is unreachable
```

The address is still configured, but the interface is off, so the kernel has no way out to the network. `Network is unreachable` is an error from your own machine: no packet was sent at all. Bring it back and look at the routing table:

```bash
root@alpha:/# ip link set eth0 up
root@alpha:/# ip route
10.10.0.0/24 dev eth0 proto kernel scope link src 10.10.0.2 
```

Before, it also had a line `default via 10.10.0.1 dev eth0`, the route to everything outside the lab. Taking the interface down removed every route that used it, and bringing it up only restored the route the kernel makes for the address itself. Until you add the default route back with `ip route add default via 10.10.0.1`, alpha cannot reach the internet. On a real server, a network service such as systemd-networkd or NetworkManager normally puts the routes back. Be careful doing this over SSH: taking down the interface you are connected through cuts off your own session.

An interface can hold more than one address. Add one with `ip addr add`, giving the prefix length, and other machines can use it straight away:

```bash
root@alpha:/# ip addr add 10.10.0.50/24 dev eth0
root@beta:/# ping -c 1 10.10.0.50
64 bytes from 10.10.0.50: icmp_seq=1 ttl=64 time=0.148 ms
root@alpha:/# ip addr del 10.10.0.50/24 dev eth0
```

Nothing done with `ip` survives a reboot, or in the lab, the container exiting. Permanent settings live in the system's network configuration, such as netplan files on Ubuntu, or come from DHCP. On a cloud server you rarely add addresses by hand; you attach them through the provider, and the server picks them up.

## MTU

**MTU:** maximum transmission unit, the largest packet an interface will send, in bytes. Ethernet's standard is 1500. Larger data is cut into packets that fit.

You can test it with `ping`. `-s` sets the size of the data, and `-M do` forbids splitting the packet. An ICMP header is 8 bytes and an IPv4 header is 20, so 1472 bytes of data makes exactly 1500:

```bash
root@alpha:/# ping -c 1 -M do -s 1472 beta
PING beta (10.10.0.3) 1472(1500) bytes of data.
1480 bytes from beta.lab (10.10.0.3): icmp_seq=1 ttl=64 time=0.038 ms
root@alpha:/# ping -c 1 -M do -s 1473 beta
PING beta (10.10.0.3) 1473(1501) bytes of data.
ping: local error: message too long, mtu=1500
```

`ip link set eth0 mtu 1400` changes it. MTU problems have a recognisable shape. Small packets get through and large ones vanish, so a connection opens, a short request works, and then a large response or file transfer hangs. You meet this with VPNs and tunnels, which add their own headers and so leave less room, and in cloud networks, where some links allow larger "jumbo" packets of around 9000 bytes and others do not.

## Tasks

### Task 1: Classify some addresses

Without running anything, decide for each address whether it is private, public, loopback, link-local or something else: `172.20.4.9`, `192.168.0.254`, `172.32.0.1`, `127.0.0.53`, `169.254.10.20`, `100.64.3.3`, `fd12:3456::1`. Then check your answers on alpha with Python's `ipaddress` module, which knows all the special ranges.

<details>
<summary>Check your work</summary>

A short loop prints the flags for each address:

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

The common mistake is `172.32.0.1`. The private range is `172.16` to `172.31`, so `172.32` is public. `127.0.0.53` is loopback, because all of `127.0.0.0/8` is, not only `127.0.0.1`. `100.64.3.3` is neither private nor global: it is the shared range providers use for their own NAT. `fd12:3456::1` is an IPv6 unique local address, the IPv6 private range. `is_private` is broader than the three private ranges, so trust `is_global` for "reachable from the internet".

</details>

### Task 2: Down, up, and fully working

On alpha, take `eth0` down and bring it back up. Then make alpha fully working again, so that both `ping -c 1 beta` and `ping -c 1 example.com` succeed. Write down what was missing.

<details>
<summary>Check your work</summary>

```bash
root@alpha:/# ip link set eth0 down
root@alpha:/# ip link set eth0 up
root@alpha:/# ping -c 1 beta
64 bytes from beta.lab (10.10.0.3): icmp_seq=1 ttl=64 time=0.035 ms
root@alpha:/# ping -c 1 example.com
ping: connect: Network is unreachable
root@alpha:/# ip route add default via 10.10.0.1
root@alpha:/# ping -c 1 example.com
PING example.com (104.20.23.154) 56(84) bytes of data.
64 bytes from 104.20.23.154: icmp_seq=1 ttl=63 time=77.3 ms
```

The default route was missing. Beta still worked because it is on alpha's own network, which the kernel's automatic route covers. The address and time for example.com will differ for you. The likely mistake is to stop after `ping beta` succeeds and assume the machine is fine.

</details>

## Quiz

**1. Which of these addresses are private: `10.200.1.1`, `172.15.0.1`, `192.168.255.1`, `198.51.100.4`?**

<details>
<summary>Show answer</summary>

`10.200.1.1` and `192.168.255.1` are private. `172.15.0.1` is public, because the private block starts at `172.16`. `198.51.100.4` is in a documentation range: it is not private, but it is not used on the real internet either.

</details>

**2. A new server cannot be reached by anything. `ip -br addr` on it shows `eth0 UP 169.254.83.12/16`. What does that suggest?**

<details>
<summary>Show answer</summary>

The server did not get its proper address. An address in `169.254.0.0/16` is one a machine picks for itself when it asks for an address and gets no answer, so the likely problem is DHCP: the server cannot reach the DHCP server, or no DHCP server is configured for that network.

</details>

**3. A colleague runs `ip addr` on a cloud server and sees only `10.0.3.17`, yet people on the internet reach the server at `203.0.113.40`. Is something misconfigured?**

<details>
<summary>Show answer</summary>

No. That is normal. The server only has its private address on its interface. The provider's network maps the public address onto it and translates packets on the way in and out, which is a form of NAT. The server never sees the public address in its own interface list.

</details>

**4. After a VPN is set up, SSH sessions to a server connect and show a prompt, but freeze as soon as you run a command with a lot of output. Small commands work. What would you check first?**

<details>
<summary>Show answer</summary>

The MTU. Small packets fit and get through; large ones are too big for the tunnel, which adds its own headers, and get dropped. Test with `ping -M do -s` at different sizes to find the largest size that gets through, then lower the MTU on the interface to match.

</details>

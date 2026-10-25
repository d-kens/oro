Every IP address comes with a number after a slash, like the `/24` in `10.10.0.2/24`. That number decides which other addresses a machine thinks are on its own network, and so whether it sends a packet straight to the destination or hands it to a router. Get it wrong and two machines that look like neighbours cannot talk.

This topic explains network masks and CIDR notation from the binary up, without needing much maths. By the end you can work out the range of a network by hand, check it with Python, tell whether two addresses are on the same network, and split a range into smaller subnets.

## The network part and the host part

The *IP addresses* topic said that an address has a network part and a host part. The **network mask**, or netmask, says where the split falls. It is a 32-bit number like the address itself: a run of 1s for the network part, followed by 0s for the host part.

Here is alpha's address with the mask `255.255.255.0` under it:

```text
address   10.10.0.2       00001010 00001010 00000000 00000010
mask      255.255.255.0   11111111 11111111 11111111 00000000
                          |--------- network --------| host |
```

Wherever the mask has a 1, that bit of the address belongs to the network. Wherever it has a 0, the bit belongs to the host. So every address whose first 24 bits match `10.10.0` is on the same network as alpha, and the last 8 bits number the hosts on it.

You only ever need a handful of values to read a mask. An octet of the mask is always one of these, because the 1s always come first:

| Octet | Binary | Network bits in that octet |
| --- | --- | --- |
| 0 | `00000000` | 0 |
| 128 | `10000000` | 1 |
| 192 | `11000000` | 2 |
| 224 | `11100000` | 3 |
| 240 | `11110000` | 4 |
| 248 | `11111000` | 5 |
| 252 | `11111100` | 6 |
| 254 | `11111110` | 7 |
| 255 | `11111111` | 8 |

A mask like `255.255.0.255` cannot exist. The 1s must form one unbroken run from the left.

## CIDR notation

Writing out the mask is long-winded, so it is shortened to the count of 1s in it. `255.255.255.0` has 24 ones, so it is written `/24`. This is **CIDR notation**, and the number is the **prefix length**. `10.10.0.0/24` means "the network whose first 24 bits are those of `10.10.0.0`".

Each extra bit in the prefix halves the network. Each bit fewer doubles it. These are the sizes you will meet most:

| Prefix | Mask | Addresses | Usable hosts | Common use |
| --- | --- | --- | --- | --- |
| `/8` | 255.0.0.0 | 16,777,216 | 16,777,214 | The whole `10.` private range |
| `/16` | 255.255.0.0 | 65,536 | 65,534 | A whole cloud virtual network |
| `/20` | 255.255.240.0 | 4,096 | 4,094 | A large subnet |
| `/24` | 255.255.255.0 | 256 | 254 | A typical subnet, and the lab |
| `/25` | 255.255.255.128 | 128 | 126 | Half a /24 |
| `/26` | 255.255.255.192 | 64 | 62 | A quarter of a /24 |
| `/27` | 255.255.255.224 | 32 | 30 | A small subnet |
| `/28` | 255.255.255.240 | 16 | 14 | Often the smallest a cloud allows |
| `/30` | 255.255.255.252 | 4 | 2 | A link between two routers |
| `/32` | 255.255.255.255 | 1 | 1 | Exactly one address, used in firewall rules and routes |

The number of addresses is 2 to the power of the host bits. A `/26` has 32 − 26 = 6 host bits, and 2⁶ = 64.

**Usable hosts** is two fewer than the total, because two addresses in each network are reserved:

- The first, with all host bits 0, is the **network address**. It names the network itself, as in `10.10.0.0/24`.
- The last, with all host bits 1, is the **broadcast address**, used to send to every host on the network at once. On the lab it is `10.10.0.255`, which is the `brd` you saw in `ip addr`.

Cloud providers reserve a few more in each subnet, usually the first few and the last, for their own router, DNS and future use. So a `/28` in a cloud network may give you only 11 usable addresses, not 14. Check your provider's documentation before sizing subnets tightly.

## Working out a range by hand

You can find the range for any address and prefix without writing out binary. The trick is the **block size**: in the octet where the mask stops being 255, take 256 minus that octet of the mask. Networks always start at a multiple of the block size.

Take `192.168.10.77/26`:

1. The mask is `255.255.255.192`. The interesting octet is the last one, `192`.
2. Block size is 256 − 192 = 64. So networks start at `.0`, `.64`, `.128` and `.192`.
3. 77 falls between 64 and 128, so the network address is `192.168.10.64`.
4. The next network starts at `.128`, so the broadcast is one less: `192.168.10.127`.
5. Usable hosts are everything in between: `192.168.10.65` to `192.168.10.126`, which is 62 addresses.

It works the same when the split is in an earlier octet. Take `10.1.37.200/20`:

1. The mask is `255.255.240.0`. The interesting octet is the third, `240`.
2. Block size is 256 − 240 = 16. Networks start at third octets of 0, 16, 32, 48 and so on.
3. 37 falls between 32 and 48, so the network is `10.1.32.0/20`.
4. The broadcast is the last address before `10.1.48.0`, which is `10.1.47.255`.
5. Usable hosts run from `10.1.32.1` to `10.1.47.254`.

## Checking it with Python

The lab image does not include `ipcalc`, but Python's `ipaddress` module does the same job. Start `python3` on alpha and try a few lines. The `>>>` is Python's prompt:

```bash
root@alpha:/# python3
Python 3.12.3 (main, Aug 31 2026, 10:18:26) [GCC 13.3.0] on linux
Type "help", "copyright", "credits" or "license" for more information.
>>> import ipaddress
>>> net = ipaddress.ip_network('10.10.0.0/24')
>>> net.netmask
IPv4Address('255.255.255.0')
>>> net.broadcast_address
IPv4Address('10.10.0.255')
>>> net.num_addresses
256
>>> ipaddress.ip_address('10.10.0.200') in net
True
>>> ipaddress.ip_address('10.10.1.5') in net
False
```

To check the worked example, give the address with its prefix as an **interface**, which is an address plus the network it sits on:

```bash
>>> ipaddress.ip_interface('192.168.10.77/26').network
IPv4Network('192.168.10.64/26')
>>> net = ipaddress.ip_network('192.168.10.64/26')
>>> net.network_address, net.broadcast_address
(IPv4Address('192.168.10.64'), IPv4Address('192.168.10.127'))
>>> hosts = list(net.hosts())
>>> hosts[0], hosts[-1], len(hosts)
(IPv4Address('192.168.10.65'), IPv4Address('192.168.10.126'), 62)
```

If you pass an address that is not the start of its network to `ip_network`, Python refuses, which catches a common typo in configuration:

```text
ValueError: 172.16.5.130/27 has host bits set
```

Type `exit()` or press <kbd>Ctrl</kbd>+<kbd>D</kbd> to leave Python.

## Same network or not

This is where the prefix matters in practice. When a machine sends a packet, it checks whether the destination is inside its own network:

- If it is, the machine sends the packet directly, on the local link.
- If it is not, the machine sends it to its default gateway, a router, and lets that deal with it.

You can watch the decision in the lab. Give alpha and beta each an extra address on a network that exists only between them:

```bash
root@alpha:/# ip addr add 192.168.77.1/24 dev eth0
root@beta:/# ip addr add 192.168.77.2/24 dev eth0
root@beta:/# ping -c 2 192.168.77.1
PING 192.168.77.1 (192.168.77.1) 56(84) bytes of data.
64 bytes from 192.168.77.1: icmp_seq=1 ttl=64 time=0.069 ms
64 bytes from 192.168.77.1: icmp_seq=2 ttl=64 time=0.227 ms
root@beta:/# ip route get 192.168.77.1
192.168.77.1 dev eth0 src 192.168.77.2 uid 0 
    cache 
```

They are on the same network, so beta sends straight out of `eth0`. Now move beta's extra address to a different network, while both machines stay plugged into the same Docker switch:

```bash
root@beta:/# ip addr del 192.168.77.2/24 dev eth0
root@beta:/# ip addr add 192.168.78.2/24 dev eth0
root@beta:/# ip route get 192.168.77.1
192.168.77.1 via 10.10.0.1 dev eth0 src 10.10.0.3 uid 0 
    cache 
root@beta:/# ping -c 2 -W 1 192.168.77.1
PING 192.168.77.1 (192.168.77.1) 56(84) bytes of data.

--- 192.168.77.1 ping statistics ---
2 packets transmitted, 0 received, 100% packet loss, time 1008ms
```

Now beta believes `192.168.77.1` is somewhere else, so it sends the packets `via 10.10.0.1`, Docker's gateway, which has no idea where that network is. The cable is the same; only the arithmetic changed. Remove the extra addresses with `ip addr del` when you are done.

A mismatched prefix causes the same kind of fault in real networks. A server configured as `/16` when its neighbours use `/24` will try to reach far-away addresses directly instead of through the router, and some of its traffic will vanish.

## Splitting a range

Networks are planned by taking a large block and cutting it into **subnets**. A cloud virtual network might be `10.0.0.0/16`, cut into `/24` subnets for different purposes. Each extra bit of prefix splits a block in two, so a `/24` becomes two `/25`s or four `/26`s:

```bash
>>> for s in ipaddress.ip_network('10.10.0.0/24').subnets(new_prefix=26): print(s, s.num_addresses)
...
10.10.0.0/26 64
10.10.0.64/26 64
10.10.0.128/26 64
10.10.0.192/26 64
```

When you plan subnets, keep two rules in mind. Subnets that will ever be connected must not **overlap**, or machines cannot tell which one an address belongs to; this is a common problem when joining two networks that were planned separately. And leave room to grow, because resizing a subnet that is full of running machines is hard. Picking a larger range than you need now costs nothing in private address space.

## Tasks

### Task 1: A range by hand

Work out by hand the network address, broadcast address, first and last usable host, and number of usable hosts for `172.16.5.130/27`. Then check every answer with Python on alpha.

<details>
<summary>Check your work</summary>

By hand: a `/27` mask is `255.255.255.224`. The block size is 256 − 224 = 32, so networks start at 0, 32, 64, 96, 128, 160 and so on. 130 falls between 128 and 160.

- Network: `172.16.5.128`
- Broadcast: `172.16.5.159`
- Usable: `172.16.5.129` to `172.16.5.158`, 30 hosts

```bash
>>> net = ipaddress.ip_interface('172.16.5.130/27').network
>>> net
IPv4Network('172.16.5.128/27')
>>> net.broadcast_address
IPv4Address('172.16.5.159')
>>> hosts = list(net.hosts())
>>> hosts[0], hosts[-1], len(hosts)
(IPv4Address('172.16.5.129'), IPv4Address('172.16.5.158'), 30)
```

The usual mistake is to start from the address itself and count 32 forward, giving `.130` to `.161`. Networks always begin on a multiple of the block size.

</details>

### Task 2: Plan a /24

You have `10.10.0.0/24` to split for three groups of servers: one needs up to 100 addresses, and two need up to 50 each. Choose a prefix for each so that none overlap and everything fits, then check your plan with Python.

<details>
<summary>Check your work</summary>

100 hosts need a `/25` (126 usable). 50 hosts need a `/26` (62 usable). One `/25` and two `/26`s fill the `/24` exactly:

- `10.10.0.0/25` for the large group
- `10.10.0.128/26` and `10.10.0.192/26` for the other two

```bash
>>> list(ipaddress.ip_network('10.10.0.0/24').subnets(prefixlen_diff=1))
[IPv4Network('10.10.0.0/25'), IPv4Network('10.10.0.128/25')]
>>> list(ipaddress.ip_network('10.10.0.128/25').subnets(new_prefix=26))
[IPv4Network('10.10.0.128/26'), IPv4Network('10.10.0.192/26')]
```

A common mistake is putting a `/26` first, at `10.10.0.0/26`, and then the `/25` at `10.10.0.64/25`. That is not a valid network: `/25`s can only start at `.0` or `.128`, and Python would refuse it with `has host bits set`. Place the biggest blocks first.

</details>

## Quiz

**1. How many addresses are in a `/22`, and what is its mask?**

<details>
<summary>Show answer</summary>

32 − 22 = 10 host bits, so 2¹⁰ = 1,024 addresses, 1,022 usable. The mask is `255.255.252.0`: two octets of 255, then 6 network bits in the third octet, which is 252.

</details>

**2. Are `10.10.0.100/25` and `10.10.0.130/25` on the same network?**

<details>
<summary>Show answer</summary>

No. A `/25` splits the last octet at 128, so `.100` is in `10.10.0.0/25` and `.130` is in `10.10.0.128/25`. They would need a router to talk, even if they are plugged into the same switch.

</details>

**3. Why can a `/24` subnet not hold 256 servers?**

<details>
<summary>Show answer</summary>

Two of its 256 addresses are reserved: the network address (`.0`) and the broadcast address (`.255`). That leaves 254. In a cloud network, a few more are usually reserved for the provider's router and DNS, so even fewer are usable.

</details>

**4. Servers on `10.10.0.0/24` can all reach each other, except that one server, `10.10.0.20`, cannot reach `10.10.0.200`. It reaches `10.10.0.50` without trouble. `ip addr` on it shows `10.10.0.20/25`. What is wrong?**

<details>
<summary>Show answer</summary>

The prefix is wrong. With `/25`, the server thinks its network is only `10.10.0.0` to `10.10.0.127`. `10.10.0.50` is inside that, so it is reached directly. `10.10.0.200` is outside it, so the server sends those packets to its default gateway instead, and the gateway, which sees a destination on the same network the packet came from, may not deliver it as expected. Change the address to `/24` to match the rest of the subnet.

</details>

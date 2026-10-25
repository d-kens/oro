A machine does not have an IP address on its own. The address belongs to one of its **network interfaces**, the points where it connects to a network. A server can have several, each with its own addresses, and each can be up or down. When a machine stops talking to a network, the interface is one of the first things to look at.

This topic covers what an interface is, how to read `ip link`, the loopback, and how to change an interface by hand. By the end you can bring an interface down and up, add and remove an address, and check an interface's MTU.

## What an interface is

An interface is anything the kernel can send packets out of and receive packets from. Some match real hardware, and many are virtual:

| Kind | Example names | What it is |
| --- | --- | --- |
| Physical network card | `eth0`, `ens5`, `enp0s3` | A wired port, or the virtual card a cloud server is given |
| Wireless | `wlan0`, `wlp2s0` | A Wi-Fi card |
| Loopback | `lo` | The machine talking to itself |
| Virtual pair | `veth…`, `eth0@if33` | Two ends of a virtual cable, used by containers |
| Bridge | `docker0`, `br-…` | A software switch that joins other interfaces |
| Tunnel | `tun0`, `wg0` | A VPN or other tunnel |
| Dummy | `dummy0` | An interface connected to nothing, useful for testing |

Names like `ens5` and `enp0s3` come from where the card sits in the machine, so they stay the same across reboots. Older systems and containers use `eth0`, `eth1` and so on.

In the lab, each container's `eth0` is one end of a virtual pair. The other end sits on your computer, plugged into the bridge Docker made for the `lab` network. That is why it shows as `eth0@if33`: the `@if33` is the number of the interface at the other end of the cable. Your number will differ.

## Reading ip link

`ip link` shows the interfaces themselves, without their IP addresses:

```bash
root@alpha:/# ip link show eth0
11: eth0@if33: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP mode DEFAULT group default 
    link/ether 36:c0:c2:4d:58:0c brd ff:ff:ff:ff:ff:ff link-netnsid 0
```

The parts that matter:

- `11:` is the interface's index number on this machine.
- The flags in angle brackets. `UP` means the interface has been switched on. `LOWER_UP` means the link underneath is working, like a cable with a light on. You need both for traffic to flow.
- `mtu 1500` is the largest packet the interface will send, covered below.
- `state UP` is the overall state the kernel reports. You will also see `DOWN`, and `UNKNOWN` for interfaces such as the loopback that have no cable to check.
- `link/ether` is the interface's hardware address, covered in the *MAC addresses and ARP* topic.

`ip -br link` gives one line per interface, and `ip -s link` adds counters:

```bash
root@alpha:/# ip -s link show eth0
11: eth0@if33: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP mode DEFAULT group default 
    link/ether 36:c0:c2:4d:58:0c brd ff:ff:ff:ff:ff:ff link-netnsid 0
    RX:  bytes packets errors dropped  missed   mcast           
          7432      60      0       0       0       0 
    TX:  bytes packets errors dropped carrier collsns           
          4993      31      0       0       0       0
```

`RX` is received and `TX` is sent. On a real server, `errors` or `dropped` that keep climbing point to a problem with the card, the cable or the driver, below anything IP can see. Counters that do not move at all while you expect traffic tell you nothing is arriving.

## The loopback

Every machine has a **loopback** interface, `lo`. Packets sent to it never leave the machine; they come straight back in. It holds `127.0.0.1` and `::1`.

Programs use the loopback to talk to other programs on the same machine: an application to a local database, a web server to an application behind it, a tool to a local agent. It is always present and normally always up.

Docker's DNS server in the lab listens on `127.0.0.11`, a loopback address, so even name lookups in the lab depend on `lo`. You can see what happens without it:

```bash
root@alpha:/# ip link set lo down
root@alpha:/# ping -c 1 -W 1 127.0.0.1
PING 127.0.0.1 (127.0.0.1) 56(84) bytes of data.

--- 127.0.0.1 ping statistics ---
1 packets transmitted, 0 received, 100% packet loss, time 0ms

root@alpha:/# ping -c 1 beta
ping: beta: Temporary failure in name resolution
root@alpha:/# ip link set lo up
```

The machine cannot even reach itself, and the name lookup fails because the DNS server is on the loopback. Breakage like this on a real machine is rare, but it shows how much quietly depends on `lo`.

## Bringing an interface down and up

`ip link set` changes an interface. These changes need root, and in the lab they work because the containers were started with `--cap-add NET_ADMIN`.

```bash
root@alpha:/# ip link set eth0 down
root@alpha:/# ip -br addr show eth0
eth0@if33        DOWN           10.10.0.2/24 
root@alpha:/# ping -c 1 10.10.0.3
ping: connect: Network is unreachable
```

The address is still configured, but the interface is off, so the kernel has no way out to the network. `Network is unreachable` is an error from your own machine: no packet was sent at all.

Bring it back:

```bash
root@alpha:/# ip link set eth0 up
root@alpha:/# ip route
10.10.0.0/24 dev eth0 proto kernel scope link src 10.10.0.2 
```

alpha can reach beta again, but look at the routing table. Before, it also had a line `default via 10.10.0.1 dev eth0`, the route to everything outside the lab. Taking the interface down removed every route that used it, and bringing it up only restored the route the kernel makes for the address itself. Until you add the default route back, alpha cannot reach the internet:

```bash
root@alpha:/# ip route add default via 10.10.0.1
```

The *Routing and gateways* topic explains routes properly. The lesson for now is that `down` then `up` is not always a clean restart. On a real server, a network service such as systemd-networkd or NetworkManager normally puts the routes back. Done by hand, it is up to you.

Be careful doing this over SSH. Taking down the interface you are connected through cuts off your own session, and you cannot type `up` again.

## Adding and removing addresses

An interface can hold more than one address. Add one with `ip addr add`, giving the prefix length:

```bash
root@alpha:/# ip addr add 10.10.0.50/24 dev eth0
root@alpha:/# ip addr show eth0
11: eth0@if33: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default 
    link/ether 36:c0:c2:4d:58:0c brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 10.10.0.2/24 brd 10.10.0.255 scope global eth0
       valid_lft forever preferred_lft forever
    inet 10.10.0.50/24 scope global secondary eth0
       valid_lft forever preferred_lft forever
```

The new address is marked `secondary`, because the interface already had one on the same network. Other machines can use it straight away:

```bash
root@beta:/# ping -c 2 10.10.0.50
PING 10.10.0.50 (10.10.0.50) 56(84) bytes of data.
64 bytes from 10.10.0.50: icmp_seq=1 ttl=64 time=0.148 ms
64 bytes from 10.10.0.50: icmp_seq=2 ttl=64 time=0.286 ms
```

Remove it with `ip addr del`, again with the prefix length:

```bash
root@alpha:/# ip addr del 10.10.0.50/24 dev eth0
```

Nothing done with `ip` survives a reboot, or in the lab, the container exiting. Permanent settings live in the system's network configuration, such as netplan files on Ubuntu, or come from DHCP. On a cloud server you rarely add addresses by hand at all; you attach them through the provider, and the server picks them up.

A **dummy** interface is a safe place to experiment, because it is connected to nothing:

```bash
root@alpha:/# ip link add dummy0 type dummy
root@alpha:/# ip addr add 192.168.50.1/24 dev dummy0
root@alpha:/# ip link set dummy0 up
root@alpha:/# ip -br addr show dummy0
dummy0           UNKNOWN        192.168.50.1/24 fe80::2889:d3ff:fe5c:651d/64 
root@alpha:/# ip link del dummy0
```

Note that the dummy interface gets an IPv6 link-local address of its own as soon as it is up, even though the lab network has IPv6 turned off on `eth0`.

## MTU

The **MTU**, maximum transmission unit, is the largest packet an interface will send, in bytes. Ethernet's standard is 1500. Larger data is cut into packets that fit.

You can test it with `ping`. `-s` sets the size of the data, and `-M do` forbids splitting the packet. An ICMP header is 8 bytes and an IPv4 header is 20, so 1472 bytes of data makes exactly 1500:

```bash
root@alpha:/# ping -c 1 -M do -s 1472 beta
PING beta (10.10.0.3) 1472(1500) bytes of data.
1480 bytes from beta.lab (10.10.0.3): icmp_seq=1 ttl=64 time=0.038 ms
root@alpha:/# ping -c 1 -M do -s 1473 beta
PING beta (10.10.0.3) 1473(1501) bytes of data.
ping: local error: message too long, mtu=1500
```

Change it with `ip link set`:

```bash
root@alpha:/# ip link set eth0 mtu 1400
root@alpha:/# ping -c 1 -M do -s 1472 beta
PING beta (10.10.0.3) 1472(1500) bytes of data.
ping: local error: message too long, mtu=1400
root@alpha:/# ip link set eth0 mtu 1500
```

MTU problems have a recognisable shape. Small packets get through and large ones vanish, so a connection opens, a short request works, and then a large response or file transfer hangs. You meet this with VPNs and tunnels, which add their own headers and so leave less room, and in cloud networks, where some links allow larger "jumbo" packets of around 9000 bytes and others do not.

## Tasks

### Task 1: A test interface

On alpha, create a dummy interface called `test0`, give it the address `192.168.60.1/24`, and bring it up. Check that alpha can ping that address, and find the route the kernel added for it. Then delete the interface and check that the route is gone.

<details>
<summary>Check your work</summary>

```bash
root@alpha:/# ip link add test0 type dummy
root@alpha:/# ip addr add 192.168.60.1/24 dev test0
root@alpha:/# ip link set test0 up
root@alpha:/# ping -c 1 192.168.60.1
64 bytes from 192.168.60.1: icmp_seq=1 ttl=64 time=0.015 ms
root@alpha:/# ip route
default via 10.10.0.1 dev eth0 
10.10.0.0/24 dev eth0 proto kernel scope link src 10.10.0.2 
192.168.60.0/24 dev test0 proto kernel scope link src 192.168.60.1 
root@alpha:/# ip link del test0
root@alpha:/# ip route
default via 10.10.0.1 dev eth0 
10.10.0.0/24 dev eth0 proto kernel scope link src 10.10.0.2 
```

Adding an address also adds a route to its network, and deleting the interface removes both. If `ip link add` says `Operation not permitted`, the container was started without `--cap-add NET_ADMIN`.

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

**1. `ip link show eth0` shows `<BROADCAST,MULTICAST,UP>` but not `LOWER_UP`. What does that mean?**

<details>
<summary>Show answer</summary>

The interface has been switched on, but there is no working link underneath it: on real hardware, the cable is unplugged, the port at the other end is down, or the card has failed. No traffic will flow until `LOWER_UP` appears.

</details>

**2. You add `10.10.0.60/24` to alpha's `eth0` and then restart the container. Is the address still there?**

<details>
<summary>Show answer</summary>

No. Changes made with `ip` live only in the running kernel. In the lab they vanish when the container exits; on a server they vanish at reboot. Permanent addresses belong in the system's network configuration or come from DHCP.

</details>

**3. Why does `ping 127.0.0.1` work on a machine whose network cable is unplugged?**

<details>
<summary>Show answer</summary>

`127.0.0.1` is on the loopback interface, `lo`, which is entirely inside the machine. Packets to it never touch the network card, so the state of `eth0` or the cable does not matter.

</details>

**4. After a VPN is set up, SSH sessions to a server connect and show a prompt, but freeze as soon as you run a command with a lot of output. Small commands work. What would you check first?**

<details>
<summary>Show answer</summary>

The MTU. Small packets fit and get through; large ones are too big for the tunnel, which adds its own headers, and get dropped. Test with `ping -M do -s` at different sizes to find the largest size that gets through, then lower the MTU on the interface to match.

</details>

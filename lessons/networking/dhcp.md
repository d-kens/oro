When you join a Wi-Fi network, you never type in an address, a gateway or a DNS server, yet your laptop has all three a second later. A cloud server boots with an address already set, though nobody configured it by hand. In both cases the machine asked for its settings with **DHCP**, the Dynamic Host Configuration Protocol.

This topic explains the four messages of a DHCP exchange, what a lease is, and what a DHCP server hands out. You then run a DHCP server in the lab and watch a machine get its settings from it. By the end you can explain how a machine configures itself on a new network, read a lease on both ends, and spot the usual reasons a machine ends up without an address.

## The problem DHCP solves

To talk on a network, a host needs at least four settings, all covered in earlier topics:

| Setting | Example | Covered in |
| --- | --- | --- |
| IP address | `10.30.0.145` | *IP addresses* |
| Network mask | `255.255.255.0`, or `/24` | *Subnets and CIDR* |
| Default gateway | `10.30.0.1` | *Routing and gateways* |
| DNS server | `10.30.0.2` | *DNS basics* |

You could set them by hand on every machine, and for a few servers people still do. But when machines come and go, by hand does not scale, and two machines given the same address by mistake will both misbehave. DHCP puts one server in charge: it keeps a pool of free addresses, hands them out, and remembers who has which.

Docker does not use DHCP. It picks each container's address itself and sets it directly, which is why your lab machines already have addresses. In the cloud, the provider runs a DHCP service on every network, and the private address shown for a server in the console is the one that service hands to it at boot.

## Discover, offer, request, acknowledge

A new machine has a problem: it has no address, and it does not know where the DHCP server is. So it starts by shouting to everyone on its local network. The exchange has four messages, often remembered as **DORA**:

1. **Discover.** The client broadcasts "is there a DHCP server here?". It has no address yet, so it sends from `0.0.0.0` to the broadcast address `255.255.255.255`, from UDP port 68 to port 67.
2. **Offer.** A server replies with an address it is willing to lend, plus the other settings.
3. **Request.** The client broadcasts "I would like that address". It broadcasts again so that any other server that also made an offer knows it was not chosen.
4. **Acknowledge.** The server confirms. Only now does the client put the address on its interface.

Because Discover is a broadcast, it only reaches the local network. Routers do not pass broadcasts on, so each network needs its own DHCP server, or a **DHCP relay** on the router that forwards requests to a central server.

## Leases

DHCP does not give an address away. It **leases** it for a fixed time, such as one hour or one day. Halfway through, the client asks the same server to renew it, and it normally gets the same address for another full term. If that server does not answer, the client tries any server later on. If the lease runs out with no renewal, the client must stop using the address.

These times have names in the DHCP messages:

| Name | Default | Meaning |
| --- | --- | --- |
| Lease time | Set by the server | How long the address is lent for |
| T1, renewal | Half the lease | When the client asks its server to extend it |
| T2, rebinding | Seven-eighths of the lease | When the client asks any server instead |

Leases are why an address can change after a machine has been switched off for a long time: its lease ran out, and the address went to someone else. When an address must not change, the server can **reserve** one for a machine, keyed on its MAC address from the *MAC addresses and ARP* topic.

## Run a DHCP server in the lab

The DHCP server needs a network of its own, so its broadcasts do not reach your other lab machines. Create one:

```bash
$ docker network create --subnet 10.30.0.0/24 dhcp-lab
```

Docker's internal networks, created with `--internal`, would seem a better fit, because they have no way out of your computer. They do not work here: Docker drops packets on an internal network whose source or destination is outside its range, and a Discover goes from `0.0.0.0` to `255.255.255.255`.

Start the server, `dhcp-01`, on the new network:

```bash
$ docker run -it --rm --name dhcp-01 --hostname dhcp-01 --network dhcp-lab --cap-add NET_ADMIN netlab
```

dnsmasq, which the *Run your own DNS* topic uses as a DNS server, is also a DHCP server. Write its configuration with `nano /etc/dnsmasq.d/dhcp.conf`:

```text
interface=eth0
bind-interfaces
dhcp-range=10.30.0.100,10.30.0.150,255.255.255.0,1h
dhcp-option=option:router,10.30.0.1
dhcp-option=option:dns-server,10.30.0.2
log-dhcp
log-facility=/var/log/dnsmasq.log
```

- `interface=eth0` and `bind-interfaces` make it answer on `dhcp-lab` only.
- `dhcp-range` is the pool: addresses `.100` to `.150`, a `/24` mask, and one-hour leases. Docker gives out addresses from `.2` upwards, so the pool starts well clear of them.
- `dhcp-option` sets the gateway and DNS server it hands out. `10.30.0.1` is Docker's gateway on this network, and `10.30.0.2` is dhcp-01 itself, which also answers DNS.
- `log-dhcp` logs every message in detail.

Start dnsmasq, telling it to read that directory, and check the log:

```bash
root@dhcp-01:/# dnsmasq --conf-dir=/etc/dnsmasq.d,README
root@dhcp-01:/# cat /var/log/dnsmasq.log
Oct 25 07:37:19 dnsmasq[16]: started, version 2.91 cachesize 150
Oct 25 07:37:19 dnsmasq-dhcp[16]: DHCP, IP range 10.30.0.100 -- 10.30.0.150, lease time 1h
Oct 25 07:37:19 dnsmasq-dhcp[16]: DHCP, sockets bound exclusively to interface eth0
```

`,README` tells dnsmasq to skip the `README` file that lives in that directory.

## Get a lease

The image has no DHCP client, and `dhcp-lab` is a fresh network, so start the client on `lab` first, install one, and then connect it to `dhcp-lab`:

```bash
$ docker run -it --rm --name client --hostname client --network lab --cap-add NET_ADMIN netlab
root@client:/# apt-get update && apt-get install -y isc-dhcp-client
```

From another terminal on your computer:

```bash
$ docker network connect dhcp-lab client
```

client now has a second interface, `eth1`, and Docker has already put an address on it. Remove that address, so the interface is like a new machine's, and ask for a lease. `-v` shows each step:

```bash
root@client:/# ip addr flush dev eth1
root@client:/# dhclient -v eth1
Listening on LPF/eth1/52:56:a3:47:7e:dc
Sending on   LPF/eth1/52:56:a3:47:7e:dc
Sending on   Socket/fallback
DHCPDISCOVER on eth1 to 255.255.255.255 port 67 interval 3 (xid=0x61e3d548)
DHCPOFFER of 10.30.0.145 from 10.30.0.2
DHCPREQUEST for 10.30.0.145 on eth1 to 255.255.255.255 port 67 (xid=0x48d5e361)
DHCPACK of 10.30.0.145 from 10.30.0.2 (xid=0x61e3d548)
bound to 10.30.0.145 -- renewal in 1364 seconds.
```

There is DORA, line by line. dnsmasq picks addresses from the pool in its own order, so yours will likely differ. The renewal time is a little under half an hour because the client subtracts a small random amount, so that many clients do not all renew at once. A few lines of copyright and a warning about `xid` also appear; ignore them.

Check what the client did with the answer:

```bash
root@client:/# ip -br addr show eth1
eth1@if141       UP             10.30.0.145/24
root@client:/# ip route
default via 10.30.0.1 dev eth1
10.10.0.0/24 dev eth0 proto kernel scope link src 10.10.0.5
10.30.0.0/24 dev eth1 proto kernel scope link src 10.30.0.145
root@client:/# grep nameserver /etc/resolv.conf
nameserver 10.30.0.2
```

The address, the default gateway and the DNS server all came from dnsmasq. The DHCP client replaced the default route and `/etc/resolv.conf`, which is what a real machine joining a network wants.

## Read a lease on both ends

The client keeps its leases in a file:

```bash
root@client:/# cat /var/lib/dhcp/dhclient.leases
lease {
  interface "eth1";
  fixed-address 10.30.0.145;
  option subnet-mask 255.255.255.0;
  option routers 10.30.0.1;
  option dhcp-lease-time 3600;
  option domain-name-servers 10.30.0.2;
  option dhcp-server-identifier 10.30.0.2;
  option dhcp-renewal-time 1800;
  option dhcp-rebinding-time 3150;
  renew 0 2026/10/25 08:00:06;
  rebind 0 2026/10/25 08:29:52;
  expire 0 2026/10/25 08:37:22;
}
```

A few lines are trimmed. `fixed-address` is the leased address, despite the name. Renewal at 1,800 seconds and rebinding at 3,150 are half and seven-eighths of the 3,600-second lease.

The server keeps its own list, one line per lease: the expiry time in seconds since 1970, the client's MAC address, the address, and the name the client gave:

```bash
root@dhcp-01:/# cat /var/lib/misc/dnsmasq.leases
1792917442 52:56:a3:47:7e:dc 10.30.0.145 client *
```

And because of `log-dhcp`, its log records the whole exchange. A shortened extract:

```text
dnsmasq-dhcp[16]: 1642321224 DHCPDISCOVER(eth0) 52:56:a3:47:7e:dc
dnsmasq-dhcp[16]: 1642321224 DHCPOFFER(eth0) 10.30.0.145 52:56:a3:47:7e:dc
dnsmasq-dhcp[16]: 1642321224 requested options: 1:netmask, 28:broadcast, 2:time-offset, 3:router,
dnsmasq-dhcp[16]: 1642321224 sent size:  4 option: 51 lease-time  1h
dnsmasq-dhcp[16]: 1642321224 sent size:  4 option:  6 dns-server  10.30.0.2
dnsmasq-dhcp[16]: 1642321224 sent size:  4 option:  3 router  10.30.0.1
dnsmasq-dhcp[16]: 1642321224 DHCPREQUEST(eth0) 10.30.0.145 52:56:a3:47:7e:dc
dnsmasq-dhcp[16]: 1642321224 DHCPACK(eth0) 10.30.0.145 52:56:a3:47:7e:dc client
```

Every setting travels as a numbered **option**: 1 is the mask, 3 the router, 6 the DNS servers, 51 the lease time. The client lists the options it wants, and the server sends the ones it has. When a machine gets an address but no DNS server, this log tells you whether the server never sent option 6.

## Tasks

### Task 1: Release and watch

On client, give the lease back with `dhclient -r -v eth1`, then check `eth1`. On dhcp-01, start `tcpdump -n -i eth0 port 67 or port 68`. Then ask for a lease again on client and match each captured packet to a DORA step.

<details>
<summary>Check your work</summary>

```bash
root@client:/# dhclient -r -v eth1
DHCPRELEASE of 10.30.0.145 on eth1 to 10.30.0.2 port 67 (xid=0x1610e13b)
root@client:/# ip -br addr show eth1
eth1@if141       UP
```

The release is sent straight to the server, not broadcast, because the client still knows where it is. Then the capture on dhcp-01 during the new request:

```text
07:37:45.749512 IP 0.0.0.0.68 > 255.255.255.255.67: BOOTP/DHCP, Request from 52:56:a3:47:7e:dc, length 300
07:37:45.749754 IP 10.30.0.2.67 > 10.30.0.145.68: BOOTP/DHCP, Reply, length 300
07:37:45.749870 IP 0.0.0.0.68 > 255.255.255.255.67: BOOTP/DHCP, Request from 52:56:a3:47:7e:dc, length 300
07:37:45.751647 IP 10.30.0.2.67 > 10.30.0.145.68: BOOTP/DHCP, Reply, length 300
```

Discover, Offer, Request, Acknowledge. tcpdump calls them all `Request` or `Reply` because DHCP grew out of an older protocol called BOOTP; add `-v` to see the message type. If you see only the first line, repeated, dnsmasq is not running or not listening on `eth0`.

</details>

### Task 2: Reserve an address

Make dnsmasq always give client the address `10.30.0.50`. Find client's MAC address on `eth1`, add a reservation to the config, restart dnsmasq, and get a new lease.

<details>
<summary>Check your work</summary>

Read the MAC with `ip link show eth1` on client, or from the dnsmasq log. Add one line to `/etc/dnsmasq.d/dhcp.conf`, using your own MAC:

```text
dhcp-host=52:56:a3:47:7e:dc,10.30.0.50
```

Then restart dnsmasq and renew on client:

```bash
root@dhcp-01:/# pkill dnsmasq
root@dhcp-01:/# dnsmasq --conf-dir=/etc/dnsmasq.d,README
root@client:/# dhclient -r eth1
root@client:/# dhclient -v eth1
DHCPOFFER of 10.30.0.50 from 10.30.0.2
DHCPACK of 10.30.0.50 from 10.30.0.2 (xid=0x8937ac71)
bound to 10.30.0.50 -- renewal in 1413 seconds.
```

A reserved address does not have to be inside the `dhcp-range` pool. If client still gets an address from the pool, check that dnsmasq was restarted after the change and that the MAC address in the line is the one on client's `eth1`, not `eth0`.

</details>

## Quiz

**1. Why does a DHCP client send its first message to `255.255.255.255` from `0.0.0.0`?**

<details>
<summary>Show answer</summary>

It has no address of its own yet, and it does not know the server's address. Broadcasting from `0.0.0.0` is the only way to reach whatever DHCP server is on the local network.

</details>

**2. A machine had the address `10.30.0.120` yesterday. After a weekend switched off, it has `10.30.0.131`. Is something broken?**

<details>
<summary>Show answer</summary>

No. Its lease ran out while it was off, and the server was free to give `10.30.0.120` to another machine. If the address must stay the same, reserve it for the machine's MAC address on the server, or set it by hand.

</details>

**3. A new server on a freshly created subnet boots with no IP address. The same image works on other subnets. The subnet is reached through a router. What do you check?**

<details>
<summary>Show answer</summary>

Whether that subnet has a DHCP server or a DHCP relay. Discover is a broadcast, and routers do not forward broadcasts, so a server on another subnet never hears it unless a relay on the router passes it on. Then check the server has a pool for that subnet with free addresses, and that nothing filters UDP ports 67 and 68.

</details>

**4. A laptop gets an address and can reach other machines by IP address, but no names resolve. Which part of the DHCP answer would you check first?**

<details>
<summary>Show answer</summary>

The DNS server, option 6. Check the client's lease file or `/etc/resolv.conf` for the server it was given, and the DHCP server's configuration or log for whether it sent one at all, and whether it is the right address.

</details>

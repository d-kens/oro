So far every machine in the lab has been on one network, where hosts reach each other directly. Real systems are made of several networks: an office and a data centre, a public subnet and a private one, your home and the internet. Packets get from one to another through routers, and every host decides where to send each packet by looking at its **routing table**.

This topic reads that table, then builds a second lab network with a router between the two. By the end you can read and change a host's routes, explain how it picks one, connect two networks through a router, and follow a packet's path with traceroute.

## The routing table

On `alpha`, show the routing table:

```bash
root@alpha:/# ip route
default via 10.10.0.1 dev eth0
10.10.0.0/24 dev eth0 proto kernel scope link src 10.10.0.2
```

Each line is a **route**: a range of destination addresses, and how to reach it.

- `10.10.0.0/24 dev eth0 ... scope link` says the whole lab network is directly connected on `eth0`. To reach any address in it, alpha sends the packet straight to that host. The kernel added this route itself (`proto kernel`) when the address `10.10.0.2/24` was put on the interface, as the *Subnets and CIDR* topic explained.
- `default via 10.10.0.1 dev eth0` covers everything else. For any address that no other route matches, alpha sends the packet to `10.10.0.1`, and lets that machine work out the rest.

| Part | Meaning |
| --- | --- |
| `10.10.0.0/24`, `default` | The destination range. `default` is short for `0.0.0.0/0`, every address |
| `via 10.10.0.1` | The **next hop**: the router to hand the packet to. A route without `via` means the destination is on this link |
| `dev eth0` | The interface to send it out of |
| `src 10.10.0.2` | The source address to use for new connections |

`via` is the key idea. alpha does not know the whole path to a distant host. It only knows the next machine to give the packet to, and every router along the way makes the same kind of decision with its own table.

## Choosing a route

When several routes match a destination, the host uses the most specific one, the one with the longest prefix. This is called **longest prefix match**. `default` matches everything but has a prefix of 0, so it always loses to any other match.

`ip route get` asks the kernel which route it would use for an address, without sending anything:

```bash
root@alpha:/# ip route get 10.10.0.3
10.10.0.3 dev eth0 src 10.10.0.2 uid 0
    cache
root@alpha:/# ip route get 203.0.113.10
203.0.113.10 via 10.10.0.1 dev eth0 src 10.10.0.2 uid 0
    cache
```

beta's address is on the lab network, so it goes direct. The documentation address `203.0.113.10` only matches `default`, so it goes to the gateway. You will see longest prefix match at work once the second network exists.

## The default gateway

The next hop in the `default` route is the **default gateway**: the router a host sends everything to when it has no better route. On a home network it is the home router. In a cloud network, it is a virtual router the provider runs at a fixed address in each subnet.

In the lab, `10.10.0.1` is Docker itself. It forwards traffic from the containers out to the internet through your computer, which is how `curl https://example.com/` has worked in earlier topics.

A host can only hand a packet to a next hop it can reach directly, on one of its own networks. Asking alpha to use a router on a network it is not connected to fails at once:

```bash
root@alpha:/# ip route add 10.99.0.0/24 via 10.20.0.254
Error: Nexthop has invalid gateway.
```

## Two networks and a router

Now build a second network, `lab2`, and a machine called `router` that is connected to both. On your computer:

```bash
$ docker network create --subnet 10.20.0.0/24 lab2
```

Start `router` on `lab` with a fixed address, then connect it to `lab2` as well:

```bash
$ docker run -it --rm --name router --hostname router --network lab --ip 10.10.0.254 --cap-add NET_ADMIN --sysctl net.ipv4.ip_forward=1 netlab
root@router:/#
```

```bash
$ docker network connect --ip 10.20.0.254 lab2 router
```

- `--ip` fixes the address, so it does not depend on which machines you started first. `.254` is a common choice for a router: out of the way of hosts numbered from the bottom.
- `--sysctl net.ipv4.ip_forward=1` turns on **IP forwarding**. Without it, Linux drops packets that arrive for some other address instead of passing them on, so a machine with two interfaces is not a router. On an ordinary Linux server it is off by default; Docker often turns it on in containers anyway, but setting it makes sure.

Last, start a host called `delta` on `lab2` in another terminal:

```bash
$ docker run -it --rm --name delta --hostname delta --network lab2 --cap-add NET_ADMIN netlab
root@delta:/#
```

Look at router's interfaces and table:

```bash
root@router:/# ip -br addr | grep eth
eth0@if89        UP             10.10.0.254/24
eth1@if90        UP             10.20.0.254/24
root@router:/# ip route
default via 10.20.0.1 dev eth1
10.10.0.0/24 dev eth0 proto kernel scope link src 10.10.0.254
10.20.0.0/24 dev eth1 proto kernel scope link src 10.20.0.254
root@router:/# sysctl net.ipv4.ip_forward
net.ipv4.ip_forward = 1
```

router has a directly connected route to each network, so it can reach both. Its default route now points at Docker's gateway on lab2; that does not matter here.

delta is at `10.20.0.2`. Try to reach it from alpha:

```bash
root@alpha:/# ping -c 2 -W 1 10.20.0.2
PING 10.20.0.2 (10.20.0.2) 56(84) bytes of data.

--- 10.20.0.2 ping statistics ---
2 packets transmitted, 0 received, 100% packet loss, time 1027ms
root@alpha:/# ip route get 10.20.0.2
10.20.0.2 via 10.10.0.1 dev eth0 src 10.10.0.2 uid 0
    cache
```

alpha has no route for `10.20.0.0/24`, so the packets go to the default gateway, Docker, which keeps its networks apart and drops them. Tell alpha that lab2 is reached through router:

```bash
root@alpha:/# ip route add 10.20.0.0/24 via 10.10.0.254
root@alpha:/# ip route get 10.20.0.2
10.20.0.2 via 10.10.0.254 dev eth0 src 10.10.0.2 uid 0
    cache
```

That is longest prefix match: `10.20.0.0/24` beats `default`. delta needs the matching route back, or its replies would go to its own default gateway:

```bash
root@delta:/# ip route add 10.10.0.0/24 via 10.20.0.254
root@delta:/# ip route
default via 10.20.0.1 dev eth0
10.10.0.0/24 via 10.20.0.254 dev eth0
10.20.0.0/24 dev eth0 proto kernel scope link src 10.20.0.2
```

Now try again:

```bash
root@alpha:/# ping -c 3 10.20.0.2
PING 10.20.0.2 (10.20.0.2) 56(84) bytes of data.
64 bytes from 10.20.0.2: icmp_seq=1 ttl=63 time=0.222 ms
64 bytes from 10.20.0.2: icmp_seq=2 ttl=63 time=0.144 ms
64 bytes from 10.20.0.2: icmp_seq=3 ttl=63 time=0.138 ms

--- 10.20.0.2 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2057ms
rtt min/avg/max/mdev = 0.138/0.168/0.222/0.038 ms
```

Compare `ttl=63` with the `ttl=64` you saw when pinging beta in the *What a network is* topic. Every router that forwards a packet lowers its **TTL** (time to live) by one, and drops it if it reaches zero, so a looping packet cannot circle forever. One lower means one router in between.

Use the address, not the name: Docker's DNS only answers for containers on the same network, so `ping delta` from alpha says `Name or service not known`. Routes added with `ip route add` last until the container stops. On a real server you make them permanent in the network configuration.

## Following the path with traceroute

**traceroute** shows each router on the path. It sends packets with a TTL of 1, then 2, then 3, and so on. Each router that drops one for reaching zero sends back an ICMP "time exceeded" message, which reveals its address. The destination itself answers the last one.

```bash
root@alpha:/# traceroute 10.20.0.2
traceroute to 10.20.0.2 (10.20.0.2), 30 hops max, 60 byte packets
 1  router.lab (10.10.0.254)  0.145 ms  0.026 ms  0.018 ms
 2  10.20.0.2 (10.20.0.2)  0.045 ms  0.030 ms  0.030 ms
```

Hop 1 is router, on its lab address, and hop 2 is delta. Each hop is tried three times, so there are three times. From delta the path runs the other way, through router's lab2 address:

```bash
root@delta:/# traceroute 10.10.0.2
traceroute to 10.10.0.2 (10.10.0.2), 30 hops max, 60 byte packets
 1  router.lab2 (10.20.0.254)  0.130 ms  0.026 ms  0.021 ms
 2  10.10.0.2 (10.10.0.2)  0.060 ms  0.036 ms  0.030 ms
```

A row of `* * *` means no answer came back for that hop within the time limit. That does not always mean a fault: many routers do not send time exceeded messages, or limit how many they send. Run traceroute again, or use `-n` to skip the name lookups and go faster. On the internet you would usually see a dozen or more hops. Inside Docker Desktop, the hops past Docker's gateway are often hidden. The address of example.com may differ for you:

```bash
root@alpha:/# traceroute example.com
traceroute to example.com (104.20.23.154), 30 hops max, 60 byte packets
 1  10.10.0.1 (10.10.0.1)  0.241 ms  0.203 ms  0.192 ms
 2  * * *
 3  * * *
 4  * * *
...
```

Press <kbd>Ctrl</kbd>+<kbd>C</kbd> to stop it. On a Linux server with a direct connection, the same command shows the real path. `mtr`, also in the lab image, runs traceroute continuously and shows the delay and packet loss at each hop, which makes it the usual tool for finding where on a path a connection slows down.

## Tasks

### Task 1: Prove which route wins

With the two-network lab running and alpha's route to lab2 in place, add a second, more specific route on alpha: send `10.20.0.128/25` to Docker's gateway `10.10.0.1`. Use `ip route get` to predict which way packets to `10.20.0.2` and to `10.20.0.200` will go, then remove the extra route.

<details>
<summary>Check your work</summary>

```bash
root@alpha:/# ip route add 10.20.0.128/25 via 10.10.0.1
root@alpha:/# ip route get 10.20.0.200
10.20.0.200 via 10.10.0.1 dev eth0 src 10.10.0.2 uid 0
    cache
root@alpha:/# ip route get 10.20.0.2
10.20.0.2 via 10.10.0.254 dev eth0 src 10.10.0.2 uid 0
    cache
root@alpha:/# ip route del 10.20.0.128/25
```

`10.20.0.128/25` covers `.128` to `.255`. `10.20.0.200` matches both the `/24` and the `/25`, and the `/25` is longer, so it wins. `10.20.0.2` only matches the `/24`. If `ip route add` says `File exists`, a route for exactly that range is already there; check with `ip route`.

</details>

### Task 2: Break the way back

With ping working from alpha to delta, remove delta's route to lab, and also its default route, so delta has no way back at all. Ping delta from alpha again, then try to ping alpha from delta. Explain what each side sees, and put the routes back.

<details>
<summary>Check your work</summary>

```bash
root@delta:/# ip route del 10.10.0.0/24
root@delta:/# ip route del default
root@delta:/# ip route
10.20.0.0/24 dev eth0 proto kernel scope link src 10.20.0.2
```

```bash
root@alpha:/# ping -c 2 -W 1 10.20.0.2
PING 10.20.0.2 (10.20.0.2) 56(84) bytes of data.

--- 10.20.0.2 ping statistics ---
2 packets transmitted, 0 received, 100% packet loss, time 1008ms
```

```bash
root@delta:/# ping -c 1 10.10.0.2
ping: connect: Network is unreachable
root@delta:/# ip route add 10.10.0.0/24 via 10.20.0.254
root@delta:/# ip route add default via 10.20.0.1
```

alpha's packets still reach delta through router, but delta has nowhere to send the replies, so alpha sees only silence. delta, sending from its own side, gets an immediate error, because its kernel finds no route. The lesson is that routing has to work in both directions. The likely mistake is to check only the sender's table: when replies never arrive, look at the routes on the far side too.

</details>

## Quiz

**1. What does the route `default via 10.10.0.1 dev eth0` tell a host?**

<details>
<summary>Show answer</summary>

To send any packet that no more specific route matches to `10.10.0.1`, out of `eth0`. `10.10.0.1` is the default gateway, and it decides what happens next.

</details>

**2. A host has routes for `10.0.0.0/8`, `10.20.0.0/16` and `10.20.5.0/24`, plus a default route. Which one does it use for `10.20.5.9`? For `10.30.1.1`?**

<details>
<summary>Show answer</summary>

`10.20.5.9` matches all three specific routes and the default; the `/24` is the longest prefix, so it wins. `10.30.1.1` matches only `10.0.0.0/8` and the default, so it uses the `/8`.

</details>

**3. Why does ping show `ttl=63` from delta when alpha's ping to beta showed `ttl=64`?**

<details>
<summary>Show answer</summary>

Each router that forwards a packet lowers its TTL by one. The replies from delta passed through router once on the way back, so they arrive one lower than replies from beta, which is on the same network.

</details>

**4. An application server in one subnet cannot reach a database in another subnet. `ip route get` on the application server shows the right next hop, and traceroute shows the packets reaching the database's subnet, but connections time out. What would you check next?**

<details>
<summary>Show answer</summary>

The return path. Check the database server's routing table, and the route tables of the subnet it is in, for a route back to the application server's subnet through the right router. Replies that go to the wrong gateway, or nowhere, look exactly like a timeout from the sender's side. After that, check for a firewall on either host or between the subnets.

</details>

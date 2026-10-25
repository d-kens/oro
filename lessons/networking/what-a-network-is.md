Every request a cloud service handles crosses a network: a browser reaching a load balancer, an application reaching its database, a server pulling a container image. When something cannot be reached, you need to know what actually happens between the two machines to work out where it stops.

This topic explains what a network is made of and builds a small one on your own computer, which every later topic uses. By the end you can start the lab, name the parts of a network, and check that one machine can reach another.

## Hosts, links and packets

A **network** is two or more machines connected so they can send each other data. Each machine on it is a **host**: a laptop, a server, a phone, a container. The connection between them is a **link**: a cable, a Wi-Fi signal, or a virtual link inside one computer.

Hosts do not send a file or a web page in one piece. They cut the data into small **packets**, usually up to about 1,500 bytes each, and send each one separately. Every packet carries a header with the address it comes from and the address it is going to, a bit like the envelope around a letter. The receiving host puts the packets back together.

Packets matter for two reasons:

- Many conversations can share one link, because their packets are mixed together and sorted out at each end.
- Each packet can be delayed, dropped or blocked on its own. Most network problems are a question of which packets got through and which did not.

## Switches and routers

Hosts on the same local network, such as the machines in one office or one subnet in a data centre, are joined by a **switch**. A switch passes each packet to the one port where its destination is connected. Hosts on the same switch can talk to each other directly.

To reach a host on a *different* network, packets go through a **router**. A router is connected to two or more networks and moves packets between them. Your home router joins your home network to your internet provider's. The internet is many thousands of networks joined by routers, and a packet to a distant server passes through a dozen or more of them.

| Device | Joins | Decides using |
| --- | --- | --- |
| Switch | Hosts on the same local network | Hardware (MAC) addresses, in the *MAC addresses and ARP* topic |
| Router | Different networks | IP addresses and a routing table, in the *Routing and gateways* topic |

In the cloud you never see the cables or the boxes, but the same parts exist. A virtual network is a set of subnets, the cloud provider's software does the switching, and route tables decide where packets go.

## Addresses and names

A packet needs an address to reach its destination. On today's networks that is an **IP address**, such as `10.10.0.2` or `2001:db8::2`. The *IP addresses* topic covers them in full.

People and configuration files mostly use **names** instead, such as `db-01` or `example.com`. Before a host can send anything to a name, it has to find the IP address behind it. That lookup is **DNS**, which has three topics of its own later on.

Last, a host runs many programs that use the network at once. A **port** number says which program a packet is for: a web server usually listens on port 80 or 443, and SSH on port 22. The *Ports and sockets* topic covers them.

So to reach a service you need three things to work: the name has to turn into an address, packets have to find a path to that address, and something has to be listening on the port at the other end. Most of this skill is about those three steps and how to check each one.

## Build the lab

You need **Docker** on your computer. On Windows and macOS that is Docker Desktop; on Linux, Docker Engine. Everything runs in containers, so nothing changes on your own machine, and no cloud account is needed.

First, build an image with the networking tools this skill uses. Make a directory, and in it create a file called `Dockerfile` with this content:

```text
FROM ubuntu:24.04
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    iproute2 iputils-ping traceroute mtr-tiny dnsutils curl ca-certificates netcat-openbsd \
    tcpdump nmap iptables iperf3 openssl openssh-client openssh-server nginx dnsmasq python3 nano less \
 && rm -rf /var/lib/apt/lists/*
```

Then build it from that directory. It takes a few minutes the first time:

```bash
$ docker build -t netlab .
```

Next, create a network for the lab with a fixed address range, so your addresses match the ones in these lessons:

```bash
$ docker network create --subnet 10.10.0.0/24 lab
```

Now start two machines on it, each in its own terminal window. The first one is `alpha`:

```bash
$ docker run -it --rm --name alpha --hostname alpha --network lab --cap-add NET_ADMIN netlab
root@alpha:/#
```

And in a second terminal, `beta`:

```bash
$ docker run -it --rm --name beta --hostname beta --network lab --cap-add NET_ADMIN netlab
root@beta:/#
```

- `--network lab` connects the container to the lab network. Docker acts as the switch.
- `--cap-add NET_ADMIN` lets you change network settings inside the container, which later topics need for firewalls and routes.
- `--rm` deletes the container when you `exit`, so every session starts clean.

From here on, the prompt tells you which machine to type on: `root@alpha:/#` or `root@beta:/#`. When a later topic needs more machines, it starts them the same way with a different name.

## Your first look

On `alpha`, list its network interfaces and their addresses. `-br` asks for a brief, one-line-each listing:

```bash
root@alpha:/# ip -br addr
lo               UNKNOWN        127.0.0.1/8 ::1/128
eth0@if24        UP             10.10.0.2/24
```

You may see a few more lines marked `DOWN`, such as `tunl0`; ignore them. There are two that matter:

- `lo` is the **loopback**, a link from the machine to itself. `127.0.0.1` always means "this machine".
- `eth0` is the link to the lab network, and `10.10.0.2` is alpha's address on it. Docker hands out addresses in order, so if you started beta first, the two are swapped.

Now check that alpha can reach beta. `ping` sends a small packet and waits for an answer; `-c 3` stops after three:

```bash
root@alpha:/# ping -c 3 beta
PING beta (10.10.0.3) 56(84) bytes of data.
64 bytes from beta.lab (10.10.0.3): icmp_seq=1 ttl=64 time=0.105 ms
64 bytes from beta.lab (10.10.0.3): icmp_seq=2 ttl=64 time=0.088 ms
64 bytes from beta.lab (10.10.0.3): icmp_seq=3 ttl=64 time=0.094 ms

--- beta ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2041ms
rtt min/avg/max/mdev = 0.088/0.095/0.105/0.007 ms
```

That one command used all three steps from earlier: the name `beta` was turned into `10.10.0.3`, the packets found their way there, and beta answered. `time` is the round trip, there and back. A fraction of a millisecond is normal between two containers on one computer; across the internet, tens of milliseconds is normal.

When you are finished for the day, type `exit` in each container. The `lab` network stays, ready for next time. To remove everything:

```bash
$ docker network rm lab
```

## Tasks

### Task 1: Map the lab

Start the lab with `alpha` and `beta`. Then, from your computer's own terminal (not inside a container), start a third machine called `gamma` on the same network. Write down the IP address of each of the three machines, and check that every machine can ping the other two by name.

<details>
<summary>Check your work</summary>

```bash
$ docker run -it --rm --name gamma --hostname gamma --network lab --cap-add NET_ADMIN netlab
root@gamma:/# ip -br addr show eth0
eth0@if28        UP             10.10.0.4/24
root@gamma:/# ping -c 1 alpha
64 bytes from alpha.lab (10.10.0.2): icmp_seq=1 ttl=64 time=0.121 ms
root@gamma:/# ping -c 1 beta
64 bytes from beta.lab (10.10.0.3): icmp_seq=1 ttl=64 time=0.097 ms
```

`ip -br addr show eth0` shows just the one interface. All three addresses start with `10.10.0.`, because they are on the same network. If `ping` says `Temporary failure in name resolution`, the machine is not on the `lab` network: check that you passed `--network lab`.

</details>

### Task 2: Watch a host disappear

On `alpha`, start a ping to `gamma` that keeps going: `ping gamma` with no `-c`. While it runs, type `exit` in gamma's terminal. Watch what alpha's ping does, then stop it with <kbd>Ctrl</kbd>+<kbd>C</kbd> and read the statistics.

<details>
<summary>Check your work</summary>

```text
64 bytes from gamma.lab (10.10.0.4): icmp_seq=4 ttl=64 time=0.104 ms
64 bytes from gamma.lab (10.10.0.4): icmp_seq=5 ttl=64 time=0.098 ms
^C
--- gamma ping statistics ---
12 packets transmitted, 5 received, 58.3333% packet loss, time 11250ms
rtt min/avg/max/mdev = 0.070/0.095/0.104/0.012 ms
```

Once gamma is gone, the replies simply stop. There is no error message, just silence, and the count of lost packets in the statistics. That is what an unreachable host usually looks like: requests that never get an answer. Your exact numbers depend on when you exited.

</details>

## Quiz

**1. What is the difference between a switch and a router?**

<details>
<summary>Show answer</summary>

A switch joins hosts on the same local network and passes packets between them. A router joins different networks and moves packets from one to another. To reach anything outside your own network, packets go through a router.

</details>

**2. Why do hosts send data as many small packets instead of one large piece?**

<details>
<summary>Show answer</summary>

So that many conversations can share the same links at once, and so that a lost or damaged piece can be sent again on its own rather than resending everything.

</details>

**3. You run `ping db-01` from a server and get `Temporary failure in name resolution`. Which of the three steps failed, and what does that tell you about the network path?**

<details>
<summary>Show answer</summary>

The first step: the name `db-01` could not be turned into an IP address. No packet was sent to db-01 at all, so this says nothing yet about whether the path to it works. Fix or bypass the name lookup first, for example by pinging the IP address directly.

</details>

**4. On alpha, `ping -c 3 beta` shows `3 received, 0% packet loss` and `time=0.1 ms`. A colleague says this proves a web application on beta is reachable from alpha. Are they right?**

<details>
<summary>Show answer</summary>

No. It proves the name resolves and packets get from alpha to beta and back. It says nothing about whether the web application is running or listening on its port, or whether a firewall blocks that port. You check that with tools from the *Ports and sockets* and *HTTP* topics.

</details>

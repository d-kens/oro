"The network is slow" can mean two very different things. Either each request takes a long time to get an answer, or large transfers crawl. The first is about **delay**, the second about **capacity**, and the fixes are different. Before you can fix either you have to measure it.

This topic measures both in the lab, then makes the lab worse on purpose to see what delay and loss do. By the end you can tell latency from bandwidth and throughput, measure each with ping, mtr and iperf3, add delay and loss to a link with tc, and break a slow web request into its parts with curl.

## Latency, bandwidth and throughput

Three words, often mixed up:

| Term | What it is | Measured in | Analogy |
| --- | --- | --- | --- |
| **Latency** | How long one packet takes to get there, or there and back (**round-trip time**, RTT) | milliseconds | How long the road is |
| **Bandwidth** | The most data a link can carry per second | Mbit/s or Gbit/s | How many lanes the road has |
| **Throughput** | How much data actually got through per second in a real transfer | Mbit/s or Gbit/s | How many cars really arrived |

Bandwidth is the limit; throughput is what you got, and it is always lower. Latency and bandwidth are independent: a link to the other side of the world can have plenty of bandwidth and still take 150 ms per round trip, because light in fibre takes time to travel that far.

What matters depends on the work. Loading a web page means many small requests, each waiting for an answer, so latency dominates. Copying a large backup is one long stream, so throughput dominates. Note that bandwidth is quoted in **bits**, while file sizes are in **bytes**: a 100 Mbit/s link moves at most about 12.5 MB per second.

## Round-trip time and jitter with ping

You met `ping` in the first topic. Its summary line is a small latency report. Start the lab with alpha and beta:

```bash
root@alpha:/# ping -c 5 beta
PING beta (10.10.0.3) 56(84) bytes of data.
64 bytes from beta.lab (10.10.0.3): icmp_seq=1 ttl=64 time=0.068 ms
64 bytes from beta.lab (10.10.0.3): icmp_seq=2 ttl=64 time=0.034 ms
64 bytes from beta.lab (10.10.0.3): icmp_seq=3 ttl=64 time=0.071 ms
64 bytes from beta.lab (10.10.0.3): icmp_seq=4 ttl=64 time=0.085 ms
64 bytes from beta.lab (10.10.0.3): icmp_seq=5 ttl=64 time=0.280 ms

--- beta ping statistics ---
5 packets transmitted, 5 received, 0% packet loss, time 4115ms
rtt min/avg/max/mdev = 0.034/0.107/0.280/0.087 ms
```

- `min`, `avg` and `max` are the shortest, average and longest round trips.
- `mdev` is how much the times vary from one packet to the next. That variation is called **jitter**. Steady jitter matters little for a file download, but a lot for a voice or video call, where packets must arrive at an even pace.
- **Packet loss** is the share of packets that never came back.

Between containers on one computer, a tenth of a millisecond is normal. Inside one data centre, under a millisecond. Between cities, tens of milliseconds. Across an ocean, 100 ms or more.

## Along the whole path with mtr

`ping` measures the whole journey. When there is a router or several in between, **mtr** shows where the time goes. It combines `traceroute` from the *Routing and gateways* topic with a running ping to every hop. `--report -c 10` sends ten rounds and prints a summary:

```bash
root@alpha:/# mtr --report -c 10 example.com
```

Each line is one router on the path, with its loss and its round-trip times. Read it from the top down:

- Loss that starts at one hop **and continues on every hop after it** is real loss at or near that hop.
- Loss on one hop in the middle that **does not continue** is usually just a router that is slow to answer pings about itself, while forwarding traffic normally. Ignore it.
- A big jump in time between two hops that stays in all later hops is where the distance or the congestion is.

Against a site on the internet from inside Docker Desktop, the path may look shorter than it really is, because Docker hides some of the routers between your computer and the internet. Inside the lab, alpha and beta are on the same network, so mtr shows a single hop. It becomes more interesting once you add delay and loss below.

## Throughput with iperf3

To measure throughput, send as much data as you can for a few seconds and count it. **iperf3** does that between two machines you control: one runs as a server, the other as a client. On beta, start the server in the background with `-D`:

```bash
root@beta:/# iperf3 -s -D
```

On alpha, run the client for five seconds:

```bash
root@alpha:/# iperf3 -c beta -t 5
Connecting to host beta, port 5201
[  5] local 10.10.0.2 port 44030 connected to 10.10.0.3 port 5201
[ ID] Interval           Transfer     Bitrate         Retr  Cwnd
[  5]   0.00-1.01   sec  8.93 GBytes  76.2 Gbits/sec    0   2.63 MBytes
[  5]   1.01-2.00   sec  8.49 GBytes  73.3 Gbits/sec    0   3.21 MBytes
[  5]   2.00-3.00   sec  8.23 GBytes  70.5 Gbits/sec    0   3.21 MBytes
[  5]   3.00-4.00   sec  8.57 GBytes  73.7 Gbits/sec    0   3.21 MBytes
[  5]   4.00-5.00   sec  8.38 GBytes  71.8 Gbits/sec    0   3.21 MBytes
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bitrate         Retr
[  5]   0.00-5.00   sec  42.6 GBytes  73.2 Gbits/sec    0             sender
[  5]   0.00-5.00   sec  42.6 GBytes  73.1 Gbits/sec                  receiver

iperf Done.
```

Tens of gigabits a second, because the "link" is memory inside one computer; your number depends on your machine. The columns that matter:

- `Bitrate` is the throughput. The `receiver` line at the bottom is the one to trust.
- `Retr` counts TCP **retransmissions**, segments that were sent again because they were lost. Zero is what you want.
- `Cwnd` is TCP's congestion window, how much data it lets be in flight before waiting for acknowledgements.

By default data flows from client to server. `-R` reverses it, so the server sends, and you can measure each direction separately. Real links are often faster one way than the other.

## Adding delay and loss on purpose

The lab is too perfect to teach much. Linux can make it worse with **tc**, the traffic control tool from iproute2, and its **netem** ("network emulator") queueing discipline. It holds back or throws away packets as they leave an interface. On beta, add 100 ms of delay to everything leaving `eth0`:

```bash
root@beta:/# tc qdisc add dev eth0 root netem delay 100ms
root@beta:/# tc qdisc show dev eth0
qdisc netem 8001: root refcnt 9 limit 1000 delay 100ms
```

```bash
root@alpha:/# ping -c 4 beta
64 bytes from beta.lab (10.10.0.3): icmp_seq=1 ttl=64 time=102 ms
64 bytes from beta.lab (10.10.0.3): icmp_seq=2 ttl=64 time=106 ms
64 bytes from beta.lab (10.10.0.3): icmp_seq=3 ttl=64 time=102 ms
64 bytes from beta.lab (10.10.0.3): icmp_seq=4 ttl=64 time=105 ms
```

The delay applies only to packets **leaving** beta, so only the reply is held back, and the round trip grows by 100 ms, not 200. Change the rule with `tc qdisc change` rather than adding another. A second number adds jitter, here 100 ms give or take 20:

```bash
root@beta:/# tc qdisc change dev eth0 root netem delay 100ms 20ms
```

```bash
root@alpha:/# ping -c 6 beta
64 bytes from beta.lab (10.10.0.3): icmp_seq=1 ttl=64 time=104 ms
64 bytes from beta.lab (10.10.0.3): icmp_seq=2 ttl=64 time=117 ms
64 bytes from beta.lab (10.10.0.3): icmp_seq=3 ttl=64 time=90.9 ms
64 bytes from beta.lab (10.10.0.3): icmp_seq=4 ttl=64 time=87.2 ms
64 bytes from beta.lab (10.10.0.3): icmp_seq=5 ttl=64 time=105 ms
64 bytes from beta.lab (10.10.0.3): icmp_seq=6 ttl=64 time=114 ms

--- beta ping statistics ---
6 packets transmitted, 6 received, 0% packet loss, time 5025ms
rtt min/avg/max/mdev = 87.197/103.187/117.399/11.101 ms
```

`mdev` went from a fraction of a millisecond to 11 ms. Now loss: `loss 20%` throws away one packet in five at random. Missing replies show up as gaps in `icmp_seq` and in the summary:

```bash
root@beta:/# tc qdisc change dev eth0 root netem delay 100ms loss 20%
```

```bash
root@alpha:/# ping -c 20 -i 0.2 beta | tail -2
20 packets transmitted, 13 received, 35% packet loss, time 3888ms
rtt min/avg/max/mdev = 100.331/103.236/106.122/1.759 ms
```

With a random setting, each run gives a different count. mtr shows the same thing as a running report, with the loss and the times side by side:

```bash
root@alpha:/# mtr --report -c 10 beta
Start: 2026-10-25T07:38:22+0000
HOST: alpha                       Loss%   Snt   Last   Avg  Best  Wrst StDev
  1.|-- beta.lab                  10.0%    10  101.8 102.7 100.9 106.0   1.7
```

What delay and loss do to throughput is the striking part. Set 50 ms of delay, then 50 ms plus just 1% loss, and each time measure with beta sending (`-R`), so the data passes through netem:

```bash
root@beta:/# tc qdisc change dev eth0 root netem delay 50ms
root@alpha:/# iperf3 -c beta -t 5 -R | tail -4
[ ID] Interval           Transfer     Bitrate         Retr
[  5]   0.00-5.05   sec   233 MBytes   387 Mbits/sec    0             sender
[  5]   0.00-5.00   sec   229 MBytes   384 Mbits/sec                  receiver
```

```bash
root@beta:/# tc qdisc change dev eth0 root netem delay 50ms loss 1%
root@alpha:/# iperf3 -c beta -t 5 -R | tail -4
[ ID] Interval           Transfer     Bitrate         Retr
[  5]   0.00-5.06   sec  3.50 MBytes  5.81 Mbits/sec   26             sender
[  5]   0.00-5.01   sec  3.12 MBytes  5.24 Mbits/sec                  receiver
```

The link's bandwidth did not change, yet throughput fell from about 73 Gbit/s to under 400 Mbit/s with delay alone, and to about 5 Mbit/s with 1% loss on top. TCP, from the *TCP* topic, only sends a window of data before waiting for acknowledgements, so a longer round trip means more waiting. Every lost segment also makes it slow down sharply, and the `Retr` column counts the resends. On a long-distance link, a small amount of loss costs far more than the distance alone.

netem can also limit the rate, like a slower link: `netem rate 10mbit` gives about 9.4 Mbit/s at the receiver. When you are done, remove the rule:

```bash
root@beta:/# tc qdisc del dev eth0 root
```

## Where a slow request spends its time

For a web request, `curl -w` prints timings that split the wait into steps. Each value is the time in seconds from the start of the request to the end of that step:

| Variable | Time until |
| --- | --- |
| `time_namelookup` | The name was turned into an address (DNS) |
| `time_connect` | The TCP connection was open |
| `time_appconnect` | The TLS handshake finished (0 for plain HTTP) |
| `time_starttransfer` | The first byte of the answer arrived |
| `time_total` | The whole response was received |

Put the format in a file so you can reuse it. `\n` makes a new line:

```text
   namelookup: %{time_namelookup}\n
      connect: %{time_connect}\n
   appconnect: %{time_appconnect}\n
starttransfer: %{time_starttransfer}\n
        total: %{time_total}\n
```

Save it as `timing.txt` on alpha. Start a Python server on beta with `python3 -m http.server 8000 &`, put the 100 ms delay back with `tc qdisc add dev eth0 root netem delay 100ms`, and fetch a page:

```bash
root@alpha:/# curl -s -o /dev/null -w @timing.txt http://beta:8000/
   namelookup: 0.000417
      connect: 0.102895
   appconnect: 0.000000
starttransfer: 0.204948
        total: 0.205159
```

Read the steps as differences. The name took almost nothing. The TCP handshake took one round trip, about 100 ms. Sending the request and getting the first byte took another round trip, so `starttransfer` arrives at about 200 ms. The rest is trivial. Against a real site over HTTPS, the TLS handshake adds its own share:

```bash
root@alpha:/# curl -s -o /dev/null -w @timing.txt https://example.com/
   namelookup: 0.007425
      connect: 0.217518
   appconnect: 0.636844
starttransfer: 0.855638
        total: 0.855770
```

Your numbers depend on where you are. Here the connection took about 210 ms, TLS another 420 ms (a couple of round trips), and the server took about 220 ms to start answering. A large gap between `appconnect` (or `connect`) and `starttransfer` that is much more than one round trip points at the server being slow to produce the answer, not at the network. A large `namelookup` points at DNS.

## Tasks

### Task 1: Make a slow link and measure it

On beta, add 80 ms of delay with 10 ms of jitter to `eth0`. From alpha, measure the round trip with 10 pings and note `avg` and `mdev`. Then start `iperf3 -s -D` on beta and measure throughput from beta to alpha. Remove the rule and measure both again.

<details>
<summary>Check your work</summary>

```bash
root@beta:/# tc qdisc add dev eth0 root netem delay 80ms 10ms
root@alpha:/# ping -c 10 beta | tail -1
rtt min/avg/max/mdev = 72.341/81.919/90.922/5.236 ms
root@alpha:/# iperf3 -c beta -t 5 -R | tail -4
[ ID] Interval           Transfer     Bitrate         Retr
[  5]   0.00-5.08   sec  1.88 MBytes  3.10 Mbits/sec    1             sender
[  5]   0.00-5.00   sec  1.75 MBytes  2.93 Mbits/sec                  receiver
root@beta:/# tc qdisc del dev eth0 root
```

The average sits near 80 ms with a few milliseconds of `mdev`. The throughput may surprise you: a few Mbit/s, where 80 ms of delay without jitter gives a few hundred. With jitter, netem holds each packet for a different time, so later packets overtake earlier ones. TCP reads packets arriving out of order as a sign of loss and slows down. After removing the rule, the round trip drops back to a fraction of a millisecond. Your exact figures will differ. If you get `Error: Exclusivity flag on, cannot modify.`, a rule is already there: use `change` instead of `add`, or delete it first. If iperf3 says `Connection refused`, the server is not running on beta. If you forget `-R`, the data flows from alpha to beta, the delay only touches the acknowledgements, and the throughput drops less.

</details>

### Task 2: Find the slow step

With a Python server on beta port 8000 and no netem rule, fetch the page from alpha with the `timing.txt` format. Then add 150 ms of delay on beta and fetch it again. Say which steps grew, by how much, and why.

<details>
<summary>Check your work</summary>

```text
   namelookup: 0.000526
      connect: 0.152894
   appconnect: 0.000000
starttransfer: 0.308611
        total: 0.308712
```

Before the delay every value is a millisecond or less. After it, `connect` grows by one round trip (about 150 ms, for the TCP handshake) and `starttransfer` by two (the handshake, then the request and the first byte of the answer). `namelookup` stays small, because Docker's DNS server runs on alpha itself, at `127.0.0.11`, and its traffic does not pass beta's netem rule. A common mistake is to read the values as separate durations: they are all measured from the start, so subtract one from the next.

</details>

## Quiz

**1. A link has 1 Gbit/s of bandwidth, but copying a large file across it runs at 40 Mbit/s. Which word describes the 40 Mbit/s, and name two things that could hold it down.**

<details>
<summary>Show answer</summary>

Throughput. Common causes are high latency, because TCP waits for acknowledgements every window of data, and packet loss, which makes TCP resend and slow down. Others are a slow disk at either end, or a busier link somewhere along the path.

</details>

**2. What does `mdev` in ping's summary tell you, and when does it matter most?**

<details>
<summary>Show answer</summary>

How much the round-trip times vary, which is jitter. It matters most for real-time traffic such as voice and video calls, which need packets at an even pace. A bulk download barely notices it.

</details>

**3. A web page from web-01 takes 2 seconds. `curl -w` shows `connect: 0.021`, `starttransfer: 1.950` and `total: 1.990` over plain HTTP. Where is the time going?**

<details>
<summary>Show answer</summary>

In the application. The connection was open after 21 ms, so DNS and the network are fine, but the first byte took almost two more seconds. The server is slow to produce the answer: look at the application, its database queries and its logs, not at the network.

</details>

**4. You run `tc qdisc add dev eth0 root netem delay 100ms` on beta. Why does ping from alpha to beta show about 100 ms, not 200 ms?**

<details>
<summary>Show answer</summary>

netem works on packets leaving the interface it is attached to. The ping request leaves alpha, which has no rule; only beta's reply is delayed. To delay both directions, add a rule on alpha too.

</details>

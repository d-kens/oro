TCP spends packets on a handshake, acknowledgements and resends so that every byte arrives in order. UDP spends none of them. A program hands UDP a message, UDP puts an address and port on it and sends it, and that is the end of UDP's job.

That makes UDP fast and simple, and it puts the job of coping with loss on the program. By the end you can send and receive UDP datagrams by hand, recognise what an unanswered UDP port looks like, and explain why DNS uses UDP.

## Datagrams, not connections

A UDP message is a **datagram**: one packet, sent on its own, with no link to the ones before or after it. There is no handshake, so there is nothing to set up first and nothing to close afterwards. The sender does not learn whether the datagram arrived.

| | TCP | UDP |
| --- | --- | --- |
| Setup before data | Three-way handshake | None |
| Delivery | Guaranteed or the connection fails | Best effort, no notice of loss |
| Order | Always in order | Whatever order they arrive in |
| Unit | A stream of bytes | Separate messages |
| Header size | 20 bytes or more | 8 bytes |

The 8-byte UDP header holds just four things: the source port, the destination port, a length and a checksum. Ports work exactly as they do for TCP, but the two are separate: UDP port 53 and TCP port 53 are different sockets.

## Sending a datagram by hand

Netcat speaks UDP with `-u`. On beta, start a UDP listener on port 9000:

```bash
root@beta:/# nc -u -l 9000
```

In a second shell on beta (`docker exec -it beta bash` from your computer), look at UDP sockets with `ss -uln`, then start a capture:

```bash
root@beta:/# ss -uln
State  Recv-Q Send-Q Local Address:Port  Peer Address:Port Process
UNCONN 0      0         127.0.0.11:33057      0.0.0.0:*
UNCONN 0      0            0.0.0.0:9000       0.0.0.0:*
root@beta:/# tcpdump -n -i eth0 udp port 9000
```

UDP sockets show `UNCONN`, short for unconnected, instead of `LISTEN`; there is no connection to wait for. The socket on `127.0.0.11` is Docker's DNS service. Now send a line from alpha. `-w 1` makes netcat quit one second after its input ends, because with no connection to close it would otherwise wait for a reply forever:

```bash
root@alpha:/# echo hello | nc -u -w 1 beta 9000
```

Beta's listener prints `hello`. The capture shows a single packet:

```text
07:27:16.271938 IP 10.10.0.2.35423 > 10.10.0.3.9000: UDP, length 6
```

Compare that with the eight packets TCP needed for the same line in the *TCP* topic. One packet, no reply, no close.

If you run `ss -uan` on beta now, the listener shows `ESTAB` with alpha's address and port. That is netcat, not UDP: after the first datagram arrives, netcat tells its socket to only accept datagrams from that sender. Datagrams from any other address or port are ignored, so start a fresh listener before each new test.

## What can go missing

On a quiet local network, almost nothing is lost, so you have to cause some loss to see the difference. `tc` with `netem` makes an interface drop a share of its outgoing packets on purpose; the *Latency and bandwidth* topic covers it. Here, alpha drops 30 percent of what it sends.

Start a fresh listener on beta, then on alpha send the numbers 1 to 20, one datagram every tenth of a second:

```bash
root@beta:/# nc -u -l 9000
```

```bash
root@alpha:/# tc qdisc add dev eth0 root netem loss 30%
root@alpha:/# for i in $(seq 1 20); do echo $i; sleep 0.1; done | nc -u -w 1 beta 9000
```

Beta receives some of them, with gaps:

```text
2
3
6
8
9
...
```

In this run 13 of the 20 arrived; your numbers will differ. Neither side reported an error. The sender has no idea, and the receiver only knows because the numbers skip. Now do the same over TCP, with a TCP listener on beta:

```bash
root@beta:/# nc -l 9000
```

```bash
root@alpha:/# for i in $(seq 1 20); do echo $i; sleep 0.1; done | nc -N beta 9000
```

All 20 arrive, in order, because TCP resends what was lost. You can see the resends in alpha's counters with `nstat`, which comes with iproute2:

```bash
root@alpha:/# nstat TcpRetransSegs
#kernel
TcpRetransSegs                  6                  0.0
```

Remove the loss rule when you are done, or everything on alpha stays unreliable:

```bash
root@alpha:/# tc qdisc del dev eth0 root
```

## An unanswered UDP port

With TCP, a closed port answers with a reset. UDP has no reset. Instead, the receiving machine's kernel usually sends back an **ICMP port unreachable** message. Capture UDP and ICMP on alpha while sending to a port where nothing listens:

```bash
root@alpha:/# tcpdump -n -i eth0 udp or icmp
```

```bash
root@alpha:/# echo hi | nc -u -w 1 beta 9999
```

```text
07:27:29.256315 IP 10.10.0.2.33735 > 10.10.0.3.9999: UDP, length 3
07:27:29.256396 IP 10.10.0.3 > 10.10.0.2: ICMP 10.10.0.3 udp port 9999 unreachable, length 39
```

That ICMP message is the only way to learn a UDP port is closed, and firewalls often drop it. When they do, a closed port, a blocked port and an open port whose program chose not to reply all look the same: silence.

This makes UDP port checks unreliable. `nc -zuv` reports success unless an ICMP error comes back:

```bash
root@alpha:/# nc -zuv -w 1 beta 9000
Connection to beta (10.10.0.3) 9000 port [udp/*] succeeded!
root@alpha:/# nc -zuv -w 1 beta 9999
```

The first is a real listener. The second prints nothing and exits with status 1, because the ICMP error came back. Now drop UDP to 9999 on beta with a firewall rule, so no error is sent, and try again:

```bash
root@beta:/# iptables -A INPUT -p udp --dport 9999 -j DROP
```

```bash
root@alpha:/# nc -zuv -w 1 beta 9999
Connection to beta (10.10.0.3) 9999 port [udp/*] succeeded!
```

Nothing listens there, yet netcat says it succeeded, because it heard no complaint. The only real test of a UDP service is to send it a proper request and get a proper answer. Clear the rule with `iptables -F` on beta.

## Where UDP is the right choice

UDP fits when a fresh answer matters more than a guaranteed one, or when the program can cope with loss better than TCP would:

- **DNS**: one short question, one short answer. A handshake would double the time for each lookup, and if the answer does not come, the client simply asks again.
- **Voice, video and games**: a sound sample that arrives late is useless, so it is better skipped than resent.
- **Time sync (NTP)**, **DHCP**, and many monitoring and logging protocols, which send small, frequent messages.
- **Newer protocols** that build their own reliability on top of UDP. HTTP/3 runs over a protocol called QUIC, which uses UDP underneath.

DNS is the one you meet every day. Capture port 53 on alpha and ask one of the root DNS servers a question directly; the *DNS basics* topic explains what root servers are:

```bash
root@alpha:/# tcpdump -n -i eth0 port 53
```

```bash
root@alpha:/# dig @a.root-servers.net example.com +norec
```

```text
07:28:30.141250 IP 10.10.0.2.56967 > 198.41.0.4.53: 7051 [1au] A? example.com. (52)
07:28:30.329523 IP 198.41.0.4.53 > 10.10.0.2.56967: 7051- 0/13/27 (836)
```

Two packets: a 52-byte question and an 836-byte answer, with no handshake and no close. The number 7051 is a query ID, so dig can match the answer to its question. dig's own output ends with `;; SERVER: 198.41.0.4#53(a.root-servers.net) (UDP)`. If a reply is too large, or dropped, DNS can fall back to TCP, which is why DNS servers listen on TCP port 53 as well.

When a DNS server does not answer, dig waits and retries, because UDP will not tell it anything. `+tries=1 +time=2` keeps the wait short:

```bash
root@alpha:/# dig @beta example.com +tries=1 +time=2
;; communications error to 10.10.0.3#53: connection refused
...
;; no servers could be reached
```

`connection refused` here is dig reporting the ICMP port unreachable from beta, where no DNS server runs.

## Tasks

### Task 1: Count what arrives

Repeat the loss experiment with 50 numbers and 20 percent loss, once over UDP and once over TCP. For each, count how many lines beta receives, using `nc -u -l 9000 > got.txt` and `nc -l 9000 > got.txt` on beta and then `wc -l got.txt`. Remove the loss rule at the end.

<details>
<summary>Check your work</summary>

```bash
root@alpha:/# tc qdisc add dev eth0 root netem loss 20%
root@alpha:/# for i in $(seq 1 50); do echo $i; sleep 0.1; done | nc -u -w 1 beta 9000
root@alpha:/# for i in $(seq 1 50); do echo $i; sleep 0.1; done | nc -N beta 9000
root@alpha:/# tc qdisc del dev eth0 root
```

Over UDP, around 40 lines arrive (44 in one test run), with gaps; the count changes each run. Over TCP, all 50 arrive in order, a little later than they would without loss. The usual mistake is reusing the UDP listener for a second sender: netcat only accepts datagrams from the first sender, so start a fresh listener each time. The TCP run takes a little longer than the 5 seconds of sleeps, because each resend waits for a short timeout first.

</details>

### Task 2: Closed or silent

On alpha, run `nc -zuv -w 1 beta 5353` and note the result and exit status (`echo $?`). Then, on beta, add `iptables -A INPUT -p udp --dport 5353 -j DROP` and run the same check again. Capture with `tcpdump -n -i eth0 udp or icmp` on alpha during both runs and explain the difference.

<details>
<summary>Check your work</summary>

The first check prints nothing and exits with status 1. The capture shows your datagram and then `ICMP 10.10.0.3 udp port 5353 unreachable`. After the rule, the check prints `Connection to beta (10.10.0.3) 5353 port [udp/mdns] succeeded!` and exits with 0, and the capture shows only your outgoing datagram. Nothing is listening in either case. The difference is only whether the ICMP error got back. Run `iptables -F` on beta to clear the rule.

</details>

## Quiz

**1. Why does a UDP sender not know whether its datagram arrived?**

<details>
<summary>Show answer</summary>

UDP has no acknowledgements. It sends each datagram once and forgets it. If a program needs to know, it has to arrange that itself, for example by expecting a reply and asking again if none comes.

</details>

**2. `ss -uln` shows a socket in state `UNCONN` on port 53. Is something wrong?**

<details>
<summary>Show answer</summary>

No. UDP has no connections, so a UDP socket waiting for datagrams shows `UNCONN` rather than `LISTEN`. It means a program is bound to port 53 and will receive datagrams sent to it.

</details>

**3. Why does DNS use UDP for most lookups, and when does it use TCP?**

<details>
<summary>Show answer</summary>

A lookup is one small question and one small answer, so UDP does it in a single round trip with no handshake. If no answer arrives, the client asks again. DNS switches to TCP when an answer is too large for a UDP reply, and for some server-to-server transfers.

</details>

**4. A service on a server cannot be reached: an application sends metrics over UDP to port 8125 on a monitoring host and none appear. `nc -zuv metrics-01 8125` says `succeeded`. Does that prove the port is open?**

<details>
<summary>Show answer</summary>

No. For UDP, `succeeded` only means no ICMP error came back. A firewall or cloud security group that drops the datagrams produces the same result as a working service. Check that the monitoring program is listening with `ss -uln` on that host, and capture with tcpdump there to see whether the datagrams arrive at all.

</details>

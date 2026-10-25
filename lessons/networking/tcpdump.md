Every tool so far tells you what a program thinks happened: `curl` says it timed out, `ping` says no reply. **tcpdump** shows you what actually crossed the wire. When two teams disagree about whether a request ever arrived, a capture settles it.

This topic covers capturing packets on an interface, reading tcpdump's output, narrowing a capture with filters, and saving a capture to a file. By the end you can follow a single HTTP request from the handshake to the close, and answer "did the packet arrive, and did anything answer?" on any Linux machine.

## Your first capture

tcpdump listens on a network interface and prints a line for each packet it sees. It needs root, which you have in the lab. Start it on beta, on `eth0`, and stop it with <kbd>Ctrl</kbd>+<kbd>C</kbd>:

```bash
root@beta:/# tcpdump -n -i eth0
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
```

It waits. In another terminal, ping beta once from alpha, and two lines appear:

```text
07:42:08.490022 IP 10.10.0.2 > 10.10.0.3: ICMP echo request, id 67, seq 1, length 64
07:42:08.490078 IP 10.10.0.3 > 10.10.0.2: ICMP echo reply, id 67, seq 1, length 64
```

Each line is one packet: the time, the protocol (`IP`), source `>` destination, and a summary of what is inside. Here alpha asked and beta answered, 56 microseconds later.

Three options belong on almost every capture:

| Option | Effect |
| --- | --- |
| `-i eth0` | Capture on this interface. `-i any` captures on all of them. |
| `-n` | Do not turn addresses and ports into names. Faster, and shows what is really in the packet. |
| `-c 10` | Stop after 10 packets, instead of running until <kbd>Ctrl</kbd>+<kbd>C</kbd>. |

Without `-n`, tcpdump looks up a name for every address it prints. The same capture shows `alpha.lab.47692 > beta.http` instead of `10.10.0.2.47692 > 10.10.0.3.80`. That is easier to read until a lookup is slow or wrong, and then it is misleading. Keep `-n` as the habit.

## Choosing an interface

`tcpdump -D` lists what it can capture on:

```bash
root@beta:/# tcpdump -D
1.eth0 [Up, Running, Connected]
2.any (Pseudo-device that captures on all interfaces) [Up, Running]
3.lo [Up, Running, Loopback]
```

Many more lines follow, such as `tunl0` and `nflog`; you can ignore them. Pick the interface the traffic actually uses:

- `eth0` for traffic to and from other machines on `lab`.
- `lo` for traffic between programs on the same machine, such as an application talking to a database on `127.0.0.1`. It never appears on `eth0`.
- `any` when you are not sure, or on a router, where one connection crosses two interfaces. Each line then names the interface and the direction:

```text
07:51:03.199436 eth0  In  IP 10.10.0.2.41918 > 10.10.0.3.80: Flags [S], seq 2401366070, win 64240, options [mss 1460,sackOK,TS val 760351789 ecr 0,nop,wscale 7], length 0
07:51:03.199492 eth0  Out IP 10.10.0.3.80 > 10.10.0.2.41918: Flags [S.], seq 3477231302, ack 2401366071, win 65160, options [mss 1460,sackOK,TS val 1427922675 ecr 760351789,nop,wscale 7], length 0
```

## Filters

A busy server sees thousands of packets a second. A **filter**, written after the options, keeps only the ones you want. The building blocks:

| Filter | Keeps packets |
| --- | --- |
| `host 10.10.0.2` | To or from that address |
| `src host 10.10.0.2`, `dst host 10.10.0.2` | From it, or to it |
| `net 10.20.0.0/24` | To or from that network |
| `port 80` | With source or destination port 80 |
| `dst port 80` | Going to port 80 |
| `tcp`, `udp`, `icmp` | Of that protocol |

Combine them with `and`, `or` and `not`, and group with parentheses. Put the whole filter in quotes so the shell leaves the parentheses alone:

```bash
root@beta:/# tcpdump -n -i eth0 'src host 10.10.0.2 and (icmp or port 80)'
```

That keeps only packets from alpha that are pings or web traffic. A curl and a ping from alpha, and a ping from router at the same time, give:

```text
07:51:03.199441 IP 10.10.0.2.41918 > 10.10.0.3.80: Flags [S], seq 2401366070, win 64240, options [mss 1460,sackOK,TS val 760351789 ecr 0,nop,wscale 7], length 0
07:51:03.199518 IP 10.10.0.2.41918 > 10.10.0.3.80: Flags [.], ack 3477231303, win 502, options [nop,nop,TS val 760351789 ecr 1427922675], length 0
07:51:03.199639 IP 10.10.0.2.41918 > 10.10.0.3.80: Flags [P.], seq 0:67, ack 1, win 502, options [nop,nop,TS val 760351789 ecr 1427922675], length 67: HTTP: GET / HTTP/1.1
...
07:51:03.202899 IP 10.10.0.2 > 10.10.0.3: ICMP echo request, id 74, seq 1, length 64
```

beta's replies and router's ping are filtered out. A filter you will use often is `not port 22`: when you capture on a server you reached over SSH, it keeps your own session's packets from flooding the output.

## Following a curl request

Now the main use: watching a whole request. Put a page on beta and capture web traffic:

```bash
root@beta:/# echo "hello from beta" > /var/www/html/index.html
root@beta:/# nginx
root@beta:/# tcpdump -n -i eth0 tcp port 80
root@alpha:/# curl http://beta
hello from beta
```

One small request is ten packets:

```text
07:41:40.412317 IP 10.10.0.2.45846 > 10.10.0.3.80: Flags [S], seq 2885924588, win 64240, options [mss 1460,sackOK,TS val 759788934 ecr 0,nop,wscale 7], length 0
07:41:40.412360 IP 10.10.0.3.80 > 10.10.0.2.45846: Flags [S.], seq 739277330, ack 2885924589, win 65160, options [mss 1460,sackOK,TS val 1427359821 ecr 759788934,nop,wscale 7], length 0
07:41:40.412376 IP 10.10.0.2.45846 > 10.10.0.3.80: Flags [.], ack 1, win 502, options [nop,nop,TS val 759788935 ecr 1427359821], length 0
07:41:40.412489 IP 10.10.0.2.45846 > 10.10.0.3.80: Flags [P.], seq 1:68, ack 1, win 502, options [nop,nop,TS val 759788935 ecr 1427359821], length 67: HTTP: GET / HTTP/1.1
07:41:40.412493 IP 10.10.0.3.80 > 10.10.0.2.45846: Flags [.], ack 68, win 509, options [nop,nop,TS val 1427359821 ecr 759788935], length 0
07:41:40.412924 IP 10.10.0.3.80 > 10.10.0.2.45846: Flags [P.], seq 1:262, ack 68, win 509, options [nop,nop,TS val 1427359821 ecr 759788935], length 261: HTTP: HTTP/1.1 200 OK
07:41:40.412961 IP 10.10.0.2.45846 > 10.10.0.3.80: Flags [.], ack 262, win 501, options [nop,nop,TS val 759788935 ecr 1427359821], length 0
07:41:40.413054 IP 10.10.0.2.45846 > 10.10.0.3.80: Flags [F.], seq 68, ack 262, win 501, options [nop,nop,TS val 759788935 ecr 1427359821], length 0
07:41:40.413118 IP 10.10.0.3.80 > 10.10.0.2.45846: Flags [F.], seq 262, ack 69, win 509, options [nop,nop,TS val 1427359821 ecr 759788935], length 0
07:41:40.413139 IP 10.10.0.2.45846 > 10.10.0.3.80: Flags [.], ack 263, win 501, options [nop,nop,TS val 759788935 ecr 1427359821], length 0
```

Read the `Flags` field, which the *TCP* topic explained:

| Packets | Flags | What happens |
| --- | --- | --- |
| 1 to 3 | `[S]`, `[S.]`, `[.]` | The three-way handshake: SYN, SYN-ACK, ACK |
| 4 | `[P.]` | alpha sends the 67-byte request, `GET / HTTP/1.1` |
| 5 | `[.]` | beta acknowledges it |
| 6 | `[P.]` | beta sends the 261-byte response, `HTTP/1.1 200 OK` |
| 7 | `[.]` | alpha acknowledges it |
| 8 to 10 | `[F.]`, `[F.]`, `[.]` | Both sides close the connection |

`S` is SYN, `.` is ACK, `P` is push (data to hand to the program), and `F` is FIN. alpha's port, 45846, is a random high port; beta's is 80. After the handshake, tcpdump shows sequence numbers relative to the start, so `seq 1:68` means bytes 1 to 67 of the data.

This one picture answers most "is it the network?" questions. No `[S]` at all means the packet never arrived: a route, firewall or DNS problem before beta. An `[S]` with no `[S.]` means beta got it and did not answer, often a firewall on beta. An `[S]` answered by `[R.]`, a reset, means nothing is listening on the port.

## Seeing inside packets

`-A` prints each packet's contents as text, which is enough to read plain HTTP. Capture again with `-A` and the request appears under its packet line:

```text
07:41:52.977674 IP 10.10.0.2.47692 > 10.10.0.3.80: Flags [P.], seq 3650070316:3650070383, ack 3643141904, win 502, options [nop,nop,TS val 759801500 ecr 1427372386], length 67: HTTP: GET / HTTP/1.1
E..w..@.@..h
...
....L.P...,.%.............
-I..U..bGET / HTTP/1.1
Host: beta
User-Agent: curl/8.5.0
Accept: */*
```

The scrambled characters before `GET` are the IP and TCP headers, printed as if they were text. `-X` prints hex and text side by side, which helps when the data is not text. The rows after the headers look like this:

```text
	0x0030:  5513 f962 4745 5420 2f20 4854 5450 2f31  U..bGET./.HTTP/1
	0x0040:  2e31 0d0a 486f 7374 3a20 6265 7461 0d0a  .1..Host:.beta..
```

With HTTPS, both show only encrypted bytes. That is the point of TLS, covered in the *TLS and HTTPS* topic, and why captures of HTTPS traffic stop at the handshake.

## Saving and reading captures

`-w` writes raw packets to a file instead of printing them. `-r` reads a file back, and takes the same filters:

```bash
root@beta:/# tcpdump -n -i eth0 -w /tmp/web.pcap port 80
tcpdump: listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
^C10 packets captured
10 packets received by filter
0 packets dropped by kernel
root@beta:/# tcpdump -n -r /tmp/web.pcap -c 3
reading from file /tmp/web.pcap, link-type EN10MB (Ethernet), snapshot length 262144
07:41:52.977534 IP 10.10.0.2.47692 > 10.10.0.3.80: Flags [S], seq 3650070315, win 64240, options [mss 1460,sackOK,TS val 759801500 ecr 0,nop,wscale 7], length 0
07:41:52.977575 IP 10.10.0.3.80 > 10.10.0.2.47692: Flags [S.], seq 3643141903, ack 3650070316, win 65160, options [mss 1460,sackOK,TS val 1427372386 ecr 759801500,nop,wscale 7], length 0
07:41:52.977594 IP 10.10.0.2.47692 > 10.10.0.3.80: Flags [.], ack 1, win 502, options [nop,nop,TS val 759801500 ecr 1427372386], length 0
```

While writing, tcpdump prints only the counts. A capture file is the usual way to work on a problem: capture on the server during the failure, copy the file somewhere comfortable, and read it as many times as you like. The `.pcap` format is standard, so graphical tools such as Wireshark open it too. To copy one out of the lab to your own computer:

```bash
$ docker cp beta:/tmp/web.pcap .
```

On a busy machine, always give a capture a filter and a `-c` limit, or a file can fill the disk.

## Tasks

### Task 1: Catch only the handshake

On beta, write a capture that prints only the first two packets of each new TCP connection to port 80: the SYN and the SYN-ACK. Make it stop by itself after two packets. Test it with `curl http://beta` from alpha.

<details>
<summary>Check your work</summary>

```bash
root@beta:/# tcpdump -n -i eth0 -c 2 'port 80 and tcp[tcpflags] & tcp-syn != 0'
07:51:03.199442 IP 10.10.0.2.41918 > 10.10.0.3.80: Flags [S], seq 2401366070, win 64240, options [mss 1460,sackOK,TS val 760351789 ecr 0,nop,wscale 7], length 0
07:51:03.199492 IP 10.10.0.3.80 > 10.10.0.2.41918: Flags [S.], seq 3477231302, ack 2401366071, win 65160, options [mss 1460,sackOK,TS val 1427922675 ecr 760351789,nop,wscale 7], length 0
2 packets captured
```

`tcp[tcpflags] & tcp-syn != 0` matches packets with the SYN flag set, which only the first two packets of a connection have. `-c 2 port 80` without the flag test also stops after two packets here, but on a busy server those would be any two packets. Without quotes, the shell treats `&` as its own character and the command fails.

</details>

### Task 2: Prove whether a request arrives

On beta, block port 8000 with `iptables -A INPUT -p tcp --dport 8000 -j DROP` and start `python3 -m http.server 8000 &`. Capture on beta while alpha runs `curl -m 3 http://beta:8000`. Write the capture to `/tmp/blocked.pcap`, read it back, and say what the packets prove. Remove the rule afterwards with `iptables -F`.

<details>
<summary>Check your work</summary>

```bash
root@beta:/# tcpdump -n -i eth0 -w /tmp/blocked.pcap port 8000
root@beta:/# tcpdump -n -r /tmp/blocked.pcap
reading from file /tmp/blocked.pcap, link-type EN10MB (Ethernet), snapshot length 262144
07:52:16.093124 IP 10.10.0.2.47006 > 10.10.0.3.8000: Flags [S], seq 250562586, win 64240, options [mss 1460,sackOK,TS val 760424683 ecr 0,nop,wscale 7], length 0
07:52:17.113985 IP 10.10.0.2.47006 > 10.10.0.3.8000: Flags [S], seq 250562586, win 64240, options [mss 1460,sackOK,TS val 760425704 ecr 0,nop,wscale 7], length 0
07:52:18.137473 IP 10.10.0.2.47006 > 10.10.0.3.8000: Flags [S], seq 250562586, win 64240, options [mss 1460,sackOK,TS val 760426727 ecr 0,nop,wscale 7], length 0
```

Stop the capture with <kbd>Ctrl</kbd>+<kbd>C</kbd> after curl gives up. Only SYNs, the same one retried every second, and no `[S.]` back. The request reached beta's network interface, so the network path is fine; something on beta discarded it. tcpdump sees packets before the firewall's `INPUT` chain does, which is why dropped packets still show up.

</details>

## Quiz

**1. Why is `-n` worth using on almost every capture?**

<details>
<summary>Show answer</summary>

It stops tcpdump looking up names for addresses and ports. Lookups slow the output, can generate DNS traffic of their own, and can show a name that hides the address actually in the packet.

</details>

**2. An application on a server talks to a database on `127.0.0.1:5432`. You run `tcpdump -n -i eth0 port 5432` and see nothing. Does that mean the application is not connecting?**

<details>
<summary>Show answer</summary>

No. Traffic to `127.0.0.1` goes over the loopback interface and never reaches `eth0`. Capture with `-i lo` or `-i any` instead.

</details>

**3. A client times out connecting to a service on a server. A capture on the server shows the client's `[S]` packets arriving, repeated, and nothing sent back. Where is the problem?**

<details>
<summary>Show answer</summary>

On the server. The packets reach it, so routing and any firewalls along the path let them through. Something on the server ignores them: most often a firewall rule that drops them. If nothing were listening, the server would answer with a reset `[R.]` instead of silence.

</details>

**4. Write a filter that keeps traffic to or from `10.10.0.2`, except SSH.**

<details>
<summary>Show answer</summary>

`'host 10.10.0.2 and not port 22'`. The quotes are not needed for this one, but they are a good habit for any filter with more than one word.

</details>

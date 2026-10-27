Most of what you do on a network runs over TCP: web pages, APIs, SSH, database connections. TCP takes the packets that IP delivers on a best-effort basis, which can arrive late, out of order or not at all, and turns them into a reliable stream of bytes between two programs.

That reliability has a price, and it shows up in the packets: a handshake before any data, an acknowledgement for what arrives, and resends for what does not. By the end you can watch a TCP connection open and close with tcpdump, read its state in `ss`, and tell a closed port from a blocked one by what comes back.

## A connection between two sockets

TCP is **connection-oriented**. Before any data moves, the two ends agree to talk, and from then on each side keeps a record of the conversation: what it has sent, what the other side has received, and what is still in flight. That record is the **connection**.

A connection is named by four values: the client's address and port, and the server's address and port. The *Ports and sockets* topic showed the server side, a socket in the `LISTEN` state. The client side gets a random high port, called an **ephemeral port**, picked by the kernel for each new connection. That is how one machine can hold many connections to the same server port at once: each one has a different client port.

TCP gives the programs at each end three promises:

- Bytes arrive **in order**, even if the packets carrying them did not.
- Bytes that get lost are **sent again** until they arrive or the connection gives up.
- Neither side sends faster than the other can take in, a mechanism called **flow control**.

## The three-way handshake

You can watch a connection being made. You need two shells on beta, so open a second one from your computer's own terminal with `docker exec`:

```bash
$ docker exec -it beta bash
root@beta:/#
```

In the first beta shell, start a listener on port 9000 with `nc`, from the *Ports and sockets* topic. It accepts one connection and prints what it receives:

```bash
root@beta:/# nc -l 9000
```

In the second beta shell, start a capture of traffic on that port. `-n` keeps addresses as numbers:

```bash
root@beta:/# tcpdump -n -i eth0 tcp port 9000
```

Now, on alpha, send one line and close the connection. `-N` tells netcat to close its side once the input is finished:

```bash
root@alpha:/# echo hello | nc -N beta 9000
```

The listener prints `hello` and exits. The capture shows eight packets:

```text
10.10.0.2.51066 > 10.10.0.3.9000: Flags [S], seq 1083176185, win 64240, options [mss 1460,sackOK,TS val 549223989 ecr 0,nop,wscale 7], length 0
10.10.0.3.9000 > 10.10.0.2.51066: Flags [S.], seq 2188652734, ack 1083176186, win 65160, options [mss 1460,sackOK,TS val 427406260 ecr 549223989,nop,wscale 7], length 0
10.10.0.2.51066 > 10.10.0.3.9000: Flags [.], ack 1, win 502, options [nop,nop,TS val 549223990 ecr 427406260], length 0
10.10.0.2.51066 > 10.10.0.3.9000: Flags [P.], seq 1:7, ack 1, win 502, options [nop,nop,TS val 549223990 ecr 427406260], length 6
10.10.0.3.9000 > 10.10.0.2.51066: Flags [.], ack 7, win 510, options [nop,nop,TS val 427406261 ecr 549223990], length 0
10.10.0.2.51066 > 10.10.0.3.9000: Flags [F.], seq 7, ack 1, win 502, options [nop,nop,TS val 549223990 ecr 427406261], length 0
10.10.0.3.9000 > 10.10.0.2.51066: Flags [F.], seq 1, ack 8, win 510, options [nop,nop,TS val 427406261 ecr 549223990], length 0
10.10.0.2.51066 > 10.10.0.3.9000: Flags [.], ack 2, win 502, options [nop,nop,TS val 549223990 ecr 427406261], length 0
```

Each line starts with a timestamp, left off here. The client port, 51066 here, will be different for you. Ignore the `options` for now; the *tcpdump* topic reads them. The **flags** say what each packet is for:

| Flag | Name | Meaning |
| --- | --- | --- |
| `S` | SYN | "I want to open a connection" |
| `.` | ACK | "I have received everything up to this point" |
| `P` | PSH | "This packet carries data, hand it to the program now" |
| `F` | FIN | "I have finished sending" |
| `R` | RST | "Abort, this connection is not wanted" |

The first three packets are the **three-way handshake**: alpha sends `S`, beta answers `S.` (SYN and ACK together), and alpha confirms with `.`. Only then does data move. The fourth packet carries 6 bytes, `hello` plus a newline, and beta acknowledges them. The last three close the connection: each side sends a FIN and the other acknowledges it.

So a single line of data needed eight packets and a full round trip before the first byte could leave. Across the internet, where a round trip can be 50 milliseconds or more, that setup time adds up, which is why programs reuse connections instead of opening a new one per request.

## Sequence numbers, kept simple

TCP numbers every byte it sends. In the handshake each side picks a random starting number, the `seq` in its SYN: 1083176185 for alpha and 2188652734 for beta. After that, tcpdump shows numbers **relative** to the start, so they are easy to read.

- `seq 1:7, length 6` means "these are bytes 1 to 6 of my stream". The range ends at 7 because that is the next byte to come.
- `ack 7` from beta means "I have everything before byte 7, send byte 7 next".

That pair is how TCP knows what arrived. If alpha sends bytes and never sees an `ack` that covers them, it sends them again. If packets arrive out of order, the receiver uses the numbers to put the bytes back in the right place before passing them to the program. A SYN and a FIN each count as one byte, which is why beta's first ACK is the start number plus one, and why the final `ack 8` and `ack 2` are one more than the data alone.

## Connection states in ss

Each end tracks the connection through a series of **states**. `ss` shows them. Start a listener on beta again, and from alpha open a connection that stays open: `sleep 60` sends nothing for a minute, so netcat waits.

```bash
root@beta:/# nc -l 9000
```

```bash
root@alpha:/# sleep 60 | nc beta 9000
```

In a second shell on each machine, list TCP sockets. `-t` is TCP, `-n` keeps numbers, `-a` shows all states, `-l` only listening ones, and `-p` the process:

```bash
root@alpha:/# ss -tn
State Recv-Q Send-Q Local Address:Port  Peer Address:Port Process
ESTAB 0      0          10.10.0.2:41332    10.10.0.3:9000
```

```bash
root@beta:/# ss -tnp
State Recv-Q Send-Q Local Address:Port Peer Address:Port Process
ESTAB 0      0          10.10.0.3:9000    10.10.0.2:41332 users:(("nc",pid=55,fd=4))
```

Both ends show the same connection from their own side, in the **ESTAB** (established) state. The states you meet most often:

| State | Meaning |
| --- | --- |
| `LISTEN` | A server socket waiting for new connections |
| `SYN-SENT` | The client has sent a SYN and is waiting for an answer |
| `ESTAB` | The handshake is done and data can flow |
| `FIN-WAIT`, `CLOSE-WAIT`, `LAST-ACK` | The connection is being closed |
| `TIME-WAIT` | Closed, but remembered for a while |

`CLOSE-WAIT` is worth knowing: it means the other side has closed, but the program on this side has not closed its socket yet. A large number of them usually points to a bug in the application, not the network.

## TIME_WAIT

Once the minute is up, or after the `echo hello` test, look on alpha again with `-a`, and add `-o` to see timers:

```bash
root@alpha:/# ss -tano
State     Recv-Q Send-Q Local Address:Port  Peer Address:Port Process
LISTEN    0      4096      127.0.0.11:36657      0.0.0.0:*
TIME-WAIT 0      0          10.10.0.2:51066    10.10.0.3:9000 timer:(timewait,59sec,0)
```

The `LISTEN` socket on `127.0.0.11` is Docker's DNS service inside the container; ignore it. The other line is the connection you closed. The side that closes first, alpha here, keeps it in **TIME_WAIT** for about 60 seconds on Linux. During that time, any late packet from the old connection is recognised and thrown away instead of being mistaken for part of a new one.

TIME_WAIT is normal and costs very little. You only notice it on a busy client that opens and closes thousands of short connections per second, where it can tie up ephemeral ports. The usual fix is reusing connections, not tuning the kernel.

## Refused, or dropped and resent

What comes back when a connection fails tells you a lot. Try a port on beta where nothing listens, with a capture running on alpha:

```bash
root@alpha:/# nc -v beta 9999
nc: connect to beta (10.10.0.3) port 9999 (tcp) failed: Connection refused
```

```text
10.10.0.2.48510 > 10.10.0.3.9999: Flags [S], seq 4011202656, win 64240, options [mss 1460,sackOK,TS val 549237475 ecr 0,nop,wscale 7], length 0
10.10.0.3.9999 > 10.10.0.2.48510: Flags [R.], seq 0, ack 4011202657, win 0, length 0
```

Beta's kernel answers the SYN at once with a **reset** (`R`). The machine is up and reachable; there is just nothing on that port. You get the answer in under a millisecond.

Now make beta silently drop packets to port 9000 with a firewall rule. The *Firewall basics* topic explains the command; for now, type it as shown, and start a listener so the port really is open behind the rule:

```bash
root@beta:/# iptables -A INPUT -p tcp --dport 9000 -j DROP
root@beta:/# nc -l 9000
```

From alpha, try to connect, giving up after 10 seconds with `-w 10`. While it waits, `ss` in a second alpha shell shows the socket stuck in `SYN-SENT`:

```bash
root@alpha:/# nc -v -w 10 beta 9000
nc: connect to beta (10.10.0.3) port 9000 (tcp) timed out: Operation now in progress
```

```text
07:26:51.975799 IP 10.10.0.2.60064 > 10.10.0.3.9000: Flags [S], seq 670582728, win 64240, ...
07:26:53.014667 IP 10.10.0.2.60064 > 10.10.0.3.9000: Flags [S], seq 670582728, win 64240, ...
07:26:54.038502 IP 10.10.0.2.60064 > 10.10.0.3.9000: Flags [S], seq 670582728, win 64240, ...
07:26:55.065406 IP 10.10.0.2.60064 > 10.10.0.3.9000: Flags [S], seq 670582728, win 64240, ...
07:26:56.086529 IP 10.10.0.2.60064 > 10.10.0.3.9000: Flags [S], seq 670582728, win 64240, ...
07:26:57.110986 IP 10.10.0.2.60064 > 10.10.0.3.9000: Flags [S], seq 670582728, win 64240, ...
07:26:59.168303 IP 10.10.0.2.60064 > 10.10.0.3.9000: Flags [S], seq 670582728, win 64240, ...
```

Nothing comes back, so alpha keeps **retransmitting** the same SYN, with the same sequence number, and the gap between tries grows. Without `-w`, it keeps trying for around two minutes before giving up. The exact gaps depend on the kernel version.

| What you see | What it means |
| --- | --- |
| `Connection refused`, at once | The host is up, nothing listens on the port (or a firewall sends a reset) |
| `timed out` after a long wait | Packets are dropped somewhere: a firewall, a security group, or a wrong route |
| `No route to host` | The address cannot be reached at all, for example nothing has it on the local network |

Retransmission works the same way for data. When a data packet goes missing, the sender sees no ACK for it and sends it again. The program never sees the gap; it just sees the data arrive a little later. That is the cost of reliable delivery: delay instead of loss. Remove the rule when you are done:

```bash
root@beta:/# iptables -F
```

## Tasks

### Task 1: Count the packets

With a capture running on beta, use `echo hello | nc -N beta 9000` from alpha to send one line, as in the handshake section. Then do the same with a longer message, `seq 1 1000 | nc -N beta 9000`. For each run, count the packets in the capture and mark which ones are the handshake, which carry data and which close the connection.

<details>
<summary>Check your work</summary>

The first run gives eight packets: three for the handshake, one with data and its ACK, and three to close. The second run has the same three at the start and three at the end, with data packets and ACKs in between:

```text
... Flags [P.], seq 1:3894, ack 1, win 502, ... length 3893
... Flags [.], ack 3894, win 570, ... length 0
```

`seq 1 1000` makes 3,893 bytes. They may arrive in one packet or several, depending on how fast netcat reads them, and beta's ACK covers all of them. If the capture shows nothing, check that tcpdump is filtering on the same port the listener uses, and that you started the listener again, because `nc -l` exits after one connection.

</details>

### Task 2: Refused or dropped

On beta, start a listener on port 9000. From alpha, run `nc -zv -w 5 beta 9000` and `nc -zv -w 5 beta 9001`. Then add the DROP rule for port 9000 on beta and run both again. Write down what each of the four attempts printed and how long it took, and explain the difference. Remove the rule at the end.

<details>
<summary>Check your work</summary>

```bash
root@alpha:/# nc -zv -w 5 beta 9000
Connection to beta (10.10.0.3) 9000 port [tcp/*] succeeded!
root@alpha:/# nc -zv -w 5 beta 9001
nc: connect to beta (10.10.0.3) port 9001 (tcp) failed: Connection refused
```

After `iptables -A INPUT -p tcp --dport 9000 -j DROP` on beta, port 9000 waits the full 5 seconds and reports `timed out`, even though a listener is there. Port 9001 is still refused at once, because the rule only drops port 9000 and beta's kernel still answers with a reset. A common mistake is reading the timeout as "nothing is listening"; a timeout means the packets were not answered, not that the port is closed. Run `iptables -F` on beta to clear the rule.

</details>

## Quiz

**1. What are the three packets of the TCP handshake, and who sends each one?**

<details>
<summary>Show answer</summary>

The client sends a SYN, the server answers with SYN-ACK, and the client confirms with an ACK. After that the connection is established and data can flow in both directions.

</details>

**2. tcpdump shows `Flags [P.], seq 1:101, ack 1, length 100` from the client. What ack number do you expect the server to send back, and what does it mean?**

<details>
<summary>Show answer</summary>

`ack 101`. It means "I have received every byte before 101, send 101 next". If the client never sees that ACK, it sends the data again.

</details>

**3. On a busy client, `ss -tan` shows thousands of connections in `TIME-WAIT` to the same database. Is the network broken?**

<details>
<summary>Show answer</summary>

No. TIME_WAIT is the normal state for the side that closed first, kept for about a minute so late packets cannot be mistaken for a new connection. Thousands of them means the client opens and closes a new connection for every query. Reusing connections, with a connection pool, is the usual fix.

</details>

**4. A service on a server cannot be reached. From the client, `nc -zv -w 5 web-01 8080` waits five seconds and prints `timed out`, while `nc -zv web-01 22` succeeds at once. What is the most likely cause?**

<details>
<summary>Show answer</summary>

The host is up and reachable, because port 22 answers. Port 8080 gets no answer at all, not even a reset, so something is dropping the packets: a firewall on the server, or a cloud security group that does not allow 8080. If nothing were listening and nothing were blocking, you would see `Connection refused` straight away.

</details>

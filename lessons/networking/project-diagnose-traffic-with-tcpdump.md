When a request fails in a way no log explains, the packets are the final word. A capture shows what was actually sent and received, in what order, and how long each step took. Reading one fluently takes practice, and the best practice is a request you already understand, slowed down to one packet at a time.

In this project you capture a single HTTPS request from start to finish, then a plain HTTP one, and explain every packet in them. You use the stack from *Build a small web stack* as the server. The project draws on *tcpdump*, *DNS basics*, *TCP*, *TLS and HTTPS* and *HTTP*.

## What you need

The stack from *Build a small web stack*, running: `proxy`, `app1`, `app2` and `dns` on the `lab` network, and the client started with `--dns 10.10.0.53` and your CA trusted. If you removed it, start it again from your `stack` directory with the `docker run` commands in that project. Your certificate files are still there, so you can skip making them; you only need to repeat the setup inside the proxy (linking `shop.conf`, starting nginx and the firewall rules) and the `update-ca-certificates` step on the client.

Check the stack before you start:

```bash
root@client:/# curl https://shop.lab.internal/
Hello from app1
```

You need two shells on the client: one to capture and one to make the request. Open the second from your own computer:

```bash
$ docker exec -it client bash
root@client:/#
```

| Machine | Address |
| --- | --- |
| `client` | `10.10.0.30` |
| `proxy` (`shop.lab.internal`) | `10.10.0.10` |
| `dns` | `10.10.0.53` |

## The brief

1. Capture one HTTPS request to `https://shop.lab.internal/` into a file, `https.pcap`, with nothing in it but DNS and port 443 traffic. Check: `tcpdump -nr https.pcap` starts with a DNS query and ends with the connection's last `ACK`, about 21 packets.
2. Point to the DNS question and answer, and say which address the answer gave. Check: the answer line shows `A 10.10.0.10`.
3. Point to the three packets of the TCP handshake, and say who sent each. Check: flags `[S]`, `[S.]`, `[.]`, in that order.
4. Find the server name in the TLS ClientHello. Check: `shop.lab.internal` appears in the client's first data packet, in plain text.
5. Show that the server's certificate is not readable in the capture, and explain why. Check: a search of the server's packets for `Lab CA` finds nothing.
6. Say which packets carry the HTTP request and response, and how you know without decrypting them. Check: your answer uses direction, order and size.
7. Explain how the connection closed and which side closed first. Check: you name the packet that started the close.
8. Capture a plain HTTP request to `http://shop.lab.internal/` into `http.pcap`, and read the request and response with `-A`. Check: you can see `GET / HTTP/1.1`, the `Host` header, and the `301` with its `Location`.

## Steps

### Capture the request

In the first shell, start `tcpdump` on `eth0`, writing to a file. Filter on `port 53 or port 443` so nothing else gets in. In the second shell, make the request once. Wait two seconds, then stop the capture with <kbd>Ctrl</kbd>+<kbd>C</kbd>. If you stop it at once, the last few packets can still be in the kernel's buffer and never reach the file.

Then read the file back with `-n`, so tcpdump shows numbers rather than looking up names.

<details>
<summary>Show a solution</summary>

```bash
root@client:/# tcpdump -i eth0 -w https.pcap port 53 or port 443
tcpdump: listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
```

```bash
root@client:/# curl https://shop.lab.internal/
Hello from app2
```

```bash
^C21 packets captured
21 packets received by filter
0 packets dropped by kernel
root@client:/# tcpdump -nr https.pcap
reading from file https.pcap, link-type EN10MB (Ethernet), snapshot length 262144
07:33:52.523009 IP 10.10.0.30.38947 > 10.10.0.53.53: 63289+ AAAA? shop.lab.internal. (35)
07:33:52.523023 IP 10.10.0.30.53053 > 10.10.0.53.53: 49700+ A? shop.lab.internal. (35)
07:33:52.523455 IP 10.10.0.53.53 > 10.10.0.30.38947: 63289 0/0/0 (35)
07:33:52.523528 IP 10.10.0.53.53 > 10.10.0.30.53053: 49700* 1/0/0 A 10.10.0.10 (51)
07:33:52.524024 IP 10.10.0.30.55570 > 10.10.0.10.443: Flags [S], seq 1381001962, win 64240, options [mss 1460,sackOK,TS val 4057889983 ecr 0,nop,wscale 7], length 0
07:33:52.524132 IP 10.10.0.10.443 > 10.10.0.30.55570: Flags [S.], seq 4150853253, ack 1381001963, win 65160, options [mss 1460,sackOK,TS val 1380470283 ecr 4057889983,nop,wscale 7], length 0
07:33:52.524158 IP 10.10.0.30.55570 > 10.10.0.10.443: Flags [.], ack 1, win 502, options [nop,nop,TS val 4057889983 ecr 1380470283], length 0
07:33:52.527464 IP 10.10.0.30.55570 > 10.10.0.10.443: Flags [P.], seq 1:518, ack 1, win 502, options [nop,nop,TS val 4057889987 ecr 1380470283], length 517
07:33:52.527497 IP 10.10.0.10.443 > 10.10.0.30.55570: Flags [.], ack 518, win 506, options [nop,nop,TS val 1380470287 ecr 4057889987], length 0
07:33:52.529725 IP 10.10.0.10.443 > 10.10.0.30.55570: Flags [P.], seq 1:1375, ack 518, win 506, options [nop,nop,TS val 1380470289 ecr 4057889987], length 1374
07:33:52.529734 IP 10.10.0.30.55570 > 10.10.0.10.443: Flags [.], ack 1375, win 525, options [nop,nop,TS val 4057889989 ecr 1380470289], length 0
07:33:52.551643 IP 10.10.0.30.55570 > 10.10.0.10.443: Flags [P.], seq 518:598, ack 1375, win 525, options [nop,nop,TS val 4057890011 ecr 1380470289], length 80
07:33:52.551724 IP 10.10.0.30.55570 > 10.10.0.10.443: Flags [P.], seq 598:700, ack 1375, win 525, options [nop,nop,TS val 4057890011 ecr 1380470289], length 102
07:33:52.551830 IP 10.10.0.10.443 > 10.10.0.30.55570: Flags [P.], seq 1375:1678, ack 700, win 505, options [nop,nop,TS val 1380470311 ecr 4057890011], length 303
07:33:52.551883 IP 10.10.0.10.443 > 10.10.0.30.55570: Flags [P.], seq 1678:1981, ack 700, win 505, options [nop,nop,TS val 1380470311 ecr 4057890011], length 303
07:33:52.551950 IP 10.10.0.30.55570 > 10.10.0.10.443: Flags [.], ack 1981, win 570, options [nop,nop,TS val 4057890011 ecr 1380470311], length 0
07:33:52.553299 IP 10.10.0.10.443 > 10.10.0.30.55570: Flags [P.], seq 1981:2176, ack 700, win 505, options [nop,nop,TS val 1380470312 ecr 4057890011], length 195
07:33:52.553466 IP 10.10.0.30.55570 > 10.10.0.10.443: Flags [P.], seq 700:724, ack 2176, win 593, options [nop,nop,TS val 4057890013 ecr 1380470312], length 24
07:33:52.553563 IP 10.10.0.10.443 > 10.10.0.30.55570: Flags [F.], seq 2176, ack 724, win 505, options [nop,nop,TS val 1380470313 ecr 4057890013], length 0
07:33:52.553882 IP 10.10.0.30.55570 > 10.10.0.10.443: Flags [F.], seq 724, ack 2177, win 593, options [nop,nop,TS val 1380470313 ecr 4057890013], length 0
07:33:52.553896 IP 10.10.0.10.443 > 10.10.0.30.55570: Flags [.], ack 725, win 505, options [nop,nop,TS val 1380470313 ecr 4057890013], length 0
```

The whole request took about 31 milliseconds, from the first DNS question to the last `ACK`. Your ports, sequence numbers and times will differ. Number the lines from 1 to 21 as you read; the rest of the project refers to them that way.

</details>

### The DNS question and answer

Lines 1 to 4 are DNS, on UDP port 53. Work out what each one is from the fields tcpdump prints: the query id, the `+` and `*` markers, the question type, and the `answers/authority/additional` counts.

The client did not ask `127.0.0.11`, the address in its `/etc/resolv.conf`. Think about why the questions on `eth0` come from `10.10.0.30` and go to `10.10.0.53`.

<details>
<summary>Show a solution</summary>

| Line | Direction | Meaning |
| --- | --- | --- |
| 1 | client to dns | Question `63289`: the IPv6 address (AAAA) of `shop.lab.internal`. `+` means recursion is requested. |
| 2 | client to dns | Question `49700`: the IPv4 address (A) of the same name. |
| 3 | dns to client | Answer to `63289`: `0/0/0`, no records. The name exists but has no IPv6 address. |
| 4 | dns to client | Answer to `49700`: `1/0/0`, one answer, `A 10.10.0.10`. `*` means the answer is authoritative. |

The client asks both questions at once, because it does not know yet whether it will connect over IPv4 or IPv6. The ids let it match each answer to its question, since they can arrive in any order.

The client's programs do send their questions to `127.0.0.11`, Docker's DNS helper, but that is over the loopback, and you captured on `eth0`. The helper does not know `shop.lab.internal`, so it passes the question on to the server given with `--dns`, from inside the client's own network namespace. That is the packet you see. Capture with `-i any` and you see both legs, the loopback one and the `eth0` one.

</details>

### The TCP handshake

Lines 5 to 7 set up the connection to port 443. Name each one by its flags, and check the sequence and acknowledgement numbers: each side acknowledges the other's number plus one.

From line 8 on, tcpdump shows sequence numbers relative to the start (`seq 1:518`) instead of the full number. `seq 1:518` with `length 517` means "bytes 1 to 517 of this side's stream".

<details>
<summary>Show a solution</summary>

| Line | Flags | Meaning |
| --- | --- | --- |
| 5 | `[S]` | The client's SYN, from a random port (`55570`) to 443, with its starting sequence number `1381001962`. |
| 6 | `[S.]` | The proxy's SYN-ACK. It sends its own starting number `4150853253` and acknowledges `1381001963`, the client's plus one. |
| 7 | `[.]` | The client's ACK of the proxy's number. The connection is open. |

The handshake took about 0.13 milliseconds, which is one round trip between two containers. Across the internet it would be tens of milliseconds, and HTTPS has to pay it before TLS can even start. Both sides also agree on options in the SYNs: a maximum segment size (`mss 1460`) and window scaling (`wscale 7`).

</details>

### The TLS handshake

Line 8 is the client's first data: the TLS **ClientHello**, 517 bytes. Line 10 is the proxy's reply, 1,374 bytes. tcpdump does not decode TLS, but you can still see a lot.

Search the ClientHello for readable text with `-A`. Then look at the first bytes of each TLS packet with `-X`. Every TLS record starts with a five-byte header: a type byte (`16` handshake, `14` change cipher spec, `15` alert, `17` application data), two version bytes and two length bytes. With TCP timestamps on, the TLS data starts at offset `0x34` in the dump.

Then search the proxy's packets for the text of its certificate, such as `Lab CA`.

<details>
<summary>Show a solution</summary>

The server name is in plain text in the ClientHello. So are the protocols curl offers for after the handshake (**ALPN**):

```bash
root@client:/# tcpdump -nr https.pcap -A 'dst port 443' 2>/dev/null | grep -a -o -E 'shop.lab.internal|h2|http/1.1' | sort | uniq -c
      1 h2
      1 http/1.1
      1 shop.lab.internal
```

The name is the **SNI** (server name indication). The client sends it before any encryption exists, so the server can pick the right certificate when it hosts several names. Anyone on the path can read it, which is why a capture or a firewall can see which site you visit over HTTPS, but not what you do there.

The first bytes of the two packets, trimmed to the line where TLS starts:

```bash
root@client:/# tcpdump -nr https.pcap -X 'tcp[tcpflags] & tcp-push != 0' 2>/dev/null | less
```

```text
line 8, client to proxy, length 517
	0x0030:  5248 4e0b 1603 0102 0001 0001 fc03 03b0  RHN.............

line 10, proxy to client, length 1374
	0x0030:  f1de 7cc3 1603 0300 7a02 0000 7603 03fb  ..|.....z...v...
	...
	0x00b0:  eaa9 4114 0303 0001 0117 0303 002a 049c  ..A..........*..
	...
	0x00e0:  b164 7639 b5e9 04c5 1703 0303 3da0 cd2b  .dv9........=..+
```

- Line 8 starts `16 03 01 02 00`: a handshake record of `0x200` (512) bytes. The next byte, `01`, says it is a ClientHello.
- Line 10 starts `16 03 03 00 7a`: a handshake record of 122 bytes, and `02` says it is a **ServerHello**. It picks the TLS version and cipher and sends the proxy's half of the key exchange.
- Right after it, at `0x00b3`, is `14 03 03 00 01 01`, a change cipher spec record that TLS 1.3 sends only for compatibility with old middleboxes.
- Everything after that starts `17 03 03`: application data. From here on, the handshake itself is encrypted.

So the certificate is in this packet, but you cannot read it:

```bash
root@client:/# tcpdump -nr https.pcap -A 'src port 443' 2>/dev/null | grep -a -c -E 'Lab CA|shop.lab'
0
```

In TLS 1.3 the server encrypts its certificate, using keys from the key exchange in the ServerHello. Older TLS 1.2 sent it in the clear.

Line 12, the client's 80 bytes, starts with the same 6-byte change cipher spec, followed by the client's encrypted **Finished** message. The handshake is complete after line 12.

</details>

### The application data and the close

Every TLS packet from line 13 on starts with `17 03 03`, so the headers all look the same. Work out which is the request and which is the response from three things: which way the packet goes, where it falls in the order, and its length. As a hint, a TLS 1.3 record adds 22 bytes to what it carries: 5 for the header, 1 for the hidden content type and 16 for the integrity check.

Then look at lines 18 to 21, and decide which side ended the conversation.

<details>
<summary>Show a solution</summary>

| Line | Direction | Length | What it is |
| --- | --- | --- | --- |
| 13 | client to proxy | 102 | The HTTP request, `GET /` with its headers. 80 bytes of HTTP plus 22 of TLS. |
| 14, 15 | proxy to client | 303 each | Two session tickets. They let the client resume a later connection with a shorter handshake. |
| 16 | client to proxy | 0 | The client's ACK of the tickets. |
| 17 | proxy to client | 195 | The HTTP response: status line, headers and `Hello from app2`. |
| 18 | client to proxy | 24 | A TLS alert, **close_notify**: "I am done sending". |
| 19 | proxy to client | `[F.]` | The proxy closes its side of the TCP connection. |
| 20 | client to proxy | `[F.]` | The client closes its side. |
| 21 | proxy to client | `[.]` | The proxy acknowledges the client's FIN. Done. |

You know line 13 is the request because it is the first data the client sends after the handshake, and line 17 is the response because it is the last data from the proxy before the close. The plain HTTP capture in the next step shows the same request is exactly 80 bytes. An observer can learn a lot from sizes and timing alone, even when they cannot read a byte.

The client started the close, at the TLS layer, with the `close_notify` on line 18. nginx answered it by closing the TCP connection first (line 19), and the client followed. Each side sends its own FIN, and each is acknowledged, so a close takes three or four packets.

The proxy's time between line 13 and line 17, about 1.6 milliseconds, includes its whole trip to `app2` and back. That gap is where you look when a slow site is slow inside the server rather than on the network.

</details>

### The same request over plain HTTP

Capture again, this time on `port 53 or port 80`, into `http.pcap`, and request `http://shop.lab.internal/`. The proxy will answer with a redirect. Read the file with `-A` and a filter that keeps only packets carrying data: `'tcp[tcpflags] & tcp-push != 0'`.

<details>
<summary>Show a solution</summary>

```bash
root@client:/# tcpdump -i eth0 -w http.pcap port 53 or port 80
```

```bash
root@client:/# curl -s http://shop.lab.internal/
```

After <kbd>Ctrl</kbd>+<kbd>C</kbd>:

```bash
root@client:/# tcpdump -nr http.pcap
07:34:22.638495 IP 10.10.0.30.52549 > 10.10.0.53.53: 7341+ AAAA? shop.lab.internal. (35)
07:34:22.638608 IP 10.10.0.30.37676 > 10.10.0.53.53: 52897+ A? shop.lab.internal. (35)
07:34:22.638907 IP 10.10.0.53.53 > 10.10.0.30.52549: 7341 0/0/0 (35)
07:34:22.638994 IP 10.10.0.53.53 > 10.10.0.30.37676: 52897* 1/0/0 A 10.10.0.10 (51)
07:34:22.639515 IP 10.10.0.30.59164 > 10.10.0.10.80: Flags [S], seq 2007793817, win 64240, options [mss 1460,sackOK,TS val 4057920098 ecr 0,nop,wscale 7], length 0
07:34:22.639577 IP 10.10.0.10.80 > 10.10.0.30.59164: Flags [S.], seq 4277455047, ack 2007793818, win 65160, options [mss 1460,sackOK,TS val 1380500398 ecr 4057920098,nop,wscale 7], length 0
07:34:22.639593 IP 10.10.0.30.59164 > 10.10.0.10.80: Flags [.], ack 1, win 502, options [nop,nop,TS val 4057920098 ecr 1380500398], length 0
07:34:22.639711 IP 10.10.0.30.59164 > 10.10.0.10.80: Flags [P.], seq 1:81, ack 1, win 502, options [nop,nop,TS val 4057920099 ecr 1380500398], length 80: HTTP: GET / HTTP/1.1
07:34:22.639724 IP 10.10.0.10.80 > 10.10.0.30.59164: Flags [.], ack 81, win 509, options [nop,nop,TS val 1380500399 ecr 4057920099], length 0
07:34:22.639927 IP 10.10.0.10.80 > 10.10.0.30.59164: Flags [P.], seq 1:389, ack 81, win 509, options [nop,nop,TS val 1380500399 ecr 4057920099], length 388: HTTP: HTTP/1.1 301 Moved Permanently
07:34:22.639965 IP 10.10.0.30.59164 > 10.10.0.10.80: Flags [.], ack 389, win 501, options [nop,nop,TS val 4057920099 ecr 1380500399], length 0
07:34:22.640144 IP 10.10.0.30.59164 > 10.10.0.10.80: Flags [F.], seq 81, ack 389, win 501, options [nop,nop,TS val 4057920099 ecr 1380500399], length 0
07:34:22.640288 IP 10.10.0.10.80 > 10.10.0.30.59164: Flags [F.], seq 389, ack 82, win 509, options [nop,nop,TS val 1380500399 ecr 4057920099], length 0
07:34:22.640299 IP 10.10.0.30.59164 > 10.10.0.10.80: Flags [.], ack 390, win 501, options [nop,nop,TS val 4057920099 ecr 1380500399], length 0
```

Only 14 packets this time. The DNS and the TCP handshake are the same as before, but there is no TLS handshake, so the request goes out straight after line 7. tcpdump even names the HTTP lines for you. The client sends the first FIN, because without TLS there is no `close_notify` to ask the server to close.

The data, readable:

```bash
root@client:/# tcpdump -nr http.pcap -A 'tcp[tcpflags] & tcp-push != 0'
07:34:22.639711 IP 10.10.0.30.59164 > 10.10.0.10.80: Flags [P.], seq 2007793818:2007793898, ack 4277455048, win 502, options [nop,nop,TS val 4057920099 ecr 1380500398], length 80: HTTP: GET / HTTP/1.1
E...3[@.@...
...
...Pw..................
...cRH..GET / HTTP/1.1
Host: shop.lab.internal
User-Agent: curl/8.5.0
Accept: */*


07:34:22.639927 IP 10.10.0.10.80 > 10.10.0.30.59164: Flags [P.], seq 1:389, ack 80, win 509, options [nop,nop,TS val 1380500399 ecr 4057920099], length 388: HTTP: HTTP/1.1 301 Moved Permanently
E.....@.@.!N
...
....P......w..............
RH.....cHTTP/1.1 301 Moved Permanently
Server: nginx/1.24.0 (Ubuntu)
Date: Sun, 25 Oct 2026 07:34:22 GMT
Content-Type: text/html
Content-Length: 178
Connection: keep-alive
Location: https://shop.lab.internal/

<html>
<head><title>301 Moved Permanently</title></head>
<body>
<center><h1>301 Moved Permanently</h1></center>
<hr><center>nginx/1.24.0 (Ubuntu)</center>
</body>
</html>
```

The few lines of dots and letters before each message are the IP and TCP headers, printed as if they were text. After them, every header and the body are there for anyone on the path to read. If the request had carried a password or a session cookie, it would be just as readable. That is what the redirect to HTTPS protects against, from the second request on.

</details>

## Check it works

Both captures exist and have the expected shape:

```bash
root@client:/# tcpdump -nr https.pcap 2>/dev/null | wc -l
21
root@client:/# tcpdump -nr http.pcap 2>/dev/null | wc -l
14
```

The server name is visible in the HTTPS capture, and the certificate is not:

```bash
root@client:/# tcpdump -nr https.pcap -A 'dst port 443' 2>/dev/null | grep -a -c shop.lab.internal
1
root@client:/# tcpdump -nr https.pcap -A 'src port 443' 2>/dev/null | grep -a -c 'Lab CA'
0
```

The HTTP capture shows the request's `Host` header and the redirect's `Location` in plain text:

```bash
root@client:/# tcpdump -nr http.pcap -A 2>/dev/null | grep -a -E '^(Host|Location):'
Host: shop.lab.internal
Location: https://shop.lab.internal/
```

Your written explanation should cover, in order: the two DNS questions and the A answer; the SYN, SYN-ACK and ACK; the ClientHello with its SNI; the ServerHello and the encrypted rest of the handshake; the request, tickets and response, identified by direction and size; and the close, started by the client's `close_notify`.

## Going further

- Repeat the HTTPS capture with `curl --tls-max 1.2`, and find the certificate's `Lab CA` and `shop.lab.internal` in the proxy's packets, readable this time.
- Capture on the proxy on `port 8000` while you make an HTTPS request, and read the decrypted request nginx sends to the app, with its `X-Forwarded-For` header.
- Copy a capture to your own computer with `docker cp client:/https.pcap .` and open it in Wireshark, which decodes TLS records by name.

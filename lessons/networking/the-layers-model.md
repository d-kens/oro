So far you have met IP addresses and port numbers, and each one does a different job. Networking splits the work of sending data into **layers**, each handling one job and relying on the one below it. People talk about networks in these terms all the time: "a layer 2 problem", "a layer 4 load balancer", "it works at layer 3 but not layer 7".

This topic covers the two layer models in use, how each layer wraps the data from the one above, and which tools look at which layer. By the end you can name the layers, read the layers of a real packet in a capture, and follow a `curl` request down through them and back up.

## Why layers

Each layer solves one problem and does not care how the others solve theirs:

- Getting a frame from one machine to the next on a single network.
- Getting a packet from the original sender to the final destination, across many networks.
- Getting data to the right program on that machine, and if needed, making sure it all arrives in order.
- The conversation the programs actually want to have, such as "give me this web page".

Because of this split, a web browser does not need to know whether it is on Wi-Fi or a cable, and a switch does not need to know whether it is carrying a web page or a database query. It also gives you a method for troubleshooting: check each layer in turn, from the bottom up, and the first one that fails is where the problem is. The topic *The debugging playbook* is built on that idea.

## The OSI model

The **OSI model** has seven layers. Hardly any real software follows it exactly, but engineers use its layer numbers when they talk about networks:

| Number | Name | What it covers | Example |
| --- | --- | --- | --- |
| 7 | Application | The program's own protocol | HTTP, DNS, SSH |
| 6 | Presentation | Data formats, encryption | TLS is often put here |
| 5 | Session | Keeping a conversation going | Rarely talked about on its own |
| 4 | Transport | Ports, connections, reliability | TCP, UDP |
| 3 | Network | Addressing and routing across networks | IP, ICMP |
| 2 | Data link | Delivery on one local network | Ethernet, MAC addresses, ARP, switches |
| 1 | Physical | Signals on a wire or radio | Cables, Wi-Fi radio, fibre |

When someone says "layer 2", they mean MACs and switches. "Layer 3" means IP and routers. A "layer 4 load balancer" spreads connections by address and port without reading their content; a "layer 7 load balancer" reads the HTTP request and can route by path or header.

## The TCP/IP model

The model the internet is actually built on, the **TCP/IP model**, has four layers. It folds OSI's top three into one, and its bottom two into one:

| TCP/IP layer | OSI layers | Address it uses | Unit of data |
| --- | --- | --- | --- |
| Application | 5, 6, 7 | Names and URLs | Message |
| Transport | 4 | Port | Segment (TCP) or datagram (UDP) |
| Internet | 3 | IP address | Packet |
| Link | 1, 2 | MAC address | Frame |

The names of the units are not used strictly, and "packet" is often used for all of them. The useful point is that each layer has its own kind of address: the port picks the program, the IP address picks the machine anywhere in the world, and the MAC address picks the next machine on the local link.

## Encapsulation

When a program sends data, each layer on the way down wraps what it is given in its own header. This is **encapsulation**:

```text
                                       [ HTTP request          ]   application
                         [ TCP header | HTTP request          ]   transport
           [ IP header | TCP header | HTTP request          ]   internet
[ Ethernet | IP header | TCP header | HTTP request          ]   link
```

On the receiving machine, each layer reads and removes its own header and hands the rest up. Routers along the way only unwrap as far as the IP header: they take the packet out of the incoming frame, decide where it goes next, and put it in a new frame with new MAC addresses. The IP header and everything inside it travels unchanged from end to end.

The link layer uses its own addresses. A **MAC address** is a 48-bit hardware address, written as six pairs of hex digits like `36:c0:c2:4d:58:0c`, that identifies an interface on its local network; `ip link` shows it as `link/ether`. To send to an IP address on its own network, a machine needs the MAC address behind it, and finds it with **ARP** (Address Resolution Protocol): it broadcasts "who has `10.10.0.3`?", and the owner replies with its MAC. The answers are kept in the **neighbour table**, which `ip neigh` shows.

You can see the wrapping in a real capture. On alpha, capture one ping to beta. `-e` adds the Ethernet header to the output:

```bash
root@alpha:/# tcpdump -n -e -i eth0 icmp
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
07:29:31.662771 36:c0:c2:4d:58:0c > 8e:2c:e5:59:e6:6e, ethertype IPv4 (0x0800), length 98: 10.10.0.2 > 10.10.0.3: ICMP echo request, id 42, seq 1, length 64
07:29:31.662794 8e:2c:e5:59:e6:6e > 36:c0:c2:4d:58:0c, ethertype IPv4 (0x0800), length 98: 10.10.0.3 > 10.10.0.2: ICMP echo reply, id 42, seq 1, length 64
```

Read the first line left to right, from the outside in:

- `36:c0:… > 8e:2c:…, ethertype IPv4`: the link layer. The frame goes from alpha's MAC to beta's MAC, and the type field says an IPv4 packet is inside.
- `length 98`: the size of the whole frame.
- `10.10.0.2 > 10.10.0.3`: the internet layer, the IP header.
- `ICMP echo request … length 64`: the ICMP message inside the IP packet.

The sizes add up: a 14-byte Ethernet header, a 20-byte IP header, and 64 bytes of ICMP (8 of header and the 56 bytes of data `ping` sends by default) make 98. Ping has no transport layer: ICMP sits directly on IP, which is why ping uses no port.

## Which tools work at which layer

Each tool you use answers a question about one layer. Knowing which is which tells you what a passing or failing result actually proves.

| Layer | Question | Tools |
| --- | --- | --- |
| Link | Is the interface up? Do I know the neighbour's MAC? | `ip link`, `ip neigh`, `tcpdump -e` |
| Internet | Do I have an address? Is there a route? Do packets get there? | `ip addr`, `ip route`, `ping`, `traceroute`, `mtr` |
| Transport | Is anything listening on the port? Does a connection open? | `ss`, `nc` |
| Application | Does the service answer correctly? | `curl`, `dig`, `openssl s_client`, `ssh` |

`tcpdump` is the exception: it sees every layer at once, which is why it is the tool of last resort when the others disagree.

The table also explains a mistake from the first topic. A successful `ping` proves the link and internet layers work between two machines. It says nothing about the transport and application layers, so it cannot tell you whether a web server is running.

## A curl request through the layers

Start nginx on beta so there is a web server to talk to. It runs in the background:

```bash
root@beta:/# nginx
```

On alpha, start a capture of web traffic in one terminal, and in a second terminal on alpha (`docker exec -it alpha bash` from your computer) fetch the page. `-v` makes curl report each step, `-s` hides the progress bar, and `-o /dev/null` throws the page away:

```bash
root@alpha:/# curl -sv -o /dev/null http://beta/
* Host beta:80 was resolved.
* IPv6: (none)
* IPv4: 10.10.0.3
*   Trying 10.10.0.3:80...
* Connected to beta (10.10.0.3) port 80
> GET / HTTP/1.1
> Host: beta
> User-Agent: curl/8.5.0
> Accept: */*
> 
< HTTP/1.1 200 OK
< Server: nginx/1.24.0 (Ubuntu)
< Content-Type: text/html
< Content-Length: 615
...
```

Map each step to a layer:

1. **Application (name lookup).** `Host beta:80 was resolved` and `IPv4: 10.10.0.3`: curl asked DNS for the address. DNS is itself an application-layer protocol, covered in the *DNS basics* topic.
2. **Internet and link.** Before anything can be sent, alpha's kernel checks its routes (beta is on the local network) and its neighbour table (beta's MAC). None of this appears in curl's output, because curl does not see it.
3. **Transport.** `Trying 10.10.0.3:80` then `Connected`: a TCP connection opened to port 80. The *TCP* topic covers how.
4. **Application.** The lines starting `>` are the HTTP request curl sent, and `<` the response. The *HTTP* topic covers them.

The capture shows the same steps from the wire:

```text
07:28:11.922183 36:c0:c2:4d:58:0c > 8e:2c:e5:59:e6:6e, ethertype IPv4 (0x0800), length 74: 10.10.0.2.33344 > 10.10.0.3.80: Flags [S], seq 1540602444, win 64240, options [mss 1460,sackOK,TS val 3135746927 ecr 0,nop,wscale 7], length 0
07:28:11.922258 8e:2c:e5:59:e6:6e > 36:c0:c2:4d:58:0c, ethertype IPv4 (0x0800), length 74: 10.10.0.3.80 > 10.10.0.2.33344: Flags [S.], seq 3595354765, ack 1540602445, win 65160, options [mss 1460,sackOK,TS val 1639321436 ecr 3135746927,nop,wscale 7], length 0
07:28:11.922273 36:c0:c2:4d:58:0c > 8e:2c:e5:59:e6:6e, ethertype IPv4 (0x0800), length 66: 10.10.0.2.33344 > 10.10.0.3.80: Flags [.], ack 1, win 502, options [nop,nop,TS val 3135746927 ecr 1639321436], length 0
07:28:11.922385 36:c0:c2:4d:58:0c > 8e:2c:e5:59:e6:6e, ethertype IPv4 (0x0800), length 133: 10.10.0.2.33344 > 10.10.0.3.80: Flags [P.], seq 1:68, ack 1, win 502, options [nop,nop,TS val 3135746928 ecr 1639321436], length 67: HTTP: GET / HTTP/1.1
07:28:11.922398 8e:2c:e5:59:e6:6e > 36:c0:c2:4d:58:0c, ethertype IPv4 (0x0800), length 66: 10.10.0.3.80 > 10.10.0.2.33344: Flags [.], ack 68, win 509, options [nop,nop,TS val 1639321437 ecr 3135746928], length 0
07:28:11.922700 8e:2c:e5:59:e6:6e > 36:c0:c2:4d:58:0c, ethertype IPv4 (0x0800), length 928: 10.10.0.3.80 > 10.10.0.2.33344: Flags [P.], seq 1:863, ack 68, win 509, options [nop,nop,TS val 1639321437 ecr 3135746928], length 862: HTTP: HTTP/1.1 200 OK
```

The first three lines are the TCP connection opening, with no application data (`length 0`). The fourth carries the request: `HTTP: GET / HTTP/1.1`. Now the addresses have a third part. `10.10.0.2.33344 > 10.10.0.3.80` is IP address and port together: port 80 on beta, and a temporary port, 33344, on alpha. The *Ports and sockets* topic explains where that number comes from.

The fourth frame's 133 bytes are all four layers stacked: 14 of Ethernet, 20 of IP, 32 of TCP (20 plus 12 of options) and 67 of HTTP.

## Tasks

### Task 1: Label a ping

On alpha, capture one ping to beta with `tcpdump -n -e -i eth0 icmp`. For the echo request, write down the source and destination MAC addresses, the source and destination IP addresses, and the frame length. Say which layer each one belongs to, and explain why there is no port number.

<details>
<summary>Check your work</summary>

```text
07:29:31.662771 36:c0:c2:4d:58:0c > 8e:2c:e5:59:e6:6e, ethertype IPv4 (0x0800), length 98: 10.10.0.2 > 10.10.0.3: ICMP echo request, id 42, seq 1, length 64
```

- MACs `36:c0:c2:4d:58:0c > 8e:2c:e5:59:e6:6e`: link layer, alpha to beta.
- IPs `10.10.0.2 > 10.10.0.3`: internet layer.
- `length 98`: the whole frame, 14 + 20 + 64 bytes.

ICMP is carried directly in IP and has no transport layer, so there is no port. Your MAC addresses will differ. If the capture shows nothing, you probably started `ping` before `tcpdump` was ready; start the capture first.

</details>

### Task 2: Two destinations, two MACs

With nginx running on beta, capture web traffic on alpha with `tcpdump -n -e -i eth0 tcp port 80`. Fetch `http://beta/` with curl, then `http://example.com/`. Compare the destination MAC address of the first frame of each request. Which machine does each belong to, and why are they different when the destination IPs are both just "the server"?

<details>
<summary>Check your work</summary>

```text
07:28:11.922183 36:c0:c2:4d:58:0c > 8e:2c:e5:59:e6:6e, ethertype IPv4 (0x0800), length 74: 10.10.0.2.33344 > 10.10.0.3.80: Flags [S], ...
07:29:41.198205 36:c0:c2:4d:58:0c > c6:33:61:9e:3f:d3, ethertype IPv4 (0x0800), length 74: 10.10.0.2.46830 > 104.20.23.154.80: Flags [S], ...
```

```bash
root@alpha:/# ip neigh
10.10.0.3 dev eth0 lladdr 8e:2c:e5:59:e6:6e DELAY 
10.10.0.1 dev eth0 lladdr c6:33:61:9e:3f:d3 REACHABLE 
```

The frame to beta goes to beta's own MAC. The frame to example.com goes to `c6:33:…`, which `ip neigh` shows is the gateway, `10.10.0.1`. The IP destination is the real server in both cases, but the link layer only ever reaches the next machine on the local network. The example.com address and the states in `ip neigh` may differ for you. A common mistake is to expect example.com's MAC address to appear somewhere; alpha never learns it.

</details>

## Quiz

**1. Name the four layers of the TCP/IP model and the kind of address each one uses.**

<details>
<summary>Show answer</summary>

Link (MAC address), internet (IP address), transport (port), and application (names and URLs, such as `example.com` or a path like `/index.html`).

</details>

**2. A packet crosses three routers on its way from a laptop to a web server. Which of its headers are rewritten at each router, and which arrive unchanged?**

<details>
<summary>Show answer</summary>

The link-layer header, with its MAC addresses, is replaced at every router, because each hop is a different local network. The IP header's addresses, the TCP header and the HTTP data arrive unchanged. (Routers do lower a counter in the IP header called the TTL, which the *Routing and gateways* topic covers, and NAT, where used, rewrites addresses.)

</details>

**3. What is the difference between a layer 4 and a layer 7 load balancer?**

<details>
<summary>Show answer</summary>

A layer 4 load balancer works with IP addresses and ports: it passes whole connections to a backend without reading what is inside them. A layer 7 load balancer reads the application protocol, usually HTTP, so it can route by host name, path or header, and can add headers or end TLS itself.

</details>

**4. From an application server, `ping db-01` works, but the application cannot connect to the database. A colleague says "the network is fine, so it must be the database". Which layers has the ping actually proved, and what would you check next?**

<details>
<summary>Show answer</summary>

The ping proves the name resolves and the link and internet layers work between the two machines. It proves nothing about the transport layer: whether the database is listening on its port, on which address, and whether a firewall allows that port. Check next whether a TCP connection opens to the database port, for example with `nc -zv db-01 5432`, and on db-01 whether anything is listening with `ss -tlnp`. Only then move up to the application layer, such as credentials and database settings.

</details>

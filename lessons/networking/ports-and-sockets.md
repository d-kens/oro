An IP address gets a packet to the right machine. But a server might run a web server, an SSH server and a database all at once, and each packet has to reach the right one. That is what port numbers are for. A large share of "cannot connect" problems come down to the port: nothing is listening on it, something is listening on the wrong address, or something in between is blocking it.

This topic covers ports, sockets, and how to see what a machine is listening on and connected to. By the end you can read the output of `ss`, explain why a service bound to `127.0.0.1` cannot be reached from another machine, and tell a refused connection from one that timed out.

## Ports

A **port** is a 16-bit number, from 0 to 65535, that identifies one program's endpoint on a machine. A server program asks the kernel for a port and **listens** on it. A client connects to the server's IP address and that port. TCP and UDP have separate sets of ports, so TCP port 53 and UDP port 53 are different things, though DNS happens to use both.

Ports below 1024 are **well-known ports**, assigned to standard services. On Linux, only root (or a program given the right capability) may listen on them. Some you will see constantly:

| Port | Protocol | Service |
| --- | --- | --- |
| 22 | TCP | SSH |
| 53 | UDP and TCP | DNS |
| 80 | TCP | HTTP |
| 443 | TCP (and UDP for HTTP/3) | HTTPS |
| 3306 | TCP | MySQL |
| 5432 | TCP | PostgreSQL |
| 6379 | TCP | Redis |
| 8080, 8000 | TCP | Common choices for test servers and applications |

These are conventions, not rules. A web server will run on port 9000 if you tell it to, and the client just has to know. Linux keeps a list of standard names in `/etc/services`, which is how tools turn `80` into `http` in their output:

```bash
root@alpha:/# grep -w -e ^http -e ^https -e ^ssh /etc/services
ssh		22/tcp				# SSH Remote Login Protocol
http		80/tcp		www		# WorldWideWeb HTTP
https		443/tcp				# http protocol over TLS/SSL
https		443/udp				# HTTP/3
http-alt	8080/tcp	webcache	# WWW caching service
```

## Sockets

A **socket** is the kernel's object for one end of network communication: a protocol, an IP address and a port. A program opens a socket and the kernel delivers matching packets to it.

There are two kinds you will look at:

- A **listening socket** waits for new connections, for example nginx on `0.0.0.0:80`.
- A **connected socket** is one end of a specific conversation. A TCP connection is identified by four things together: source address, source port, destination address and destination port.

That four-part identity is why one web server on port 80 can talk to thousands of clients at once. Every connection has the same destination, but a different source address, a different source port, or both.

## Seeing what is listening

`ss` (socket statistics) lists sockets. The options you will use most are `-t` for TCP, `-u` for UDP, `-l` for listening only, `-n` for numbers instead of names, and `-p` for the process that owns each socket.

Start nginx on beta if it is not already running, then list what is listening:

```bash
root@beta:/# nginx
root@beta:/# ss -tlnp
State  Recv-Q Send-Q Local Address:Port  Peer Address:PortProcess                       
LISTEN 0      511          0.0.0.0:80         0.0.0.0:*    users:(("nginx",pid=53,fd=5))
LISTEN 0      4096      127.0.0.11:34461      0.0.0.0:*                                 
LISTEN 0      511             [::]:80            [::]:*    users:(("nginx",pid=53,fd=6))
```

- `Local Address:Port` is what the program listens on. `0.0.0.0:80` means port 80 on every IPv4 address the machine has. `[::]:80` is the same for IPv6.
- `Peer Address:Port` is `*` because a listening socket is not connected to anyone yet.
- `Process` names the program and its process ID. You need to be root to see other users' processes here.
- `Send-Q` on a listening socket is how many new connections may queue up waiting to be accepted.
- The socket on `127.0.0.11` with a random port and no process name belongs to Docker's built-in DNS server. You will see it in every lab container; ignore it.

When a service is meant to be running and you cannot connect, `ss -tlnp` on the server is the first check. If the port is not in the list, the problem is the service, not the network. You can narrow it to one port with a filter:

```bash
root@beta:/# ss -tlnp 'sport = :80'
```

## Binding to 127.0.0.1 or 0.0.0.0

When a program listens, it chooses which address to **bind** to, and that decides who can reach it:

| Bound to | Reachable from |
| --- | --- |
| `127.0.0.1` | Only programs on the same machine |
| One address, such as `10.10.0.3` | Anything that can reach that address |
| `0.0.0.0` (or `[::]` for IPv6) | Anything that can reach any of the machine's addresses |

Python's built-in web server lets you choose with `--bind`, which makes the difference easy to see. On beta, serve the `/tmp` directory on port 8000, bound to the loopback:

```bash
root@beta:/# cd /tmp
root@beta:/tmp# python3 -m http.server 8000 --bind 127.0.0.1
Serving HTTP on 127.0.0.1 port 8000 (http://127.0.0.1:8000/) ...
```

It keeps running in that terminal. In a second terminal on beta (`docker exec -it beta bash` from your computer), it works locally, and `ss` shows the binding:

```bash
root@beta:/# curl -sI http://127.0.0.1:8000/ | head -1
HTTP/1.0 200 OK
root@beta:/# ss -tlnp 'sport = :8000'
State  Recv-Q Send-Q Local Address:Port Peer Address:PortProcess
LISTEN 0      5          127.0.0.1:8000      0.0.0.0:*    users:(("python3",pid=70,fd=3))
```

From alpha, it cannot be reached at all:

```bash
root@alpha:/# curl http://beta:8000/
curl: (7) Failed to connect to beta port 8000 after 0 ms: Couldn't connect to server
```

Stop the server with <kbd>Ctrl</kbd>+<kbd>C</kbd> and start it again bound to every address:

```bash
root@beta:/tmp# python3 -m http.server 8000 --bind 0.0.0.0
Serving HTTP on 0.0.0.0 port 8000 (http://0.0.0.0:8000/) ...
```

Now alpha gets an answer, and the server logs the request with alpha's address:

```bash
root@alpha:/# curl -s -o /dev/null -w "%{http_code}\n" http://beta:8000/
200
```

```text
10.10.0.2 - - [25/Oct/2026 07:28:27] "GET / HTTP/1.1" 200 -
```

Binding to `127.0.0.1` is a deliberate safety choice for things that should never be reached from outside, such as a local database used only by an application on the same server or an admin page. It is also a very common cause of "it works on the server but not from anywhere else". Many tools and frameworks bind to `127.0.0.1` by default for safety, so a service that has just been moved to a server or a container often needs its bind address changed.

Only one program can listen on a given address and port. Try to start a second server on port 8000 while the first is running, and you get:

```text
OSError: [Errno 98] Address already in use
```

`ss -tlnp 'sport = :8000'` then tells you which process already has it.

## Ephemeral ports and connections

The server's port is fixed and known. The client's port is not: when a client connects, the kernel picks a free **ephemeral port** for its end from a range set aside for that:

```bash
root@alpha:/# cat /proc/sys/net/ipv4/ip_local_port_range
32768	60999
```

To see connections, drop `-l`. Hold two connections open from alpha to beta with `nc`, which the *Netcat* topic covers. `&` runs each in the background:

```bash
root@alpha:/# sleep 60 | nc beta 80 &
[1] 296
root@alpha:/# sleep 60 | nc beta 8000 &
[2] 304
root@alpha:/# ss -tunap
Netid State     Recv-Q Send-Q Local Address:Port  Peer Address:PortProcess                     
udp   UNCONN    0      0         127.0.0.11:40033      0.0.0.0:*                               
tcp   LISTEN    0      4096      127.0.0.11:44581      0.0.0.0:*                               
tcp   ESTAB     0      0          10.10.0.2:40392    10.10.0.3:80   users:(("nc",pid=296,fd=3))
tcp   ESTAB     0      0          10.10.0.2:52800    10.10.0.3:8000 users:(("nc",pid=304,fd=3))
tcp   TIME-WAIT 0      0          10.10.0.2:33344    10.10.0.3:80                              
```

`-a` shows all sockets and `-u` adds UDP. The `ESTAB` lines are open connections: alpha's end uses ephemeral ports 40392 and 52800, and beta's end uses the server ports 80 and 8000. `TIME-WAIT` is a connection that has just closed, from an earlier curl, which the kernel keeps for a short while; the *TCP* topic explains why. The two lines on `127.0.0.11` are Docker's DNS again.

On beta, the same connections appear the other way round:

```bash
root@beta:/# ss -tn
State Recv-Q Send-Q Local Address:Port Peer Address:Port Process
ESTAB 0      0          10.10.0.3:80      10.10.0.2:40392       
ESTAB 0      0          10.10.0.3:8000    10.10.0.2:52800       
```

When you see many connections from one client to one server, the ephemeral port is what tells them apart.

## Refused or timed out

When a connection fails, how it fails tells you a lot. There are two common ways.

**Connection refused** comes back at once. The packet reached the machine, nothing was listening on that port, and the kernel answered with a TCP reset. Port 9000 on beta has nothing on it:

```bash
root@alpha:/# nc -zv -w 3 beta 9000
nc: connect to beta (10.10.0.3) port 9000 (tcp) failed: Connection refused
root@alpha:/# curl -sv http://beta:9000/ 2>&1 | grep refused
* connect to 10.10.0.3 port 9000 from 10.10.0.2 port 53860 failed: Connection refused
```

`-z` tells `nc` to only test the connection and `-v` makes it report the result. curl only says `Couldn't connect to server` unless you ask for `-v`.

A **timeout** takes as long as the client is willing to wait. The packets went out and nothing came back at all. Usually a firewall dropped them silently, or the address leads nowhere. To see one, block port 8000 on beta with a firewall rule; the *Firewall basics* topic explains the command:

```bash
root@beta:/# iptables -A INPUT -p tcp --dport 8000 -j DROP
```

```bash
root@alpha:/# curl --connect-timeout 5 http://beta:8000/
curl: (28) Failed to connect to beta port 8000 after 5004 ms: Timeout was reached
root@alpha:/# nc -zv -w 3 beta 8000
nc: connect to beta (10.10.0.3) port 8000 (tcp) timed out: Operation now in progress
```

The server is running and listening, exactly as before, but alpha cannot tell. Remove the rule with `iptables -F` on beta.

| Result | What happened | Where to look |
| --- | --- | --- |
| Refused, instantly | Reached the machine, nothing listening on that port | The service: is it running, on which port and address? |
| Timed out | No reply at all | Firewalls and security groups, routing, whether the host is up |
| Works locally, refused from elsewhere | Bound to `127.0.0.1` | The service's bind address |

A refused connection is in a way good news: the network path works all the way to the machine. A timeout means something between the two is swallowing packets.

## Tasks

### Task 1: The local-only service

On beta, start `python3 -m http.server 8080 --bind 127.0.0.1` in `/tmp`. From alpha, try to fetch `http://beta:8080/`. Using only `ss` on beta, show why it fails. Then fix it so alpha gets a `200`.

<details>
<summary>Check your work</summary>

```bash
root@alpha:/# curl http://beta:8080/
curl: (7) Failed to connect to beta port 8080 after 0 ms: Couldn't connect to server
root@beta:/# ss -tlnp 'sport = :8080'
State  Recv-Q Send-Q Local Address:Port Peer Address:PortProcess
LISTEN 0      5          127.0.0.1:8080      0.0.0.0:*    users:(("python3",pid=239,fd=3))
```

The local address is `127.0.0.1`, so only beta itself can connect. Stop the server and start it with `--bind 0.0.0.0`, then:

```bash
root@alpha:/# curl -s -o /dev/null -w "%{http_code}\n" http://beta:8080/
200
```

The error from alpha is a refusal, which tells you the packet reached beta: there was simply nothing listening on beta's `10.10.0.3`. If you get `Address already in use` when restarting, the first server is still running; stop it with <kbd>Ctrl</kbd>+<kbd>C</kbd> first. Your process ID will differ.

</details>

### Task 2: Both ends of a connection

With nginx running on beta, open a connection from alpha that stays open: `sleep 60 | nc beta 80 &`. Find the connection with `ss` on both machines. Write down the four parts that identify it, and say which port was chosen by the kernel.

<details>
<summary>Check your work</summary>

```bash
root@alpha:/# sleep 60 | nc beta 80 &
[1] 296
root@alpha:/# ss -tnp
State Recv-Q Send-Q Local Address:Port  Peer Address:PortProcess
ESTAB 0      0          10.10.0.2:40392    10.10.0.3:80   users:(("nc",pid=296,fd=3))
root@beta:/# ss -tn
State Recv-Q Send-Q Local Address:Port Peer Address:Port Process
ESTAB 0      0          10.10.0.3:80      10.10.0.2:40392       
```

The connection is `10.10.0.2`, port `40392`, to `10.10.0.3`, port `80`. Port 80 was chosen by whoever configured nginx; port 40392 was picked by alpha's kernel from the ephemeral range, and yours will differ. On beta the same four values appear with local and peer swapped. If `ss` on alpha shows nothing, the 60 seconds may have run out; start it again.

</details>

## Quiz

**1. What is the difference between a listening socket on `0.0.0.0:5432` and one on `127.0.0.1:5432`?**

<details>
<summary>Show answer</summary>

`0.0.0.0:5432` accepts connections on port 5432 arriving at any of the machine's IPv4 addresses, so other machines can connect. `127.0.0.1:5432` accepts only connections from the machine itself, over the loopback.

</details>

**2. How can one nginx process on port 80 keep thousands of connections apart?**

<details>
<summary>Show answer</summary>

Each TCP connection is identified by source address, source port, destination address and destination port together. The destination is the same for all of them, but every client has a different address or ephemeral source port, so every connection is unique.

</details>

**3. Why would a program fail to start with `Address already in use`, and how do you find the cause?**

<details>
<summary>Show answer</summary>

Another socket is already listening on that address and port, often an earlier copy of the same program that is still running. `ss -tlnp 'sport = :PORT'` shows which process has it.

</details>

**4. A web service on a server cannot be reached from your laptop. From the laptop, `nc -zv web-01 8080` waits about 10 seconds and then reports a timeout. On web-01, `ss -tlnp` shows `0.0.0.0:8080` owned by the application. Where is the problem most likely to be?**

<details>
<summary>Show answer</summary>

Between the laptop and the server, not in the application. The service is listening on all addresses, so if packets arrived it would accept them, or at worst the kernel would refuse. A timeout means no reply came back at all, which usually means a firewall, a cloud security group or a network rule is dropping traffic to port 8080. Check the firewall on web-01 and any filtering in front of it.

</details>

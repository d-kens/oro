Many problem reports come down to one machine not reaching another: the site is down, the app cannot reach its database, a download hangs. To answer them you check the pieces in order. Does the name turn into an address? Can you reach that address? Is a program listening on the port? Does it answer?

By the end you can read a machine's IP addresses, explain what a port is, look up a name with `dig`, and check a connection with `ping`, `curl` and `ss`.

## Install the tools

The Docker Ubuntu image has none of the network tools. Install them; the *Installing software* topic explains these commands.

```bash
$ apt update && apt install -y iproute2 iputils-ping dnsutils curl
```

`iproute2` gives you `ip` and `ss`, `iputils-ping` gives `ping`, and `dnsutils` gives `dig`. On a normal Ubuntu server most of them are already there.

## IP addresses

Every machine on a network has an **IP address**. An IPv4 address is four numbers from 0 to 255, such as `192.0.2.10`. A newer, longer form, IPv6, looks like `2001:db8::10`; you will see both.

`ip addr` lists the machine's network interfaces and their addresses. `-br` gives a short version:

```bash
$ ip -br addr
lo               UNKNOWN        127.0.0.1/8 ::1/128
eth0@if118       UP             172.17.0.4/16
```

- `lo` is the **loopback** interface. `127.0.0.1`, also called `localhost`, always means *this machine*. Traffic to it never leaves the machine.
- `eth0` is the container's network card, with the address `172.17.0.4`. The `/16` says how much of the address names the network; machines on the same network share that part.

You may see extra interfaces marked `DOWN`; they are unused and you can ignore them. Some address ranges are **private**: they are used inside networks, and cannot be reached directly from the internet.

| Range | Where you see it |
| --- | --- |
| `10.0.0.0/8` | Company and cloud networks |
| `172.16.0.0/12` | Cloud networks, and Docker (`172.17.x.x`) |
| `192.168.0.0/16` | Home and office networks |
| `127.0.0.0/8` | Loopback, this machine only |

`ip route` shows where traffic goes. The `default` line names the **gateway**, the router that traffic for every other network is sent to:

```bash
$ ip route
default via 172.17.0.1 dev eth0
172.17.0.0/16 dev eth0 proto kernel scope link src 172.17.0.4
```

## Ports

An IP address gets traffic to a machine. A **port**, a number from 1 to 65535, picks which program on that machine receives it. A web server **listens** on a port and waits for connections. Some ports are standard:

| Port | Service |
| --- | --- |
| 22 | SSH, for logging in to servers |
| 53 | DNS |
| 80 | HTTP, plain web traffic |
| 443 | HTTPS, encrypted web traffic |
| 3306 | MySQL |
| 5432 | PostgreSQL |

`/etc/services` lists many more. Most traffic uses **TCP**, which sets up a connection and makes sure everything arrives. DNS mostly uses **UDP**, which sends single messages without a connection.

`ss` shows the machine's sockets. `-tlnp` means TCP, listening, numeric ports, and the process behind each one:

```bash
$ ss -tlnp
State  Recv-Q Send-Q Local Address:Port Peer Address:Port Process
LISTEN 0      5            0.0.0.0:8080      0.0.0.0:*    users:(("python3",pid=2984,fd=3))
```

The local address says who can connect:

- `0.0.0.0:8080` listens on every interface, so other machines can connect, if no firewall is in the way.
- `127.0.0.1:8080` listens on loopback only, so only programs on the same machine can connect.

Run `ss -tlnp` with `sudo` on a real server, or the process column stays empty for programs you do not own.

## DNS

People use names; networks use addresses. **DNS**, the *Domain Name System*, turns names such as `example.com` into addresses. The machine asks the server named in `/etc/resolv.conf`, after first checking its own list in `/etc/hosts`.

`dig` asks DNS directly and shows the answer:

```bash
$ dig example.com

; <<>> DiG 9.18.39-0ubuntu0.24.04.8-Ubuntu <<>> example.com
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 62093
;; flags: qr rd ra; QUERY: 1, ANSWER: 2, AUTHORITY: 0, ADDITIONAL: 0

;; QUESTION SECTION:
;example.com.			IN	A

;; ANSWER SECTION:
example.com.		183	IN	A	104.20.23.154
example.com.		183	IN	A	172.66.147.243

;; Query time: 5 msec
;; SERVER: 192.168.65.7#53(192.168.65.7) (UDP)
```

The parts to read are the `status`, the `ANSWER SECTION` and the `SERVER` that answered. The `183` is the **TTL**, how many seconds the answer may be cached. A name can have several addresses, as here. Your addresses may differ. For the answer alone, add `+short`:

```bash
$ dig +short example.com
104.20.23.154
172.66.147.243
```

A name that does not exist gets `status: NXDOMAIN` and no answer. DNS holds several kinds of **record**; ask for one with, for example, `dig example.com AAAA`.

| Record | Holds |
| --- | --- |
| `A` | An IPv4 address |
| `AAAA` | An IPv6 address |
| `CNAME` | Another name that this one is an alias for |
| `MX` | The mail servers for the domain |

## Checking a connection

`ping` sends small test packets and times the replies. `-c 3` stops after three:

```bash
$ ping -c 3 example.com
PING example.com (104.20.23.154) 56(84) bytes of data.
64 bytes from 104.20.23.154: icmp_seq=1 ttl=63 time=41.2 ms
64 bytes from 104.20.23.154: icmp_seq=2 ttl=63 time=40.8 ms
64 bytes from 104.20.23.154: icmp_seq=3 ttl=63 time=49.9 ms

--- example.com ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2009ms
rtt min/avg/max/mdev = 40.830/43.994/49.912/4.170 ms
```

Replies prove the host is reachable, and `time` shows how long a round trip takes. No reply proves less: many servers and cloud firewalls block ping, while their web server works fine.

`curl` makes a real request, usually over HTTP, so it tests the service and not only the machine. `-I` asks for the headers only, and the first line is the status:

```bash
$ curl -I https://example.com
HTTP/2 200
content-type: text/html; charset=utf-8
...
```

To print only the status code, which is handy in scripts:

```bash
$ curl -s -o /dev/null -w "%{http_code}\n" https://example.com
200
```

`-s` hides the progress meter, `-o /dev/null` throws the page away, and `-w` prints the code. `200` means OK and `404` means not found.

When `curl` fails, its error tells you which step broke:

| Error | What it means | Check next |
| --- | --- | --- |
| `curl: (6) Could not resolve host` | DNS gave no address for the name | `dig` the name; check spelling |
| `curl: (7) Failed to connect ... Couldn't connect to server` | The machine answered, but nothing is listening on that port | `ss -tlnp` on the server; is the service running? |
| `curl: (28) ... Timeout was reached` | No answer at all | A firewall, a wrong address, or the host is down |

`--connect-timeout 5` stops `curl` waiting longer than five seconds for a connection.

## Tasks

Do these in your Linux shell, with the tools above installed.

### Task 1: Run a web server and check it

Install Python with `apt install -y python3`. Make a directory `site` with a file `index.html` that says `hello from lab`, go into it, and start a small web server in the background with `python3 -m http.server 8080 &`. Use `ss` to show it listening, fetch the page with `curl`, and get the status code for a page that does not exist. Then stop the server and run `curl` again. What error do you get, and what does it tell you?

<details>
<summary>Check your work</summary>

```bash
$ apt install -y python3
$ mkdir site && echo "hello from lab" > site/index.html
$ cd site
$ python3 -m http.server 8080 &
[1] 2984
Serving HTTP on 0.0.0.0 port 8080 (http://0.0.0.0:8080/) ...
$ ss -tlnp
State  Recv-Q Send-Q Local Address:Port Peer Address:Port Process
LISTEN 0      5            0.0.0.0:8080      0.0.0.0:*    users:(("python3",pid=2984,fd=3))
$ curl http://localhost:8080/index.html
127.0.0.1 - - [24/Oct/2026 11:30:51] "GET /index.html HTTP/1.1" 200 -
hello from lab
$ curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/missing.html
127.0.0.1 - - [24/Oct/2026 11:30:52] code 404, message File not found
127.0.0.1 - - [24/Oct/2026 11:30:52] "GET /missing.html HTTP/1.1" 404 -
404
$ kill %1
$ curl http://localhost:8080/index.html
curl: (7) Failed to connect to localhost port 8080 after 0 ms: Couldn't connect to server
```

The lines starting `127.0.0.1 - -` are the server's own log, printed to your terminal because it runs in the background of the same shell. Error 7 means the machine was reached but nothing listens on port 8080 any more. That is what you see on a server when the service has stopped.

</details>

### Task 2: Find which step fails

For each of these, run `curl` and decide which step failed: the name, the connection, or nothing.

1. `https://example.com`
2. `https://nosuch.example.com`
3. `http://192.0.2.10`, with `--connect-timeout 3`

Confirm the first two with `dig +short`.

<details>
<summary>Check your work</summary>

```bash
$ curl -s -o /dev/null -w "%{http_code}\n" https://example.com
200
$ curl https://nosuch.example.com
curl: (6) Could not resolve host: nosuch.example.com
$ dig +short nosuch.example.com
$ curl --connect-timeout 3 http://192.0.2.10
curl: (28) Failed to connect to 192.0.2.10 port 80 after 3006 ms: Timeout was reached
```

The first works. The second fails at DNS: `dig +short` prints nothing because the name has no address. The third has an address, so DNS is not involved, but nothing answers. `192.0.2.x` is reserved for documentation, so no machine uses it, just as a server behind a firewall that drops your traffic would look. Without `--connect-timeout`, `curl` waits much longer before it gives up.

</details>

## Quiz

**1. You are on web-01. `curl http://localhost:8080` works there, but from another machine the connection is refused. `ss -tlnp` shows `127.0.0.1:8080`. Why?**

<details>
<summary>Show answer</summary>

The application listens on loopback only, so only programs on web-01 itself can connect. It has to be configured to listen on `0.0.0.0`, or on the machine's own address, before other machines can reach it.

</details>

**2. A script fails with `curl: (6) Could not resolve host: api.example.com`. Which part is broken, and which command do you run next?**

<details>
<summary>Show answer</summary>

DNS: the name did not turn into an address. Run `dig api.example.com` to see the status and answer, and check the name is spelled correctly. The server behind the name may be fine.

</details>

**3. `ping db-01` gets no replies, but the application on web-01 talks to the database on db-01 without trouble. How can both be true?**

<details>
<summary>Show answer</summary>

A firewall is blocking ping but allowing the database port. No reply to `ping` does not prove a host is down. Test the real service instead, for example with `curl` or by checking the port.

</details>

**4. What is the difference between an IP address and a port?**

<details>
<summary>Show answer</summary>

The IP address picks the machine. The port picks the program on that machine, for example 22 for SSH or 443 for HTTPS. A connection needs both, written as `192.0.2.10:443`.

</details>

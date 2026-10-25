"I can't reach the service" is the most common networking problem you will be handed. It could be a stopped process, a wrong port, a name that points somewhere else, a missing route or a firewall rule, and guessing between them wastes time. The cure is to check the steps in order, from the service outward, so that each check rules out a layer before you move on.

This topic puts the tools from the whole skill into one checklist. By the end you can work through it to find where a connection stops, recognise the common error messages and what usually causes them, and find two faults in a broken lab.

## The setup

The examples use the lab with all three machines. Beta runs a small application, alpha runs nginx in front of it as in the *Reverse proxy and load balancing* topic, and gamma plays the user.

```bash
root@beta:/# mkdir -p /srv/app && cd /srv/app && echo 'Hello from beta' > index.html
root@beta:/srv/app# python3 -m http.server 8000 > /dev/null 2>&1 &
```

On alpha, remove the default site, put this in `/etc/nginx/conf.d/app.conf`, and start nginx with `nginx`:

```text
server {
    listen 80;

    location / {
        proxy_pass http://beta:8000;
    }
}
```

```bash
root@gamma:/# curl alpha
Hello from beta
```

When it works, a request from gamma passes through two connections: gamma to alpha on port 80, and alpha to beta on port 8000. The checklist applies to each one.

## The checklist

Start on the machine that runs the service, and move outward towards the client. Stop at the first step that fails: that is where to dig.

**1. Is it running?** On the server, look for the process.

```bash
root@beta:/# pgrep -a python3
442 python3 -m http.server 8000
```

Pass: the process is there. Fail: nothing printed. Start it, and read its logs to find out why it stopped. On a server with systemd, `systemctl status name` and `journalctl -u name` answer this step, as in the *Services with systemd* topic of the Linux skill.

**2. Is it listening, and on which address and port?**

```bash
root@beta:/# ss -tlnp | grep python3
LISTEN 0      5            0.0.0.0:8000       0.0.0.0:*    users:(("python3",pid=442,fd=3))
```

Pass: a `LISTEN` line on the port you expect, on `0.0.0.0` (every address) or the address clients use. Fail: no line, a different port, or `127.0.0.1`, which only the machine itself can reach.

**3. Can I reach it locally?**

```bash
root@beta:/# curl -s localhost:8000
Hello from beta
```

Pass: the expected answer. Fail: an error or a wrong answer here is a problem in the application, not the network. Fix that before looking further out.

**4. Does the name resolve, to the right address?** Now move to the client, here alpha.

```bash
root@alpha:/# getent hosts beta
10.10.0.3       beta
```

Pass: the address you expect. `getent` uses the same lookup as most programs, including `/etc/hosts`; `dig` from the *DNS basics* topic asks the DNS server directly. Fail: no output, or an address that is not the server's, perhaps from an old `/etc/hosts` line or a stale DNS record.

**5. Is there a route?**

```bash
root@alpha:/# ip route get 10.10.0.3
10.10.0.3 dev eth0 src 10.10.0.2 uid 0
    cache
root@alpha:/# ping -c 2 beta
64 bytes from beta.lab (10.10.0.3): icmp_seq=1 ttl=64 time=0.026 ms
64 bytes from beta.lab (10.10.0.3): icmp_seq=2 ttl=64 time=0.266 ms
```

Pass: `ip route get` names a sensible interface and gateway, and ping gets replies. Fail: `Network is unreachable`, a route through an unexpected gateway, or `Destination Host Unreachable`. Note that a failed ping alone proves little, because many networks block ping. For a longer path, `traceroute` or `mtr` shows where packets stop.

**6. Does a firewall drop it?** Test the actual port from the client:

```bash
root@alpha:/# nc -zv -w 3 beta 8000
Connection to beta (10.10.0.3) 8000 port [tcp/*] succeeded!
```

Pass: `succeeded`. Fail: `timed out` means the packets vanish, nearly always a firewall dropping them, on the server (`iptables -L INPUT -n -v` and watch the counters), in between, or in a cloud security group. `Connection refused` means the server's kernel answered that nothing listens there: go back to step 2.

**7. Does the application answer correctly?**

```bash
root@alpha:/# curl -i http://beta:8000/
HTTP/1.0 200 OK
Server: SimpleHTTP/0.6 Python/3.12.3
...

Hello from beta
```

Pass: the status code and body you expect. Fail: a `4xx` or `5xx` status, a redirect loop, or the wrong content. These are application and configuration problems; the logs on the server, and on any proxy in between, tell you why.

Each step has a command that is quick to run, so going through all seven takes a couple of minutes. It is almost always faster than jumping to the step you suspect.

## Reading the error message

The exact words of an error point at a layer. These are the common ones, as curl and nc show them; `curl -v` prints the underlying reason when curl's own summary is vague.

| What you see | What it means | Likely causes |
| --- | --- | --- |
| `Could not resolve host: web-01` | The name lookup failed | Typo in the name, missing DNS record, wrong DNS server in `/etc/resolv.conf` |
| `Connection refused` | The host answered: nothing listens on that port | Service stopped, listening on another port, or bound to `127.0.0.1`; a firewall rule that rejects with a reset |
| `Connection timed out` | No answer at all | Firewall or security group dropping packets, host down, reply going missing on the way back |
| `No route to host` | The host could not be reached at the network level | Address not in use on the local network, wrong route or gateway, a firewall rejecting with an ICMP error |
| `Network is unreachable` | No route matches the destination | Missing default gateway or route |
| `SSL certificate problem: self-signed certificate` | TLS could not verify the server | Certificate not signed by a trusted authority, wrong name on it, expired, missing intermediate |
| `wrong version number` (TLS) | Something other than TLS answered | `https://` sent to a plain HTTP port |
| `502 Bad Gateway` | A proxy could not get an answer from its backend | Backend down, wrong backend port or address, backend unreachable from the proxy |
| `504 Gateway Timeout` | A proxy connected, but the backend took too long | Slow application, stuck backend, backend behind a dropping firewall |

The difference between **refused** and **timed out** is the most useful one in the table. Refused comes back at once and proves the path to the host works. Timed out takes as long as your timeout, and says only that nothing came back.

`502` and `504` come from the proxy, not the application. The user sees the proxy's error, so the first place to look is the proxy's error log, which names the backend it tried and why it failed:

```text
2026/10/25 07:32:17 [error] 394#394: *74 upstream timed out (110: Connection timed out) while reading response header from upstream, client: 127.0.0.1, server: , request: "GET / HTTP/1.1", upstream: "http://10.10.0.3:8001/", host: "localhost:8080"
```

Then run the checklist again from the proxy to that backend. Behind a proxy there are two connections, and the fault can be on either.

## When the checklist passes

Sometimes every step passes and users still complain. Then compare the conditions you tested with theirs:

- **Where are you testing from?** A rule that allows alpha can still block the user's network. Run the checks from the same place as the failing client, or as close to it as you can get.
- **Same name, same address?** The user's machine may resolve the name differently, for example a public address outside and a private one inside.
- **IPv4 or IPv6?** `localhost` and many names resolve to both. A service or firewall rule that covers only one behaves differently for clients that use the other.
- **Every time, or sometimes?** Intermittent failures behind a load balancer often mean one bad backend among several. Send many requests and count, or check each backend directly.

When you still cannot see it, capture the traffic with tcpdump, as in the *tcpdump* topic, on both ends. The packets show exactly what arrived and what was answered.

## Tasks

Both tasks start from the working setup above. Each one breaks the lab with commands hidden in a block. Run them without reading them closely, or ask someone else to run them, then find the fault with the checklist.

### Task 1: The page is gone

<details>
<summary>Show the commands that break it</summary>

```bash
root@beta:/srv/app# kill %1
root@beta:/srv/app# python3 -m http.server 8080 > /dev/null 2>&1 &
```

</details>

From gamma, `curl -i alpha` now returns an error. Use the checklist and the error message to find what is wrong and which machine it is on, and fix it at its source.

<details>
<summary>Check your work</summary>

```bash
root@gamma:/# curl -si alpha | head -1
HTTP/1.1 502 Bad Gateway
root@alpha:/# tail -1 /var/log/nginx/error.log
2026/10/25 07:41:24 [error] 504#504: *84 connect() failed (111: Connection refused) while connecting to upstream, client: 10.10.0.4, server: , request: "GET / HTTP/1.1", upstream: "http://10.10.0.3:8000/", host: "alpha"
root@beta:/srv/app# pgrep -a python3
418 python3 -m http.server 8080
root@beta:/srv/app# ss -tlnp | grep python3
LISTEN 0      5            0.0.0.0:8080       0.0.0.0:*    users:(("python3",pid=418,fd=3))
```

A 502 sends you to alpha's error log, which says beta refused the connection on port 8000. Refused means the path works, so go to steps 1 and 2 on beta: the application runs, but on port 8080. Restart it on 8000 (`kill %1`, then start it with `8000`), and `curl alpha` from gamma returns `Hello from beta` again. Changing `proxy_pass` to 8080 would also work, but the fault is on beta, so fix it there. A common mistake is to restart nginx: nginx was never the problem, it only reported it.

</details>

### Task 2: The same error, a different cause

<details>
<summary>Show the commands that break it</summary>

```bash
root@alpha:/# ip route add 10.10.0.3/32 via 10.10.0.99
```

</details>

From gamma, `curl -i alpha` returns an error again. This time it takes a few seconds. Find out why.

<details>
<summary>Check your work</summary>

```bash
root@gamma:/# time curl -si alpha | head -1
HTTP/1.1 502 Bad Gateway

real	0m3.110s
root@alpha:/# tail -1 /var/log/nginx/error.log
2026/10/25 07:40:26 [error] 503#503: *82 connect() failed (113: No route to host) while connecting to upstream, client: 10.10.0.4, server: , request: "GET / HTTP/1.1", upstream: "http://10.10.0.3:8000/", host: "alpha"
root@alpha:/# ping -c 2 beta
PING beta (10.10.0.3) 56(84) bytes of data.
From alpha (10.10.0.2) icmp_seq=1 Destination Host Unreachable
From alpha (10.10.0.2) icmp_seq=2 Destination Host Unreachable
root@alpha:/# ip route get 10.10.0.3
10.10.0.3 via 10.10.0.99 dev eth0 src 10.10.0.2 uid 0
    cache
```

Steps 1 to 3 on beta pass. The name resolves on alpha. Step 5 fails: the error says `No route to host`, ping fails with an error from alpha itself, and `ip route get` shows a route that sends beta's traffic through `10.10.0.99`, an address nobody has. Alpha spends about three seconds asking for it with ARP, then gives up. Remove the route with `ip route del 10.10.0.3/32`, and the page comes back. The same 502 as in Task 1 had a completely different cause: the status code tells you the proxy failed, and only the log and the checklist tell you why.

</details>

## Quiz

**1. `curl http://web-01:8080/` from a client fails at once with `Connection refused`. What does that tell you, and what do you check next?**

<details>
<summary>Show answer</summary>

The name resolved and packets reached web-01, whose kernel answered that nothing listens on port 8080 (or a firewall rejected it with a reset). Next, on web-01: is the service running, and does `ss -tlnp` show it listening on port 8080 on an address the client can reach, not just `127.0.0.1`?

</details>

**2. A service on a server cannot be reached from another machine. On the server, `curl localhost:8080` works and `ss -tlnp` shows `0.0.0.0:8080`. From the other machine, `nc -zv -w 3 server 8080` times out. Where is the problem most likely?**

<details>
<summary>Show answer</summary>

A firewall dropping the packets: on the server itself (`iptables -L INPUT -n -v`, and watch the packet counters rise as you retry), somewhere in between, or in a cloud security group. The service is running and listening on every address, and a timeout rather than a refusal means nothing answered at all.

</details>

**3. Why does the checklist start at the server rather than at the client?**

<details>
<summary>Show answer</summary>

Because the checks on the server are quick and rule out the most common causes, a stopped service or a wrong port or address, before you spend time on DNS, routes and firewalls. If the service does not work locally, nothing further out can make it work.

</details>

**4. Users get `504 Gateway Timeout` from a site behind a load balancer. What is the difference from a 502, and where do you start?**

<details>
<summary>Show answer</summary>

A 504 means the proxy reached a backend, or tried to, but did not get an answer in time; a 502 usually means the backend refused or gave a bad answer. Start with the proxy's error log to see which backend timed out and at what stage, then check that backend: is the application slow or stuck, and does a firewall between them drop the traffic?

</details>

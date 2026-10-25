Most applications are not reached directly. A request from a browser lands on a server in front of them, which passes it on to one of several copies of the application and hands the answer back. That front server is a **reverse proxy**, and when it spreads requests over several copies it is a **load balancer**.

This topic builds one in the lab with nginx on alpha and two small applications on beta and gamma. By the end you can put nginx in front of an application, spread requests across two backends, choose how they are spread, and see what happens when one of them goes down.

## What a reverse proxy does

A client opens a connection to the proxy and sends its request. The proxy opens a *second* connection of its own to an application server, called a **backend** or **upstream**, sends the request on, waits for the answer and returns it to the client. The client never talks to the backend, and usually does not know it exists.

```text
client ──> alpha (nginx, port 80) ──> beta:8000
                                  └─> gamma:8000
```

Putting a proxy in front buys you several things at once:

- **One address for many servers.** Clients know one name. Behind it you can add, remove or replace backends without anyone noticing.
- **Load balancing.** Requests are shared across backends, so no single one takes all the traffic.
- **Fewer exposed ports.** Only the proxy needs to be reachable from outside. The backends can listen on a private network.
- **One place for shared work.** HTTPS, compression, request logging and size limits can live on the proxy rather than in every application.

A *forward* proxy is the opposite arrangement: it sits next to the clients, for example in an office, and makes requests out to the internet on their behalf. When people say "proxy" in front of a web service, they mean a reverse proxy.

## Two backends to balance

Each backend is a tiny web server that says which machine it is, so you can see where each request went. Start the lab with alpha, beta and gamma as usual. On beta, make a page and serve it on port 8000 with Python's built-in web server:

```bash
root@beta:/# mkdir -p /srv/app && cd /srv/app
root@beta:/srv/app# echo 'Hello from beta' > index.html
root@beta:/srv/app# python3 -m http.server 8000 &
Serving HTTP on 0.0.0.0 port 8000 (http://0.0.0.0:8000/) ...
```

Do the same on gamma, with `Hello from gamma` in the page. The server runs in the background and prints a log line in that terminal for every request it gets. Check both from alpha:

```bash
root@alpha:/# curl beta:8000
Hello from beta
root@alpha:/# curl gamma:8000
Hello from gamma
```

## nginx with proxy_pass

nginx is already in the image. Its default site would answer on port 80 and get in the way, so remove it, then write a site of your own in `/etc/nginx/conf.d/app.conf` that sends everything to beta:

```bash
root@alpha:/# rm /etc/nginx/sites-enabled/default
root@alpha:/# nano /etc/nginx/conf.d/app.conf
```

```text
server {
    listen 80;

    location / {
        proxy_pass http://beta:8000;
    }
}
```

`proxy_pass` is the whole idea in one line: any request that matches this `location` is passed to that address. Check the file, start nginx and try it:

```bash
root@alpha:/# nginx -t
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
root@alpha:/# nginx
root@alpha:/# curl -i localhost
HTTP/1.1 200 OK
Server: nginx/1.24.0 (Ubuntu)
Date: Sun, 25 Oct 2026 07:26:19 GMT
Content-Type: text/html
Content-Length: 16
Connection: keep-alive
Last-Modified: Sun, 25 Oct 2026 07:26:08 GMT

Hello from beta
```

The `Server` header says nginx, but the body came from beta. On beta the log line shows who asked:

```text
10.10.0.2 - - [25/Oct/2026 07:26:19] "GET / HTTP/1.0" 200 -
```

The client is `10.10.0.2`, which is alpha, not the machine that ran `curl`. From the backend's point of view, every request comes from the proxy. The last section deals with that.

## Upstreams and how requests are shared

To use more than one backend, name a group of them with an **upstream** block and point `proxy_pass` at the group. Replace `app.conf` with:

```text
upstream app {
    zone app 64k;
    server beta:8000;
    server gamma:8000;
}

server {
    listen 80;

    location / {
        proxy_pass http://app;
    }
}
```

nginx runs several worker processes, and each one would otherwise keep its own count of whose turn it is. `zone app 64k;` gives the group a small piece of shared memory, so all workers share one count and the turns come out evenly. Reload and send four requests:

```bash
root@alpha:/# nginx -t && nginx -s reload
root@alpha:/# for i in 1 2 3 4; do curl -s localhost; done
Hello from beta
Hello from gamma
Hello from beta
Hello from gamma
```

That is **round robin**, the default: each backend takes the next request in turn. You can change how the choice is made:

| Setting | Where | What it does |
| --- | --- | --- |
| *(nothing)* | upstream | Round robin, one request each in turn |
| `weight=3` | after a `server` | That backend gets three turns for every one of a weight-1 backend |
| `least_conn;` | first line of upstream | Send to the backend with the fewest requests in progress |
| `ip_hash;` | first line of upstream | The same client address always goes to the same backend |

Weights suit backends of different sizes. With `server beta:8000 weight=3;`:

```bash
root@alpha:/# for i in $(seq 8); do curl -s localhost; done
Hello from beta
Hello from beta
Hello from gamma
Hello from beta
Hello from beta
Hello from beta
Hello from gamma
Hello from beta
```

Six to beta, two to gamma. **Least connections** matters when requests take very different times. Round robin counts requests, not work, so one backend can end up holding all the slow ones. `least_conn` looks at what each backend is busy with right now. Against two tiny pages that answer in a millisecond you will not see a difference, but on a real application with some slow requests it usually spreads the load better.

## When a backend goes down

Stop the server on gamma with `kill %1` in gamma's terminal, and send more requests from alpha:

```bash
root@alpha:/# for i in 1 2 3 4; do curl -s localhost; done
Hello from beta
Hello from beta
Hello from beta
Hello from beta
root@alpha:/# tail -1 /var/log/nginx/error.log
2026/10/25 07:26:49 [error] 145#145: *45 connect() failed (111: Connection refused) while connecting to upstream, client: 127.0.0.1, server: , request: "GET / HTTP/1.1", upstream: "http://10.10.0.4:8000/", host: "localhost"
```

Every request still succeeded. When nginx's connection to gamma was refused, it tried the request again on beta, logged the failure and marked gamma as down for a while. By default one failure (`max_fails=1`) takes a backend out for 10 seconds (`fail_timeout=10s`), after which nginx tries it again with a real request. This is a **passive health check**: nginx learns that a backend is unhealthy only from real requests failing. You can tune it per server, for example `server gamma:8000 max_fails=3 fail_timeout=30s;`.

If every backend is down, there is nothing left to try, and the client gets an error from the proxy itself:

```bash
root@alpha:/# curl -i localhost
HTTP/1.1 502 Bad Gateway
Server: nginx/1.24.0 (Ubuntu)
...
```

**502 Bad Gateway** means the proxy could not get a usable answer from a backend. **504 Gateway Timeout** means it connected but the backend took too long to answer. Both come from the proxy, so the proxy's error log is the place to look first. The *The debugging playbook* topic uses both.

## Passing the client's address along

Because the backend sees only the proxy's address, its logs and any rule based on the client's address are wrong. The fix is a request header. Add these lines inside the `location` block:

```text
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

- `Host` passes on the name the client asked for, which the backend may need to pick a site.
- `X-Real-IP` is the address of whoever connected to nginx.
- **`X-Forwarded-For`** is a list. nginx appends the client's address to any list the request already carries, so a request that passes through several proxies keeps a record of each hop.

Reload, then watch what arrives on beta with tcpdump from the *tcpdump* topic while gamma makes a request through alpha:

```bash
root@beta:/# tcpdump -i eth0 -A -n 'tcp dst port 8000 and tcp[tcpflags] & tcp-push != 0'
```

```bash
root@gamma:/# curl -s alpha
```

```text
GET / HTTP/1.0
Host: alpha
X-Real-IP: 10.10.0.4
X-Forwarded-For: 10.10.0.4
Connection: close
User-Agent: curl/8.5.0
Accept: */*
```

The connection still comes from alpha, but the headers name gamma, `10.10.0.4`, as the real client. Run curl a couple of times, since every other request goes to gamma's own backend. A backend should trust these headers only when the request came from its own proxy, because any client can send an `X-Forwarded-For` header of its choosing.

## The same idea in the cloud

A cloud **load balancer** is a managed reverse proxy. You do not run nginx; you create a load balancer, give it a listener (port 80 or 443), and register a **target group** of backends. It does what you just built, with a few additions:

- **Active health checks.** It requests a path such as `/health` on every backend every few seconds, and stops sending traffic to one that fails, before real users hit it.
- **It runs on several machines** across separate data centres, so the balancer itself is not a single point of failure.
- **It adds `X-Forwarded-For`** and related headers, so your application reads the client address the same way it would behind nginx.

Some cloud load balancers work at the HTTP level, like nginx here, and can route by path or host name. Others work at the TCP level and only pass connections through.

## Tasks

### Task 1: Balance two backends

Set up the lab as in this topic: page-naming backends on beta and gamma on port 8000, and nginx on alpha with an `upstream` of both. Send six requests from alpha and check that they alternate. Then look at beta's terminal and say which address its log shows for each request, and why.

<details>
<summary>Check your work</summary>

```bash
root@alpha:/# for i in $(seq 6); do curl -s localhost; done
Hello from beta
Hello from gamma
Hello from beta
Hello from gamma
Hello from beta
Hello from gamma
```

Beta's log shows `10.10.0.2` for every request, because alpha's nginx makes the connection. If every answer comes from beta, check that the upstream has the `zone` line: without it, each nginx worker keeps its own turn counter and may send each new connection to the first server. If you get the nginx welcome page instead, the default site is still enabled; remove `/etc/nginx/sites-enabled/default` and reload.

</details>

### Task 2: Lose a backend and get it back

With requests still being balanced, stop the server on gamma. Send four requests from alpha and find the matching line in nginx's error log. Then stop beta's server too, and note the status code. Last, start both servers again and check that requests alternate once more.

<details>
<summary>Check your work</summary>

With gamma down, all four requests return `Hello from beta`, and the error log shows `connect() failed (111: Connection refused) while connecting to upstream` with `upstream: "http://10.10.0.4:8000/"`. With both down, `curl -i localhost` shows `HTTP/1.1 502 Bad Gateway` and the log adds `no live upstreams`.

After restarting the servers with `python3 -m http.server 8000 &` in `/srv/app`, the answers alternate again within about 10 seconds, once `fail_timeout` has passed. A common mistake is to restart the server in the wrong directory: it then serves a directory listing instead of the page.

</details>

## Quiz

**1. What is the difference between a reverse proxy and a load balancer?**

<details>
<summary>Show answer</summary>

A reverse proxy receives requests for a service and passes them to a backend. A load balancer is a reverse proxy with several backends that shares requests between them. nginx with one `proxy_pass` address is a reverse proxy; with an `upstream` of several servers it is also a load balancer.

</details>

**2. Your application behind nginx logs every visitor as 10.10.0.2. Why, and what fixes it?**

<details>
<summary>Show answer</summary>

10.10.0.2 is the proxy. nginx opens its own connection to the backend, so that is the address the application sees. Set `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;` (and `X-Real-IP`) in nginx, and have the application read the client address from that header when the request comes from the proxy.

</details>

**3. Users of a site behind nginx get `502 Bad Gateway`. nginx is running. Where do you look, and what are the likely causes?**

<details>
<summary>Show answer</summary>

nginx's error log, `/var/log/nginx/error.log`. A 502 means nginx could not get an answer from any backend: typically the application is not running, listens on a different port or address than the upstream says, or a firewall between them refuses the connection. The log line names the upstream address and the reason, such as `Connection refused`.

</details>

**4. Requests to one backend take two seconds, to the other a few milliseconds, and round robin keeps overloading the slow one. Which setting helps?**

<details>
<summary>Show answer</summary>

`least_conn;` in the upstream block. It sends each new request to the backend with the fewest requests in progress, so the slow backend, which holds its requests longer, gets fewer new ones. If one backend is simply bigger than the other, `weight=` is the better tool.

</details>

The Python server from the *HTTP* topic is fine for a quick test, but real sites run on a proper web server. **nginx** is one of the most widely used. It serves files, terminates HTTPS, and sits in front of applications as a reverse proxy, and you will find it on servers and in containers everywhere.

This topic sets nginx up on `beta` to serve a small site, then makes it reachable from your own computer as well as from the lab. By the end you can start and reload nginx, write a server block, check a configuration before applying it, and find a problem in its logs.

## Start nginx on beta

nginx is already in the lab image. To reach it from your own browser as well as from alpha, start `beta` with an extra option, `-p 8080:80`, which **publishes** a port: Docker forwards port 8080 on your computer to port 80 inside the container. Exit any running beta first, then:

```bash
$ docker run -it --rm --name beta --hostname beta --network lab --cap-add NET_ADMIN -p 8080:80 netlab
root@beta:/#
```

On a normal server, systemd starts nginx at boot and you would use `systemctl reload nginx`. The lab containers do not run systemd, so you control nginx directly with the `nginx` command:

| Command | What it does |
| --- | --- |
| `nginx` | Start nginx in the background |
| `nginx -t` | Test the configuration and report errors, without changing anything |
| `nginx -s reload` | Load a changed configuration without dropping connections |
| `nginx -s quit` | Stop after finishing the requests in progress |
| `nginx -s stop` | Stop immediately |

Start it, and check that it is listening. `ss -tlnp` lists listening TCP sockets with the process behind each one, as the *Ports and sockets* topic showed:

```bash
root@beta:/# nginx
root@beta:/# ss -tlnp
State  Recv-Q Send-Q Local Address:Port  Peer Address:PortProcess
LISTEN 0      4096      127.0.0.11:34529      0.0.0.0:*
LISTEN 0      511          0.0.0.0:80         0.0.0.0:*    users:(("nginx",pid=21,fd=5))
LISTEN 0      511             [::]:80            [::]:*    users:(("nginx",pid=21,fd=6))
```

`nginx` prints nothing when it starts successfully. `ps -ef` shows one **master process**, running as root, which reads the configuration and opens port 80, and several **worker processes**, running as the unprivileged `www-data` user, which handle the requests:

```bash
root@beta:/# ps -ef | grep [n]ginx
root        43     1  0 07:33 ?        00:00:00 nginx: master process nginx
www-data    44    43  0 07:33 ?        00:00:00 nginx: worker process
www-data    45    43  0 07:33 ?        00:00:00 nginx: worker process
```

Now try it from alpha and from your own computer:

```bash
root@alpha:/# curl -I http://beta/
HTTP/1.1 200 OK
Server: nginx/1.24.0 (Ubuntu)
...
```

```bash
$ curl -s http://localhost:8080/ | grep title
<title>Welcome to nginx!</title>
```

You can also open `http://localhost:8080/` in your browser. Both reach the same nginx: alpha on port 80 across the lab network, your computer on port 8080 through the published port.

## How the configuration is laid out

The main file is `/etc/nginx/nginx.conf`. With comments removed, the important part is short:

```text
user www-data;
worker_processes auto;
pid /run/nginx.pid;
error_log /var/log/nginx/error.log;
...
http {
	...
	include /etc/nginx/mime.types;
	default_type application/octet-stream;
	access_log /var/log/nginx/access.log;
	...
	include /etc/nginx/conf.d/*.conf;
	include /etc/nginx/sites-enabled/*;
}
```

nginx configuration is made of **directives**, each ending in a semicolon, and **blocks** in braces that hold more directives. `include` pulls in other files. On Ubuntu and Debian, each site lives in its own file:

- `/etc/nginx/sites-available/` holds a file per site.
- `/etc/nginx/sites-enabled/` holds symbolic links to the sites that are switched on.

So you enable a site by linking it and disable it by removing the link, without deleting its configuration. The welcome page you just saw comes from the `default` site. Other distributions and the official nginx container image use `/etc/nginx/conf.d/*.conf` instead; the directives inside are the same.

## A server block of your own

Make a directory for the site and put a page in it:

```bash
root@beta:/# mkdir -p /var/www/site
root@beta:/# echo "<h1>Hello from nginx on beta</h1>" > /var/www/site/index.html
```

Now write the site's configuration. A **server block** describes one site:

```bash
root@beta:/# cat > /etc/nginx/sites-available/site <<'EOF'
server {
    listen 80;
    server_name beta;
    root /var/www/site;
    index index.html;
}
EOF
```

| Directive | Meaning |
| --- | --- |
| `listen 80` | Accept connections on port 80 |
| `server_name beta` | Use this block for requests whose `Host` header is `beta` |
| `root /var/www/site` | Look for files under this directory; `/about.html` becomes `/var/www/site/about.html` |
| `index index.html` | For a request that ends in `/`, serve this file from that directory |

Enable it, disable the default site, then test and reload:

```bash
root@beta:/# ln -s /etc/nginx/sites-available/site /etc/nginx/sites-enabled/site
root@beta:/# rm /etc/nginx/sites-enabled/default
root@beta:/# nginx -t
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
root@beta:/# nginx -s reload
2026/10/25 07:26:59 [notice] 94#94: signal process started
```

The `notice` line is normal: it says the reload signal was sent. Give it a moment, then ask from alpha:

```bash
root@alpha:/# curl -i http://beta/
HTTP/1.1 200 OK
Server: nginx/1.24.0 (Ubuntu)
Date: Sun, 25 Oct 2026 07:27:02 GMT
Content-Type: text/html
Content-Length: 34
Last-Modified: Sun, 25 Oct 2026 07:26:59 GMT
Connection: keep-alive
ETag: "6addaf43-22"
Accept-Ranges: bytes

<h1>Hello from nginx on beta</h1>
```

Always run `nginx -t` before a reload. If the test fails, the reload would fail too and nginx would carry on with the old configuration, but on a real server the next restart, for example after a reboot, would fail to start at all. A typo in a directive name gives a precise message with the file and line:

```text
2026/10/25 07:35:07 [emerg] 87#87: unknown directive "roott" in /etc/nginx/sites-enabled/site:4
nginx: configuration file /etc/nginx/nginx.conf test failed
```

Be careful with semicolons. A missing one does not always cause an error: nginx may read the next line as more values for the same directive. Without the semicolon after `server_name beta`, the test passes with only a warning, and the site no longer has a `root`:

```text
2026/10/25 07:35:07 [warn] 94#94: server name "/var/www/site" has suspicious symbols in /etc/nginx/sites-enabled/site:4
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
```

Read warnings as well as errors.

## Several sites on one server

One nginx can serve many sites on the same port. It reads the `Host` header of each request and picks the server block whose `server_name` matches, as the *HTTP* topic described. If none matches, it uses the **default server** for that port: the one marked `default_server` on its `listen` line, or else the first one it loaded.

Add a second site for `docs.example.com`:

```bash
root@beta:/# mkdir -p /var/www/docs
root@beta:/# echo "<h1>Docs site</h1>" > /var/www/docs/index.html
root@beta:/# cat > /etc/nginx/sites-available/docs <<'EOF'
server {
    listen 80;
    server_name docs.example.com;
    root /var/www/docs;
    index index.html;
    access_log /var/log/nginx/docs.access.log;
}
EOF
root@beta:/# ln -s /etc/nginx/sites-available/docs /etc/nginx/sites-enabled/docs
root@beta:/# nginx -t && nginx -s reload
```

`&&` runs the reload only if the test passed. The lab has no DNS name for `docs.example.com`, so set the header yourself:

```bash
root@alpha:/# curl -H "Host: docs.example.com" http://beta/
<h1>Docs site</h1>
root@alpha:/# curl http://beta/
<h1>Hello from nginx on beta</h1>
```

Same IP address, same port, different site. This is called **name-based virtual hosting**, and it is how one server or one load balancer handles many domains.

## Access and error logs

nginx writes two logs, under `/var/log/nginx/` by default.

The **access log** has one line per request:

```text
10.10.0.2 - - [25/Oct/2026:07:35:08 +0000] "GET / HTTP/1.1" 200 34 "-" "curl/8.5.0"
10.10.0.2 - - [25/Oct/2026:07:35:08 +0000] "GET /missing HTTP/1.1" 404 162 "-" "curl/8.5.0"
```

| Field | Example |
| --- | --- |
| Client address | `10.10.0.2` |
| Time | `[25/Oct/2026:07:35:08 +0000]` |
| Request line | `"GET /missing HTTP/1.1"` |
| Status code | `404` |
| Bytes sent in the body | `162` |
| Referer, the page that linked here | `"-"` |
| User agent | `"curl/8.5.0"` |

The **error log** says *why* something went wrong, which the access log does not:

```text
2026/10/25 07:26:59 [error] 95#95: *2 open() "/var/www/site/missing" failed (2: No such file or directory), client: 10.10.0.2, server: beta, request: "GET /missing HTTP/1.1", host: "beta"
```

It names the exact file nginx tried to open, which tells you at once whether `root` points where you think it does. Watch both logs while you send requests:

```bash
root@beta:/# tail -f /var/log/nginx/access.log /var/log/nginx/error.log
```

The docs site writes its requests to `docs.access.log`, because its server block set its own `access_log`. Separate logs per site make busy servers easier to read. The *Linux* skill's pipes topic showed how to count status codes or top clients from a file like this.

## Tasks

### Task 1: Serve a second page and find it in the log

On beta, add a page `/var/www/site/status.html` containing `<p>ok</p>`. Fetch it from alpha and from your own computer through the published port. Then find both requests in the access log and say which client address each came from.

<details>
<summary>Check your work</summary>

```bash
root@beta:/# echo "<p>ok</p>" > /var/www/site/status.html
```

```bash
root@alpha:/# curl http://beta/status.html
<p>ok</p>
```

```bash
$ curl http://localhost:8080/status.html
<p>ok</p>
```

```bash
root@beta:/# grep status.html /var/log/nginx/access.log
10.10.0.2 - - [25/Oct/2026:07:35:08 +0000] "GET /status.html HTTP/1.1" 200 10 "-" "curl/8.5.0"
10.10.0.1 - - [25/Oct/2026:07:35:08 +0000] "GET /status.html HTTP/1.1" 200 10 "-" "curl/8.6.0"
```

No reload is needed for new files; nginx reads them on each request. The first line is alpha. The second is your computer, but not with your computer's own address: Docker forwards the connection into the container, so it arrives from an address Docker picks. On Linux that is usually `10.10.0.1`, Docker's gateway; on Docker Desktop it can be something else entirely. The user agent may also differ, since your computer has its own version of curl. If your computer gets `Connection refused` or an empty reply, beta was started without `-p 8080:80`: exit and start it again with the option.

</details>

### Task 2: Make it fail, then read why

Move the docs site's `index.html` out of the way with `mv /var/www/docs/index.html /tmp/`. From alpha, request the docs site again with the right `Host` header. Note the status code, then find the reason in the error log and fix it.

<details>
<summary>Check your work</summary>

```bash
root@alpha:/# curl -i -H "Host: docs.example.com" http://beta/
HTTP/1.1 403 Forbidden
...
```

```bash
root@beta:/# tail -n 1 /var/log/nginx/error.log
2026/10/25 07:27:11 [error] 158#158: *8 directory index of "/var/www/docs/" is forbidden, client: 10.10.0.2, server: docs.example.com, request: "GET / HTTP/1.1", host: "docs.example.com"
```

With no index file, nginx would have to list the directory, and listing is off by default, so it refuses with a 403. The fix is to put the file back with `mv /tmp/index.html /var/www/docs/`. A common mistake is to look only at `docs.access.log`, which shows the 403 but not the reason.

</details>

## Quiz

**1. Why should you run `nginx -t` before `nginx -s reload`?**

<details>
<summary>Show answer</summary>

`nginx -t` checks the configuration without changing anything. A broken reload leaves the old configuration running, so the mistake can go unnoticed until the next full start, which then fails and takes the site down.

</details>

**2. Two server blocks both listen on port 80, one with `server_name example.com` and one with `server_name example.org`. How does nginx choose which one answers a request?**

<details>
<summary>Show answer</summary>

It compares the request's `Host` header with each `server_name`. If neither matches, it uses the default server for port 80: the one marked `default_server`, or else the first one loaded.

</details>

**3. What does `-p 8080:80` do when starting beta, and why does alpha not need it?**

<details>
<summary>Show answer</summary>

It makes Docker forward port 8080 on your own computer to port 80 inside beta, so your browser can reach nginx. alpha is on the same lab network as beta and connects to port 80 directly.

</details>

**4. A colleague added a new site to a server, ran `nginx -s reload`, and the new site returns 404 for every page, while the access log shows the requests arriving. Where do you look next, and what are you looking for?**

<details>
<summary>Show answer</summary>

The error log. Each 404 has a line with the full path nginx tried to open. If the path is wrong, the `root` is wrong, or a missing semicolon has swallowed it. If the requests are being handled by a different site's `server_name`, the `Host` does not match the new block. Run `nginx -t` as well and read any warnings.

</details>

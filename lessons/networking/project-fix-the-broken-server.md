A colleague has set up a small web server called `web`, and a test machine called `client` next to it. From the client, `curl http://web/` fails. Your job is to find out why and make it work, without rebuilding anything. There is more than one fault, and each one hides the next, so you fix them one at a time and in order.

The project is an exercise in *The debugging playbook*: check the name, then the path, then the port, then the application. Along the way you use what you learned in *DNS basics*, *Ports and sockets*, *Netcat*, *Firewall basics*, *tcpdump* and *Serve a website with nginx*.

## What you need

The `netlab` image from the *What a network is* topic, and Docker on your computer. You do not need any machines from earlier topics running.

A setup script builds the broken lab for you. It creates the `lab` network if you do not already have it, starts `web` on `10.10.0.10` and `client` on `10.10.0.11`, and breaks a few things on purpose. The script contains the answers, so copy it into a file without studying it.

<details>
<summary>Show the setup script</summary>

Save this as `broken-server.sh` on your own computer:

```bash
#!/usr/bin/env bash
# Builds the lab for the "Fix the broken server" project. Run it on your own computer.
set -euo pipefail

docker network inspect lab >/dev/null 2>&1 || docker network create --subnet 10.10.0.0/24 lab >/dev/null
docker rm -f web client >/dev/null 2>&1 || true

docker run -d --name web --hostname web --network lab --ip 10.10.0.10 \
  --cap-add NET_ADMIN netlab sleep infinity >/dev/null
docker run -d --name client --hostname client --network lab --ip 10.10.0.11 \
  --cap-add NET_ADMIN --add-host web:10.10.0.12 netlab sleep infinity >/dev/null

docker exec -i web bash -s <<'EOF'
mkdir -p /var/www/site
echo '<h1>web-01 is working</h1>' > /var/www/site/index.html
chmod 600 /var/www/site/index.html
cat > /etc/nginx/sites-available/default <<'CONF'
server {
    listen 127.0.0.1:80;
    server_name web;
    root /var/www/shop;
    index index.html;
}
CONF
nginx
iptables -A INPUT -i eth0 -p tcp --dport 80 -j DROP
EOF

echo "The lab is ready. Open a shell on the client with: docker exec -it client bash"
```

</details>

Run it, then open two terminals, one on each machine:

```bash
$ bash broken-server.sh
The lab is ready. Open a shell on the client with: docker exec -it client bash
$ docker exec -it client bash
root@client:/#
```

```bash
$ docker exec -it web bash
root@web:/#
```

The two containers run in the background, so `exit` only closes your shell. Run the script again at any time to start over from the broken state.

## The brief

1. From the client, `curl http://web/` returns the page. Check: it prints `<h1>web-01 is working</h1>` with status `200 OK`.
2. Each fault is fixed where it lives, not worked around. Check: the client still uses the name `web`, not an IP address, and the firewall on `web` still exists as a tool you could use (you remove the bad rule, not iptables).
3. For each fault, you can name the layer it was at, the command that showed it, and the symptom it caused. Check: write one line per fault, such as "name: `getent hosts web` gave the wrong address, so curl got No route to host".
4. nginx's configuration is valid after your changes. Check: `nginx -t` on `web` prints `syntax is ok` and `test is successful`.

## Steps

### Read the symptom

Start where the report starts. Run the failing command on the client and read the whole error, not just the fact that it failed. `curl -v` shows each step it takes: which address the name became, and where the connection stopped.

Then follow the playbook from the bottom. Does the name `web` turn into the right address? Compare what the system resolver says (`getent hosts web`, which reads `/etc/hosts` first) with what DNS says (`dig +short web`, which only asks DNS). Then check whether that address answers at all with `ping`.

<details>
<summary>Show a solution</summary>

```bash
root@client:/# curl -v http://web/
* Host web:80 was resolved.
* IPv6: (none)
* IPv4: 10.10.0.12
*   Trying 10.10.0.12:80...
* connect to 10.10.0.12 port 80 from 10.10.0.11 port 43700 failed: No route to host
* Failed to connect to web port 80 after 3061 ms: Couldn't connect to server
* Closing connection
```

curl went to `10.10.0.12`. But the setup said `web` is `10.10.0.10`. The two lookups disagree:

```bash
root@client:/# getent hosts web
10.10.0.12      web
root@client:/# dig +short web
10.10.0.10
root@client:/# grep web /etc/hosts
10.10.0.12	web
```

**Fault 1, the name.** A stale line in the client's `/etc/hosts` maps `web` to `10.10.0.12`. The resolver reads `/etc/hosts` before DNS, so it never asks Docker's DNS, which has the right answer. Nothing is at `10.10.0.12`, so the client's ARP request gets no reply:

```bash
root@client:/# ping -c 3 web
PING web (10.10.0.12) 56(84) bytes of data.
From client (10.10.0.11) icmp_seq=1 Destination Host Unreachable
From client (10.10.0.11) icmp_seq=2 Destination Host Unreachable
From client (10.10.0.11) icmp_seq=3 Destination Host Unreachable
root@client:/# ip neigh
10.10.0.12 dev eth0 FAILED
```

`No route to host` after about three seconds, together with a `FAILED` neighbour entry, is the sign of an address on your own subnet that nobody owns.

The fix is to delete the line, so the name comes from DNS again. Docker mounts `/etc/hosts` into the container, and `sed -i` fails on it, because it writes a new file and renames it over the old one:

```bash
root@client:/# sed -i '/10.10.0.12/d' /etc/hosts
sed: cannot rename /etc/sed4rJegc: Device or resource busy
```

Write the file in place instead:

```bash
root@client:/# grep -v '^10.10.0.12' /etc/hosts > /tmp/hosts && cat /tmp/hosts > /etc/hosts
root@client:/# getent hosts web
10.10.0.10      web
root@client:/# ping -c 2 web
64 bytes from web.lab (10.10.0.10): icmp_seq=1 ttl=64 time=0.078 ms
64 bytes from web.lab (10.10.0.10): icmp_seq=2 ttl=64 time=0.103 ms
```

Changing the line to `10.10.0.10` would also work, but it leaves a second copy of the address to go stale next time the server moves.

</details>

### Reach the port

With the name fixed, run curl again. The error changes, which is progress: each fault you fix reveals the next one. The host answers ping, so the path to it works. Now test the port on its own with `nc -zv`. A port that times out and a port that is refused mean different things, so note which you get.

Then look from the other side. On `web`, watch for the client's packets with `tcpdump` while you retry from the client. If they arrive and get no answer, something on `web` is throwing them away. List the firewall rules with their counters.

<details>
<summary>Show a solution</summary>

```bash
root@client:/# curl -sS -m 5 http://web/
curl: (28) Connection timed out after 5008 milliseconds
root@client:/# nc -zv -w 3 web 80
nc: connect to web (10.10.0.10) port 80 (tcp) timed out: Operation now in progress
```

A timeout means the SYN got no reply at all. On `web`, the SYNs do arrive, and the same one is sent again and again because nothing answers it:

```bash
root@web:/# tcpdump -ni eth0 -c 3 tcp port 80
listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
07:31:40.589719 IP 10.10.0.11.39830 > 10.10.0.10.80: Flags [S], seq 690648968, win 64240, options [mss 1460,sackOK,TS val 2136665037 ecr 0,nop,wscale 7], length 0
07:31:41.596918 IP 10.10.0.11.39830 > 10.10.0.10.80: Flags [S], seq 690648968, win 64240, options [mss 1460,sackOK,TS val 2136666045 ecr 0,nop,wscale 7], length 0
07:31:42.620172 IP 10.10.0.11.39830 > 10.10.0.10.80: Flags [S], seq 690648968, win 64240, options [mss 1460,sackOK,TS val 2136667068 ecr 0,nop,wscale 7], length 0
```

```bash
root@web:/# iptables -L INPUT -n -v --line-numbers
Chain INPUT (policy ACCEPT 0 packets, 0 bytes)
num   pkts bytes target     prot opt in     out     source               destination
1        8   480 DROP       6    --  eth0   *       0.0.0.0/0            0.0.0.0/0            tcp dpt:80
```

**Fault 2, the firewall.** Rule 1 drops every TCP packet for port 80 that arrives on `eth0`, and its counter grows each time you retry. `DROP` sends nothing back, which is why the client waits until it gives up rather than failing at once.

Notice the rule only matches `eth0`. That is why `curl localhost` on `web` itself would not hang: the request goes over the loopback, and the server looks fine from the inside. "It works on the server" is a common trap.

Delete the rule by its number:

```bash
root@web:/# iptables -D INPUT 1
root@web:/# iptables -L INPUT -n --line-numbers
Chain INPUT (policy ACCEPT)
num  target     prot opt source               destination
```

</details>

### Find the listener

Retry once more. The timeout becomes an immediate refusal. A refusal means the packet reached the host and the kernel answered it, but no program was listening on that address and port. Check what nginx is actually listening on with `ss -tlnp`, and look at the `Local Address` column closely. Then find the line in the nginx configuration that causes it.

Once you have changed the configuration, test it with `nginx -t` and apply it. Check `ss` again afterwards rather than trusting that the change took effect.

<details>
<summary>Show a solution</summary>

```bash
root@client:/# curl -sS http://web/
curl: (7) Failed to connect to web port 80 after 0 ms: Couldn't connect to server
root@client:/# nc -zv -w 3 web 80
nc: connect to web (10.10.0.10) port 80 (tcp) failed: Connection refused
```

```bash
root@web:/# ss -tlnp
State  Recv-Q Send-Q Local Address:Port  Peer Address:PortProcess
LISTEN 0      4096      127.0.0.11:39501      0.0.0.0:*
LISTEN 0      511        127.0.0.1:80         0.0.0.0:*    users:(("nginx",pid=17,fd=5))
root@web:/# grep -R listen /etc/nginx/sites-enabled/
/etc/nginx/sites-enabled/default:    listen 127.0.0.1:80;
```

**Fault 3, the listening address.** nginx listens on `127.0.0.1:80`, the loopback only. Connections to `10.10.0.10:80` find no socket, so the kernel refuses them. (The `127.0.0.11` line is Docker's DNS helper; ignore it.) Use `grep -R` rather than `-r` here, because `sites-enabled/default` is a symbolic link and `-r` skips links.

Change the line to `listen 80;` in `/etc/nginx/sites-available/default`, test, and reload:

```bash
root@web:/# sed -i 's/listen 127.0.0.1:80;/listen 80;/' /etc/nginx/sites-available/default
root@web:/# nginx -t
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
root@web:/# nginx -s reload
2026/10/25 07:30:18 [notice] 54#54: signal process started
root@web:/# ss -tlnp | grep :80
LISTEN 0      511        127.0.0.1:80         0.0.0.0:*    users:(("nginx",pid=17,fd=5))
```

It is still on `127.0.0.1`. The reload printed no error, but the error log has one:

```bash
root@web:/# tail -n 1 /var/log/nginx/error.log
2026/10/25 07:30:18 [emerg] 17#17: bind() to 0.0.0.0:80 failed (98: Address already in use)
```

A reload keeps the old sockets open while it opens the new ones, and Linux does not let it bind `0.0.0.0:80` while `127.0.0.1:80` is held. Changing what nginx listens on can need a full restart. There is no systemd in the container, so stop and start it by hand:

```bash
root@web:/# nginx -s stop
root@web:/# nginx
root@web:/# ss -tlnp | grep :80
LISTEN 0      511          0.0.0.0:80         0.0.0.0:*    users:(("nginx",pid=75,fd=5))
```

On a normal server, `systemctl restart nginx` does the same.

</details>

### Read the application's answer

Now the client gets an HTTP response, so every layer below the application works. The status code and nginx's error log tell you the rest. Run `curl -i` to see the status, then read the last line of `/var/log/nginx/error.log` on `web`. It names the exact file nginx tried to open and why it failed. There may be more than one problem at this layer.

<details>
<summary>Show a solution</summary>

```bash
root@client:/# curl -sS -i http://web/
HTTP/1.1 404 Not Found
Server: nginx/1.24.0 (Ubuntu)
Content-Type: text/html
Content-Length: 162
...
```

```bash
root@web:/# tail -n 1 /var/log/nginx/error.log
2026/10/25 07:30:26 [error] 76#76: *1 "/var/www/shop/index.html" is not found (2: No such file or directory), client: 10.10.0.11, server: web, request: "GET / HTTP/1.1", host: "web"
root@web:/# ls /var/www
html  site
```

**Fault 4, the document root.** The configuration says `root /var/www/shop;`, but the site is in `/var/www/site`. Fix the path, test and reload. A reload is enough this time, because the listening sockets do not change:

```bash
root@web:/# sed -i 's|root /var/www/shop;|root /var/www/site;|' /etc/nginx/sites-available/default
root@web:/# nginx -t && nginx -s reload
```

```bash
root@client:/# curl -sS -i http://web/
HTTP/1.1 403 Forbidden
Server: nginx/1.24.0 (Ubuntu)
...
```

```bash
root@web:/# tail -n 1 /var/log/nginx/error.log
2026/10/25 07:30:36 [error] 104#104: *2 open() "/var/www/site/index.html" failed (13: Permission denied), client: 10.10.0.11, server: web, request: "GET / HTTP/1.1", host: "web"
root@web:/# ls -l /var/www/site
-rw------- 1 root root 27 Oct 25 07:30 index.html
root@web:/# ps -o user,cmd -C nginx
USER     CMD
root     nginx: master process nginx
www-data nginx: worker process
```

**Fault 5, file permissions.** The file is readable by root only, and the worker processes that serve requests run as `www-data`. Give everyone read access, as you did in the Linux skill:

```bash
root@web:/# chmod 644 /var/www/site/index.html
```

You do not need to reload for this. nginx opens the file again on each request.

</details>

## Check it works

From the client:

```bash
root@client:/# curl -sS -i http://web/
HTTP/1.1 200 OK
Server: nginx/1.24.0 (Ubuntu)
Date: Sun, 25 Oct 2026 07:30:36 GMT
Content-Type: text/html
Content-Length: 27
Last-Modified: Sun, 25 Oct 2026 07:30:00 GMT
Connection: keep-alive
ETag: "6addaff8-1b"
Accept-Ranges: bytes

<h1>web-01 is working</h1>
```

The name resolves to the right place, without an entry in `/etc/hosts`:

```bash
root@client:/# getent hosts web
10.10.0.10      web
root@client:/# grep -c web /etc/hosts
0
```

On `web`, the configuration is valid, nginx listens on every address, and the firewall has no rule against port 80:

```bash
root@web:/# nginx -t
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
root@web:/# ss -tln | grep :80
LISTEN 0      511          0.0.0.0:80         0.0.0.0:*
root@web:/# iptables -S INPUT
-P INPUT ACCEPT
```

Your five lines for the brief should read something like this:

| Layer | Command that showed it | Symptom |
| --- | --- | --- |
| Name | `getent hosts web` against `dig +short web` | `No route to host` after 3 seconds |
| Network (firewall) | `tcpdump` on web, `iptables -L -v` | Connection timed out |
| Port | `ss -tlnp` | Connection refused |
| Application | `error.log`: `is not found` | `404 Not Found` |
| Application | `error.log`: `Permission denied` | `403 Forbidden` |

When you are done, remove both machines from your own computer:

```bash
$ docker rm -f web client
```

## Going further

- Run the setup script again and fix all five faults with a one-line command each, then put those commands in a `fix.sh` you could hand to a colleague.
- Replace the deleted firewall rule with a sensible set: allow port 80 and established connections, and drop everything else, as in *Firewall practice*.
- Break the lab yourself in a way not covered here, such as a wrong default route on the client, and ask someone to find it.

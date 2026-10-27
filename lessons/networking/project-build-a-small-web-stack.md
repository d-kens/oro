Most web services you will meet in the cloud have the same shape: a few copies of an application, a load balancer in front of them that handles HTTPS, a DNS name that points at the load balancer, and a firewall that lets in only web traffic. In this project you build that shape in your lab, small enough to see every part.

You build two application servers, an nginx proxy that spreads requests across them over HTTPS under the name `shop.lab.internal`, and a client that trusts your own certificate authority. It draws on *Reverse proxy and load balancing*, *TLS and HTTPS*, *DNS basics*, *Firewall basics* and *Serve a website with nginx*.

## What you need

The `netlab` image and the `lab` network from the *What a network is* topic. Everything you need is in the image: `python3`, `nginx`, `openssl`, `iptables`, `curl` and `dig`.

You write the configuration files on your own computer, in a directory that every container mounts at `/stack`. That way the files survive when containers are removed, and you can edit them with your usual editor:

```bash
$ mkdir stack
$ cd stack
```

The machines get fixed addresses, so that the name and the checks below can rely on them. If you still have `web` and `client` from *Fix the broken server*, remove them first with `docker rm -f web client`, because the addresses overlap.

| Machine | Address | Role |
| --- | --- | --- |
| `proxy` | `10.10.0.10` | nginx, HTTPS and load balancing, firewall |
| `app1`, `app2` | `10.10.0.21`, `10.10.0.22` | The application, on port 8000 |
| `client` | `10.10.0.30` | Where you test from |

## The brief

1. `app1` and `app2` each run a small Python web server on port 8000 that replies with its own name. Check: from the proxy, `curl app1:8000` prints `Hello from app1`, and the same for `app2`.
2. You have a certificate authority of your own and a certificate for `shop.lab.internal` signed by it. Check: `openssl verify -CAfile ca.crt shop.crt` prints `shop.crt: OK`.
3. nginx on `proxy` serves `https://shop.lab.internal/` with that certificate, and passes requests to both apps in turn. Check: four requests in a row alternate between `app1` and `app2`.
4. A plain HTTP request is redirected to HTTPS. Check: `curl -I http://shop.lab.internal/some/page` shows `301` and `Location: https://shop.lab.internal/some/page`.
5. The name `shop.lab.internal` resolves to the proxy on the client, through the lab's DNS. Check: `dig +short shop.lab.internal` on the client prints `10.10.0.10`.
6. The client trusts your certificate authority. Check: `curl https://shop.lab.internal/` works without `-k`.
7. Only ports 80 and 443 on the proxy can be reached. Check: with another service started on port 8080 on the proxy, `nc -zv` from the client to port 443 succeeds and to port 8080 times out.

## Steps

### Run the application servers

Write a Python web server in `app.py` that answers every `GET` with `Hello from` and the machine's hostname. Python's built-in `http.server` module is enough: subclass `BaseHTTPRequestHandler`, write a `do_GET` method, and serve it with `HTTPServer` on `0.0.0.0` port 8000. `socket.gethostname()` gives the name.

Then start it twice. Run each container in the background with `-d`, give it a fixed address with `--ip`, mount the directory with `-v "$PWD":/stack`, and make `python3 /stack/app.py` the command, so the container lives as long as the server does.

<details>
<summary>Show a solution</summary>

`app.py`:

```text
# A tiny web application that says which machine answered.
import socket
from http.server import BaseHTTPRequestHandler, HTTPServer

NAME = socket.gethostname()


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        body = f"Hello from {NAME}\n".encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


print(f"{NAME} listening on port 8000", flush=True)
HTTPServer(("0.0.0.0", 8000), Handler).serve_forever()
```

```bash
$ docker run -d --name app1 --hostname app1 --network lab --ip 10.10.0.21 -v "$PWD":/stack netlab python3 /stack/app.py
$ docker run -d --name app2 --hostname app2 --network lab --ip 10.10.0.22 -v "$PWD":/stack netlab python3 /stack/app.py
$ docker logs app1
app1 listening on port 8000
```

`docker logs` shows what the server prints, including one line for each request it answers. That is useful later, to see which app got a request.

</details>

### Make a certificate authority and a certificate

Start the proxy, which also does this step, and open a shell on it. It needs `--cap-add NET_ADMIN` for the firewall later, and `--network-alias` gives it the stack's name, which the section *Give the stack a name* explains.

```bash
$ docker run -d --name proxy --hostname proxy --network lab --ip 10.10.0.10 --network-alias shop.lab.internal --cap-add NET_ADMIN -v "$PWD":/stack netlab sleep infinity
$ docker exec -it proxy bash
root@proxy:/#
```

In `/stack/ca`, make a CA key and a self-signed CA certificate, then a key and a certificate signing request for `shop.lab.internal`, and sign the request with the CA. Modern clients ignore the common name and check the **subject alternative name** instead, so the signed certificate must carry `subjectAltName=DNS:shop.lab.internal`. The section on a certificate authority of your own in *TLS and HTTPS* walks through each command.

<details>
<summary>Show a solution</summary>

```bash
root@proxy:/# mkdir -p /stack/ca && cd /stack/ca
root@proxy:/stack/ca# openssl req -x509 -newkey rsa:2048 -nodes -keyout ca.key -out ca.crt -days 365 -subj "/CN=Lab CA"
root@proxy:/stack/ca# openssl req -newkey rsa:2048 -nodes -keyout shop.key -out shop.csr -subj "/CN=shop.lab.internal"
root@proxy:/stack/ca# echo "subjectAltName=DNS:shop.lab.internal" > shop.ext
root@proxy:/stack/ca# openssl x509 -req -in shop.csr -CA ca.crt -CAkey ca.key -CAcreateserial -days 90 -extfile shop.ext -out shop.crt
Certificate request self-signature ok
subject=CN = shop.lab.internal
root@proxy:/stack/ca# openssl verify -CAfile ca.crt shop.crt
shop.crt: OK
root@proxy:/stack/ca# openssl x509 -in shop.crt -noout -issuer -ext subjectAltName
issuer=CN = Lab CA
X509v3 Subject Alternative Name:
    DNS:shop.lab.internal
```

The `openssl req` commands also print lines of dots and plus signs while they make the keys; that is normal. `ca.key` is the most sensitive file here. Anyone who has it can sign certificates your client will trust, so in real life it never sits on a web server.

</details>

### Configure the proxy

Write `shop.conf` with three parts:

- An `upstream` block that lists `app1:8000` and `app2:8000`.
- A `server` block on port 80 that answers every request with a `301` to the same path on `https://`.
- A `server` block on port 443 with `ssl`, your certificate and key, and a `location /` that passes requests to the upstream with `proxy_pass`. Set the `Host`, `X-Forwarded-For` and `X-Forwarded-Proto` headers, so the apps could see the original request.

On the proxy, remove the default site, link your file into `/etc/nginx/conf.d/`, test it and start nginx. Then send four requests from the proxy itself with `curl -sk --resolve shop.lab.internal:443:127.0.0.1 https://shop.lab.internal/` and look at which app answers. If one app answers every time, read the hint in the solution.

<details>
<summary>Show a solution</summary>

`shop.conf`:

```text
upstream shop_apps {
    zone shop_apps 64k;
    server app1:8000;
    server app2:8000;
}

server {
    listen 80;
    server_name shop.lab.internal;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name shop.lab.internal;

    ssl_certificate     /stack/ca/shop.crt;
    ssl_certificate_key /stack/ca/shop.key;

    location / {
        proxy_pass http://shop_apps;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

```bash
root@proxy:/# rm /etc/nginx/sites-enabled/default
root@proxy:/# ln -s /stack/shop.conf /etc/nginx/conf.d/shop.conf
root@proxy:/# nginx -t
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
root@proxy:/# nginx
root@proxy:/# ss -tln | grep -E ':(80|443) '
LISTEN 0      511          0.0.0.0:80         0.0.0.0:*
LISTEN 0      511          0.0.0.0:443        0.0.0.0:*
```

The `zone` line matters. nginx starts one worker process per CPU core, and without a shared zone each worker keeps its own place in the round robin. Each new connection tends to land on a different worker, and each worker starts with `app1`, so you see `app1` every time. With `zone`, the workers share one counter and the requests alternate.

`curl --resolve` sends the request to `127.0.0.1` while still using the name `shop.lab.internal` for the TLS handshake and the `Host` header, which lets you test without relying on name lookup. `-k` skips the certificate check for now.

</details>

### Give the stack a name

The client needs `shop.lab.internal` to resolve to the proxy. In the cloud, that is an A record or an alias at your DNS provider. In the lab, Docker's DNS helper at `127.0.0.11` already answers container names on the `lab` network, and `--network-alias` adds another name for a container on that network. You gave the proxy its alias when you started it, so every container on `lab` can already look the name up.

Check it from one of the apps, which are on the same network. `getent` uses the system resolver, as a program would:

<details>
<summary>Show a solution</summary>

```bash
$ docker exec app1 getent hosts shop.lab.internal
10.10.0.10      shop.lab.internal
```

If it prints nothing, the proxy was started without `--network-alias`. Remove it with `docker rm -f proxy` and start it again with the alias; your files in `/stack` are kept, so you only repeat the setup inside the proxy. A line in the client's `/etc/hosts`, added with `docker run --add-host shop.lab.internal:10.10.0.10`, would also work, but only on that one machine, and `dig` would not see it.

</details>

### Trust the certificate authority

Start the client with the CA certificate mounted read-only. Mount only `ca.crt`, not the whole `ca` directory, so the client never sees the CA's private key:

```bash
$ docker run -it --rm --name client --hostname client --network lab --ip 10.10.0.30 --cap-add NET_ADMIN -v "$PWD/ca/ca.crt":/lab-ca.crt:ro netlab
root@client:/#
```

Check the name, then try HTTPS. It fails until you add the CA to the client's trust store. On Ubuntu, that means copying it into `/usr/local/share/ca-certificates/` with a `.crt` ending and running `update-ca-certificates`.

<details>
<summary>Show a solution</summary>

```bash
root@client:/# dig +short shop.lab.internal
10.10.0.10
root@client:/# curl https://shop.lab.internal/
curl: (60) SSL certificate problem: unable to get local issuer certificate
```

The certificate is fine, but nothing the client trusts signed it. Add the CA:

```bash
root@client:/# cp /lab-ca.crt /usr/local/share/ca-certificates/lab-ca.crt
root@client:/# update-ca-certificates
Updating certificates in /etc/ssl/certs...
rehash: warning: skipping ca-certificates.crt,it does not contain exactly one certificate or CRL
1 added, 0 removed; done.
Running hooks in /etc/ca-certificates/update.d...
done.
root@client:/# curl https://shop.lab.internal/
Hello from app1
```

The `rehash` warning is harmless. `1 added` is the line that matters. Every program on the client that uses the system trust store, including `curl` and `openssl`, now trusts certificates your CA signs. That is also why a CA key must be guarded: trusting a CA means trusting everything it signs.

</details>

### Lock down the proxy

On the proxy, build an `INPUT` chain that accepts traffic on the loopback, accepts packets that belong to connections already set up, accepts new TCP connections to ports 80 and 443, and drops everything else with the chain's default policy. Set the policy last, after the accept rules, so you never cut off a connection you need while you work.

The proxy also opens connections of its own, to the apps on port 8000 and to Docker's DNS helper. The replies to those come back as established traffic, so the second rule covers them.

To test the lock, start a forgotten service on the proxy: `python3 -m http.server 8080 &`.

<details>
<summary>Show a solution</summary>

```bash
root@proxy:/# iptables -A INPUT -i lo -j ACCEPT
root@proxy:/# iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
root@proxy:/# iptables -A INPUT -p tcp -m multiport --dports 80,443 -j ACCEPT
root@proxy:/# iptables -P INPUT DROP
root@proxy:/# iptables -L INPUT -n --line-numbers
Chain INPUT (policy DROP)
num  target     prot opt source               destination
1    ACCEPT     0    --  0.0.0.0/0            0.0.0.0/0
2    ACCEPT     0    --  0.0.0.0/0            0.0.0.0/0            ctstate RELATED,ESTABLISHED
3    ACCEPT     6    --  0.0.0.0/0            0.0.0.0/0            multiport dports 80,443
root@proxy:/# curl -s app1:8000
Hello from app1
root@proxy:/# python3 -m http.server 8080 >/dev/null 2>&1 &
```

The plain listing hides which interface rule 1 applies to. Add `-v` to see `lo` in the `in` column. The proxy can still reach the apps after the policy changes, which shows the established rule works.

Pings to the proxy now go unanswered, because ICMP is not on the list. That is a choice, not an accident: decide whether you want it, and add a rule for `-p icmp` if you do.

</details>

## Check it works

On the client. The name comes from the lab's DNS:

```bash
root@client:/# dig +short shop.lab.internal
10.10.0.10
```

HTTPS works without `-k`, and requests alternate between the apps:

```bash
root@client:/# for i in 1 2 3 4; do curl -sS https://shop.lab.internal/; done
Hello from app1
Hello from app2
Hello from app1
Hello from app2
```

HTTP is redirected, keeping the path:

```bash
root@client:/# curl -sSI http://shop.lab.internal/some/page
HTTP/1.1 301 Moved Permanently
Server: nginx/1.24.0 (Ubuntu)
Date: Sun, 25 Oct 2026 07:32:19 GMT
Content-Type: text/html
Content-Length: 178
Connection: keep-alive
Location: https://shop.lab.internal/some/page

root@client:/# curl -sSL http://shop.lab.internal/
Hello from app1
```

Only the web ports get through:

```bash
root@client:/# nc -zv -w 3 shop.lab.internal 443
Connection to shop.lab.internal (10.10.0.10) 443 port [tcp/https] succeeded!
root@client:/# nc -zv -w 3 shop.lab.internal 8080
nc: connect to shop.lab.internal (10.10.0.10) port 8080 (tcp) timed out: Operation now in progress
```

And the logs agree. The apps saw requests from the proxy, not from the client:

```bash
$ docker logs app2 2>&1 | tail -n 1
10.10.0.10 - - [25/Oct/2026 07:32:34] "GET / HTTP/1.0" 200 -
```

The apps log `HTTP/1.0` because that is what nginx uses towards an upstream unless you set `proxy_http_version 1.1`.

Keep the stack running if you go on to *Diagnose traffic with tcpdump*, which uses it. To remove it:

```bash
$ docker rm -f proxy app1 app2
```

The client goes away by itself when you `exit`, because it was started with `--rm`.

## Going further

- Firewall the apps too, so port 8000 accepts connections only from `10.10.0.10`, and check that the client can no longer reach `app1:8000` directly.
- Add `proxy_next_upstream` and a short `proxy_connect_timeout`, stop `app2`, and check that every request still gets an answer.
- Add a second name, `admin.lab.internal`, with its own alias, certificate and `server` block that only allows the client's address.

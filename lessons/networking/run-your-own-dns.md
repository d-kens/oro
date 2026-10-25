On a private network you often want names for your own machines, such as `web-01` and `db-01`, that the public DNS knows nothing about. Cloud providers offer private DNS zones for this; inside a company network, an internal DNS server does the job. Either way, it is a server that answers for your names and passes every other question on.

This topic builds one in the lab with **dnsmasq**, a small DNS server that is already in the image. By the end you can serve names for a lab domain, add address, host and CNAME records, and point a machine at your server, first for one query and then for everything.

## The plan

gamma becomes the DNS server for a made-up domain, `lab.internal`. The `.internal` ending is set aside for private use, so it never clashes with a real domain on the internet. gamma will:

- answer for names under `lab.internal` itself, from its own configuration;
- pass every other question, such as `example.com` or `beta`, to the resolver it already uses, Docker's DNS service at `127.0.0.11`.

That second part makes dnsmasq a **forwarder**: it does not walk the DNS tree itself, it hands outside questions to an upstream resolver and caches the answers.

Start the lab with alpha, beta and gamma, in that order, so the addresses are 10.10.0.2, 10.10.0.3 and 10.10.0.4. If gamma is not running, start it as in the *What a network is* topic.

## Configure dnsmasq on gamma

dnsmasq reads options from a configuration file, one per line. Create `/etc/dnsmasq.d/lab.conf` on gamma with `nano`, or with a here-document as below:

```bash
root@gamma:/# cat > /etc/dnsmasq.d/lab.conf <<'EOF'
# Answer for the lab domain, never forward it
local=/lab.internal/
domain=lab.internal

# Names for the lab machines
host-record=web-01.lab.internal,10.10.0.3
host-record=db-01.lab.internal,10.10.0.4
address=/app.lab.internal/10.10.0.2
cname=www.lab.internal,web-01.lab.internal

log-queries
log-facility=/var/log/dnsmasq.log
EOF
```

What each line does:

| Option | Effect |
| --- | --- |
| `local=/lab.internal/` | Names under `lab.internal` are answered only from this server. An unknown one gets `NXDOMAIN` instead of being forwarded |
| `domain=lab.internal` | The domain this server considers local |
| `host-record=NAME,ADDR` | An A record for the name, and a matching PTR record for reverse lookups |
| `address=/NAME/ADDR` | The address for that name and **every name under it**, such as `x.app.lab.internal` |
| `cname=ALIAS,TARGET` | A CNAME record. The target should be a name dnsmasq knows, such as a `host-record` |
| `log-queries`, `log-facility` | Log every query to a file, so you can watch the server work |

dnsmasq can also hand out addresses with DHCP, which the *DHCP* topic uses. Nothing here turns that on.

Check the file, then start dnsmasq. On a normal Ubuntu server, systemd starts dnsmasq and it reads every file in `/etc/dnsmasq.d`. The container has no systemd, so start it yourself and name the file:

```bash
root@gamma:/# dnsmasq --test --conf-file=/etc/dnsmasq.d/lab.conf
dnsmasq: syntax check OK.
root@gamma:/# dnsmasq --conf-file=/etc/dnsmasq.d/lab.conf
```

It runs in the background. Check that it listens on port 53, over both UDP and TCP:

```bash
root@gamma:/# ss -uln
State  Recv-Q Send-Q Local Address:Port  Peer Address:PortProcess
UNCONN 0      0         127.0.0.11:60141      0.0.0.0:*
UNCONN 0      0            0.0.0.0:53         0.0.0.0:*
UNCONN 0      0               [::]:53            [::]:*
```

The log shows what it found at startup:

```bash
root@gamma:/# cat /var/log/dnsmasq.log
Oct 25 07:36:22 dnsmasq[45]: started, version 2.91 cachesize 150
...
Oct 25 07:36:22 dnsmasq[45]: using only locally-known addresses for lab.internal
Oct 25 07:36:22 dnsmasq[45]: reading /etc/resolv.conf
Oct 25 07:36:22 dnsmasq[45]: using nameserver 127.0.0.11#53
Oct 25 07:36:22 dnsmasq[45]: read /etc/hosts - 9 names
```

It took its upstream server from gamma's own `/etc/resolv.conf`, and it also serves the names in gamma's `/etc/hosts`.

dnsmasq reads its configuration only at startup. After every change, stop it and start it again:

```bash
root@gamma:/# pkill dnsmasq
root@gamma:/# dnsmasq --conf-file=/etc/dnsmasq.d/lab.conf
```

## Ask it directly with dig @

Before changing any machine's settings, test the server on its own. `dig @server` sends the query to that server instead of the one in `/etc/resolv.conf`:

```bash
root@alpha:/# dig @gamma web-01.lab.internal

; <<>> DiG 9.18.39-0ubuntu0.24.04.8-Ubuntu <<>> @gamma web-01.lab.internal
; (1 server found)
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 25912
;; flags: qr aa rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 1232
;; QUESTION SECTION:
;web-01.lab.internal.		IN	A

;; ANSWER SECTION:
web-01.lab.internal.	0	IN	A	10.10.0.3

;; Query time: 1 msec
;; SERVER: 10.10.0.4#53(gamma) (UDP)
;; WHEN: Sun Oct 25 07:36:23 UTC 2026
;; MSG SIZE  rcvd: 64
```

Note two things. The `aa` flag means **authoritative answer**: gamma owns this name, it did not get it from somewhere else. And the TTL is 0, dnsmasq's default for its own names, so nobody caches them and a change shows up at once. Add `local-ttl=300` to the file if you want a longer TTL.

Now try the other records:

```bash
root@alpha:/# dig @gamma www.lab.internal +noall +answer
www.lab.internal.	0	IN	CNAME	web-01.lab.internal.
web-01.lab.internal.	0	IN	A	10.10.0.3
root@alpha:/# dig @gamma anything.app.lab.internal +short
10.10.0.2
root@alpha:/# dig @gamma -x 10.10.0.4 +short
db-01.lab.internal.
root@alpha:/# dig @gamma nope.lab.internal | grep status
;; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN, id: 49932
root@alpha:/# dig @gamma example.com +short
172.66.147.243
104.20.23.154
```

The CNAME comes back with its target already resolved. The `address=` line catches any name under `app.lab.internal`. `host-record` gave db-01 a reverse record. An unknown lab name is `NXDOMAIN`, and `example.com` was forwarded. The log on gamma shows each decision:

```bash
root@gamma:/# tail -5 /var/log/dnsmasq.log
Oct 25 07:36:23 dnsmasq[45]: config nope.lab.internal is NXDOMAIN
Oct 25 07:36:23 dnsmasq[45]: query[A] example.com from 10.10.0.2
Oct 25 07:36:23 dnsmasq[45]: forwarded example.com to 127.0.0.11
Oct 25 07:36:23 dnsmasq[45]: reply example.com is 172.66.147.243
Oct 25 07:36:23 dnsmasq[45]: reply example.com is 104.20.23.154
```

`config` means the answer came from dnsmasq's own settings; `forwarded` and `reply` mean it asked upstream.

## Point alpha at it

`dig @gamma` only affects that one query. To make every program on alpha use gamma, change `/etc/resolv.conf`, which the *DNS basics* topic covered. Keep a copy of Docker's version first, so you can put it back:

```bash
root@alpha:/# cp /etc/resolv.conf /root/resolv.conf.docker
root@alpha:/# printf 'nameserver 10.10.0.4\nsearch lab.internal\n' > /etc/resolv.conf
root@alpha:/# cat /etc/resolv.conf
nameserver 10.10.0.4
search lab.internal
```

Use gamma's address, not its name: the system needs the DNS server before it can look up any name, including the server's own. The `search` line lets you use short names: `db-01` is tried as `db-01.lab.internal`.

```bash
root@alpha:/# getent hosts web-01
10.10.0.3       web-01.lab.internal
root@alpha:/# ping -c 1 db-01
PING db-01.lab.internal (10.10.0.4) 56(84) bytes of data.
64 bytes from db-01.lab.internal (10.10.0.4): icmp_seq=1 ttl=64 time=0.113 ms
root@alpha:/# curl -sI http://www.lab.internal | head -1
HTTP/1.1 200 OK
```

The last one needs nginx running on beta (`nginx`). Container names such as `beta` still work too, because gamma forwards them to Docker's DNS service.

`dig` does not apply the `search` list unless you ask, so a short name finds nothing until you add `+search`:

```bash
root@alpha:/# dig +short web-01
root@alpha:/# dig +short +search web-01
10.10.0.3
```

When you are done, put Docker's file back. Writing over the file in place with `cat` is the safe way inside a container, as with `/etc/hosts`:

```bash
root@alpha:/# cat /root/resolv.conf.docker > /etc/resolv.conf
```

Docker writes a new `/etc/resolv.conf` whenever a container is created, so a fresh alpha always starts with the original.

## When the DNS server is down

A machine with one DNS server depends on it for every name, not just your own. Stop dnsmasq on gamma while alpha still points at it:

```bash
root@gamma:/# pkill dnsmasq
```

```bash
root@alpha:/# ping -c 1 web-01
ping: web-01: Temporary failure in name resolution
root@alpha:/# dig +tries=1 +time=2 example.com
...
;; no servers could be reached
```

Now `example.com` fails as well, although the internet is fine. That is why real networks run at least two DNS servers with the same data, and list both in `resolv.conf`. Start dnsmasq again on gamma before the tasks.

## Tasks

### Task 1: Add a machine

Add two records to gamma's configuration: `app-01.lab.internal` with alpha's address, as a host record, and `api.lab.internal` as a CNAME for it. Restart dnsmasq, then check both names and the reverse lookup of 10.10.0.2 with `dig @gamma` from alpha.

<details>
<summary>Check your work</summary>

Add these lines to `/etc/dnsmasq.d/lab.conf` on gamma:

```text
host-record=app-01.lab.internal,10.10.0.2
cname=api.lab.internal,app-01.lab.internal
```

```bash
root@gamma:/# pkill dnsmasq
root@gamma:/# dnsmasq --conf-file=/etc/dnsmasq.d/lab.conf
```

```bash
root@alpha:/# dig @gamma api.lab.internal +noall +answer
api.lab.internal.	0	IN	CNAME	app-01.lab.internal.
app-01.lab.internal.	0	IN	A	10.10.0.2
root@alpha:/# dig @gamma -x 10.10.0.2 +short
app-01.lab.internal.
```

If the new names return `NXDOMAIN`, dnsmasq was not restarted, so it still has the old configuration. If `api` returns only the CNAME line with no address after it, the target is misspelled: dnsmasq accepts the line, but points the alias at a name that does not exist. Check that it matches the `host-record` line exactly.

</details>

### Task 2: A fallback that is not a fallback

On alpha, set `/etc/resolv.conf` to two servers, gamma first and Docker's service second, keeping the `search` line. Stop dnsmasq on gamma. Look up `example.com` and `web-01` with `getent hosts`, and explain the results. Restore Docker's file and start dnsmasq again afterwards.

<details>
<summary>Check your work</summary>

```bash
root@alpha:/# printf 'nameserver 10.10.0.4\nnameserver 127.0.0.11\nsearch lab.internal\n' > /etc/resolv.conf
root@alpha:/# getent hosts example.com
104.20.23.154   example.com
root@alpha:/# getent hosts web-01
root@alpha:/# echo $?
2
```

gamma's port 53 is closed, so the resolver moves on to the second server, which knows example.com. But the second server has never heard of `lab.internal`, so `web-01` fails, and `getent` exits with status 2, meaning not found. A backup DNS server only helps if it serves the same names. The mistake is thinking that any second `nameserver` line gives you redundancy.

</details>

## Quiz

**1. What does dnsmasq do with a query for `example.com` in this lab, and with one for `nope.lab.internal`?**

<details>
<summary>Show answer</summary>

It forwards `example.com` to its upstream resolver, Docker's DNS service, and returns the answer. It answers `nope.lab.internal` itself with `NXDOMAIN`, because `local=/lab.internal/` tells it never to forward names in that domain.

</details>

**2. Why does `/etc/resolv.conf` use gamma's IP address rather than the name `gamma`?**

<details>
<summary>Show answer</summary>

The resolver needs to reach a DNS server before it can look up any name. If the server were given by name, it would need DNS to find DNS. `nameserver` lines only accept addresses.

</details>

**3. You change an address in `lab.conf`, but `dig @gamma` still returns the old one. What did you forget?**

<details>
<summary>Show answer</summary>

To restart dnsmasq. It reads its configuration only at startup, so stop it with `pkill dnsmasq` and start it again. On a server run by systemd, `systemctl restart dnsmasq` does the same.

</details>

**4. A service on a server cannot be reached: from alpha, `curl http://web-01` fails with `Could not resolve host`, while `dig @gamma web-01.lab.internal` returns the right address. What do you check on alpha?**

<details>
<summary>Show answer</summary>

The DNS server works, so the problem is in alpha's own resolver settings. Check that `/etc/resolv.conf` has `nameserver` set to gamma's address, and that it has `search lab.internal`, because `web-01` is a short name and is only tried as `web-01.lab.internal` with that line. `getent hosts web-01` confirms the fix.

</details>

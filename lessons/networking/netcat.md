Netcat, the command `nc`, opens a TCP or UDP connection and connects it to your terminal. What you type goes out over the network; what comes back is printed. It can also listen and wait for a connection. That makes it the quickest way to answer "is that port open from here?" and to talk to a service without its usual client.

You have already used it in the *TCP* and *UDP* topics. By the end you can check ports with it, set timeouts, send an HTTP request by hand, chat between two machines, and copy a file across the network.

## Connecting and listening

There are several versions of netcat. The lab image has **netcat-openbsd**, the usual one on Ubuntu and Debian; options differ slightly in other versions, so check `nc -h` on an unfamiliar machine.

Netcat has two modes. As a **client**, it connects to an address and port:

```bash
root@alpha:/# nc beta 9000
```

As a **server**, with `-l`, it listens on a port and waits for one connection:

```bash
root@beta:/# nc -l 9000
```

Start the listener on beta first, then connect from alpha. Anything you type on either side and send with <kbd>Enter</kbd> appears on the other. Press <kbd>Ctrl</kbd>+<kbd>C</kbd> on either side to close the connection, and both netcats exit.

A few rules worth knowing:

- `nc -l` listens on every address of the machine, which `ss -tln` shows as `0.0.0.0:9000`.
- It accepts one connection and then exits. Add `-k` to keep listening for more.
- Ports below 1024 need root. In the lab you are root, so any port works.
- Add `-u` for UDP instead of TCP.

## Checking a port with -z and -v

Most of the time you use netcat to check whether a port answers. `-z` connects and closes again without sending anything, and `-v` reports what happened. Start the web server that comes in the image on beta; the *Serve a website with nginx* topic covers it properly:

```bash
root@beta:/# nginx
```

Then check port 80, and port 22, where nothing runs:

```bash
root@alpha:/# nc -zv beta 80
Connection to beta (10.10.0.3) 80 port [tcp/http] succeeded!
root@alpha:/# nc -zv beta 22
nc: connect to beta (10.10.0.3) port 22 (tcp) failed: Connection refused
```

`[tcp/http]` is the service name netcat finds for the port in `/etc/services`. It is only a label; it does not mean an HTTP server is really there. Add `-n` to skip both that and the name lookup.

The **exit status** tells a script the result: 0 when the port answered, 1 when it did not. That makes netcat useful in scripts that wait for a service, such as a database, to come up before starting an application:

```bash
root@alpha:/# nc -z beta 80; echo $?
Connection to beta (10.10.0.3) 80 port [tcp/http] succeeded!
0
root@alpha:/# nc -z beta 22; echo $?
1
```

You can also give a range of ports, and netcat tries each one:

```bash
root@alpha:/# nc -zv beta 20-25
nc: connect to beta (10.10.0.3) port 20 (tcp) failed: Connection refused
nc: connect to beta (10.10.0.3) port 21 (tcp) failed: Connection refused
nc: connect to beta (10.10.0.3) port 22 (tcp) failed: Connection refused
...
```

For checking many ports or many hosts, `nmap` is the better tool, and the *Scanning with nmap* topic covers it. Only check ports on machines you are allowed to test, such as your own lab.

## Timeouts with -w

When nothing answers at all, a connection attempt can hang for a long time. The kernel keeps resending the SYN, as the *TCP* topic showed, and gives up after about two minutes. `-w` sets a limit in seconds:

```bash
root@alpha:/# nc -zv -w 2 10.10.0.99 80
nc: connect to 10.10.0.99 port 80 (tcp) timed out: Operation now in progress
```

Nothing has the address `10.10.0.99` in the lab, so there is no reply of any kind. Without `-w`, the same command fails after about 3 seconds with `No route to host`, because alpha cannot find the address on its own network. A host on another network behind a firewall that drops packets would hang much longer.

Always use `-w` in scripts. In netcat-openbsd, `-w` limits the connection attempt and the final wait for data; it does not close a connection that is open and quiet.

| Message | Meaning |
| --- | --- |
| `succeeded!` | The handshake completed; a program is listening |
| `Connection refused` | The host answered with a reset; nothing listens there |
| `timed out` | No answer within the `-w` limit; packets are dropped or the host is gone |
| `No route to host` | The address cannot be reached from here |

## Speaking HTTP by hand

Netcat sends exactly what you give it, so you can talk to a text protocol such as HTTP yourself. HTTP lines must end with a carriage return and a newline; `-C` makes netcat send those when you press <kbd>Enter</kbd>.

Connect to beta's web server, then type the three lines below. The last one is an empty line, which ends the request:

```bash
root@alpha:/# nc -C beta 80
GET / HTTP/1.1
Host: beta
Connection: close

```

nginx answers with a status line, headers, a blank line and the page itself:

```text
HTTP/1.1 200 OK
Server: nginx/1.24.0 (Ubuntu)
Date: Sun, 25 Oct 2026 07:28:51 GMT
Content-Type: text/html
Content-Length: 615
Last-Modified: Sun, 25 Oct 2026 07:22:38 GMT
Connection: close
ETag: "6addae3e-267"
Accept-Ranges: bytes

<!DOCTYPE html>
<html>
...
```

`Connection: close` asks the server to close the connection after its answer, so netcat exits on its own. The *HTTP* topic explains each part of the request and response. You can do the same in one line with `printf`, which is handy in scripts:

```bash
root@alpha:/# printf 'GET / HTTP/1.1\r\nHost: beta\r\nConnection: close\r\n\r\n' | nc beta 80
```

This works for any service that speaks plain text: you can see a mail server's greeting on port 25, or check that a service on a port is the one you expect. For services that use TLS, such as HTTPS on port 443, netcat only shows scrambled bytes; the *TLS and HTTPS* topic uses `openssl s_client` for those.

## A chat and a file transfer

Netcat moves bytes in both directions, so two machines can hold a simple conversation. Start a listener on beta and connect from alpha:

```bash
root@beta:/# nc -l 9000
```

```bash
root@alpha:/# nc beta 9000
hello from alpha
```

`hello from alpha` appears on beta. Type a reply on beta, and it appears on alpha. Nothing is encrypted, and there are no names or prompts: just lines going back and forth over one TCP connection. <kbd>Ctrl</kbd>+<kbd>C</kbd> ends it for both.

The same connection can carry a file. On the receiving side, redirect what arrives into a file. On the sending side, feed the file into netcat and add `-N`, so netcat closes the connection when the file ends; otherwise both sides wait for more:

```bash
root@beta:/# nc -l 9000 > services.copy
```

```bash
root@alpha:/# nc -N beta 9000 < /etc/services
```

Both commands return when the transfer is done. Check that the copy is identical by comparing checksums on each machine:

```bash
root@alpha:/# sha256sum /etc/services
f6183055fd949f9c53d49ee620f85d0150123ea691d25ed1bba0c641b4ee2f48  /etc/services
```

```bash
root@beta:/# sha256sum services.copy
f6183055fd949f9c53d49ee620f85d0150123ea691d25ed1bba0c641b4ee2f48  services.copy
```

The same hash means the same bytes. This is handy inside a private network where SSH is not set up, but the data travels unencrypted and anyone on the path can read it. For anything sensitive, use `scp`, covered with the *SSH and tunnels* topic.

## Tasks

### Task 1: Wait for a service

Write a one-line shell loop on alpha that checks port 80 on beta every second and prints `up` as soon as it answers. Make sure nginx is stopped on beta first (`nginx -s stop`), start your loop, and then start nginx on beta while the loop runs.

<details>
<summary>Check your work</summary>

```bash
root@alpha:/# until nc -z -w 1 beta 80 2>/dev/null; do sleep 1; done; echo up
up
```

`until` repeats the loop while the command fails, using netcat's exit status. `-w 1` keeps each try short, and `2>/dev/null` hides netcat's messages, which go to standard error, so only `up` is printed. A common mistake is leaving out `-z`: netcat then connects and waits for input, and the loop never moves on.

</details>

### Task 2: Copy a directory

Copy the whole `/etc/nginx` directory from beta to alpha using netcat and `tar`. Then check that the file count matches on both sides.

<details>
<summary>Check your work</summary>

This time alpha receives and beta sends. `tar` writes the archive to its output with `-f -` and reads it from its input the same way:

```bash
root@alpha:/# mkdir /tmp/copy && nc -l 9000 | tar -xf - -C /tmp/copy
```

```bash
root@beta:/# tar -cf - /etc/nginx | nc -N alpha 9000
tar: Removing leading `/' from member names
```

```bash
root@alpha:/# find /tmp/copy/etc/nginx -type f | wc -l
13
```

```bash
root@beta:/# find /etc/nginx -type f | wc -l
13
```

Both counts should match. If alpha's netcat never exits, you probably left out `-N` on the sender. If beta prints `Connection refused`, the listener on alpha was not started first.

</details>

## Quiz

**1. What is the difference between `nc beta 9000` and `nc -l 9000`?**

<details>
<summary>Show answer</summary>

`nc beta 9000` is a client: it connects to port 9000 on beta. `nc -l 9000` is a server: it listens on port 9000 on the machine where you run it and waits for a connection.

</details>

**2. Why should a script that uses `nc -z` also use `-w`?**

<details>
<summary>Show answer</summary>

If packets are dropped and no answer comes back, the connection attempt can hang for about two minutes while the kernel resends the SYN. `-w` sets a limit, so the script gets a failure quickly and can retry or report it.

</details>

**3. You send a file with `nc beta 9000 < backup.tar` and the command never returns, although the file has clearly arrived. What did you leave out?**

<details>
<summary>Show answer</summary>

`-N`. Without it, netcat-openbsd does not close the connection when its input ends, so both sides keep waiting for more data. With `-N`, it closes its side at the end of the file and the receiver sees the end of the stream.

</details>

**4. A service on a server cannot be reached. From an application server, `nc -zv -w 3 db-01 5432` prints `succeeded!`, but the application still logs connection errors to the database. What does that tell you, and what would you check next?**

<details>
<summary>Show answer</summary>

The network path is fine: the name resolves, packets get through, and something listens on port 5432. The fault is above that. Check that the application uses the same host name and port as your test, its credentials, whether it uses TLS the server does not expect, and the database's own logs for rejected connections.

</details>

Almost every service you run in the cloud speaks HTTP: websites, APIs, health checks, the calls a load balancer makes to see whether a server is alive. When a request fails, the answer is usually written in plain text in the response, if you know where to look.

HTTP is a text conversation over a TCP connection. The client sends a request, the server sends back a response, and both follow a fixed shape. By the end you can read a request and a response line by line, pick the right method, tell what a status code means from its first digit, and watch the whole exchange with curl.

## A request and a response

Start a small web server on `beta`. Python has one built in that serves the files in the current directory:

```bash
root@beta:/# mkdir -p /srv/site && cd /srv/site
root@beta:/srv/site# echo "<h1>Hello from beta</h1>" > index.html
root@beta:/srv/site# python3 -m http.server 8000
Serving HTTP on 0.0.0.0 port 8000 (http://0.0.0.0:8000/) ...
```

Leave it running. On `alpha`, ask for the page with `curl -v`. The `-v` (verbose) flag prints what curl sends, marked `>`, and what it receives, marked `<`:

```bash
root@alpha:/# curl -v http://beta:8000/
* Host beta:8000 was resolved.
* IPv6: (none)
* IPv4: 10.10.0.3
*   Trying 10.10.0.3:8000...
* Connected to beta (10.10.0.3) port 8000
> GET / HTTP/1.1
> Host: beta:8000
> User-Agent: curl/8.5.0
> Accept: */*
>
* HTTP 1.0, assume close after body
< HTTP/1.0 200 OK
< Server: SimpleHTTP/0.6 Python/3.12.3
< Date: Sun, 25 Oct 2026 07:25:58 GMT
< Content-type: text/html
< Content-Length: 25
< Last-Modified: Sun, 25 Oct 2026 07:25:57 GMT
<
* Closing connection
<h1>Hello from beta</h1>
```

The lines starting with `*` are curl's own notes: the name lookup and the TCP connection, which earlier topics covered. Then comes HTTP itself.

The **request** has three parts:

- The **request line**: `GET / HTTP/1.1`. A method, a path, and the protocol version.
- **Headers**: one `Name: value` per line, giving extra information. `Host` says which site the client wants.
- A blank line, then an optional **body**. A `GET` has no body.

The **response** has the same shape:

- The **status line**: `HTTP/1.0 200 OK`. The version, a three-digit **status code**, and a short reason phrase.
- Headers, such as `Content-Type` (what kind of data the body is) and `Content-Length` (how many bytes it is).
- A blank line, then the body: here, the 25 bytes of `index.html`.

On beta, the server logs one line per request, with the client's address, the request line and the status code:

```text
10.10.0.2 - - [25/Oct/2026 07:25:58] "GET / HTTP/1.1" 200 -
```

Python's server answers with `HTTP/1.0` even though curl asked in 1.1. Each side states its own version, and they settle on what both understand.

## Typing a request by hand

Because HTTP/1.1 is plain text, you can send a request without curl at all. The *Netcat* topic showed how to open a raw TCP connection; here you type the request into it. Each line must end in a carriage return and a newline (`\r\n`), and a blank line ends the headers:

```bash
root@alpha:/# printf "GET / HTTP/1.1\r\nHost: beta\r\n\r\n" | nc -q 1 beta 8000
HTTP/1.0 200 OK
Server: SimpleHTTP/0.6 Python/3.12.3
Date: Sun, 25 Oct 2026 07:26:13 GMT
Content-type: text/html
Content-Length: 25
Last-Modified: Sun, 25 Oct 2026 07:25:57 GMT

<h1>Hello from beta</h1>
```

This is everything a browser does when it fetches a page, apart from the many extra headers it adds. It is worth doing once, because it shows that there is nothing hidden: if a request fails, the reason is in those lines.

## Methods

The **method** says what the client wants to do with the resource named by the path.

| Method | Meaning | Has a request body |
| --- | --- | --- |
| `GET` | Fetch the resource | No |
| `HEAD` | Same as GET, but only the headers come back | No |
| `POST` | Send data to be processed, often to create something | Yes |
| `PUT` | Replace the resource with the body sent | Yes |
| `PATCH` | Change part of the resource | Yes |
| `DELETE` | Remove the resource | Usually no |

`GET` and `HEAD` should never change anything on the server, so they are safe to retry. `PUT` and `DELETE` should give the same result if repeated. `POST` makes no such promise: sending the same order twice may create two orders. Load balancers and HTTP clients use these rules to decide what they may retry after a timeout.

curl sends `GET` by default. `-I` sends `HEAD`, which is handy for checking a server without downloading a large body. `-X` sets any method:

```bash
root@alpha:/# curl -I http://beta:8000/
HTTP/1.0 200 OK
Server: SimpleHTTP/0.6 Python/3.12.3
Date: Sun, 25 Oct 2026 07:25:58 GMT
Content-type: text/html
Content-Length: 25
Last-Modified: Sun, 25 Oct 2026 07:25:57 GMT

root@alpha:/# curl -i -X POST http://beta:8000/
HTTP/1.0 501 Unsupported method ('POST')
Server: SimpleHTTP/0.6 Python/3.12.3
Date: Sun, 25 Oct 2026 07:25:58 GMT
Connection: close
Content-Type: text/html;charset=utf-8
Content-Length: 357
...
```

`-i` includes the response headers before the body, without the rest of the verbose output. The file server only knows how to hand out files, so it refuses `POST` with a 501. The *HTTP headers, redirects and JSON* topic runs a server that accepts it.

## Status codes

The first digit of a status code tells you who is responsible for the outcome. You rarely need to memorise more than that and a handful of common codes.

| Class | Meaning | Common codes |
| --- | --- | --- |
| `1xx` | Informational, the request continues | `101 Switching Protocols` |
| `2xx` | Success | `200 OK`, `201 Created`, `204 No Content` |
| `3xx` | Go somewhere else | `301 Moved Permanently`, `302 Found`, `304 Not Modified` |
| `4xx` | The client got something wrong | `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `405 Method Not Allowed` |
| `5xx` | The server failed | `500 Internal Server Error`, `502 Bad Gateway`, `503 Service Unavailable`, `504 Gateway Timeout` |

Ask for a file that does not exist:

```bash
root@alpha:/# curl -i http://beta:8000/nope
HTTP/1.0 404 File not found
Server: SimpleHTTP/0.6 Python/3.12.3
Date: Sun, 25 Oct 2026 07:25:58 GMT
Connection: close
Content-Type: text/html;charset=utf-8
Content-Length: 335

<!DOCTYPE HTML>
...
        <p>Error code: 404</p>
        <p>Message: File not found.</p>
...
```

A 404 is still a successful conversation: the network worked, the server is running, and it answered. That is very different from getting no response at all:

```bash
root@alpha:/# curl http://beta:9999/
curl: (7) Failed to connect to beta port 9999 after 0 ms: Couldn't connect to server
```

Here nothing is listening on port 9999, so there is no HTTP at all, only a refused TCP connection. When you troubleshoot, always ask first whether you got a status code. If you did, the network is fine and the problem is in the application or its configuration. The `502` and `504` codes come from a proxy in front of the application, and mean the proxy could not get a good answer from it; the *Reverse proxy and load balancing* topic covers them.

## Real sites, and HTTP/2

The same commands work against any site. On alpha, fetch example.com over plain HTTP with `-v`, sending the body to `/dev/null` so only the conversation shows. A few response headers are trimmed here, and your addresses and dates will differ:

```bash
root@alpha:/# curl -sv http://example.com/ -o /dev/null
* Host example.com:80 was resolved.
* IPv6: (none)
* IPv4: 104.20.23.154, 172.66.147.243
*   Trying 104.20.23.154:80...
* Connected to example.com (104.20.23.154) port 80
> GET / HTTP/1.1
> Host: example.com
> User-Agent: curl/8.5.0
> Accept: */*
>
< HTTP/1.1 200 OK
< Date: Sun, 25 Oct 2026 07:26:11 GMT
< Content-Type: text/html; charset=utf-8
< Transfer-Encoding: chunked
< Connection: keep-alive
< Last-Modified: Sat, 24 Oct 2026 20:05:47 GMT
< Allow: GET, HEAD
< Age: 10311
<
* Connection #0 to host example.com left intact
```

Two differences from the lab server:

- `Transfer-Encoding: chunked` replaces `Content-Length`. The server sends the body in pieces, each with its own size, so it can start before it knows the total.
- `Connection: keep-alive` and "left intact": the TCP connection stays open so the next request can reuse it, saving a new handshake.

Over HTTPS, most sites use **HTTP/2**. It carries the same methods, headers and status codes, but in a binary format instead of text, and it can send many requests at once over one connection. curl and the server agree on it during the TLS handshake:

```bash
root@alpha:/# curl -s -o /dev/null -w "%{http_version} %{http_code}\n" https://example.com/
2 200
root@alpha:/# curl -s --http1.1 -o /dev/null -w "%{http_version} %{http_code}\n" https://example.com/
1.1 200
```

`-w` prints values about the transfer after it finishes. In HTTP/2 output, header names are in lower case, and the status line is just `HTTP/2 200` with no reason phrase. You cannot type HTTP/2 by hand with netcat, which is one reason tools like curl matter. The *TLS and HTTPS* topic covers the encryption underneath.

## Tasks

### Task 1: Read the conversation

With the Python server running on beta, create a second file there called `health.txt` containing the word `ok`. From alpha, fetch it with `curl -v`. Write down the request line, the value of the `Host` header, the status code, the `Content-Type` and the `Content-Length`. Then fetch `/health.txt` again with `-I` and compare.

<details>
<summary>Check your work</summary>

Stop the server with <kbd>Ctrl</kbd>+<kbd>C</kbd>, create the file, and start it again (or create the file from a second shell on beta with `docker exec -it beta bash`):

```bash
root@beta:/srv/site# echo ok > health.txt
root@beta:/srv/site# python3 -m http.server 8000
```

```bash
root@alpha:/# curl -v http://beta:8000/health.txt
...
> GET /health.txt HTTP/1.1
> Host: beta:8000
...
< HTTP/1.0 200 OK
< Server: SimpleHTTP/0.6 Python/3.12.3
< Date: Sun, 25 Oct 2026 07:40:12 GMT
< Content-type: text/plain
< Content-Length: 3
...
ok
```

The length is 3 because `echo` adds a newline after `ok`. The server guesses `text/plain` from the `.txt` extension. With `-I`, the same status and headers come back with no body, and beta's log shows `HEAD` instead of `GET`. If you get `Couldn't connect to server`, the Python server is not running, or you forgot `:8000`.

</details>

### Task 2: Sort the failures

From alpha, run these four commands and note for each one whether you got an HTTP status code, and if so which class it is in:

1. `curl -i http://beta:8000/`
2. `curl -i http://beta:8000/missing.html`
3. `curl -i -X DELETE http://beta:8000/index.html`
4. `curl -i http://beta:8001/`

<details>
<summary>Check your work</summary>

```text
1. HTTP/1.0 200 OK                                   2xx, success
2. HTTP/1.0 404 File not found                       4xx, the client asked for something that is not there
3. HTTP/1.0 501 Unsupported method ('DELETE')        5xx, the server does not implement DELETE
4. curl: (7) Failed to connect to beta port 8001     no status code, nothing listening
```

Only the last one is a network-level failure. The first three all prove that alpha reached a working HTTP server. A common mistake is to treat a 404 or 501 as "the server is down": the server is up, and it told you exactly what it thought of the request.

</details>

## Quiz

**1. What are the three parts of an HTTP request, and how does the server know where the headers end?**

<details>
<summary>Show answer</summary>

The request line (method, path, version), the headers, and an optional body. The headers end at the first empty line, after which anything else is the body.

</details>

**2. A monitoring tool reports `503 Service Unavailable` from web-01. Another reports `Connection refused` from web-02. Which server has a running HTTP server?**

<details>
<summary>Show answer</summary>

web-01. A 503 is an HTTP response, so something accepted the connection and answered, even if it says it cannot serve the request right now. `Connection refused` from web-02 means nothing is listening on that port at all.

</details>

**3. Why is it safer for a client to retry a `GET` after a timeout than a `POST`?**

<details>
<summary>Show answer</summary>

`GET` should only read, so sending it twice changes nothing. `POST` may create something each time it is received, so if the first request reached the server and only the response was lost, a retry could create a duplicate.

</details>

**4. You run `curl -I https://example.com/` and see `HTTP/2 200` with lower-case header names, but your colleague's script that reads `Content-Type:` with a capital C finds nothing. What is going on?**

<details>
<summary>Show answer</summary>

The connection used HTTP/2, where header names are sent in lower case. Header names in HTTP are case-insensitive at every version, so the script should compare them without regard to case. Forcing `--http1.1` would hide the problem but not fix it.

</details>

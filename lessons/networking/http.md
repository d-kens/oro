Almost every service you run in the cloud speaks HTTP: websites, APIs, health checks, the calls a load balancer makes to see whether a server is alive. When a request fails, the answer is usually written in plain text in the response, if you know where to look.

HTTP is a text conversation over a TCP connection. The client sends a request, the server sends back a response, and both follow a fixed shape. This topic covers that shape, methods and status codes, the headers that matter, redirects, and sending JSON. By the end you can read a request and a response line by line, tell what a status code means from its first digit, debug a redirect, and call an API with curl.

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

Because HTTP/1.1 is plain text, you can also send a request without curl. `nc`, from the *Ports and sockets* topic, opens the TCP connection, and you supply the text. Each line must end in a carriage return and a newline (`\r\n`), and a blank line ends the headers:

```bash
root@alpha:/# printf "GET / HTTP/1.1\r\nHost: beta\r\n\r\n" | nc -N beta 8000
HTTP/1.0 200 OK
Server: SimpleHTTP/0.6 Python/3.12.3
Date: Sun, 25 Oct 2026 07:26:13 GMT
Content-type: text/html
Content-Length: 25
Last-Modified: Sun, 25 Oct 2026 07:25:57 GMT

<h1>Hello from beta</h1>
```

This is everything a browser does when it fetches a page, apart from the extra headers it adds. If a request fails, the reason is in those lines.

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

curl sends `GET` by default. `-I` sends `HEAD`, which is handy for checking a server without downloading a large body. `-X` sets any method, and `-i` prints the response headers before the body:

```bash
root@alpha:/# curl -i -X POST http://beta:8000/
HTTP/1.0 501 Unsupported method ('POST')
Server: SimpleHTTP/0.6 Python/3.12.3
...
```

The file server only knows how to hand out files, so it refuses `POST` with a 501.

## Status codes

The first digit of a status code tells you who is responsible for the outcome. You rarely need to memorise more than that and a handful of common codes.

| Class | Meaning | Common codes |
| --- | --- | --- |
| `1xx` | Informational, the request continues | `101 Switching Protocols` |
| `2xx` | Success | `200 OK`, `201 Created`, `204 No Content` |
| `3xx` | Go somewhere else | `301 Moved Permanently`, `302 Found`, `304 Not Modified` |
| `4xx` | The client got something wrong | `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `405 Method Not Allowed` |
| `5xx` | The server failed | `500 Internal Server Error`, `502 Bad Gateway`, `503 Service Unavailable`, `504 Gateway Timeout` |

Ask for a file that does not exist, and then for a port where nothing listens:

```bash
root@alpha:/# curl -i http://beta:8000/nope
HTTP/1.0 404 File not found
...
root@alpha:/# curl http://beta:9999/
curl: (7) Failed to connect to beta port 9999 after 0 ms: Couldn't connect to server
```

A 404 is still a successful conversation: the network worked, the server is running, and it answered. The second request got no HTTP at all, only a refused TCP connection. When you troubleshoot, always ask first whether you got a status code. If you did, the network is fine and the problem is in the application or its configuration. The `502` and `504` codes come from a proxy in front of the application, and mean the proxy could not get a good answer from it; the *Reverse proxy and load balancing* topic covers them.

## Headers

Stop the file server with <kbd>Ctrl</kbd>+<kbd>C</kbd>. In its place, run a small server that answers every `GET` with a JSON description of the request it received, has two paths that redirect, and accepts JSON sent with `POST`. Paste this whole block into beta's shell:

```bash
root@beta:/# cat > /root/echo.py <<'EOF'
import json
from http.server import BaseHTTPRequestHandler, HTTPServer

class Handler(BaseHTTPRequestHandler):
    def reply(self, code, data):
        body = (json.dumps(data, indent=2) + "\n").encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def redirect(self, where):
        self.send_response(301)
        self.send_header("Location", where)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        if self.path == "/old":
            self.redirect("/new")
        elif self.path == "/loop":
            self.redirect("/loop")
        else:
            self.reply(200, {"path": self.path, "headers": dict(self.headers)})

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length)
        try:
            data = json.loads(raw)
        except ValueError:
            self.reply(400, {"error": "body is not valid JSON"})
            return
        self.reply(201, {"received": data})

HTTPServer(("", 8000), Handler).serve_forever()
EOF
root@beta:/# python3 /root/echo.py
```

curl adds a header with `-H`, as many times as you need, and `-A` sets the user agent. The server shows what arrived:

```bash
root@alpha:/# curl -H "Accept: application/json" -H "X-Request-Id: 42" -A "web-01-healthcheck" http://beta:8000/
{
  "path": "/",
  "headers": {
    "Host": "beta:8000",
    "User-Agent": "web-01-healthcheck",
    "Accept": "application/json",
    "X-Request-Id": "42"
  }
}
```

These are the request headers you will meet most:

| Header | Says |
| --- | --- |
| `Host` | Which site the client wants, because one server often hosts many |
| `User-Agent` | Which program is asking |
| `Accept` | Which response formats the client can handle |
| `Content-Type` | The format of the request body, when there is one |
| `Authorization` | Credentials or a token |

`Host` is the most important. One IP address can serve many sites, and the server picks which one by reading `Host`. If you call a server by its IP address, or through a tunnel, and get the wrong site or a 404, a wrong `Host` is a likely reason. Headers starting with `X-` are not part of the standard; applications and proxies make them up for their own use, such as tracing one request through several services. `Authorization` headers carry secrets, and `curl -v` prints them, so do not paste its output into tickets or chat.

On the response side, a group of headers controls **caching**: whether a browser, a proxy or a content delivery network may keep a copy and reuse it instead of asking again. `Cache-Control: max-age=14400` allows a copy to be reused for four hours, and `Cache-Control: no-store` forbids keeping one. `Age` says how many seconds an answer has sat in a cache. `curl -sI https://example.org/` shows real values. Caching explains a common puzzle: you deploy a change, but some users still see the old page, because a cache has not yet expired its copy.

## Redirects

A `3xx` status with a `Location` header tells the client to ask somewhere else. Sites use redirects to move pages, to send `http://` to `https://`, and to add or remove `www.`. By default curl shows the redirect and stops, which is what you want when you are debugging one. Add `-L` to follow it. With `-i` as well, you see each response in turn; `grep` keeps just the status lines and the `Location`:

```bash
root@alpha:/# curl -siL http://beta:8000/old | grep -E '^(HTTP|Location)'
HTTP/1.0 301 Moved Permanently
Location: /new
HTTP/1.0 200 OK
```

`301 Moved Permanently` means the resource has a new address for good, and browsers may cache the redirect for a long time, so use `302 Found`, a temporary redirect, while testing.

A **redirect loop** happens when the redirects never end at a real page. The `/loop` path redirects to itself:

```bash
root@alpha:/# curl -L http://beta:8000/loop
curl: (47) Maximum (50) redirects followed
```

In a browser the same thing shows as "too many redirects". In real systems a loop usually comes from two layers disagreeing: for example, a load balancer that ends HTTPS and talks plain HTTP to the server, and a server that redirects every plain HTTP request to HTTPS.

## Sending JSON

**JSON** is the usual format for API bodies: objects in braces with quoted keys, lists in square brackets, strings in double quotes, and numbers, `true`, `false` and `null` as they are.

To send it with curl, put the body after `-d`, which makes the request a `POST` on its own. Wrap the JSON in single quotes so the shell leaves the double quotes alone, and set `Content-Type`, because curl otherwise labels the body as form data:

```bash
root@alpha:/# curl -i -H "Content-Type: application/json" -d '{"name": "web-01", "port": 8080}' http://beta:8000/servers
HTTP/1.0 201 Created
Server: BaseHTTP/0.6 Python/3.12.3
Date: Sun, 25 Oct 2026 07:26:41 GMT
Content-Type: application/json
Content-Length: 63

{
  "received": {
    "name": "web-01",
    "port": 8080
  }
}
```

Many real APIs check `Content-Type` and answer `415 Unsupported Media Type` or a confusing `400` without it. Newer versions of curl have `--json`, which sets both `Content-Type` and `Accept` for you. Unquoted keys, single quotes and a trailing comma are the usual mistakes in JSON. To read a JSON response that arrives on one long line, pipe it through `python3 -m json.tool`.

## HTTP/2

Over HTTPS, most sites use **HTTP/2**. It carries the same methods, headers and status codes in a binary format, and can send many requests at once over one connection. curl and the server agree on it during the TLS handshake; `curl -s -o /dev/null -w "%{http_version}\n" https://example.com/` prints `2`. In HTTP/2 output, header names are in lower case and the status line has no reason phrase. The *TLS and HTTPS* topic covers the encryption underneath.

## Tasks

### Task 1: Sort the failures

Start the file server on beta again (`python3 -m http.server 8000` in `/srv/site`). From alpha, run these four commands and note for each one whether you got an HTTP status code, and if so which class it is in:

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

### Task 2: Create a server record

With the echo server running on beta, send this JSON to `http://beta:8000/servers` with `POST`, as JSON, and check that you get `201 Created` and the same data back:

```text
{"name": "db-01", "port": 5432, "tags": ["database", "primary"], "public": false}
```

Then send it again with the comma after `5432` removed and note the status code.

<details>
<summary>Check your work</summary>

```bash
root@alpha:/# curl -i -H "Content-Type: application/json" -d '{"name": "db-01", "port": 5432, "tags": ["database", "primary"], "public": false}' http://beta:8000/servers
HTTP/1.0 201 Created
...
{
  "received": {
    "name": "db-01",
    "port": 5432,
    "tags": [
      "database",
      "primary"
    ],
    "public": false
  }
}
```

Without the comma the server answers `HTTP/1.0 400 Bad Request` and `"error": "body is not valid JSON"`. If the shell shows a `>` prompt and waits for more input, the quoting is broken: the whole body must sit inside one pair of single quotes. Press <kbd>Ctrl</kbd>+<kbd>C</kbd> and type it again.

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

**3. Why does a server need the `Host` header, when the client has already connected to its IP address?**

<details>
<summary>Show answer</summary>

Because many sites can share one IP address and port. The connection only reaches the machine; `Host` tells the server which of its sites the request is for.

</details>

**4. A site works over plain HTTP from inside the network, but browsers say "too many redirects" when users visit it through the load balancer over HTTPS. What is a likely cause?**

<details>
<summary>Show answer</summary>

The load balancer ends HTTPS and forwards the request to the server over plain HTTP. The server sees plain HTTP and redirects to HTTPS, the browser follows, and the load balancer again forwards plain HTTP, forever. Check with `curl -iL` and look at each `Location`. The fix is for the server to trust a header from the load balancer that says the original request was HTTPS, or to stop redirecting at the server.

</details>

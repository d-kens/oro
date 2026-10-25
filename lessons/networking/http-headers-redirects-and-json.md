Most of what goes wrong between an HTTP client and a server is decided by a few headers: a wrong `Host`, a missing `Content-Type`, a redirect that points back at itself, a cache that keeps an old answer. APIs add one more thing to get right, which is the JSON in the body.

This topic builds on the *HTTP* topic and uses a small server you write yourself, so everything runs inside the lab with no internet needed. By the end you can set and read the headers that matter, follow and debug redirects, and send and read JSON with curl.

## A server that shows you what it got

On `beta`, create a small Python server. It answers every `GET` with a JSON description of the request it received, has two paths that redirect, and accepts JSON sent with `POST`. Paste this whole block into beta's shell:

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

The server prints nothing until a request arrives. Leave it running and work from `alpha`.

## Request headers

Ask for any path, and the server tells you which headers curl sent:

```bash
root@alpha:/# curl http://beta:8000/hello
{
  "path": "/hello",
  "headers": {
    "Host": "beta:8000",
    "User-Agent": "curl/8.5.0",
    "Accept": "*/*"
  }
}
```

These are the request headers you will meet most:

| Header | Says | Example |
| --- | --- | --- |
| `Host` | Which site the client wants, because one server often hosts many | `Host: example.com` |
| `User-Agent` | Which program is asking | `User-Agent: curl/8.5.0` |
| `Accept` | Which response formats the client can handle | `Accept: application/json` |
| `Content-Type` | The format of the request body, when there is one | `Content-Type: application/json` |
| `Authorization` | Credentials or a token | `Authorization: Bearer ...` |

`Host` is the most important. One IP address can serve many sites, and the server picks which one by reading `Host`. The *Serve a website with nginx* topic sets this up. If you call a server by its IP address, or through a tunnel, and get the wrong site or a 404, a wrong `Host` is a likely reason.

curl adds a header with `-H`, and `-A` is a short way to set the user agent. Use `-H` as many times as you need:

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

Your header replaced curl's default `Accept` rather than adding a second one. Headers starting with `X-` are not part of the standard; applications and proxies make them up for their own use, such as tracing one request through several services.

`Authorization` headers carry secrets. Do not paste them into tickets or chat, and be careful with `curl -v` output, which prints them.

## Response headers and caching

On the response side, `Content-Type` and `Content-Length` describe the body, as the *HTTP* topic showed. A second group controls **caching**: whether a browser, a proxy or a content delivery network may keep a copy and reuse it instead of asking again.

```bash
root@alpha:/# curl -sI https://example.org/
HTTP/2 200
date: Sun, 25 Oct 2026 07:26:46 GMT
content-type: text/html; charset=utf-8
last-modified: Sat, 24 Oct 2026 11:34:40 GMT
allow: GET, HEAD
accept-ranges: bytes
age: 6569
cache-control: max-age=14400
```

A few provider-specific headers are trimmed here, and your values will differ.

| Header | Meaning |
| --- | --- |
| `Cache-Control: max-age=14400` | A copy may be reused for 14,400 seconds (four hours) without asking again |
| `Cache-Control: no-store` | Never keep a copy, for private or fast-changing data |
| `Age: 6569` | This answer came from a cache, where it had been stored for 6,569 seconds |
| `Last-Modified`, `ETag` | A date or a fingerprint of this version, so a client can ask "has it changed?" |

That last question is a **conditional request**. The client sends the date it already has, and if nothing has changed the server answers `304 Not Modified` with no body:

```bash
root@alpha:/# curl -s -o /dev/null -w "%{http_code}\n" -H "If-Modified-Since: Sun, 25 Oct 2026 07:00:00 GMT" https://example.com/
304
```

Caching explains a common puzzle: you deploy a change, but some users still see the old page. Look at `Cache-Control` and `Age` on the response they get. If `Age` is large, the answer came from a cache that has not yet expired its copy.

## Redirects

A `3xx` status with a `Location` header tells the client to ask somewhere else. Sites use redirects to move pages, to send `http://` to `https://`, and to add or remove `www.`.

```bash
root@alpha:/# curl -i http://beta:8000/old
HTTP/1.0 301 Moved Permanently
Server: BaseHTTP/0.6 Python/3.12.3
Date: Sun, 25 Oct 2026 07:26:35 GMT
Location: /new
Content-Length: 0

```

By default curl does not follow redirects. It shows you the `301` and stops, which is what you want when you are debugging one. Add `-L` to follow them. With `-i` as well, you see each response in turn:

```bash
root@alpha:/# curl -iL http://beta:8000/old
HTTP/1.0 301 Moved Permanently
Server: BaseHTTP/0.6 Python/3.12.3
Date: Sun, 25 Oct 2026 07:26:35 GMT
Location: /new
Content-Length: 0

HTTP/1.0 200 OK
Server: BaseHTTP/0.6 Python/3.12.3
Date: Sun, 25 Oct 2026 07:26:35 GMT
Content-Type: application/json
Content-Length: 118

{
  "path": "/new",
  ...
}
```

| Code | Meaning |
| --- | --- |
| `301 Moved Permanently` | The resource has a new address for good; clients and search engines may remember it |
| `302 Found` | Temporarily elsewhere; ask the original address next time |
| `307`, `308` | Like 302 and 301, but the client must keep the same method and body |

Browsers cache `301` redirects, sometimes for a long time. If you set one up by mistake, users may keep being sent to the wrong place after you fix the server. Use `302` while testing.

A **redirect loop** happens when the redirects never end at a real page. The `/loop` path redirects to itself:

```bash
root@alpha:/# curl -L http://beta:8000/loop
curl: (47) Maximum (50) redirects followed
```

curl gives up after 50. In a browser the same thing shows as "too many redirects". In real systems a loop usually comes from two layers disagreeing: for example, a load balancer that ends HTTPS and talks plain HTTP to the server, and a server that redirects every plain HTTP request to HTTPS. `--max-redirs` sets a lower limit, and `-w` shows how far curl got:

```bash
root@alpha:/# curl -sL --max-redirs 5 -o /dev/null -w "%{http_code} %{num_redirects}\n" http://beta:8000/loop
301 5
```

## Sending and reading JSON

**JSON** is the usual format for API bodies: objects in braces with quoted keys, lists in square brackets, strings in double quotes, and numbers, `true`, `false` and `null` as they are.

To send it with curl, put the body after `-d`. `-d` makes the request a `POST` on its own. Wrap the JSON in single quotes so the shell leaves the double quotes alone, and set `Content-Type`, because curl otherwise labels the body as form data:

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

The server parsed the body and sent it back, with `201 Created`. Leave out the `-H` and look at what curl actually sends:

```bash
root@alpha:/# curl -sv -d '{"a": 1}' http://beta:8000/x 2>&1 | grep '^>'
> POST /x HTTP/1.1
> Host: beta:8000
> User-Agent: curl/8.5.0
> Accept: */*
> Content-Length: 8
> Content-Type: application/x-www-form-urlencoded
>
```

This small server does not check `Content-Type`, but many real APIs do, and answer `415 Unsupported Media Type` or a confusing `400`. Newer versions of curl have `--json`, which sets both `Content-Type` and `Accept` for you:

```bash
root@alpha:/# curl --json '{"name": "db-01"}' http://beta:8000/servers
{
  "received": {
    "name": "db-01"
  }
}
```

Send something that is not valid JSON, and the server says so:

```bash
root@alpha:/# curl -i -H "Content-Type: application/json" -d '{name: web-01}' http://beta:8000/servers
HTTP/1.0 400 Bad Request
...

{
  "error": "body is not valid JSON"
}
```

Keys must be in double quotes, and so must string values. Unquoted keys, single quotes and a trailing comma are the usual mistakes.

To read a JSON response that arrives on one long line, pipe it through Python's formatter, which is already in the lab image. `jq` is a popular dedicated tool, and you can add it with `apt-get update && apt-get install -y jq`.

```bash
root@alpha:/# curl -s http://beta:8000/ | python3 -m json.tool --sort-keys
```

## Tasks

### Task 1: Pretend to be another site

Some servers decide what to send from the `Host` header alone. From alpha, send a request to beta's echo server that claims to be for `api.example.com`, with the user agent `web-01-healthcheck` and an `Accept` of `application/json`. Check in the echo that the server saw all three.

<details>
<summary>Check your work</summary>

```bash
root@alpha:/# curl -H "Host: api.example.com" -A "web-01-healthcheck" -H "Accept: application/json" http://beta:8000/
{
  "path": "/",
  "headers": {
    "Host": "api.example.com",
    "User-Agent": "web-01-healthcheck",
    "Accept": "application/json"
  }
}
```

The TCP connection still went to beta, because the URL says `beta:8000`. Only the `Host` header changed. This is how you test a site on a new server before its DNS name points there. A common mistake is to write `-H "Host:api.example.com"` with no space, which works, or `-H "Host api.example.com"` with no colon, which curl does not send as a header at all.

</details>

### Task 2: Create a server record

Send this JSON to `http://beta:8000/servers` with `POST`, as JSON, and check that you get `201 Created` and the same data back:

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

**1. Why does a server need the `Host` header, when the client has already connected to its IP address?**

<details>
<summary>Show answer</summary>

Because many sites can share one IP address and port. The connection only reaches the machine; `Host` tells the server which of its sites the request is for.

</details>

**2. What does curl do by default when it gets a `301`, and how do you make it continue?**

<details>
<summary>Show answer</summary>

It shows the response, including the `Location` header, and stops. `-L` makes it follow the redirect, up to 50 by default.

</details>

**3. After you change a page, some users still see the old version. Which two response headers would you check first, and what would they tell you?**

<details>
<summary>Show answer</summary>

`Cache-Control`, to see how long copies may be reused, and `Age`, to see whether the answer came from a cache and how old it is. A large `Age` within the `max-age` means a cache is still serving its old copy.

</details>

**4. A site works over plain HTTP from inside the network, but browsers say "too many redirects" when users visit it through the load balancer over HTTPS. What is a likely cause?**

<details>
<summary>Show answer</summary>

The load balancer ends HTTPS and forwards the request to the server over plain HTTP. The server sees plain HTTP and redirects to HTTPS, the browser follows, and the load balancer again forwards plain HTTP, forever. Check with `curl -iL` and look at each `Location`. The fix is for the server to trust a header from the load balancer that says the original request was HTTPS, or to stop redirecting at the server.

</details>

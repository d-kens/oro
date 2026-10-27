Plain HTTP crosses the network as readable text. Anyone on the path, such as a shared Wi-Fi network, a compromised router or a misconfigured proxy, can read it and change it. **TLS** (Transport Layer Security) wraps the connection so they cannot, and **HTTPS** is simply HTTP sent inside TLS, usually on port 443.

You will spend more time fixing TLS than setting it up: certificates expire, names do not match, a server forgets to send part of its chain. By the end you can explain what TLS protects, read a certificate and its chain, inspect any site's certificate with openssl and curl, recognise the common errors from their messages, and sign a certificate with a certificate authority of your own.

## What TLS gives you

TLS provides three things:

| Property | Means | Without it |
| --- | --- | --- |
| **Confidentiality** | The data is encrypted; only the two ends can read it | Passwords and cookies can be read off the network |
| **Integrity** | Any change to the data in transit is detected | A proxy could insert content into a page |
| **Authentication** | The client can check that it is talking to the real server for that name | An attacker could pose as the site and read everything |

Encryption alone is not enough. If you encrypt a conversation with an impostor, the impostor reads it. The third property is what certificates are for.

TLS does not hide everything. Anyone on the path can still see the IP addresses, the port, roughly how much data moves, and usually the name of the site, as the section on SNI shows. And it only protects data in transit: once the data reaches the server, TLS has done its job.

## Certificates

A **certificate** is a small signed document that binds a public key to one or more names. The server holds the matching **private key** and never sends it anywhere. During the handshake the server proves it has the private key, and the client checks the certificate to see whose key it is.

Look at the certificate example.com sends. `openssl s_client` opens a TLS connection and prints what it receives; piping that into `openssl x509` picks out the certificate and prints chosen fields. Your values will differ, because sites renew their certificates often:

```bash
root@alpha:/# echo | openssl s_client -connect example.com:443 -servername example.com 2>/dev/null | openssl x509 -noout -subject -issuer -dates -ext subjectAltName
subject=CN = example.com
issuer=C = US, O = ..., CN = ...
notBefore=Sep 26 22:49:11 2026 GMT
notAfter=Dec 25 22:56:35 2026 GMT
X509v3 Subject Alternative Name:
    DNS:example.com, DNS:*.example.com
```

The `echo |` sends an empty line and closes the connection, so the command ends on its own. The issuer's organisation names are shortened here; you will see the real certificate authority's name.

| Field | Meaning |
| --- | --- |
| Subject | Who the certificate is for. `CN` is the common name |
| Subject Alternative Name (SAN) | The names the certificate is valid for. Clients check the name in the URL against this list, not against `CN` |
| Issuer | Who signed it |
| `notBefore`, `notAfter` | The period it is valid for |

`*.example.com` is a **wildcard**: it covers any single label in front, such as `www.example.com` or `api.example.com`, but not `example.com` itself and not `a.b.example.com`. That is why the certificate lists both.

## The chain of trust

Anyone can make a certificate that says `CN = example.com`. What makes this one believable is the signature from the issuer. The client trusts the issuer because the issuer's own certificate is signed by someone the client already trusts, and so on up to a **root certificate**.

```text
example.com                    leaf certificate, sent by the server
  signed by an intermediate    sent by the server
    signed by a root           already on the client, in its trust store
```

- **Certificate authorities** (CAs) are the organisations that sign certificates after checking that the requester controls the name.
- The **trust store** is the list of root certificates the client trusts. Operating systems and browsers ship one. On Ubuntu it lives in `/etc/ssl/certs/`, managed by the `ca-certificates` package, and the lab image has over a hundred roots in it.
- Roots sign **intermediate** certificates, and intermediates sign the leaf certificates for sites. The root's private key can then be kept offline.

`openssl s_client` without the `x509` step shows the whole chain the server sent. Each entry has a subject `s:` and an issuer `i:`; the issuer of one is the subject of the next. With the names shortened again:

```bash
root@alpha:/# echo | openssl s_client -connect example.com:443 -servername example.com
...
Certificate chain
 0 s:CN = example.com
   i:C = US, O = ..., CN = ... Issuing ECC CA 3
   a:PKEY: id-ecPublicKey, 256 (bit); sigalg: ecdsa-with-SHA256
   v:NotBefore: Sep 26 22:49:11 2026 GMT; NotAfter: Dec 25 22:56:35 2026 GMT
 1 s:C = US, O = ..., CN = ... Issuing ECC CA 3
   i:C = US, O = ..., CN = ... Transit ECC CA R2
...
---
...
Verification: OK
---
New, TLSv1.3, Cipher is TLS_AES_256_GCM_SHA384
...
Verify return code: 0 (ok)
```

`Verify return code: 0 (ok)` means openssl built a chain from the leaf to a root in its trust store. The server must send the intermediates itself. A server configured with only its leaf certificate works in some browsers, which have cached the intermediate from other sites, and fails in curl and in applications, with `unable to get local issuer certificate`. That inconsistency makes it a confusing fault to track down.

## The handshake and SNI

Before any HTTP is sent, client and server run the **TLS handshake**: they agree on a TLS version and a cipher, the server sends its certificate chain and proves it holds the private key, and both work out shared keys for encrypting the rest. `curl -v` shows each step. With the byte counts and some lines removed:

```bash
root@alpha:/# curl -v https://example.com/ -o /dev/null
*   Trying 104.20.23.154:443...
* Connected to example.com (104.20.23.154) port 443
* ALPN: curl offers h2,http/1.1
* TLSv1.3 (OUT), TLS handshake, Client hello (1):
*  CAfile: /etc/ssl/certs/ca-certificates.crt
*  CApath: /etc/ssl/certs
* TLSv1.3 (IN), TLS handshake, Server hello (2):
* TLSv1.3 (IN), TLS handshake, Encrypted Extensions (8):
* TLSv1.3 (IN), TLS handshake, Certificate (11):
* TLSv1.3 (IN), TLS handshake, CERT verify (15):
* TLSv1.3 (IN), TLS handshake, Finished (20):
* TLSv1.3 (OUT), TLS handshake, Finished (20):
* SSL connection using TLSv1.3 / TLS_AES_256_GCM_SHA384 / X25519 / id-ecPublicKey
* ALPN: server accepted h2
* Server certificate:
*  subject: CN=example.com
*  start date: Sep 26 22:49:11 2026 GMT
*  expire date: Dec 25 22:56:35 2026 GMT
*  subjectAltName: host "example.com" matched cert's "example.com"
*  issuer: C=US; O=...; CN=...
*  SSL certificate verify ok.
> GET / HTTP/2
...
```

Read it as a checklist: the TCP connection, the hello messages, the certificate arriving, the name matched against the SAN, the chain verified, and only then the HTTP request. **ALPN** is how the two sides agree on HTTP/2 during the handshake. The *HTTP* topic showed the result.

There is one problem to solve first. One IP address often hosts many HTTPS sites, each with its own certificate. The `Host` header would tell the server which site you want, but it is inside the encrypted part, so the server needs to pick a certificate before it can read it. **SNI** (Server Name Indication) solves this: the client puts the site name in its first, unencrypted hello message. That is also why the site name is visible to anyone watching.

`-servername` sets SNI in openssl, and `-brief` prints a short summary. Connect to example.com's address twice, asking for different names:

```bash
root@alpha:/# echo | openssl s_client -connect example.com:443 -servername example.com -brief
CONNECTION ESTABLISHED
Protocol version: TLSv1.3
Ciphersuite: TLS_AES_256_GCM_SHA384
Peer certificate: CN = example.com
...
Verification: OK
...
root@alpha:/# echo | openssl s_client -connect example.com:443 -servername example.net -brief
CONNECTION ESTABLISHED
Protocol version: TLSv1.3
Ciphersuite: TLS_AES_256_GCM_SHA384
Peer certificate: CN = example.net
...
Verification: OK
```

Same server, two certificates, chosen by SNI. Without SNI, this server refuses the handshake:

```bash
root@alpha:/# echo | openssl s_client -connect example.com:443 -noservername -brief
...:error:0A000410:SSL routines:ssl3_read_bytes:sslv3 alert handshake failure:...
```

Note that openssl's `Verification: OK` only checks the chain. It does not check that the name matches what you meant to connect to. curl and browsers check both.

## Expiry

Every certificate has a `notAfter` date, and public certificates now last months rather than years, so renewal must be automated. An expired certificate is one of the most common causes of an outage that "nobody changed anything" for.

`-checkend` takes a number of seconds and says whether the certificate expires within that time. Its exit status is 0 if not, so it fits into a monitoring script. 2,592,000 seconds is 30 days:

```bash
root@alpha:/# echo | openssl s_client -connect example.com:443 -servername example.com 2>/dev/null | openssl x509 -noout -checkend 2592000
Certificate will not expire
root@alpha:/# echo $?
0
```

## Common errors

To see the errors in the lab, give beta a quick certificate that no CA has signed. `openssl req -x509` makes a **self-signed** certificate, signed by its own key, valid here for the name `web-01`. `openssl s_server` then runs a minimal TLS server on port 4433. The next section signs a certificate properly; this is just enough to break things:

```bash
root@beta:/# cd /root
root@beta:~# openssl req -x509 -newkey rsa:2048 -nodes -keyout quick.key -out quick.crt -days 30 -subj "/CN=web-01" 2>/dev/null
root@beta:~# openssl s_server -accept 4433 -cert quick.crt -key quick.key -www
```

From alpha:

```bash
root@alpha:/# curl https://beta:4433/
curl: (60) SSL certificate problem: self-signed certificate
More details here: https://curl.se/docs/sslcerts.html
...
```

curl refuses before sending any HTTP. These are the errors you will meet most, with real curl messages:

| curl says | Cause | Fix |
| --- | --- | --- |
| `self-signed certificate` | The certificate signed itself and is not in the trust store | Use a CA-signed certificate, or trust it explicitly |
| `unable to get local issuer certificate` | The issuer is unknown: a private CA the client does not trust, or a missing intermediate | Send the full chain from the server, or give the client the CA |
| `certificate subject name 'web-01' does not match target host name 'beta'` | The name in the URL is not in the certificate | Use the right name, or reissue the certificate with that name in its SAN |
| `no alternative certificate subject name matches target host name` | The same, when the certificate has a SAN list | As above |
| `certificate has expired` | The current time is after `notAfter` | Renew it, and check the client's clock |

`curl -k` (or `--insecure`) skips all these checks and connects anyway. It is fine for a quick look in a lab, but it removes the authentication part of TLS, so never put it in a script or a health check. The connection would still be encrypted, but possibly to an impostor.

## A certificate authority of your own

Internal services, test environments and labs often use a **private CA**: a CA key and certificate that you make yourself, and that only your own machines trust. It signs server certificates the same way a public CA does, and clients that have its certificate in their trust store accept them without `-k`.

It takes four `openssl` commands. First the CA: a key and a self-signed certificate. Then the server: a key and a **certificate signing request** (CSR), which holds the server's public key and the name it wants. Last, the CA signs the request. Modern clients check the SAN rather than `CN`, so the signed certificate must carry the name as `subjectAltName`, given here in a small extensions file:

```bash
root@beta:~# mkdir ca && cd ca
root@beta:~/ca# openssl req -x509 -newkey rsa:2048 -nodes -keyout ca.key -out ca.crt -days 365 -subj "/CN=Lab CA"
root@beta:~/ca# openssl req -newkey rsa:2048 -nodes -keyout web-01.key -out web-01.csr -subj "/CN=web-01"
root@beta:~/ca# echo "subjectAltName=DNS:web-01" > web-01.ext
root@beta:~/ca# openssl x509 -req -in web-01.csr -CA ca.crt -CAkey ca.key -CAcreateserial -days 90 -extfile web-01.ext -out web-01.crt
Certificate request self-signature ok
subject=CN = web-01
root@beta:~/ca# openssl verify -CAfile ca.crt web-01.crt
web-01.crt: OK
```

The `openssl req` commands also print lines of dots and plus signs while they make the keys; that is normal. `-nodes` leaves the private keys unencrypted, so a server can read them at start-up. `openssl verify` checks the chain: the server certificate was signed by the CA.

A server uses `web-01.crt` and `web-01.key`, for example `openssl s_server -cert web-01.crt -key web-01.key`, or nginx's `ssl_certificate` and `ssl_certificate_key`. A client trusts the CA in one of two ways: for one command, with `curl --cacert ca.crt`; for the whole machine, by copying `ca.crt` into `/usr/local/share/ca-certificates/` with a `.crt` ending and running `update-ca-certificates`. After that, every program on the client that uses the system trust store accepts certificates the CA signs.

`ca.key` is the most sensitive file here. Anyone who has it can sign certificates your clients will trust, so in real use it never sits on a web server, and a client is only ever given `ca.crt`.

## Tasks

### Task 1: Inspect a certificate

From alpha, find out for example.com: the names the certificate is valid for, its expiry date, the TLS version and cipher used, and whether it will still be valid in 60 days.

<details>
<summary>Check your work</summary>

```bash
root@alpha:/# echo | openssl s_client -connect example.com:443 -servername example.com 2>/dev/null | openssl x509 -noout -dates -ext subjectAltName
notBefore=Sep 26 22:49:11 2026 GMT
notAfter=Dec 25 22:56:35 2026 GMT
X509v3 Subject Alternative Name:
    DNS:example.com, DNS:*.example.com
root@alpha:/# echo | openssl s_client -connect example.com:443 -servername example.com -brief 2>&1 | grep -E "Protocol|Ciphersuite"
Protocol version: TLSv1.3
Ciphersuite: TLS_AES_256_GCM_SHA384
root@alpha:/# echo | openssl s_client -connect example.com:443 -servername example.com 2>/dev/null | openssl x509 -noout -checkend 5184000
```

60 days is 5,184,000 seconds. The last command prints either `Certificate will not expire` or `Certificate will expire`, depending on when you run it, since this certificate lasts about three months. Recent versions of openssl send SNI from the `-connect` name on their own, but writing `-servername` makes it explicit, and you need it whenever you connect by IP address.

</details>

### Task 2: Trust a certificate without -k

With `openssl s_server` running on beta as above, save beta's certificate on alpha, and use it with `curl --cacert` instead of `-k`. Read the new error, then make the request succeed without changing anything on beta.

<details>
<summary>Check your work</summary>

`s_client` prints the certificate it receives, and `openssl x509` saves it:

```bash
root@alpha:/# echo | openssl s_client -connect beta:4433 2>/dev/null | openssl x509 > web-01.crt
root@alpha:/# curl --cacert web-01.crt https://beta:4433/
curl: (60) SSL: certificate subject name 'web-01' does not match target host name 'beta'
```

The chain is now trusted, but the certificate is for `web-01`, not `beta`. Ask for `web-01` and tell curl to connect to beta for that name. `--connect-to` changes where curl connects, but keeps the name it checks and sends in SNI:

```bash
root@alpha:/# curl --cacert web-01.crt --connect-to web-01:4433:beta:4433 https://web-01:4433/
<HTML><BODY BGCOLOR="#ffffff">
...
```

Saving a certificate from the connection itself only makes sense in a lab, where you know nobody is in the middle. In real use you get the certificate or its CA through a channel you already trust.

</details>

## Quiz

**1. TLS gives confidentiality, integrity and authentication. Which one would be missing if a client encrypted the connection but did not check the certificate?**

<details>
<summary>Show answer</summary>

Authentication. The data would be encrypted, but the client could be talking to an impostor, which would decrypt and read everything.

</details>

**2. Why does a client need to send SNI, when the HTTP request already contains a `Host` header?**

<details>
<summary>Show answer</summary>

The server must choose its certificate during the handshake, before any HTTP is sent. The `Host` header only arrives later, inside the encrypted connection. SNI puts the name in the first hello message so the server can pick the right certificate.

</details>

**3. Is a certificate for `*.example.com` valid for `example.com`? For `api.v2.example.com`?**

<details>
<summary>Show answer</summary>

Neither. A wildcard covers exactly one label in place of the `*`, so it matches `api.example.com` but not the bare `example.com` or a name two labels deep. A certificate that should cover `example.com` must list it separately in its SAN.

</details>

**4. A site loads fine in your browser, but a health check that calls it with curl fails with `unable to get local issuer certificate`. Nothing has changed on the client. What is a likely cause, and how would you confirm it?**

<details>
<summary>Show answer</summary>

The server is sending only its leaf certificate, without the intermediate. The browser has the intermediate cached from other sites, curl does not. Run `openssl s_client -connect` with `-servername` against the site and look at the `Certificate chain` section: if it shows only entry `0`, the intermediate is missing. The fix is on the server, by configuring the full chain file.

</details>

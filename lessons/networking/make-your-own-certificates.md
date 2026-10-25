Public certificate authorities only sign certificates for public domain names. Inside a company, many services have names like `db-01` or `beta` that no public CA will sign, and those services still need TLS. The usual answer is a **private certificate authority**: a CA of your own, trusted only by your own machines.

This topic builds one with openssl, signs a certificate for beta with it, serves HTTPS from nginx, and makes alpha trust it. It assumes the *TLS and HTTPS* and *Serve a website with nginx* topics. By the end you can create a CA, issue a certificate with the right names in it, serve it, and fix the errors that come from getting any of that wrong.

## The plan

You will make four files, and it helps to know what each is before you start:

| File | What it is | Who may see it |
| --- | --- | --- |
| `ca.key` | The CA's private key, used to sign certificates | Only the CA. Anyone who has it can sign certificates your machines will trust |
| `ca.crt` | The CA's certificate, containing its public key | Every client that should trust your certificates |
| `beta.key` | beta's private key | Only beta's web server |
| `beta.crt` | beta's certificate, signed by the CA | Anyone; the server sends it to every client |

A fifth file, `beta.csr`, is the **certificate signing request**: beta's public key and requested name, which the CA turns into a certificate.

On a real network the CA lives on a separate, well-protected machine, and only the signed certificate travels to the server. In the lab you do everything on beta to keep it short.

## Create the CA

On beta, make a directory and create the CA's key and certificate in one command:

```bash
root@beta:/# mkdir -p /root/ca && cd /root/ca
root@beta:~/ca# openssl req -x509 -newkey rsa:2048 -nodes -keyout ca.key -out ca.crt -days 365 -subj "/CN=Lab CA"
```

openssl prints a row of dots and plus signs while it generates the key.

| Option | Meaning |
| --- | --- |
| `req -x509` | Make a self-signed certificate instead of a signing request |
| `-newkey rsa:2048` | Generate a new 2,048-bit RSA key at the same time |
| `-nodes` | Do not encrypt the key with a passphrase. Fine for a lab; a real CA key should have one |
| `-days 365` | Valid for a year |
| `-subj "/CN=Lab CA"` | The name, given on the command line instead of answering questions |

Look at what you made:

```bash
root@beta:~/ca# openssl x509 -in ca.crt -noout -subject -issuer -dates -ext basicConstraints
subject=CN = Lab CA
issuer=CN = Lab CA
notBefore=Oct 25 07:29:02 2026 GMT
notAfter=Oct 25 07:29:02 2027 GMT
X509v3 Basic Constraints: critical
    CA:TRUE
```

Subject and issuer are the same: a root certificate signs itself. `CA:TRUE` marks it as allowed to sign other certificates. openssl adds this to self-signed certificates by default.

## Issue a certificate for beta

First, beta's key and a signing request for the name `beta`:

```bash
root@beta:~/ca# openssl req -newkey rsa:2048 -nodes -keyout beta.key -out beta.csr -subj "/CN=beta"
```

The same command as before, without `-x509`, so the result is a request rather than a certificate.

Clients check the name in the URL against the certificate's **Subject Alternative Name** list, not the `CN`, as the *TLS and HTTPS* topic explained. So the certificate must carry a SAN with every name clients will use. Put the list in a small file, then sign:

```bash
root@beta:~/ca# echo "subjectAltName = DNS:beta, IP:10.10.0.3" > beta.ext
root@beta:~/ca# openssl x509 -req -in beta.csr -CA ca.crt -CAkey ca.key -CAcreateserial -days 90 -extfile beta.ext -out beta.crt
Certificate request self-signature ok
subject=CN = beta
```

- `-CA` and `-CAkey` name the CA that signs.
- `-CAcreateserial` creates `ca.srl`, which holds the serial number for the next certificate. Every certificate from one CA needs a unique serial.
- `-extfile beta.ext` adds the SAN. Without it the certificate has only a `CN`. curl still falls back to the `CN`, but browsers and many other clients reject a certificate with no SAN.

`IP:` entries let clients connect by address too. Check the result, and check that it chains to the CA:

```bash
root@beta:~/ca# openssl x509 -in beta.crt -noout -subject -issuer -dates -ext subjectAltName
subject=CN = beta
issuer=CN = Lab CA
notBefore=Oct 25 07:29:03 2026 GMT
notAfter=Jan 23 07:29:03 2027 GMT
X509v3 Subject Alternative Name:
    DNS:beta, IP Address:10.10.0.3
root@beta:~/ca# openssl verify -CAfile ca.crt beta.crt
beta.crt: OK
root@beta:~/ca# ls -l ca.key beta.key
-rw------- 1 root root 1704 Oct 25 07:29 beta.key
-rw------- 1 root root 1704 Oct 25 07:29 ca.key
```

openssl already made the keys readable by root only. Keep them that way.

## Serve HTTPS from nginx

Copy the certificate and key to where nginx will read them, create a page, and write a site with two server blocks: plain HTTP on port 80 and HTTPS on port 443. The `ca.crt` copy in the web root is only so alpha can download it in the next step; it is a public certificate, so that is safe, but a real CA certificate should reach clients through a channel you already trust.

```bash
root@beta:~/ca# mkdir -p /etc/nginx/tls /var/www/site
root@beta:~/ca# cp beta.crt beta.key /etc/nginx/tls/
root@beta:~/ca# echo "<h1>Hello over HTTPS</h1>" > /var/www/site/index.html
root@beta:~/ca# cp ca.crt /var/www/site/ca.crt
root@beta:~/ca# cat > /etc/nginx/sites-available/site <<'EOF'
server {
    listen 80;
    server_name beta;
    root /var/www/site;
}

server {
    listen 443 ssl;
    server_name beta;
    ssl_certificate     /etc/nginx/tls/beta.crt;
    ssl_certificate_key /etc/nginx/tls/beta.key;
    root /var/www/site;
    index index.html;
}
EOF
root@beta:~/ca# ln -s /etc/nginx/sites-available/site /etc/nginx/sites-enabled/site
root@beta:~/ca# rm /etc/nginx/sites-enabled/default
root@beta:~/ca# nginx -t && nginx
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
root@beta:~/ca# ss -tln
State  Recv-Q Send-Q Local Address:Port  Peer Address:PortProcess
LISTEN 0      511          0.0.0.0:443        0.0.0.0:*
LISTEN 0      511          0.0.0.0:80         0.0.0.0:*
LISTEN 0      4096      127.0.0.11:35579      0.0.0.0:*
```

`listen 443 ssl` turns on TLS for that block. `ssl_certificate` is what nginx sends to clients; if your certificate came from a CA with intermediates, this file must contain the leaf followed by the intermediates. `nginx -t` checks that the key matches the certificate. Point it at the wrong key, here the CA's, and it refuses:

```text
2026/10/25 07:29:20 [emerg] 74#74: SSL_CTX_use_PrivateKey("/tmp/wrong.key") failed (SSL: error:05800074:x509 certificate routines::key values mismatch)
nginx: configuration file /etc/nginx/nginx.conf test failed
```

## Trust it from alpha

Try the site from alpha:

```bash
root@alpha:/# curl https://beta/
curl: (60) SSL certificate problem: unable to get local issuer certificate
More details here: https://curl.se/docs/sslcerts.html
...
```

The certificate is fine, but alpha does not know the Lab CA, so it cannot build a chain to a root it trusts. Fetch the CA certificate over plain HTTP and give it to curl with `--cacert`:

```bash
root@alpha:/# cd /root
root@alpha:~# curl -sO http://beta/ca.crt
root@alpha:~# curl --cacert ca.crt https://beta/
<h1>Hello over HTTPS</h1>
root@alpha:~# curl --cacert ca.crt https://10.10.0.3/
<h1>Hello over HTTPS</h1>
```

Both names work, because both are in the SAN. Docker's DNS also answers to `beta.lab`, but that name is not in the certificate:

```bash
root@alpha:~# curl --cacert ca.crt https://beta.lab/
curl: (60) SSL: no alternative certificate subject name matches target host name 'beta.lab'
```

`-v` shows the check passing for `beta`, and the two levels of the chain:

```bash
root@alpha:~# curl -v --cacert ca.crt https://beta/ -o /dev/null
...
*  subject: CN=beta
*  start date: Oct 25 07:29:03 2026 GMT
*  expire date: Jan 23 07:29:03 2027 GMT
*  subjectAltName: host "beta" matched cert's "beta"
*  issuer: CN=Lab CA
*  SSL certificate verify ok.
...
```

`--cacert` works for one command. To make every program on alpha trust the CA, add it to the system trust store. On Ubuntu, the file goes in `/usr/local/share/ca-certificates/` with a `.crt` ending, and `update-ca-certificates` rebuilds the store:

```bash
root@alpha:~# cp ca.crt /usr/local/share/ca-certificates/lab-ca.crt
root@alpha:~# update-ca-certificates
Updating certificates in /etc/ssl/certs...
rehash: warning: skipping ca-certificates.crt,it does not contain exactly one certificate or CRL
1 added, 0 removed; done.
Running hooks in /etc/ca-certificates/update.d...
done.
root@alpha:~# curl https://beta/
<h1>Hello over HTTPS</h1>
```

The `rehash` warning is harmless. Remember what this means: alpha now trusts *anything* the Lab CA signs, for any name. That is why `ca.key` must be guarded.

## Tasks

### Task 1: Send HTTP to HTTPS

Change the port 80 server block on beta so that every plain HTTP request is redirected to the same path over HTTPS. Check it from alpha with `curl -I`, then with `curl -L`.

<details>
<summary>Check your work</summary>

Replace the `root` line in the first block with a `return`:

```text
server {
    listen 80;
    server_name beta;
    return 301 https://$host$request_uri;
}
```

```bash
root@beta:~/ca# nginx -t && nginx -s reload
```

```bash
root@alpha:~# curl -sI http://beta/docs?page=2 | grep -i location
Location: https://beta/docs?page=2
root@alpha:~# curl -L --cacert ca.crt http://beta/
<h1>Hello over HTTPS</h1>
```

`$host` is the name the client asked for and `$request_uri` the full path with its query string, so nothing is lost on the way. Leave out `--cacert` (if you have not added the CA to the system store) and the redirect works but the HTTPS request after it fails with `unable to get local issuer certificate`. Note that the CA certificate is no longer downloadable over plain HTTP after this change, which is one reason to distribute it some other way.

</details>

### Task 2: Add a name

Reissue beta's certificate so that it is also valid for `beta.lab`, install it, and reload nginx. Confirm from alpha that `https://beta.lab/` now works with `--cacert`, and that `https://beta/` still does.

<details>
<summary>Check your work</summary>

You do not need a new key or a new request. Change the SAN list and sign again:

```bash
root@beta:~/ca# echo "subjectAltName = DNS:beta, DNS:beta.lab, IP:10.10.0.3" > beta.ext
root@beta:~/ca# openssl x509 -req -in beta.csr -CA ca.crt -CAkey ca.key -CAcreateserial -days 90 -extfile beta.ext -out beta.crt
Certificate request self-signature ok
subject=CN = beta
root@beta:~/ca# openssl x509 -in beta.crt -noout -ext subjectAltName
X509v3 Subject Alternative Name:
    DNS:beta, DNS:beta.lab, IP Address:10.10.0.3
root@beta:~/ca# cp beta.crt /etc/nginx/tls/
root@beta:~/ca# nginx -t && nginx -s reload
```

```bash
root@alpha:~# curl --cacert ca.crt https://beta.lab/
<h1>Hello over HTTPS</h1>
```

The most common mistake is to sign the new certificate and forget to copy it to `/etc/nginx/tls/` or to reload: nginx keeps sending the old one until it reloads, and curl still reports the name mismatch.

</details>

## Quiz

**1. Which of the files you created must never leave the machine it was made on, and why?**

<details>
<summary>Show answer</summary>

`ca.key` and `beta.key`. Anyone with `beta.key` can pretend to be beta. Anyone with `ca.key` can sign a certificate for any name, and every machine that trusts your CA will accept it. The `.crt` files are public and safe to share.

</details>

**2. You sign a certificate for `db-01` with your CA but forget the `-extfile` with the SAN. Your test with `curl --cacert ca.crt https://db-01/` passes, but users report that browsers reject the site. Why?**

<details>
<summary>Show answer</summary>

Without a SAN the name is only in the `CN`. curl falls back to checking the `CN`, so it accepts the certificate, but browsers check only the SAN list and find no names at all. Reissue the certificate with `subjectAltName = DNS:db-01`, and test with more than one client.

</details>

**3. What does `update-ca-certificates` change, and what does it not change?**

<details>
<summary>Show answer</summary>

It adds the CA certificates in `/usr/local/share/ca-certificates/` to the system trust store under `/etc/ssl/certs/`, so curl, openssl and most programs on that machine trust them. It does not affect other machines, and some programs, such as some browsers and language runtimes, keep their own trust store and ignore the system one.

</details>

**4. An internal service on web-01 works from servers that have the company CA installed, but a new container fails to call it with `unable to get local issuer certificate`. The certificate on web-01 has not changed. What is wrong, and where is the fix?**

<details>
<summary>Show answer</summary>

The new container does not trust the company CA. The fix is on the client side: add the CA certificate to the container's trust store when building its image, or point the program at it, as `--cacert` does for curl. Turning off verification would make the error go away but remove the protection TLS gives.

</details>

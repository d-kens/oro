`ss` tells you what a machine is listening on when you are logged in to it. Often you want the view from outside instead: which hosts are on a network, which ports they answer on, and what is running behind them. **nmap** answers those questions by sending packets and reading the replies.

Scanning is also what an attacker does first, so it comes with a rule. By the end you can find the hosts on a subnet, scan their ports, identify the services behind them, read what open, closed and filtered mean, and check what your own server exposes.

## Only scan what you are allowed to

Scan only networks and machines that you own, or that you have written permission to test. Scanning other people's systems can break their acceptable use policy or the law, it shows up in their security monitoring, and some providers block or report it. The same applies inside an employer's network: being able to reach a host does not mean you are allowed to scan it.

Everything in this topic runs against your own lab network. Do not point these commands at example.com, at your home router's neighbours, or at anything in the cloud that you have not set up yourself for the purpose.

## Finding hosts on a network

Start the lab with alpha, beta and gamma. **Host discovery** asks which addresses on a network have something alive behind them. `-sn` means "no port scan", just find the hosts:

```bash
root@alpha:/# nmap -sn 10.10.0.0/24
Starting Nmap 7.94SVN ( https://nmap.org ) at 2026-10-25 07:27 UTC
Nmap scan report for 10.10.0.1
Host is up (0.000047s latency).
MAC Address: 2E:E8:91:94:39:F0 (Unknown)
Nmap scan report for beta.lab (10.10.0.3)
Host is up (0.0000050s latency).
MAC Address: 52:0C:11:C9:A5:B1 (Unknown)
Nmap scan report for gamma.lab (10.10.0.4)
Host is up (0.000036s latency).
MAC Address: D6:0C:2E:C9:A8:52 (Unknown)
Nmap scan report for alpha (10.10.0.2)
Host is up.
Nmap done: 256 IP addresses (4 hosts up) scanned in 2.38 seconds
```

It checked all 256 addresses in the `/24` and found four: Docker's gateway at `.1`, the three machines, and their names where a reverse lookup found one. On a local network nmap discovers hosts with ARP, from the *MAC addresses and ARP* topic, which is why it can show MAC addresses. A host that does not answer ARP cannot hide from that. Across a router nmap uses ping and a few TCP probes instead, and a host behind a strict firewall may look down when it is not.

For a list you can feed into other tools, `-oG -` prints one line per host:

```bash
root@alpha:/# nmap -sn 10.10.0.0/24 -oG - | grep Up
Host: 10.10.0.1 ()	Status: Up
Host: 10.10.0.3 (beta.lab)	Status: Up
Host: 10.10.0.4 (gamma.lab)	Status: Up
Host: 10.10.0.2 (alpha)	Status: Up
```

## Scanning ports

Give beta something to find. On beta, start nginx, the SSH server and a Python web server:

```bash
root@beta:/# nginx
root@beta:/# mkdir -p /run/sshd && /usr/sbin/sshd
root@beta:/# python3 -m http.server 8000 > /dev/null 2>&1 &
```

Now scan it from alpha. With no options, nmap checks the 1,000 most common TCP ports:

```bash
root@alpha:/# nmap beta
Starting Nmap 7.94SVN ( https://nmap.org ) at 2026-10-25 07:27 UTC
Nmap scan report for beta (10.10.0.3)
Host is up (0.0000040s latency).
rDNS record for 10.10.0.3: beta.lab
Not shown: 997 closed tcp ports (reset)
PORT     STATE SERVICE
22/tcp   open  ssh
80/tcp   open  http
8000/tcp open  http-alt
MAC Address: 52:0C:11:C9:A5:B1 (Unknown)

Nmap done: 1 IP address (1 host up) scanned in 0.15 seconds
```

The `SERVICE` column is only a guess from the port number, taken from a list of well-known ports. nmap has not talked to the services yet.

Because you are root, nmap uses a **SYN scan** (`-sS`): it sends the first packet of the TCP handshake from the *TCP* topic, notes the reply, and never finishes the connection. As an ordinary user it falls back to a full connect (`-sT`), which is slower and shows up in the service's own logs.

Options you will use most:

| Option | What it does |
| --- | --- |
| `-p 22,80,443` | Scan only these ports |
| `-p 8000-8100` | Scan a range |
| `-p-` | Scan all 65,535 TCP ports |
| `-sV` | Talk to each open port and work out the program and version |
| `-sU` | Scan UDP ports instead of TCP (slow, and the answers are less certain) |
| `--reason` | Show which reply led to each state |

Naming the ports shows ones that are not open as well:

```bash
root@alpha:/# nmap -p 22,80,443,8000 beta
PORT     STATE  SERVICE
22/tcp   open   ssh
80/tcp   open   http
443/tcp  closed https
8000/tcp open   http-alt
```

The default 1,000 ports miss anything unusual. `-p-` checks them all, which is quick on a local network:

```bash
root@alpha:/# nmap -p- beta
Not shown: 65532 closed tcp ports (reset)
PORT     STATE SERVICE
22/tcp   open  ssh
80/tcp   open  http
8000/tcp open  http-alt
```

## Identifying services

`-sV` connects to each open port and compares what comes back with a large database of known services:

```bash
root@alpha:/# nmap -sV -p 22,80,8000 beta
PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 9.6p1 Ubuntu 3ubuntu13.20 (Ubuntu Linux; protocol 2.0)
80/tcp   open  http    nginx 1.24.0 (Ubuntu)
8000/tcp open  http    SimpleHTTPServer 0.6 (Python 3.12.3)
MAC Address: 52:0C:11:C9:A5:B1 (Unknown)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

Now port 8000 is correctly named as an HTTP server, and you can see exact versions. That is useful when you are checking your own machines for out-of-date software. It also shows why servers should not announce more than they need to: whatever `-sV` can read, anyone who can reach the port can read.

## Open, closed and filtered

nmap reports each port in one of three main states, based on what came back:

| State | Reply to nmap's probe | What it means |
| --- | --- | --- |
| **open** | SYN-ACK | A program is listening and accepted the start of a connection |
| **closed** | RST (reset) | The host is reachable but nothing listens on that port |
| **filtered** | Nothing, or an ICMP "unreachable" error | Something, usually a firewall, stopped the probe or the reply |

A firewall changes the answer. On beta, add two rules with iptables from the *Firewall basics* topic: drop anything to port 8000, and reject anything to port 22:

```bash
root@beta:/# iptables -A INPUT -p tcp --dport 8000 -j DROP
root@beta:/# iptables -A INPUT -p tcp --dport 22 -j REJECT
```

```bash
root@alpha:/# nmap --reason -p 22,80,443,8000 beta
PORT     STATE    SERVICE  REASON
22/tcp   filtered ssh      port-unreach ttl 64
80/tcp   open     http     syn-ack ttl 64
443/tcp  closed   https    reset ttl 64
8000/tcp filtered http-alt no-response
```

Both services are still running on beta, yet both now look `filtered`. Port 8000 gave `no-response`, because `DROP` throws the packet away silently. Port 22 got an ICMP `port-unreach`, because a plain `REJECT` answers with an ICMP error. If the rule were `-j REJECT --reject-with tcp-reset` instead, the reply would be a reset, and nmap would report port 22 as `closed`, exactly as if nothing were listening.

So the state tells you what came back, not what is running. `closed` can be a firewall pretending, and `filtered` hides whether a service exists behind it. A firewall that drops also makes scans slow, because nmap waits for answers that never come. Remove the rules with `iptables -F` before you go on.

## Scanning yourself

The most useful scan is often of your own server, to check that it exposes only what you intend. Compare the view from inside with the view from outside. On beta, start one more web server, this time bound only to the loopback address:

```bash
root@beta:/# cd /tmp && python3 -m http.server 9000 --bind 127.0.0.1 > /dev/null 2>&1 &
root@beta:/tmp# nmap localhost
Nmap scan report for localhost (127.0.0.1)
Host is up (0.0000020s latency).
Other addresses for localhost (not scanned): ::1
Not shown: 996 closed tcp ports (reset)
PORT     STATE SERVICE
22/tcp   open  ssh
80/tcp   open  http
8000/tcp open  http-alt
9000/tcp open  cslistener
```

```bash
root@alpha:/# nmap -p 9000 beta
PORT     STATE  SERVICE
9000/tcp closed cslistener
```

From beta itself, port 9000 is open. From alpha it is closed, because the server listens only on `127.0.0.1`. `ss -tln` on beta shows the same thing from the inside: `127.0.0.1:9000` versus `0.0.0.0:8000`. Scanning `localhost` tells you what is running. Scanning the machine's real address from another host tells you what is exposed, after listening addresses and firewalls have had their say. For a server on the internet, the honest check is a scan from outside your own network, and only of the addresses that are yours.

## Tasks

### Task 1: Survey the lab

With alpha, beta and gamma running, start nginx on gamma and the Python server on port 8000 on beta. From alpha, find every host on the lab network, then scan all TCP ports on beta and gamma with service detection. Write down each open port, the program behind it and its version.

<details>
<summary>Check your work</summary>

```bash
root@alpha:/# nmap -sn 10.10.0.0/24
root@alpha:/# nmap -sV -p- beta gamma
```

The first finds four hosts: `10.10.0.1` to `10.10.0.4`. The second lists `8000/tcp open http SimpleHTTPServer 0.6 (Python 3.12.3)` on beta, plus anything else you left running there, and `80/tcp open http nginx 1.24.0 (Ubuntu)` on gamma. If a port you expected is missing, check on that machine with `ss -tlnp` that the program is really listening, and on which address. A scan without `-p-` would still find these, but would miss a service on an unusual high port.

</details>

### Task 2: Make a firewall show itself

On beta, with the Python server on port 8000 running, scan port 8000 from alpha with `--reason`. Then add a `DROP` rule for port 8000 and scan again, timing it with `time`. Replace the rule with `REJECT --reject-with tcp-reset` and scan a third time. Explain each result, then remove the rule.

<details>
<summary>Check your work</summary>

```text
8000/tcp open     http-alt syn-ack ttl 64
8000/tcp filtered http-alt no-response
8000/tcp closed   http-alt reset ttl 64
```

With `DROP`, the probe disappears, so nmap waits, retries and reports `filtered`; the scan takes about a second longer. With the TCP reset, the firewall answers the way a closed port would, so nmap cannot tell the difference. The server was running the whole time. Use `iptables -D INPUT 1` or `iptables -F` to remove the rule. If the third scan still says `filtered`, the `DROP` rule is still there above the new one: `iptables -L INPUT -n --line-numbers` shows the order.

</details>

## Quiz

**1. You want to know which machines are on 10.10.0.0/24 without scanning any ports. Which command do you use?**

<details>
<summary>Show answer</summary>

`nmap -sn 10.10.0.0/24`. `-sn` does host discovery only. And only on a network you own or have permission to scan.

</details>

**2. What is the difference between a closed port and a filtered port?**

<details>
<summary>Show answer</summary>

Closed means the host answered with a TCP reset: it is reachable, but nothing listens there. Filtered means no useful answer came back, or an ICMP error did, usually because a firewall dropped or rejected the probe. A firewall can also answer with a reset, which makes a port look closed.

</details>

**3. A database on db-01 should be reachable only from the machine itself. `ss -tln` shows it listening on `0.0.0.0:5432`. You scan db-01 from web-01 and port 5432 shows as filtered. Is the database safe?**

<details>
<summary>Show answer</summary>

Only as long as the firewall rule stays. The database listens on every address, so a firewall is the only thing keeping it private; one mistaken rule change would expose it. Bind it to `127.0.0.1` as well, so that it is closed from outside even without the firewall.

</details>

**4. Why does nmap's SERVICE column say `http-alt` for port 8000 until you add `-sV`?**

<details>
<summary>Show answer</summary>

Without `-sV`, nmap names the service only from a list of well-known port numbers, and 8000 is listed as `http-alt`. With `-sV` it connects, reads what the program sends back, and identifies the real program and version.

</details>

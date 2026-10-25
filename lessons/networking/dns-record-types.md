A DNS name does not hold one value. It holds a set of **records**, each with a type: one type for its IPv4 address, another for its mail servers, another for free text that other services check. When you set up a domain for a website, email or a cloud service, you are adding records of the right types.

By the end you can ask for any record type with `dig`, read what a domain publishes, and know which type to use for which job.

## Records and how dig shows them

Every record has the same five parts. `dig` prints them in this order:

```text
example.com.		377	IN	A	172.66.147.243
name            TTL     class   type    value
```

- The **name** the record belongs to, ending in a dot because it is a full name.
- The **TTL**, how many seconds a resolver may cache it, as the *DNS basics* topic explained.
- The **class**, which is always `IN` (internet) in practice.
- The **type**, such as `A` or `MX`.
- The **value**, whose format depends on the type.

A name can have several records of the same type. example.com has two A records, and a client may use either. That is a simple way to spread traffic over more than one server.

dig asks for `A` records unless you name another type after the domain. `+short` prints only the values, which is what you want most of the time:

```bash
root@alpha:/# dig +short example.com
104.20.23.154
172.66.147.243
root@alpha:/# dig +short example.com MX
0 .
```

`+noall +answer` is the middle ground: just the answer lines, with names and TTLs. The rest of this topic uses all three forms.

## A, AAAA and CNAME

An **A** record maps a name to an IPv4 address. An **AAAA** record (four A's, because IPv6 addresses are four times as long) maps it to an IPv6 address. A name can have both, and a client that has IPv6 usually tries it first.

```bash
root@alpha:/# dig +short example.com AAAA
root@alpha:/#
```

The lab's resolver returns nothing for AAAA, because Docker Desktop's DNS service does not pass IPv6 answers to containers without IPv6. Ask one of example.com's own name servers directly with `@`, and the records are there:

```bash
root@alpha:/# dig +short example.com AAAA @$(dig +short example.com NS | head -1)
2606:4700:10::6814:179a
2606:4700:10::ac42:93f3
```

The `$( … )` runs the inner `dig` first and puts its first answer, a name server, after the `@`. This is a useful habit when results look odd: asking the authoritative server shows what the domain really publishes, with no cache in between.

A **CNAME** record (canonical name) says "this name is another name for that one". Instead of an address, its value is a name, and the resolver carries on and looks that one up:

```text
www.example.com.      300   IN   CNAME   web-01.example.com.
web-01.example.com.   300   IN   A       203.0.113.10
```

That is an illustration of the format, not a real record. With it, `www` always follows `web-01`: when the server moves, you change one A record. CNAMEs are common for pointing your own name at a cloud service, such as a load balancer, whose addresses the provider changes when it needs to.

Two rules apply. A name with a CNAME cannot have any other records, and so the bare domain, `example.com` itself, cannot be a CNAME, because it must have NS and SOA records. Some DNS providers offer an "alias" record type to work around that. The *Run your own DNS* topic has you create a real CNAME in the lab.

example.com has no CNAMEs: `dig +short www.example.com CNAME` returns nothing, and `www.example.com` has A records of its own.

## MX and TXT

An **MX** record (mail exchanger) names the servers that accept email for a domain. Each has a priority number, and lower numbers are tried first:

```text
example.com.   3600   IN   MX   10 mail-01.example.com.
example.com.   3600   IN   MX   20 mail-02.example.com.
```

Again an illustration: mail goes to `mail-01` first, and to `mail-02` if that does not answer. The real example.com publishes something different:

```bash
root@alpha:/# dig example.com MX +noall +answer
example.com.		148	IN	MX	0 .
```

A single dot as the mail server is a **null MX**. It states that the domain accepts no email at all, so senders give up at once instead of retrying.

A **TXT** record holds free text. Its main use is proving things to other services:

```bash
root@alpha:/# dig example.org TXT +noall +answer
example.org.		377	IN	TXT	"v=spf1 -all"
example.org.		377	IN	TXT	"_uyh0vgv5ukyofwj3ddwspnni01vmlyy"
```

- `v=spf1 -all` is an **SPF** record. It lists which servers may send email claiming to be from the domain; `-all` with nothing before it means none may. Mail servers check it to reject forged mail.
- The random-looking string is a **verification** token. A service asks you to publish a value it gives you, then checks for it, which proves you control the domain. Certificate authorities and cloud providers use the same method, covered in the *TLS and HTTPS* topic.

## NS and SOA

**NS** records name the authoritative name servers for a domain. They are the link in the tree that the *DNS basics* trace followed: the `com` servers hold NS records for example.com, pointing at its servers.

```bash
root@alpha:/# dig example.org NS +noall +answer
example.org.		4502	IN	NS	katelyn.ns.cloudflare.com.
example.org.		4502	IN	NS	mitch.ns.cloudflare.com.
```

The names belong to whichever DNS provider hosts the domain. A domain should have at least two, so one can fail. When you move a domain to a new DNS provider, changing the NS records at the registrar, where you bought the domain, is the step that makes the switch.

The **SOA** record (start of authority) holds facts about the zone itself. Every domain has exactly one:

```bash
root@alpha:/# dig example.com SOA +short
elliott.ns.cloudflare.com. dns.cloudflare.com. 2418004112 10000 2400 604800 1800
```

In order: the primary name server, the administrator's mail address with the `@` written as a dot, a **serial number** that goes up with each change, three timers that secondary servers use to stay in sync, and last the **negative TTL**, here 1800 seconds. That last one matters in practice: when a name does not exist, resolvers cache the `NXDOMAIN` answer for that long. If you look up a name before creating it, you may wait half an hour before you see the new record.

## PTR and reverse lookups

A **PTR** record goes the other way: from an address to a name. Reverse lookups live under a special domain, `in-addr.arpa`, with the address written backwards. `dig -x` builds that name for you:

```bash
root@alpha:/# dig -x 10.10.0.3 +noall +answer
3.0.10.10.in-addr.arpa.	600	IN	PTR	beta.lab.
root@alpha:/# dig -x 198.41.0.4 +short
a.root-servers.net.
```

Docker's DNS service answers reverse lookups for containers, so beta's address gives `beta.lab.`, the container name plus the network name. On the internet, reverse records are set by whoever owns the address range, usually a hosting or cloud provider, not by the owner of the domain. Mail servers check them, and tools such as `traceroute` and `ss -r` use them to show names instead of numbers.

| Type | Maps a name to | Typical use |
| --- | --- | --- |
| A | An IPv4 address | Websites, servers |
| AAAA | An IPv6 address | The same, over IPv6 |
| CNAME | Another name | Aliases, pointing at a cloud service |
| MX | Mail servers, with priorities | Receiving email |
| TXT | Free text | SPF, domain verification |
| NS | Authoritative name servers | Delegating a domain |
| SOA | Zone details | Serial, timers, negative TTL |
| PTR | A name, from an address | Reverse lookups |

## Tasks

### Task 1: Profile a domain

Write down every record of the types A, AAAA, MX, TXT and NS that example.org publishes. Use `+short`, and ask the authoritative server for AAAA. From the results, answer: does example.org accept email, and who hosts its DNS?

<details>
<summary>Check your work</summary>

```bash
root@alpha:/# for t in A MX TXT NS; do echo "== $t"; dig +short example.org $t; done
== A
172.66.157.237
104.20.26.136
== MX
0 .
== TXT
"_uyh0vgv5ukyofwj3ddwspnni01vmlyy"
"v=spf1 -all"
== NS
katelyn.ns.cloudflare.com.
mitch.ns.cloudflare.com.
root@alpha:/# dig +short example.org AAAA @$(dig +short example.org NS | head -1)
2606:4700:10::6814:1a88
2606:4700:10::ac42:9ded
```

The null MX, `0 .`, says it accepts no email, and the SPF record says no server may send mail for it either. The NS records name the DNS provider. Values change over time, so yours may differ. The likely mistake is asking for AAAA through the lab resolver, getting nothing, and concluding the domain has no IPv6.

</details>

### Task 2: Read a TTL

Run `dig example.com SOA +noall +answer` and find the negative TTL. Then run `dig nosuch.example.com` and read the status. Explain what would happen if someone created `nosuch.example.com` a minute after your lookup.

<details>
<summary>Check your work</summary>

The negative TTL is the last number of the SOA, 1800 seconds when this was written. The lookup shows `status: NXDOMAIN`. A resolver that gave that answer may keep giving it for up to 30 minutes, so the new name would not appear for anyone using that resolver until the cached NXDOMAIN expires. A common mistake is reading the TTL in the second column of the SOA line, which is how long the SOA record itself may be cached, instead of the last field inside its value.

</details>

## Quiz

**1. What is the difference between an A record and a CNAME record?**

<details>
<summary>Show answer</summary>

An A record maps a name directly to an IPv4 address. A CNAME maps a name to another name, which the resolver then looks up in turn. A name with a CNAME cannot have any other records.

</details>

**2. A domain has `MX 10 mail-01.example.com.` and `MX 20 mail-02.example.com.`. Which server receives mail normally?**

<details>
<summary>Show answer</summary>

`mail-01`, because the lower priority number is tried first. `mail-02` only receives mail when `mail-01` does not answer.

</details>

**3. A cloud service asks you to add a TXT record with a long random value before it will work with your domain. Why?**

<details>
<summary>Show answer</summary>

It is a verification check. Only someone who controls the domain's DNS can publish that record, so finding it proves to the service that you own the domain.

</details>

**4. A service on a server cannot be reached under its new name: you added an A record for `api.example.com` ten minutes ago, the authoritative server returns it, but your resolver still says `NXDOMAIN`. You had tried the name once before creating it. What is going on?**

<details>
<summary>Show answer</summary>

The resolver cached the earlier `NXDOMAIN` answer for the negative TTL, the last value in the domain's SOA record. Until that expires, it keeps saying the name does not exist. You can wait, query the authoritative server with `dig @` to confirm the record is right, or flush the resolver's cache if you control it.

</details>

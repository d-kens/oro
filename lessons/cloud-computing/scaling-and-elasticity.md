In the cloud you can have more servers when you need them and fewer when you do not. Using that well changes how applications are built.

This topic covers scaling up and out, elasticity, and why cloud applications are designed for servers that fail and disappear. By the end you can choose between the two kinds of scaling, and you will have scaled a small service on your own computer.

## Scaling up and scaling out

**Scalability:** The ability of a system to handle more work by adding resources.

There are two ways to add them:

- **Scaling up (vertical scaling):** Giving one machine more resources, such as more CPUs or memory.
- **Scaling out (horizontal scaling):** Adding more machines of the same size and sharing the work between them.
- **Load balancer:** A service that sits in front of several machines and spreads incoming requests across them.

| | Scaling up | Scaling out |
| --- | --- | --- |
| How | Bigger machine | More machines |
| Limit | The biggest machine available | Very high |
| Downtime to change | Usually a restart | None |
| One failure | Takes everything down | Takes out one copy |
| Application changes | None | Must be able to run as many copies |

Cloud applications mostly scale out. Databases are the common exception, because they are hard to split, so they are often scaled up and given a standby copy instead.

## Elasticity

**Elasticity:** The ability to add and remove resources automatically as demand rises and falls, so capacity matches demand at any moment.

Scalability is about growing; elasticity is about following demand both ways. When load falls, servers are removed and stop costing money.

**Auto scaling:** A cloud feature that adds or removes servers automatically, following rules you set.

A rule might be "keep average CPU use around 60 percent, with at least 2 servers and at most 20", and the cloud adds or removes servers to follow it. A shop can run on two servers overnight, ten at lunch, and forty during a sale, paying for each only while it runs.

Scaling down matters as much as scaling up. Capacity left running "just in case" is the idle capacity the cloud was supposed to remove.

## Stateless applications

**Stateless application:** An application that keeps no data about users or requests on the server itself, so any copy can handle any request.

Scaling out needs this, because the load balancer can send any request to any copy. In practice:

- User sessions are kept in a shared store or a cookie, not in one server's memory.
- Uploaded files go to shared storage, not one server's disk.
- Data lives in a database that every copy uses.

Then a new copy can start and take requests straight away, and a copy can be removed without losing anything.

## Cattle, not pets

Before the cloud, each server was usually set up by hand, given a name and repaired when it broke. In the cloud, servers are identical, created from the same image or code, and replaced rather than repaired: if one misbehaves, you delete it and a fresh one starts. Engineers call this treating servers as **cattle, not pets**.

This needs server creation to be fully automatic, which is what Docker, Terraform and Kubernetes later on the roadmap provide. It also means you plan for any single server disappearing at any time.

## Try it: scale out on your own computer

You need **Docker**. Make a directory, and in it create a file called `compose.yaml`:

```yaml
services:
  web:
    image: traefik/whoami
  lb:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - web
```

`traefik/whoami` is a tiny web server that replies with the name of the container that answered. Next to it, create `nginx.conf`, which makes nginx the load balancer:

```text
resolver 127.0.0.11 valid=5s;
server {
    listen 80;
    location / {
        set $backend http://web:80;
        proxy_pass $backend;
    }
}
```

`127.0.0.11` is Docker's built-in DNS server. The name `web` resolves to every copy of the `web` service, and the short `valid` time makes nginx notice new copies quickly.

Start it with one copy, and ask it who answered:

```bash
$ docker compose up -d
$ curl -s localhost:8080 | grep Hostname
Hostname: 3f2a91c0d4e7
```

Now scale out to three copies, wait about five seconds for nginx to look the name up again, and ask several times:

```bash
$ docker compose up -d --scale web=3
$ for i in 1 2 3 4 5 6; do curl -s localhost:8080 | grep Hostname; done
Hostname: 3f2a91c0d4e7
Hostname: 8b10e5f7a2c3
Hostname: c49d2e6b1f08
Hostname: 3f2a91c0d4e7
Hostname: 8b10e5f7a2c3
Hostname: c49d2e6b1f08
```

Different copies answer different requests. Your hostnames will differ. When you are finished, stop everything:

```bash
$ docker compose down
```

## Tasks

### Task 1: Lose a copy

With three copies running, stop one of them while requests keep coming. Find the container names with `docker compose ps`, then stop one with `docker stop <name>`. Keep sending requests. What happens?

<details>
<summary>Check your work</summary>

```bash
$ docker compose ps --format '{{.Name}}'
demo-lb-1
demo-web-1
demo-web-2
demo-web-3
$ docker stop demo-web-2
$ for i in 1 2 3 4; do curl -s localhost:8080 | grep Hostname; done
```

The prefix is your directory's name. Every request still gets an answer, from the two remaining copies. If nginx sends a request to the stopped copy, the connection fails and it tries another copy, so users never see the failure. Real load balancers go further and run health checks, sending no traffic to a copy until it answers them again. The Networking and AWS skills cover them.

</details>

### Task 2: Up or out

For each, say whether you would scale up or out:

1. A website whose traffic doubles every evening.
2. An old accounting program that can only run as one copy and is running out of memory.

<details>
<summary>Check your work</summary>

1. **Out**, with auto scaling, so copies are added in the evening and removed overnight.
2. **Up**: it cannot run as several copies, so the only option is a bigger machine.

</details>

## Quiz

**1. What makes scaling out more reliable than scaling up?**

<details>
<summary>Show answer</summary>

With several copies behind a load balancer, losing one machine leaves the others serving requests. With one large machine, losing it stops everything.

</details>

**2. Why must an application be stateless to scale out well?**

<details>
<summary>Show answer</summary>

Because the load balancer can send any request to any copy, and copies are added and removed at any time. If a copy kept a user's session or files to itself, they would be lost or missing when another copy answered.

</details>

**3. What does "cattle, not pets" mean for how you fix a broken server?**

<details>
<summary>Show answer</summary>

You replace it instead of repairing it: delete the broken server and let automation start a fresh, identical one. That only works if servers are created automatically from an image or code.

</details>

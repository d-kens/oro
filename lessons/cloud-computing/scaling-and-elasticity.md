The most useful thing the cloud gives you is not a cheaper server. It is the ability to have more servers when you need them and fewer when you do not, without buying or selling anything. Using that well takes a different way of thinking about servers.

This topic covers scaling up and out, elasticity, and why cloud applications are designed for servers that fail and disappear. By the end you can choose between the two kinds of scaling, and you will have scaled a small service on your own computer.

## Scaling up and scaling out

When an application needs more capacity, there are two ways to give it more.

**Scaling up**, or *vertical scaling*, means a bigger machine: more CPUs, more memory. **Scaling out**, or *horizontal scaling*, means more machines of the same size, with a **load balancer** in front that spreads requests across them.

| | Scaling up | Scaling out |
| --- | --- | --- |
| How | Bigger machine | More machines |
| Limit | The biggest machine available | Very high |
| Downtime to change | Usually a restart | None |
| One failure | Takes everything down | Takes out one copy |
| Application changes | None | Must be able to run as many copies |

Cloud applications mostly scale out. Databases are the common exception, because they are hard to split, so they are often scaled up and given a standby copy instead.

## Elasticity

**Elasticity** is scaling in both directions, automatically. When load rises, servers are added; when it falls, they are removed and stop costing money.

Clouds do this with **auto scaling**: you set a rule such as "keep average CPU use around 60 percent, with at least 2 servers and at most 20", and the cloud adds or removes servers to follow it. A shop can run on two servers overnight, ten at lunch, and forty during a sale, paying for each only while it runs.

Scaling down matters as much as scaling up. Capacity left running "just in case" is the idle capacity the cloud was supposed to remove.

## Stateless applications

For scaling out to work, any copy must be able to handle any request. So the copies cannot keep anything important to themselves. An application built this way is **stateless**:

- User sessions are kept in a shared store or a cookie, not in one server's memory.
- Uploaded files go to shared storage, not one server's disk.
- Data lives in a database that every copy uses.

Then a new copy can start and take requests straight away, and a copy can be removed without losing anything.

## Cattle, not pets

Before the cloud, servers were often treated like **pets**: each had a name, was set up by hand, and when it got sick someone nursed it back to health. Losing one was a crisis.

In the cloud, servers are treated like **cattle**: identical, numbered, created from the same image or code, and replaced rather than repaired. If one misbehaves, you delete it and the auto scaling group starts a fresh one.

This works only if creating a server is fully automatic, which is why the later skills on the roadmap, Docker, Terraform and Kubernetes, matter so much. And it changes how you plan: you assume any single server can disappear at any moment, and design so that it does not matter.

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

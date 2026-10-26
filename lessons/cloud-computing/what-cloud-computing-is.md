Every application needs machines to run its code, disks to keep its data, and a network to reach its users. Cloud computing is a way of getting those without owning them.

This topic explains what cloud computing is, and the five things that make a service a cloud rather than just someone else's server. By the end you can explain the cloud in one sentence and tell whether a service you meet counts as one.

## Renting instead of buying

**Cloud computing:** Getting computing resources, such as servers, storage, databases and networks, over the internet from a shared pool run by a provider. You set them up when you need them and release them when you are done, with little effort and no help from the provider, and you pay only for what you use.

In practice, you ask a provider for a server, you get it within minutes, and when you delete it the charges stop.

A company that sells shoes online needs servers, but running a building full of them is not its business. It rents them from a provider that runs servers at a scale no shoe shop could reach.

What you can rent covers almost everything an application needs:

| You rent | Instead of |
| --- | --- |
| Virtual servers | Buying physical servers and putting them in a room |
| Storage | Buying disks and replacing them when they fail |
| Databases | Installing, patching and backing up a database yourself |
| Networks | Cables, switches, routers and firewalls |
| Ready-made services | Building email delivery, queues, search or machine learning from scratch |

## The five characteristics

The standard definition, from the US standards body NIST, says a service is a cloud only if it has all five of these characteristics:

- **On-demand self-service:** You set up computing resources, such as servers and storage, yourself, whenever you need them, through a website, a command or an API, without contacting anyone at the provider.
- **Broad network access:** Services are available over the network through standard tools, so you can reach them from any kind of device: a laptop, a phone or another server.
- **Resource pooling:** The provider's hardware is shared by many customers, a *multi-tenant* model. Each customer gets a share that is kept separate from the others, and shares are handed out and taken back as customers need them. You do not choose, or usually know, which physical machine you are on.
- **Rapid elasticity:** Resources can be added or removed quickly, often automatically, to match demand. To the customer, the supply looks unlimited.
- **Measured service:** The provider meters what each customer uses, such as hours of server time, gigabytes stored or requests made. Both sides can see exactly what was used, and you are billed for it.

The cloud does not remove servers. They still exist and still fail; what changes is that the provider handles the hardware and you work through software: servers, networks and permissions are created by commands and code.

## Tasks

### Task 1: Spot the cloud

For each of these, decide whether it meets all five characteristics. If not, say which one is missing.

1. A company rents three servers in a hosting company's building. To change anything, it opens a support ticket and waits two days.
2. A developer creates a database from a provider's website, uses it for an afternoon, deletes it and is charged for four hours.
3. A university buys 200 servers for its own data centre and lets staff request virtual machines from a web page. Each department pays a fixed amount per year whatever it uses.

<details>
<summary>Check your work</summary>

1. **Not a cloud.** There is no self-service (a person handles every change) and no rapid elasticity. This is ordinary hosting.
2. **A cloud.** Self-service, over the network, pooled, quick to add and remove, and measured by the hour.
3. **Close, but not quite.** It has self-service and pooling, but the supply is limited to the 200 servers and use is not measured. A company running a cloud like this for itself is called a *private cloud*, covered in the *Deployment models* topic, and most do measure use.

</details>

### Task 2: Explain it in one sentence

Write one sentence that explains cloud computing to someone who has never worked in tech. Then check it against the five characteristics: which ones does your sentence cover?

<details>
<summary>Check your work</summary>

One possible sentence: *"Instead of buying computers, a company rents them over the internet, gets them in minutes, and pays only for the time it uses them."* That covers network access, self-service, elasticity and measured service. Pooling is hidden from the customer, so most one-sentence explanations leave it out, and that is fine.

</details>

### Task 3: Cheap enough to offer

Which characteristic makes the cloud cheap enough for the provider to offer?

<details>
<summary>Check your work</summary>

Resource pooling. Many customers share the same hardware, so machines are kept busy instead of standing idle, and the provider buys and runs them at a scale no single customer could.

</details>

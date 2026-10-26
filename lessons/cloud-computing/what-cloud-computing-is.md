Every application needs machines to run its code, disks to keep its data, and a network to reach its users. Cloud computing is a way of getting those without owning them.

This topic explains what cloud computing is, and the five things that make a service a cloud rather than just someone else's server. By the end you can explain the cloud in one sentence and tell whether a service you meet counts as one.

## Renting instead of buying

**Cloud computing** is renting computing over the internet instead of buying it. You ask a provider for a server, some storage or a database, you get it within minutes, and you pay only for the time you use it. When you no longer need it, you delete it and the charges stop.

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

"Cloud" gets stuck on many products that are not really one. A widely used definition, from the US standards body NIST, says a cloud service has five characteristics. They are worth knowing because each one explains something you will meet later.

1. **On-demand self-service.** You get resources yourself, from a website, a command or a script, without asking a person or waiting for a purchase order.
2. **Broad network access.** You reach and manage everything over the network, from anywhere, using standard tools.
3. **Resource pooling.** The provider's machines are shared between many customers. Your server is one of many running on the same hardware, kept separate from the others. This sharing is what makes it cheap.
4. **Rapid elasticity.** You can add resources quickly when you need more and remove them when you need less. To you, the supply looks almost unlimited.
5. **Measured service.** Use is measured, by the second, the gigabyte or the request, and you pay for what was measured.

A simple test: if getting a new server means emailing someone and waiting a week, it is not a cloud, even if the server is in someone else's building. That is just hosting.

The cloud does not remove servers. They still exist and still fail; what changes is that the provider handles the hardware and you work through software: servers, networks and permissions are created by commands and code, which is why so much of the roadmap is about automation.

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

## Quiz

**1. A friend says "the cloud just means someone else's computer". What is right and what is missing?**

<details>
<summary>Show answer</summary>

It is right that your work runs on a provider's machines. What is missing is how you use them: self-service in minutes, sharing between many customers, adding and removing capacity at will, and paying only for what you use. Someone else's computer that takes a week to set up and a year's contract is hosting, not a cloud.

</details>

**2. Which characteristic makes the cloud cheap enough for the provider to offer?**

<details>
<summary>Show answer</summary>

Resource pooling. Many customers share the same hardware, so machines are kept busy instead of standing idle, and the provider buys and runs them at a scale no single customer could.

</details>

**3. Why does cloud computing push teams towards automation?**

<details>
<summary>Show answer</summary>

Because everything is created through software, by a website, a command or an API call. Anything you can do with a command can be put in a script or code and repeated exactly, so teams build and change their infrastructure with code instead of by hand.

</details>

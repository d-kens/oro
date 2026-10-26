The service models are about *what* you rent. The deployment models are about *whose* cloud it is and where it runs: a provider's shared cloud, a company's own, or a mix of several.

This topic covers public, private, community, hybrid and multi-cloud, and the reasons a company picks each. By the end you can describe a company's setup in these terms and explain why it might have ended up that way.

## Public cloud

**Public cloud:** Cloud infrastructure owned and run by a provider and open for anyone to use, from individuals to large companies. It sits in the provider's data centres.

AWS, Microsoft Azure and Google Cloud are public clouds. "Public" does not mean your data is public. It means the hardware is shared between many customers, kept apart by the provider's software.

The public cloud has all five characteristics from the first topic at their fullest: almost unlimited capacity, pay for what you use, and nothing to buy. It is what most people mean by "the cloud", and it is what this roadmap teaches.

## Private cloud

**Private cloud:** Cloud infrastructure used by one organisation only. The organisation or another company may own and run it, in the organisation's own building or elsewhere.

It runs on hardware set aside for that one organisation, with software that gives its teams self-service: they request VMs, storage and networks from a portal or an API, just as they would in a public cloud. OpenStack and VMware are common ways to build one.

A private cloud gives full control over the hardware and where the data is, which matters for some laws, contracts and security rules. The cost is that the organisation is back to buying hardware and guessing capacity, so its supply is limited to what it owns.

## Community cloud

**Community cloud:** Cloud infrastructure shared by a group of organisations with the same needs, such as government agencies or hospitals that must follow the same rules.

Community clouds are less common than the other models. You meet them mostly in government and regulated industries.

## Hybrid cloud

**Hybrid cloud:** Two or more separate clouds, such as a private and a public cloud, joined so that data and applications can move between them.

In practice, a company joins its own servers or private cloud to a public cloud, so the two work as one setup. They are connected by a private network link or a VPN, and share identities, monitoring and often tooling.

Companies go hybrid for practical reasons:

- **Moving gradually.** Large companies cannot move hundreds of applications at once. During a move, which can last years, some run in each place.
- **Data that must stay.** Customer records stay on-premises for legal reasons, while the website that uses them runs in the public cloud.
- **Bursting.** The steady load runs on owned servers, and extra demand spills into the public cloud.
- **Equipment on site.** Factories, shops and hospitals keep local computers for machines that cannot depend on the internet.

## Multi-cloud

**Multi-cloud:** Using the services of more than one public cloud provider, for example AWS for most applications and Google Cloud for data analysis.

Sometimes this is a plan: using the best service from each provider, or avoiding depending on one company. Often it is an accident: one team chose one provider, another team or a bought company chose another.

It comes at a price. Each provider has its own services, names, permissions and bills, so teams need more skills and more tooling, and moving data between providers costs money. Running one application across two providers so it survives either one failing is much harder than it sounds, and few companies do it.

Most companies start in one public cloud. Hybrid and multi-cloud usually come from history, rules or a gradual move, not from a first design.

## Tasks

### Task 1: Name the model

1. A bank keeps account records in its own data centre but runs its mobile-app back end on a public cloud, connected by a private link.
2. A start-up runs everything on one public cloud provider.
3. A government agency runs OpenStack in its own building so departments can create VMs from a portal.
4. A retailer runs its shop on AWS and its data analysis on Google Cloud.

<details>
<summary>Check your work</summary>

1. **Hybrid.**
2. **Public.**
3. **Private.**
4. **Multi-cloud.** It uses two public providers. If it also kept servers of its own, it would be hybrid as well; the two terms can both apply.

</details>

### Task 2: Advise a company

A company has 80 applications in its own data centre. Its lease on the building ends in four years. Customer records must stay in the country, and its chosen public cloud provider has a region there. What deployment model would you expect it to use, now and in four years?

<details>
<summary>Check your work</summary>

**Hybrid now**, because it cannot move 80 applications at once, so for a while some run in each place. **Public in four years**, once everything has moved and the building is closed. The rule about customer records can be met in the public cloud, because the provider has a region in the country. The *Regions and zones* topic covers regions.

</details>

## Quiz

**1. Does "public cloud" mean anyone can see your data?**

<details>
<summary>Show answer</summary>

No. It means the provider's hardware is shared by many customers. Each customer's resources are kept separate, and nobody can reach your data unless you allow it.

</details>

**2. What is the difference between hybrid and multi-cloud?**

<details>
<summary>Show answer</summary>

Hybrid joins your own servers or private cloud with a public cloud. Multi-cloud uses more than one public cloud provider. A company can be both.

</details>

**3. Why might a company with its own data centre still find a private cloud worth building?**

<details>
<summary>Show answer</summary>

Because it gives its teams self-service: they can get VMs and storage in minutes from a portal or API instead of filing requests and waiting. The hardware is the same; the way teams use it changes.

</details>

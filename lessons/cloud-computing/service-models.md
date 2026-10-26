Renting from a cloud does not mean one kind of thing. You can rent a bare virtual server and set up everything on it yourself, or rent a finished application and just log in. Between those two ends are several steps, and each one moves more of the work from you to the provider.

This topic covers the service models, IaaS, PaaS, SaaS and serverless, and what you manage in each. By the end you can place any cloud service in one of them and say which parts of the work are yours.

## The layers of an application

Every application stands on the same layers: its data, the application code, the runtime it needs (such as Python or Java), the operating system, the virtual machine, and the hardware and building under it. On-premises, you look after all of them. The service models differ in where the line falls between your layers and the provider's.

## IaaS: infrastructure as a service

With **IaaS** you rent the basic building blocks: virtual machines, disks and networks. The provider runs everything up to and including the virtual machine. You install and manage the operating system and everything above it.

This is closest to having your own servers, without the hardware. It gives you the most control and the most work. Examples are virtual servers such as AWS EC2, Azure Virtual Machines and Google Compute Engine.

Choose IaaS when you need full control of the machine: special software, an unusual setup, or an existing application moved as it is.

## PaaS: platform as a service

With **PaaS** you hand over your code and the provider runs it. It looks after the operating system, the runtime, updates and scaling. You manage only your application and its data.

You no longer patch servers or install Python; you deploy code and say how many copies to run. Examples are AWS Elastic Beanstalk, Azure App Service, Google App Engine and Heroku. Managed databases, where the provider installs, patches and backs up the database for you, work the same way.

Choose PaaS when you want to spend your time on the application, not the machines under it, and your application fits the platform's way of doing things.

## SaaS: software as a service

With **SaaS** you rent a finished application. The provider runs all of it; you just use it, usually in a browser. Email, office suites, chat tools and customer-management systems are mostly SaaS today: Gmail, Microsoft 365, Slack and Salesforce are examples.

You still own your data and your settings: who has an account, what they can see, and what you put in. Everything else is the provider's.

## Serverless

**Serverless** is a newer step between PaaS and SaaS. You write small pieces of code, *functions*, and the provider runs each one only when something triggers it: a web request, a file arriving, a message in a queue. When nothing is happening, nothing runs and you pay nothing.

There are still servers, but you never see or size them. Examples are AWS Lambda, Azure Functions and Google Cloud Functions. Fully managed services such as storage buckets and queues are often called serverless too, because they have no servers for you to manage.

## Who manages what

| Layer | On-premises | IaaS | PaaS | Serverless | SaaS |
| --- | --- | --- | --- | --- | --- |
| Data | You | You | You | You | You |
| Application | You | You | You | You | Provider |
| Runtime | You | You | Provider | Provider | Provider |
| Operating system | You | You | Provider | Provider | Provider |
| Virtual machine | You | Provider | Provider | Provider | Provider |
| Hardware and data centre | You | Provider | Provider | Provider | Provider |

Reading down a column tells you what a team has to look after. Reading across a row shows that your data is always yours, in every model.

Moving right means less work and less control. Moving left means more of both. Most companies use a mix: SaaS for email, PaaS or serverless for new applications, IaaS for the software that needs a whole machine.

## Tasks

### Task 1: Place the service

Put each of these in a service model:

1. A company runs its own Linux virtual servers in the cloud and installs its database on them.
2. A team uses a cloud-hosted spreadsheet tool through the browser.
3. A developer uploads a function that resizes each image dropped into a storage bucket.
4. A team pushes its web application's code and the platform runs three copies of it, patched and scaled for them.

<details>
<summary>Check your work</summary>

1. **IaaS.** They manage the operating system and the database themselves.
2. **SaaS.** They only use the application.
3. **Serverless.** Code runs only when an image arrives.
4. **PaaS.** They manage the code; the platform manages everything under it.

</details>

### Task 2: Patch day

A serious security flaw is found in the Linux kernel. For each model, who has to apply the fix: IaaS, PaaS, serverless, SaaS?

<details>
<summary>Check your work</summary>

With **IaaS**, you do: the operating system is yours. With **PaaS**, **serverless** and **SaaS**, the provider does, because the operating system is on their side of the line. This is one of the main reasons teams choose PaaS and serverless.

</details>

## Quiz

**1. What is the main trade-off as you move from IaaS towards SaaS?**

<details>
<summary>Show answer</summary>

Less work but less control. The provider takes on more layers, so you manage less, but you also have fewer choices about how those layers are set up.

</details>

**2. In which service model is your data the provider's responsibility?**

<details>
<summary>Show answer</summary>

None of them. Your data, and who is allowed to see it, is always yours to look after, even in SaaS.

</details>

**3. A colleague says "serverless means there are no servers". Is that right?**

<details>
<summary>Show answer</summary>

No. The code still runs on servers, but the provider manages them completely and you never see, size or patch them. "Serverless" means no servers *for you* to manage.

</details>

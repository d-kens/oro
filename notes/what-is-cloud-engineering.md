This topic answers five questions, in order:

1. What is the cloud?
2. What does a cloud engineer do?
3. How is cloud engineering different from DevOps and SRE?
4. What can you rent from a cloud?
5. Where do you start?

## 1. What is the cloud?

Every app you use runs on computers somewhere. Those computers need power, cooling, network cables and people to replace parts when they break.

Companies used to buy their own servers and keep them in a room or a rented data centre. Buying a server took weeks, and you paid for it whether you used it or not.

**The cloud is renting those computers instead of owning them.** AWS puts it this way: cloud computing is "the on-demand delivery of IT resources over the Internet with pay-as-you-go pricing."

| Owning servers | Renting from the cloud |
| --- | --- |
| Order hardware and wait for it to arrive | Ask for a server and get it in minutes |
| Pay up front, even for servers sitting idle | Pay for what you use, while you use it |
| Buy for your busiest day | Add servers when busy, remove them when quiet |
| Fix broken hardware yourself | The cloud provider fixes the hardware |

A **cloud provider** is the company you rent from. The biggest are Amazon Web Services (AWS), Microsoft Azure and Google Cloud. This roadmap uses **AWS** only. The others offer the same ideas under different names, so what you learn here carries over.

## 2. What does a cloud engineer do?

**A cloud engineer designs, builds, secures and runs systems on the cloud.**

A "system" here means everything an app needs to work: the servers it runs on, where it stores data, the network that connects them, and who is allowed to touch them.

On a normal day, the work falls into four kinds:

| Kind of work | What it looks like |
| --- | --- |
| **Design** | Choose which cloud services an app should use, and how they connect |
| **Build** | Set those services up, usually by writing code that creates them rather than clicking through a website |
| **Secure** | Decide who can do what, keep passwords and keys out of code, and keep data private |
| **Run** | Watch the systems, fix them when they break, and keep the monthly bill under control |

The last point surprises people. In the cloud, every server you forget to switch off costs money. Keeping costs down is part of the job.

## 3. How is it different from DevOps and SRE?

You will see these three names in job adverts, often for similar work. They overlap a lot, but each has a different focus.

| Name | Mainly about | A typical question |
| --- | --- | --- |
| **Cloud engineering** | The cloud platform itself: its services, networks and security | "Which services should this app run on, and how do we set them up safely?" |
| **DevOps** | A way of working: developers and operations work as one team, and automate the steps from code to users | "How do we get a change to users quickly and safely?" |
| **SRE** (Site Reliability Engineering) | Keeping systems reliable, using engineering and numbers | "How reliable does this need to be, and how do we keep it there?" |

So DevOps is a way of working, while cloud engineering and SRE are kinds of jobs. A cloud engineer often works the DevOps way, and the [DevOps mindset](devops-mindset.html) topic covers that in detail later in the roadmap.

In small companies, one person often does all three. Titles differ between companies, so read what a job involves, not just its name.

## 4. What can you rent from a cloud?

AWS has hundreds of services, but most systems are built from a few kinds. Learn these and the rest are variations.

| Kind | What it gives you | AWS examples |
| --- | --- | --- |
| **Compute** | Computers to run your code | EC2 (virtual servers), Lambda (run code without managing a server) |
| **Storage** | Places to keep files | S3 (files of any size), EBS (disks for servers) |
| **Databases** | Databases that AWS sets up, patches and backs up for you | RDS (SQL databases), DynamoDB (a NoSQL database) |
| **Networking** | A private network, and ways for users to reach your app | VPC (your private network), Route 53 (DNS), Elastic Load Balancing, CloudFront (a CDN) |
| **Identity and security** | Control over who can do what | IAM (users, roles and permissions) |
| **Monitoring** | A view of what your systems are doing | CloudWatch (metrics, logs and alarms) |

Each of these kinds has its own stage or topic on the roadmap.

## 5. Where do you start?

Cloud services are built on ordinary computers and networks. A server on AWS is still a Linux machine, and connecting services is still networking. If those basics are missing, the cloud feels like magic, and it is hard to fix when it breaks.

So the roadmap starts on your own computer:

1. **Orientation:** how the cloud is organised. This topic, then how the cloud works.
2. **Foundations:** Linux, networking, Git and scripting. You do not need a cloud account for any of these.
3. **The cloud itself:** the core services, cloud networking, and identity and security.
4. **Automate, run and design:** building everything from code, running systems at scale, and designing whole systems.

Work through it in order. Each topic builds on the ones before it.

## Summary

- **The cloud** is renting computers, storage and other services over the internet, and paying for what you use, instead of buying and running your own.
- **A cloud engineer** designs, builds, secures and runs systems on the cloud, and keeps the bill under control.
- **DevOps** is a way of working, **SRE** is about reliability, and **cloud engineering** is about the cloud platform. They overlap, and one person often does all three.
- Most systems are built from a few kinds of service: **compute, storage, databases, networking, identity and security, and monitoring**.
- **Start with the foundations.** Linux and networking come before the cloud, because the cloud is built on them.

**Next:** How the cloud works. Where AWS's data centres are, the different ways to rent from a cloud, and which parts of security are your job.

## Further reading

- [What is cloud computing?](https://aws.amazon.com/what-is-cloud-computing/): AWS's own plain-language introduction.
- [AWS global infrastructure](https://docs.aws.amazon.com/whitepapers/latest/aws-overview/global-infrastructure.html): a short page on how AWS spreads its data centres around the world.

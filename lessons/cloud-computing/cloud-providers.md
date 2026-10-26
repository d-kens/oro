There are many cloud providers, but three are much larger than the rest, and all of them offer the same basic building blocks under different names. Once you understand the ideas in this skill, moving between providers is mostly a matter of learning new names.

This topic covers the main providers, how their core services line up, and how to think about choosing one. By the end you can translate a service name from one provider to another, and explain why this roadmap teaches AWS.

## The big three

- **Amazon Web Services (AWS)** started in 2006, has been the largest provider ever since, and offers the most services. Many companies, from start-ups to governments, run on it.
- **Microsoft Azure** started in 2010. It is strong with companies that already use Microsoft products such as Windows Server, Active Directory and Microsoft 365, and is the second largest.
- **Google Cloud** started in 2008. It is known for data analysis, machine learning and Kubernetes, which began at Google.

## Other providers

There are many smaller providers too, such as Oracle Cloud, IBM Cloud, Alibaba Cloud and DigitalOcean, and local providers in many countries, often chosen to keep data inside the country.

## The same ideas, different names

Every major provider offers the same core building blocks:

| Building block | AWS | Azure | Google Cloud |
| --- | --- | --- | --- |
| Virtual servers | EC2 | Virtual Machines | Compute Engine |
| Object storage | S3 | Blob Storage | Cloud Storage |
| Private network | VPC | Virtual Network | VPC |
| Managed relational database | RDS | Azure SQL Database | Cloud SQL |
| Serverless functions | Lambda | Azure Functions | Cloud Functions |
| Managed Kubernetes | EKS | AKS | GKE |
| Identity and permissions | IAM | Entra ID and Azure RBAC | Cloud IAM |
| Monitoring and logs | CloudWatch | Azure Monitor | Cloud Monitoring and Logging |

The details differ: how permissions are written, how networks are laid out, what each service can do. But a virtual server is a virtual server, and the concepts from this skill, regions and zones, service models, scaling, pricing and shared responsibility, apply to all of them.

## Choosing a provider

Companies usually choose based on what they already use (a company on Microsoft products often picks Azure), the services and regions they need, the skills of their team, and price.

## Why this roadmap teaches AWS

The Cloud engineer roadmap uses AWS because it is the largest provider, it appears in the most job adverts, and it has the most learning material around it. Learning one provider well is worth more than learning three a little. Everything you learn transfers: the second provider takes weeks to learn, not months.

## Tasks

### Task 1: Translate

A team on Azure uses Virtual Machines, Blob Storage and AKS. They are moving to AWS. What are the AWS names for each?

<details>
<summary>Check your work</summary>

Virtual Machines become **EC2**, Blob Storage becomes **S3**, and AKS becomes **EKS**.

</details>

### Task 2: Pick for a company

A company runs Windows servers, signs its staff in with Active Directory and uses Microsoft 365 for email and documents. It wants to move its servers to the cloud. Which provider would you expect it to look at first, and why might it still choose another?

<details>
<summary>Check your work</summary>

**Azure** first, because it works closely with the Microsoft products it already uses and Microsoft often offers licence discounts for running them there. It might still choose AWS or Google Cloud if its team knows them better, a service it needs is better there, or it gets a better price. All three run Windows servers.

</details>

## Quiz

**1. What is the Google Cloud name for AWS's S3?**

<details>
<summary>Show answer</summary>

Cloud Storage.

</details>

**2. Why does learning one provider well make learning a second one much faster?**

<details>
<summary>Show answer</summary>

Because they all offer the same building blocks built on the same ideas. With the second provider you learn new names and details, not new concepts.

</details>

**3. Name two reasons a company might choose a smaller provider over the big three.**

<details>
<summary>Show answer</summary>

Any two of: a simpler set of services that is easier to learn, lower or more predictable prices, a local provider that keeps data in the country, or support that suits a small company better.

</details>

Moving to the cloud does not hand all of security to the provider. The provider secures some things and you secure others, and most cloud security incidents happen on the customer's side of that line: a storage bucket left open to the world, a password that was too simple, an access key pushed to a public repository.

This topic covers the **shared responsibility model**: what the provider is responsible for, what you are, and how the line moves with the service model. By the end you can say who is responsible for any given security task.

## Security of the cloud, security in the cloud

Providers describe the split in two phrases:

- **The provider is responsible for the security *of* the cloud**: the buildings, the hardware, the network between data centres, the hypervisors, and the software that runs their services.
- **You are responsible for security *in* the cloud**: what you put there and how you set it up. Your data, who can reach it, your accounts and passwords, your network rules, and, depending on the service, your operating systems and applications.

## The line moves with the service model

The more the provider runs, the more it secures. This follows the table in the *Service models* topic:

| Responsibility | IaaS | PaaS | SaaS |
| --- | --- | --- | --- |
| Data and who can see it | You | You | You |
| Users, passwords and permissions | You | You | You |
| Application code and its settings | You | You | Provider (you configure it) |
| Operating system patches | You | Provider | Provider |
| Network rules around your resources | You | Shared | Provider |
| Hypervisor, hardware, buildings | Provider | Provider | Provider |

Two rows never move. **Your data** and **who has access** are always yours, in every model. No provider can decide for you who should see your customer records.

## What usually goes wrong

Almost every well-known cloud breach comes from the customer's side, and from the same few mistakes:

- **Open storage.** A storage bucket set to public, holding backups or customer files. Anyone who finds the address can download everything.
- **Weak or stolen sign-ins.** An administrator account without multi-factor authentication, guessed or phished.
- **Leaked keys.** Access keys written into code and pushed to a public Git repository, where automated scanners find them within minutes.
- **Too many permissions.** Every person and program given administrator rights because it was easier, so one stolen key can do anything.
- **Open ports.** A database or remote-login port reachable from the whole internet instead of only from the servers that need it.
- **Unpatched servers.** On IaaS, an operating system left without security updates for months.

None of these is a failure of the provider's security. Each one is a setting the customer chose.

## The habits that prevent most of it

Each mistake above has a matching habit: multi-factor authentication for every person; **least privilege**, giving each person and program only the permissions its job needs; keys kept out of code; storage private by default; only the ports you need, open to only the addresses that need them; and patching whatever is on your side of the line. The IAM, Security and DevSecOps skills cover each one in practice.

## Tasks

### Task 1: Whose job is it?

For each, say whether the provider or the customer is responsible:

1. A hard drive fails in a data centre.
2. A database on a virtual server (IaaS) is missing last month's security patch.
3. The same database on a managed database service (PaaS) is missing it.
4. A storage bucket of invoices is readable by anyone on the internet.
5. A former employee can still sign in to the company's SaaS email.

<details>
<summary>Check your work</summary>

1. **Provider.** Hardware is always theirs.
2. **Customer.** On IaaS, the operating system and software are yours to patch.
3. **Provider.** On a managed service they patch the database software.
4. **Customer.** Access to your data is always yours.
5. **Customer.** Users and who can sign in are always yours, even in SaaS.

</details>

### Task 2: Find the mistakes

A team's setup: one administrator account shared by four people with a password and no MFA; an access key in the application's code on a public repository; a database port open to the whole internet. List each problem and the fix.

<details>
<summary>Check your work</summary>

- **Shared administrator account without MFA:** give each person their own account with only the permissions they need, and turn on MFA for all of them.
- **Key in a public repository:** remove the key from use immediately, since it must be treated as stolen, then give the application a role or keep the key in a secret store. Deleting it from the code is not enough; it stays in the Git history.
- **Database open to the internet:** allow its port only from the application servers.

</details>

## Quiz

**1. What does "security of the cloud" versus "security in the cloud" mean?**

<details>
<summary>Show answer</summary>

The provider secures the cloud itself: buildings, hardware, network and the services' software. You secure what you put in it and how you configure it: data, access, accounts and, depending on the service, operating systems and applications.

</details>

**2. Which responsibilities stay with you in every service model?**

<details>
<summary>Show answer</summary>

Your data, and who has access to it: your users, passwords, permissions and sign-in settings.

</details>

**3. An access key was pushed to a public repository an hour ago and deleted a minute later. Is it safe?**

<details>
<summary>Show answer</summary>

No. Scanners find keys in public repositories within minutes, and the key also stays in the repository's history. Treat it as stolen: disable it, make a new one, and check the audit logs for anything it was used for.

</details>

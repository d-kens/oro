In this project you take a company's servers and write a one-page plan for moving them to the cloud: what moves first, what each part runs on, how it survives failure, and who keeps it safe.

It draws on every topic in this skill, especially *Service models*, *Deployment models*, *Regions and zones*, *Scaling and elasticity* and *Shared responsibility*.

## What you need

A text editor or a document. The plan should fit on one page. There is no single right answer; the solution shows one good plan and the reasons behind it.

## The company

A clinic booking company runs everything in a server room in its office:

| What | Runs on | Notes |
| --- | --- | --- |
| Public booking website | 2 Linux servers | Busy on Monday mornings, quiet at night |
| Booking database | 1 Linux server | Holds patients' names, phone numbers and appointments |
| Staff email and documents | 1 Windows server | 40 staff |
| Nightly reports | Runs on the database server at 2 am | Takes an hour; nobody minds if it is late |
| Backups | A USB disk, changed by hand on Fridays | Kept in the same room |

Other facts:

- The office lease ends in 18 months.
- The law says patient data must stay in the country. The chosen cloud provider has a region there with three zones.
- The site went down for a day last year when the server room's air conditioning failed.
- There is one engineer, who also handles the office laptops.

## The brief

Write a plan with these sections, a few lines each:

1. **What moves, and in what order.**
2. **Service model for each part**, with a reason.
3. **Deployment model**, now and after the move.
4. **Region and zones.**
5. **Scaling.**
6. **Who secures what**: three things the provider will handle, and at least five the company must.
7. **Cost**: two ways to keep the bill down.
8. **Risks**: two things that could go wrong during the move.

## Steps

### Read the brief for clues

Each fact about the company points at a decision. Before writing, list what each one tells you: the 18-month lease, the law about patient data, the air-conditioning failure, the single engineer, the Monday mornings, the backups in the same room.

<details>
<summary>Show a solution</summary>

- **Lease ends in 18 months:** a deadline. Everything must move, and in stages.
- **Patient data must stay in the country:** use the region in the country.
- **Air conditioning took the site down:** everything is in one place. Use several zones.
- **One engineer:** prefer services the provider runs (PaaS, SaaS, managed databases), so there is less to patch and look after.
- **Busy Monday mornings:** scale out on demand.
- **Backups in the same room:** a fire or theft loses both the data and the backups. Back up to another zone or region automatically.

</details>

### Write the plan

Use your list to write each section of the brief. Keep each section short; a reader should get the whole plan in two minutes.

<details>
<summary>Show a solution</summary>

**1. What moves, and in what order**
First email and documents, which are the simplest and least risky. Next backups, so the data is safe off-site early. Then the database and website together, since they depend on each other. Reports last. All done within 12 months, leaving 6 months of margin before the lease ends.

**2. Service models**
- Email and documents: **SaaS**. A hosted email and office suite; there is no reason to run an email server.
- Booking database: **PaaS**, a managed database. The provider patches it, backs it up and runs a standby copy.
- Booking website: **PaaS** or containers on a managed platform. The engineer deploys code and does not patch servers.
- Nightly reports: **serverless**, a scheduled job on a serverless container service that runs for an hour and costs nothing the rest of the day. Serverless functions usually stop after 10 to 15 minutes, too short for an hour-long report.
- Backups: built into the managed database, plus object storage for files.

**3. Deployment model**
**Hybrid** during the move, with the office and the cloud connected by a VPN. **Public cloud** once the server room closes.

**4. Region and zones**
The region **in the country**, for the law on patient data and closeness to users. The website runs in at least **two zones** behind a load balancer, and the database has a **standby copy in a second zone**, so one building failing does not stop bookings.

**5. Scaling**
The website **scales out** automatically: 2 copies at least, more on Monday mornings, back to 2 at night. It must be stateless, with sessions kept outside the servers. The database is sized for Monday mornings and scaled up if it needs more.

**6. Who secures what**
The provider: the data centres and hardware, the hypervisors, and patching the managed database and platform.
The company: who can see patient data; staff accounts with MFA; least-privilege permissions for the engineer and the application; keeping the database reachable only from the website, not the internet; keeping access keys out of code; turning on encryption and audit logs.

**7. Cost**
Set a **budget with alerts** before anything else. Once usage is steady after a few months, **commit** to one or three years for the database and the two always-on web servers. Delete the VPN and office servers as soon as each part has moved.

**8. Risks**
- **Data lost or out of step during the database move.** Rehearse the move with a copy first, and move during the quietest time, a weekend night.
- **One engineer doing everything.** Budget for outside help or training, and write down each step so the work is not in one person's head.

</details>

## Check it works

Check your plan against these points. A good plan:

- Keeps patient data in the in-country region.
- Runs the website and database across more than one zone.
- Moves backups away from the building where the data is.
- Prefers managed services, because there is only one engineer.
- Scales the website out, and says it must be stateless to do so.
- Leaves access control, MFA and network rules with the company, not the provider.
- Finishes before the lease ends, with some margin.
- Fits on one page.

If your plan puts the database on a virtual server instead (IaaS), that can be a fair choice, but it should say who patches it and how backups and the standby copy work, since the company now owns those jobs.

## Going further

- Add a section on what happens if the whole region fails. What would it cost to have a copy in a second region, and is it worth it for this company?
- Draw the final setup: users, load balancer, website copies in two zones, the database and its standby, and the backups.
- Come back to this plan after the AWS skills and name the actual AWS service for each part.

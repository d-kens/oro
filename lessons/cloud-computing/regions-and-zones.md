Every server you rent is in a real building in a real place. Where that place is decides how fast your application feels to users, which laws apply to your data, and whether your service stays up when something goes wrong.

This topic covers how providers arrange their data centres into regions and availability zones, why that design keeps services running, and how to choose where to run. By the end you can explain the difference between a region and a zone, and why serious applications run in more than one zone.

## Regions

A **region** is a geographic area where a provider has a group of data centres: a city or part of a country. Large providers have dozens of regions around the world, each with a name and a short code.

Regions are kept **independent** of each other. A problem in one, a power cut, a software fault, a natural disaster, should not spread to another. Your resources live in the region you choose, and nothing moves to another region unless you move it.

When you create almost anything in the cloud, you pick a region first. Four things usually decide which one:

1. **Distance to your users.** Data travels at a fixed speed through fibre, so a region close to your users answers faster. A round trip across a continent can take 50 to 100 milliseconds; across town, a few.
2. **Rules about data.** Some laws require personal data to stay inside a country or a group of countries. Choosing a region there keeps it in place.
3. **Which services exist there.** New services usually start in a few regions and spread later.
4. **Price.** The same server can cost a different amount in different regions.

## Availability zones

Inside each region, the data centres are grouped into **availability zones** (*AZs*), usually three or more. Each zone is one or more data centres with its own power, cooling and network connections.

Zones in a region are a few kilometres to tens of kilometres apart: far enough that a fire, flood or power cut is unlikely to hit two at once, close enough that they are joined by fast private links with only a millisecond or two between them.

```text
 Region
 ┌──────────────────────────────────────────────────────┐
 │  Zone A              Zone B              Zone C       │
 │  ┌────────────┐      ┌────────────┐      ┌──────────┐ │
 │  │ data       │      │ data       │      │ data     │ │
 │  │ centre(s)  │══════│ centre(s)  │══════│ centre(s)│ │
 │  └────────────┘      └────────────┘      └──────────┘ │
 │     own power, cooling and network in each zone       │
 └──────────────────────────────────────────────────────┘
```

## Why this design matters

Power supplies, cooling systems and network links break, and sometimes a whole data centre goes offline. Zones are arranged so that one such failure takes out only one zone.

Your part is to use that. If your application runs on one server in one zone, it goes down when that zone does. If it runs on servers in two or three zones, with a load balancer sending users to whichever are healthy, the loss of one zone barely shows.

| Setup | Survives a server failing | Survives a zone failing | Survives a region failing |
| --- | --- | --- | --- |
| One server, one zone | No | No | No |
| Several servers, one zone | Yes | No | No |
| Several servers, several zones | Yes | Yes | No |
| Copies in two regions | Yes | Yes | Yes |

Running across several zones is the normal choice for anything that matters, and costs little more. Running in several regions is much harder and more expensive, and is kept for services that must survive even a whole region failing.

## Edge locations

Providers also run many smaller sites, **edge locations**, in far more cities than they have regions. They do not run your servers. They keep copies of content close to users, through a **content delivery network** (*CDN*), and answer DNS queries, so a user far from your region still gets images and pages quickly.

## Tasks

### Task 1: Pick a region

Most of a company's customers are in one country. Personal data about them must, by law, stay in that country. The provider has a region in that country and a cheaper one in a neighbouring country, 1,500 km away. Which do you choose, and why?

<details>
<summary>Check your work</summary>

The region **in the country**. The law about personal data decides it, whatever the price. It is also closer to the customers, so the application will be faster. Price matters only between regions that already meet the rules.

</details>

### Task 2: Plan for failure

An online shop runs on two servers in the same zone and a database in that zone too. Explain what happens if that zone loses power, and how you would change the setup.

<details>
<summary>Check your work</summary>

The whole shop goes down: both servers and the database are in the failed zone. Spread the servers across two or three zones behind a load balancer, and run the database with a standby copy in a second zone that takes over automatically. Losing one zone then leaves the shop running.

</details>

## Quiz

**1. What is the difference between a region and an availability zone?**

<details>
<summary>Show answer</summary>

A region is a geographic area containing several availability zones. An availability zone is one or more data centres inside a region, with its own power, cooling and network, separated from the other zones so they rarely fail together.

</details>

**2. Why are zones in a region close together, but not too close?**

<details>
<summary>Show answer</summary>

Close enough to be joined by fast, low-latency links, so an application can spread across them and still work as one. Far enough apart that one fire, flood or power cut is unlikely to hit more than one.

</details>

**3. Your application runs in three zones. Does that protect it if the whole region has a problem?**

<details>
<summary>Show answer</summary>

No. All three zones are in the same region. To survive a region-wide problem you need a copy of the application and its data in a second region, which is much more work and cost.

</details>

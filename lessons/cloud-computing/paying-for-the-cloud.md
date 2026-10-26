In the cloud, every resource is measured and billed monthly. A forgotten test server or a busy download link shows up on that bill.

This topic covers how cloud pricing works, the main ways to pay less, the costs people forget, and the habits that keep a bill under control. The prices here are made-up round numbers to show how pricing works. Real prices differ by provider and region, and change over time. By the end you can estimate what something will cost and spot the usual causes of a surprise bill.

## Pay for what you use

**Pay-as-you-go:** A pricing model where you pay only for the resources you use, for as long as you use them, with no up-front payment or long-term contract.

| What | Measured by | Example rate |
| --- | --- | --- |
| A virtual server | Second or hour it runs, by size | $0.04 an hour for a small one |
| A disk attached to a server | GB stored per month, even if the server is off | $0.08 per GB per month |
| Object storage | GB stored per month, plus requests | $0.02 per GB per month |
| Data sent out to the internet | GB transferred | $0.09 per GB |
| A managed database | Hour it runs, by size, plus storage | $0.10 an hour |
| A serverless function | Number of calls and time each one runs | Fractions of a cent per call |

A server at $0.04 an hour costs about $0.04 × 730 hours = **$29 a month** if it runs all the time. 730 is roughly the number of hours in a month.

## Paying less for steady use

Providers sell the same server at different prices, depending on what you agree to:

- **On-demand pricing:** Paying the standard rate for a resource by the second or hour, with no commitment. The most flexible and the most expensive.
- **Reserved pricing (reserved instances, savings plans, committed-use discounts):** A lower rate, often 30 to 70 percent off, in return for agreeing to use a set amount for one or three years. It suits servers that run all the time.
- **Spot pricing (spot or preemptible instances):** A much lower rate, up to 90 percent off, for the provider's spare capacity, which the provider can take back at short notice. It suits work that can stop and restart, such as batch jobs and tests.
- **Rightsizing:** Changing a resource to the smallest size that still does its work.

Turning things off saves money too: a development server used during working hours needs about 50 hours a week, not 168.

## The costs people forget

Most surprise bills come from the same few places:

- **Data leaving the cloud.** Data sent out of the provider's network is called **egress**, and data sent in is **ingress**. Ingress is usually free. Sending it *out*, to users or to another provider, is charged per GB, and it adds up for video, downloads and backups copied elsewhere. Traffic between zones and regions often costs too.
- **Things left running.** A test server, a database or a load balancer created for an experiment and never deleted keeps charging, every hour.
- **Storage that outlives its server.** Deleting a server may leave its disk and its snapshots behind, still billed each month.
- **Idle extras.** Public IP addresses, NAT gateways and load balancers charge by the hour even when nothing uses them.
- **Leaked credentials.** Someone with your stolen access keys can start hundreds of servers on your bill.

## Keeping the bill in check

A few habits catch most problems early:

1. **Set a budget with alerts**, so you get an email when spending passes a level you choose. Do this first in any account.
2. **Tag everything** with the team, project and environment it belongs to, so the bill shows who is spending what.
3. **Check the bill weekly** while learning, and look at the most expensive line first.
4. **Delete what you are not using**, and make it easy by creating resources from code, so they can be destroyed and created again in minutes.

## Tasks

### Task 1: Estimate a bill

Using the example rates above, estimate one month for: two small servers running all the time, a 100 GB disk on each, and 500 GB of data sent to users.

<details>
<summary>Check your work</summary>

- Servers: 2 × $0.04 × 730 = **$58.40**
- Disks: 2 × 100 × $0.08 = **$16.00**
- Data out: 500 × $0.09 = **$45.00**

Total about **$119** a month. Data sent out is more than a third of the bill.

</details>

### Task 2: Cut the bill

A team runs: a production web server all the time, a test server all the time that is only used 9 to 5 on weekdays, and a nightly batch job on an on-demand server that takes four hours. Suggest one saving for each.

<details>
<summary>Check your work</summary>

- **Production server:** commit to one or three years of use for a large discount, since it runs all the time.
- **Test server:** turn it off outside working hours. 40 hours a week instead of 168 cuts its cost by about three quarters.
- **Batch job:** run it on spot capacity. If the machine is taken back, the job restarts the next night or on another machine.

</details>

## Quiz

**1. A server is stopped but its disk is kept. Do you still pay anything?**

<details>
<summary>Show answer</summary>

Yes, for the disk. Storage is charged per GB per month whether or not the server is running. You stop paying for the server's running hours, not for what it keeps.

</details>

**2. Why are spot instances so cheap, and what are they bad at?**

<details>
<summary>Show answer</summary>

They are the provider's spare capacity, which it would otherwise not sell. The provider can take them back at short notice, so they are bad for anything that must not stop, such as a production database.

</details>

**3. What is the first thing to set up in a new cloud account, before anything else?**

<details>
<summary>Show answer</summary>

A budget with alerts, so you hear about unexpected spending within hours instead of when the month's bill arrives.

</details>

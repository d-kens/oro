In this project you take a small online shop, cost it on its own servers and in the cloud over three years, and then cut the cloud bill with the savings from the *Paying for the cloud* topic.

It draws on *Before the cloud*, *Scaling and elasticity* and *Paying for the cloud*. All the prices are made-up round numbers so the sums are easy to check. Real prices differ by provider, region and year, but the method is the same.

## What you need

A spreadsheet program: LibreOffice Calc, Microsoft Excel, Google Sheets or Apple Numbers. Paper and a calculator also work, but a spreadsheet lets you change a number and see the totals move.

## The shop

A small online shop needs:

- **Web servers:** 2 for normal traffic, 4 for the month of the year-end sale.
- **A database server:** 1, running all the time.
- **Storage:** 2 TB (2,000 GB) of product images and backups.
- **Data sent to customers:** 1 TB (1,000 GB) a month.
- **Someone to look after it.**

## The prices

**On-premises**, buying its own servers and renting space in a data centre:

| Item | Price |
| --- | --- |
| A server | $6,000 each, bought once |
| A storage system for 2 TB with backups | $8,000, bought once |
| Network switches and a firewall | $5,000, bought once |
| Rack space, power and cooling | $800 a month |
| Internet connection | $300 a month |
| An engineer | $60,000 a year; the shop needs a quarter of one |

**Cloud**, pay-as-you-go:

| Item | Price |
| --- | --- |
| A web server of the right size | $0.20 an hour |
| A managed database | $0.50 an hour |
| Object storage | $0.02 per GB per month |
| Data sent out | $0.09 per GB |
| A load balancer | $25 a month |
| An engineer | $60,000 a year; the shop needs a tenth of one, because there is no hardware |

Use 730 hours in a month and 36 months in three years.

## The brief

1. Work out the three-year cost on-premises. Check: one total, and the cost per month.
2. Work out the three-year cost in the cloud on-demand, with 2 web servers all the time and 2 more for one month each year. Check: one total, and the cost per month.
3. Cut the cloud bill: commit to three years of use for the servers that run all the time, at 40 percent off. Check: a new total.
4. Write two or three sentences on what the numbers leave out.

## Steps

### Cost it on-premises

The shop must own enough servers for the busiest month, even though it needs half of them the rest of the year. Make one row for each item, with a column for how many, the price, and the three-year cost.

<details>
<summary>Show a solution</summary>

| Item | Working | Three years |
| --- | --- | --- |
| Servers | 5 (4 web + 1 database) × $6,000 | $30,000 |
| Storage system | $8,000 | $8,000 |
| Network | $5,000 | $5,000 |
| Rack, power, cooling | $800 × 36 | $28,800 |
| Internet | $300 × 36 | $10,800 |
| Engineer | $60,000 × 0.25 × 3 | $45,000 |
| **Total** | | **$127,600** |

In a spreadsheet, put the three-year cost of each row in column D and the total in a cell such as `=SUM(D2:D7)`. Per month: $127,600 ÷ 36 = **$3,544**.

</details>

### Cost it in the cloud

In the cloud, the two extra web servers run only during the sale month: 1 month a year, 3 months in all.

<details>
<summary>Show a solution</summary>

| Item | Working | Three years |
| --- | --- | --- |
| Web servers, all the time | 2 × $0.20 × 730 × 36 | $10,512 |
| Web servers, sale month | 2 × $0.20 × 730 × 3 | $876 |
| Managed database | $0.50 × 730 × 36 | $13,140 |
| Storage | 2,000 × $0.02 × 36 | $1,440 |
| Data sent out | 1,000 × $0.09 × 36 | $3,240 |
| Load balancer | $25 × 36 | $900 |
| Engineer | $60,000 × 0.1 × 3 | $18,000 |
| **Total** | | **$48,108** |

Per month: $48,108 ÷ 36 = **$1,336**.

</details>

### Cut the cloud bill

The two web servers that always run and the database run every hour of the three years, so they are the ones to commit. The sale-month servers stay on-demand.

<details>
<summary>Show a solution</summary>

The committed items cost $10,512 + $13,140 = $23,652 on-demand. At 40 percent off they cost $23,652 × 0.6 = $14,191.20, a saving of $9,460.80.

New total: $48,108 − $9,460.80 = **$38,647.20**, about **$1,074** a month.

</details>

### What the numbers leave out

Think about what is not in the spreadsheet before you read the solution.

<details>
<summary>Show a solution</summary>

Some things the numbers leave out:

- **Speed.** On-premises, the shop waits weeks for servers. In the cloud, it can try a new idea the same afternoon.
- **Reliability.** The on-premises setup is in one building. In the cloud, the web servers and the database can run across several zones for little extra cost.
- **Growth.** If traffic grows a lot, on-premises means buying more servers in advance; in the cloud, the bill grows with the traffic.
- **Old hardware.** After three years the bought servers are worth little and must be replaced; the cloud servers are simply kept running on newer hardware.
- **The other way round.** If the shop grew into a large, steady workload, owning could become the cheaper option again.

</details>

## Check it works

Your totals should match these:

| | Three years | Per month |
| --- | --- | --- |
| On-premises | $127,600 | $3,544 |
| Cloud, on-demand | $48,108 | $1,336 |
| Cloud, with commitment | $38,647.20 | $1,074 |

If your on-premises total is lower, check that you bought 5 servers, not 3: the shop must own enough for its busiest month. If your cloud total is higher, check that the extra web servers run for 3 months in all, not 36.

Notice which row is the largest in each column. On-premises, it is people and the building; in the cloud, it is still people, then the database. Hardware itself is a small part of either.

## Going further

- Change the sale month to the whole of the last quarter (3 months a year). How much does each total change?
- Data sent out grows to 10 TB a month after a successful advert. Recalculate the cloud total. How large is that row now compared with the servers?
- Find one real provider's pricing calculator and price the same shop. You do not need an account to use it. How close are the made-up rates?

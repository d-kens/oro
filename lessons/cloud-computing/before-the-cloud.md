Until the late 2000s, a company that wanted to run software bought its own servers. Many still do. Knowing what that involved explains why the cloud took over so quickly, and also when owning servers is still the better choice.

This topic walks through what it takes to run your own servers, the problems that come with it, and the ones the cloud solves. By the end you can explain why companies stopped buying servers, and name the cases where some still do.

## Running your own servers

Running servers yourself is called **on-premises**, or *on-prem*. To put one new application online, a company had to guess how many servers it would need for the next three to five years, buy them and wait weeks for delivery, find a room with power and cooling, set them up, keep them running, and replace them when they got old. From deciding to build something to having it running often took two or three months.

## The problems with owning

**Guessing capacity is hard.** If you buy too few servers, the site slows down or falls over when customers arrive. If you buy too many, you paid for machines that sit idle. Most companies bought for their busiest day, so most of the year their servers were mostly idle. Utilisation of 10 to 20 percent was common: a shop that sells most in one week of the year paid for that week's servers all year.

**Money goes out up front.** Servers are bought before they earn anything. That kind of spending, on things that last years, is **capital expenditure** (*capex*). A large purchase needs approval, and a small team or a new company may simply not have the money.

**It is slow.** An idea that needs new servers waits for the purchase, the delivery and the setup. Teams stop trying ideas that might not work, because each one costs months.

## What the cloud changed

Amazon Web Services started renting servers and storage to anyone in 2006. Other providers followed. Each problem above has a cloud answer:

| On-premises | Cloud |
| --- | --- |
| Guess capacity years ahead | Add or remove capacity in minutes |
| Pay up front (capex) | Pay monthly for what you used, an operating cost (*opex*) |
| Weeks to get a server | Minutes to get a server |
| Idle capacity for the busy day | Extra capacity only on the busy day |
| Your staff handle hardware | The provider handles hardware |
| Expanding to a new country means a new building | Pick another region from a list |

The biggest change was speed: a team could try an idea in an afternoon and, if it failed, delete everything and pay for the afternoon.

## When owning still makes sense

The cloud is not always cheaper, and some companies run their own servers on purpose:

- **Steady, predictable, large workloads.** If you use the same thousand servers every hour of every year, buying them can cost less than renting them. Some companies have moved workloads back from the cloud for this reason.
- **Rules about where data lives.** Some laws or contracts require data to stay in a particular building or country, or under the company's own control.
- **Special hardware or very low latency.** Factory equipment, trading systems or hospital devices may need computers on site.
- **Existing investment.** A company with a recent data centre and a team to run it may move slowly, a few applications at a time.

Many companies end up using both, which the *Deployment models* topic covers.

## Tasks

### Task 1: The busy day

A ticket-selling site handles 500 requests a second on a normal day and 10,000 a second for one hour when a big concert goes on sale, about ten times a year. One server handles 500 requests a second.

1. How many servers does the site need to own to survive the busy hour?
2. On a normal day, what fraction of those servers is actually needed?
3. How would the cloud change this?

<details>
<summary>Check your work</summary>

1. 10,000 ÷ 500 = **20 servers**.
2. One server is enough on a normal day, so 1 in 20, or **5 percent**, is needed. The other 19 sit idle most of the year.
3. In the cloud the site runs on one or two servers most of the time and adds the other eighteen just before a sale, then removes them afterwards. It pays for 20 servers for about ten hours a year instead of all year.

</details>

### Task 2: Stay or go

For each company, say whether you would advise moving to the cloud, staying on-premises, or a mix, and give one reason.

1. A new company with three developers building a mobile app.
2. A video-processing firm that has used the same 2,000 servers flat out, all day, for five years.
3. A hospital whose scanners must keep working even if the internet connection is cut.

<details>
<summary>Check your work</summary>

1. **Cloud.** No money to buy servers up front, no staff to run them, and it needs to move fast.
2. **Probably stay, or a mix.** Its use is steady and predictable, which is where owning can cost less than renting. It might still use the cloud for spikes or new projects.
3. **A mix.** The scanners need local computers that keep working offline. Records, backups and reporting can go to the cloud.

</details>

## Quiz

**1. Why did companies running their own servers usually have so much idle capacity?**

<details>
<summary>Show answer</summary>

Because buying a server takes weeks, they had to buy in advance for the busiest day they expected over the next few years. Most days are much quieter, so most of that capacity sat unused.

</details>

**2. What is the difference between capex and opex, and which does the cloud mostly use?**

<details>
<summary>Show answer</summary>

Capital expenditure (capex) is money spent up front on things that last years, such as servers. Operating expenditure (opex) is ongoing spending, such as a monthly bill. The cloud turns hardware from capex into opex: you rent instead of buy.

</details>

**3. A colleague says the cloud is always cheaper than owning servers. What would you say?**

<details>
<summary>Show answer</summary>

Not always. For workloads that change a lot, or for companies that cannot pay up front, it usually is. For large, steady workloads that run flat out for years, owning can cost less. The cloud's strongest advantage is speed and flexibility, not price.

</details>

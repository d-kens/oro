A team that wants to deliver better needs a way to tell whether it is getting better. The most widely used measures come from DORA, a research programme that has surveyed tens of thousands of people in software teams for over ten years.

This topic covers the DORA metrics, how to work each one out, and how teams use them. By the end you can measure a team's delivery from its release records.

## DORA

**DORA (DevOps Research and Assessment):** A research programme, now part of Google Cloud, that studies what makes software teams deliver well. Its findings are published in yearly reports and in the book *Accelerate* (2018) by Nicole Forsgren, Jez Humble and Gene Kim.

DORA found that a few measures of software delivery are linked to how well a team, and often its company, performs. It now uses five, in two groups: throughput, how fast changes reach users, and instability, how often changes cause problems.

## The five metrics

**Throughput:**

- **Deployment frequency:** How often the team deploys to production. More often usually means smaller, safer changes.
- **Lead time for changes:** How long a change takes from being committed to running in production.
- **Failed deployment recovery time:** How long it takes to recover when a deployment causes a failure in production. It counts only failures caused by a deployment, so an outage in a data centre does not count. Older reports called it **time to restore service** and grouped it with stability, and many articles still use that name.

**Instability:**

- **Change failure rate:** The share of deployments that cause a failure in production needing a fix, such as a rollback, a hotfix or a patch.
- **Rework rate:** The share of deployments that were not planned and were made because of a problem in production. DORA added it in 2024.

The first four are the original DORA metrics, and most tools and articles still show only those.

## Working them out

The numbers come from records most teams already have: the pipeline's deploy history, the commit times in Git, and the incident log.

**Median:** The middle value when a list of numbers is put in order. For an even number of values, the average of the two middle ones. Times are usually given as a median, because one very slow case pulls an average up but barely moves the median.

Take a team's records for one month: 20 deployments to production. For each, you know when the change was committed, when it was deployed, whether it failed, how long recovery took, and whether the deployment was planned.

- **Deployment frequency:** 20 deployments in 4 weeks is 5 a week, or about one per working day.
- **Lead time for changes:** Take the time from commit to deploy for each change. If five changes took 2, 3, 3, 4 and 30 hours, the median is 3 hours. The average, 8.4 hours, is pulled up by the one slow change.
- **Failed deployment recovery time:** If 3 deployments failed and took 30 minutes, 45 minutes and 4 hours to recover from, the median is 45 minutes.
- **Change failure rate:** 3 of the 20 deployments caused a failure, so 3 ÷ 20 = 15 percent.
- **Rework rate:** If 2 of the 20 deployments were unplanned hotfixes for those failures, 2 ÷ 20 = 10 percent.

## Using them well

- **Measure teams, not people.** The metrics describe how a team's whole delivery system works. Ranking individuals on them leads people to game the numbers.
- **Look at them together.** Deploying more often while the failure rate climbs is not progress. DORA's research shows strong teams deliver fast and stay stable at the same time.
- **Compare a team with itself over time.** A team that goes from monthly to weekly releases has improved, whatever other teams do.
- **Use them to find the next thing to fix.** A long lead time points at waiting and handovers; a high failure rate points at testing; a long recovery time points at monitoring and rollback.

A team that wants to deliver better needs a way to tell whether it is. The most widely used measures come from DORA, a research programme that has surveyed tens of thousands of people in software teams for over ten years.

This topic covers the four key DORA metrics, how to work each one out, and how teams use them. By the end you can measure a team's delivery from its release records.

## DORA

**DORA (DevOps Research and Assessment):** A research programme, now part of Google Cloud, that studies what makes software teams deliver well. Its findings were published in yearly *State of DevOps* reports and in the book *Accelerate* (2018) by Nicole Forsgren, Jez Humble and Gene Kim.

DORA found that four measures of software delivery predict how well a team, and often its company, performs. Two measure speed and two measure stability.

## The four key metrics

**Speed (throughput):**

- **Deployment frequency:** How often the team deploys to production. More often usually means smaller, safer changes.
- **Lead time for changes:** How long a change takes from being committed to running in production.

**Stability:**

- **Change failure rate:** The share of deployments that cause a failure in production needing a fix, such as a rollback, a hotfix or a patch.
- **Time to restore service:** How long it takes to recover when a deployment causes a failure. Recent DORA reports call this **failed deployment recovery time**.

DORA has since added a fifth, **rework rate**: the share of deployments that were not planned but made to fix a problem users saw. The four above are the ones you will see most.

## Working them out

Take a team's records for one month: 20 deployments to production. For each, you know when the change was committed, when it was deployed, whether it failed, and how long recovery took.

- **Deployment frequency:** 20 deployments in 4 weeks is 5 a week, or about one per working day.
- **Lead time for changes:** The time from commit to deploy for each change. If the times are 2, 3, 3, 4, 5 and so on, take the median, the middle value, so one very slow change does not hide the usual case.
- **Change failure rate:** If 3 of the 20 deployments caused a failure, 3 ÷ 20 = 15 percent.
- **Time to restore:** If those 3 failures took 30 minutes, 45 minutes and 4 hours to fix, the median is 45 minutes.

**Median:** The middle value when a list of numbers is put in order. For an even number of values, the average of the two middle ones.

## Using them well

- **Measure teams, not people.** The metrics describe how a team's whole delivery system works. Ranking individuals on them leads people to game the numbers.
- **Look at all four together.** Deploying more often while the failure rate climbs is not progress. DORA's research shows strong teams improve speed and stability together.
- **Compare a team with itself over time.** A team that goes from monthly to weekly releases has improved, whatever other teams do.
- **Use them to find the next thing to fix.** A long lead time points at waiting and handovers; a high failure rate points at testing; a long time to restore points at monitoring and rollback.

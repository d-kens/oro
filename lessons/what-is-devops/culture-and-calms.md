Most of the problems DevOps set out to fix were between people: separate goals, handovers and blame. A team can have every tool and still deliver slowly if it keeps those habits.

This topic covers four habits DevOps teams work by, then CALMS, a model that breaks DevOps into five parts. By the end you can describe a DevOps culture and name the five parts of CALMS.

## Shared ownership

Before DevOps, developers wrote the code and handed it to an operations team to run.

**You build it, you run it:** The team that writes a service also deploys it, watches it in production and fixes it when it breaks. The phrase comes from Werner Vogels, Amazon's chief technology officer, in 2006.

**On call:** Taking turns to be the person who responds when a production system raises an alert, including outside working hours.

When developers are on call for their own service, they write more tests, add better logs and make releases easier to undo, because they are the ones woken up when it fails. They also learn how the service behaves in production, which they never see when another team runs it.

People in the team can still specialise. One person may know the database best and another the pipeline. What changes is that the team as a whole answers for the service, from the first line of code to running it.

## Blameless postmortems

When something breaks, a team can ask who caused it or what allowed it to happen. Only the second question stops it happening again.

**Postmortem (incident review):** A written review after an incident, an unplanned event that stops a service working or makes it work badly. It sets out what happened, why, how it was fixed, and what will change.

**Blameless:** Looking for the causes of a failure in systems and processes, and leaving out who made the last mistake.

Say an engineer runs a command that deletes a production database. The useful questions are why one command could do that, why there was no confirmation, and why the backup took six hours to restore. If the engineer is blamed instead, people learn to hide their mistakes, nothing about the system changes, and the next person can run the same command.

A short postmortem usually has:

- A timeline of what happened and when.
- The impact: who was affected, and for how long.
- The causes, often more than one.
- What went well and what did not during the response.
- Actions, each with an owner and a date.

## Small batches and flow

The habits so far are about people. The next one is about how work moves from an idea to users.

**Lean:** A way of working that started in car manufacturing at Toyota. It aims to cut waste: anything that takes time without adding value for the user, such as waiting, handovers, and work redone because a problem was found late. DevOps takes two ideas from it: small batches and flow.

**Batch size:** The amount of work that moves through a stage at once, such as the number of changes in one release.

A release with one change is quick to review and test, and if it fails, the cause is obvious and it is easy to undo. A monthly release with 80 changes takes days to test, and when it fails, the team has to work out which of the 80 caused it.

**Flow:** How smoothly work moves from an idea to users, and where it waits on the way.

A change that takes two hours to write and then waits five days for approval spends almost all its time waiting, so the approval is the first thing to speed up.

## Sharing across teams

A company usually has many teams, each building and running its own services. Sharing across teams means a team passes on what it has learned or built, such as the cause of a failure, a fix or a tool, so other teams can use it instead of working it out again.

Knowledge spreads easily inside a team, because its people work on the same service every day.

Say one team finds that its backups were never tested, and restoring them fails. Other teams probably set up their backups the same way. Unless someone tells them, they find out only on the day they need a restore.

Common ways teams share:

- **Postmortems** published where every team can read them. In the backup case, the other teams can test their own restores before they need one.
- **Shared tools and pipeline templates**, so a fix one team makes reaches every team that uses them.
- **Runbooks**, written steps for routine tasks and known alerts, kept where any team can find them.
- **Internal talks and demos**, where a team shows what it built or learned.

## CALMS

The habits above make up three parts of CALMS: Culture, Lean and Sharing. The other two, Automation and Measurement, have their own topics.

**CALMS:** A model that breaks DevOps into five parts: Culture, Automation, Lean, Measurement and Sharing. Organisations use it to plan a move to DevOps and to check their progress, by looking at how well they do each part.

Damon Edwards and John Willis first described DevOps as CAMS at DevOpsDays in Mountain View, California, in 2010. Jez Humble later added Lean, which made it CALMS.

- **Culture:** Development and operations work as one team that shares responsibility for the service. For example, the team that builds a service also runs it. Shared ownership and blameless postmortems, above, cover it.
- **Automation:** Repeated manual work is handed to tools. For example, a pipeline tests and deploys every change. *The delivery lifecycle* covers it.
- **Lean:** Removing anything that slows delivery without adding value for users. For example, releasing small changes instead of one big one. Small batches and flow, above, cover it.
- **Measurement:** Collecting data about delivery and the software, and deciding from it. For example, a team finds that one in four of its deploys fails. Most of the failures were bugs that a test would have caught, so it adds those tests and checks that the number drops. *Measuring delivery*, the next topic, covers it.
- **Sharing:** Spreading knowledge and lessons across teams. For example, publishing postmortems for every team to read. Sharing across teams, above, covers it.

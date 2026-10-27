Most of the problems DevOps set out to fix were between people: separate goals, handovers and blame. Tools help, but a team that keeps its old habits gets little from them.

This topic covers the CALMS model of DevOps, what shared ownership looks like day to day, and how teams learn from failures without blaming people. By the end you can describe a DevOps culture and spot what is missing from one.

## CALMS

**CALMS:** A model of the five parts of DevOps: Culture, Automation, Lean, Measurement and Sharing. It grew from the earlier CAMS model by John Willis and Damon Edwards; Jez Humble added Lean.

- **Culture:** People who build and run software share goals and responsibility, trust each other, and can raise problems without fear.
- **Automation:** Repeated work, such as building, testing, deploying and creating servers, is done by machines, so it is fast and the same every time.
- **Lean:** Work moves in small batches, waiting and handovers are cut, and the team keeps looking for waste in how it delivers.
- **Measurement:** The team measures how it delivers and how its software behaves, and decides based on the numbers.
- **Sharing:** Knowledge, tools and lessons from failures are shared openly across teams.

CALMS is useful as a checklist. A team that has automation but no shared culture, or measures nothing, is only partly doing DevOps.

## Shared ownership

**You build it, you run it:** The team that writes a service also deploys it, watches it in production and is called when it breaks. The phrase comes from Werner Vogels, Amazon's chief technology officer, in 2006.

When developers are called at night for their own bugs, they write more tests, add better logs and make releases easier to undo. Operations knowledge moves into the team instead of sitting behind a ticket queue.

**On call:** Taking turns to be the person who responds when a production system raises an alert, including outside working hours.

Shared ownership does not mean everyone does everything. It means no part of delivering the software is somebody else's problem.

## Blameless postmortems

**Incident:** An unplanned event that stops a service working, or makes it work badly, for its users.

**Postmortem (incident review):** A written review after an incident that sets out what happened, why, how it was fixed, and what will change so it does not happen again.

**Blameless:** Looking for the causes of a failure in systems and processes, not in the person who made the last mistake.

If an engineer runs a command that deletes a production database, the useful questions are why one command could do that, why there was no confirmation, and why the backup took six hours to restore. Blaming the engineer teaches everyone to hide mistakes, and the next person will run the same command.

A short postmortem usually has:

- A timeline of what happened and when.
- The impact: who was affected, for how long.
- The causes, often more than one.
- What went well and what did not during the response.
- Actions, each with an owner and a date.

## Small batches and flow

**Batch size:** The amount of work that moves through a stage at once, such as the number of changes in one release.

Small batches move faster, are easier to review and test, and are easier to undo. A team that waits to collect changes into a big release has more risk in each one. Lean thinking also looks at **flow**: where work waits. A change that takes two hours to write and then waits five days for approval spends most of its life waiting, and that wait is what to fix first.

DevOps grew out of problems that most software companies had in the 2000s, and many still have. Knowing how software used to be released makes it clear what each DevOps practice is for.

This topic walks through the old way of delivering software, what went wrong with it, and the ideas that came before DevOps. By the end you can explain why teams changed how they work.

## Separate teams and a handover

In a traditional company, software passed through several teams in turn:

1. **Development** wrote the code for months.
2. **Testing (QA)** received a finished version and tested it for weeks.
3. **Operations** received a release, often with a document of installation steps, and put it on the servers, usually at night or at a weekend.

Each team worked on its own and handed the work to the next. People sometimes called the gap between development and operations the **wall of confusion**: developers threw code over the wall, and operations had to make it run.

## Waterfall

**Waterfall:** A way of running a software project in fixed stages, one after another: requirements, design, building, testing, then release. Each stage finishes before the next begins, and going back is expensive.

A waterfall project might release once or twice a year. Everything built in that time went out in one large release.

## What went wrong

**Big releases were risky.** A release with six months of changes contained hundreds of things that could break. When something did, it was hard to tell which change caused it.

**Problems were found late.** Testing came at the end, so a mistake made in the first month might be found in the fifth. By then other code depended on it.

**The servers did not match.** Developers' machines, the test servers and the production servers were set up by hand, by different people, at different times. Code that worked in testing failed in production because a version or a setting was different. "It works on my machine" became a well-known complaint.

**Releases were manual.** Each release followed a long list of steps done by hand. People skip steps, mistype commands and get tired at 2 am.

**Nobody owned the whole thing.** When production broke, operations got the call, but only development could fix the code. Each side blamed the other, and the user waited.

**Feedback was slow.** Developers rarely saw how their code behaved in production, so they could not learn from it.

## Agile, and the step after it

**Agile:** A way of building software in short cycles, often one to four weeks, delivering a small working piece each time and changing plans based on feedback. It was set out in the *Manifesto for Agile Software Development* in 2001.

Agile made development faster, but only up to the wall. Teams could finish working software every two weeks and then wait months for it to be released, because testing and operations still worked the old way. DevOps carried the same ideas of short cycles and fast feedback past the wall, through testing, release and operations.

## What changed

| Before | With DevOps |
| --- | --- |
| Separate teams, handovers | One team owns building and running |
| A few large releases a year | Small releases, often many a week |
| Testing at the end | Automated tests on every change |
| Servers set up by hand | Servers described in code and created the same way each time |
| Releases from a checklist | Releases from a pipeline |
| Find out about problems from users | Monitoring and alerts |

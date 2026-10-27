Every change to a piece of software goes through the same stages, from an idea to something running in production. DevOps is often drawn as a loop of these stages, because what you learn from running the software feeds the next change.

This topic names each stage, what happens in it, the practices that automate it, and which skill on this roadmap teaches each one. By the end you can follow a change from a commit to production and back.

## The stages

**Software delivery lifecycle:** The stages a change passes through on its way to users: plan, code, build, test, release, deploy, operate and monitor. In DevOps the stages repeat in a loop, many times a week.

| Stage | What happens | Roadmap skill |
| --- | --- | --- |
| Plan | Decide what to change next, and break it into small pieces | |
| Code | Write the change and save it in version control | Git, Python for DevOps |
| Build | Turn the code into something that can run, such as a package or a container image | Docker |
| Test | Run automated checks to show the change works and breaks nothing else | GitHub Actions |
| Release | Mark a build as ready to go to production, with a version number | GitHub Actions |
| Deploy | Put the release on the servers that users reach | GitHub Actions, Argo CD, Helm |
| Operate | Keep it running: servers, networks, scaling, security | Linux, Networking, AWS, Terraform, Kubernetes, DevSecOps |
| Monitor | Watch what it does and how users experience it | Observability |

The left half of the loop (plan, code, build, test) is mostly development. The right half (release, deploy, operate, monitor) is mostly operations. In a DevOps team the same people care about both.

## Following one change

A developer fixes a bug where a shop's basket shows the wrong total:

1. **Plan:** The bug is reported and added to the team's list of work.
2. **Code:** The developer writes the fix and a test for it, and commits both to a branch in Git.
3. **Build:** A pipeline starts on its own and builds a container image with the new code.
4. **Test:** The pipeline runs all the automated tests. They pass. A teammate reviews the change and it is merged.
5. **Release:** The pipeline tags the image with a new version, 2.14.1.
6. **Deploy:** The new version is rolled out to production, a few servers at a time.
7. **Operate:** The service keeps running; nothing is restarted by hand.
8. **Monitor:** Dashboards show the error rate for checkout has not changed, and support stops getting reports about wrong totals.

Steps 3 to 6 happen without anyone typing a command. In a well-run team the whole loop can take less than an hour.

## The practices behind the loop

A few practices make the loop fast and safe. Each has its own skill later on the roadmap.

- **Pipeline:** An automated series of steps that takes a change from a commit to a release, stopping at the first step that fails.
- **Continuous integration (CI):** Developers merge their changes into the shared main branch at least once a day, and every merge is automatically built and tested.
- **Continuous delivery:** Every change that passes the pipeline is ready to release at any time, and a person decides when.
- **Continuous deployment:** Every change that passes the pipeline is released to production automatically, with no person deciding.
- **Infrastructure as code (IaC):** Describing servers, networks and other infrastructure in files that a tool reads to create them, so every environment is built the same way.
- **Configuration drift:** When servers that are meant to be the same slowly become different, because people changed them by hand. Infrastructure as code prevents it.
- **Monitoring:** Collecting data about a running system, such as error rates, response times and logs, showing it on dashboards and raising alerts when something goes wrong.

The GitHub Actions and Argo CD skills teach pipelines and releases, Terraform teaches infrastructure as code, and Observability teaches monitoring.

## Feedback loops

**Feedback loop:** The path by which information about a change comes back to the people who made it, such as a failed test, a review comment or an alert from production.

The shorter the loop, the cheaper the fix. A test that fails a minute after a commit points at a change the developer still remembers. A bug found by a user three months later does not.

Much of DevOps is about shortening feedback loops: running tests on every commit, deploying small changes soon after they are written, and sending production alerts to the team that wrote the code.

## Environments

**Environment:** A complete, separate copy of the systems an application needs, used for one purpose.

Most teams have at least these:

- **Development:** Where developers try changes, often on their own machine.
- **Staging:** A copy of production used for a final check before release.
- **Production:** The live system that users use.

A change moves through the environments in order. The closer staging is to production, the more a passing check in staging means.

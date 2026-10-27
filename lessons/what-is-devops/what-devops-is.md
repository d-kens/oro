Software is only useful once it is running and people can use it. Writing the code is one job; building, testing, releasing and running it is another. DevOps is the way of working that joins the two.

This topic explains what DevOps is, what it tries to achieve, where the name came from, and the jobs built around it. By the end you can explain DevOps in a sentence and tell a DevOps practice from one that only uses the word.

## Development and operations

Two kinds of work go into any running application:

- **Development (Dev):** Designing and writing the software, and changing it as needs change.
- **Operations (Ops):** Running the software for its users: the servers, networks and databases it needs, releasing new versions, watching that it works, and fixing it when it breaks.

For a long time these were separate teams with separate goals. Developers were measured on how many new features they shipped. Operations was measured on how rarely the system went down. Every change is a risk to stability, so the two goals pulled against each other.

## What DevOps is

**DevOps:** A set of practices and a culture in which the people who build software and the people who run it work as one team, sharing responsibility for delivering changes to users quickly, safely and often.

It rests on a few ideas that the rest of this skill and this roadmap cover:

- **Shared ownership:** The team that builds a service also cares about how it runs.
- **Small, frequent changes:** Releasing a little at a time, so each release is easy to check and easy to undo.
- **Automation:** Letting machines do the repeated work of building, testing, releasing and setting up servers, so it is fast and the same every time.
- **Feedback:** Watching what the software does in production and measuring how well the team delivers, then using what you learn.

DevOps is a way of working. Tools such as Docker, Terraform or GitHub Actions support it, but a team can use all of them and still work in the old way, with a slow handover between two groups.

## The goal

The point of DevOps is to shorten the time from an idea to working software in users' hands, without making the system less reliable.

Research by the DORA programme, published in the book *Accelerate* (2018), found that teams which release more often also tend to have fewer failed releases and recover faster. Speed and stability do not have to be traded against each other. Small, automated, well-tested changes give you both.

## Where the name came from

In 2009 John Allspaw and Paul Hammond gave a talk called *10+ Deploys per Day: Dev and Ops Cooperation at Flickr*, describing how their developers and operations staff worked together to release many times a day. The same year Patrick Debois organised a conference in Ghent, Belgium, which he named DevOpsDays. The short form, DevOps, stuck as the name for the movement.

## DevOps as a job

DevOps started as a way of working, but it is now also a job title.

**DevOps engineer:** An engineer who builds and runs the systems that let development teams build, test, release and operate their software: pipelines, infrastructure, environments and monitoring.

A typical week might include writing or fixing a pipeline, changing infrastructure and reviewing someone else's change, packaging a new service in a container, setting up dashboards and alerts, responding to an alert while on call, and automating a manual task with a script. The job needs some of both sides: enough development to write scripts and build pipelines, and enough operations to run Linux servers, networks and cloud services.

Two other roles overlap with it:

- **Site reliability engineer (SRE):** An engineer who keeps services reliable using software engineering: reliability targets, automation of repeated operations work, and incident response. The role started at Google in 2003.
- **Platform engineer:** An engineer who builds an internal platform, a set of shared tools and self-service templates, so product teams can create environments, pipelines and services themselves.

The titles overlap a great deal, and the same work goes under different names at different companies.

## How this roadmap is ordered

The roadmap starts with what everything else runs on (Linux, scripting, Git and networking), then packages applications (Docker), puts them on a cloud (Cloud computing, AWS, Terraform), automates their delivery (GitHub Actions), runs them at scale (Kubernetes, Helm, Argo CD), and finishes with watching and securing them (Observability, DevSecOps). The capstone puts it all together.

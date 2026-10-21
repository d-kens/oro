This topic answers five questions, in order:

1. Where is the cloud, physically?
2. Which Region should you use?
3. How much of the system do you manage?
4. Who keeps what secure?
5. How do you tell AWS what to do?

You can do the hands-on part without an AWS account.

## 1. Where is the cloud?

The cloud is buildings full of computers. AWS groups those buildings in three layers.

| Layer | What it is |
| --- | --- |
| **Data centre** | A building full of servers, with its own power, cooling and network links |
| **Availability Zone (AZ)** | One or more data centres in an area, with separate and redundant power, networking and connectivity |
| **Region** | A geographic area with several AZs. Every Region has at least three |

The AZs in a Region are built not to fail together. AWS describes them as "meaningfully distant from each other, up to 60 miles (~100 km)", with their own power substations, generators and cooling, so a fire, flood or power cut in one should not reach the others. They are still close enough to connect with a delay of a few milliseconds.

That gap is what makes the cloud reliable. **If you run your app in two or three AZs, one AZ can go down and your app keeps working.** The Reliability topic later in the roadmap is built on this idea.

Each Region has a name and a code. You will type the code all the time:

| Name | Code | AZ names |
| --- | --- | --- |
| US East (N. Virginia) | `us-east-1` | `us-east-1a`, `us-east-1b`, … |
| Europe (Ireland) | `eu-west-1` | `eu-west-1a`, `eu-west-1b`, … |

In October 2026 AWS listed 39 Regions and 124 AZs, and it keeps adding more. The [global infrastructure page](https://aws.amazon.com/about-aws/global-infrastructure/) has the current numbers.

Two details catch people out:

- **AZ names are shuffled per account.** AWS maps the real AZs to the letters at random for each account, so your `us-east-1a` may be a different building from someone else's `us-east-1a`. When two accounts need to agree on a location, they use the **AZ ID**, such as `use1-az1`, which means the same place in every account.
- **There are also edge locations.** Some services, such as CloudFront (a CDN) and Route 53 (DNS), also run in hundreds of smaller sites called **points of presence**, close to users. You do not run your own servers there. They serve cached content and answer DNS queries near the user.

### Regional, zonal and global services

Where a resource lives depends on the service:

| Scope | Meaning | Examples |
| --- | --- | --- |
| **Zonal** | Lives in one AZ. If that AZ fails, so does the resource | An EC2 server, an EBS disk |
| **Regional** | Spread across the AZs of one Region by AWS | An S3 bucket, a DynamoDB table |
| **Global** | Not tied to one Region | IAM (users and permissions), Route 53, CloudFront |

**What you create in one Region stays there.** AWS's words: resources and data "do not exist in any other Region unless you explicitly use a replication or copy feature". That is good for keeping data in one country. It also means that a server you start in Ireland does not show up when the console is set to Virginia.

## 2. Which Region should you use?

AWS suggests four questions, in this order:

| Question | Why it matters |
| --- | --- |
| **Compliance:** does a law or contract say where the data must be kept? | If it does, that decides it. Nothing else matters until this is met |
| **Latency:** where are your users? | The closer the Region, the faster each request |
| **Cost:** what does it cost there? | The same service has different prices in different Regions |
| **Services:** does the Region have what you need? | New services and features reach Regions gradually, and some never reach every Region |

Two more facts about Regions:

- **Some Regions are opt-in.** Regions launched before 20 March 2019 are switched on for every account. Newer ones are switched off until the account owner enables them.
- **The China and AWS GovCloud (US) Regions are separate.** They sit in their own *partitions*, with their own accounts and IAM. A normal AWS account cannot use them.

For learning, pick one Region close to you and use it for everything, so nothing goes missing.

## 3. How much do you manage?

Cloud services differ in how much of the system you still look after. The usual names for this are IaaS, PaaS and SaaS.

| Model | You rent | You still manage | Example |
| --- | --- | --- | --- |
| **IaaS** (Infrastructure as a Service) | Servers, storage and networks | The operating system, its updates, your app and its data | EC2: you get a virtual server and run whatever you like on it |
| **PaaS** (Platform as a Service) | A place to run your code | Your app and its data | Elastic Beanstalk: you upload your code, and it sets up the servers, load balancing, monitoring and scaling |
| **SaaS** (Software as a Service) | Finished software | Your data and who can see it | Web email: you just log in and use it |

Read the table from top to bottom: **each step down, the provider does more and you control less.** IaaS gives you the most freedom and the most work. SaaS gives you the least of both.

Many AWS services don't fit neatly into one box. S3 (storage), DynamoDB (a database) and Lambda (run code without a server) hide the servers completely, but you still build your own system out of them. AWS calls services like S3 and DynamoDB **abstracted services**. Don't spend time arguing about labels. The useful question about any service is the one in the next section: **what is still my job?**

## 4. Who keeps what secure?

AWS calls this the **shared responsibility model**, and sums it up in one line:

- **AWS is responsible for security *of* the cloud:** the buildings, hardware, networks and the software that runs the services.
- **You are responsible for security *in* the cloud:** what you build and store on top of it.

Where the line falls depends on the service, and follows the IaaS-to-SaaS table above:

| Service | AWS does | You do |
| --- | --- | --- |
| **EC2** (a virtual server) | Hardware, the network, the virtualisation layer | The operating system and its updates and security patches, everything you install, the firewall rules (security groups), your data, and who has access |
| **RDS** (a managed database) | Hardware, the operating system, and preparing operating system and database patches | Choose when patches go in (a weekly maintenance window; some optional updates only go in if you apply them), plan major version upgrades, network access, database users, your data, and who has access |
| **S3** (file storage) | Everything that runs the service | Your data, which encryption option it uses, and who can read or change it |

Look at the last column: **some things never move to AWS.** You always own your data, and you always decide who can get to it. A bucket that anyone on the internet can read is not an AWS failure. It is a setting someone chose.

AWS also lists a few jobs that are shared, with each side doing its own part:

- **Patching:** AWS patches its infrastructure. You patch your own operating systems and apps.
- **Configuration:** AWS configures its own equipment. You configure your servers, databases and apps.
- **Training:** AWS trains its staff. You train yours.

## 5. How do you tell AWS what to do?

Everything in AWS is done through its **API**: a set of web requests such as "start a server" or "list my buckets". Every way of using AWS is a different front end to the same API.

| Way in | What it is | Good for |
| --- | --- | --- |
| **Console** | The website at console.aws.amazon.com | Looking around, learning, one-off checks |
| **CLI** | The `aws` command in your terminal | Quick tasks and shell scripts |
| **SDKs** | Libraries for Python (boto3), Java, JavaScript, Go and other languages | Apps and automation written in code |
| **Infrastructure as code** | Tools such as Terraform and CloudFormation that create resources from files | Building whole systems the same way every time |

The AWS CLI guide says the CLI gives "direct access to the public APIs of AWS services". The console makes the same calls behind the scenes.

Here is the same question asked in two of those ways. Both need an account and credentials, so don't run them now. Just look at the shape:

```bash
# CLI: list the AZs in a Region
aws ec2 describe-availability-zones --region eu-west-1
```

```python
# Python SDK (boto3): the same call
import boto3

ec2 = boto3.client("ec2", region_name="eu-west-1")
for az in ec2.describe_availability_zones()["AvailabilityZones"]:
    print(az["ZoneName"], az["ZoneId"])
```

Notice that both name a Region. Most AWS calls go to one Region's endpoint, which ties back to section 1.

Clicking in the console is fine for learning. Teams usually build systems that need to last with infrastructure as code, so it can be reviewed, repeated and rebuilt. The Automate stage covers that.

## Hands-on: look at AWS's map from your terminal

You need `curl` and `jq` (on Ubuntu, `sudo apt install curl jq`; on a Mac, `brew install jq`). No AWS account is needed.

### See where AWS runs

AWS publishes the IP addresses it uses, tagged by Region and service. Download the file:

```bash
curl -O https://ip-ranges.amazonaws.com/ip-ranges.json
jq -r '.createDate' ip-ranges.json
```

What you should see (your date will be newer):

```text
2026-10-21-11-17-05
```

List the Region codes in it:

```bash
jq -r '.prefixes[].region' ip-ranges.json | sort -u | head -8
```

```text
GLOBAL
af-south-1
ap-east-1
ap-east-2
ap-northeast-1
ap-northeast-2
ap-northeast-3
ap-south-1
```

Apart from `GLOBAL`, each code is a Region. The list also includes the China and GovCloud Regions, which a normal account can't use.

Now look at the addresses tagged `GLOBAL`, the ones not tied to a Region:

```bash
jq -r '.prefixes[] | select(.region=="GLOBAL") | .service' ip-ranges.json | sort | uniq -c
```

```text
 234 AMAZON
   1 AMAZON_CONNECT
   1 CHIME_MEETINGS
 118 CLOUDFRONT
  44 CLOUDFRONT_ORIGIN_FACING
  25 EC2
  45 GLOBALACCELERATOR
   1 IVS_LOW_LATENCY
   9 IVS_REALTIME
   8 ROUTE53
   1 ROUTE53_HEALTHCHECKS
  20 S3
```

CloudFront and Route 53 show up here because they run at edge locations all over the world. Your counts will differ a little: AWS updates the file often.

### Feel the distance

Most services have a separate web address in each Region. You can time how long it takes to open a connection to it, without logging in:

```bash
for r in us-east-1 eu-west-1 af-south-1 ap-southeast-2; do
  printf '%-15s ' "$r"
  curl -s -o /dev/null -w '%{time_connect}s\n' "https://dynamodb.$r.amazonaws.com"
done
```

`time_connect` is the time to look up the address and open the connection, which is mostly one trip there and back. Here is one run, from one laptop:

```text
us-east-1       0.289s
eu-west-1       0.241s
af-south-1      0.123s
ap-southeast-2  0.385s
```

Your numbers will be different, because they depend on where you are, and they jump around from one run to the next. Run it a few times: the Region closest to you should keep coming out fastest. Every request your users make pays this delay, so this is what the "latency" row in section 2 means in practice.

Try adding the Region you think is closest to you, and one on the far side of the world.

## Common pitfalls

- **"My server has disappeared."** The console shows one Region at a time. Check the Region menu at the top right before assuming something was deleted.
- **Forgotten resources in other Regions.** They still cost money while you aren't looking at them. Stick to one Region while learning.
- **Running everything in one AZ.** It works until that AZ has a problem. Anything that matters should run in at least two.
- **Comparing AZ letters across accounts.** `us-east-1a` in two accounts can be two different places. Use AZ IDs.
- **"It's managed, so it's secure."** AWS runs the service. Who can read your data is still your setting.

## Summary

- **A Region** is a geographic area with at least three **Availability Zones**. Each AZ is one or more data centres, built so they don't fail together.
- **Run important things in more than one AZ.** That is the basis of reliability on AWS.
- Resources are **zonal, regional or global**, and what you create in a Region stays there unless you copy it.
- **Choose a Region** by compliance first, then latency, cost and the services you need.
- **IaaS, PaaS and SaaS** describe how much you manage. The more the provider runs, the less you control.
- **AWS secures the cloud. You secure what you put in it.** Your data, and who can reach it, are always your job.
- The **console, CLI, SDKs and infrastructure as code** are all front ends to the same API.

**Next:** Linux. The first foundation topic: the operating system that most cloud servers run.

## Further reading

- [AWS global infrastructure](https://aws.amazon.com/about-aws/global-infrastructure/): the current map and counts of Regions and AZs.
- [AWS fault isolation boundaries: Availability Zones](https://docs.aws.amazon.com/whitepapers/latest/aws-fault-isolation-boundaries/availability-zones.html): how AZs are kept apart, in AWS's own words.
- [What to consider when selecting a Region](https://aws.amazon.com/blogs/architecture/what-to-consider-when-selecting-a-region-for-your-workloads/): the four factors from section 2, with examples.
- [Shared responsibility model](https://aws.amazon.com/compliance/shared-responsibility-model/): AWS's page on who secures what.
- [Types of cloud computing](https://aws.amazon.com/types-of-cloud-computing/): AWS's short take on IaaS, PaaS and SaaS.

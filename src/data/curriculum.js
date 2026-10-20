/* Paipa curriculum: read by the Astro pages to make the roadmap page, the notes pages, the search index and the sitemap. */
/* ---------- publishing status ----------
   When you publish notes for a module:
     1. add notes/<slug>.md  (copy notes/_template.md)
     2. add or update its line below
   status: 'published' (notes are live) or 'progress' (being written). Leave a module out while it is not started.
   name and summary: the short name and the one line the Topics page shows for a published module.
   The build stops if a published module has no notes file, name or summary, or a line here names a module that does not exist. */
var NOTES = {
  'what-is-cloud-engineering': { status: 'published', updated: '2026-10-20', name: 'What is cloud engineering',
    summary: 'What the cloud is, what a cloud engineer does, how it differs from DevOps and SRE, and the main kinds of cloud service.' },
  'linux': { status: 'published', updated: '2026-10-04', name: 'Linux',
    summary: 'Files, permissions, processes, packages, cron, systemd and logs, and how to fix a broken service.' },
  'devops-mindset': { status: 'published', updated: '2026-10-04', name: 'DevOps mindset',
    summary: 'What DevOps is, the DevOps loop, the Three Ways, CALMS and the DORA metrics.' }
};

/* ---------- phases and modules ---------- */
function mod(slug, title, tags, kind, task, note) { return { slug: slug, title: title, tags: tags, kind: kind, task: task, note: note }; }
var PHASES = [
  { name: 'Orientation', blurb: 'What cloud engineering is, and how the cloud is put together.', modules: [
    mod('what-is-cloud-engineering', 'What is cloud engineering', ['What the cloud is', 'A cloud engineer\'s day', 'Cloud engineering, DevOps and SRE', 'Core service categories', 'Where to start'], null, null),
    mod('how-the-cloud-works', 'How the cloud works', ['Regions and Availability Zones', 'IaaS, PaaS and SaaS', 'The shared responsibility model'], null, null) ] },
  { name: 'Foundations', blurb: 'The everyday tools everything after this depends on.', modules: [
    mod('linux', 'Linux', ['Filesystem and permissions', 'Users and groups', 'Processes and signals', 'systemd, journald, cron', 'top, ss, lsof'], 'Lab', 'Run a service under systemd, break it, and fix it using only logs.'),
    mod('networking', 'Networking basics', ['IP addresses, CIDR and subnets', 'DNS, HTTP and TLS', 'Ports and firewalls', 'NAT', 'dig and curl'], null, null),
    mod('git', 'Git', ['Commits and history', 'Branches and merging', 'Resolving conflicts', 'Pull requests and review', 'Tags and versions'], 'Lab', 'Simulate a team release with feature branches, a hotfix and a tag. Every lab from here on lives in a repo.'),
    mod('scripting', 'Scripting with Bash and Python', ['Bash essentials', 'set -euo pipefail', 'grep, awk, sed, jq', 'Python for automation', 'Bash or Python?'], 'Lab', 'Write a script that health-checks a set of URLs and alerts when one fails.') ] },
  { name: 'Core cloud services', blurb: 'The building blocks most systems on AWS are made from.', modules: [
    mod('compute', 'Compute: EC2 and auto scaling', ['Instances and instance types', 'AMIs', 'Key pairs and SSH', 'Auto Scaling groups'], null, null),
    mod('storage', 'Storage: S3 and EBS', ['Buckets and objects', 'Storage classes', 'EBS volumes and snapshots', 'Which storage when'], null, null),
    mod('databases', 'Managed databases: RDS and DynamoDB', ['Managed vs self-run databases', 'RDS', 'DynamoDB', 'Backups and read replicas', 'SQL or NoSQL?'], null, null),
    mod('serverless', 'Serverless: Lambda', ['Functions and events', 'Triggers', 'Limits and cold starts', 'When serverless fits'], null, null) ] },
  { name: 'Cloud networking', blurb: 'Connect services privately, and let users reach them safely.', modules: [
    mod('vpc', 'VPCs, subnets, routing and security groups', ['VPCs and CIDR blocks', 'Public and private subnets', 'Route tables and gateways', 'Security groups and network ACLs'], null, null),
    mod('dns-load-balancing-cdn', 'DNS, load balancers and CDN (Route 53, ELB, CloudFront)', ['Route 53', 'Elastic Load Balancing', 'CloudFront', 'Health checks', 'HTTPS certificates'], null, null) ] },
  { name: 'Identity and security', blurb: 'Decide who can do what, and keep data safe.', modules: [
    mod('iam', 'IAM and least privilege', ['Users, groups and roles', 'Policies', 'Least privilege', 'MFA', 'Temporary credentials'], null, null),
    mod('secrets-encryption', 'Secrets and encryption', ['Keeping secrets out of code', 'Secrets Manager', 'KMS', 'Encryption at rest and in transit'], null, null) ] },
  { name: 'Automate', blurb: 'Build and change everything from code.', modules: [
    mod('infrastructure-as-code', 'Infrastructure as code with Terraform', ['Why infrastructure as code', 'Providers and resources', 'Plan and apply', 'State and locking', 'Modules'], null, null),
    mod('containers', 'Containers and Docker', ['Containers vs VMs', 'Images and Dockerfiles', 'Multi-stage builds', 'Docker Compose', 'Registries and tags'], 'Lab', 'Containerise a Spring Boot app and its database with Compose, and keep the image under 200 MB.'),
    mod('ci-cd', 'CI/CD with GitHub Actions', ['Continuous integration', 'Continuous delivery', 'Workflows, jobs and steps', 'Caching and matrices', 'Rollbacks'], 'Lab', 'Build a GitHub Actions pipeline that lints, tests, builds and publishes your Docker image.'),
    mod('devops-mindset', 'How cloud teams ship: the DevOps mindset', ['CALMS', 'The Three Ways', 'DORA metrics', 'DevOps, SRE and Platform Engineering'], null, null) ] },
  { name: 'Run at scale', blurb: 'Keep systems healthy, recoverable and affordable.', modules: [
    mod('eks', 'Kubernetes on AWS (EKS)', ['Pods, Deployments and Services', 'kubectl', 'EKS clusters and node groups', 'Scaling'], null, null),
    mod('observability', 'Observability: CloudWatch, Prometheus and Grafana', ['Metrics, logs and traces', 'CloudWatch', 'Prometheus and Grafana', 'Dashboards', 'Actionable alerts'], 'Lab', 'Run Prometheus and Grafana on your own computer, then build a dashboard for an app and one meaningful alert.'),
    mod('reliability', 'Reliability and disaster recovery', ['Failure is normal', 'Backups, RPO and RTO', 'Multi-AZ and multi-Region', 'Testing recovery'], null, null),
    mod('cost-management', 'Cost management', ['How cloud pricing works', 'Budgets and alerts', 'Tagging', 'Right-sizing', 'Cutting waste'], null, null) ] },
  { name: 'Architect', blurb: 'Design whole systems, then prove it end to end.', modules: [
    mod('well-architected', 'The AWS Well-Architected Framework', ['The pillars', 'Trade-offs', 'Reviewing a design'], null, null),
    mod('high-availability', 'Designing for high availability', ['Single points of failure', 'Spreading across Availability Zones', 'Stateless services', 'Graceful failure'], null, null),
    mod('capstone', 'Capstone: design and deploy a production-ready app on AWS', ['Design', 'Network and security', 'Infrastructure as code', 'CI/CD', 'Monitoring and cost'], null, null),
    mod('certification', 'Optional: certification guide (AWS Solutions Architect Associate)', ['What the exam covers', 'How to prepare'], null, null),
    mod('extras', 'Optional extras: SRE, platform engineering, GitOps, supply chain security', ['SRE', 'Platform engineering', 'GitOps', 'Supply chain security'], null, null) ] }
];
var MODULES = [];
PHASES.forEach(function (ph, pi) {
  ph.modules.forEach(function (m) {
    m.num = MODULES.length + 1; m.phase = pi;
    var st = NOTES[m.slug] || {};
    m.status = st.status || 'coming'; m.updated = st.updated || null;
    m.name = st.name || m.title; m.summary = st.summary || null;
    MODULES.push(m);
  });
});

export { NOTES, PHASES, MODULES };

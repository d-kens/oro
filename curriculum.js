/* Paipa curriculum: read by build.js to make the home page, the curriculum page, the notes pages and the search index. */
(function () {
  /* ---------- publishing status ----------
     When you publish notes for a module:
       1. add notes/<slug>.md  (copy notes/_template.md)
       2. add or update its line below
     status: 'published' (notes are live) or 'progress' (being written). Leave a module out while it is not started.
     The build stops if a published module has no notes file, or a line here names a module that does not exist. */
  var NOTES = {
    'devops-mindset': { status: 'published', updated: '2026-10-04' },
    'linux': { status: 'published', updated: '2026-10-04' }
  };

  /* ---------- phases and modules ---------- */
  function mod(slug, title, tags, kind, task, note) { return { slug: slug, title: title, tags: tags, kind: kind, task: task, note: note }; }
  var PHASES = [
    { name: 'Orientation', blurb: 'Why DevOps exists, and how teams measure it.', modules: [
      mod('devops-mindset', 'The DevOps mindset', ['CALMS', 'The Three Ways', 'DORA metrics', 'DevOps, SRE and Platform Engineering'], null, null) ] },
    { name: 'Foundations', blurb: 'The everyday tools every later module depends on.', security: 'File permissions, SSH keys, and keeping secrets out of Git.', modules: [
      mod('linux', 'Linux', ['Filesystem and permissions', 'Users and groups', 'Processes and signals', 'systemd, journald, cron', 'top, ss, lsof'], 'Lab', 'Run a service under systemd, break it, and fix it using only logs.'),
      mod('git', 'Git and branching strategies', ['Merge vs rebase', 'Resolving conflicts', 'Trunk-based vs GitFlow', 'Pull requests and review', 'Semantic versioning'], 'Lab', 'Simulate a team release with feature branches, a hotfix and a tag. Every lab from here on lives in a repo.'),
      mod('scripting', 'Scripting with Bash and Python', ['Bash essentials', 'set -euo pipefail', 'grep, awk, sed, jq', 'Python for automation', 'Bash or Python?'], 'Lab', 'Write a script that health-checks a set of URLs and alerts when one fails.'),
      mod('networking', 'Networking for DevOps', ['TCP/IP, CIDR, subnets', 'DNS, HTTP and TLS', 'Load balancers and proxies', 'NAT and firewalls', 'dig, curl, tcpdump'], null, null) ] },
    { name: 'Build and deliver', blurb: 'Turn a commit into a tested, packaged release.', security: 'Dependency and image scanning, and lockfiles you can trust.', modules: [
      mod('build-tools', 'Build tools and artifacts', ['Maven, Gradle, npm', 'Dependencies and lockfiles', 'Artifact repositories', 'Reproducible builds'], null, null),
      mod('containers', 'Containers and Docker', ['Containers vs VMs', 'Namespaces and cgroups', 'Multi-stage builds', 'Docker Compose', 'Tagging and scanning images'], 'Lab', 'Containerise a Spring Boot app and its database with Compose, and keep the image under 200 MB.'),
      mod('continuous-integration', 'Continuous integration', ['Fast feedback', 'Stages, caching, matrices', 'GitHub Actions workflows', 'Reusable workflows and runners', 'The test pyramid'], 'Lab', 'Build a GitHub Actions pipeline that lints, tests, builds and publishes your Module 7 image.'),
      mod('continuous-delivery', 'Continuous delivery and release strategies', ['Delivery vs deployment', 'Environment promotion', 'Blue-green and canary', 'Feature flags and rollbacks', 'Database migrations'], null, null) ] },
    { name: 'Infrastructure', blurb: 'Build the platform your software runs on, from code.', security: 'IAM least privilege, Kubernetes Secrets and RBAC.', modules: [
      mod('cloud-fundamentals', 'Cloud fundamentals', ['Regions and zones', 'Shared responsibility', 'AWS first, with GCP and Azure equivalents', 'Compute, functions, storage', 'VPCs and security groups', 'IAM and least privilege', 'Managed databases, queues and DNS'], 'Lab', 'Hand-build a VPC with public and private subnets, then tear it down.'),
      mod('infrastructure-as-code', 'Infrastructure as code', ['Idempotency and drift', 'Terraform modules', 'Remote state and locking', 'Ansible'], 'Lab', 'Rebuild the Module 10 VPC in Terraform, with modules and remote state.'),
      mod('kubernetes-core', 'Kubernetes core', ['Control plane and nodes', 'Pods, Deployments, Services', 'Ingress', 'ConfigMaps and Secrets', 'kubectl'], 'Lab', 'Deploy your containerised app to a local cluster with kind or minikube.'),
      mod('kubernetes-production', 'Kubernetes in production', ['Requests, limits, HPA', 'Health probes', 'StatefulSets and Jobs', 'Helm and RBAC', 'NetworkPolicies', 'Managed clusters and upgrades'], null, null),
      mod('gitops', 'GitOps', ['Git as source of truth', 'Argo CD and Flux', 'Drift detection', 'Environments and secrets'], 'Lab', 'Deploy to Kubernetes through Argo CD from a Git repo.') ] },
    { name: 'Operate', blurb: 'Keep systems healthy, and recover fast when they are not.', security: 'Audit logs, and alerts for suspicious activity.', modules: [
      mod('observability', 'Observability', ['Metrics, logs, traces', 'Prometheus and Grafana', 'OpenTelemetry', 'Loki, ELK, Jaeger', 'RED and USE methods', 'Actionable alerts'], 'Lab', 'Instrument the app and build a dashboard plus one meaningful alert.'),
      mod('sre', 'SRE practice and incident management', ['SLIs and SLOs', 'Error budgets', 'On-call and runbooks', 'Incident roles and comms', 'Blameless postmortems', 'Reducing toil'], null, null),
      mod('reliability', 'Reliability and disaster recovery', ['High availability and failover', 'Backups, RPO and RTO', 'Replication and connection pooling', 'Chaos engineering']) ] },
    { name: 'Secure', blurb: 'Go deep on the security thread that runs through every phase.', modules: [
      mod('devsecops', 'DevSecOps and supply chain security', ['SAST, DAST, SCA', 'Trivy and Checkov', 'Vault and OIDC for CI', 'SBOMs and signing', 'SLSA'], 'Lab', 'Add security gates to your Module 8 pipeline.'),
      mod('compliance', 'Compliance for regulated data', ['Encryption and audit logs', 'ISO 27001 and SOC 2', 'HIPAA, GDPR, Kenya DPA', 'Policy as code', 'Evidence collection'], null, null, 'A framework-level overview, not legal advice.') ] },
    { name: 'Mature', blurb: 'Make delivery faster for everyone, then prove it all end to end.', modules: [
      mod('platform-finops', 'Platform engineering and FinOps', ['Developer platforms', 'Golden paths and Backstage', 'Self-service infrastructure', 'Cost visibility and rightsizing', 'Spot instances and tagging'], null, null),
      mod('capstone', 'Capstone: commit to production', ['Your pipeline, end to end', 'Terraform, Kubernetes, GitOps', 'SLOs and alerts', 'Security gates'], 'Project', 'Take one app from a commit to a secured, monitored production deployment, then walk a reviewer through every decision.') ] }
  ];
  var MODULES = [];
  PHASES.forEach(function (ph, pi) {
    ph.modules.forEach(function (m) {
      m.num = MODULES.length + 1; m.phase = pi;
      var st = NOTES[m.slug] || {};
      m.status = st.status || 'coming'; m.updated = st.updated || null;
      MODULES.push(m);
    });
  });


  module.exports = { NOTES: NOTES, PHASES: PHASES, MODULES: MODULES };
})();

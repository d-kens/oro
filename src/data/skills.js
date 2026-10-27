/* Paipa skills: each skill is a set of topics learned in order, ending in projects.
   Read by the Skills page and the skill pages (skills/<slug>.html).
   A topic is [slug, title, the one line it covers]; a project is [slug, title, what you build]. Every project runs on your own computer.
   Each topic and project has a lesson in lessons/<skill>/<slug>.md; the build stops if one is missing. */
export const SKILLS = [
  {
    slug: 'what-is-devops', name: 'What is DevOps', level: 'Beginner',
    summary: 'What DevOps is, the problems it grew out of, and the ideas behind it: the delivery lifecycle, culture, and measuring how a team delivers.',
    topics: [
      ['what-devops-is', 'What DevOps is', 'Development and operations working as one team, what DevOps aims for, where the name came from, and the jobs built around it.'],
      ['before-devops', 'Before DevOps', 'Separate teams, handovers and big releases, what went wrong with them, and how agile led to DevOps.'],
      ['the-delivery-lifecycle', 'The delivery lifecycle', 'The stages a change goes through from an idea to production, the practices that automate them, feedback loops, and environments.'],
      ['culture-and-calms', 'Culture and CALMS', 'Culture, automation, lean, measurement and sharing, owning what you build, and blameless postmortems.'],
      ['measuring-delivery', 'Measuring delivery', 'The four DORA metrics, how to work each one out, and how teams use them.']
    ],
    projects: []
  },
  {
    slug: 'cloud-computing', name: 'Cloud computing', level: 'Beginner',
    summary: 'What the cloud is, why companies moved to it, and the ideas every provider shares: service models, regions and zones, scaling, paying for use, and who is responsible for what.',
    topics: [
      ['what-cloud-computing-is', 'What cloud computing is', 'Renting computers instead of buying them, and the five things that make a service a cloud.'],
      ['before-the-cloud', 'Before the cloud', 'Buying and running your own servers, what that cost, and why most companies stopped.'],
      ['how-the-cloud-works', 'How the cloud works', 'Data centres, virtual machines, and the APIs that let you create a server in a minute.'],
      ['service-models', 'Service models', 'IaaS, PaaS, SaaS and serverless, and what you manage in each.'],
      ['deployment-models', 'Deployment models', 'Public, private, hybrid and multi-cloud, and why a company picks one.'],
      ['regions-and-zones', 'Regions and zones', 'Where the computers actually are, and how regions and availability zones keep a service running when a building fails.'],
      ['scaling-and-elasticity', 'Scaling and elasticity', 'Bigger machines or more machines, scaling down as well as up, and designing for machines that fail.'],
      ['paying-for-the-cloud', 'Paying for the cloud', 'Pay-as-you-go, reserved and spot prices, the costs people forget, and how bills surprise teams.'],
      ['shared-responsibility', 'Shared responsibility', 'What the provider secures, what you secure, and how that line moves with the service model.'],
      ['cloud-providers', 'Cloud providers', 'AWS, Azure, Google Cloud and the rest: the same ideas under different names.']
    ],
    projects: [
      ['project-cost-a-workload', 'Cost a workload', 'Work out what a small web shop costs to run on its own servers and in the cloud, over three years, in a spreadsheet.'],
      ['project-plan-a-move', 'Plan a move to the cloud', 'Take a company\'s servers and write a one-page plan: what moves, which service model, how many zones, and who secures what.']
    ]
  },
  {
    slug: 'linux', name: 'Linux', level: 'Beginner',
    summary: 'The command line and the operating system almost every server runs. Everything else on the roadmap sits on top of it.',
    topics: [
      ['what-linux-is', 'What Linux is', 'The kernel, distributions, and why servers run Linux. Getting a Linux shell on your own computer.'],
      ['moving-around', 'Moving around', 'The directory tree, absolute and relative paths, and getting from one place to another with cd and pwd.'],
      ['looking-at-files', 'Looking at files', 'Listing files with ls, hidden files, and reading what the long listing tells you.'],
      ['reading-files', 'Reading files', 'cat, less, head and tail, and following a log file as it grows.'],
      ['creating-and-moving-files', 'Creating and moving files', 'Making, copying, moving and deleting files and directories, and doing it safely.'],
      ['finding-things', 'Finding things', 'Searching inside files with grep and finding files by name, size or age with find.'],
      ['editing-files', 'Editing files', 'Enough of nano and vim to change a config file on a server without leaving the terminal.'],
      ['users-and-permissions', 'Users and permissions', 'Users, groups, read, write and execute, chmod and chown, and when to use sudo.'],
      ['processes', 'Processes', 'What a process is, seeing what is running, signals, and stopping a process that will not stop.'],
      ['services-with-systemd', 'Services with systemd', 'Starting, stopping and enabling services, reading their logs with journalctl, and writing a unit file.'],
      ['installing-software', 'Installing software', 'Package managers, repositories, and keeping a machine up to date.'],
      ['disks-and-space', 'Disks and space', 'Filesystems, mounting, and finding what is filling a disk with df and du.'],
      ['watching-a-machine', 'Watching a machine', 'CPU, memory and load, top and free, and telling a busy server from a broken one.'],
      ['scheduled-jobs', 'Running things on a schedule', 'cron and systemd timers, and checking that a scheduled job actually ran.'],
      ['your-shell', 'Your shell', 'Environment variables, PATH, aliases, and the files your shell reads when it starts.'],
      ['pipes-and-text', 'Pipes and text', 'Redirection, pipes, and shaping text with cut, sort, uniq, sed and awk.'],
      ['links', 'Links', 'Hard links and symbolic links, and what each one points at.'],
      ['archives', 'Archives', 'Packing and unpacking with tar, gzip and zip, the formats you will meet in releases and backups.']
    ],
    projects: [
      ['project-set-up-a-machine', 'Set up a new machine', 'Create users and groups, lock down a shared directory, and install and run a service that starts on boot.'],
      ['project-read-the-logs', 'Read the logs', 'Take a web server log and answer questions with a pipeline: the busiest hour, the most common errors, the top visitors.']
    ]
  },
  {
    slug: 'networking', name: 'Networking', level: 'Beginner',
    summary: 'How machines find and talk to each other, from IP addresses and ports to DNS, HTTP, TLS, routing and firewalls, and how to find out why they cannot.',
    topics: [
      ['what-a-network-is', 'What a network is', 'Hosts, links, packets, switches and routers. Building a small network of your own to practise on.'],
      ['ip-addresses', 'IP addresses', 'IPv4 and IPv6 addresses, private and public ranges, network interfaces and the loopback, and an interface\'s MTU.'],
      ['subnets-and-cidr', 'Subnets and CIDR', 'Network masks, CIDR notation, and working out which addresses are on the same network.'],
      ['the-layers-model', 'The layers model', 'The layers a packet passes through, what each one adds, and which tools work at which layer.'],
      ['ports-and-sockets', 'Ports and sockets', 'How one machine runs many services, well-known ports, seeing what is listening, and testing a port with nc.'],
      ['tcp', 'TCP', 'Connections, the three-way handshake, connection states, and what reliable delivery costs.'],
      ['udp', 'UDP', 'Sending without a connection, where that is the right choice, and what can go missing.'],
      ['dns-basics', 'DNS basics', 'How a name becomes an address, /etc/hosts and resolvers, record types, caching and TTLs, and following a lookup with dig.'],
      ['http', 'HTTP', 'Requests and responses, methods, status codes, headers, redirects and JSON, and watching a request with curl.'],
      ['serve-a-website-with-nginx', 'Serve a website with nginx', 'Installing nginx, serving a site, server blocks, and reading its logs.'],
      ['tls-and-https', 'TLS and HTTPS', 'What TLS protects, certificates and the chain of trust, inspecting a site\'s certificate, and signing one with your own CA.'],
      ['routing-and-gateways', 'Routing and gateways', 'The routing table, the default gateway, and following a packet\'s path with traceroute.'],
      ['nat', 'NAT', 'How private addresses reach the internet, and forwarding a port from outside to a machine inside.'],
      ['firewall-basics', 'Firewall basics', 'Packet filtering, rules and chains, default policies, and locking down a server without locking yourself out.'],
      ['tcpdump', 'tcpdump', 'Capturing packets, filtering them, and reading what was actually sent.'],
      ['ssh-and-tunnels', 'SSH and tunnels', 'Keys, the SSH config file, jump hosts, and forwarding ports through SSH.'],
      ['reverse-proxy-and-load-balancing', 'Reverse proxy and load balancing', 'Putting nginx in front of applications and spreading requests across several of them.'],
      ['the-debugging-playbook', 'The debugging playbook', 'A layer-by-layer method for working out why a service cannot be reached.']
    ],
    projects: [
      ['project-fix-the-broken-server', 'Fix the broken server', 'A lab network where a web service cannot be reached. Find each fault, layer by layer, and fix it.'],
      ['project-build-a-small-web-stack', 'Build a small web stack', 'Two application servers behind an nginx load balancer with HTTPS from your own certificate authority and a name in the lab\'s DNS.'],
      ['project-diagnose-traffic-with-tcpdump', 'Diagnose traffic with tcpdump', 'Capture a request from start to finish and explain every packet: the TCP handshake, TLS and HTTP.']
    ]
  },
  {
    slug: 'shell-scripting', name: 'Shell scripting', level: 'Intermediate',
    summary: 'Turning the commands from the Linux skill into Bash scripts that run unattended, handle bad input and fail safely.',
    topics: [
      ['shell-scripting-basics', 'Shell scripting basics', 'What a script is, the shebang line, making a script executable, and running it.'],
      ['shell-variables', 'Shell variables', 'Setting and reading variables, quoting, command substitution, and environment variables in scripts.'],
      ['conditionals', 'Conditionals', 'if, test and [[ ]], comparing strings, numbers and files, and case statements.'],
      ['loops', 'Loops', 'for, while and until loops, reading a file line by line, and break and continue.'],
      ['parameter-expansion', 'Parameter expansion', 'Default values, trimming and replacing parts of a value, and lengths, without calling other programs.'],
      ['arguments-and-input', 'Arguments and input', 'Positional arguments, shift, options with getopts, reading input, and a usage message.'],
      ['functions', 'Functions', 'Defining functions, arguments and return values, local variables, and splitting a script into parts.'],
      ['arrays', 'Arrays', 'Indexed and associative arrays, looping over them, and keeping file names with spaces intact.'],
      ['arithmetic-and-strings', 'Arithmetic and strings', 'Integer maths with $(( )), comparing and formatting numbers and text, and printf.'],
      ['exit-codes-and-errors', 'Exit codes and errors', 'Exit statuses, checking them, && and ||, writing errors to stderr, and exiting with the right code.'],
      ['robust-scripts', 'Robust scripts', 'set -euo pipefail, traps and clean-up, temporary files, lock files, and scripts that are safe to run twice.'],
      ['debugging', 'Debugging', 'Tracing a script with set -x, ShellCheck, and finding the line where it goes wrong.'],
      ['real-world-scripts', 'Real-world scripts', 'Patterns from scripts that run in production: logging, configuration files, dry runs, and running from cron.']
    ],
    projects: [
      ['project-automate-a-backup', 'Automate a backup', 'Write a script that archives a directory, keeps the last seven copies, runs every night and logs what it did.'],
      ['project-health-check', 'Health check', 'A script that checks disk, memory, load and services, writes a report, and exits with a status a monitor can act on.'],
      ['project-bulk-users-from-a-file', 'Bulk users from a file', 'Create and update user accounts from a CSV file, with validation, a dry-run mode and a summary, safe to run again.'],
      ['project-deploy-script', 'Deploy script', 'Release a new version of a site into a timestamped directory, switch to it with a symlink, check it, and roll back on failure.']
    ]
  }
];

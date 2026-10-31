/* Oro skills: each skill is a set of topics learned in order, ending in projects.
   Read by the Skills page and the skill pages (skills/<slug>.html).
   A topic is [slug, title, the one line it covers, search title]; a project is [slug, title, what you build, search title].
   The search title is the page's <title>: the topic named the way people search for it, as the short title often says little on its own ("Links").
   A skill's search is its skill page's <title>. Every project runs on your own computer.
   Each topic and project has a lesson in lessons/<skill>/<slug>.md; the build stops if one is missing.
   added is the day the skill went up, as YYYY-MM-DD; the home page lists the newest skills by it. */
export const SKILLS = [
  {
    slug: 'what-is-devops', added: '2026-10-27', name: 'What is DevOps', level: 'Beginner', search: 'Introduction to DevOps',
    summary: 'What DevOps is, the problems it grew out of, and the ideas behind it: the delivery lifecycle, culture, and measuring how a team delivers.',
    topics: [
      ['what-devops-is', 'What DevOps is', 'Development and operations working as one team, what DevOps aims for, where the name came from, and the jobs built around it.', 'What is DevOps'],
      ['before-devops', 'Before DevOps', 'Separate teams, handovers and big releases, what went wrong with them, and how agile led to DevOps.', 'Before DevOps: separate dev and ops teams'],
      ['the-delivery-lifecycle', 'The delivery lifecycle', 'The stages a change goes through from an idea to production, the practices that automate them, feedback loops, and environments.', 'The software delivery lifecycle in DevOps'],
      ['culture-and-calms', 'Culture and CALMS', 'Culture, automation, lean, measurement and sharing, owning what you build, and blameless postmortems.', 'DevOps culture and the CALMS model'],
      ['measuring-delivery', 'Measuring delivery', 'The four DORA metrics, how to work each one out, and how teams use them.', 'DORA metrics: measuring software delivery']
    ],
    projects: []
  },
  {
    slug: 'cloud-computing', added: '2026-10-26', name: 'Cloud computing', level: 'Beginner', search: 'Learn cloud computing',
    summary: 'What the cloud is, why companies moved to it, and the ideas every provider shares: service models, regions and zones, scaling, paying for use, and who is responsible for what.',
    topics: [
      ['what-cloud-computing-is', 'What cloud computing is', 'Renting computers instead of buying them, and the five things that make a service a cloud.', 'What is cloud computing'],
      ['before-the-cloud', 'Before the cloud', 'Buying and running your own servers, what that cost, and why most companies stopped.', 'On-premises servers vs the cloud'],
      ['how-the-cloud-works', 'How the cloud works', 'Data centres, virtual machines, and the APIs that let you create a server in a minute.', 'How cloud computing works'],
      ['service-models', 'Service models', 'IaaS, PaaS, SaaS and serverless, and what you manage in each.', 'Cloud service models: IaaS, PaaS, SaaS and serverless'],
      ['deployment-models', 'Deployment models', 'Public, private, hybrid and multi-cloud, and why a company picks one.', 'Cloud deployment models: public, private and hybrid'],
      ['regions-and-zones', 'Regions and zones', 'Where the computers actually are, and how regions and availability zones keep a service running when a building fails.', 'Cloud regions and availability zones'],
      ['scaling-and-elasticity', 'Scaling and elasticity', 'Bigger machines or more machines, scaling down as well as up, and designing for machines that fail.', 'Scaling and elasticity in the cloud'],
      ['paying-for-the-cloud', 'Paying for the cloud', 'Pay-as-you-go, reserved and spot prices, the costs people forget, and how bills surprise teams.', 'Cloud pricing: pay-as-you-go, reserved and spot'],
      ['shared-responsibility', 'Shared responsibility', 'What the provider secures, what you secure, and how that line moves with the service model.', 'The cloud shared responsibility model'],
      ['cloud-providers', 'Cloud providers', 'AWS, Azure, Google Cloud and the rest: the same ideas under different names.', 'AWS vs Azure vs Google Cloud']
    ],
    projects: [
      ['project-cost-a-workload', 'Cost a workload', 'Work out what a small web shop costs to run on its own servers and in the cloud, over three years, in a spreadsheet.', 'Project: compare on-premises and cloud costs'],
      ['project-plan-a-move', 'Plan a move to the cloud', 'Take a company\'s servers and write a one-page plan: what moves, which service model, how many zones, and who secures what.', 'Project: plan a cloud migration']
    ]
  },
  {
    slug: 'linux', added: '2026-10-24', name: 'Linux', level: 'Beginner', search: 'Learn Linux for DevOps',
    summary: 'The command line and the operating system almost every server runs. Everything else on the roadmap sits on top of it.',
    topics: [
      ['what-linux-is', 'What Linux is', 'The kernel, distributions, and why servers run Linux. Getting a Linux shell on your own computer.', 'What is Linux'],
      ['moving-around', 'Moving around', 'The directory tree, absolute and relative paths, and getting from one place to another with cd and pwd.', 'Linux paths and the cd and pwd commands'],
      ['looking-at-files', 'Looking at files', 'Listing files with ls, hidden files, and reading what the long listing tells you.', 'Listing files with ls in Linux'],
      ['reading-files', 'Reading files', 'cat, less, head and tail, and following a log file as it grows.', 'Reading files in Linux: cat, less, head and tail'],
      ['creating-and-moving-files', 'Creating and moving files', 'Making, copying, moving and deleting files and directories, and doing it safely.', 'Creating, copying, moving and deleting files in Linux'],
      ['finding-things', 'Finding things', 'Searching inside files with grep and finding files by name, size or age with find.', 'Searching files in Linux with grep and find'],
      ['editing-files', 'Editing files', 'Enough of nano and vim to change a config file on a server without leaving the terminal.', 'Editing files in the terminal with nano and vim'],
      ['users-and-permissions', 'Users and permissions', 'Users, groups, read, write and execute, chmod and chown, and when to use sudo.', 'Linux users, groups and file permissions'],
      ['processes', 'Processes', 'What a process is, seeing what is running, signals, and stopping a process that will not stop.', 'Linux processes, signals and kill'],
      ['services-with-systemd', 'Services with systemd', 'Starting, stopping and enabling services, reading their logs with journalctl, and writing a unit file.', 'Managing Linux services with systemd'],
      ['installing-software', 'Installing software', 'Package managers, repositories, and keeping a machine up to date.', 'Installing software with Linux package managers'],
      ['disks-and-space', 'Disks and space', 'Filesystems, mounting, and finding what is filling a disk with df and du.', 'Linux disk space, filesystems and mounting'],
      ['watching-a-machine', 'Watching a machine', 'CPU, memory and load, top and free, and telling a busy server from a broken one.', 'Monitoring Linux CPU, memory and load'],
      ['scheduled-jobs', 'Running things on a schedule', 'cron and systemd timers, and checking that a scheduled job actually ran.', 'Scheduling jobs in Linux with cron and systemd timers'],
      ['your-shell', 'Your shell', 'Environment variables, PATH, aliases, and the files your shell reads when it starts.', 'Environment variables, PATH and aliases in Linux'],
      ['pipes-and-text', 'Pipes and text', 'Redirection, pipes, and shaping text with cut, sort, uniq, sed and awk.', 'Linux pipes, redirection and text processing'],
      ['links', 'Links', 'Hard links and symbolic links, and what each one points at.', 'Hard links and symbolic links in Linux'],
      ['archives', 'Archives', 'Packing and unpacking with tar, gzip and zip, the formats you will meet in releases and backups.', 'tar, gzip and zip in Linux']
    ],
    projects: [
      ['project-set-up-a-machine', 'Set up a new machine', 'Create users and groups, lock down a shared directory, and install and run a service that starts on boot.', 'Linux project: set up a new server'],
      ['project-read-the-logs', 'Read the logs', 'Take a web server log and answer questions with a pipeline: the busiest hour, the most common errors, the top visitors.', 'Linux project: analyse a web server log']
    ]
  },
  {
    slug: 'networking', added: '2026-10-25', name: 'Networking', level: 'Beginner', search: 'Learn networking for DevOps',
    summary: 'How machines find and talk to each other, from IP addresses and ports to DNS, HTTP, TLS, routing and firewalls, and how to find out why they cannot.',
    topics: [
      ['what-a-network-is', 'What a network is', 'Hosts, links, packets, switches and routers. Building a small network of your own to practise on.', 'Computer networking basics'],
      ['ip-addresses', 'IP addresses', 'IPv4 and IPv6 addresses, private and public ranges, network interfaces and the loopback, and an interface\'s MTU.', 'IP addresses: IPv4, IPv6, private and public'],
      ['subnets-and-cidr', 'Subnets and CIDR', 'Network masks, CIDR notation, and working out which addresses are on the same network.', 'Subnets and CIDR notation explained'],
      ['the-layers-model', 'The layers model', 'The layers a packet passes through, what each one adds, and which tools work at which layer.', 'The network layers model (OSI and TCP/IP)'],
      ['ports-and-sockets', 'Ports and sockets', 'How one machine runs many services, well-known ports, seeing what is listening, and testing a port with nc.', 'Network ports and sockets'],
      ['tcp', 'TCP', 'Connections, the three-way handshake, connection states, and what reliable delivery costs.', 'TCP and the three-way handshake'],
      ['udp', 'UDP', 'Sending without a connection, where that is the right choice, and what can go missing.', 'UDP: how it works and when to use it'],
      ['dns-basics', 'DNS basics', 'How a name becomes an address, /etc/hosts and resolvers, record types, caching and TTLs, and following a lookup with dig.', 'How DNS works'],
      ['http', 'HTTP', 'Requests and responses, methods, status codes, headers, redirects and JSON, and watching a request with curl.', 'How HTTP works: requests, methods and status codes'],
      ['serve-a-website-with-nginx', 'Serve a website with nginx', 'Installing nginx, serving a site, server blocks, and reading its logs.', 'Serve a website with nginx'],
      ['tls-and-https', 'TLS and HTTPS', 'What TLS protects, certificates and the chain of trust, inspecting a site\'s certificate, and signing one with your own CA.', 'How TLS and HTTPS work'],
      ['routing-and-gateways', 'Routing and gateways', 'The routing table, the default gateway, and following a packet\'s path with traceroute.', 'Routing, default gateways and traceroute'],
      ['nat', 'NAT', 'How private addresses reach the internet, and forwarding a port from outside to a machine inside.', 'NAT and port forwarding'],
      ['firewall-basics', 'Firewall basics', 'Packet filtering, rules and chains, default policies, and locking down a server without locking yourself out.', 'Linux firewall basics'],
      ['tcpdump', 'tcpdump', 'Capturing packets, filtering them, and reading what was actually sent.', 'Capturing packets with tcpdump'],
      ['ssh-and-tunnels', 'SSH and tunnels', 'Keys, the SSH config file, jump hosts, and forwarding ports through SSH.', 'SSH keys, config and tunnels'],
      ['reverse-proxy-and-load-balancing', 'Reverse proxy and load balancing', 'Putting nginx in front of applications and spreading requests across several of them.', 'Reverse proxy and load balancing with nginx'],
      ['the-debugging-playbook', 'The debugging playbook', 'A layer-by-layer method for working out why a service cannot be reached.', 'Troubleshooting network problems, layer by layer']
    ],
    projects: [
      ['project-fix-the-broken-server', 'Fix the broken server', 'A lab network where a web service cannot be reached. Find each fault, layer by layer, and fix it.', 'Networking project: fix a broken web server'],
      ['project-build-a-small-web-stack', 'Build a small web stack', 'Two application servers behind an nginx load balancer with HTTPS from your own certificate authority and a name in the lab\'s DNS.', 'Networking project: nginx load balancer with HTTPS'],
      ['project-diagnose-traffic-with-tcpdump', 'Diagnose traffic with tcpdump', 'Capture a request from start to finish and explain every packet: the TCP handshake, TLS and HTTP.', 'Networking project: diagnose traffic with tcpdump']
    ]
  },
  {
    slug: 'shell-scripting', added: '2026-10-25', name: 'Shell scripting', level: 'Intermediate', search: 'Learn Bash shell scripting',
    summary: 'Turning the commands from the Linux skill into Bash scripts that run unattended, handle bad input and fail safely.',
    topics: [
      ['shell-scripting-basics', 'Shell scripting basics', 'What a script is, the shebang line, making a script executable, and running it.', 'Bash scripting basics'],
      ['shell-variables', 'Shell variables', 'Setting and reading variables, quoting, command substitution, and environment variables in scripts.', 'Bash variables and quoting'],
      ['conditionals', 'Conditionals', 'if, test and [[ ]], comparing strings, numbers and files, and case statements.', 'Bash if statements and case'],
      ['loops', 'Loops', 'for, while and until loops, reading a file line by line, and break and continue.', 'Bash loops: for, while and until'],
      ['parameter-expansion', 'Parameter expansion', 'Default values, trimming and replacing parts of a value, and lengths, without calling other programs.', 'Bash parameter expansion'],
      ['arguments-and-input', 'Arguments and input', 'Positional arguments, shift, options with getopts, reading input, and a usage message.', 'Bash script arguments and getopts'],
      ['functions', 'Functions', 'Defining functions, arguments and return values, local variables, and splitting a script into parts.', 'Bash functions'],
      ['arrays', 'Arrays', 'Indexed and associative arrays, looping over them, and keeping file names with spaces intact.', 'Bash arrays'],
      ['arithmetic-and-strings', 'Arithmetic and strings', 'Integer maths with $(( )), comparing and formatting numbers and text, and printf.', 'Bash arithmetic and string handling'],
      ['exit-codes-and-errors', 'Exit codes and errors', 'Exit statuses, checking them, && and ||, writing errors to stderr, and exiting with the right code.', 'Bash exit codes and error handling'],
      ['robust-scripts', 'Robust scripts', 'set -euo pipefail, traps and clean-up, temporary files, lock files, and scripts that are safe to run twice.', 'Robust Bash scripts: set -euo pipefail and traps'],
      ['debugging', 'Debugging', 'Tracing a script with set -x, ShellCheck, and finding the line where it goes wrong.', 'Debugging Bash scripts with set -x and ShellCheck'],
      ['real-world-scripts', 'Real-world scripts', 'Patterns from scripts that run in production: logging, configuration files, dry runs, and running from cron.', 'Bash scripts for production']
    ],
    projects: [
      ['project-automate-a-backup', 'Automate a backup', 'Write a script that archives a directory, keeps the last seven copies, runs every night and logs what it did.', 'Bash project: automate a nightly backup'],
      ['project-health-check', 'Health check', 'A script that checks disk, memory, load and services, writes a report, and exits with a status a monitor can act on.', 'Bash project: a server health check script'],
      ['project-bulk-users-from-a-file', 'Bulk users from a file', 'Create and update user accounts from a CSV file, with validation, a dry-run mode and a summary, safe to run again.', 'Bash project: create users from a CSV file'],
      ['project-deploy-script', 'Deploy script', 'Release a new version of a site into a timestamped directory, switch to it with a symlink, check it, and roll back on failure.', 'Bash project: a deploy script with rollback']
    ]
  }
];

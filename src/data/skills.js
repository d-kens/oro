/* Paipa skills: each skill is a set of topics learned in order, ending in projects.
   Read by the Skills page and the skill pages (skills/<slug>.html).
   A topic is [slug, title, the one line it covers]; a project is [slug, title, what you build]. Every project runs on your own computer.
   Each topic and project has a lesson in lessons/<skill>/<slug>.md; the build stops if one is missing. */
export const SKILLS = [
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
      ['networking-basics', 'Networking basics', 'IP addresses, ports, DNS, and checking a connection with ping, curl, ss and dig.'],
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
      ['project-read-the-logs', 'Read the logs', 'Take a web server log and answer questions with a pipeline: the busiest hour, the most common errors, the top visitors.'],
      ['project-automate-a-backup', 'Automate a backup', 'Write a script that archives a directory, keeps the last seven copies, runs every night and logs what it did.']
    ]
  }
];

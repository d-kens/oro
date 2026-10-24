On Linux you rarely download an installer from a website. Software comes as **packages** from your distribution, and a **package manager** fetches them, installs them, and keeps them up to date. On Ubuntu and Debian that is `apt`. Every server you build starts with a few `apt` commands, and keeping it patched is a job that never ends.

By the end you can install and remove software with `apt`, explain where packages come from, keep a machine up to date, see which files a package put on disk, and find out where a command lives.

## Packages and package managers

A **package** is an archive that holds a program, the files it needs, and a description: its name, its version, and the other packages it **depends** on. On Debian and Ubuntu, packages are `.deb` files.

The package manager does the work you would otherwise do by hand. It downloads the package, installs the packages it depends on first, puts every file in the right place, and records what it did, so it can remove the same files later.

There are two layers on Ubuntu:

- `dpkg` is the low-level tool. It installs a single `.deb` file and keeps the list of what is installed. It does not download anything or resolve dependencies.
- `apt` sits on top. It knows where to download packages from, works out dependencies, and then calls `dpkg`.

You will use `apt` almost all the time and `dpkg` for questions about what is already installed.

Other distributions use other package managers. The ideas are the same; the commands differ:

| Task | Ubuntu, Debian | Red Hat, Rocky, Amazon Linux | Alpine |
| --- | --- | --- | --- |
| Refresh the package list | `apt update` | `dnf check-update` | `apk update` |
| Install | `apt install nginx` | `dnf install nginx` | `apk add nginx` |
| Remove | `apt remove nginx` | `dnf remove nginx` | `apk del nginx` |
| Upgrade everything | `apt upgrade` | `dnf upgrade` | `apk upgrade` |
| Search | `apt search nginx` | `dnf search nginx` | `apk search nginx` |
| List a package's files | `dpkg -L nginx` | `rpm -ql nginx` | `apk info -L nginx` |

Older Red Hat systems use `yum` instead of `dnf`. The options are nearly the same, and on newer systems `yum` is just another name for `dnf`.

## Repositories and apt update

Packages come from **repositories**: web servers that hold thousands of packages and an index of what they contain. Your machine's list of repositories lives in `/etc/apt/sources.list.d/`. On Ubuntu 24.04 the main file looks like this, without its comments:

```bash
$ grep -v '^#' /etc/apt/sources.list.d/ubuntu.sources
Types: deb
URIs: http://archive.ubuntu.com/ubuntu/
Suites: noble noble-updates noble-backports
Components: main universe restricted multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
...
```

`noble` is the code name of Ubuntu 24.04. `noble-updates` and `noble-security` hold fixes released after the version came out. **Components** split the repository by who maintains the software: `main` is supported by Ubuntu, `universe` by the community. `Signed-By` names the key used to check that packages really come from Ubuntu and were not changed on the way.

Your machine keeps a local copy of each repository's index. `apt update` downloads a fresh copy of that index. It installs nothing:

```bash
$ apt update
Get:1 http://security.ubuntu.com/ubuntu noble-security InRelease [126 kB]
Get:2 http://archive.ubuntu.com/ubuntu noble InRelease [256 kB]
...
Fetched 35.6 MB in 9s (3956 kB/s)
Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
4 packages can be upgraded. Run 'apt list --upgradable' to see them.
```

A new Docker container starts with no index at all. That is why `apt install` fails in one until you run `apt update` first:

```bash
$ apt install -y tree
E: Unable to locate package tree
```

Software that is not in Ubuntu's own repositories, such as a database vendor's latest release, comes from a **third-party repository**. You add a file to `/etc/apt/sources.list.d/` and the vendor's signing key, usually to `/etc/apt/keyrings/`, then run `apt update`. Follow the vendor's own instructions for this, and only add repositories you trust: anything in them can be installed as root.

## Installing and removing

To look before you install, search the index and read a package's description:

```bash
$ apt search --names-only '^jq$'
Sorting... Done
Full Text Search... Done
jq/noble-updates,noble-security 1.7.1-3ubuntu0.24.04.2 amd64
  lightweight and flexible command-line JSON processor
$ apt show jq
Package: jq
Version: 1.7.1-3ubuntu0.24.04.2
...
Depends: libc6 (>= 2.38), libjq1 (= 1.7.1-3ubuntu0.24.04.2)
```

Install it. `apt` lists what it will do and asks for confirmation; `-y` answers yes for you, which you need in scripts:

```bash
$ apt install -y jq
The following additional packages will be installed:
  libjq1 libonig5
The following NEW packages will be installed:
  jq libjq1 libonig5
0 upgraded, 3 newly installed, 0 to remove and 4 not upgraded.
...
Setting up jq (1.7.1-3ubuntu0.24.04.2) ...
```

You asked for one package and got three: `jq` depends on two libraries, so `apt` installed them too. Installing something that is already there changes nothing:

```bash
$ apt install -y jq
jq is already the newest version (1.7.1-3ubuntu0.24.04.2).
```

To remove software:

| Command | What it does |
| --- | --- |
| `apt remove jq` | Removes the program and keeps its config files |
| `apt purge jq` | Removes the program and its config files |
| `apt autoremove` | Removes dependencies nothing needs any more, such as `libjq1` above |

On a server, prefer `apt-get` over `apt` in scripts. They do the same job, but `apt-get` keeps its output stable between versions, while `apt` is designed for people and warns you if you pipe its output.

## Keeping a machine up to date

Two commands sound alike and do very different things:

- `apt update` refreshes the **list** of available packages. Nothing on the machine changes.
- `apt upgrade` installs newer **versions** of the packages you already have.

Always run them in that order. `upgrade` only knows about versions that the last `update` saw.

```bash
$ apt update
$ apt list --upgradable
Listing... Done
libsystemd0/noble-updates,noble-security 255.4-1ubuntu8.18 amd64 [upgradable from: 255.4-1ubuntu8.17]
zlib1g/noble-updates,noble-security 1:1.3.dfsg-3.1ubuntu2.3 amd64 [upgradable from: 1:1.3.dfsg-3.1ubuntu2.2]
...
$ apt upgrade -y
```

`apt upgrade` never removes a package. If an upgrade needs a package removed or replaced, it holds that package back. `apt full-upgrade` is allowed to remove packages to complete the upgrade, so read its list before you agree.

Some upgrades only take effect after a restart: a new kernel needs a reboot, and a new library needs the services that use it restarted. On Ubuntu, the file `/var/run/reboot-required` exists when a reboot is needed.

Most security fixes arrive in `noble-security`. Ubuntu servers install those automatically through the `unattended-upgrades` package, which runs on a schedule. The *Running things on a schedule* topic shows how that kind of job works.

## What a package put where

`dpkg` answers questions about installed packages. `dpkg -L` lists every file a package installed:

```bash
$ dpkg -L jq
/.
/usr
/usr/bin
/usr/bin/jq
/usr/share/doc/jq
/usr/share/doc/jq/README.md
/usr/share/man/man1/jq.1.gz
...
```

This is how you find a package's config file or its program. `dpkg -S` works the other way round and tells you which package a file came from:

```bash
$ dpkg -S /usr/bin/jq
jq: /usr/bin/jq
$ dpkg -l jq
||/ Name   Version                Architecture Description
+++-======-======================-============-===========================================
ii  jq     1.7.1-3ubuntu0.24.04.2 amd64        lightweight and flexible command-line JSON processor
```

`ii` at the start of the `dpkg -l` line means the package is installed and working.

To find where a command lives, use `which` or `command -v`:

```bash
$ which jq
/usr/bin/jq
$ command -v jq
/usr/bin/jq
$ command -v cd
cd
$ which cd
$
```

Both print nothing and return an error if the command is not found, so they are a quick test of whether something is installed. `command -v` is built into the shell, works on every system, and also knows about built-in commands like `cd`, which `which` does not. Use `command -v` in scripts. The *Your shell* topic explains how the shell searches for commands.

## Tasks

Do these in your Linux shell.

### Task 1: Install a package and find its files

Install the `tree` package. Then find out which directory its program is in, and how many files and directories the package installed. Count the lines with `wc -l`.

<details>
<summary>Check your work</summary>

```bash
$ apt update
$ apt install -y tree
$ command -v tree
/usr/bin/tree
$ dpkg -L tree
/.
/usr
/usr/bin
/usr/bin/tree
...
$ dpkg -L tree | wc -l
14
```

Your count may differ slightly between versions. If `apt install` says `Unable to locate package tree`, you skipped `apt update`.

</details>

### Task 2: Remove it cleanly

Remove `tree` and check that the command is gone. Then install `jq`, remove it, and use `apt autoremove` to clear out the libraries it pulled in. Before you run `autoremove`, predict which packages it will remove.

<details>
<summary>Check your work</summary>

```bash
$ apt remove -y tree
Removing tree (2.1.1-2ubuntu3.24.04.2) ...
$ command -v tree || echo "not installed"
not installed
$ apt install -y jq
The following NEW packages will be installed:
  jq libjq1 libonig5
$ apt remove -y jq
$ apt autoremove -y
The following packages will be REMOVED:
  libjq1 libonig5
```

`autoremove` removes the two libraries that were installed only because `jq` needed them. If `command -v tree` still prints a path, the shell may be remembering the old location: run `hash -r`, or open a new shell, and try again.

</details>

## Quiz

**1. What is the difference between `apt update` and `apt upgrade`?**

<details>
<summary>Show answer</summary>

`apt update` downloads the latest list of packages from the repositories and changes nothing installed. `apt upgrade` installs newer versions of the installed packages, using the list from the last `update`. Run `update` first.

</details>

**2. You are on a server and the file `/etc/logrotate.d/rsyslog` looks unfamiliar. How do you find out which package installed it?**

<details>
<summary>Show answer</summary>

`dpkg -S /etc/logrotate.d/rsyslog`. It prints the package name before the colon, here `rsyslog: /etc/logrotate.d/rsyslog`. If it prints `no path found`, no package owns the file, so someone created it by hand.

</details>

**3. A colleague's Dockerfile has `RUN apt install -y curl` and the build fails with `Unable to locate package curl`. What is wrong?**

<details>
<summary>Show answer</summary>

The image has no package index. It needs `apt update` first, in the same step: `RUN apt-get update && apt-get install -y curl`.

</details>

**4. You need to install `htop` on a Rocky Linux server and on an Alpine container. Which commands do you use?**

<details>
<summary>Show answer</summary>

`dnf install htop` on Rocky Linux, and `apk add htop` on Alpine. Both need root, so use `sudo` if you are not root.

</details>

Almost every server you will touch as a cloud engineer runs Linux. Web servers, databases, containers and the machines that build your code all run it, and you work on them by typing commands. This topic gets a Linux shell running on your own computer and takes you through your first commands.

By the end you can open a shell, read the prompt, run a command, find out what a command does, and save its output to a file.

## Linux, the kernel and distributions

**Linux** is strictly the name of a *kernel*: the program that starts first when a machine boots and that controls the hardware. It decides which program gets the CPU next, hands out memory, and talks to disks and network cards. Programs never touch the hardware themselves; they ask the kernel.

A kernel on its own is not much use, so it is packaged with everything else you need: a shell, the basic commands, a package manager, and system services. That package is a **distribution**, or *distro*. The ones you will meet most often:

| Distribution | Where you meet it |
| --- | --- |
| Ubuntu | The most common choice on cloud servers and in tutorials |
| Debian | The base Ubuntu is built on; popular for container images |
| Amazon Linux, Red Hat Enterprise Linux, Rocky Linux | Company servers and AWS |
| Alpine | Very small container images |

The commands in this skill work the same on all of them. Where they differ, mostly in how software is installed, the topic says so.

Servers run Linux because it is free to run on as many machines as you like, it is stable enough to run for years without a restart, and it can be run with no screen at all and managed over the network.

## The shell

You do not talk to the kernel directly. You type into a **shell**, a program that reads a line of text, works out which program you mean, runs it, and shows you what it printed. The shell on most Linux machines is **Bash**. A **terminal** is the window the shell runs in.

When the shell is ready for a command it shows a **prompt**, for example:

```text
sam@web-01:~$
```

Read it from left to right:

- `sam` is the user you are logged in as.
- `web-01` is the name of the machine. This matters when you have several machines open.
- `~` is the directory you are in. `~` is short for your home directory.
- `$` means you are an ordinary user. A `#` instead means you are `root`, the administrator, and every command can change anything on the machine.

In this skill, a line starting with `$` is a command for you to type, without the `$`. Lines without it are what the command prints.

## Get a Linux shell

You need a Linux shell to follow along. Pick the option for your computer.

**Any computer with Docker.** This starts a fresh Ubuntu machine in a container and puts you in its shell. When you type `exit` the container is deleted, so nothing you do can break your computer.

```bash
$ docker run -it --rm --hostname lab ubuntu:24.04
```

**Windows.** Install the Windows Subsystem for Linux. Open PowerShell as an administrator, run the command below, restart, then open *Ubuntu* from the Start menu.

```bash
wsl --install
```

**macOS.** The macOS Terminal runs a shell, and most commands look the same, but macOS is not Linux and some commands behave differently. Use Docker, or run an Ubuntu virtual machine with Multipass:

```bash
$ brew install --cask multipass
$ multipass launch --name lab
$ multipass shell lab
```

**Linux.** Open the Terminal app. You are already there.

The Docker container logs you in as `root`, so your prompt ends in `#`. That is fine for practice. On a real server you log in as an ordinary user and only become root when you need to, which the *Users and permissions* topic covers.

## Your first commands

A command is a program name, sometimes followed by **options** that change what it does and **arguments** that tell it what to work on. Separate each part with spaces.

```bash
$ whoami
root
$ hostname
lab
$ date
Sat Oct 24 09:12:31 UTC 2026
$ pwd
/
```

- `whoami` prints the user you are logged in as.
- `hostname` prints the machine's name.
- `date` prints the date and time.
- `pwd` (*print working directory*) prints the directory you are in. The Docker container starts you in `/`, the top of the filesystem. Your home directory, `/root`, is where you keep your own files; the *Moving around* topic explains both.

`echo` prints its arguments back. It sounds useless, but you will use it constantly in scripts:

```bash
$ echo Hello from Linux
Hello from Linux
```

`uname` describes the kernel. With the `-r` option it prints only the kernel's version, and with `-a` it prints everything:

```bash
$ uname -r
6.12.54-linuxkit
$ uname -a
Linux lab 6.12.54-linuxkit #1 SMP Tue Nov  4 21:21:47 UTC 2025 aarch64 aarch64 aarch64 GNU/Linux
```

Your version numbers will differ. To see which distribution you are on, read the file that describes it:

```bash
$ cat /etc/os-release
PRETTY_NAME="Ubuntu 24.04.5 LTS"
NAME="Ubuntu"
VERSION_ID="24.04"
...
```

Linux is **case-sensitive**: `Date` and `date` are different names, and only `date` is a command. If you mistype a command, the shell tells you:

```bash
$ Date
bash: Date: command not found
```

Some keys that save a lot of typing:

| Key | What it does |
| --- | --- |
| <kbd>↑</kbd> and <kbd>↓</kbd> | Step back and forward through commands you ran before |
| <kbd>Tab</kbd> | Complete a command or file name you have started typing |
| <kbd>Ctrl</kbd>+<kbd>C</kbd> | Stop the command that is running |
| <kbd>Ctrl</kbd>+<kbd>L</kbd> | Clear the screen (the same as `clear`) |

`history` lists the commands you have run in this shell.

## Getting help

Nobody remembers every option. Two ways to look them up:

```bash
$ date --help
Usage: date [OPTION]... [+FORMAT]
Display date and time in the given FORMAT.
...
```

Most commands accept `--help` and print a short summary. For the full manual, use `man`:

```bash
$ man date
```

`man` opens the manual in a reader: use the arrow keys or <kbd>Space</kbd> to scroll, <kbd>/</kbd> to search, and <kbd>q</kbd> to quit. The Docker Ubuntu image leaves out manual pages to stay small. If `man` says the system has been minimized, run `unminimize` and answer `y`, or use `--help`.

## Saving output to a file

Everything a command prints normally goes to your screen. The `>` sign sends it to a file instead:

```bash
$ date > today.txt
$ cat today.txt
Sat Oct 24 09:15:02 UTC 2026
```

`>` creates the file, or **replaces** what was in it if it exists. To add to the end of a file instead, use `>>`:

```bash
$ echo "Machine: $(hostname)" >> today.txt
$ cat today.txt
Sat Oct 24 09:15:02 UTC 2026
Machine: lab
```

`$(hostname)` runs `hostname` and puts what it printed into the line. The *Pipes and text* topic goes much further with this.

## Tasks

Do these in your Linux shell.

### Task 1: Describe the machine

Create a file called `machine.txt` in your home directory that holds, in this order, one line each:

1. the user you are logged in as
2. the machine's name
3. the kernel version
4. the `PRETTY_NAME` line from `/etc/os-release`

Use `>` for the first line and `>>` for the rest. You can find a single line of a file with `grep PRETTY_NAME /etc/os-release`; the *Finding things* topic explains `grep`.

<details>
<summary>Check your work</summary>

```bash
$ cd ~
$ whoami > machine.txt
$ hostname >> machine.txt
$ uname -r >> machine.txt
$ grep PRETTY_NAME /etc/os-release >> machine.txt
$ cat machine.txt
root
lab
6.12.54-linuxkit
PRETTY_NAME="Ubuntu 24.04.5 LTS"
```

You should see four lines. If you see only the last one, you used `>` where you meant `>>`, and each command replaced the file.

</details>

### Task 2: Find an option yourself

Using `date --help` or `man date`, find out how to make `date` print only the year, as four digits. Then add a line to `machine.txt` that reads `Year: ` followed by the year.

<details>
<summary>Check your work</summary>

`date` takes a format that starts with `+`, and `%Y` is the four-digit year:

```bash
$ date +%Y
2026
$ echo "Year: $(date +%Y)" >> machine.txt
$ tail -n 1 machine.txt
Year: 2026
```

</details>

## Quiz

**1. Your prompt reads `admin@db-02:/var/log#`. Which machine are you on, which directory are you in, and what should make you careful?**

<details>
<summary>Show answer</summary>

You are on `db-02`, in `/var/log`. The `#` means you are root, so any command can change or delete anything on the machine. Read every command twice before you press Enter.

</details>

**2. What is the difference between Linux and Ubuntu?**

<details>
<summary>Show answer</summary>

Linux is the kernel. Ubuntu is a distribution: the Linux kernel packaged with a shell, commands, a package manager and services.

</details>

**3. You run `hostname > info.txt` and then `whoami > info.txt`. What is in `info.txt`?**

<details>
<summary>Show answer</summary>

Only the user name. `>` replaces the contents of the file each time. To keep both lines, the second command needed `>>`.

</details>

**4. You log in to a server you have never seen before. Which three commands tell you who you are, where you are, and which distribution it runs?**

<details>
<summary>Show answer</summary>

`whoami`, `pwd` and `cat /etc/os-release`. `hostname` is worth adding too, to be sure you are on the machine you meant.

</details>

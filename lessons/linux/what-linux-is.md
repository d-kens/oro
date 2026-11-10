## What Linux is

**Linux** is a free, open-source operating system core (kernel) created by Linus Torvalds in 1991.

A **kernel** is the core of an operating system. It controls the computer's hardware: the processor (CPU), the memory, the disks, the network card and other devices. It acts as a bridge between the hardware and the applications you run: when an application needs to read a file or send data over the network, it asks the kernel, and the kernel does it.

## Linux distributions

On its own, the kernel gives you no way to type commands, install software or open a window. To get an operating system you can use, the kernel is combined with:

- **system libraries**: shared code that programs need in order to run
- **a shell**, for typing commands
- **a package manager**, for installing and updating software
- on desktop distros, **a graphical interface** with windows and menus, and apps such as a web browser

A **Linux distribution**, or *distro*, is the Linux kernel packaged together with system libraries, a shell, a package manager and other programs into a complete operating system that you can install and use.

Companies and communities build distros for different uses, from small devices and laptops to cloud servers and supercomputers. The ones you are most likely to meet:

| Distribution | What it is used for |
| --- | --- |
| Ubuntu | The most common distro on cloud servers. Also a popular desktop for beginners. Made by Canonical and built on Debian. |
| Debian | A stable, community-run distro. Ubuntu and many container images are built on it. |
| Red Hat Enterprise Linux (RHEL) | Company servers. You pay Red Hat for support and updates. |
| Rocky Linux | A free copy of RHEL, for people who want RHEL without paying for it. |
| Fedora | Desktops for developers. Gets new software first and is where Red Hat tests what later goes into RHEL. |
| Amazon Linux | Servers on AWS. Made by Amazon. |
| Alpine | Container images. It is very small, a few megabytes. |
| Linux Mint | Desktops for people moving from Windows. Built on Ubuntu. |
| Arch Linux | Experienced users who want to choose and set up every part of the system themselves. |
| Kali Linux | Security testing. Comes with hundreds of tools for testing systems for weaknesses. Built on Debian. |

The commands in this skill work the same on all of them. Where they differ, mostly in how software is installed, the topic says so. This skill uses Ubuntu.

## What a shell is

A **shell** is a text-based user interface that lets you interact with the operating system. It accepts commands you type on the keyboard and passes them to the kernel to run.

A **graphical user interface (GUI)** uses windows, icons and menus. A shell uses a **command-line interface (CLI)** instead, where you type instructions to move between folders, run programs and manage files.

Servers usually have no GUI at all, so the shell is how you work on them.

To use a shell on your own computer, you open a **terminal**: an app that gives you a window where you type commands and see what they print. The shell runs inside it. On macOS the app is called Terminal, on Windows it is Windows Terminal, and on Linux it is usually called Terminal too.

There are several shells. The common ones:

| Shell | What it is |
| --- | --- |
| Bash (Bourne Again Shell) | The default on most Linux distros, and the one this skill uses. |
| Zsh (Z Shell) | The default on macOS, also available on Linux. Works much like Bash and adds better completion, themes and spelling correction. |
| Fish (Friendly Interactive Shell) | Built to be easy to use: it suggests commands as you type and colours them. Its scripts do not run in Bash. |
| sh (Bourne Shell) | The original Unix shell. It is small, and scripts written for it run on every Linux distro and on macOS. |

## Get a Linux shell

You need a Linux shell to follow along. Pick the option for your computer.

In this skill, a line starting with `$` is a command for you to type, without the `$`. Lines without it are what the command prints.

**Windows.** Install the Windows Subsystem for Linux (WSL), which runs Linux inside Windows. Open PowerShell as an administrator and run this command. It is a PowerShell command, so it has no `$` in front of it:

```powershell
wsl --install
```

Restart your computer, then open *Ubuntu* from the Start menu.

**macOS.** The macOS Terminal also runs a shell, and many commands look the same, but macOS is not Linux and some commands behave differently. Run Ubuntu in a **virtual machine** instead: a complete computer simulated in software, running inside your Mac. Multipass sets one up for you. Install it with [Homebrew](https://brew.sh), a tool for installing software on macOS, then start the virtual machine and open its shell:

```bash
$ brew install --cask multipass
$ multipass launch --name lab
$ multipass shell lab
```

**Linux.** Open the Terminal app. You are already there.

**Any computer with Docker.** [Docker](https://www.docker.com) runs programs in **containers**: small, isolated Linux systems that start in seconds. This command starts a fresh Ubuntu container and puts you in its shell. When you type `exit`, the container is deleted, so nothing you do can break your computer.

```bash
$ docker run -it --rm --hostname lab ubuntu:24.04
```

## Reading the prompt

When the shell is ready for a command it shows a **prompt**. Yours looks something like this:

```text
sam@web-01:~$
```

Read it from left to right:

- `sam` is the user you are logged in as.
- `web-01` is the name of the machine. This matters when you have several machines open.
- `~` is the **directory** (folder) you are in. `~` is short for your **home directory**, the folder where you keep your own files.
- `$` means you are an ordinary user. A `#` instead means you are `root`, the administrator, and every command can change anything on the machine.

The Docker container logs you in as `root`, so your prompt ends in `#`. That is fine for practice. On a real server you log in as an ordinary user and only become root when you need to, which the *Users and permissions* topic covers.

## Your first commands

A command is a program name, sometimes followed by **options** that change what it does and **arguments** that tell it what to work on. Separate each part with spaces. In `uname -r`, `uname` is the program and `-r` is an option. In `echo Hello`, `Hello` is an argument.

Start with four commands that need neither. The output below is from the Docker container; yours will show your own user and machine.

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
- `pwd` (*print working directory*) prints the directory you are in. The Docker container starts you in `/`, the top of the **file system**: all the directories and files on the machine. Your home directory is `/root`. The topic *The Linux file system* explains both.

`echo` prints its arguments back to you:

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

Your version numbers will differ. To see which distribution you are on, use `cat`, which prints what is in a file. The file `/etc/os-release` describes the distribution:

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

There are two ways to look up a command's options:

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

`$(hostname)` runs `hostname` and puts what it printed into the line. The *Pipes and text processing* topic goes much further with this.

## Tasks

Do these in your Linux shell.

### Task 1: Describe the machine

Create a file called `machine.txt` in your home directory. First run `cd ~` to go there (`cd` changes directory; the topic *The Linux file system* covers it). The file should hold, in this order, one line each:

1. the user you are logged in as
2. the machine's name
3. the kernel version
4. the `PRETTY_NAME` line from `/etc/os-release`

Use `>` for the first line and `>>` for the rest. You can find a single line of a file with `grep PRETTY_NAME /etc/os-release`; the *Searching for files and text* topic explains `grep`.

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

Linux is the kernel. Ubuntu is a distribution: the Linux kernel combined with a shell, commands, a package manager and other software.

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

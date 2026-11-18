## The Linux file system

The Linux **file system** is how Linux organises, stores and manages files and directories (folders).

## Key characteristics

- **A single root directory, `/`.** Everything starts from one top-level directory called the root directory. Unlike Windows, which uses separate drive letters such as `C:\` and `D:\`, Linux organises its directory structure as one tree. Disks, partitions and USB drives are mounted at specific directories within this tree.
- **Everything is a file.** Linux follows the philosophy that many system resources can be accessed through file-like interfaces. For example, devices are represented in `/dev`, such as `/dev/sda`, while information about the kernel and running processes is exposed through `/proc`, such as `/proc/cpuinfo`. This allows you to interact with many system resources using familiar file operations and commands.
- **The Filesystem Hierarchy Standard (FHS).** The FHS defines the standard directory structure and specifies where different types of files should be located. Most distributions follow it, so the layout looks much the same on each one.

## Core directory structure

1. **`/` (root)**
   - The top-level directory from which the entire Linux directory hierarchy begins.
   - Every file and directory exists somewhere under it.

2. **`/bin` and `/sbin`**
   - Contain essential commands.
   - `/bin`: essential commands available to all users, such as `ls`, `cp` and `cat`.
   - `/sbin`: essential system administration commands, such as `useradd` and `reboot`.
   - On modern distributions such as Ubuntu, these directories are typically symbolic links to `/usr/bin` and `/usr/sbin`, respectively.

3. **`/boot`**
   - Contains files required to boot the system, including the Linux kernel and boot loader files.

4. **`/dev`**
   - Contains device files representing hardware and virtual devices, such as disks (`/dev/sda`) and terminals (`/dev/tty`).

5. **`/etc`**
   - Contains system-wide configuration files for the operating system and installed applications.

6. **`/home`**
   - Contains the personal directories of regular users.
   - For example, `/home/sam` is Sam's home directory.

7. **`/root`**
   - The home directory of the `root` user (the system administrator).
   - `/` is the top of the whole file system, `/root` is the root user's home, and `/home` holds the home directories of everyone else.

8. **`/lib` and `/lib64`**
   - Contain essential shared libraries and kernel modules required by system programs.
   - On modern distributions, these may be symbolic links into `/usr`.

9. **`/media`**
   - Commonly used as a mount point for removable storage devices, such as USB drives and external disks.

10. **`/mnt`**
   - A conventional mount point for temporarily mounting file systems, often manually by an administrator.

11. **`/opt`**
   - Used for installing optional or third-party software packages that are typically self-contained.

12. **`/proc`**
   - A virtual file system that exposes information about running processes and the kernel.
   - For example, `/proc/cpuinfo` provides information about the system's CPU.

13. **`/sys`**
   - A virtual file system that exposes information about hardware devices, device drivers and the kernel through the sysfs interface.
   - Both `/proc` and `/sys` are virtual, but `/proc` is mainly about processes and the kernel, while `/sys` is about devices and drivers.

14. **`/tmp`**
   - Stores temporary files created by applications and users.
   - Its contents may be deleted when the system restarts.

15. **`/usr`**
   - Contains user-space applications, utilities, libraries, documentation and other shared resources.
   - Examples include `/usr/bin`, `/usr/lib` and `/usr/share`.

16. **`/var`**
   - Contains variable data that changes during system operation, such as logs (`/var/log`), application caches (`/var/cache`) and application data.
   - When a service fails, its logs in `/var/log` are usually the first place to look.

## The working directory and pwd

The **working directory** is the directory you are in right now. Commands that work on files look there unless you give them a different location.

`pwd` (*print working directory*) prints it:

```bash
$ pwd
/root
```

Your **home directory** is the directory that belongs to you, where you keep your own files: `/home/<your name>` for an ordinary user and `/root` for `root`, as in the list above. When you log in, you start there. The Docker container from the first topic is an exception: it starts you in `/`.

The prompt shows your home directory as `~`, and usually shows where you are, so you rarely need `pwd`. It is still useful when the prompt is short or when a script needs to know.

## Absolute and relative paths

A **path** is the location of a file or directory in the tree, written as directory names separated by `/`. There are two kinds.

An **absolute path** starts with `/` and gives the full route from the root directory. `/var/log/apt` means: start at the root, go into `var`, then `log`, then `apt`. It points to the same place wherever you are.

A **relative path** does not start with `/`. It starts from your working directory. If you are in `/var`, then `log/apt` means `/var/log/apt`. From anywhere else it means something else, or nothing at all.

Three short names help you write relative paths:

| Name | What it means |
| --- | --- |
| `.` | The directory you are in |
| `..` | The **parent directory**: the directory one level up |
| `~` | Your home directory |

You can chain them:

- From `/usr/bin`, `../lib` means up to `/usr`, then into `lib`, which is `/usr/lib`.
- From `/usr/bin`, `../../etc` means up two levels to `/`, then into `etc`, which is `/etc`.

The shell turns `~` into your home directory before the command runs:

```bash
$ echo ~
/root
```

Use an absolute path when you want to be sure, such as in scripts and in instructions for other people. Use a relative path when you are working nearby and want to type less.

## Changing directory with cd

`cd` (*change directory*) moves you to another directory. Give it a path, absolute or relative:

```bash
$ cd /var/log
$ pwd
/var/log
$ cd ..
$ pwd
/var
$ cd log
$ pwd
/var/log
```

`cd` prints nothing when it works, and the prompt changes to show where you are now.

Shortcuts you will use often:

| Command | Where it takes you |
| --- | --- |
| `cd` or `cd ~` | Your home directory |
| `cd ..` | One level up |
| `cd -` | The directory you were in before this one |
| `cd /` | The root directory |

`cd -` prints the directory it takes you to, and running it twice brings you back. Use it to switch between two places, such as a config directory and a log directory:

```bash
$ cd /etc
$ cd /var/log
$ cd -
/etc
$ cd -
/var/log
```

## Common cd errors

1. **Wrong case**
   - Paths are **case-sensitive**: `/var` exists, `/Var` does not.

   ```bash
   $ cd /Var
   bash: cd: /Var: No such file or directory
   ```

   - `No such file or directory` means nothing exists at that path. Check the spelling and the case.

2. **A file instead of a directory**

   ```bash
   $ cd /etc/hostname
   bash: cd: /etc/hostname: Not a directory
   ```

   - `Not a directory` means the path exists, but it is a file. You can read a file, but you cannot move into it.

3. **A relative path from the wrong place**
   - This is the most common mistake. `cd root` means "the `root` directory inside where I am", so it only works from `/`. Use the absolute path, `/root`, instead:

   ```bash
   $ cd /tmp
   $ cd root
   bash: cd: root: No such file or directory
   $ cd /root
   $ pwd
   /root
   ```

4. **Spaces in names**
   - The shell splits a command into parts at each space, so `cd my files` looks like two paths. Put the path in quotes, or put a backslash (`\`) before each space:

   ```bash
   $ cd my files
   bash: cd: too many arguments
   $ cd "my files"
   $ cd ../my\ files
   ```

The <kbd>Tab</kbd> key prevents most of these mistakes:

- Type the start of a name and press <kbd>Tab</kbd>. If only one name matches, the shell completes it and adds any backslashes for you.
- Press <kbd>Tab</kbd> twice to list the matches when there are several.
- If nothing happens, no name starting that way exists where you are looking.

## Tasks

Do these in your Linux shell.

### Task 1: Walk a small tree

Build a practice tree in your home directory. `mkdir -p` creates directories along with any parents they need; the *Creating, copying and deleting files* topic covers it properly.

```bash
$ cd ~
$ mkdir -p projects/shop/api projects/shop/web projects/notes
```

Now, using only **relative** paths and one `cd` at a time:

1. Go from your home directory into `projects/shop/api`.
2. Go from there into `projects/shop/web`.
3. Go from there into `projects/notes`.

Run `pwd` after each step.

<details>
<summary>Check your work</summary>

```bash
$ cd projects/shop/api
$ pwd
/root/projects/shop/api
$ cd ../web
$ pwd
/root/projects/shop/web
$ cd ../../notes
$ pwd
/root/projects/notes
```

`../web` goes up one level to `shop` and into `web`. `../../notes` goes up two levels to `projects` and into `notes`. If you got `No such file or directory`, count the levels again: each `..` climbs one.

</details>

### Task 2: Absolute paths and going back

From `projects/notes`, do the following, running `pwd` after each step:

1. Go to `/var/log` with an absolute path.
2. Go back to `projects/notes` without typing its name.
3. Go to your home directory with the shortest command you know.

<details>
<summary>Check your work</summary>

```bash
$ cd /var/log
$ pwd
/var/log
$ cd -
/root/projects/notes
$ pwd
/root/projects/notes
$ cd
$ pwd
/root
```

`cd -` returns to the previous directory and prints it. `cd` with nothing after it goes home. If you are logged in as an ordinary user, your paths start with `/home/<your name>` instead of `/root`.

</details>

## Quiz

**1. You are in `/home/sam/app/config`. Where does `cd ../../logs` take you?**

<details>
<summary>Show answer</summary>

To `/home/sam/logs`. The first `..` goes up to `/home/sam/app`, the second to `/home/sam`, and then `logs` goes into the directory of that name, if it exists.

</details>

**2. What is the difference between `cd etc` and `cd /etc`?**

<details>
<summary>Show answer</summary>

`cd /etc` is an absolute path and always goes to the `etc` directory at the root of the tree. `cd etc` is a relative path and looks for a directory called `etc` inside the directory you are in. It only reaches `/etc` if you are in `/`.

</details>

**3. You are on a server, reading logs in `/var/log/nginx`. You move to `/etc/nginx` to check a setting. How do you get back to the logs with the fewest keys?**

<details>
<summary>Show answer</summary>

`cd -`. It returns you to the previous directory, `/var/log/nginx`. Run it again to go back to `/etc/nginx`.

</details>

**4. `cd /etc/hosts` fails with `Not a directory`. What does that tell you?**

<details>
<summary>Show answer</summary>

That `/etc/hosts` exists, but it is a file, not a directory. You cannot move into a file. To see what it holds, read it, for example with `cat /etc/hosts`.

</details>

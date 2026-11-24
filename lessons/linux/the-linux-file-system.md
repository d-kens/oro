## The Linux file system

Unlike Windows, which uses drive letters like `C:\` and `D:\`, the Linux file system is organized as a single, unified hierarchical tree structure starting from a single root directory represented by a forward slash (`/`). Everything on a Linux system—including files, directories, hard drives, USB sticks, and even peripheral devices—lives somewhere under this root directory.

![The root directory, /, with the main directories directly under it: /bin, /boot, /dev, /etc, /home, /lib, /media, /mnt, /opt, /proc, /root, /run, /sbin, /srv, /sys, /tmp, /usr and /var](/images/linux/file-system-tree.png)

## Key Directories in the Linux Hierarchy

According to the Filesystem Hierarchy Standard (FHS), standard directories serve specific purposes across almost all Linux distributions:

1. **`/` (root)**
   - The topmost level of the entire file system. Every file and folder branches off here.
     - Every file's location can be written starting from `/`, such as `/etc/hosts`. The *Absolute and relative paths* section below explains how to read these.
     - `cd /` takes you to the top of the tree, and `ls /` lists the directories in this section.
     - You rarely create files directly in `/`. It holds the system directories below.

2. **`/bin`**
   - Basic commands that every user needs, such as `ls`, `cp` and `cat`. On most modern distributions, `/bin` is a link to `/usr/bin`.
     - When you type `ls`, the shell looks through the directories listed in your `PATH` variable, finds the `ls` program and runs it.
     - `which ls` shows where a command is stored.

3. **`/boot`**
   - Boot loader files, Linux kernel images, and RAM disks needed during the computer's startup process (`vmlinuz`, `grub`).

4. **`/dev`**
   - Device files. Linux treats hardware devices as files (e.g., hard drives like `/dev/sda`, terminals like `/dev/tty`).

5. **`/etc`**
   - System-wide configuration files (e.g., network settings, and the list of user accounts in `/etc/passwd`).

6. **`/home`**
   - Home directories for normal users (e.g., `/home/username`). Personal documents, downloads, and configs live here.
     - This is where you work every day. Your home directory is the folder inside `/home` with your username, such as `/home/sam`. Your own files, downloads and scripts go there.
     - You own everything in it, so you can change anything there without `sudo` (the command that runs another command with administrator rights).
     - When you open a terminal or log in, you start in your home directory, and `~` is a shortcut for it.
     - Many programs keep your personal settings here in files whose names start with a dot, such as `~/.bashrc`, which holds your shell settings. These files are hidden from a normal `ls`. Run `ls -a` in your home directory to see them.

7. **`/root`**
   - The home directory of the `root` user (the system administrator).
   - `/` is the top of the whole file system, `/root` is the root user's home, and `/home` holds the home directories of everyone else.
     - It keeps the root user's files apart from the home directories of regular users.
     - You only use it when you are working as the root user, for example after running `sudo -i`, which opens a shell as root.
     - Regular users cannot open it.
     - While you are working as root, `~` means `/root`, so a file you save to `~` ends up in `/root`, not in your own home.

8. **`/lib`**
   - Essential shared libraries and kernel modules needed by binaries in `/bin` and `/sbin`.

9. **`/media`**
   - Mount points for removable media like USB flash drives, external hard drives, and optical discs.

10. **`/mnt`**
   - Temporary mount points for administrators to attach secondary file systems manually.

11. **`/opt`**
   - Optional or third-party software packages installed outside the default package manager.

12. **`/proc`**
   - A virtual/pseudo-file system providing detailed information about running processes and kernel parameters in real-time.

13. **`/sbin`**
   - Essential system administration binaries meant for root use (e.g., `fdisk`, `iptables`, `reboot`).

14. **`/tmp`**
   - Temporary files created by the system or applications; typically cleared on reboot.

15. **`/usr`**
   - Secondary hierarchy for user-accessible read-only data, containing user binaries (`/usr/bin`), libraries, and documentation.

16. **`/var`**
   - Variable data files that constantly change, such as system logs (`/var/log`), mail spools, and web server files (`/var/www`).

## Core Concepts of the Linux File System

1. **Everything is a File**
   - In Linux, hardware devices, network sockets, and directories are all represented and interacted with as files or streams of bytes.

2. **Case Sensitivity**
   - Linux paths and filenames are strictly case-sensitive. `File.txt`, `file.txt`, and `FILE.TXT` are three completely different files.

3. **No File Extensions Required**
   - While extensions like `.txt` or `.sh` are common for human convenience or script execution, Linux determines file types based on file headers/magic numbers rather than extensions.

4. **Permissions & Ownership**
   - Every file and directory is bound to an owner, a group, and specific permission sets determining Read, Write, and Execute rights.

## The working directory and pwd

The **working directory** is the directory you are in right now. Commands that work on files look there unless you give them a different location.

`pwd` (*print working directory*) prints it:

```bash
$ pwd
/root
```

When you log in, your working directory is your home directory (`/home/<your name>`, or `/root` for `root`, as in points 6 and 7 above).

The Docker container from the first topic is an exception: it starts you in `/`, because `docker run` starts the shell without logging you in. Run `cd` to go to `/root`.

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
   - `/var` exists, `/Var` does not. Paths are case-sensitive, as covered in *Core Concepts* above.

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

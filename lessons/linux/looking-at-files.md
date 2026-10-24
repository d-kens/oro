Once you are in a directory, the next question is what is in it. On a server you ask that all the time: is the config file there, how big is the log, when did it last change, who owns it. `ls` answers all of these, if you know how to read what it prints.

By the end you can list a directory, show hidden files, sort a listing by size or time, and read every column of the long listing.

## Listing a directory

`ls` (*list*) prints the names in your working directory:

```bash
$ ls
app.conf  deploy.sh  logs  numbers.txt
```

Give it a path to list somewhere else, without moving there:

```bash
$ ls /var/log
alternatives.log  apt  bootstrap.log  btmp  dpkg.log  faillog  lastlog  wtmp
```

You can give it several paths at once, and directories and files can be mixed. If a name does not exist, `ls` says so:

```bash
$ ls nothere
ls: cannot access 'nothere': No such file or directory
```

The plain listing does not tell you which names are directories. On most machines `ls` uses colours for that, with directories in blue. When colours are missing, `-F` adds a marker after each name: `/` for a directory and `*` for a file you can run.

```bash
$ ls -F
app.conf  deploy.sh*  logs/  numbers.txt
```

Linux does not rely on file extensions. `app.conf` is a text file because of what is in it, not because of its name. A program can be called `deploy.sh` or just `deploy`.

## Hidden files

A name that starts with a dot is a **hidden file**, or *dotfile*. `ls` leaves them out unless you add `-a` (*all*):

```bash
$ ls -a
.  ..  .env  app.conf  deploy.sh  logs  numbers.txt
```

There is nothing secret about hidden files. The dot only keeps them out of the way. Programs use them for settings, such as `.bashrc` for the shell and `.ssh` for SSH keys, and projects use them for files like `.env` and `.gitignore`. When a setting seems to come from nowhere, a hidden file is often the reason.

`.` and `..` appear in every directory. They are the same `.` and `..` you used in paths: this directory and its parent.

## The long listing

`-l` (*long*) prints one line per file with the details:

```bash
$ ls -l
total 120
-rw-r--r-- 1 root root     10 Oct 20 08:00 app.conf
-rwxr-xr-x 1 root root     18 Oct 24 11:15 deploy.sh
drwxr-xr-x 2 root root   4096 Oct 24 11:15 logs
-rw-r--r-- 1 root root 108894 Oct 22 14:30 numbers.txt
```

Take the line for `deploy.sh` apart:

| Part | Example | What it tells you |
| --- | --- | --- |
| Type | `-` | `-` for a regular file, `d` for a directory, `l` for a link |
| Permissions | `rwxr-xr-x` | Who may read, write and run the file |
| Links | `1` | How many names point at this file |
| Owner | `root` | The user who owns the file |
| Group | `root` | The group the file belongs to |
| Size | `18` | The size in bytes |
| Modified | `Oct 24 11:15` | When the contents last changed |
| Name | `deploy.sh` | The file's name |

The **permissions** are nine letters in three groups of three: for the owner, for the group, and for everyone else. `r` is read, `w` is write, `x` is execute, and `-` means that right is missing. So `rwxr-xr-x` means the owner can do everything, and everyone else can read and run the file but not change it. The *Users and permissions* topic explains these properly.

The **modified time** shows the year instead of the time of day for files older than about six months, as in `Apr 22  2024`.

The size of a directory, usually `4096`, is the space its list of names takes up, not the size of what is inside. To find out how much a directory holds, use `du`, which the *Disks and space* topic covers. The `total` line at the top is the disk space used by the listed files, in blocks; you can ignore it.

Some entries are **links**: a name that points at another file or directory. They start with `l` and show where they point:

```bash
$ ls -l /bin
lrwxrwxrwx 1 root root 7 Apr 22  2024 /bin -> usr/bin
```

The *Links* topic covers these.

## Options that change the listing

Options can be combined behind one dash. `ls -la` is the same as `ls -l -a`.

| Option | What it does |
| --- | --- |
| `-l` | Long listing |
| `-a` | Include hidden files |
| `-h` | Sizes in K, M and G instead of bytes (use with `-l`) |
| `-t` | Newest first, by modified time |
| `-S` | Largest first |
| `-r` | Reverse the order |
| `-d` | List a directory itself, not what is in it |
| `-1` | One name per line |

`-h` (*human-readable*) makes sizes easy to compare at a glance:

```bash
$ ls -lh
total 120K
-rw-r--r-- 1 root root   10 Oct 20 08:00 app.conf
-rwxr-xr-x 1 root root   18 Oct 24 11:15 deploy.sh
drwxr-xr-x 2 root root 4.0K Oct 24 11:15 logs
-rw-r--r-- 1 root root 107K Oct 22 14:30 numbers.txt
```

`-t` puts the newest file at the top, which is how you find the log that is being written to right now. Add `-r` to put the newest at the bottom instead, close to your prompt:

```bash
$ ls -ltr
total 120
-rw-r--r-- 1 root root     10 Oct 20 08:00 app.conf
-rw-r--r-- 1 root root 108894 Oct 22 14:30 numbers.txt
drwxr-xr-x 2 root root   4096 Oct 24 11:15 logs
-rwxr-xr-x 1 root root     18 Oct 24 11:15 deploy.sh
```

`ls -l logs` lists what is inside `logs`. To see the details of the directory itself, add `-d`:

```bash
$ ls -ld logs
drwxr-xr-x 2 root root 4096 Oct 24 11:15 logs
```

## Listing some files, not all

You can name exactly the files you want details for:

```bash
$ ls -l /etc/hostname /etc/passwd
-rw-r--r-- 1 root root   4 Oct 24 11:15 /etc/hostname
-rw-r--r-- 1 root root 888 Sep 30 14:26 /etc/passwd
```

A `*` in a name matches any run of characters, so `*.txt` matches every name ending in `.txt`, and `app*` every name starting with `app`. The shell expands the pattern into the matching names before `ls` runs:

```bash
$ ls *.txt
numbers.txt
$ ls -l *.conf
-rw-r--r-- 1 root root 10 Oct 20 08:00 app.conf
```

`*` does not match hidden files. You will use these patterns again with `cp`, `mv` and `rm` in the *Creating and moving files* topic.

## Tasks

Do these in your Linux shell. Start by creating a practice directory. `touch -d` sets a file's modified time, so the files have different ages:

```bash
$ mkdir -p ~/look/archive && cd ~/look
$ seq 1 50000 > big.log
$ seq 1 100 > small.log
$ echo "debug=false" > .settings
$ printf '#!/bin/sh\necho ok\n' > check.sh && chmod +x check.sh
$ touch -d "2026-10-01 09:00" big.log
$ touch -d "2026-10-23 17:45" small.log
```

### Task 1: Biggest and newest

Using `ls` only, find out:

1. which file in `~/look` is the largest, with its size in human-readable form
2. which `.log` file was modified most recently

<details>
<summary>Check your work</summary>

```bash
$ ls -lhS
total 296K
-rw-r--r-- 1 root root 283K Oct  1 09:00 big.log
drwxr-xr-x 2 root root 4.0K Oct 24 11:16 archive
-rw-r--r-- 1 root root  292 Oct 23 17:45 small.log
-rwxr-xr-x 1 root root   18 Oct 24 11:16 check.sh
$ ls -lt *.log
-rw-r--r-- 1 root root    292 Oct 23 17:45 small.log
-rw-r--r-- 1 root root 288894 Oct  1 09:00 big.log
```

`big.log` is the largest at 283K, and `small.log` is the newest log. The size of `archive` is the directory's own entry, not its contents. If `ls -lt` puts `archive` or `check.sh` at the top, you listed everything; `*.log` limits it to the logs.

</details>

### Task 2: Read the long listing

Run `ls -la ~/look` and answer from the output alone:

1. Which entry is hidden?
2. Which entries are directories?
3. Which file can be run, and how can you tell?

<details>
<summary>Check your work</summary>

```bash
$ ls -la ~/look
total 308
drwxr-xr-x 3 root root   4096 Oct 24 11:16 .
drwx------ 1 root root   4096 Oct 24 11:16 ..
-rw-r--r-- 1 root root     12 Oct 24 11:16 .settings
drwxr-xr-x 2 root root   4096 Oct 24 11:16 archive
-rw-r--r-- 1 root root 288894 Oct  1 09:00 big.log
-rwxr-xr-x 1 root root     18 Oct 24 11:16 check.sh
-rw-r--r-- 1 root root    292 Oct 23 17:45 small.log
```

1. `.settings` is hidden: its name starts with a dot. Without `-a` it does not appear.
2. `archive`, `.` and `..` are directories: their lines start with `d`.
3. `check.sh` can be run: its permissions contain `x`. The `.sh` ending is a habit, not what makes it runnable.

</details>

## Quiz

**1. What does the `d` at the start of `drwxr-xr-x` mean, and what would `-` or `l` mean instead?**

<details>
<summary>Show answer</summary>

`d` means the entry is a directory. `-` means a regular file, and `l` means a link that points somewhere else.

</details>

**2. You are on a server and the disk is filling up. You suspect a log in `/var/log/app`. Which command shows the largest files there first, with readable sizes?**

<details>
<summary>Show answer</summary>

`ls -lhS /var/log/app`. `-l` gives the details, `-h` shows sizes as K, M and G, and `-S` sorts largest first. For whole directories you need `du`, from the *Disks and space* topic.

</details>

**3. A tool reads its settings from a file in your home directory, but `ls ~` does not show one. Why might that be?**

<details>
<summary>Show answer</summary>

The file is probably hidden, with a name starting with a dot, such as `~/.toolrc`. Run `ls -a ~` to see hidden files.

</details>

**4. A service is writing to one of twenty log files in a directory, and you want to see which one. What do you run?**

<details>
<summary>Show answer</summary>

`ls -lt` in that directory. The file being written to has the newest modified time, so it is at the top. `ls -ltr` puts it at the bottom instead, just above your prompt.

</details>

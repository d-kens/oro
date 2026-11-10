## The Linux file system

A **file** is a named piece of data, such as a document, a program or a log.

A **directory** is a container that holds files and other directories. Windows and macOS call it a folder. A directory inside another one is a *subdirectory*.

A **file system** is the way the files and directories on a machine are organised and stored.

Linux keeps everything in a single tree of directories. The tree starts at the **root directory**, written as `/`, and every file and directory on the machine sits somewhere below it.

Windows gives each disk its own letter, such as `C:` and `D:`. Linux has no drive letters. A second disk is attached to a directory inside the tree, such as `/data`, and you open it like any other directory. The *Disks and disk space* topic covers this.

Run `ls /` to see the top of the tree:

```bash
$ ls /
bin   dev  home  media  opt   root  sbin  sys  usr
boot  etc  lib   mnt    proc  run   srv   tmp  var
```

## What each directory holds

The layout follows the **Filesystem Hierarchy Standard (FHS)**, so it is much the same on every distribution. Once you know where logs and config files live on one server, you know where they live on the next.

The directories you will use most:

| Directory | What lives there |
| --- | --- |
| `/etc` | Configuration files for the system and for installed software |
| `/home` | One home directory per ordinary user, such as `/home/sam` |
| `/root` | The home directory of the `root` user |
| `/var` | Files that change while the machine runs. Logs are in `/var/log` |
| `/tmp` | Temporary files that anyone can write, which may be deleted on restart |
| `/usr` | Installed programs. Most commands you run, such as `ls`, are in `/usr/bin` |
| `/opt` | Software installed outside the package manager |

The rest are used by the system, and you will open them less often:

| Directory | What lives there |
| --- | --- |
| `/bin`, `/sbin`, `/lib` | Commands and the libraries they need. On Ubuntu these point to the same directories under `/usr` |
| `/boot` | The kernel and the files needed to start the machine |
| `/dev` | Devices, such as disks, shown as files |
| `/proc`, `/sys` | Information about running processes and hardware, created by the kernel. They are not stored on disk |
| `/run` | Data that running programs keep until the next restart |
| `/media`, `/mnt` | Where USB drives and other disks are attached |
| `/srv` | Data the machine serves, such as website files. Often empty |

`/etc/hostname` is a file that holds the machine's name. Print it with `cat`:

```bash
$ cat /etc/hostname
lab
```

## The working directory and pwd

The **working directory** is the directory you are in right now. Commands that work on files look there unless you give them a different location.

`pwd` (*print working directory*) prints it:

```bash
$ pwd
/root
```

Your **home directory** is the directory that belongs to you, where you keep your own files. When you log in, you start there.

- For an ordinary user called `sam`, it is `/home/sam`.
- For `root`, it is `/root`.

The Docker container from the first topic is an exception: it starts you in `/`.

The prompt shows your home directory as `~`, and usually shows where you are, so you rarely need `pwd`. It is still useful when the prompt is short or when a script needs to know.

The shell keeps the path of your home directory in a variable called `HOME`. A **variable** is a name that holds a value. `echo` prints it:

```bash
$ echo $HOME
/root
```

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
| `cd` | Your home directory |
| `cd ~` | Your home directory |
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

Paths are **case-sensitive**: `/var` exists, `/Var` does not. The shell tells you when a path is wrong:

```bash
$ cd /Var
bash: cd: /Var: No such file or directory
$ cd /etc/hostname
bash: cd: /etc/hostname: Not a directory
```

- `No such file or directory` means nothing exists at that path.
- `Not a directory` means the path exists, but it is a file. You can read a file, but you cannot move into it.

The most common mistake is using a relative path from the wrong place. `cd root` means "the `root` directory inside where I am", so it only works from `/`:

```bash
$ cd /tmp
$ cd root
bash: cd: root: No such file or directory
$ cd /root
$ pwd
/root
```

Names with spaces also cause errors, because the shell splits a command into parts at each space. Put the path in quotes, or put a backslash (`\`) before each space:

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

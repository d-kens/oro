Every file on a Linux machine lives somewhere in one big tree of directories. Before you can read a log or change a config file, you have to get to it, and on a server there is no window to click through. You move around by typing.

By the end you can say where you are, describe any location as an absolute or a relative path, and get from one directory to another with `cd`.

## The directory tree

Linux has a single tree of directories. It starts at the **root directory**, written as a single `/`. Everything else sits below it: other directories, files, and even other disks, which are attached somewhere inside the tree rather than getting a letter of their own.

A **directory** is what other systems call a folder. A directory inside another one is a *subdirectory*. Run `ls /` to see what sits at the top of the tree:

```bash
$ ls /
bin   dev  home  media  opt   root  sbin  sys  usr
boot  etc  lib   mnt    proc  run   srv   tmp  var
```

You do not need to know all of these. The ones you will visit most:

| Directory | What lives there |
| --- | --- |
| `/etc` | Configuration files for the system and for installed software |
| `/home` | One home directory per ordinary user, such as `/home/sam` |
| `/root` | The home directory of the `root` user |
| `/var/log` | Log files written by the system and by services |
| `/tmp` | Temporary files that anyone can write and that may be deleted on restart |
| `/usr/bin` | Most of the commands you run, such as `ls` and `date` |
| `/opt` | Software installed outside the package manager |

The layout is much the same on every distribution, so once you know where logs and config files live on one server, you know where they live on the next.

## Where you are

The shell always has a **working directory**: the directory you are "in". Commands that work on files look there unless you tell them otherwise. `pwd` prints it:

```bash
$ pwd
/root
```

When you log in, you start in your **home directory**. For an ordinary user called `sam` that is `/home/sam`. For `root` it is `/root`. The Docker container from the first topic is an exception: it starts you in `/`, and `cd` on its own takes you home. The prompt shows your home directory as `~`, and most of the time it shows where you are, so you rarely need `pwd`. It is still useful when the prompt is short or when a script needs to know.

The shell keeps the path of your home directory in the variable `HOME`:

```bash
$ echo $HOME
/root
```

## Absolute and relative paths

A **path** names a place in the tree. There are two kinds.

An **absolute path** starts with `/` and spells out the full route from the root. `/var/log/apt` means: start at the root, go into `var`, then `log`, then `apt`. It means the same thing wherever you are.

A **relative path** does not start with `/`. The shell reads it starting from your working directory. If you are in `/var`, then `log/apt` means `/var/log/apt`. If you are somewhere else, it means something else, or nothing at all.

Three short names help you build relative paths:

| Name | Means |
| --- | --- |
| `.` | The directory you are in |
| `..` | The directory one level up, the *parent* |
| `~` | Your home directory |

You can chain them. From `/usr/bin`, the path `../lib` means "up to `/usr`, then into `lib`", which is `/usr/lib`. `../../etc` means "up two levels to `/`, then into `etc`".

The name `~` is turned into your home directory by the shell before the command runs:

```bash
$ echo ~
/root
```

Use an absolute path when you want to be sure, for example in scripts and in instructions you write for other people. Use a relative path when you are working nearby and want to type less.

## Moving with cd

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

`cd` prints nothing when it works. The prompt changes to show where you are now.

Some shortcuts worth knowing:

| Command | Where it takes you |
| --- | --- |
| `cd` | Your home directory |
| `cd ~` | Your home directory |
| `cd ..` | One level up |
| `cd -` | The directory you were in before this one |
| `cd /` | The root directory |

`cd -` prints the directory it takes you to, and running it twice brings you back. It is handy when you are switching between two places, such as a config directory and a log directory:

```bash
$ cd /etc
$ cd /var/log
$ cd -
/etc
$ cd -
/var/log
```

## When cd fails

Paths are case-sensitive, like commands. `/var` exists, `/Var` does not. The shell tells you when a path is wrong:

```bash
$ cd /Var
bash: cd: /Var: No such file or directory
$ cd /etc/hostname
bash: cd: /etc/hostname: Not a directory
```

The second error means the path exists, but it is a file, not a directory. You read files; you do not move into them.

The most common mistake is a relative path used from the wrong place. `cd root` only works when you are in `/`, because it means "the `root` directory inside where I am". From anywhere else it fails:

```bash
$ cd /tmp
$ cd root
bash: cd: root: No such file or directory
$ cd /root
$ pwd
/root
```

Spaces in names also trip people up, because the shell splits a command on spaces. Put the path in quotes, or put a backslash before each space:

```bash
$ cd my files
bash: cd: too many arguments
$ cd "my files"
$ cd ../my\ files
```

The <kbd>Tab</kbd> key avoids most of these problems. Type the start of a directory name and press <kbd>Tab</kbd>; the shell completes it if there is only one match, adding the backslashes for you. Press <kbd>Tab</kbd> twice to list the matches when there are several. If nothing happens, the name you started does not exist where you are looking.

## Tasks

Do these in your Linux shell.

### Task 1: Walk a small tree

Build a practice tree in your home directory. `mkdir -p` creates directories along with any parents they need; the *Creating and moving files* topic covers it properly.

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

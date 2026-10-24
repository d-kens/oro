Linux was built for many people sharing one machine, and servers still work that way. Every file has an owner, every running program runs as some user, and a short set of permissions decides who can read a file, change it or run it. When a command fails with `Permission denied`, the answer is almost always in this topic.

By the end you can create users and groups, read the permissions in a long listing, change them with `chmod` in both of its forms, change a file's owner with `chown`, and run a single command as root with `sudo`.

## Users and groups

Every user has a name and a number, the **user ID** or *UID*. The kernel only cares about the number; the name is for you. `id` shows who you are and which groups you belong to:

```bash
$ id
uid=0(root) gid=0(root) groups=0(root)
```

**root** always has UID 0 and can do anything. Everyone else is an ordinary user, limited by permissions.

A **group** is a named set of users. Groups let you give several people the same access without listing each one: you give the access to the group, then add people to it.

Create a user called `sam`. `-m` makes a home directory and `-s` sets the login shell:

```bash
$ useradd -m -s /bin/bash sam
$ id sam
uid=1001(sam) gid=1001(sam) groups=1001(sam)
```

The Ubuntu image already has a user called `ubuntu` with UID 1000, so `sam` gets 1001. Each new user also gets a group of the same name. Users are stored one per line in `/etc/passwd`:

```bash
$ grep sam /etc/passwd
sam:x:1001:1001::/home/sam:/bin/bash
```

The fields are the name, a placeholder for the password, the UID, the main group's ID, a comment, the home directory and the shell. Passwords themselves are stored, scrambled, in `/etc/shadow`, which only root can read. Set one with `passwd sam`.

On Debian and Ubuntu you will also meet `adduser`, a friendlier command that asks questions as it goes. `useradd` works the same on every distribution.

Now create a group and add `sam` to it:

```bash
$ groupadd devs
$ usermod -aG devs sam
$ id sam
uid=1001(sam) gid=1001(sam) groups=1001(sam),1002(devs)
```

`-aG` means *append to these groups*. Without the `-a`, `usermod -G` replaces all of the user's extra groups with the ones you list, which can silently remove someone's access.

## Switching user with su

`su` (*substitute user*) starts a shell as another user. With `-` it starts a fresh login, so you land in that user's home directory with their settings. As root you are not asked for a password.

```bash
$ su - sam
sam@lab:~$ whoami
sam
sam@lab:~$ pwd
/home/sam
sam@lab:~$ exit
logout
```

The prompt ends in `$` again, because `sam` is an ordinary user. `exit` takes you back to root. A user's group membership is read when they log in, so after you add someone to a group they need to log in again, or run a new `su -`, before it takes effect.

## Reading permissions

The long listing from `ls -l` shows permissions in the first column:

```bash
$ ls -l /etc/passwd /etc/shadow
-rw-r--r-- 1 root root   964 Oct 24 11:19 /etc/passwd
-rw-r----- 1 root shadow 553 Oct 24 11:19 /etc/shadow
```

Read `-rw-r-----` in four parts:

| Part | In the example | Meaning |
| --- | --- | --- |
| Type | `-` | A file; `d` is a directory, `l` a link |
| User (owner) | `rw-` | The owner, `root`, can read and write |
| Group | `r--` | Members of the group `shadow` can read |
| Others | `---` | Everyone else can do nothing |

Linux checks only one set: if you are the owner, it uses the owner's; if you are in the group, the group's; otherwise the others'.

The three letters mean slightly different things for files and directories:

| Letter | On a file | On a directory |
| --- | --- | --- |
| `r` read | See what is in the file | List the names inside |
| `w` write | Change the file | Create, rename and delete files inside |
| `x` execute | Run it as a program | Enter it with `cd` and reach files inside |

Root's home directory is `drwx------`, so other users cannot even look inside:

```bash
$ su - sam -c 'ls /root'
ls: cannot open directory '/root': Permission denied
```

`su - sam -c '…'` runs one command as `sam` and comes straight back.

## Changing permissions with chmod

Only a file's owner and root can change its permissions. `chmod` takes the new permissions in one of two forms.

The **symbolic** form names who, an operator and the permissions. Who is `u` (user, the owner), `g` (group), `o` (others) or `a` (all three). The operator is `+` to add, `-` to remove or `=` to set exactly.

```bash
$ echo 'echo hello' > hello.sh
$ ls -l hello.sh
-rw-r--r-- 1 root root 11 Oct 24 11:19 hello.sh
$ chmod u+x hello.sh
$ ls -l hello.sh
-rwxr--r-- 1 root root 11 Oct 24 11:19 hello.sh
$ chmod go-r hello.sh
$ ls -l hello.sh
-rwx------ 1 root root 11 Oct 24 11:19 hello.sh
```

The **octal** form gives all three sets as one number each. Add up `r` = 4, `w` = 2 and `x` = 1:

| Number | Letters | Common use |
| --- | --- | --- |
| `755` | `rwxr-xr-x` | Programs and directories everyone can use |
| `644` | `rw-r--r--` | Ordinary files everyone can read |
| `700` | `rwx------` | Private scripts and directories |
| `640` | `rw-r-----` | Config files the owner edits and a group reads |
| `600` | `rw-------` | Secrets, such as private keys |

```bash
$ chmod 640 hello.sh
$ ls -l hello.sh
-rw-r----- 1 root root 11 Oct 24 11:19 hello.sh
```

Use the symbolic form to change one thing and leave the rest alone, and the octal form to set everything at once. `chmod -R` changes a whole directory tree; be careful with it.

## Changing owners with chown

`chown` changes a file's owner, and with `owner:group` the group as well. `chgrp` changes only the group. Only root can give a file away:

```bash
$ touch /tmp/app.log
$ chown sam:devs /tmp/app.log
$ ls -l /tmp/app.log
-rw-r--r-- 1 sam devs 0 Oct 24 11:34 /tmp/app.log
$ su - sam -c 'chown root /tmp/app.log'
chown: changing ownership of '/tmp/app.log': Operation not permitted
```

`sam` owns the file now, but still cannot hand it to someone else.

`chown -R sam:devs /srv/app` changes a directory and everything in it.

## Running a command as root with sudo

On a real server you log in as yourself and become root only for the commands that need it. `sudo` runs one command as root, after asking for *your* password. It also records who ran what, so a team can see who changed the machine.

The Docker image does not include `sudo`, so install it, give `sam` a password, and try it:

```bash
$ apt update && apt install -y sudo
$ passwd sam
$ su - sam
sam@lab:~$ sudo whoami
[sudo] password for sam:
sam is not in the sudoers file.
```

`sudo` only works for users it has been told to trust. On Ubuntu that means members of the group `sudo`; on Red Hat and Amazon Linux the group is called `wheel`. Back as root, add `sam` to the group and try again:

```bash
$ usermod -aG sudo sam
$ su - sam
sam@lab:~$ sudo whoami
[sudo] password for sam:
root
```

`sudo -l` lists what you are allowed to run. Use `sudo` for the one command that needs root, such as `sudo nano /etc/hosts`, rather than staying logged in as root.

## Tasks

Do these in your Linux shell as root.

### Task 1: A shared directory

Create the users `sam`, `alex` and `jo`, and a group `devs` that contains `sam` and `alex` but not `jo`. Create `/srv/team`, owned by root and the group `devs`, that group members can fully use and nobody else can enter. Then check it: `sam` writes a file there, `alex` reads it, and `jo` is refused.

<details>
<summary>Check your work</summary>

```bash
$ useradd -m -s /bin/bash sam
$ useradd -m -s /bin/bash alex
$ useradd -m -s /bin/bash jo
$ groupadd devs
$ usermod -aG devs sam
$ usermod -aG devs alex
$ mkdir /srv/team
$ chown root:devs /srv/team
$ chmod 770 /srv/team
$ ls -ld /srv/team
drwxrwx--- 2 root devs 4096 Oct 24 11:34 /srv/team
$ su - sam -c 'echo plan > /srv/team/notes.txt'
$ su - alex -c 'cat /srv/team/notes.txt'
plan
$ su - jo -c 'ls /srv/team'
ls: cannot open directory '/srv/team': Permission denied
```

`770` gives the owner and the group `rwx` and others nothing. If `sam` gets `Permission denied`, check `id sam` for `devs`. A common mistake is `usermod -G` without `-a`, which replaces the user's groups instead of adding to them.

</details>

### Task 2: Make a script runnable, then private

As `sam`, create `hello.sh` in the home directory containing the line `echo hello from $(whoami)`. Try to run it with `./hello.sh`, then make it runnable for the owner only, using the symbolic form. Then use the octal form to set it to `rwxr-x---`. Which number is that?

<details>
<summary>Check your work</summary>

```bash
$ su - sam
sam@lab:~$ echo 'echo hello from $(whoami)' > hello.sh
sam@lab:~$ ./hello.sh
-bash: ./hello.sh: Permission denied
sam@lab:~$ chmod u+x hello.sh
sam@lab:~$ ./hello.sh
hello from sam
sam@lab:~$ chmod 750 hello.sh
sam@lab:~$ ls -l hello.sh
-rwxr-x--- 1 sam sam 26 Oct 24 11:34 hello.sh
```

`rwx` is 4+2+1 = 7, `r-x` is 4+1 = 5 and `---` is 0, so the number is `750`. New files are not executable, which is why the first run fails. Use single quotes around the `echo` line; with double quotes, `$(whoami)` runs straight away and the file would say `root`.

</details>

## Quiz

**1. You are on web-01 as `sam`. `ls -l deploy.sh` shows `-rw-r--r-- 1 sam devs`, and `./deploy.sh` says `Permission denied`. Why, and how do you fix it?**

<details>
<summary>Show answer</summary>

Nobody has execute permission on the file, so it cannot be run as a program. `sam` owns it, so `sam` can fix it with `chmod u+x deploy.sh`, or `chmod 744 deploy.sh`.

</details>

**2. What does `chmod 640 app.conf` give the owner, the group and everyone else?**

<details>
<summary>Show answer</summary>

`rw-r-----`. The owner can read and write (6), the group can read (4), and others get nothing (0).

</details>

**3. You ran `usermod -G docker sam` to let `sam` use Docker. Now `sam` can no longer use `sudo`. What happened?**

<details>
<summary>Show answer</summary>

Without `-a`, `-G` replaces `sam`'s extra groups with only `docker`, so `sam` was removed from `sudo`. Add the group back with `usermod -aG sudo sam`, and always use `-aG` to add a group.

</details>

**4. Why log in as an ordinary user and use `sudo`, rather than working as root all the time?**

<details>
<summary>Show answer</summary>

Mistakes as an ordinary user are limited by permissions, so a slip cannot wipe the system. `sudo` makes you choose to use root for a single command, asks for your password, and records who ran what.

</details>

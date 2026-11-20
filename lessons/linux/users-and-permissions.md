## Users and user IDs

A **user** is an account on a Linux machine. Every file has a user that owns it, and every running program runs as some user. Linux was built for many people sharing one machine, and servers still work that way.

Every user has a name and a number, the **user ID** or *UID*. The kernel only cares about the number; the name is for you. `id` shows who you are and which groups you belong to:

```bash
$ id
uid=0(root) gid=0(root) groups=0(root)
```

- **root** always has UID 0 and can do anything.
- Everyone else is an ordinary user, limited by permissions.
- When a command fails with `Permission denied`, the answer is almost always in this topic.

## Creating users with useradd

`useradd` creates a user. Create one called `sam`:

```bash
$ useradd -m -s /bin/bash sam
$ id sam
uid=1001(sam) gid=1001(sam) groups=1001(sam)
```

- `-m` makes a home directory, `/home/sam`.
- `-s` sets the **login shell**, the shell the user gets when they log in.
- The Ubuntu image already has a user called `ubuntu` with UID 1000, so `sam` gets 1001.
- Each new user also gets a group of the same name.

Users are stored one per line in `/etc/passwd`:

```bash
$ grep sam /etc/passwd
sam:x:1001:1001::/home/sam:/bin/bash
```

The fields, separated by `:`, are:

1. the name
2. a placeholder for the password (`x`)
3. the UID
4. the ID of the user's main group
5. a comment, empty here
6. the home directory
7. the shell

Passwords themselves are stored, scrambled, in `/etc/shadow`, which only root can read. Set one with `passwd sam`.

On Debian and Ubuntu you will also meet `adduser`, a friendlier command that asks questions as it goes. `useradd` works the same on every distribution.

## Groups

A **group** is a named set of users. Groups let you give several people the same access without listing each one: you give the access to the group, then add people to it.

Create a group and add `sam` to it:

```bash
$ groupadd devs
$ usermod -aG devs sam
$ id sam
uid=1001(sam) gid=1001(sam) groups=1001(sam),1002(devs)
```

- `groupadd` creates a group.
- `usermod` changes an existing user.
- `-aG` means *append to these groups*. Without the `-a`, `usermod -G` replaces all of the user's extra groups with the ones you list, which can silently remove someone's access.

## Switching user with su

`su` (*substitute user*) starts a shell as another user:

```bash
$ su - sam
sam@lab:~$ whoami
sam
sam@lab:~$ pwd
/home/sam
sam@lab:~$ exit
logout
```

- With `-`, it starts a fresh login, so you land in that user's home directory with their settings.
- As root you are not asked for a password.
- The prompt ends in `$` again, because `sam` is an ordinary user. `exit` takes you back to root.
- `su - sam -c '…'` runs one command as `sam` and comes straight back.

A user's groups are read when they log in. After you add someone to a group, they need to log in again, or run a new `su -`, before it takes effect.

## Reading permissions

**Permissions** decide who can read a file, change it or run it. The long listing from `ls -l` shows them in the first column:

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

Linux checks only one of the three sets:

- If you are the owner, it uses the owner's set.
- Otherwise, if you are in the file's group, it uses the group's set.
- Otherwise it uses the others' set.

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

## Changing permissions with chmod

`chmod` (*change mode*) changes a file's permissions. Only the file's owner and root can use it. It takes the new permissions in one of two forms.

The **symbolic form** is written as who, an operator, and the permissions:

- Who is `u` (user, the owner), `g` (group), `o` (others) or `a` (all three).
- The operator is `+` to add, `-` to remove, or `=` to set exactly.
- `u+x` means "give the owner execute". `go-r` means "take read away from the group and others".

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

The **octal form** gives each of the three sets as one digit. Add up `r` = 4, `w` = 2 and `x` = 1, so `rwx` is 7, `rw-` is 6 and `r-x` is 5:

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

Which form to use:

- The symbolic form changes one thing and leaves the rest alone.
- The octal form sets everything at once.
- `chmod -R` changes a whole directory tree. Be careful with it.

## Changing owners with chown

`chown` (*change owner*) changes a file's owner, and with `owner:group` the group as well. `chgrp` changes only the group. Only root can give a file to another user:

```bash
$ touch /tmp/app.log
$ chown sam:devs /tmp/app.log
$ ls -l /tmp/app.log
-rw-r--r-- 1 sam devs 0 Oct 24 11:34 /tmp/app.log
$ su - sam -c 'chown root /tmp/app.log'
chown: changing ownership of '/tmp/app.log': Operation not permitted
```

- `sam` owns the file now, but still cannot hand it to someone else.
- `chown -R sam:devs /srv/app` changes a directory and everything in it.

## Running a command as root with sudo

`sudo` (*superuser do*) runs one command as root, after asking for *your* password.

- On a real server you log in as yourself and become root only for the commands that need it.
- `sudo` records who ran what, so a team can see who changed the machine.

The Docker image does not include `sudo`, so install it, give `sam` a password, and try it:

```bash
$ apt update && apt install -y sudo
$ passwd sam
$ su - sam
sam@lab:~$ sudo whoami
[sudo] password for sam:
sam is not in the sudoers file.
```

`sudo` only works for users it has been told to trust:

- On Ubuntu, that means members of the group `sudo`.
- On Red Hat and Amazon Linux, the group is called `wheel`.

Back as root, add `sam` to the group and try again:

```bash
$ usermod -aG sudo sam
$ su - sam
sam@lab:~$ sudo whoami
[sudo] password for sam:
root
```

- `sudo -l` lists what you are allowed to run.
- Use `sudo` for the one command that needs root, such as `sudo nano /etc/hosts`, rather than staying logged in as root.

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

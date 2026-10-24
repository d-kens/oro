A file can have more than one name. Linux has two ways to do this, hard links and symbolic links, and they behave very differently when the original is moved or deleted. You meet symbolic links all the time on servers: in system directories, in web server configuration, and in the way many teams deploy new versions of an application.

By the end you can tell what a link points at, create both kinds, predict what happens when the target goes away, and switch a link from one release to another safely.

## Inodes

On disk, a file has two parts. The **inode** holds everything about the file except its name: its size, owner, permissions, timestamps, and where its data lives. Each inode has a number that is unique within its filesystem. The name lives in the directory, which is just a list that pairs names with inode numbers.

`ls -i` shows the inode number in front of each name:

```bash
$ echo "hello" > notes.txt
$ ls -li notes.txt
352844 -rw-r--r-- 1 root root 6 Oct 24 11:15 notes.txt
```

Your inode number will differ. The `1` after the permissions is the **link count**: how many names point at this inode. `stat` shows the same details spelled out:

```bash
$ stat notes.txt
  File: notes.txt
  Size: 6         	Blocks: 8          IO Block: 4096   regular file
Device: 0,68	Inode: 352844      Links: 1
Access: (0644/-rw-r--r--)  Uid: (    0/    root)   Gid: (    0/    root)
...
```

A filesystem has a fixed number of inodes, set when it is created. `df -i` shows how many are used. A disk can fill up with millions of tiny files and refuse new ones while `df -h` still shows free space, because it has run out of inodes rather than bytes.

## Hard links

A **hard link** is a second name for the same inode. `ln` makes one. The first argument is the existing file and the second is the new name:

```bash
$ ln notes.txt notes-hard.txt
$ ls -li notes*
352844 -rw-r--r-- 2 root root 6 Oct 24 11:15 notes-hard.txt
352844 -rw-r--r-- 2 root root 6 Oct 24 11:15 notes.txt
```

Both names show the same inode number, and the link count is now 2. Neither name is the original; they are equal. A change made through one name shows up through the other, because there is only one file:

```bash
$ echo "second line" >> notes-hard.txt
$ cat notes.txt
hello
second line
```

`rm` removes a name, not a file. The data is freed only when the link count reaches zero and no program has the file open:

```bash
$ rm notes.txt
$ cat notes-hard.txt
hello
second line
```

Hard links have two limits. You cannot hard link a directory, and you cannot hard link across filesystems, because an inode number only means something on its own filesystem:

```bash
$ ln /root /root/dirlink
ln: /root: hard link not allowed for directory
$ ln notes-hard.txt /dev/shm/notes.txt
ln: failed to create hard link '/dev/shm/notes.txt' => 'notes-hard.txt': Invalid cross-device link
```

In daily work you rarely make hard links yourself. Backup tools use them to keep many snapshots without storing unchanged files twice.

## Symbolic links

A **symbolic link**, or **symlink**, is a small file of its own whose content is a path. When a program opens the symlink, the kernel follows the path and opens whatever is there. `ln -s` makes one, in the same order as `ln`: target first, then the link's name.

```bash
$ ln -s notes-hard.txt notes-link.txt
$ ls -li notes*
352844 -rw-r--r-- 1 root root 18 Oct 24 11:15 notes-hard.txt
352833 lrwxrwxrwx 1 root root 14 Oct 24 11:15 notes-link.txt -> notes-hard.txt
```

The symlink has its own inode. The `l` at the start of the permissions marks it as a link, and `->` shows where it points. Its size, 14, is the length of the path it holds. Its permissions are always `rwxrwxrwx` and mean nothing; the target's permissions are the ones that count.

`readlink` prints the path stored in the link. `readlink -f` follows every link in the chain and prints the full path at the end:

```bash
$ readlink notes-link.txt
notes-hard.txt
$ readlink -f notes-link.txt
/root/notes-hard.txt
```

Unlike hard links, symlinks can point at directories and at other filesystems.

A relative target is resolved **from the directory the link is in**, not from where you were when you made it. This catches everyone once:

```bash
$ mkdir conf enabled
$ echo "listen 80" > conf/site.conf
$ ln -s conf/site.conf enabled/site.conf
$ cat enabled/site.conf
cat: enabled/site.conf: No such file or directory
```

The link looks for `enabled/conf/site.conf`, which does not exist. The target should have been `../conf/site.conf`, or the absolute path `/root/conf/site.conf`.

| | Hard link | Symbolic link |
| --- | --- | --- |
| Made with | `ln target name` | `ln -s target name` |
| Points at | The inode | A path |
| Own inode | No | Yes |
| Works for directories | No | Yes |
| Across filesystems | No | Yes |
| If the target name is deleted | Still works | Breaks |

## When the target moves or goes away

A symlink only stores a path. It does not notice when the file at that path is renamed or deleted. The link stays, but now it points at nothing. This is a **dangling** or **broken** link:

```bash
$ mv notes-hard.txt moved.txt
$ ls -l notes-link.txt
lrwxrwxrwx 1 root root 14 Oct 24 11:15 notes-link.txt -> notes-hard.txt
$ cat notes-link.txt
cat: notes-link.txt: No such file or directory
```

The error is confusing, because `ls` clearly shows a file called `notes-link.txt`. When you see "No such file" for a name that exists, check whether it is a broken symlink. If a new file appears at the old path, the link works again and shows the new file.

`readlink -f` still prints a path for a broken link. `readlink -e` prints nothing and fails instead, so use `-e` in scripts that must know the target exists. To find every broken link under a directory:

```bash
$ find /root -xtype l
/root/notes-link.txt
/root/enabled/site.conf
```

The second one is the `enabled/site.conf` link from the previous section, which never worked.

`rm` on a symlink removes the link and leaves the target alone.

## Where you meet symlinks

**System directories.** On current Ubuntu, `/bin` and `/sbin` are links into `/usr`:

```bash
$ ls -l / | grep -- "->"
lrwxrwxrwx   1 root root    7 Apr 22  2024 bin -> usr/bin
lrwxrwxrwx   1 root root    7 Apr 22  2024 lib -> usr/lib
lrwxrwxrwx   1 root root    8 Apr 22  2024 sbin -> usr/sbin
```

**`/etc/alternatives`.** When several programs can do the same job, Debian and Ubuntu use a chain of links to pick one. `awk` is a link to `/etc/alternatives/awk`, which is a link to the program actually installed:

```bash
$ ls -l /usr/bin/awk /etc/alternatives/awk
lrwxrwxrwx 1 root root 13 Sep 30 14:25 /etc/alternatives/awk -> /usr/bin/mawk
lrwxrwxrwx 1 root root 21 Apr  8  2024 /usr/bin/awk -> /etc/alternatives/awk
$ readlink -f /usr/bin/awk
/usr/bin/mawk
```

The `update-alternatives` command changes the second link when you want a different program.

**Enabled configuration.** nginx on Debian and Ubuntu keeps every site's configuration in `/etc/nginx/sites-available/` and reads only `/etc/nginx/sites-enabled/`. Turning a site on means creating a link; turning it off means deleting the link, and the configuration file stays where it was:

```bash
$ ln -s /etc/nginx/sites-available/example.com /etc/nginx/sites-enabled/example.com
```

**Releases.** A common way to deploy is to unpack each version into its own directory and point a link called `current` at the one that should run. The service always starts from `current`, and going back to the previous version means changing one link:

```text
/srv/app/
├── current -> releases/release-2
└── releases/
    ├── release-1/
    └── release-2/
```

To repoint an existing link, use `ln -sfn`. `-f` replaces the link if it exists. `-n` matters when the link points at a directory: without it, `ln` follows `current` into the old release and creates the new link inside it, leaving `current` unchanged.

## Tasks

Do these in your Linux shell, in your home directory.

### Task 1: Hard or soft

Create `report.txt` containing `draft 1`. Make a hard link to it called `report-hard.txt` and a symlink to it called `report-link.txt`. Delete `report.txt`, and before running anything, predict what `cat` prints for each of the two links. Then create a new `report.txt` containing `draft 2` and predict again. Check with `ls -li`.

<details>
<summary>Check your work</summary>

```bash
$ echo "draft 1" > report.txt
$ ln report.txt report-hard.txt
$ ln -s report.txt report-link.txt
$ rm report.txt
$ cat report-hard.txt
draft 1
$ cat report-link.txt
cat: report-link.txt: No such file or directory
$ echo "draft 2" > report.txt
$ cat report-link.txt
draft 2
$ cat report-hard.txt
draft 1
$ ls -li report*
353028 -rw-r--r-- 1 root root  8 Oct 24 11:18 report-hard.txt
353030 lrwxrwxrwx 1 root root 10 Oct 24 11:18 report-link.txt -> report.txt
353031 -rw-r--r-- 1 root root  8 Oct 24 11:18 report.txt
```

The hard link kept the old inode, so it still holds `draft 1`. The symlink only knows the name `report.txt`, so it broke and then followed the new file. The new `report.txt` has a different inode number from `report-hard.txt`; your numbers will differ from these.

</details>

### Task 2: Switch a release

Build this layout under `~/app`, with a file called `VERSION` in each release that contains `version 1` or `version 2`:

```text
app/
├── current -> releases/release-1
└── releases/
    ├── release-1/VERSION
    └── release-2/VERSION
```

Check that `cat ~/app/current/VERSION` prints `version 1`. Then switch `current` to `release-2` and check again. Finally, use `readlink -f` to show the full path `current` resolves to.

<details>
<summary>Check your work</summary>

```bash
$ mkdir -p ~/app/releases/release-1 ~/app/releases/release-2
$ echo "version 1" > ~/app/releases/release-1/VERSION
$ echo "version 2" > ~/app/releases/release-2/VERSION
$ cd ~/app
$ ln -s releases/release-1 current
$ cat current/VERSION
version 1
$ ln -sfn releases/release-2 current
$ cat current/VERSION
version 2
$ readlink -f current
/root/app/releases/release-2
```

If `current/VERSION` still says `version 1`, you left out `-n`. `ln` followed `current` into `release-1` and created a link there instead. Look for it with `ls -l releases/release-1`, delete it, and run the command again with `-sfn`.

</details>

## Quiz

**1. `ls -li` shows two names with the same inode number and a link count of 2. What does that tell you?**

<details>
<summary>Show answer</summary>

They are hard links: two names for the same file. Changing it through either name changes both, and deleting one name leaves the file reachable through the other.

</details>

**2. You are on a server and `cat /etc/app/config.yml` says "No such file or directory", but `ls /etc/app` lists `config.yml`. What is the likely cause and how do you confirm it?**

<details>
<summary>Show answer</summary>

`config.yml` is a symlink whose target has been moved or deleted. `ls -l /etc/app/config.yml` shows the arrow and the path it points to, and `readlink -e /etc/app/config.yml` prints nothing because the target does not exist. Fix the target, or recreate the link with `ln -sfn` pointing at the right file.

</details>

**3. You run `ln -s config/app.conf /etc/app.conf` from your home directory, and the link does not work. Why?**

<details>
<summary>Show answer</summary>

A relative target is resolved from the directory the link lives in. The link in `/etc` looks for `/etc/config/app.conf`. Use an absolute target such as `/home/sam/config/app.conf`.

</details>

**4. A deploy switches `current` to the new release with `ln -sf releases/release-5 current`, but the old version keeps running. What went wrong?**

<details>
<summary>Show answer</summary>

Without `-n`, `ln` treats the existing `current` as a directory, follows it into the old release, and creates a `release-5` link inside it. `current` itself never changed. Use `ln -sfn`.

</details>

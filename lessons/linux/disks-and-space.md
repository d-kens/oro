A full disk is one of the most common reasons a server stops working. Logs stop being written, databases refuse new data, and programs fail with errors that do not mention disk space at all. Knowing how to see what is using the space, and where, is a skill you will use often.

By the end you can check how full each filesystem is, find the directories that are using the space, list the disks a machine has, read what is mounted where, and work through a full disk calmly.

## Disks, filesystems and mounting

A **disk** is raw storage: a physical drive, or on a cloud server a virtual volume. Before it can hold files, it is usually split into **partitions** and each partition is formatted with a **filesystem**, the structure that keeps track of files, directories and free space. Common filesystems on Linux are **ext4** and **xfs**.

Windows gives each disk a letter. Linux has a single directory tree that starts at `/`, and each filesystem is attached to a directory in it. Attaching it is called **mounting**, and the directory is its **mount point**. A server might have its system disk mounted at `/` and a second disk for data mounted at `/var/lib/postgresql`. You move between them with `cd` and never notice the boundary, but each one has its own size and fills up on its own.

`lsblk` lists the block devices, which means disks and partitions, as a tree:

```bash
$ lsblk
NAME         MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS
nvme0n1      259:0    0   20G  0 disk
├─nvme0n1p1  259:1    0 19.9G  0 part /
└─nvme0n1p15 259:2    0  106M  0 part /boot/efi
nvme1n1      259:3    0  100G  0 disk /data
```

This server has two disks. The first has two partitions, mounted at `/` and `/boot/efi`. The second disk is used whole, with no partitions, and is mounted at `/data`. In a Docker container `lsblk` shows the host's disks, which can look confusing; the container's own files sit on a layered filesystem called `overlay`.

## How full is each filesystem: df

`df` (*disk free*) shows each mounted filesystem, how big it is, and how much is used. `-h` prints sizes in K, M and G instead of blocks:

```bash
$ df -h
Filesystem      Size  Used Avail Use% Mounted on
/dev/nvme0n1p1   20G   15G  4.2G  78% /
tmpfs           1.9G     0  1.9G   0% /dev/shm
/dev/nvme0n1p15 105M  6.1M   99M   6% /boot/efi
/dev/nvme1n1     98G   41G   53G  44% /data
```

Read the `Use%` and `Mounted on` columns first. `tmpfs` lines are filesystems held in memory, not on disk, and you can usually ignore them.

To check only the filesystem that holds a particular directory, pass it as an argument. `-T` adds the filesystem type:

```bash
$ df -hT /var/log
Filesystem     Type  Size  Used Avail Use% Mounted on
/dev/nvme0n1p1 ext4   20G   15G  4.2G  78% /
```

`/var/log` is not a mount point of its own, so `df` reports the filesystem it lives on, which is `/`.

A filesystem can also run out of **inodes**, the entries that record each file, while it still has space. That happens with millions of tiny files. `df -i` shows inode use in the same layout; if `IUse%` is at 100%, nothing new can be created, whatever `df -h` says.

## What is using the space: du

`df` tells you a filesystem is full. `du` (*disk usage*) tells you which files and directories are filling it. `-s` gives one total per argument and `-h` makes it readable:

```bash
$ du -sh /var/log
288K	/var/log
```

To see which directories inside a directory are biggest, give `du` all of them and sort the result. `sort -h` understands sizes like `4.0K` and `1.2G`, and `-r` puts the largest first:

```bash
$ du -sh /var/* 2>/dev/null | sort -rh | head -5
4.0G	/var/lib
1.2G	/var/log
504K	/var/cache
8.0K	/var/tmp
4.0K	/var/spool
```

`2>/dev/null` throws away the error messages for directories you cannot read; the *Pipes and text* topic explains it. Then repeat the same command one level down, into the largest directory, until you reach the files themselves:

```bash
$ du -sh /var/log/* 2>/dev/null | sort -rh | head -3
1.1G	/var/log/app
96M	/var/log/journal
1.2M	/var/log/apt
```

To stay on one filesystem and not wander into other disks mounted below the directory you are measuring, add `-x`. `find` can also look for large files directly, as the *Finding things* topic showed:

```bash
$ find / -xdev -type f -size +100M 2>/dev/null
/var/log/app/app.log
```

## Mounting and /etc/fstab

`mount` with no arguments lists every mounted filesystem. The list is long, so `findmnt` is easier to read for one mount point:

```bash
$ findmnt /data
TARGET SOURCE       FSTYPE OPTIONS
/data  /dev/nvme1n1 xfs    rw,relatime
```

To attach a filesystem, give `mount` the device and the mount point, which must be an existing directory. `umount` (no *n*) detaches it:

```bash
$ mkdir -p /mnt/backup
$ mount /dev/nvme2n1 /mnt/backup
$ umount /mnt/backup
```

A mount made by hand lasts until the next reboot. Mounts that should come back at every boot are listed in `/etc/fstab`, one per line, with six fields:

```text
UUID=2c1f8a4e-5b0d-4e1a-9f2c-7d3e6b8a1c40  /data  xfs  defaults,nofail  0  2
```

| Field | Example | Meaning |
| --- | --- | --- |
| Device | `UUID=2c1f…` | What to mount. A UUID is used because device names can change between boots |
| Mount point | `/data` | Where to attach it |
| Type | `xfs` | The filesystem type |
| Options | `defaults,nofail` | How to mount it; `nofail` lets the machine boot even if this disk is missing |
| Dump | `0` | Used by an old backup tool; almost always `0` |
| Check order | `2` | When to check the filesystem at boot: `1` for `/`, `2` for others, `0` for never |

`lsblk -f` shows each device's UUID. Be careful with this file: a mistake in it can stop a server from booting. After you change it, run `mount -a` to mount everything it lists, and fix any error before you reboot. The Docker container has an empty `fstab`, because the container does not boot.

## A full disk

When a filesystem fills up, programs fail when they try to write:

```bash
$ echo test > /data/test.txt
bash: echo: write error: No space left on device
```

Work through it in order:

1. `df -h` to see which filesystem is full.
2. `du -sh <mount point>/* | sort -rh | head` to find the largest directory, and repeat one level down until you find the files.
3. Decide what can go. Old, rotated logs like `app.log.1` are usually safe to delete. A database's data files are not.

There is one trap. If you delete a file that a running program still has open, the name disappears but the space does not come back until the program closes it. `du` no longer counts the file, but `df` still does, so the two disagree:

```bash
$ rm /data/logs/app.log
$ df -h /data
Filesystem      Size  Used Avail Use% Mounted on
/dev/loop0       90M   88M     0 100% /data
$ du -sh /data
28M	/data
```

You can find such files through `/proc`, where each process lists the files it has open:

```bash
$ find /proc/[0-9]*/fd -lname '*(deleted)' -printf '%p -> %l\n' 2>/dev/null
/proc/18/fd/3 -> /data/logs/app.log (deleted)
```

Process 18 still holds the file. Restarting that program frees the space. To empty a log a program is still writing to, truncate it instead of deleting it:

```bash
$ : > /data/logs/app.log
```

`:` is a command that does nothing, so `>` leaves the file in place with zero bytes.

## Tasks

Do these in your Linux shell.

### Task 1: Find what is filling a directory

Create some test data in your home directory:

```bash
$ mkdir -p ~/data/logs ~/data/cache ~/data/notes
$ fallocate -l 300M ~/data/logs/app.log
$ dd if=/dev/zero of=~/data/cache/blob bs=1M count=50 status=none
$ echo "remember the milk" > ~/data/notes/todo.txt
```

`fallocate` and `dd` both create a file of a given size. Now use `du` and `sort` to list the directories in `~/data` with the largest first, and find the single largest file. Then use `df` to see how much space is free on the filesystem that holds `~/data`.

<details>
<summary>Check your work</summary>

```bash
$ du -sh ~/data/* | sort -rh
301M	/root/data/logs
51M	/root/data/cache
8.0K	/root/data/notes
$ du -sh ~/data/logs/*
300M	/root/data/logs/app.log
$ df -h ~/data
Filesystem      Size  Used Avail Use% Mounted on
overlay          59G   17G   40G  30% /
```

Your sizes on `df` will differ. If the order comes out as `8.0K`, `51M`, `301M`, you used `sort -r` instead of `sort -rh`, which sorts the text instead of the sizes.

</details>

### Task 2: Fill a disk and recover

This task needs a container that is allowed to mount filesystems. Exit your container and start one with `--privileged`:

```bash
$ docker run -it --rm --privileged --hostname lab ubuntu:24.04
```

Make a 100 MB file, format it as ext4, and mount it at `/mnt/data` as if it were a small disk:

```bash
$ cd ~
$ fallocate -l 100M disk.img
$ mkfs.ext4 -q disk.img
$ mkdir -p /mnt/data
$ mount -o loop disk.img /mnt/data
```

Now create `/mnt/data/logs`, write a 60 MB `app.log` and a 60 MB `app.log.1` into it with `dd`, and see what happens. Find out which filesystem is full and which file is largest, free the space by deleting the old log, and confirm with `df`. Finish with `umount /mnt/data`.

<details>
<summary>Check your work</summary>

```bash
$ df -hT /mnt/data
Filesystem     Type  Size  Used Avail Use% Mounted on
/dev/loop0     ext4   90M   24K   83M   1% /mnt/data
$ mkdir /mnt/data/logs
$ dd if=/dev/zero of=/mnt/data/logs/app.log bs=1M count=60 status=none
$ dd if=/dev/zero of=/mnt/data/logs/app.log.1 bs=1M count=60 status=none
dd: error writing '/mnt/data/logs/app.log.1': No space left on device
$ df -h /mnt/data
Filesystem      Size  Used Avail Use% Mounted on
/dev/loop0       90M   88M     0 100% /mnt/data
$ du -sh /mnt/data/logs/* | sort -rh
60M	/mnt/data/logs/app.log
28M	/mnt/data/logs/app.log.1
$ rm /mnt/data/logs/app.log.1
$ df -h /mnt/data
Filesystem      Size  Used Avail Use% Mounted on
/dev/loop0       90M   61M   23M  73% /mnt/data
$ umount /mnt/data
```

The filesystem is smaller than 100 MB because ext4 keeps some of the space for its own records. The second file stopped at 28 MB, when the disk filled. If `mount` fails with `mount failed: No such file or directory`, the container was not started with `--privileged`.

</details>

## Quiz

**1. What is the difference between what `df` and `du` tell you?**

<details>
<summary>Show answer</summary>

`df` reports how full each mounted filesystem is, as a whole. `du` adds up the size of the files and directories you point it at. Use `df` to find which filesystem is full, then `du` to find what is filling it.

</details>

**2. You are on a server and an application logs `No space left on device`, but `df -h` shows `/` at 40%. What else should you check?**

<details>
<summary>Show answer</summary>

Check the filesystem the application actually writes to, with `df -h` on its directory, because it may be a separate mount that is full. Then check inodes with `df -i`: a filesystem with no free inodes reports the same error even when it has space.

</details>

**3. You deleted a 5 GB log file, but `df` shows the same usage as before. Why, and how do you get the space back?**

<details>
<summary>Show answer</summary>

A running program still has the file open, so the space is not freed until the program closes it. Find the program through `/proc/*/fd` entries marked `(deleted)`, or with `lsof`, and restart it. Next time, truncate the file with `: > file` instead of deleting it.

</details>

**4. Why do lines in `/etc/fstab` usually name a disk by `UUID=` rather than by a name like `/dev/sdb`?**

<details>
<summary>Show answer</summary>

Device names are given out in the order disks are found at boot, and they can change when a disk is added or removed. A UUID belongs to the filesystem itself, so the line always points at the same filesystem.

</details>

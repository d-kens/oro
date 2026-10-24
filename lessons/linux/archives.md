Software releases, backups and log history usually arrive as a single file that holds many others. On Linux that file is most often a tar archive, compressed with gzip or xz. You also meet zip files, mostly from other systems. Knowing how to pack, check and unpack them safely is part of almost every install and every backup.

By the end you can create, list and extract tar archives with and without compression, compress single files, work with zip files, unpack into the directory you choose, and check that a download is the file it claims to be.

## tar: create, list, extract

**`tar`** joins many files and directories into one file, keeping names, permissions, owners and timestamps. On its own it does not compress anything. The name comes from *tape archive*, which is where backups used to go.

A `tar` command starts with letters that say what to do:

| Letter | Meaning |
| --- | --- |
| `c` | Create an archive |
| `t` | List what is in an archive |
| `x` | Extract an archive |
| `v` | Verbose: print each file name as it goes |
| `f` | The next argument is the archive file name |

You always need exactly one of `c`, `t` or `x`, and almost always `f`. Because `f` takes the next argument, keep it last in the group: `-cvf site.tar`, not `-cfv site.tar`.

The examples use a small website directory with one large log. Create it in your home directory:

```bash
$ mkdir -p site/css site/logs
$ echo "<h1>Hello</h1>" > site/index.html
$ echo "body { margin: 0; }" > site/css/main.css
$ seq 1 100000 | sed 's|^|GET /api/orders 200 |' > site/logs/access.log
$ du -sh site
2.5M	site
```

Now create an archive of the `site` directory:

```bash
$ tar -cvf site.tar site
site/
site/logs/
site/logs/access.log
site/css/
site/css/main.css
site/index.html
```

The order of the names depends on the filesystem, so yours may differ. List what is inside without extracting it. Add `v` to see sizes, owners and dates:

```bash
$ tar -tvf site.tar
drwxr-xr-x root/root         0 2026-10-24 11:19 site/
drwxr-xr-x root/root         0 2026-10-24 11:19 site/logs/
-rw-r--r-- root/root   2588895 2026-10-24 11:19 site/logs/access.log
drwxr-xr-x root/root         0 2026-10-24 11:19 site/css/
-rw-r--r-- root/root        20 2026-10-24 11:19 site/css/main.css
-rw-r--r-- root/root        15 2026-10-24 11:19 site/index.html
```

Extract it with `x`. Files are written relative to the directory you are in, so this recreates `site/` here, replacing any files with the same names:

```bash
$ tar -xf site.tar
```

To extract a single file, name it after the archive, exactly as the listing shows it: `tar -xf site.tar site/index.html`.

If you archive an absolute path, `tar` strips the leading `/` so that extracting never writes over system files by accident:

```bash
$ tar -cf hostname.tar /etc/hostname
tar: Removing leading `/' from member names
$ tar -tf hostname.tar
etc/hostname
```

## Compression

A plain tar file is as big as the files in it. Add one more letter to compress it as it is written:

| Letter | Compressor | Usual extension | Notes |
| --- | --- | --- | --- |
| `z` | gzip | `.tar.gz` or `.tgz` | Fast, everywhere, the default choice |
| `J` | xz | `.tar.xz` | Smaller files, slower to create |
| `j` | bzip2 | `.tar.bz2` | Older; you still see it in downloads |

The Docker Ubuntu image does not include `xz`. Install it first:

```bash
$ apt update && apt install -y xz-utils
```

Then compare the sizes:

```bash
$ tar -czf site.tar.gz site
$ tar -cJf site.tar.xz site
$ ls -lh site.tar*
-rw-r--r-- 1 root root 2.5M Oct 24 11:19 site.tar
-rw-r--r-- 1 root root 259K Oct 24 11:19 site.tar.gz
-rw-r--r-- 1 root root  33K Oct 24 11:21 site.tar.xz
```

This log shrinks a lot because it repeats itself; real logs usually compress to between a fifth and a tenth of their size. Files that are already compressed, such as images or zip files, barely shrink at all.

When listing or extracting, modern `tar` detects the compression on its own, so `tar -tf site.tar.xz` and `tar -xf site.tar.gz` both work. You only need the letter when creating.

**`gzip`** and **`xz`** also work on single files, without `tar`. They replace the file with a compressed copy:

```bash
$ cp site/logs/access.log app.log
$ gzip app.log
$ ls app.log*
app.log.gz
$ gunzip app.log.gz
$ ls app.log*
app.log
```

`gzip -k` keeps the original. `zcat` prints a compressed file without unpacking it, so you can pipe it straight into `grep` or `head`. This is how you read old logs in `/var/log`, which are rotated into files like `syslog.2.gz`:

```bash
$ gzip -k app.log
$ zcat app.log.gz | head -n 2
GET /api/orders 200 1
GET /api/orders 200 2
```

`xz` and `unxz` work the same way, and `xzcat` is their `zcat`.

## Choosing where files go

**`-C`** changes to a directory before `tar` does anything else. When extracting, it puts the files somewhere other than where you are standing. The directory must already exist:

```bash
$ mkdir restore
$ tar -xzf site.tar.gz -C restore
$ ls restore
site
```

Put `-C` before any file names. `tar` reads its arguments in order, and a `-C` placed after a file name does not apply to that file.

When creating, `-C` decides how the paths inside the archive start. Archiving `.` from inside `site` gives an archive with no `site/` directory at the top:

```bash
$ tar -czf flat.tar.gz -C site .
$ tar -tf flat.tar.gz
./
./logs/
./logs/access.log
./css/
./css/main.css
./index.html
```

**`--exclude`** leaves out files that match a pattern. Put it before the directory you archive:

```bash
$ tar -czf site-nologs.tar.gz --exclude="site/logs" site
$ tar -tf site-nologs.tar.gz
site/
site/css/
site/css/main.css
site/index.html
```

A pattern can also use wildcards: `--exclude="*.log"` skips every file ending in `.log` wherever it is, but keeps the empty `logs/` directory. You can give `--exclude` several times.

## Check before you extract

Extracting writes files with whatever names the archive holds, and quietly replaces files that already exist. Before you extract something you did not make, list it first:

```bash
$ tar -tf flat.tar.gz | head
```

Look for two things:

- **Does everything sit under one top-level directory?** A well-made release unpacks into `tool-1.0/`. An archive like `flat.tar.gz` puts its files straight into the current directory and scatters them among yours. Extract that kind into a new, empty directory with `-C`.
- **Are any paths absolute, or do any contain `..`?** Those could write outside the directory you chose. GNU `tar` refuses most of them, but you should still notice.

`v` while extracting prints each file as it is written, so you can see afterwards what changed.

## zip and unzip

**zip** files combine archiving and compression in one format. They are common for files shared with Windows and macOS users, and for some downloads. Ubuntu does not always include the tools:

```bash
$ apt install -y zip unzip
```

`zip -r` archives a directory. The archive name comes first, then what to put in it:

```bash
$ zip -r site.zip site
  adding: site/ (stored 0%)
  adding: site/logs/ (stored 0%)
  adding: site/logs/access.log (deflated 90%)
  adding: site/css/ (stored 0%)
  adding: site/css/main.css (stored 0%)
  adding: site/index.html (stored 0%)
```

`unzip -l` lists, and `unzip -d` extracts into a directory, creating it if it does not exist:

```bash
$ unzip -l site.zip
Archive:  site.zip
  Length      Date    Time    Name
---------  ---------- -----   ----
        0  2026-10-24 11:22   site/
        0  2026-10-24 11:22   site/logs/
  2588895  2026-10-24 11:22   site/logs/access.log
        0  2026-10-24 11:22   site/css/
       20  2026-10-24 11:22   site/css/main.css
       15  2026-10-24 11:22   site/index.html
---------                     -------
  2588930                     6 files
$ unzip -q site.zip -d /tmp/unzipped
```

`-q` stops `unzip` printing every file. To leave files out, use `-x` with a pattern: `zip -r site.zip site -x "site/logs/*"`. zip does not keep Linux owners, so prefer tar for backups of a Linux system.

## Checking a download

A **checksum** is a short fingerprint of a file's contents. Change one byte and the checksum changes completely. Projects publish a SHA-256 checksum next to each download so you can confirm the file arrived intact and is the one they released.

`sha256sum` prints a file's checksum:

```bash
$ sha256sum tool-1.0.tar.gz
4252d05864...  tool-1.0.tar.gz
```

The checksum is 64 characters long; it is shortened here, and you make this file in Task 2. Comparing long strings by eye is unreliable. Instead, put the published checksum in a file in the same format, and let `sha256sum -c` compare:

```bash
$ sha256sum -c tool-1.0.tar.gz.sha256
tool-1.0.tar.gz: OK
```

If the file has changed, you see `FAILED` and a non-zero exit code. Do not extract a file that fails the check; download it again, and if it still fails, stop. When a project publishes only the bare checksum, build the line yourself, with two spaces between the checksum and the name:

```bash
$ echo "<checksum from the website>  tool-1.0.tar.gz" | sha256sum -c
```

## Tasks

Do these in your Linux shell, in your home directory.

### Task 1: Back up a project

Create this project:

```bash
$ mkdir -p ~/project/src ~/project/logs ~/project/cache
$ echo 'print("hello")' > ~/project/src/main.py
$ echo "# Project" > ~/project/README.md
$ echo "started" > ~/project/logs/app.log
$ echo "tmp" > ~/project/cache/data.bin
```

Make a gzip-compressed backup called `project-backup.tar.gz` that leaves out `logs` and `cache`. List it to check, restore it into `/tmp/restore`, and compare the restored copy with the original using `diff -r`.

<details>
<summary>Check your work</summary>

```bash
$ cd ~
$ tar -czf project-backup.tar.gz --exclude="project/logs" --exclude="project/cache" project
$ tar -tzf project-backup.tar.gz
project/
project/README.md
project/src/
project/src/main.py
$ mkdir -p /tmp/restore
$ tar -xzf project-backup.tar.gz -C /tmp/restore
$ diff -r project /tmp/restore/project
Only in project: cache
Only in project: logs
```

`diff -r` reports only the two directories you excluded, so everything else came back identical. If `tar` says `/tmp/restore: Cannot open`, you skipped the `mkdir`. If the listing still shows `logs`, check that the exclude pattern starts with `project/`, the same way the paths in the listing do.

</details>

### Task 2: Verify and install a download

First make a "download" and its published checksum, the way a project would:

```bash
$ mkdir -p /tmp/publisher/build/bin
$ printf '#!/bin/sh\necho "tool 1.0"\n' > /tmp/publisher/build/bin/tool
$ chmod +x /tmp/publisher/build/bin/tool
$ echo "tool 1.0" > /tmp/publisher/build/README
$ tar -czf /tmp/publisher/tool-1.0.tar.gz -C /tmp/publisher/build .
$ cd /tmp/publisher && sha256sum tool-1.0.tar.gz > tool-1.0.tar.gz.sha256
$ mkdir ~/downloads && cp /tmp/publisher/tool-1.0.tar.gz* ~/downloads/
```

Now, working in `~/downloads`, check the archive against its checksum, look inside it, and install it so that `/opt/tool-1.0/bin/tool` runs. Then append a line to the archive with `echo x >> tool-1.0.tar.gz` and check it again.

<details>
<summary>Check your work</summary>

```bash
$ cd ~/downloads
$ sha256sum -c tool-1.0.tar.gz.sha256
tool-1.0.tar.gz: OK
$ tar -tzf tool-1.0.tar.gz
./
./bin/
./bin/tool
./README
$ mkdir -p /opt/tool-1.0
$ tar -xzf tool-1.0.tar.gz -C /opt/tool-1.0
$ /opt/tool-1.0/bin/tool
tool 1.0
$ echo x >> tool-1.0.tar.gz
$ sha256sum -c tool-1.0.tar.gz.sha256
tool-1.0.tar.gz: FAILED
sha256sum: WARNING: 1 computed checksum did NOT match
```

The listing shows no top-level directory, so the files must go into a directory you create. If you extracted without `-C`, `bin/` and `README` landed in `~/downloads`. Delete them and extract again.

</details>

## Quiz

**1. What do the letters in `tar -xzvf backup.tar.gz` mean, and which one is unnecessary on a modern system?**

<details>
<summary>Show answer</summary>

`x` extracts, `z` uses gzip, `v` lists each file as it is written, and `f` names the archive. `z` is unnecessary when extracting, because GNU `tar` detects the compression itself.

</details>

**2. You are on a server and a colleague sends you `fix.tar.gz` to unpack in `/srv/app`, which is full of live files. What do you do before extracting?**

<details>
<summary>Show answer</summary>

List it with `tar -tzf fix.tar.gz` and read the paths. Check whether they sit under one directory, whether any would replace files you care about, and whether any are absolute or contain `..`. If you are unsure, extract into an empty directory with `-C`, look at the result, and copy across only what you need.

</details>

**3. You want to read yesterday's rotated log, `syslog.1.gz`, without leaving an unpacked copy behind. How?**

<details>
<summary>Show answer</summary>

Use `zcat /var/log/syslog.1.gz`, piped into `grep`, `less` or `tail` as needed. It prints the uncompressed text and leaves the file as it is. `gunzip` would replace the `.gz` file with the unpacked one.

</details>

**4. A download page shows a SHA-256 checksum, and `sha256sum` on your file prints a different one. What does that mean and what should you do?**

<details>
<summary>Show answer</summary>

The file is not the one that was published. It may be incomplete, damaged, or replaced. Do not extract or run it. Download it again from the official source, and if the checksum still does not match, stop and find out why.

</details>

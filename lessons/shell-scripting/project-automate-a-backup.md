A backup you have to remember to take is a backup that will be missing on the day you need it. In this project you write a script that archives a directory, keeps the newest seven copies, and logs everything it does. Then you schedule it to run every night and prove you can restore from it.

It uses the *Archives* topic for `tar`, *Running things on a schedule* for cron, *Pipes and text* and *Your shell* for the script itself, *Finding things* for `find`, and *Creating and moving files* and *Disks and space* along the way.

## What you need

A Docker container is enough. Start one, and keep it running until you finish, because everything in it is deleted when you exit:

```bash
$ docker run -it --rm --hostname lab ubuntu:24.04
```

Install an editor and cron, then start the cron service. The Docker image has no init system, so services do not start on their own; `service cron start` starts the cron daemon by hand.

```bash
# apt update && apt install -y nano cron
# service cron start
 * Starting periodic command scheduler cron
   ...done.
```

The prompt ends in `#` because you are root in the container, which is how a backup job normally runs. On WSL, a Multipass VM or a Linux machine, cron is usually installed and running already; put `sudo` in front of the commands that write to `/srv`, `/var` or `/usr/local/bin`.

## The brief

1. There is some data to protect in `/srv/data`: at least two files, one of them in a subdirectory. Check: `find /srv/data -type f` lists them.
2. A script `/usr/local/bin/backup.sh` takes two arguments, a source directory and a backup directory, and creates a compressed archive of the source in the backup directory. The archive's name holds the source directory's name and the date and time, for example `data-2026-10-24-021500.tar.gz`. Check: run it and list the backup directory.
3. The script keeps only the newest seven archives for that source and deletes the rest. Check: run it nine times and count the archives.
4. The script appends a line for each thing it does, starting with the date and time, to `/var/log/backup.log`. Check: `tail /var/log/backup.log`.
5. The script stops at the first error, logs a clear message, and exits with a non-zero status. Called with the wrong number of arguments it prints a usage line. Check: run it on a directory that does not exist and look at `$?`.
6. Cron runs the script every night at 02:30. Check: `crontab -l` shows the entry, and a temporary every-minute entry produces a new archive within a minute.
7. You can restore the data from an archive and it matches the original. Check: `diff -r` prints nothing.

## Steps

### Make something to back up

Create `/srv/data` and put a few files in it, including one inside a subdirectory. Then try the core of the job by hand before you write any script: archive the directory with `tar` into `/tmp`, with a name built from `date`.

Hint: `date '+%Y-%m-%d-%H%M%S'` prints a timestamp with no spaces or colons, which keeps it safe in a file name and makes the names sort in date order. To store `data/` in the archive rather than `/srv/data/`, tell `tar` to change into `/srv` first with `-C /srv`.

<details>
<summary>Show a solution</summary>

```bash
# mkdir -p /srv/data/notes
# echo "id,name" > /srv/data/users.csv
# echo "Remember to water the plants" > /srv/data/notes/todo.txt
# find /srv/data -type f
/srv/data/notes/todo.txt
/srv/data/users.csv
# tar -czf "/tmp/data-$(date '+%Y-%m-%d-%H%M%S').tar.gz" -C /srv data
# ls /tmp/*.tar.gz
/tmp/data-2026-10-24-111702.tar.gz
# tar -tzf /tmp/data-2026-10-24-111702.tar.gz
data/
data/notes/
data/notes/todo.txt
data/users.csv
```

Your timestamp will differ. `-t` lists what is in an archive without unpacking it, a quick way to check you archived what you meant to.

</details>

### Write the script

Turn the command into a script. Plan it before you type:

- Start with `#!/usr/bin/env bash` and `set -euo pipefail`. `-e` stops the script when a command fails, `-u` treats an unset variable as an error, and `-o pipefail` makes a pipeline fail if any part of it fails, not only the last.
- Check that there are exactly two arguments, and print a usage line to standard error if not.
- Write a small function, `log`, that prints its arguments after a timestamp and appends the same line to `/var/log/backup.log`. `tee -a` does both at once.
- Write a second function, `fail`, that logs a message starting with `ERROR:` and exits with status 1. Use it whenever a check fails, for example `[[ -d $source_dir ]] || fail "..."`.
- Work out the archive's name from `basename` of the source, and the directory to change into with `dirname`. This way the script works for any directory, not only `/srv/data`.

Save the script as `/usr/local/bin/backup.sh`, make it executable, and check it with `bash -n` before you run it.

<details>
<summary>Show a solution</summary>

This is the whole script, including the clean-up that the next stage explains.

```bash
#!/usr/bin/env bash
# Archives a directory into a backup directory and keeps the newest seven archives.
# Usage: backup.sh SOURCE_DIR BACKUP_DIR
set -euo pipefail

keep=7
logfile=/var/log/backup.log

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$logfile"
}

fail() {
  log "ERROR: $*"
  exit 1
}

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 SOURCE_DIR BACKUP_DIR" >&2
  exit 2
fi

source_dir=$1
backup_dir=$2

[[ -d $source_dir ]] || fail "source directory $source_dir does not exist"
mkdir -p "$backup_dir" || fail "cannot create $backup_dir"

name=$(basename "$source_dir")
archive="$backup_dir/$name-$(date '+%Y-%m-%d-%H%M%S').tar.gz"

log "Starting backup of $source_dir"
tar -czf "$archive" -C "$(dirname "$source_dir")" "$name" || fail "tar could not create $archive"
log "Created $archive ($(du -h "$archive" | cut -f1))"

# The names sort by date, so everything after the first $keep (newest first) is old.
find "$backup_dir" -maxdepth 1 -name "$name-*.tar.gz" | sort -r | tail -n +$((keep + 1)) |
  while read -r old; do
    rm -- "$old"
    log "Removed old archive $old"
  done

log "Finished. Archives kept: $(find "$backup_dir" -maxdepth 1 -name "$name-*.tar.gz" | wc -l)"
```

```bash
# nano /usr/local/bin/backup.sh
# chmod 755 /usr/local/bin/backup.sh
# bash -n /usr/local/bin/backup.sh
# backup.sh /srv/data /var/backups/data
2026-10-24 11:18:30 Starting backup of /srv/data
2026-10-24 11:18:30 Created /var/backups/data/data-2026-10-24-111830.tar.gz (4.0K)
2026-10-24 11:18:30 Finished. Archives kept: 1
```

`/usr/local/bin` is on your `PATH`, so you can call the script by name. A command followed by `|| fail` does not trigger `set -e` when it fails; the `||` handles the failure instead, which is how the script gets to log a message before it exits.

The usage error exits with `2` rather than `1`, a common convention for "you called me wrongly" as opposed to "I tried and failed".

</details>

### Keep the newest seven

Each run adds an archive, so without a clean-up the backup directory grows until the disk is full. Because the timestamp in each name sorts in date order, the list of archives sorted in reverse puts the newest first. Everything after the seventh line is old.

Hint: `tail -n +8` prints from the eighth line onwards. Feed those names to a `while read` loop that removes each one and logs it. Only match archives for this source, so a second backup job sharing the directory is left alone.

To test it you need nine archives with different names. The timestamp has one-second resolution, so wait a second between runs.

<details>
<summary>Show a solution</summary>

The `find ... | sort -r | tail -n +$((keep + 1))` pipeline in the script above does this. Test it:

```bash
# for i in $(seq 9); do backup.sh /srv/data /var/backups/data > /dev/null; sleep 1; done
# ls /var/backups/data | wc -l
7
# tail -n 4 /var/log/backup.log
2026-10-24 11:19:56 Starting backup of /srv/data
2026-10-24 11:19:56 Created /var/backups/data/data-2026-10-24-111956.tar.gz (4.0K)
2026-10-24 11:19:56 Removed old archive /var/backups/data/data-2026-10-24-111949.tar.gz
2026-10-24 11:19:56 Finished. Archives kept: 7
```

`rm --` marks the end of options, so a file name that starts with `-` cannot be mistaken for one. It is a good habit whenever you remove files whose names come from a command.

</details>

### Run it every night

Add a cron entry for root that runs the script at 02:30 every day. Cron runs jobs with a very short `PATH` and no terminal, so use the full path to the script, and send its output to `/dev/null`: the script writes its own log, so you lose nothing.

You will not want to wait until 02:30 to see whether it works. Add a second, temporary entry that runs every minute, watch for a new archive, then remove it.

Hint: the five time fields are minute, hour, day of month, month and day of week. `crontab -e` opens root's crontab in an editor; set `EDITOR=nano` so it does not ask which editor to use.

<details>
<summary>Show a solution</summary>

```bash
# EDITOR=nano crontab -e
```

Add these two lines at the end, save and exit:

```text
30 2 * * * /usr/local/bin/backup.sh /srv/data /var/backups/data > /dev/null 2>&1
* * * * * /usr/local/bin/backup.sh /srv/data /var/backups/data > /dev/null 2>&1
```

Note the time, wait until the minute after next, and look at the log:

```bash
# date
Sat Oct 24 11:21:14 UTC 2026
# tail -n 3 /var/log/backup.log
2026-10-24 11:22:01 Starting backup of /srv/data
2026-10-24 11:22:01 Created /var/backups/data/data-2026-10-24-112201.tar.gz (4.0K)
2026-10-24 11:22:01 Removed old archive /var/backups/data/data-2026-10-24-111950.tar.gz
```

A line stamped at the start of a minute that you did not type yourself is cron's work. Now open `crontab -e` again and delete the every-minute line, so you are left with the nightly one.

If nothing appears, check that cron is running with `service cron status`. On a machine with systemd, `systemctl status cron` and `journalctl -u cron` show whether the job started.

</details>

### Restore from an archive

A backup is only as good as your last successful restore. Pick the newest archive, unpack it somewhere other than its original place, and compare the result with the live data. Never test a restore by unpacking over the data you are protecting.

Hint: `tar -xzf ARCHIVE -C DIR` unpacks into `DIR`, which must exist. `diff -r` compares two directory trees and prints nothing when they match.

<details>
<summary>Show a solution</summary>

```bash
# latest=$(ls /var/backups/data/data-*.tar.gz | sort | tail -n 1)
# echo "$latest"
/var/backups/data/data-2026-10-24-112201.tar.gz
# mkdir -p /tmp/restore
# tar -xzf "$latest" -C /tmp/restore
# diff -r /srv/data /tmp/restore/data && echo "restore matches"
restore matches
```

Now simulate the disaster it is for. Delete a file, then bring back just that one file from the archive by naming it after the archive:

```bash
# rm /srv/data/notes/todo.txt
# tar -xzf "$latest" -C /srv data/notes/todo.txt
# cat /srv/data/notes/todo.txt
Remember to water the plants
```

</details>

## Check it works

The script is in place and its syntax is valid:

```bash
# ls -l /usr/local/bin/backup.sh
-rwxr-xr-x 1 root root 1198 Oct 24 11:18 /usr/local/bin/backup.sh
# bash -n /usr/local/bin/backup.sh && echo "syntax ok"
syntax ok
```

No more than seven archives are kept, all named by date:

```bash
# ls /var/backups/data | wc -l
7
# ls /var/backups/data | head -n 2
data-2026-10-24-111951.tar.gz
data-2026-10-24-111952.tar.gz
```

Every action is logged with a timestamp:

```bash
# grep -c 'Starting backup' /var/log/backup.log
11
```

Your count depends on how many times you have run it, by hand and from cron.

Failures are clear and return a non-zero status:

```bash
# backup.sh /srv/nothing /var/backups/data; echo "exit status $?"
2026-10-24 11:19:57 ERROR: source directory /srv/nothing does not exist
exit status 1
# backup.sh; echo "exit status $?"
Usage: /usr/local/bin/backup.sh SOURCE_DIR BACKUP_DIR
exit status 2
```

The nightly entry is installed, and the every-minute one is gone:

```bash
# crontab -l | grep backup
30 2 * * * /usr/local/bin/backup.sh /srv/data /var/backups/data > /dev/null 2>&1
```

A restore matches the original:

```bash
# rm -rf /tmp/restore && mkdir /tmp/restore
# tar -xzf "$(ls /var/backups/data/data-*.tar.gz | sort | tail -n 1)" -C /tmp/restore
# diff -r /srv/data /tmp/restore/data && echo "restore matches"
restore matches
```

## Going further

- Write a small `restore.sh` that takes an archive and a target directory, and refuses to unpack into a directory that is not empty.
- Replace the cron entry with a systemd service and timer on a VM, and use `systemctl list-timers` to see when it runs next.
- Keep the newest seven daily archives plus one archive from each of the last four weeks.

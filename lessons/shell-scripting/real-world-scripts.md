A script you run by hand can be rough: you watch it, read its output and fix things as they come up. A script that runs every night on a server has nobody watching. It needs to leave a record of what it did, take its settings from somewhere other than its own code, let you see what it would do before it does it, and tell someone when it fails.

This topic builds one such script, section by section: a clean-up job that deletes old files from an upload folder. By the end you can add logging, a config file, environment overrides, `--dry-run` and `--help` to a script, run it safely from cron, and raise an alert when it fails.

## The starting point

The core of the job is one `find` command, which the Linux skill's *Finding things* topic introduced:

```bash
#!/bin/bash
# clean-old.sh: delete files older than 14 days from the upload folder.
set -euo pipefail
find /var/tmp/uploads -type f -mtime +14 -delete
```

It works, but it has the problems this topic fixes. Nothing records which files were deleted. Changing the folder or the age means editing the script. There is no way to check what it would delete before it deletes it. And when it runs from cron and fails, nobody hears about it.

To follow along, make some test files with old dates:

```bash
root@lab:~/scripts# mkdir -p /var/tmp/uploads && cd /var/tmp/uploads
root@lab:/var/tmp/uploads# touch -d "20 days ago" report-1.csv "scan 2.pdf"
root@lab:/var/tmp/uploads# touch -d "3 days ago" report-3.csv && touch today.csv
root@lab:/var/tmp/uploads# cd ~/scripts
```

## Logging

A log line needs three things: **when** it happened, **how serious** it is, and **what** happened. A small function gives every line the same shape:

```bash
log_file=/var/log/clean-old.log

log() {
    local line
    line="$(date '+%F %T') [$1] $2"
    echo "$line" >> "$log_file"
    if [ -t 2 ]; then
        echo "$line" >&2
    fi
}

log INFO "Cleaning files in /var/tmp/uploads older than 14 days"
```

```
2026-10-25 08:51:31 [INFO] Cleaning files in /var/tmp/uploads older than 14 days
```

- `date '+%F %T'` gives a timestamp that sorts correctly as text.
- The **level** is a word such as INFO, WARN or ERROR, so you can `grep ERROR` the log later.
- Every line is appended to the log file with `>>`.
- `[ -t 2 ]` is true when stderr is a terminal. When you run the script by hand, you see each line as it is written; under cron, where nobody is watching, the line only goes to the file. Log lines go to stderr, as the *Exit codes and errors* topic recommends for anything that is not the script's result.

The simpler version is `echo "$line" | tee -a "$log_file" >&2`, which always writes to both. That is fine for scripts you run by hand, but under cron, where the cron line also sends output to the log file, every line would be written twice.

Write `if ...; then ...; fi` rather than `[ -t 2 ] && echo "$line" >&2` here. With `set -e`, the short form as the last line of a function makes the function return 1 whenever stderr is not a terminal, and the script stops under cron for no visible reason.

## Settings from a config file

Values that change between servers, such as the folder and the age, belong in a config file, not in the script. A simple `key=value` file is enough:

```
# /etc/clean-old.conf
dir=/var/tmp/uploads
days=7
alert_cmd=/usr/local/bin/notify-admin
```

The quick way to read it is `source /etc/clean-old.conf`, which runs the file as Bash and sets each variable. That is the danger: anything in the file runs, with the script's permissions, usually root. A line such as `dir=/var/tmp/$(touch /tmp/oops; echo uploads)` sets `dir` and also runs `touch`. Only `source` a config file when it is owned by root and only root can write to it.

The safer way is to read the file as data, line by line, and accept only the keys you expect:

```bash
config=/etc/clean-old.conf

load_config() {
    local key value
    if [ ! -e "$config" ]; then
        return 0
    fi
    while IFS='=' read -r key value; do
        case $key in
            '' | '#'*) ;;
            dir) target_dir=$value ;;
            days) days=$value ;;
            log_file) log_file=$value ;;
            alert_cmd) alert_cmd=$value ;;
            *) die "unknown setting '$key' in $config" ;;
        esac
    done < "$config"
}
```

`IFS='='` splits each line at the first `=`, and anything after it, even another `=`, stays in `value`. Blank lines and comments are skipped. An unknown key stops the script, so a typo such as `dyas=7` is reported instead of being ignored while the default quietly applies. Nothing in the file is ever run.

Set defaults in the script before calling `load_config`, so the script still works with no config file at all.

### Environment variable overrides

Sometimes you want a different value for one run without editing the file, for a test or a one-off. Let environment variables win over the file:

```bash
load_config
target_dir=${CLEAN_DIR:-$target_dir}
days=${CLEAN_DAYS:-$days}
```

```bash
root@lab:~/scripts# CLEAN_DAYS=2 ./clean-old.sh --dry-run
```

The usual order, from weakest to strongest, is: defaults in the script, then the config file, then environment variables, then command-line options. Give the variables a prefix such as `CLEAN_`, so they cannot clash with common names like `DIR` or `DAYS` that something else may have set.

Whatever the source, check the values before using them. A `days` of `two` would make `find` fail halfway through:

```bash
if [[ ! $days =~ ^[0-9]+$ ]]; then
    die "days must be a whole number, not '$days'"
fi
```

## A dry run and a help message

A **dry run** shows what the script would do and does nothing. For anything that deletes or changes things, it is the most useful option a script can have: you run it first, read the list, and only then run it for real. Read the options with a `while` and `case` loop, as in the *Arguments and input* topic; `getopts` cannot read long options like `--dry-run`, so a loop over `$1` is the usual approach when you want both forms:

```bash
dry_run=0

while [ $# -gt 0 ]; do
    case $1 in
        -n | --dry-run) dry_run=1 ;;
        -h | --help) usage; exit 0 ;;
        *) echo "clean-old.sh: unknown option: $1" >&2; usage >&2; exit 2 ;;
    esac
    shift
done
```

The deleting part then checks the flag at the one place where something changes:

```bash
count=0
while IFS= read -r -d '' file; do
    if [ "$dry_run" -eq 1 ]; then
        echo "Would delete $file"
    else
        rm -f -- "$file"
        log INFO "Deleted $file"
    fi
    count=$((count + 1))
done < <(find "$target_dir" -type f -mtime "+$days" -print0)
```

`< <(find ...)` feeds the loop from `find` without a pipe. With `find ... | while`, the loop would run in a subshell and `count` would be back to 0 after it. `rm -f --` makes sure a file whose name starts with `-` is not read as an option.

The common mistake is to put the dry-run check in many places, or to forget one. Keep every change behind a single check, and keep the reading and deciding the same in both modes, so the dry run shows exactly what the real run will do.

```bash
root@lab:~/scripts# ./clean-old.sh --dry-run
2026-10-25 08:51:31 [INFO] Dry run: files in /var/tmp/uploads older than 14 days
Would delete /var/tmp/uploads/scan 2.pdf
Would delete /var/tmp/uploads/report-1.csv
2026-10-25 08:51:31 [INFO] Finished: 2 files
```

A **help** message is the script's manual. Print it for `-h` and `--help` to stdout with exit 0, and to stderr with exit 2 after an unknown option. A here-document keeps it readable, and showing the defaults from variables keeps the help correct when they change:

```bash
usage() {
    cat <<END
Usage: clean-old.sh [--dry-run] [--help]

Delete files older than a number of days from one directory.

  -n, --dry-run   show what would be deleted, and delete nothing
  -h, --help      show this help and exit

Settings are read from $config:
  dir=PATH        directory to clean (default $target_dir)
  days=N          minimum age in days (default $days)
  log_file=PATH   log file (default $log_file)
  alert_cmd=PATH  command run with a message if the script fails
CLEAN_DIR and CLEAN_DAYS in the environment override the file.
END
}
```

## Running from cron

The Linux skill's *Running things on a schedule* topic showed how to write a crontab line. Scripts that work by hand and fail under cron almost always fail for one of three reasons.

**A different environment.** Cron starts jobs with almost nothing set: no aliases, none of your shell settings, and a short `PATH`, often just `/usr/bin:/bin`. A command in `/usr/local/bin` or `/usr/sbin` is then "not found". Set `PATH` near the top of the script, so it no longer depends on who started it:

```bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
```

**Relative paths.** Cron starts jobs in the user's home directory, not the script's directory. Use full paths for the script in the crontab, and for every file the script reads or writes.

**Lost output.** Anything a cron job prints is mailed to the user if the server can send mail, and otherwise thrown away. Redirect it to a file so error messages from commands inside the script are kept.

Install the script and give it a crontab line that runs it at 02:30 every night:

```bash
root@lab:~/scripts# cp clean-old.sh /usr/local/bin/clean-old.sh
root@lab:~/scripts# crontab -e
```

```
30 2 * * * /usr/bin/flock -n /tmp/clean-old.lock /usr/local/bin/clean-old.sh >> /var/log/clean-old.log 2>&1
```

`flock -n` with a lock file and a command, the short form of the lock from the *Robust scripts* topic, skips the run if last night's is somehow still going. `>> ... 2>&1` appends both stdout and stderr to the log.

You can test the cron conditions without waiting for 02:30. `env -i` runs a command with an empty environment, close to what cron gives a job:

```bash
root@lab:~/scripts# env -i /bin/sh -c '/usr/local/bin/clean-old.sh --dry-run >> /var/log/clean-old.log 2>&1'
root@lab:~/scripts# echo $?
0
root@lab:~/scripts# tail -n 2 /var/log/clean-old.log
2026-10-25 09:02:11 [INFO] Dry run: files in /var/tmp/uploads older than 7 days
2026-10-25 09:02:11 [INFO] Finished: 0 files
```

The run's `Would delete` lines went into the log too, since stdout was redirected there.

## Telling someone when it fails

A cron job that fails quietly is barely better than no job. The exit status is the signal: a script that exits non-zero on every failure, as this one does, can drive an alert. Two places can act on it.

The crontab line can run a command when the script fails:

```
30 2 * * * /usr/local/bin/clean-old.sh >> /var/log/clean-old.log 2>&1 || /usr/local/bin/notify-admin "clean-old failed"
```

Or the script can do it itself, with an EXIT trap that checks its own status, which keeps the behaviour the same however the script is started:

```bash
alert_cmd=

on_exit() {
    local status=$?
    if [ "$status" -ne 0 ] && [ -n "$alert_cmd" ]; then
        "$alert_cmd" "clean-old.sh failed on $(hostname) with exit status $status"
    fi
}
trap on_exit EXIT
```

`notify-admin` stands for whatever your team uses to raise an alert: an email, a chat message, a call to a monitoring system. For practice, a two-line script that writes to a file will do:

```bash
#!/bin/bash
# notify-admin: record an alert. A real one might send an email or a chat message.
echo "$(date '+%F %T') ALERT: $*" >> /var/log/alerts.log
```

```bash
root@lab:~/scripts# cp notify-admin /usr/local/bin/ && chmod +x /usr/local/bin/notify-admin
root@lab:~/scripts# CLEAN_DIR=/var/tmp/nothing clean-old.sh
2026-10-25 08:52:24 [ERROR] no such directory: /var/tmp/nothing
root@lab:~/scripts# echo $?
1
root@lab:~/scripts# cat /var/log/alerts.log
2026-10-25 08:52:24 ALERT: clean-old.sh failed on lab with exit status 1
```

Monitoring tools that watch for a job, rather than wait for an alert, also work from the exit status, so getting it right matters more than any single message.

## The whole script

```bash
#!/bin/bash
# clean-old.sh: delete files older than a number of days from one directory.
# Settings: defaults below, then /etc/clean-old.conf, then CLEAN_DIR and
# CLEAN_DAYS from the environment, then the command line.
# Exit 0: done. Exit 1: failed. Exit 2: bad usage.
set -euo pipefail
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

config=/etc/clean-old.conf
target_dir=/var/tmp/uploads
days=14
log_file=/var/log/clean-old.log
alert_cmd=
dry_run=0

usage() {
    cat <<END
Usage: clean-old.sh [--dry-run] [--help]

Delete files older than a number of days from one directory.

  -n, --dry-run   show what would be deleted, and delete nothing
  -h, --help      show this help and exit

Settings are read from $config:
  dir=PATH        directory to clean (default $target_dir)
  days=N          minimum age in days (default $days)
  log_file=PATH   log file (default $log_file)
  alert_cmd=PATH  command run with a message if the script fails
CLEAN_DIR and CLEAN_DAYS in the environment override the file.
END
}

log() {
    local line
    line="$(date '+%F %T') [$1] $2"
    echo "$line" >> "$log_file"
    if [ -t 2 ]; then
        echo "$line" >&2
    fi
}

die() {
    log ERROR "$1"
    exit 1
}

load_config() {
    local key value
    if [ ! -e "$config" ]; then
        return 0
    fi
    while IFS='=' read -r key value; do
        case $key in
            '' | '#'*) ;;
            dir) target_dir=$value ;;
            days) days=$value ;;
            log_file) log_file=$value ;;
            alert_cmd) alert_cmd=$value ;;
            *) die "unknown setting '$key' in $config" ;;
        esac
    done < "$config"
}

on_exit() {
    local status=$?
    if [ "$status" -ne 0 ] && [ -n "$alert_cmd" ]; then
        "$alert_cmd" "clean-old.sh failed on $(hostname) with exit status $status"
    fi
}
trap on_exit EXIT

while [ $# -gt 0 ]; do
    case $1 in
        -n | --dry-run) dry_run=1 ;;
        -h | --help) usage; exit 0 ;;
        *) echo "clean-old.sh: unknown option: $1" >&2; usage >&2; exit 2 ;;
    esac
    shift
done

load_config
target_dir=${CLEAN_DIR:-$target_dir}
days=${CLEAN_DAYS:-$days}

if [[ ! $days =~ ^[0-9]+$ ]]; then
    die "days must be a whole number, not '$days'"
fi
if [ ! -d "$target_dir" ]; then
    die "no such directory: $target_dir"
fi

if [ "$dry_run" -eq 1 ]; then
    log INFO "Dry run: files in $target_dir older than $days days"
else
    log INFO "Cleaning files in $target_dir older than $days days"
fi

count=0
while IFS= read -r -d '' file; do
    if [ "$dry_run" -eq 1 ]; then
        echo "Would delete $file"
    else
        rm -f -- "$file"
        log INFO "Deleted $file"
    fi
    count=$((count + 1))
done < <(find "$target_dir" -type f -mtime "+$days" -print0)

log INFO "Finished: $count files"
```

```bash
root@lab:~/scripts# ./clean-old.sh
2026-10-25 08:51:31 [INFO] Cleaning files in /var/tmp/uploads older than 14 days
2026-10-25 08:51:31 [INFO] Deleted /var/tmp/uploads/scan 2.pdf
2026-10-25 08:51:31 [INFO] Deleted /var/tmp/uploads/report-1.csv
2026-10-25 08:51:31 [INFO] Finished: 2 files
root@lab:~/scripts# ls /var/tmp/uploads
report-3.csv  today.csv
```

## Tasks

### Task 1: A backup script in the same style

Write `backup-etc.sh`, which archives `/etc` to `/var/backups/etc/etc-YYYY-MM-DD.tar.gz`. Give it:

- a fixed `PATH` and the safety header,
- a `log` function writing timestamped lines with a level to `/var/log/backup-etc.log`, and to the terminal when run by hand,
- `BACKUP_DIR` in the environment to change the target directory,
- `--dry-run`, which prints the archive name and creates nothing,
- `--help`, and exit 2 with the help on stderr for an unknown option.

<details>
<summary>Check your work</summary>

```bash
#!/bin/bash
# backup-etc.sh: archive /etc into a dated file.
# BACKUP_DIR in the environment changes where archives go.
set -euo pipefail
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

backup_dir=${BACKUP_DIR:-/var/backups/etc}
log_file=/var/log/backup-etc.log
dry_run=0

usage() {
    cat <<END
Usage: backup-etc.sh [--dry-run] [--help]

Archive /etc to $backup_dir/etc-YYYY-MM-DD.tar.gz.
Set BACKUP_DIR to use another directory.

  -n, --dry-run   show what would be done, and change nothing
  -h, --help      show this help and exit
END
}

log() {
    local line
    line="$(date '+%F %T') [$1] $2"
    echo "$line" >> "$log_file"
    if [ -t 2 ]; then
        echo "$line" >&2
    fi
}

while [ $# -gt 0 ]; do
    case $1 in
        -n | --dry-run) dry_run=1 ;;
        -h | --help) usage; exit 0 ;;
        *) echo "backup-etc.sh: unknown option: $1" >&2; usage >&2; exit 2 ;;
    esac
    shift
done

archive=$backup_dir/etc-$(date +%F).tar.gz

if [ "$dry_run" -eq 1 ]; then
    echo "Would create $archive"
    exit 0
fi

mkdir -p "$backup_dir"
if tar -czf "$archive" -C / etc 2>> "$log_file"; then
    log INFO "Saved $archive ($(du -h "$archive" | cut -f1))"
else
    log ERROR "tar failed for $archive"
    exit 1
fi
```

```bash
root@lab:~/scripts# ./backup-etc.sh --dry-run
Would create /var/backups/etc/etc-2026-10-25.tar.gz
root@lab:~/scripts# ./backup-etc.sh
2026-10-25 08:53:18 [INFO] Saved /var/backups/etc/etc-2026-10-25.tar.gz (48K)
root@lab:~/scripts# BACKUP_DIR=/tmp/b ./backup-etc.sh
2026-10-25 08:53:18 [INFO] Saved /tmp/b/etc-2026-10-25.tar.gz (48K)
root@lab:~/scripts# ./backup-etc.sh -x; echo "exit $?"
backup-etc.sh: unknown option: -x
Usage: backup-etc.sh [--dry-run] [--help]
...
exit 2
```

`-C / etc` makes tar change to `/` and archive `etc`, which stores relative paths and avoids tar's "Removing leading /" message. tar's own errors go to the log with `2>>`, so a cron run keeps them. A likely mistake is to put `mkdir -p` before the dry-run check, so that a dry run still creates the directory.

</details>

### Task 2: Schedule the clean-up

Install `clean-old.sh` in `/usr/local/bin`, write a config file with `days=7`, and add a crontab line that runs it every night at 02:30 with a lock and its output appended to its log. Before trusting it, test it the way cron would run it. Cron is not installed in the container; install it with `apt update && apt install -y cron` and start it with `cron` if you want to watch a real run, using `* * * * *` for a minute.

<details>
<summary>Check your work</summary>

```bash
root@lab:~/scripts# cp clean-old.sh /usr/local/bin/clean-old.sh
root@lab:~/scripts# printf 'dir=/var/tmp/uploads\ndays=7\n' > /etc/clean-old.conf
root@lab:~/scripts# crontab -e
```

```
30 2 * * * /usr/bin/flock -n /tmp/clean-old.lock /usr/local/bin/clean-old.sh >> /var/log/clean-old.log 2>&1
```

Test it with an empty environment, as cron would run it:

```bash
root@lab:~/scripts# env -i /bin/sh -c '/usr/local/bin/clean-old.sh --dry-run >> /var/log/clean-old.log 2>&1'
root@lab:~/scripts# echo $?
0
root@lab:~/scripts# tail -n 2 /var/log/clean-old.log
2026-10-25 09:02:11 [INFO] Dry run: files in /var/tmp/uploads older than 7 days
2026-10-25 09:02:11 [INFO] Finished: 0 files
```

With a `* * * * *` line and `cron` running, a new `[INFO] Cleaning ...` line appears in the log within a minute, with no duplicate lines, because the `log` function writes to the terminal only when there is one. Likely mistakes: `clean-old.sh` without its full path in the crontab, which fails with `command not found`; a missing `2>&1`, which loses error messages; and testing only from your own shell, where `PATH` and the current directory hide problems that `env -i` shows.

</details>

## Quiz

**1. A config file for a root cron job contains `dir=/srv/uploads`. A colleague suggests reading it with `source`. When is that acceptable, and what is the safer alternative?**

<details>
<summary>Show answer</summary>

`source` runs the file as Bash, so any command in it runs as root. It is acceptable only if root owns the file and nobody else can write to it. The safer way is to read it line by line with `while IFS='=' read -r key value` and a `case` that accepts only known keys, so the file is treated as data and never run.

</details>

**2. What does this script print when run as `./run.sh` and as `RUN_MODE=live ./run.sh --dry-run`?**

```bash
#!/bin/bash
set -euo pipefail
mode=${RUN_MODE:-test}
if [ "${1:-}" = "--dry-run" ]; then
    mode=dry-run
fi
echo "mode: $mode"
```

<details>
<summary>Show answer</summary>

```
mode: test
mode: dry-run
```

With no variable and no option, the default `test` applies. In the second run, the environment sets `live`, but the command-line option is checked afterwards and wins. That is the usual order: defaults, then config, then environment, then the command line.

</details>

**3. A script on a server works when you run it, but under cron the log shows `pg_dump: command not found`. What is the likely cause, and what are two fixes?**

<details>
<summary>Show answer</summary>

Cron runs jobs with a short `PATH`, and `pg_dump` is in a directory that is not on it. Set `PATH` explicitly at the top of the script, or call the command by its full path, which `command -v pg_dump` shows in your own shell. Test with `env -i /bin/sh -c '/full/path/script.sh'` to see what cron sees.

</details>

**4. Why should a destructive script have a dry-run mode, and what is the main mistake when adding one?**

<details>
<summary>Show answer</summary>

It lets you see exactly what the script would change before it changes it, which matters most when the change cannot be undone, such as deleting files. The main mistake is a dry run that takes a different path through the script from the real run, or misses one of the changing commands. Keep all the reading and deciding the same in both modes, and put the dry-run check only around the commands that change something.

</details>

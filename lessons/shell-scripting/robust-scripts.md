By default, Bash is forgiving. If a command fails, it prints an error and moves on to the next line. If you use a variable that was never set, it quietly treats it as empty. At the prompt that is convenient. In a script that runs unattended, it means one failed `cd` can be followed by an `rm` in the wrong directory.

This topic makes scripts fail early and clean up after themselves. By the end you can write the usual safety header and know where it does not protect you, clean up temporary files with a trap, stop two copies of a script running at once, and write scripts that are safe to run twice.

## set -e: stop at the first failure

Here is a script with no protection. The folder it expects does not exist on this machine:

```bash
#!/bin/bash
# deploy-site.sh: clear the build folder.
cd /srv/site-build
rm -rf ./*
echo "Old files removed"
```

```bash
root@lab:~/scripts# ./deploy-site.sh
./deploy-site.sh: line 3: cd: /srv/site-build: No such file or directory
Old files removed
```

The `cd` failed, Bash carried on, and `rm -rf ./*` ran in whatever directory the script started in. Here that was `~/scripts`, and every script in it is now gone. Do not run this one.

**`set -e`** tells Bash to exit as soon as a command fails. Add it as the second line and the same run stops at the `cd`:

```bash
root@lab:~/scripts# ./deploy-site.sh
./deploy-site.sh: line 4: cd: /srv/site-build: No such file or directory
root@lab:~/scripts# echo $?
1
```

`set -e` is a safety net, not a replacement for the checks in the *Exit codes and errors* topic. It has rules that surprise almost everyone, and you should know them before you rely on it.

**It does not apply to commands being tested.** A failure inside an `if` condition, a `while` condition, or on the left of `&&` or `||` is treated as an answer, not an error. That includes every line of a function called from an `if`:

```bash
#!/bin/bash
set -e

check_config() {
    grep -q '^port=' app.conf
    echo "config looks fine"
}

if check_config; then
    echo "starting"
fi
```

```bash
root@lab:~/scripts# ./check.sh
grep: app.conf: No such file or directory
config looks fine
starting
```

The grep failed, but because `check_config` was called from `if`, `set -e` was switched off for the whole function. The function's status was that of its last line, the `echo`.

**Some normal commands return non-zero.** `((count++))` returns 1 when the value *before* the increment is 0, because it treats 0 as false:

```bash
#!/bin/bash
set -e
count=0
((count++))
echo "count is $count"
```

```bash
root@lab:~/scripts# ./count.sh
root@lab:~/scripts# echo $?
1
```

The script stopped silently. Write `count=$((count + 1))` instead. `grep` finding nothing does the same thing: `errors=$(grep -c ERROR clean.log)` stops a `set -e` script when the log is clean, because grep exits with 1. Add `|| true` where "nothing found" is a normal answer.

**`local` hides the status of a command substitution.** In `local version=$(cat VERSION)`, the status that counts is that of `local`, which always succeeds:

```bash
#!/bin/bash
set -e

get_version() {
    local version=$(cat /no/such/VERSION)
    echo "version: $version"
}

get_version
echo "carried on"
```

```bash
root@lab:~/scripts# ./version.sh
cat: /no/such/VERSION: No such file or directory
version: 
carried on
```

Declare and assign on separate lines, `local version` then `version=$(cat VERSION)`, and the failure stops the script. The *Debugging* topic shows ShellCheck catching this one for you.

## set -u and set -o pipefail

**`set -u`** makes using an unset variable an error. Without it, a typo turns into an empty string, and an empty string in a path can be dangerous:

```bash
#!/bin/bash
set -u
cache_dir=/tmp/myapp-cache
echo "Clearing $cahce_dir"
rm -rf "${cahce_dir:?}"/*
```

```bash
root@lab:~/scripts# ./clear-cache.sh
./clear-cache.sh: line 4: cahce_dir: unbound variable
```

Without `set -u`, the misspelled `$cahce_dir` would be empty and the `rm` line would become `rm -rf /*`. The `${var:?}` form from the *Parameter expansion* topic is a second guard on that line, and worth keeping on any `rm -rf` with a variable in it.

`set -u` also catches missing arguments, which is usually what you want. When an argument is optional, give it a default:

```bash
env_name=$1            # stops with "$1: unbound variable" if no argument
env_name=${1:-staging} # uses staging if no argument
```

**`set -o pipefail`** fixes the pipeline problem from the *Exit codes and errors* topic. Normally a pipeline's status is that of its last command. With pipefail, it is the status of the last command that *failed*, so a broken first stage is no longer hidden:

```bash
#!/bin/bash
set -euo pipefail
grep ERROR /no/such/app.log | sort | uniq -c
echo "Report done"
```

```bash
root@lab:~/scripts# ./report.sh
grep: /no/such/app.log: No such file or directory
root@lab:~/scripts# echo $?
2
```

With only `set -eu`, the same script prints `Report done` and exits with 0.

Together these give the header you will see at the top of most careful Bash scripts:

```bash
#!/bin/bash
set -euo pipefail
```

| Option | Effect |
| --- | --- |
| `-e` | Exit when a command fails, outside of tests |
| `-u` | Treat unset variables as errors |
| `-o pipefail` | A pipeline fails if any command in it fails |

Use it on new scripts. On an old script, add it with care and test, because code that relied on carrying on after a failure will now stop.

## Clean-up with trap

A script often leaves things behind: temporary files, a half-written output, a lock. **`trap`** runs a command when the script receives a signal or reaches a certain point. Two are especially useful:

- `trap '...' EXIT` runs when the script ends for any reason: reaching the end, `exit`, a `set -e` failure, or being stopped with Ctrl+C or `kill`.
- `trap '...' ERR` runs whenever a command fails, in the same places `set -e` would act.

```bash
#!/bin/bash
set -euo pipefail

cleanup() {
    echo "Cleaning up"
}
trap cleanup EXIT

echo "Working"
false
echo "Never printed"
```

```bash
root@lab:~/scripts# ./trap-exit.sh
Working
Cleaning up
root@lab:~/scripts# echo $?
1
```

The script failed at `false`, but the clean-up still ran, and the exit status was kept. An ERR trap is handy for saying where a script stopped:

```bash
#!/bin/bash
set -euo pipefail
trap 'echo "$0: failed on line $LINENO" >&2' ERR

echo "Step 1"
ls /no/such/dir
echo "Step 2"
```

```bash
root@lab:~/scripts# ./trap-err.sh
Step 1
ls: cannot access '/no/such/dir': No such file or directory
./trap-err.sh: failed on line 6
```

Put the trap command in single quotes, so that `$LINENO` and other variables are read when the trap runs, not when it is set.

## Temporary files with mktemp

The usual mistake is a fixed name such as `/tmp/report.txt`. Two copies of the script running at once overwrite each other's file, and another user on the machine can create that name first. **`mktemp`** creates a new, empty file with a random name that only you can read, and prints the name:

```bash
root@lab:~/scripts# mktemp
/tmp/tmp.AUVRI3ZFxU
root@lab:~/scripts# mktemp -d
/tmp/tmp.N1lmS7NPEc
root@lab:~/scripts# mktemp /tmp/report.XXXXXX
/tmp/report.n7s1SG
```

`-d` makes a directory, and a template replaces the `X`s with random characters. Pair it with an EXIT trap so it is removed however the script ends:

```bash
#!/bin/bash
# shell-report.sh: count the login shells in use, working in a temporary directory.
set -euo pipefail

workdir=$(mktemp -d)
trap 'rm -rf "$workdir"' EXIT

cut -d: -f7 /etc/passwd > "$workdir/shells"
sort "$workdir/shells" | uniq -c | sort -rn > "$workdir/report"
cat "$workdir/report"
```

```bash
root@lab:~/scripts# ./shell-report.sh
     16 /usr/sbin/nologin
      2 /bin/bash
      1 /bin/sync
```

Run `ls /tmp` afterwards and the directory is gone. Set the trap on the line straight after `mktemp`, before anything that could fail.

## One copy at a time with flock

A script run every five minutes from cron can take longer than five minutes. Then a second copy starts while the first is still working, and both write to the same files. A **lock** prevents this. The `flock` command, part of util-linux and present on Ubuntu, takes a lock on a file; only one process can hold it, and the lock is released automatically when that process exits, even if it crashes.

```bash
#!/bin/bash
# nightly-sync.sh: make sure only one copy runs at a time.
set -euo pipefail

exec 9> /tmp/nightly-sync.lock
if ! flock -n 9; then
    echo "nightly-sync: another copy is running" >&2
    exit 1
fi

echo "Syncing"
sleep 5
echo "Done"
```

- `exec 9> file` opens the lock file on file descriptor 9 for the rest of the script.
- `flock -n 9` takes the lock on it, or fails at once if another process holds it. Without `-n`, it waits.

Start one copy in the background and a second straight after:

```bash
root@lab:~/scripts# ./nightly-sync.sh & sleep 1; ./nightly-sync.sh
[1] 3195
Syncing
nightly-sync: another copy is running
root@lab:~/scripts# Done
```

Avoid the home-made version, `if [ -e lockfile ]; then exit; fi; touch lockfile`. Two copies can both pass the check before either creates the file, and if the script is killed, the file stays and blocks every later run until someone deletes it.

## Safe to run twice

A script is **idempotent** when running it a second time does no harm and changes nothing that is already right. Setup and deploy scripts get re-run all the time: after a failure halfway, by a colleague who is not sure it ran, or by a tool that runs it on every change. Three habits cover most cases.

**Use options that accept "already done".** `mkdir dir` fails if the directory exists; `mkdir -p dir` does not. `rm -f` does not fail on a missing file, and `ln -sfn` replaces an existing link.

**Check before you create.** Appending a line to a file is the classic case:

```bash
echo "alias ll='ls -l'" >> bashrc-sam
```

Run that twice and the line is there twice. Check first:

```bash
line="alias ll='ls -l'"
if ! grep -qxF "$line" bashrc-sam 2> /dev/null; then
    echo "$line" >> bashrc-sam
fi
```

`-x` matches the whole line and `-F` treats the text as plain characters rather than a pattern. The same goes for users (`id name`), packages and services: ask whether it exists, then act.

**Write to a temporary file, then move it into place.** If a script writes straight to `report.txt` and fails halfway, readers see half a file. Write to a temporary file in the same directory and `mv` it over the old one at the end. On the same filesystem, `mv` is **atomic**: other programs see either the whole old file or the whole new one, never a mix. Task 1 uses this.

## Tasks

### Task 1: Replace a report in one step

Write `disk-snapshot.sh`, which saves the output of `df -h /`, with a heading line naming the host and time, to `/tmp/reports/disk.txt`. It must create `/tmp/reports` if needed, build the report in a temporary file in that directory, move it into place at the end, and leave no temporary file behind if anything fails. Run it twice and check there is only one file.

<details>
<summary>Check your work</summary>

```bash
#!/bin/bash
# disk-snapshot.sh: save a disk usage report, replacing the old one in one step.
set -euo pipefail

dir=/tmp/reports
mkdir -p "$dir"

tmp=$(mktemp "$dir/disk.txt.XXXXXX")
trap 'rm -f "$tmp"' EXIT

{
    echo "Disk use on $(hostname) at $(date '+%F %T')"
    df -h /
} > "$tmp"

chmod 644 "$tmp"
mv "$tmp" "$dir/disk.txt"
echo "Wrote $dir/disk.txt"
```

```bash
root@lab:~/scripts# ./disk-snapshot.sh
Wrote /tmp/reports/disk.txt
root@lab:~/scripts# ./disk-snapshot.sh
Wrote /tmp/reports/disk.txt
root@lab:~/scripts# ls -l /tmp/reports
total 4
-rw-r--r-- 1 root root 128 Oct 25 08:40 disk.txt
root@lab:~/scripts# cat /tmp/reports/disk.txt
Disk use on lab at 2026-10-25 08:40:29
Filesystem      Size  Used Avail Use% Mounted on
overlay         453G   18G  412G   5% /
```

The temporary file is made in the same directory as the target so that `mv` is a rename, not a copy. After the `mv`, the trap's `rm -f` finds nothing to delete, which is fine. The `chmod` is there because `mktemp` creates files readable only by their owner. The likely mistake is `mktemp` with no template, which puts the file in `/tmp`; that works here only because the target is under `/tmp` too.

</details>

### Task 2: An idempotent setup script

Write `setup-app.sh`, which prepares a machine for an app:

1. Creates a system user `app` with no home directory, unless it already exists.
2. Creates `/opt/app/releases` and `/opt/app/logs`, and makes `app` the owner of `logs`.
3. Writes a default `/opt/app/app.conf` with `port=8080` and `log_dir=/opt/app/logs`, but never overwrites one that exists.

It should print what it did, and running it a second time should change nothing and succeed.

<details>
<summary>Check your work</summary>

```bash
#!/bin/bash
# setup-app.sh: prepare a server for the app. Safe to run more than once.
set -euo pipefail

app_user=app
base=/opt/app
conf=$base/app.conf

if id "$app_user" > /dev/null 2>&1; then
    echo "User $app_user already exists"
else
    useradd --system --no-create-home "$app_user"
    echo "Created user $app_user"
fi

mkdir -p "$base/releases" "$base/logs"
chown "$app_user:" "$base/logs"

if [ -e "$conf" ]; then
    echo "Keeping existing $conf"
else
    printf 'port=8080\nlog_dir=%s/logs\n' "$base" > "$conf"
    echo "Wrote default $conf"
fi

echo "Setup complete"
```

```bash
root@lab:~/scripts# ./setup-app.sh
Created user app
Wrote default /opt/app/app.conf
Setup complete
root@lab:~/scripts# ./setup-app.sh
User app already exists
Keeping existing /opt/app/app.conf
Setup complete
root@lab:~/scripts# ls -l /opt/app
total 12
-rw-r--r-- 1 root root   32 Oct 25 08:40 app.conf
drwxr-xr-x 2 app  app  4096 Oct 25 08:40 logs
drwxr-xr-x 2 root root 4096 Oct 25 08:40 releases
```

The usual mistake is `useradd` with no check: the second run fails with `useradd: user 'app' already exists`, and under `set -e` the script stops there. `chown` can run every time because setting the same owner again changes nothing. Keeping an existing config matters most: someone may have edited it since the first run.

</details>

## Quiz

**1. What does this script print, and what is its exit status?**

```bash
#!/bin/bash
set -euo pipefail
trap 'echo "bye"' EXIT
echo "start"
grep -q nothing /etc/hostname
echo "end"
```

<details>
<summary>Show answer</summary>

```
start
bye
```

The exit status is 1. grep finds no match and exits with 1, `set -e` stops the script, and the EXIT trap still runs on the way out.

</details>

**2. A script has `set -e` at the top, and its function `backup()` runs `tar` and then `echo "backup ok"`. It is called as `if backup; then ...`. tar fails, but the script reports success. Why?**

<details>
<summary>Show answer</summary>

`set -e` is ignored inside anything being tested by `if`, including every command in a function called from the condition. tar's failure is passed over, and the function returns the status of its last command, the `echo`. Check tar explicitly inside the function, for example `tar ... || return 1`, or call `backup` on its own line rather than in an `if`.

</details>

**3. A script on a server runs from cron every minute and processes files in a queue folder. Sometimes it takes three minutes, and files get processed twice. What would you add?**

<details>
<summary>Show answer</summary>

A lock, so a new run exits when the previous one is still going: `exec 9> /tmp/queue.lock` and `flock -n 9 || exit 0` near the top. The lock is released when the script exits, even if it crashes. Exiting with 0 is reasonable here, because a skipped run is expected and not an error.

</details>

**4. Why is `mv` of a finished temporary file better than writing straight to the target, and what condition does it need?**

<details>
<summary>Show answer</summary>

Writing straight to the target means a reader, or a later step, can see a half-written file, and a failure leaves it half-written. A `mv` within one filesystem is atomic: the old file is replaced by the complete new one in one step. The temporary file must be on the same filesystem as the target, so create it in the same directory, for example with `mktemp "$dir/name.XXXXXX"`.

</details>

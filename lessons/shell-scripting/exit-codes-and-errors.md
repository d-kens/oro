Every command you run reports back whether it worked. It does this with a small number called its **exit status**. A script that ignores these numbers carries on after a failure as if nothing happened, and a script that sets them carelessly tells cron, a monitor or another script that all is well when it is not.

This topic is about reading, checking and setting exit statuses. By the end you can check whether a command worked, react to failure with `&&`, `||` and `if`, send error messages to the right place, and exit with a code that means something.

## Every command has an exit status

When a command finishes, it hands the shell a number from 0 to 255. **0 means success. Anything else means failure.** The shell keeps the status of the last command in the special variable `$?`.

```bash
#!/bin/bash
# status.sh: show the exit status of a few commands.
ls /etc/hostname > /dev/null
echo "ls of a file that exists: $?"
ls /no/such/file 2> /dev/null
echo "ls of a missing file: $?"
echo "and \$? now: $?"
```

```bash
root@lab:~/scripts# ./status.sh
ls of a file that exists: 0
ls of a missing file: 2
and $? now: 0
```

The last line is the trap to remember: `$?` is replaced after *every* command, including `echo`. By the third line it holds the status of the `echo` before it, which worked. If you need a status later, copy it into a variable straight away, for example `status=$?`.

Zero for success can feel backwards. It makes sense once you see that there is one way to succeed and many ways to fail, and the non-zero values can say which. Some codes are used by the shell itself:

| Code | Meaning |
| --- | --- |
| 0 | Success |
| 1 | General failure; the most common error code |
| 2 | Wrong usage, such as a bad option or a missing file for `ls` and `grep` |
| 126 | The file was found but could not be run, usually no execute permission |
| 127 | Command not found |
| 130 | Stopped with Ctrl+C |
| 128 + n | Killed by signal number n: 143 is SIGTERM (15), 137 is SIGKILL (9) |

You can see several of them at the prompt:

```bash
root@lab:~/scripts# nosuchcmd
bash: nosuchcmd: command not found
root@lab:~/scripts# echo $?
127
root@lab:~/scripts# printf 'echo hi\n' > noexec.sh
root@lab:~/scripts# ./noexec.sh
bash: ./noexec.sh: Permission denied
root@lab:~/scripts# echo $?
126
```

130 is 128 plus 2, the number of SIGINT, the signal Ctrl+C sends. The Linux skill's *Processes* topic lists the signals.

## Checking whether a command worked

`if` does not need `[ ]`. It runs any command and takes the *then* branch when that command exits with 0. So the cleanest check is to put the command itself after `if`:

```bash
#!/bin/bash
# copy-config.sh: copy a config file into place, or say why not.
src=$1

if cp "$src" /tmp/app.conf; then
    echo "Copied $src"
else
    echo "Could not copy $src"
fi
```

```bash
root@lab:~/scripts# ./copy-config.sh app.log
Copied app.log
root@lab:~/scripts# ./copy-config.sh missing.conf
cp: cannot stat 'missing.conf': No such file or directory
Could not copy missing.conf
```

Use `if ! cmd; then` to act only on failure. The common mistake is to run the command, then test `$?` a few lines later, after something else has replaced it:

```bash
#!/bin/bash
cp "$1" /tmp/app.conf
echo "Copying $1"
if [ $? -ne 0 ]; then
    echo "Copy failed"
fi
```

```bash
root@lab:~/scripts# ./wrong-check.sh missing.conf
cp: cannot stat 'missing.conf': No such file or directory
Copying missing.conf
```

The `if` tested the `echo`, which worked, so the failure was never reported. `if cp ...; then` cannot go wrong this way.

For short checks, two operators do the same job on one line:

- `a && b` runs `b` only if `a` succeeded.
- `a || b` runs `b` only if `a` failed.

```bash
mkdir -p /tmp/backups && echo "Backup folder ready"
cd /no/such/dir || echo "Could not enter the folder"
```

Be careful with `a && b || c`. It looks like if-then-else, but `c` also runs when `a` worked and `b` failed:

```bash
root@lab:~/scripts# true && false || echo "This runs too"
This runs too
```

When the middle command can fail, write a real `if`.

## Errors belong on stderr

Every process has two output streams: **stdout** for its normal output and **stderr** for messages about problems. Both appear on your terminal, so the difference is easy to miss until the output is piped or captured. Here is a script that writes its error to stdout:

```bash
#!/bin/bash
# count-users.sh: print how many lines a file has.
file=$1
if [ ! -r "$file" ]; then
    echo "Cannot read $file"
    exit 1
fi
wc -l < "$file"
```

```bash
root@lab:~/scripts# n=$(./count-users.sh nope.txt)
root@lab:~/scripts# echo "Users: $n"
Users: Cannot read nope.txt
```

The error message became the data. Send it to stderr with `>&2`, which means "send this command's stdout to wherever stderr goes":

```bash
    echo "count-users: cannot read $file" >&2
```

```bash
root@lab:~/scripts# n=$(./count-users.sh nope.txt)
count-users: cannot read nope.txt
root@lab:~/scripts# echo "Users: $n"
Users: 
```

Now the message reaches the person at the terminal, and the variable stays empty instead of holding text that looks like a result. The rule is simple: results to stdout, everything else to stderr. Start each error with the script's name, so that when several scripts run together, as they do under cron, you can tell which one complained.

## Stopping with a message: the die pattern

Most checks in a script have the same shape: try something, and if it fails, print an error and stop. The `||` operator with a group in `{ }` does that in one line:

```bash
cd "$dest" || { echo "cannot enter $dest" >&2; exit 1; }
```

The spaces inside the braces and the `;` before `}` are required. Do not use `( )` here: parentheses run their contents in a subshell, so `exit` leaves the subshell and the script keeps going.

When a script has many of these, give the pattern a name. A function called `die` is the usual choice:

```bash
#!/bin/bash
# backup-etc.sh: archive /etc into a backup folder.

die() {
    echo "$(basename "$0"): $*" >&2
    exit 1
}

dest=${1:-/tmp/backups}

mkdir -p "$dest" || die "cannot create $dest"
cd "$dest" || die "cannot enter $dest"
tar -czf "etc-$(date +%F).tar.gz" /etc 2> /dev/null || die "tar failed"
echo "Saved $dest/etc-$(date +%F).tar.gz"
```

```bash
root@lab:~/scripts# ./backup-etc.sh
Saved /tmp/backups/etc-2026-10-25.tar.gz
root@lab:~/scripts# ./backup-etc.sh /proc/x
mkdir: cannot create directory '/proc/x': No such file or directory
backup-etc.sh: cannot create /proc/x
root@lab:~/scripts# echo $?
1
```

Each step either works or stops the script with a clear reason. The *Functions* topic explains why `exit` inside a function ends the whole script while `return` would not.

## Exiting with the right code

A script's own exit status is set by `exit n`. Without an `exit`, a script exits with the status of the **last command it ran**. That is often an `echo`, which hides a failure further up:

```bash
#!/bin/bash
# cleanup.sh: delete old logs, then report.
rm /var/log/app/*.old
echo "Clean-up finished"
```

```bash
root@lab:~/scripts# ./cleanup.sh
rm: cannot remove '/var/log/app/*.old': No such file or directory
Clean-up finished
root@lab:~/scripts# echo $?
0
```

Cron, a CI pipeline or a monitoring check would record this run as a success. Check the commands that matter and exit with a non-zero code when they fail. Some habits:

- Use `exit 1` for "it failed" and `exit 2` for "you called me wrongly", as many standard tools do.
- If your script has several distinct failures a caller might act on differently, document the codes in the comment at the top.
- Stay between 0 and 255. Exit codes wrap around, so `exit 256` is the same as `exit 0`, and `exit 300` gives 44.
- Avoid 126, 127 and 128 upwards for your own errors, because they already mean something.

## Pipelines and PIPESTATUS

The exit status of a pipeline is the status of its **last** command. A failure earlier in the pipe is lost:

```bash
#!/bin/bash
grep ERROR /no/such/app.log | sort | uniq -c
echo "status: $?"
grep ERROR /no/such/app.log | sort | uniq -c
echo "PIPESTATUS: ${PIPESTATUS[*]}"
```

```bash
root@lab:~/scripts# ./pipes.sh
grep: /no/such/app.log: No such file or directory
status: 0
grep: /no/such/app.log: No such file or directory
PIPESTATUS: 2 0 0
```

`grep` failed with 2, but `uniq` worked, so the pipeline reported 0. Bash keeps every command's status from the most recent pipeline in the array `PIPESTATUS`, one entry per command, left to right. Like `$?`, it is replaced by the next command, so read it immediately. The *Robust scripts* topic shows `set -o pipefail`, which makes a pipeline fail when any part of it fails.

## Worked example: grep's three answers

`grep` uses its exit status to say more than "worked" or "failed":

| Status | Meaning |
| --- | --- |
| 0 | At least one line matched |
| 1 | No line matched; not an error |
| 2 | Something went wrong, such as a missing file or a bad pattern |

```bash
root@lab:~/scripts# grep ERROR app.log
ERROR disk full
root@lab:~/scripts# echo $?
0
root@lab:~/scripts# grep WARN app.log
root@lab:~/scripts# echo $?
1
root@lab:~/scripts# grep ERROR nofile.log
grep: nofile.log: No such file or directory
root@lab:~/scripts# echo $?
2
```

This is why `if grep -q ERROR app.log; then` reads so naturally: `-q` prints nothing and only sets the status. It also shows why "non-zero" does not always mean "broken". For grep, 1 is a normal answer. A script that treats every non-zero status from grep as an error will stop when a log is simply clean. Task 2 uses all three outcomes.

## Tasks

### Task 1: Check that required commands exist

Write `need.sh`, which takes any number of command names as arguments. For each one that is not installed, it prints `need: NAME is not installed` to stderr. If any are missing it exits with 1; otherwise it prints `All N commands found` and exits with 0. Use `command -v`, which exits with 0 when a command exists. Try it with `./need.sh tar curl jq`.

<details>
<summary>Check your work</summary>

```bash
#!/bin/bash
# need.sh: check that every command named on the command line is installed.
# Usage: ./need.sh command...

missing=0

for cmd in "$@"; do
    if ! command -v "$cmd" > /dev/null; then
        echo "need: $cmd is not installed" >&2
        missing=$((missing + 1))
    fi
done

if [ "$missing" -gt 0 ]; then
    exit 1
fi
echo "All $# commands found"
```

```bash
root@lab:~/scripts# ./need.sh tar curl jq
need: curl is not installed
need: jq is not installed
root@lab:~/scripts# echo $?
1
root@lab:~/scripts# ./need.sh tar grep
All 2 commands found
root@lab:~/scripts# echo $?
0
```

The base Ubuntu image has no curl or jq, so your output should match. A common mistake is to `exit 1` inside the loop at the first missing command, which hides the others; checking them all and failing at the end tells the user everything to install in one go. Another is to forget `> /dev/null`, which prints the path of every command that was found.

</details>

### Task 2: A log check a monitor can use

Write `log-check.sh FILE`, which looks for lines containing `ERROR`:

- No ERROR lines: print `FILE: no errors` and exit 0.
- ERROR lines found: print `FILE: N ERROR lines` and exit 1.
- The file cannot be read, or no argument given: print a message to stderr and exit 2.

Use the exit status of `grep -c`, which prints the number of matching lines. Make two test files: `app.log` with two ERROR lines and `clean.log` with none.

<details>
<summary>Check your work</summary>

```bash
#!/bin/bash
# log-check.sh: report ERROR lines in a log file.
# Exit 0: no errors. Exit 1: errors found. Exit 2: the file could not be read.
# Usage: ./log-check.sh file

file=$1

if [ $# -ne 1 ]; then
    echo "Usage: $0 file" >&2
    exit 2
fi

count=$(grep -c ERROR "$file")
status=$?

case $status in
    0)
        echo "$file: $count ERROR lines"
        exit 1
        ;;
    1)
        echo "$file: no errors"
        exit 0
        ;;
    *)
        echo "log-check: could not read $file" >&2
        exit 2
        ;;
esac
```

```bash
root@lab:~/scripts# printf 'INFO start\nERROR disk full\nERROR disk full\nINFO stop\n' > app.log
root@lab:~/scripts# printf 'INFO start\nINFO stop\n' > clean.log
root@lab:~/scripts# ./log-check.sh app.log; echo "exit: $?"
app.log: 2 ERROR lines
exit: 1
root@lab:~/scripts# ./log-check.sh clean.log; echo "exit: $?"
clean.log: no errors
exit: 0
root@lab:~/scripts# ./log-check.sh nope.log; echo "exit: $?"
grep: nope.log: No such file or directory
log-check: could not read nope.log
exit: 2
```

The exit status of `count=$(grep ...)` is grep's status, so `status=$?` on the very next line catches it. The likely mistake is putting an `echo` between the two lines, after which `$?` is 0 every time. Note that here "errors found" is exit 1, not 0: the script's job is to answer "is this log healthy", and a monitor treats non-zero as "not healthy".

</details>

## Quiz

**1. What does this script print?**

```bash
#!/bin/bash
ls /no/such/dir 2> /dev/null
echo "first: $?"
echo "second: $?"
false && echo "A" || echo "B"
```

<details>
<summary>Show answer</summary>

```
first: 2
second: 0
B
```

`ls` fails with 2. The first `echo` succeeds, so the second one sees 0. `false` fails, so `echo "A"` is skipped and `|| echo "B"` runs.

</details>

**2. A script on a server runs from cron every night. It copies files with `rsync` and its last line is `echo "Sync done at $(date)"`. Last week rsync failed for three nights and nobody was told, even though cron is set up to alert on a non-zero exit. Why, and how do you fix it?**

<details>
<summary>Show answer</summary>

A script exits with the status of its last command, and the `echo` always works, so every run exited with 0. Check rsync and exit non-zero when it fails, for example `rsync ... || { echo "sync: rsync failed" >&2; exit 1; }`, before the final `echo`.

</details>

**3. You run `deploy` and then `echo $?`, and see 127. A colleague's run of the same script shows 126. What does each code tell you?**

<details>
<summary>Show answer</summary>

127 means the command was not found: it is not in `PATH`, or the name is misspelled. 126 means the file was found but could not be run, usually because it lacks the execute permission. The fixes are different: check `PATH` for the first, `chmod +x` for the second.

</details>

**4. `curl -s https://example.com/data.csv | grep -c ok` prints `0`, and `echo $?` prints 1. How do you find out whether curl itself worked?**

<details>
<summary>Show answer</summary>

`$?` holds the status of grep, the last command in the pipeline; 1 just means no line matched. Check `${PIPESTATUS[0]}` immediately after the pipeline to get curl's status, or turn on `set -o pipefail` so any failing part of the pipe makes the whole pipeline fail.

</details>

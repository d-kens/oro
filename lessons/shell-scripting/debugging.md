Shell scripts fail in quiet ways. A file name with a space splits into two words, a variable is empty when you thought it was set, a test compares text when you meant numbers. The script often finishes and prints a cheerful message, and the problem shows up later somewhere else.

This topic gives you the tools to see what a script is actually doing. By the end you can check a script's syntax without running it, trace every command it runs with line numbers, use ShellCheck to find bugs before they happen, and follow a steady method to track a fault down to one line.

## Read the error, then check the syntax

Start with the message Bash gives you. It names the script and the line, and that is usually where to look first:

```bash
root@lab:~/scripts# ./backup-home.sh nosuch
./backup-home.sh: line 6: cd: /home/nosuch: No such file or directory
```

Syntax errors are different, because the line number can point well past the real mistake. This script is missing its `fi`:

```bash
#!/bin/bash
# check-disk.sh: warn when the root filesystem is nearly full.
used=$(df --output=pcent / | tail -n 1 | tr -dc '0-9')
if [ "$used" -gt 80 ]; then
    echo "Disk is ${used}% full"
else
    echo "Disk is fine"
```

**`bash -n`** reads a script and checks its syntax without running any of it:

```bash
root@lab:~/scripts# bash -n check-disk.sh
check-disk.sh: line 8: syntax error: unexpected end of file
root@lab:~/scripts# echo $?
2
```

The script has seven lines. "Unexpected end of file" means Bash reached the end while still waiting for something to be closed: a `fi`, `done`, `esac`, `}` or a quote. Look back from the end for the block that was opened and never closed. `bash -n` is quick and safe, so it is worth running before you try a script that deletes or moves things. It does not catch mistakes in logic, only in grammar.

## Tracing with set -x

**`set -x`** makes Bash print each command just before it runs it, after variables and substitutions have been expanded. You see what the script really did, not what you meant it to do.

Here is a script that should move week-old `.log` files into an archive folder. It has bugs:

```bash
#!/bin/bash
# archive-logs.sh: move .log files older than a week into an archive folder.

src=$1
dest=/tmp/archive

archive_one() {
    local name=$(basename $1)
    mv $1 $dest/$name.old
}

cd $src
mkdir -p $dest
for f in $(find . -name "*.log" -mtime +7); do
    archive_one $f
done
echo "Archived logs from $src to $dest"
```

Make some test logs, two of them backdated by ten days with `touch -d`, and run it:

```bash
root@lab:~/scripts# mkdir -p /var/log/app && cd /var/log/app
root@lab:/var/log/app# touch -d "10 days ago" api.log "web 01.log" && touch new.log
root@lab:/var/log/app# cd ~/scripts
root@lab:~/scripts# ./archive-logs.sh /var/log/app
mv: cannot stat './web': No such file or directory
mv: cannot stat '01.log': No such file or directory
Archived logs from /var/log/app to /tmp/archive
```

Run it again under tracing with **`bash -x`**, which turns on `set -x` for the whole run without editing the file. Recreate the test files first, since `api.log` has already moved:

```bash
root@lab:~/scripts# bash -x ./archive-logs.sh /var/log/app
+ src=/var/log/app
+ dest=/tmp/archive
+ cd /var/log/app
+ mkdir -p /tmp/archive
++ find . -name '*.log' -mtime +7
+ for f in $(find . -name "*.log" -mtime +7)
+ archive_one ./api.log
++ basename ./api.log
+ local name=api.log
+ mv ./api.log /tmp/archive/api.log.old
+ for f in $(find . -name "*.log" -mtime +7)
+ archive_one ./web
++ basename ./web
+ local name=web
+ mv ./web /tmp/archive/web.old
mv: cannot stat './web': No such file or directory
+ for f in $(find . -name "*.log" -mtime +7)
+ archive_one 01.log
...
```

Each `+` line is a command; `++` means it ran inside a command substitution. The trace shows the problem directly: the loop got `./web` and `01.log` as two separate values. The unquoted `$(find ...)` was split on the space in `web 01.log`, exactly the word splitting the *Shell variables* topic warned about.

### Line numbers in the trace

The `+` at the start of each line comes from the variable **`PS4`**. Set it to include `$LINENO` and every traced line says where it came from. Put it in single quotes, so the line number is filled in as each command runs:

```bash
PS4='+ line ${LINENO}: '
```

Bash does not take `PS4` from the environment when you are root, so set it inside the script, near the top.

### Tracing part of a script

A full trace of a long script is hard to read. Turn tracing on just before the part you suspect with `set -x`, and off again with `set +x`:

```bash
cd $src
mkdir -p $dest
set -x
for f in $(find . -name "*.log" -mtime +7); do
    archive_one $f
done
set +x
echo "Archived logs from $src to $dest"
```

```bash
root@lab:~/scripts# ./archive-logs.sh /var/log/app
++ line 16: find . -name '*.log' -mtime +7
+ line 16: for f in $(find . -name "*.log" -mtime +7)
+ line 17: archive_one ./api.log
++ line 9: basename ./api.log
+ line 9: local name=api.log
+ line 10: mv ./api.log /tmp/archive/api.log.old
+ line 16: for f in $(find . -name "*.log" -mtime +7)
+ line 17: archive_one ./web
++ line 9: basename ./web
+ line 9: local name=web
+ line 10: mv ./web /tmp/archive/web.old
mv: cannot stat './web': No such file or directory
...
+ line 19: set +x
Archived logs from /var/log/app to /tmp/archive
```

The trace goes to stderr, so `./script.sh 2> trace.txt` saves it to a file while normal output stays on the screen. Take tracing out again when you are done: it prints the values of every variable, including any secrets.

## ShellCheck

**ShellCheck** reads a script and points out mistakes that Bash itself accepts: missing quotes, unchecked `cd`, tests that compare the wrong way. It is the closest thing the shell has to a compiler warning, and it would have found every bug in `archive-logs.sh` before it ran. Install it in the container:

```bash
root@lab:~/scripts# apt update && apt install -y shellcheck
```

Run it on the script:

```bash
root@lab:~/scripts# shellcheck archive-logs.sh

In archive-logs.sh line 8:
    local name=$(basename $1)
          ^--^ SC2155 (warning): Declare and assign separately to avoid masking return values.
                          ^-- SC2086 (info): Double quote to prevent globbing and word splitting.

Did you mean: 
    local name=$(basename "$1")


In archive-logs.sh line 9:
    mv $1 $dest/$name.old
       ^-- SC2086 (info): Double quote to prevent globbing and word splitting.
                ^---^ SC2086 (info): Double quote to prevent globbing and word splitting.

Did you mean: 
    mv "$1" $dest/"$name".old


In archive-logs.sh line 12:
cd $src
^-----^ SC2164 (warning): Use 'cd ... || exit' or 'cd ... || return' in case cd fails.
   ^--^ SC2086 (info): Double quote to prevent globbing and word splitting.

Did you mean: 
cd "$src" || exit


In archive-logs.sh line 14:
for f in $(find . -name "*.log" -mtime +7); do
         ^-- SC2044 (warning): For loops over find output are fragile. Use find -exec or a while read loop.
...
```

Every warning has a code, and each code has a page on the ShellCheck wiki at `https://www.shellcheck.net/wiki/SC2086` and so on. The ones here come up in almost every script:

| Code | What it means | Fix |
| --- | --- | --- |
| SC2086 | An unquoted variable will be split on spaces and expanded as a glob | Put double quotes round it: `"$1"` |
| SC2164 | `cd` might fail, and the script would carry on in the wrong directory | `cd "$dir" \|\| exit 1` |
| SC2155 | `local x=$(cmd)` hides `cmd`'s exit status behind that of `local` | `local x` on one line, `x=$(cmd)` on the next |
| SC2044 | Looping over `$(find ...)` splits names with spaces | Use `find -print0` with a `while read` loop |
| SC2006 | Backticks are the old form of command substitution | Use `$(...)` |
| SC2071 | `>` inside `[ ]` compares as text, or redirects | Use `-gt` |

The "Did you mean" suggestions are a start, not always the best fix. For `mv $1 $dest/$name.old` it quotes only the parts it is sure of; quoting the whole path, `"$dest/$name.old"`, is clearer. Here is the script with every warning dealt with:

```bash
#!/bin/bash
# archive-logs.sh: move .log files older than a week into an archive folder.
set -euo pipefail

src=$1
dest=/tmp/archive

archive_one() {
    local name
    name=$(basename "$1")
    mv "$1" "$dest/$name.old"
}

cd "$src" || exit 1
mkdir -p "$dest"
find . -name "*.log" -mtime +7 -print0 | while IFS= read -r -d '' f; do
    archive_one "$f"
done
echo "Archived logs from $src to $dest"
```

```bash
root@lab:~/scripts# shellcheck archive-logs.sh
root@lab:~/scripts# ./archive-logs.sh /var/log/app
Archived logs from /var/log/app to /tmp/archive
root@lab:~/scripts# ls /tmp/archive
api.log.old  'web 01.log.old'
```

No output from ShellCheck means no warnings. `-print0` ends each name with a null character, which cannot appear in a file name, and `read -d ''` splits on it, so names with spaces stay whole. The *Loops* topic covers `while read`.

Sometimes a warning is wrong for your case. Silence that one line with a comment directly above it, such as `# shellcheck disable=SC2086`, and add a few words on why. Do not silence warnings just to get a clean run. Most editors can run ShellCheck as you type, which catches these mistakes as you write them.

## Printing your own debug messages

Sometimes you want to see one value at one point, not a full trace. An `echo` does the job, but send it to stderr with `>&2`, so it does not mix with the script's real output or end up in a file or a pipe. A small `debug` function that only prints when you ask for it can stay in the script:

```bash
#!/bin/bash
# sum-sizes.sh: add up the sizes of the .conf files in a folder.

debug() {
    if [ "${DEBUG:-0}" = 1 ]; then
        echo "DEBUG: $*" >&2
    fi
}

total=0
for f in "${1:-/etc}"/*.conf; do
    size=$(stat -c %s "$f")
    debug "$f is $size bytes"
    total=$((total + size))
done
echo "Total: $total bytes"
```

```bash
root@lab:~/scripts# ./sum-sizes.sh
Total: 11455 bytes
root@lab:~/scripts# DEBUG=1 ./sum-sizes.sh
DEBUG: /etc/debconf.conf is 2967 bytes
DEBUG: /etc/e2scrub.conf is 685 bytes
DEBUG: /etc/gai.conf is 2584 bytes
...
DEBUG: /etc/xattr.conf is 681 bytes
Total: 11455 bytes
root@lab:~/scripts# DEBUG=1 ./sum-sizes.sh 2> /dev/null
Total: 11455 bytes
```

`DEBUG=1 ./sum-sizes.sh` sets the variable for that one run. The mistake to avoid is debug `echo`s on stdout: in a script whose output is captured with `$( )`, they become part of the result and cause a second bug while you hunt the first.

## A method that works

Staring at a script rarely finds the bug. A steady routine does:

1. **Reproduce it.** Find the exact command and input that make it go wrong, and check that it goes wrong every time. Note the exit status as well as the output. If it only fails under cron, copy cron's environment, which the *Real-world scripts* topic covers.
2. **Shrink it.** Cut the input down, and comment out or copy out parts of the script, until you have the smallest case that still fails. In `archive-logs.sh`, one file called `web 01.log` is enough; the other files add nothing.
3. **Trace it.** Run the small case with `bash -x`, or with `set -x` round the suspect part, and compare what each line actually did with what you expected. The first line where they differ is where the bug is.

Run `bash -n` and `shellcheck` before any of this. They take a second and find a large share of shell bugs on their own.

## Tasks

### Task 1: Find the bug with a trace

This script should warn only when more than five accounts use Bash as their login shell:

```bash
#!/bin/bash
# user-count.sh: warn when more than 5 users can log in with Bash.
count=$(grep -c '/bin/bash$' /etc/passwd)
if [ $count > 5 ]; then
    echo "Warning: $count login users"
else
    echo "OK: $count login users"
fi
```

Save and run it. It prints `Warning: 2 login users`, and a new file appears in `~/scripts`. Use `bash -x` to find out why, then fix it.

<details>
<summary>Check your work</summary>

```bash
root@lab:~/scripts# bash -x ./user-count.sh
++ grep -c '/bin/bash$' /etc/passwd
+ count=2
+ '[' 2 ']'
+ echo 'Warning: 2 login users'
Warning: 2 login users
root@lab:~/scripts# ls
5  user-count.sh
```

The trace shows that the test was only `[ 2 ]`. Inside `[ ]`, `>` is not "greater than"; it is a redirection, so the output of `[` went to a file called `5`. `[ 2 ]` is true because the string is not empty. ShellCheck reports this as SC2071. Use `-gt` for numbers, and quote the variable:

```bash
#!/bin/bash
# user-count.sh: warn when more than 5 users can log in with Bash.
count=$(grep -c '/bin/bash$' /etc/passwd)
if [ "$count" -gt 5 ]; then
    echo "Warning: $count login users"
else
    echo "OK: $count login users"
fi
```

```bash
root@lab:~/scripts# rm 5
root@lab:~/scripts# ./user-count.sh
OK: 2 login users
```

`[[ $count > 5 ]]` would not redirect, but it would compare as text, so `10` would count as smaller than `5`. The *Conditionals* topic has the full list of number and text tests.

</details>

### Task 2: Make ShellCheck happy

This backup script runs without errors in a quick test, but has several problems:

```bash
#!/bin/bash
# backup-home.sh: archive a user's home directory.
user=$1
backup_dir=/tmp/backups
stamp=`date +%F`
cd /home/$user
tar -czf $backup_dir/$user-$stamp.tar.gz .
echo "Saved $backup_dir/$user-$stamp.tar.gz"
```

Run `shellcheck` on it and fix every warning. Then try `./backup-home.sh ubuntu` (the image has an `ubuntu` user) and `./backup-home.sh nosuch` with both versions, and explain what the old one did wrong.

<details>
<summary>Check your work</summary>

ShellCheck reports SC2006 for the backticks, SC2164 for the `cd`, and SC2086 for the unquoted variables. A fixed version, with the safety header from the *Robust scripts* topic and a `mkdir -p` that the original was missing:

```bash
#!/bin/bash
# backup-home.sh: archive a user's home directory.
set -euo pipefail

user=$1
backup_dir=/tmp/backups
stamp=$(date +%F)

mkdir -p "$backup_dir"
cd "/home/$user" || exit 1
tar -czf "$backup_dir/$user-$stamp.tar.gz" .
echo "Saved $backup_dir/$user-$stamp.tar.gz"
```

```bash
root@lab:~/scripts# shellcheck backup-home.sh
root@lab:~/scripts# ./backup-home.sh ubuntu
Saved /tmp/backups/ubuntu-2026-10-25.tar.gz
root@lab:~/scripts# ./backup-home.sh nosuch
./backup-home.sh: line 10: cd: /home/nosuch: No such file or directory
root@lab:~/scripts# echo $?
1
```

The old version had two serious faults. Without `/tmp/backups`, tar failed but the script still printed `Saved ...` and exited with 0. With a user that does not exist, `cd` failed, and tar then archived the current directory, `~/scripts`, under the name `nosuch-2026-10-25.tar.gz`. ShellCheck's SC2164 warning was pointing straight at that second fault.

</details>

## Quiz

**1. What does `bash -n deploy.sh` do, and what will it not catch?**

<details>
<summary>Show answer</summary>

It reads the script and checks the syntax without running any command, so it is safe on any script. It reports grammar errors such as a missing `fi`, `done` or closing quote. It will not catch logic errors: a wrong path, a missing quote round a variable, or a test that compares the wrong way all pass `bash -n`.

</details>

**2. What does this script print on stderr when run with `bash -x`?**

```bash
#!/bin/bash
name="web 01"
echo $name
```

<details>
<summary>Show answer</summary>

```
+ name='web 01'
+ echo web 01
```

The second trace line shows `echo` receiving two words, `web` and `01`, because `$name` was not quoted. Quoted, it would show `+ echo 'web 01'`, one argument. The script's normal output, `web 01`, goes to stdout.

</details>

**3. A script on a server works when you run it by hand, but the nightly run leaves a half-finished result. You add `set -x` at the top. Where does the trace go, and how do you keep it?**

<details>
<summary>Show answer</summary>

The trace goes to stderr. Under cron, keep it by redirecting stderr to a file in the cron line, for example `... >> /var/log/nightly.log 2>&1`, or with `exec 2>> /tmp/nightly-trace.log` near the top of the script. Then compare the trace with a run by hand. Remove the tracing afterwards, because it writes every variable's value to the log.

</details>

**4. ShellCheck reports SC2155 on `local today=$(date +%F)`. Why does it matter, and how do you fix it?**

<details>
<summary>Show answer</summary>

The exit status of that line is the status of `local`, which is always 0, so a failure of the command inside `$( )` is hidden, even with `set -e`. Split it in two:

```bash
local today
today=$(date +%F)
```

</details>

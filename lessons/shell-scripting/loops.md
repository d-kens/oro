Most of the work scripts save is repetition: the same check on ten servers, the same command on every log file, the same line of processing for each row of a file. **Loops** run a block of commands many times, once per item or until a condition changes.

This topic covers Bash's three loops, `for`, `while` and `until`, and the two commands that steer them, `break` and `continue`. By the end you can loop over a list, over files and over the lines of a file or a command's output, retry a command until it works, and avoid the loops that break on file names with spaces.

## for over a list

A `for` loop sets a variable to each word in a list in turn and runs the body once for each:

```bash
#!/bin/bash
# check-list.sh: go through a fixed list of servers.
for host in web-01 web-02 db-01; do
    echo "Checking $host"
done
echo "Done"
```

```bash
root@lab:~/scripts# ./check-list.sh
Checking web-01
Checking web-02
Checking db-01
Done
```

- `for name in list; do` starts the loop. The variable name has no `$` here, because you are setting it.
- The body runs once per word, with `$host` set to that word.
- `done` ends the loop.

Bash can also make the list for you. `{1..5}` expands to `1 2 3 4 5`, so `for n in {1..3}` runs three times, and `web-0{1..3}` gives `web-01 web-02 web-03`.

A common mistake is putting the list in a variable and quoting it:

```bash
#!/bin/bash
hosts="web-01 web-02"
for host in "$hosts"; do
    echo "Checking $host"
done
```

```bash
root@lab:~/scripts# ./check-list.sh
Checking web-01 web-02
```

The quotes stop word splitting, so the loop ran once with the whole string. Leaving `$hosts` unquoted would work here, but it breaks as soon as an item contains a space or a `*`. The right way to keep a list in a variable is an array, which the *Arrays* topic covers.

## for over files

A glob such as `*.log` in a `for` list expands to the matching file names, each as one item, spaces and all:

```bash
#!/bin/bash
# log-sizes.sh: show the size of each log file in this folder.
for file in *.log; do
    echo "$file: $(wc -c < "$file") bytes"
done
```

```bash
root@lab:~/scripts# ./log-sizes.sh
app.log: 2 bytes
error log.log: 12 bytes
```

`error log.log` came through as one name. Inside the loop it must still be quoted, `"$file"`, or the space splits it again.

There is a catch when nothing matches. Bash then leaves the pattern as it is, and the loop runs once with the text `*.log`:

```bash
root@lab:~/scripts# cd /tmp && ~/scripts/log-sizes.sh
/root/scripts/log-sizes.sh: line 4: *.log: No such file or directory
*.log:  bytes
```

There are two usual fixes. Skip any item that does not exist:

```bash
for file in *.log; do
    [[ -e $file ]] || continue
    echo "$file: $(wc -c < "$file") bytes"
done
```

Or turn on the `nullglob` option near the top of the script, so a pattern that matches nothing expands to nothing and the loop does not run at all:

```bash
shopt -s nullglob
for file in *.log; do
    echo "$file: $(wc -c < "$file") bytes"
done
```

### Why not loop over $(ls)

You will see loops like this in older scripts:

```bash
#!/bin/bash
for file in $(ls); do
    echo "Found: $file"
done
```

```bash
root@lab:~/scripts/t# ./found.sh
Found: notes.txt
Found: sales
Found: report.csv
```

The folder holds `notes.txt` and `sales report.csv`. `$(ls)` turns the names into one block of text, and the unquoted `$( )` splits it at every space, so one file became two. A glob never has this problem, because the shell builds the list of names itself:

```bash
for file in *; do
    echo "Found: $file"
done
```

```bash
root@lab:~/scripts/t# ./found.sh
Found: notes.txt
Found: sales report.csv
```

The same goes for `for line in $(cat file)`: it loops over words, not lines. Use `while read`, below.

## C-style for, while and until

When you need a counter, Bash has a second form of `for` borrowed from C:

```bash
#!/bin/bash
for ((i = 1; i <= 3; i++)); do
    echo "Attempt $i"
done
```

```bash
root@lab:~/scripts# ./attempts.sh
Attempt 1
Attempt 2
Attempt 3
```

The three parts are the start, the condition to keep going, and the step. The double parentheses are Bash's arithmetic syntax, which the *Arithmetic and strings* topic covers.

A **`while`** loop runs as long as its command succeeds, using the same tests as `if`:

```bash
#!/bin/bash
# countdown.sh: count down to zero.
count=3
while [[ $count -gt 0 ]]; do
    echo "$count"
    count=$((count - 1))
done
echo "Go"
```

```bash
root@lab:~/scripts# ./countdown.sh
3
2
1
Go
```

If nothing inside the loop changes the condition, it never ends. Press Ctrl+C to stop a script that is stuck.

An **`until`** loop is the opposite: it runs as long as its command *fails*, which reads naturally for waiting:

```bash
#!/bin/bash
# wait-for-file.sh: wait until a file appears.
until [[ -e ready.flag ]]; do
    echo "Waiting for ready.flag"
    sleep 1
done
echo "Found it"
```

Run it, and from a second terminal on your computer run `touch ~/scripts/ready.flag`:

```bash
root@lab:~/scripts# ./wait-for-file.sh
Waiting for ready.flag
Waiting for ready.flag
Waiting for ready.flag
Found it
```

## Reading lines with while read

To go through a file one line at a time, combine `while` with `read`, which reads one line from its input into a variable and fails at the end of the input:

```bash
#!/bin/bash
while IFS= read -r line; do
    echo "[$line]"
done < hosts.txt
```

The `< hosts.txt` after `done` feeds the file to the whole loop. Each part of `IFS= read -r line` is there for a reason. Here is a file and what a plain `read line` makes of it:

```bash
root@lab:~/scripts# cat hosts.txt
web-01
  web-02 # indented
C:\backups\db
root@lab:~/scripts# ./read-lines.sh
[web-01]
[web-02 # indented]
[C:backupsdb]
```

- Without **`-r`**, `read` treats backslashes as escape characters and removes them.
- Without **`IFS=`**, `read` strips spaces and tabs from the start and end of the line. `IFS` is the list of characters the shell splits on; setting it to nothing for the `read` command keeps the line exactly.

With `IFS= read -r line`, every line comes through intact:

```bash
root@lab:~/scripts# ./read-lines.sh
[web-01]
[  web-02 # indented]
[C:\backups\db]
```

`read` can also split a line into fields. Give it more than one variable and the last one gets the rest of the line. Set `IFS` to a character to split on that instead of spaces, which suits files like `/etc/passwd`, whose fields are separated by `:`. A `_` is the usual name for fields you don't need.

### Reading from a command

To read a command's output, you might pipe it into the loop. That works for printing, but a variable changed inside the loop is lost:

```bash
#!/bin/bash
# shell-users.sh: count accounts whose shell is bash.
count=0
getent passwd | while IFS=: read -r user _ _ _ _ _ shell; do
    if [[ $shell == /bin/bash ]]; then
        echo "$user uses bash"
        count=$((count + 1))
    fi
done
echo "$count accounts use bash"
```

```bash
root@lab:~/scripts# ./shell-users.sh
root uses bash
ubuntu uses bash
0 accounts use bash
```

Each side of a pipe runs in its own process, so the loop counted in a copy of `count` that vanished when the pipe finished. Feed the loop with `< <(command)` instead, which keeps the loop in the script's own shell:

```bash
while IFS=: read -r user _ _ _ _ _ shell; do
    if [[ $shell == /bin/bash ]]; then
        echo "$user uses bash"
        count=$((count + 1))
    fi
done < <(getent passwd)
echo "$count accounts use bash"
```

```bash
root@lab:~/scripts# ./shell-users.sh
root uses bash
ubuntu uses bash
2 accounts use bash
```

`<(command)` is **process substitution**: it makes the command's output look like a file, and the first `<` reads from it as it would from `hosts.txt`.

## break, continue and retrying

Two commands change the flow of a loop:

- **`continue`** skips the rest of this pass and moves to the next item.
- **`break`** leaves the loop completely, and the script carries on after `done`.

You have already used `continue` to skip names that do not exist. `break` is what makes a **retry loop** work: try something a fixed number of times and stop as soon as it succeeds. This is common in deploy scripts, where a service takes a few seconds to come up:

```bash
#!/bin/bash
# retry.sh: wait for a service to report ready, up to 5 tries.
ready=no
for attempt in 1 2 3 4 5; do
    if grep -q "ready" status.txt 2>/dev/null; then
        ready=yes
        break
    fi
    echo "Attempt $attempt failed, retrying in 2 seconds"
    sleep 2
done

if [[ $ready == yes ]]; then
    echo "Service is ready"
else
    echo "Service did not become ready"
fi
```

Start it, and within a few seconds run `echo ready > ~/scripts/status.txt` from a second terminal on your computer:

```bash
root@lab:~/scripts# ./retry.sh
Attempt 1 failed, retrying in 2 seconds
Attempt 2 failed, retrying in 2 seconds
Service is ready
```

`2>/dev/null` hides the error `grep` prints while the file does not exist yet. The `ready` variable records why the loop ended, because after `done` the script cannot otherwise tell whether it stopped from `break` or from running out of attempts. In a real script, the command inside the `if` would be something like `curl -fs http://localhost:8080/health`, and the failure branch would stop the deploy; the *Exit codes and errors* topic covers how.

## Tasks

### Task 1: An error count per log file

Make a folder `logs` with a few files: `app.log` with some lines containing `ERROR`, an empty `cron.log`, and `web server.log` with no errors. Write `log-report.sh` that, for each `.log` file in `logs/`:

- Prints `logs/NAME: empty, skipped` for an empty file and moves on.
- Otherwise prints the number of lines containing `ERROR`.

If there are no `.log` files at all, it prints `No log files in logs/` instead.

<details>
<summary>Check your work</summary>

```bash
#!/bin/bash
# log-report.sh: count ERROR lines in each log file under logs/.
found=0
for file in logs/*.log; do
    [[ -e $file ]] || continue
    found=$((found + 1))
    if [[ ! -s $file ]]; then
        echo "$file: empty, skipped"
        continue
    fi
    errors=$(grep -c "ERROR" "$file")
    echo "$file: $errors errors"
done

if [[ $found -eq 0 ]]; then
    echo "No log files in logs/"
fi
```

```bash
root@lab:~/scripts# ./log-report.sh
No log files in logs/
root@lab:~/scripts# mkdir logs
root@lab:~/scripts# printf 'INFO start\nERROR disk full\nINFO retry\nERROR disk full\n' > logs/app.log
root@lab:~/scripts# touch logs/cron.log
root@lab:~/scripts# echo 'INFO ok' > 'logs/web server.log'
root@lab:~/scripts# ./log-report.sh
logs/app.log: 2 errors
logs/cron.log: empty, skipped
logs/web server.log: 0 errors
```

The likely mistakes are `grep -c "ERROR" $file` without quotes, which fails on `web server.log`, and forgetting the `-e` check, which prints `logs/*.log: empty, skipped` when the folder has no logs.

</details>

### Task 2: Read a host list

Create `hosts.txt` with comments, a blank line, an indented name and a comment after a name:

```text
# Web servers
web-01
web-02    # spare

  db-01
```

Write `check-hosts.sh` that reads it line by line, ignores blank lines and lines starting with `#`, prints `Checking HOST` for each host with no extra spaces or comments, and ends with the number of hosts.

<details>
<summary>Check your work</summary>

```bash
#!/bin/bash
# check-hosts.sh: list the hosts in hosts.txt, ignoring comments and blank lines.
count=0
while read -r host _; do
    if [[ -z $host || $host == \#* ]]; then
        continue
    fi
    echo "Checking $host"
    count=$((count + 1))
done < hosts.txt
echo "$count hosts checked"
```

```bash
root@lab:~/scripts# ./check-hosts.sh
Checking web-01
Checking web-02
Checking db-01
3 hosts checked
```

Here the default `IFS` is what you want: it trims the spaces and splits the line into words, so `host` gets the first word and `_` takes the rest, including any comment. The `\#` stops the `#` from starting a comment in the script. The likely mistake is `for host in $(cat hosts.txt)`, which loops over every word, so `#`, `Web`, `servers` and `spare` become hosts too.

</details>

## Quiz

**1. What does this script print?**

```bash
#!/bin/bash
for n in 1 2 3 4 5; do
    if [[ $n -eq 2 ]]; then
        continue
    fi
    if [[ $n -eq 4 ]]; then
        break
    fi
    echo "$n"
done
echo "end"
```

<details>
<summary>Show answer</summary>

```text
1
3
end
```

`continue` skips the `echo` for 2, and `break` leaves the loop at 4, so 4 and 5 are never printed. The script then carries on after `done`.

</details>

**2. A clean-up script on a server runs `for f in /var/log/app/*.gz; do rm "$f"; done` from cron. On nights when there are no `.gz` files, the cron mail shows `rm: cannot remove '/var/log/app/*.gz': No such file or directory`. Why, and how do you fix it?**

<details>
<summary>Show answer</summary>

When a glob matches nothing, Bash leaves it as plain text, so the loop runs once with `/var/log/app/*.gz` as the file name. Add `[[ -e $f ]] || continue` as the first line of the loop, or put `shopt -s nullglob` before it.

</details>

**3. Why does `for file in $(ls)` go wrong for a file called `sales report.csv`?**

<details>
<summary>Show answer</summary>

`$(ls)` produces one block of text, and because it is unquoted, Bash splits it at spaces, so the loop gets `sales` and `report.csv` as two items. Use a glob, `for file in *`, which gives each file name as one item.

</details>

**4. A script runs `grep ERROR app.log | while IFS= read -r line; do count=$((count + 1)); done` and then prints `$count`, which is always 0. What is wrong?**

<details>
<summary>Show answer</summary>

The loop is on the right side of a pipe, so it runs in a separate process and its changes to `count` are lost when it ends. Write the loop as `while IFS= read -r line; do ...; done < <(grep ERROR app.log)`. For a plain count, `grep -c ERROR app.log` does the job without a loop.

</details>

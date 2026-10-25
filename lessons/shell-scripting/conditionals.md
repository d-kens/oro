A script that does the same thing every time cannot react to what it finds. **Conditionals** let it check something first, such as whether a file exists, a disk is full or a user has an account, and then choose what to do.

This topic covers `if`, the three ways of writing a test, and `case`. By the end you can compare strings, numbers and files, chain checks with `elif`, pick between several values with `case`, and avoid the spacing and quoting mistakes that make tests fail in odd ways.

## if runs a command and checks its exit status

Every command finishes with an **exit status**, a number from 0 to 255. `0` means success and anything else means failure. `if` runs a command and looks only at that number:

```bash
#!/bin/bash
# has-user.sh: say whether a user account exists.
user="sam"
if grep -q "^$user:" /etc/passwd; then
    echo "$user has an account"
else
    echo "$user has no account"
fi
```

```bash
root@lab:~/scripts# ./has-user.sh
sam has no account
```

`grep -q` prints nothing; it exits `0` if it found a match and `1` if it did not. Change `user` to `root` and the script prints `root has an account`.

The shape is always the same:

- `if`, a command, then `;` and `then` (or `then` on the next line).
- The commands to run when it succeeds.
- An optional `else` with commands to run when it fails.
- `fi`, which is `if` backwards, to close it.

Any command can go after `if`. The *Exit codes and errors* topic covers exit statuses in depth; here, all you need is that `if` means "if this command succeeds".

## test, [ ] and [[ ]]

To compare values you need a command whose job is to succeed or fail on a comparison. Bash has three spellings of it:

```bash
test -d /etc
[ -d /etc ]
[[ -d /etc ]]
```

All three succeed, because `/etc` is a directory. They differ in what they are:

```bash
root@lab:~/scripts# type test [ [[
test is a shell builtin
[ is a shell builtin
[[ is a shell keyword
```

`[` is the same command as `test`, with a name that looks like a bracket, and it needs `]` as its last argument. Because it is an ordinary command, Bash splits and globs its arguments before `[` sees them, the same as for `ls` or `rm`. `[[` is part of Bash's own grammar, so Bash knows it is a test and is more careful with what is inside.

| | `[ ]` and `test` | `[[ ]]` |
| --- | --- | --- |
| Works in | Every shell, including sh | Bash and a few others |
| Unquoted empty variable | Breaks the test | Safe |
| Unquoted value with spaces | Breaks the test | Safe |
| Combining tests | `[ a ] && [ b ]` | `[[ a && b ]]` |
| Pattern match | No | `[[ $file == *.log ]]` |
| Regular expression | No | `[[ $x =~ ^[0-9]+$ ]]` |
| `<` and `>` | Redirections, so they create files | String comparisons |

This skill uses `[[ ]]` in Bash scripts. You still need to read `[ ]`, because older scripts and anything written for sh use it. Quoting variables is a good habit in both, and inside `[ ]` it is required.

## String, number and file tests

These work in both `[ ]` and `[[ ]]`. Leave a space on both sides of every operator.

| Test | True when |
| --- | --- |
| `"$a" = "$b"` | The strings are the same (`==` also works) |
| `"$a" != "$b"` | The strings differ |
| `-z "$a"` | The string is empty |
| `-n "$a"` | The string is not empty |
| `"$a" -eq "$b"` | The numbers are equal |
| `"$a" -ne "$b"` | The numbers are not equal |
| `"$a" -lt "$b"`, `-le` | Less than, less than or equal |
| `"$a" -gt "$b"`, `-ge` | Greater than, greater than or equal |
| `-e "$path"` | The path exists |
| `-f "$path"` | It exists and is a regular file |
| `-d "$path"` | It exists and is a directory |
| `-s "$path"` | It exists and is not empty |
| `-r`, `-w`, `-x "$path"` | You can read, write or run it |
| `! test` | The test is false |

Words are for numbers and symbols are for strings, which is the opposite of most languages. The numeric tests work on whole numbers only; the *Arithmetic and strings* topic deals with decimals.

## elif, else and combining tests

`elif` adds more checks; Bash tries them in order and runs the first branch that succeeds. This script reports on a log file:

```bash
#!/bin/bash
# check-log.sh: report on a log file.
log="app.log"
if [[ ! -e $log ]]; then
    echo "$log does not exist"
elif [[ ! -s $log ]]; then
    echo "$log is empty"
else
    echo "$log has $(wc -l < "$log") lines"
fi
```

```bash
root@lab:~/scripts# ./check-log.sh
app.log does not exist
root@lab:~/scripts# touch app.log
root@lab:~/scripts# ./check-log.sh
app.log is empty
root@lab:~/scripts# printf 'start\nready\nstop\n' > app.log
root@lab:~/scripts# ./check-log.sh
app.log has 3 lines
```

The same pattern with numbers turns the output of a command into an alert:

```bash
#!/bin/bash
# disk-alert.sh: warn when the root filesystem is getting full.
used=$(df --output=pcent / | tail -n 1 | tr -dc '0-9')
if [[ $used -ge 90 ]]; then
    echo "CRITICAL: / is ${used}% full"
elif [[ $used -ge 75 ]]; then
    echo "WARNING: / is ${used}% full"
else
    echo "OK: / is ${used}% full"
fi
```

```bash
root@lab:~/scripts# ./disk-alert.sh
OK: / is 5% full
```

`df --output=pcent` prints a header and a value like ` 5%`; `tail` keeps the last line and `tr -dc '0-9'` deletes everything except digits. The order of the checks matters: test for 90 before 75, or a full disk would only ever reach the warning.

Inside `[[ ]]`, combine tests with `&&` (and), `||` (or) and `!` (not), and group them with parentheses:

```bash
if [[ -f $log && -r $log ]]; then
    echo "$log is a file you can read"
fi

if [[ $APP_ENV == production || $APP_ENV == staging ]]; then
    echo "This is a shared environment"
fi
```

With `[ ]`, write two tests joined by the shell's own `&&`: `[ -f "$log" ] && [ -r "$log" ]`. You will also see `-a` and `-o` inside `[ ]`; they are old and easy to get wrong, so don't use them in new scripts.

`[[ ]]` can also match patterns, with the same `*` and `?` as file names. The pattern must not be quoted, or it is compared as plain text:

```bash
if [[ $file == *.log ]]; then
    echo "$file is a log file"
fi
```

## case for many choices

When you compare one value against several options, a chain of `elif` gets long. `case` is shorter and accepts patterns:

```bash
#!/bin/bash
# set-level.sh: choose a log level from the environment name.
case "$APP_ENV" in
    production|prod)
        level="warn"
        ;;
    staging)
        level="info"
        ;;
    dev*)
        level="debug"
        ;;
    *)
        echo "Unknown environment: '$APP_ENV'"
        exit 1
        ;;
esac
echo "Log level for $APP_ENV: $level"
```

```bash
root@lab:~/scripts# APP_ENV=prod ./set-level.sh
Log level for prod: warn
root@lab:~/scripts# APP_ENV=development ./set-level.sh
Log level for development: debug
root@lab:~/scripts# APP_ENV=test ./set-level.sh
Unknown environment: 'test'
```

- Each option is a pattern followed by `)`. `|` separates alternatives.
- `*` matches anything, so a `*)` branch at the end catches every value nothing else matched.
- `;;` ends a branch. Bash runs only the first branch that matches.
- `esac` closes it, `case` backwards.
- `exit 1` stops the script with a failure status, which the *Exit codes and errors* topic covers.

`case` is the usual way to handle a fixed set of words, such as `start`, `stop` and `status`, which you will use in the *Arguments and input* topic.

## The classic mistakes

**Missing spaces in `[ ]`.** `[` is a command, so it needs spaces around it like any other command:

```bash
#!/bin/bash
count=3
if [$count -gt 2]; then
    echo "more than two"
fi
```

```bash
root@lab:~/scripts# ./count.sh
./count.sh: line 3: [3: command not found
```

Bash looked for a command called `[3`. Write `[ $count -gt 2 ]`, with a space after `[`, before `]` and around the operator. A missing space around the operator gives a different error: `[ "$count"-gt 2 ]` reports `[: 3-gt: unary operator expected`.

**`=` where you meant `-eq`.** Both run without an error, but they compare differently:

```bash
root@lab:~/scripts# [[ 007 = 7 ]] && echo same || echo different
different
root@lab:~/scripts# [[ 007 -eq 7 ]] && echo same || echo different
same
root@lab:~/scripts# [[ 10 < 9 ]] && echo smaller || echo bigger
smaller
```

`=` compares text, and `<` puts text in dictionary order, where `1` comes before `9`. For numbers, use `-eq`, `-lt` and the rest. In `[ ]`, `<` and `>` are redirections: `[ 10 > 9 ]` creates a file called `9`.

**Unquoted empty variables in `[ ]`.** If a variable is empty, an unquoted `$role` disappears completely:

```bash
#!/bin/bash
role=""
if [ $role = "admin" ]; then
    echo "admin"
else
    echo "not admin"
fi
```

```bash
root@lab:~/scripts# ./role.sh
./role.sh: line 3: [: =: unary operator expected
not admin
```

`[` received `= admin ]`, which is not a valid test, so it failed and the script fell into `else` with an error on the screen. Quote it, `[ "$role" = "admin" ]`, and `[` sees an empty string instead: the test is false and there is no error. `[[ $role = admin ]]` is safe either way, which is one reason to prefer it.

## Tasks

### Task 1: Check a backup folder

Write `check-backups.sh` that keeps a folder name in a variable, `backup_dir="backups"`, and prints exactly one of:

- `backups: missing` if it does not exist.
- `backups: not a directory` if it exists but is a file.
- `backups: empty` if it is a directory with no files in it.
- `backups: N files` otherwise, with N the number of files.

Test all four cases.

<details>
<summary>Check your work</summary>

```bash
#!/bin/bash
# check-backups.sh: report on the state of a backup folder.
backup_dir="backups"

if [[ ! -e $backup_dir ]]; then
    echo "$backup_dir: missing"
elif [[ ! -d $backup_dir ]]; then
    echo "$backup_dir: not a directory"
else
    count=$(find "$backup_dir" -type f | wc -l)
    if [[ $count -eq 0 ]]; then
        echo "$backup_dir: empty"
    else
        echo "$backup_dir: $count files"
    fi
fi
```

```bash
root@lab:~/scripts# chmod +x check-backups.sh
root@lab:~/scripts# ./check-backups.sh
backups: missing
root@lab:~/scripts# touch backups && ./check-backups.sh
backups: not a directory
root@lab:~/scripts# rm backups && mkdir backups && ./check-backups.sh
backups: empty
root@lab:~/scripts# touch backups/db-1.tar.gz backups/db-2.tar.gz && ./check-backups.sh
backups: 2 files
```

The order of the checks matters: `-d` is false both for a file and for a missing path, so test `-e` first. The likely mistake is `[ $count = 0 ]`, which happens to work here but compares text; use `-eq` for numbers.

</details>

### Task 2: A service helper

Write `svc.sh` that reads an action from the variable `ACTION` in the environment and uses `case` to print:

- `start` or `up`: `Starting web`
- `stop` or `down`: `Stopping web`
- `status`: `web is running`
- anything else, including nothing: `Usage: ACTION=start|stop|status ./svc.sh`, then exit with status 1.

<details>
<summary>Check your work</summary>

```bash
#!/bin/bash
# svc.sh: pretend to control a service called web.
service="web"

case "$ACTION" in
    start|up)
        echo "Starting $service"
        ;;
    stop|down)
        echo "Stopping $service"
        ;;
    status)
        echo "$service is running"
        ;;
    *)
        echo "Usage: ACTION=start|stop|status ./svc.sh"
        exit 1
        ;;
esac
```

```bash
root@lab:~/scripts# chmod +x svc.sh
root@lab:~/scripts# ACTION=up ./svc.sh
Starting web
root@lab:~/scripts# ACTION=status ./svc.sh
web is running
root@lab:~/scripts# ./svc.sh
Usage: ACTION=start|stop|status ./svc.sh
root@lab:~/scripts# echo $?
1
```

`$?` holds the exit status of the last command. The likely mistake is leaving out `;;` at the end of a branch, which gives `syntax error near unexpected token`. Another is putting `*)` first: it matches everything, so no other branch would ever run.

</details>

## Quiz

**1. What does this script print?**

```bash
#!/bin/bash
a=10
b=9
if [[ $a < $b ]]; then
    echo "$a is smaller"
else
    echo "$b is smaller"
fi
```

<details>
<summary>Show answer</summary>

It prints `10 is smaller`. Inside `[[ ]]`, `<` compares text, and the text `10` sorts before `9` because `1` comes before `9`. Use `[[ $a -lt $b ]]` to compare numbers, and it prints `9 is smaller`.

</details>

**2. A script on a server has `if [ $DEPLOY_ENV = production ]; then` and logs `[: =: unary operator expected` every night from cron, though it works when you run it by hand. Why, and what is the fix?**

<details>
<summary>Show answer</summary>

Cron starts the script with very few environment variables, so `DEPLOY_ENV` is empty there. Unquoted, it disappears and `[` sees `= production ]`. Quote it, `[ "$DEPLOY_ENV" = production ]`, or use `[[ $DEPLOY_ENV = production ]]`. Then make sure cron sets the variable, for example in the crontab line.

</details>

**3. Why does `if [-f app.log]; then` fail with `[-f: command not found`?**

<details>
<summary>Show answer</summary>

`[` is a command and needs spaces around it like any other. Without them, Bash looks for a command called `[-f`. Write `if [ -f app.log ]; then`.

</details>

**4. In a `case` statement, `"*.log")` never matches `app.log`, but `*.log)` does. Why?**

<details>
<summary>Show answer</summary>

Quoting the pattern turns off its special meaning, so `"*.log"` only matches the literal text `*.log`, with a real asterisk. Leave patterns unquoted when you want `*` and `?` to work as wildcards. The same is true on the right side of `==` inside `[[ ]]`.

</details>

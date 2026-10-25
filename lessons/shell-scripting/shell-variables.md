A script that only runs fixed commands is hard to reuse. **Variables** let you name a value once, such as a host, a file or a date, and use it wherever you need it. They are also where most shell bugs start, because of how Bash treats spaces and quotes.

This topic covers setting and reading variables, the two kinds of quotes, running a command and keeping its output, and passing values to other programs. By the end you can write scripts that build names and paths from variables and keep working when a value contains a space.

## Setting and reading a variable

Set a variable with `name=value` and read it with a `$` in front of the name. Save this as `greet.sh`:

```bash
#!/bin/bash
# greet.sh: say hello to a user.
name="sam"
host="web-01"
echo "Hello $name, you are on $host"
```

```bash
root@lab:~/scripts# chmod +x greet.sh
root@lab:~/scripts# ./greet.sh
Hello sam, you are on web-01
```

There must be **no spaces around the `=`**. This is the first mistake almost everyone makes, and Bash's error does not say so:

```bash
#!/bin/bash
name = sam
echo "name is $name"
```

```bash
root@lab:~/scripts# ./greet.sh
./greet.sh: line 2: name: command not found
name is
```

With spaces, Bash reads `name` as a command and `=` and `sam` as its arguments. A space only after the `=` is wrong too: `name= sam` sets `name` to nothing for one command and then tries to run `sam`, which gives `sam: command not found`.

Reading a variable that was never set is not an error. You get an empty string, which is why the script carried on and printed `name is`. The *Robust scripts* topic shows how to make Bash stop instead.

### When to use `${name}`

`$name` and `${name}` mean the same thing. The braces mark where the name ends, which you need when letters, digits or `_` follow it:

```bash
#!/bin/bash
file="app"
echo "Backup: $file_backup.log"
echo "Backup: ${file}_backup.log"
```

```bash
root@lab:~/scripts# ./backup-name.sh
Backup: .log
Backup: app_backup.log
```

The first line looked for a variable called `file_backup`, found none, and printed nothing in its place. A `.` or `-` or `/` cannot be part of a name, so `"$file.log"` and `"$dir/$file"` work without braces. When in doubt, use them.

## Double quotes and single quotes

The two kinds of quotes do different jobs:

| Quotes | Variables and `$( )` | Example | Prints |
| --- | --- | --- | --- |
| Double `"..."` | Expanded | `echo "Hello $user"` | `Hello priya` |
| Single `'...'` | Left exactly as typed | `echo 'Hello $user'` | `Hello $user` |

Inside double quotes, a backslash stops one character from being special, so `\$` prints a dollar sign and `\"` prints a double quote:

```bash
#!/bin/bash
user="priya"
echo "Hello $user"
echo 'Hello $user'
echo "Cost: \$5 for $user"
echo "She said \"hi\""
```

```bash
root@lab:~/scripts# ./quotes.sh
Hello priya
Hello $user
Cost: $5 for priya
She said "hi"
```

Use double quotes by default. Use single quotes when you want the text taken literally, such as a `sed` or `awk` program from the Linux skill's *Pipes and text* topic, where `$1` belongs to awk and not to the shell.

## Always quote "$var"

When a variable is used **without** quotes, Bash does two more things to its value before running the command:

- **Word splitting**: it breaks the value into separate words at spaces, tabs and newlines.
- **Globbing**: it treats `*`, `?` and `[...]` in the result as file name patterns and replaces them with matching files.

With a value like `sam` neither matters. With a file name that contains a space, it does:

```bash
#!/bin/bash
file="monthly report.txt"
touch "$file"
ls -l $file
```

```bash
root@lab:~/scripts# ./report.sh
ls: cannot access 'monthly': No such file or directory
ls: cannot access 'report.txt': No such file or directory
```

`touch "$file"` created one file called `monthly report.txt`. `ls -l $file` was split into two arguments, `monthly` and `report.txt`, and neither exists. Quote it and it works:

```bash
ls -l "$file"
```

```bash
root@lab:~/scripts# ./report.sh
-rw-r--r-- 1 root root 0 Oct 25 08:32 monthly report.txt
```

The same split can delete the wrong files. In a folder that holds `old`, `logs.txt` and `old logs.txt`:

```bash
root@lab:~/scripts/t# file="old logs.txt"
root@lab:~/scripts/t# rm $file
root@lab:~/scripts/t# ls
old logs.txt
```

The file you meant to remove is still there, and two others are gone. Globbing has its own surprises:

```bash
root@lab:~/scripts/t# msg="Total: * files"
root@lab:~/scripts/t# echo $msg
Total: old logs.txt files
root@lab:~/scripts/t# echo "$msg"
Total: * files
```

Unquoted, the `*` was replaced by the names of the files in the folder. The rule is simple: **put double quotes around every `$variable` and every `$( )`**, unless you have a clear reason not to. The *Arrays* topic covers the right way to hold a list of file names.

## Command substitution

`$(command)` runs a command and puts its output in place. This is how you store the result of a command in a variable:

```bash
#!/bin/bash
today=$(date +%F)
accounts=$(wc -l < /etc/passwd)
echo "Today is $today"
echo "This machine has $accounts accounts"
```

```bash
root@lab:~/scripts# ./facts.sh
Today is 2026-10-25
This machine has 19 accounts
```

Trailing newlines in the output are removed, so you get `2026-10-25` and not `2026-10-25` followed by a blank line. Everything else is kept, including spaces, which is another reason to quote: `echo "$(who)"` keeps the lines and columns; `echo $(who)` squashes them into one line.

You will see an older form with backticks, `` today=`date +%F` ``. It does the same thing but is hard to read and awkward to nest. Use `$( )` in new scripts.

## Constants with readonly

Some values should never change once set, such as the folder backups go to. `readonly` makes a later assignment fail:

```bash
#!/bin/bash
readonly backup_dir="/var/backups"
echo "Saving to $backup_dir"
backup_dir="/tmp"
echo "Still saving to $backup_dir"
```

```bash
root@lab:~/scripts# ./constants.sh
Saving to /var/backups
./constants.sh: line 4: backup_dir: readonly variable
Still saving to /var/backups
```

The bad assignment is refused with an error, and the value stays the same. The script itself carries on, so this protects the value, not the run. A read-only variable also cannot be removed with `unset`.

## Environment variables and export

A script's variables belong to that script's shell. When the script starts another program, including another script, the program does not see them unless they are **exported**. Exported variables are called **environment variables**, and every process gets a copy of its parent's environment when it starts.

Two small scripts show the difference. `child.sh`:

```bash
#!/bin/bash
echo "child sees app_env='$app_env' and APP_ENV='$APP_ENV'"
```

`parent.sh`:

```bash
#!/bin/bash
app_env="staging"
export APP_ENV="staging"
./child.sh
```

```bash
root@lab:~/scripts# ./parent.sh
child sees app_env='' and APP_ENV='staging'
```

Only the exported one reached the child. It is a copy: if the child changes `APP_ENV`, the parent's value does not change, which is the same reason `./setenv.sh` could not change your shell in the *Shell scripting basics* topic.

You can also set a variable for one command only by putting it in front of the command. It is exported to that command and nowhere else:

```bash
root@lab:~/scripts# APP_ENV=production ./child.sh
child sees app_env='' and APP_ENV='production'
root@lab:~/scripts# echo "$APP_ENV"

```

Your shell already has many environment variables. List them with `env`, or look at a few:

```bash
root@lab:~/scripts# env | grep -E '^(HOME|PATH|HOSTNAME)='
HOSTNAME=lab
HOME=/root
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
```

Programs read their settings this way: a script can read `$HOME` without setting it. The set you get depends on how the script started, though. This container has no `$USER`, and cron jobs get only a handful of variables, so don't assume one is there.

### Naming conventions

Names can use letters, digits and `_`, and cannot start with a digit. Case matters: `app_env` and `APP_ENV` are different variables. A common convention keeps them apart:

- **Lower case** for a script's own variables: `backup_dir`, `today`, `file`.
- **Upper case** for environment variables, the ones you export or read from outside: `APP_ENV`, `PATH`, `HOME`.

This also stops you overwriting something important by accident. A script that sets its own `PATH="/srv/app"` will find that `ls`, `date` and every other command stop working, because the shell searches `PATH` for them.

## Tasks

### Task 1: A dated copy

In `~/scripts`, create a file called `notes for sam.txt` with any text in it. Write `dated-copy.sh` that:

1. Keeps the file name in a variable.
2. Stores today's date, in the form `2026-10-25`, in another variable.
3. Copies the file to a new name that starts with the date and a `-`, such as `2026-10-25-notes for sam.txt`.
4. Prints what it copied.

<details>
<summary>Check your work</summary>

```bash
#!/bin/bash
# dated-copy.sh: copy a file to a name that starts with today's date.
file="notes for sam.txt"
today=$(date +%F)
copy="${today}-${file}"

cp "$file" "$copy"
echo "Copied '$file' to '$copy'"
```

```bash
root@lab:~/scripts# echo "sam todo" > "notes for sam.txt"
root@lab:~/scripts# chmod +x dated-copy.sh
root@lab:~/scripts# ./dated-copy.sh
Copied 'notes for sam.txt' to '2026-10-25-notes for sam.txt'
root@lab:~/scripts# ls -1 *sam*
2026-10-25-notes for sam.txt
notes for sam.txt
```

The single quotes inside the double-quoted `echo` are plain characters, so the variables in them still expand. The likely mistake is `cp $file $copy` without quotes: `cp` then gets six words, treats the last one, `sam.txt`, as a folder to copy into, and fails with `cp: target 'sam.txt': No such file or directory`.

</details>

### Task 2: Settings from the environment

Write `show-config.sh`, which prints the settings a deploy would use:

- `App:` followed by a fixed app name, `shop`, that the script must not be able to change later.
- `Release:` followed by today's date as `20261025`.
- `Env:` and `Deployer:` followed by the values of the environment variables `APP_ENV` and `DEPLOY_USER`.

Run it three ways: on its own, with both variables set for that one run, and after exporting `APP_ENV` in your shell.

<details>
<summary>Check your work</summary>

```bash
#!/bin/bash
# show-config.sh: print the settings a deploy would use.
readonly app_name="shop"
release=$(date +%Y%m%d)

echo "App:      $app_name"
echo "Release:  $release"
echo "Env:      $APP_ENV"
echo "Deployer: $DEPLOY_USER"
```

```bash
root@lab:~/scripts# ./show-config.sh
App:      shop
Release:  20261025
Env:
Deployer:
root@lab:~/scripts# APP_ENV=staging DEPLOY_USER=alex ./show-config.sh
App:      shop
Release:  20261025
Env:      staging
Deployer: alex
root@lab:~/scripts# export APP_ENV=production
root@lab:~/scripts# ./show-config.sh
App:      shop
Release:  20261025
Env:      production
Deployer:
```

The one-off values in the second run were gone by the third; only the exported `APP_ENV` stayed. The likely mistake is running `APP_ENV=production` without `export` and expecting the script to see it: that sets a shell variable that the script never receives. The *Parameter expansion* topic shows how to print a default such as `development` when a variable is empty.

</details>

## Quiz

**1. What does this script print?**

```bash
#!/bin/bash
host="web-01"
echo "Checking $host_status"
echo 'Checking $host'
echo "Checking ${host}_status"
```

<details>
<summary>Show answer</summary>

```text
Checking
Checking $host
Checking web-01_status
```

The first line reads a variable called `host_status`, which is not set. The second is in single quotes, so nothing expands. The third uses braces to end the name at `host`.

</details>

**2. A script has the line `count = 5` and fails with `count: command not found`. What is wrong?**

<details>
<summary>Show answer</summary>

There are spaces around the `=`, so Bash runs a command called `count` with the arguments `=` and `5`. Write `count=5`.

</details>

**3. A clean-up script on a server runs `rm -f $old_file`. It works for weeks, then one day removes two files it should not have touched and leaves the one it should have removed. What happened, and what is the fix?**

<details>
<summary>Show answer</summary>

The value of `old_file` contained a space, for example `report 2025.csv`. Unquoted, it was split into two words, `report` and `2025.csv`, and `rm` removed those two files instead. Quote the variable: `rm -f "$old_file"`.

</details>

**4. A script sets `DB_HOST=db-01` and then runs `./migrate.sh`, which reads `$DB_HOST`. Inside `migrate.sh` the value is empty. Give two ways to fix it.**

<details>
<summary>Show answer</summary>

The variable was never exported, so the child process did not get it. Either write `export DB_HOST=db-01` before running `./migrate.sh`, or set it for that one command: `DB_HOST=db-01 ./migrate.sh`.

</details>

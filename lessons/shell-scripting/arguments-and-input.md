A script that only does one fixed thing is rarely useful for long. The same backup script should work for any directory, and the same log filter for any file. You give a script what it needs to work on through **arguments** on the command line, through **options** such as `-v`, or by asking for input while it runs.

This topic covers all three. By the end you can read positional arguments safely, check you were given the right number, parse options with `getopts`, prompt for input, and write a script that reads from a file or from a pipe.

## Positional arguments

When you run `./args.sh web-01 app.log`, Bash stores each word after the script name in a numbered variable. These are the **positional parameters**:

| Variable | Holds |
| --- | --- |
| `$0` | The script's name, as it was run |
| `$1`, `$2` … `$9` | The first, second … ninth argument |
| `${10}` | The tenth argument; braces are needed from 10 on |
| `$#` | How many arguments there are |
| `"$@"` | All the arguments, each kept separate |

```bash
#!/bin/bash
# args.sh: show what the script received.
echo "Script name: $0"
echo "First:  $1"
echo "Second: $2"
echo "Count:  $#"
```

```bash
root@lab:~/scripts# ./args.sh web-01 app.log
Script name: ./args.sh
First:  web-01
Second: app.log
Count:  2
root@lab:~/scripts# ./args.sh
Script name: ./args.sh
First:  
Second: 
Count:  0
```

An argument that was not given is simply empty. Bash does not complain, so the script carries on with an empty value unless you check, which the next sections do.

Arguments are split by the shell you type them in, before the script starts. To pass a value containing a space as one argument, quote it when you run the script: `./args.sh "my file.txt"`.

## "$@", "$*" and $@

There are three common ways to refer to all the arguments, and only one of them is usually right. This script loops over each:

```bash
#!/bin/bash
# show-args.sh: compare the ways of expanding all arguments.
echo 'With "$@":'
for arg in "$@"; do echo "  [$arg]"; done

echo 'With "$*":'
for arg in "$*"; do echo "  [$arg]"; done

echo 'With $@ unquoted:'
for arg in $@; do echo "  [$arg]"; done
```

Run it with one argument that contains a space:

```bash
root@lab:~/scripts# ./show-args.sh "my file.txt" notes.txt
With "$@":
  [my file.txt]
  [notes.txt]
With "$*":
  [my file.txt notes.txt]
With $@ unquoted:
  [my]
  [file.txt]
  [notes.txt]
```

- **`"$@"`** gives each argument exactly as it was passed. This is what you want almost every time: to loop over arguments or to hand them on to another command.
- **`"$*"`** joins all the arguments into one string, separated by spaces. It is useful for a message, such as `echo "Got: $*"`, and wrong for a loop.
- **`$@` unquoted** (and `$*` unquoted) splits every argument on spaces, so `my file.txt` becomes two words. This is the mistake behind scripts that work until someone has a file name with a space in it.

The same rule applies to single arguments: write `"$1"`, not `$1`, whenever you use it.

## shift and checking the count

**`shift`** throws away `$1` and moves every other argument down one place: `$2` becomes `$1`, and `$#` goes down by one. It is the usual way to take a fixed first argument and then treat the rest as a list:

```bash
#!/bin/bash
# shift-demo.sh: take the first argument, then work through the rest.
host="$1"
shift
echo "Host: $host"
echo "Remaining ($#): $*"
for file in "$@"; do
    echo "Would copy $file to $host"
done
```

```bash
root@lab:~/scripts# ./shift-demo.sh web-01 a.conf "b c.conf"
Host: web-01
Remaining (2): a.conf b c.conf
Would copy a.conf to web-01
Would copy b c.conf to web-01
```

A script should check it was given what it needs before doing any work, and if not, print a **usage message** and stop. The usage message says how to run the script. It goes to standard error with `>&2`, and the script exits with a non-zero status so that whatever called it knows it failed. The *Exit codes and errors* topic covers both properly.

Because the same message is needed in several places, it is usually written as a small function called `usage`. The *Functions* topic explains functions; for now, read it as a named group of commands that runs when you type its name:

```bash
#!/bin/bash
# copy-to.sh: copy files to a host.
# Usage: ./copy-to.sh HOST FILE...

usage() {
    echo "Usage: $0 HOST FILE..." >&2
    echo "Copy one or more files to HOST." >&2
    exit 1
}

if [ $# -lt 2 ]; then
    usage
fi

host="$1"
shift
for file in "$@"; do
    echo "Copying $file to $host"
done
```

```bash
root@lab:~/scripts# ./copy-to.sh web-01
Usage: ./copy-to.sh HOST FILE...
Copy one or more files to HOST.
root@lab:~/scripts# echo $?
1
root@lab:~/scripts# ./copy-to.sh web-01 app.log "old app.log"
Copying app.log to web-01
Copying old app.log to web-01
```

The usual conventions in a usage line: `UPPERCASE` for a value you fill in, `[ ]` for something optional, and `...` for "one or more".

## Options with getopts

Options are the dash arguments, like `-v` or `-d /srv/backup`. You could test `$1` for each one by hand, but Bash's built-in **`getopts`** does it for you and handles the details: options in any order, grouped flags like `-vd`, and missing values.

```bash
#!/bin/bash
# backup.sh: back up a directory.
# Usage: ./backup.sh [-v] [-d DEST] SOURCE

usage() {
    echo "Usage: $0 [-v] [-d DEST] SOURCE" >&2
    exit 1
}

verbose=no
dest=/tmp/backups

while getopts "vd:" opt; do
    case "$opt" in
        v) verbose=yes ;;
        d) dest="$OPTARG" ;;
        *) usage ;;
    esac
done
shift $((OPTIND - 1))

if [ $# -ne 1 ]; then
    usage
fi

echo "Source:  $1"
echo "Dest:    $dest"
echo "Verbose: $verbose"
```

How it works:

- `"vd:"` lists the options the script accepts. A letter followed by `:` takes a value, so `-d` needs one and `-v` does not.
- Each time round the loop, `getopts` puts the next option letter in `opt`. For an option that takes a value, the value goes in **`OPTARG`**.
- An unknown option, or `-d` with no value, sets `opt` to `?` and prints an error. The `*)` branch catches it and shows the usage.
- When the options run out, **`OPTIND`** holds the position of the first argument that is not an option. `shift $((OPTIND - 1))` removes the options, so `$1` is the source directory again.

```bash
root@lab:~/scripts# ./backup.sh /etc
Source:  /etc
Dest:    /tmp/backups
Verbose: no
root@lab:~/scripts# ./backup.sh -vd /srv/backup /etc
Source:  /etc
Dest:    /srv/backup
Verbose: yes
root@lab:~/scripts# ./backup.sh -x /etc
./backup.sh: illegal option -- x
Usage: ./backup.sh [-v] [-d DEST] SOURCE
root@lab:~/scripts# ./backup.sh -d
./backup.sh: option requires an argument -- d
Usage: ./backup.sh [-v] [-d DEST] SOURCE
```

Two limits to know. `getopts` handles only short, single-letter options, not long ones like `--verbose`. And it stops at the first argument that is not an option, so options must come before the other arguments: `./backup.sh /etc -v` treats `-v` as a second argument, and this script prints its usage.

Forgetting the `shift $((OPTIND - 1))` line is the common mistake. Without it, `$1` is still `-v` or `-d`, and the script works on the wrong thing.

## Reading input with read

Sometimes a script needs to ask. **`read`** reads one line from standard input into a variable:

```bash
#!/bin/bash
# ask.sh: ask for a name and a password.
read -r -p "User name: " name
read -r -s -p "Password: " password
echo
echo "Creating $name with a ${#password}-character password"
```

```bash
root@lab:~/scripts# ./ask.sh
User name: sam
Password: 
Creating sam with a 7-character password
```

- `-p "text"` prints a prompt on the same line.
- `-s` (silent) does not show what is typed, for passwords and other secrets. The cursor stays on the prompt line afterwards, which is why the script runs a bare `echo` to move to a new line.
- `-r` keeps backslashes as they are typed. Without it, `read` treats a backslash as an escape and removes it:

```bash
root@lab:~/scripts# read -p "Path: " p
Path: C:\temp\new
root@lab:~/scripts# echo "$p"
C:tempnew
root@lab:~/scripts# read -r -p "Path: " p
Path: C:\temp\new
root@lab:~/scripts# echo "$p"
C:\temp\new
```

Always use `-r` unless you have a reason not to. ShellCheck, from the *Debugging* topic, warns when it is missing.

Prompting is fine for a script a person runs. A script that runs from cron or a pipeline has nobody to answer, so anything it needs should come from arguments, options or a file instead.

## Reading from a file or from standard input

Commands like `grep` and `wc` read a file if you name one, and standard input if you don't, so they work at the end of a pipe. Your scripts can do the same. The *Loops* topic showed `while IFS= read -r line` reading a file; the trick is to choose the file with a default from the *Parameter expansion* topic:

```bash
#!/bin/bash
# errors.sh: print the ERROR lines from a log file or standard input.
# Usage: ./errors.sh [FILE]
#        some-command | ./errors.sh

if [ $# -gt 1 ]; then
    echo "Usage: $0 [FILE]" >&2
    exit 1
fi

if [ $# -eq 1 ] && [ ! -r "$1" ]; then
    echo "$0: cannot read $1" >&2
    exit 1
fi

input="${1:-/dev/stdin}"
while IFS= read -r line; do
    if [[ $line == *ERROR* ]]; then
        echo "$line"
    fi
done < "$input"
```

`${1:-/dev/stdin}` means "the first argument, or `/dev/stdin` if there isn't one". `/dev/stdin` is a special file that is whatever the script's standard input is: the pipe, a redirected file, or the keyboard.

```bash
root@lab:~/scripts# cat app.log
09:00 INFO started
09:01 ERROR disk full
09:02 INFO retry
09:03 ERROR disk full
root@lab:~/scripts# ./errors.sh app.log
09:01 ERROR disk full
09:03 ERROR disk full
root@lab:~/scripts# tail -n 2 app.log | ./errors.sh
09:03 ERROR disk full
root@lab:~/scripts# ./errors.sh missing.log
./errors.sh: cannot read missing.log
```

If you run it with no file and nothing piped in, it waits for you to type lines. Press Ctrl+D to end the input.

## Tasks

### Task 1: Create project directories

Write `mkprojects.sh`, which takes a parent directory and one or more project names, and creates a directory for each project inside the parent. With fewer than two arguments it prints a usage message to standard error and exits with status 1. A project name with a space in it, such as `"web site"`, must create one directory, not two.

<details>
<summary>Check your work</summary>

```bash
#!/bin/bash
# mkprojects.sh: create a directory for each project under a parent.
# Usage: ./mkprojects.sh PARENT NAME...

usage() {
    echo "Usage: $0 PARENT NAME..." >&2
    echo "Create PARENT/NAME for each NAME." >&2
    exit 1
}

if [ $# -lt 2 ]; then
    usage
fi

parent="$1"
shift

for name in "$@"; do
    mkdir -p "$parent/$name"
    echo "Created $parent/$name"
done
```

```bash
root@lab:~/scripts# ./mkprojects.sh
Usage: ./mkprojects.sh PARENT NAME...
Create PARENT/NAME for each NAME.
root@lab:~/scripts# ./mkprojects.sh /tmp/work api "web site"
Created /tmp/work/api
Created /tmp/work/web site
root@lab:~/scripts# ls -1 /tmp/work
api
web site
```

The likely mistake is a missing pair of quotes. `for name in $@` or `mkdir -p $parent/$name` splits `web site` into two words, and you end up with `/tmp/work/web` plus a stray `site` directory wherever you ran the script.

</details>

### Task 2: A log level filter with options

Write `loglevel.sh` that prints the lines of a log at one level. It takes:

- `-l LEVEL` to choose the level, with `ERROR` as the default
- `-c` to print only the number of matching lines
- an optional file name; with none, it reads standard input

Match the level as a separate word, so `-l INFO` finds `09:00 INFO started`. Use `app.log` from the last section to test it, both as a file and through a pipe.

<details>
<summary>Check your work</summary>

```bash
#!/bin/bash
# loglevel.sh: show log lines at one level, from a file or standard input.
# Usage: ./loglevel.sh [-c] [-l LEVEL] [FILE]

usage() {
    echo "Usage: $0 [-c] [-l LEVEL] [FILE]" >&2
    echo "  -c        print only the number of matching lines" >&2
    echo "  -l LEVEL  level to show (default ERROR)" >&2
    exit 1
}

level=ERROR
count_only=no

while getopts "cl:" opt; do
    case "$opt" in
        c) count_only=yes ;;
        l) level="$OPTARG" ;;
        *) usage ;;
    esac
done
shift $((OPTIND - 1))

if [ $# -gt 1 ]; then
    usage
fi

input="${1:-/dev/stdin}"
count=0
while IFS= read -r line; do
    if [[ $line == *" $level "* ]]; then
        count=$((count + 1))
        if [ "$count_only" = no ]; then
            echo "$line"
        fi
    fi
done < "$input"

if [ "$count_only" = yes ]; then
    echo "$count"
fi
```

```bash
root@lab:~/scripts# ./loglevel.sh app.log
09:01 ERROR disk full
09:03 ERROR disk full
root@lab:~/scripts# ./loglevel.sh -l INFO app.log
09:00 INFO started
09:02 INFO retry
root@lab:~/scripts# cat app.log | ./loglevel.sh -c -l INFO
2
root@lab:~/scripts# ./loglevel.sh -l
./loglevel.sh: option requires an argument -- l
Usage: ./loglevel.sh [-c] [-l LEVEL] [FILE]
  -c        print only the number of matching lines
  -l LEVEL  level to show (default ERROR)
```

If `-l INFO app.log` tries to read a file called `-l`, the `shift $((OPTIND - 1))` line is missing. If `-l` with no value is accepted silently, check the option string is `"cl:"`, with the colon after `l`. You could also do the matching with `grep -w`; the loop is here to practise reading input.

</details>

## Quiz

**1. What does this script print when run as `./count.sh "a b" c`?**

```bash
#!/bin/bash
echo "$#"
for x in $*; do echo "$x"; done
```

<details>
<summary>Show answer</summary>

```
2
a
b
c
```

`$#` is 2, because the shell passed two arguments. The unquoted `$*` then splits `a b` on the space, so the loop runs three times. With `"$@"` it would print `a b` and `c`.

</details>

**2. A script uses `while getopts "f:q" opt` and you run it as `./tool.sh -q -f out.txt input.csv`. After the loop, what are `OPTARG` for `-f`, and `$1` after `shift $((OPTIND - 1))`?**

<details>
<summary>Show answer</summary>

When `getopts` handles `-f`, `OPTARG` is `out.txt`, because `f:` takes a value. After the loop and the shift, `$1` is `input.csv`: the three option words have been removed.

</details>

**3. A script on a server asks `Continue? [y/n]` with `read`. It works when you run it by hand, but when cron runs it each night, it always behaves as if the answer was no. Why, and what would you change?**

<details>
<summary>Show answer</summary>

Under cron there is no terminal and nobody to type an answer, so `read` reaches the end of its input straight away and the reply is empty, which the script treats as no. A script meant to run unattended should take its decision from an option or argument instead, such as a `-y` flag that skips the question, and only prompt when run by a person.

</details>

**4. Why should a password prompt use `read -r -s` rather than plain `read`?**

<details>
<summary>Show answer</summary>

`-s` stops the characters from being shown on the screen as they are typed, so nobody looking over your shoulder, or at a screen recording, sees the password. `-r` keeps any backslashes in the password exactly as typed, instead of treating them as escapes and dropping them.

</details>

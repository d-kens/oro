As a script grows past a screen or two, the same few lines start to appear in several places, and it gets hard to see what the script does as a whole. A **function** gives a group of commands a name. You write the commands once, call them by name wherever they are needed, and the top level of the script reads like a list of steps.

By the end you can define and call functions, pass them arguments, keep their variables local, get a yes or no or a value back from them, structure a script around a `main` function, and share functions between scripts with a library file.

## Defining and calling a function

A function is defined with its name, a pair of brackets, and the commands between braces. You call it by typing its name, like any other command:

```bash
#!/bin/bash
# greet.sh: define a function, then call it.

greet() {
    echo "Hello, $1. You passed $# argument(s) to the function."
}

greet sam
greet "priya and alex" extra
echo "The script itself got $# argument(s): $*"
```

```bash
root@lab:~/scripts# ./greet.sh a b
Hello, sam. You passed 1 argument(s) to the function.
Hello, priya and alex. You passed 2 argument(s) to the function.
The script itself got 2 argument(s): a b
```

The brackets in `greet()` are always empty. Arguments are not declared there; they are passed after the name when you call it, exactly as you pass arguments to a script.

Inside a function, **`$1`, `$2`, `$#` and `"$@"` refer to the function's own arguments**, not the script's. When the function returns, the script's arguments are back as they were. The rules from the *Arguments and input* topic still apply: quote `"$1"` and `"$@"`, and quote an argument with spaces when you call the function. `$0` stays the name of the script.

You may also see `function greet { … }`. It is a Bash-only spelling of the same thing. This skill uses `greet() { … }`, which works in every shell.

Bash reads a script from top to bottom, so a function must be defined before the line that calls it:

```bash
root@lab:~/scripts# cat order.sh
#!/bin/bash
say_hi
say_hi() {
    echo hi
}
root@lab:~/scripts# ./order.sh
./order.sh: line 2: say_hi: command not found
```

## Local variables

Variables in Bash are **global** by default: a variable set inside a function is the same variable as one with that name anywhere else in the script. That leads to bugs that are hard to spot:

```bash
#!/bin/bash
# global.sh: a function that changes a variable it should not.

count_files() {
    dir="$1"
    total=$(find "$dir" -maxdepth 1 -type f | wc -l)
    echo "$dir has $total files"
}

dir=/root/scripts
count_files /etc
echo "Working in $dir"
```

```bash
root@lab:~/scripts# ./global.sh
/etc has 43 files
Working in /etc
```

The function overwrote the script's `dir`. Declaring the variables with **`local`** keeps them inside the function:

```bash
#!/bin/bash
# local.sh: the same function with local variables.

count_files() {
    local dir="$1"
    local total
    total=$(find "$dir" -maxdepth 1 -type f | wc -l)
    echo "$dir has $total files"
}

dir=/root/scripts
count_files /etc
echo "Working in $dir"
```

```bash
root@lab:~/scripts# ./local.sh
/etc has 43 files
Working in /root/scripts
```

Make every variable in a function `local` unless you mean the function to change something outside it. Notice that `total` is declared on one line and set on the next. `local total=$(…)` works, but `local` then hides whether the command inside `$( )` failed, because the status you get back is that of `local` itself. ShellCheck warns about this; the *Exit codes and errors* topic explains statuses.

## Getting a result back

A function can hand back two different things, and they are easy to mix up.

**A status, with `return`.** Every command finishes with an exit status from 0 to 255: 0 means success, anything else means failure. A function's status is the status of the last command it ran, or the number given to `return`. Status is for yes or no, not for data. Try to return a number with it and you get the wrong answer, because only 0 to 255 fit:

```bash
#!/bin/bash
# retbad.sh: trying to return a number with return.

file_size() {
    return "$(stat -c %s "$1")"
}

file_size /etc/passwd
echo "Size: $?"
stat -c %s /etc/passwd
```

```bash
root@lab:~/scripts# ./retbad.sh
Size: 120
888
```

888 does not fit, so it wrapped round to 120, with no warning.

**A value, by printing it.** To get data out of a function, have it print the value and capture the output with `$( )`, the command substitution from the *Shell variables* topic:

```bash
#!/bin/bash
# retgood.sh: print the value and capture it.

file_size() {
    stat -c %s "$1"
}

size=$(file_size /etc/passwd)
echo "Size: $size bytes"
```

```bash
root@lab:~/scripts# ./retgood.sh
Size: 888 bytes
```

This means everything the function prints to standard output ends up in the variable. If a function needs to print a message as well as its value, send the message to standard error with `>&2`, so it shows on the screen but is not captured.

## Functions that test something

Because `if` runs a command and checks its status, a function that succeeds or fails can be used directly in `if`. You do not need `[ ]` around it or `$?` after it:

```bash
#!/bin/bash
# users.sh: functions that answer yes or no.

user_exists() {
    id "$1" > /dev/null 2>&1
}

is_root() {
    [ "$(id -u)" -eq 0 ]
}

if is_root; then
    echo "Running as root"
fi

for name in root sam; do
    if user_exists "$name"; then
        echo "$name exists"
    else
        echo "$name does not exist"
    fi
done
```

```bash
root@lab:~/scripts# ./users.sh
Running as root
root exists
sam does not exist
```

Neither function needs `return`. `user_exists` ends with `id`, which fails for an unknown user, and `is_root` ends with a test, so the function's status is the answer. Names like `is_…`, `has_…` and `…_exists` make the `if` lines read naturally.

A common mistake is `if [ user_exists "$name" ]`. The brackets are the `test` command, which sees the words `user_exists` and `sam` as strings; it never runs the function, and fails with `[: user_exists: unary operator expected`.

## A main function and library files

A longer script is easier to read if the top level does nothing but define functions, and one function called `main` runs the steps in order. The last line calls it with the script's arguments:

```bash
#!/bin/bash
# report.sh: print a short report about this machine.
# Usage: ./report.sh [TITLE]

print_header() {
    echo "== $1 =="
}

print_disk() {
    df -h / | tail -n 1
}

print_load() {
    cut -d ' ' -f 1-3 /proc/loadavg
}

main() {
    local title="${1:-$(hostname)}"
    print_header "$title"
    print_disk
    print_load
}

main "$@"
```

```bash
root@lab:~/scripts# ./report.sh "Web server"
== Web server ==
overlay         453G   18G  412G   5% /
0.03 0.08 0.06
```

This layout has three benefits. You read `main` first to see what the script does, then the helpers for detail. All the variables in `main` can be `local`. And since every function is defined before `main "$@"` runs, the order of the definitions does not matter. Pass `"$@"`, quoted: `main` without it receives no arguments, and `main $@` splits them on spaces.

When several scripts need the same functions, put them in a **library file** and **source** it. The *Shell scripting basics* topic showed that `source` runs a file in the current shell, so the functions it defines become available to the script:

```bash
#!/bin/bash
# lib.sh: shared functions. Source this file; do not run it.

log() {
    echo "$(date '+%F %T') $*"
}

die() {
    echo "ERROR: $*" >&2
    exit 1
}
```

```bash
#!/bin/bash
# deploy.sh: uses the functions in lib.sh.

# shellcheck source=lib.sh
source "$(dirname "$0")/lib.sh"

main() {
    local version="$1"
    [ -n "$version" ] || die "no version given"
    log "Deploying version $version"
    log "Done"
}

main "$@"
```

```bash
root@lab:~/scripts# ./deploy.sh 1.4.2
2026-10-25 08:40:45 Deploying version 1.4.2
2026-10-25 08:40:45 Done
root@lab:~/scripts# ./deploy.sh
ERROR: no version given
root@lab:~/scripts# cd /tmp && /root/scripts/deploy.sh 2.0
2026-10-25 08:40:45 Deploying version 2.0
2026-10-25 08:40:45 Done
```

- `"$(dirname "$0")/lib.sh"` finds the library next to the script. Writing `source lib.sh` only works when you happen to run the script from its own directory; the last run above, from `/tmp`, would fail.
- The library has no execute permission and does not need one, because it is only ever sourced. The shebang is there so editors and ShellCheck know it is Bash.
- `die` calls `exit`. A sourced function runs in the script's own shell, so `exit` ends the whole script, which is what you want from `die`.
- The `# shellcheck source=lib.sh` comment tells ShellCheck where the file is. Run `shellcheck -x deploy.sh` so it reads the library too.

## Tasks

### Task 1: Check a list of users

Write `check-users.sh`, which takes one or more user names. For each, it prints the user's home directory, or says there is no such user. Use a function `user_exists` that you call in an `if`, a function `home_dir` that prints the home directory (from `getent passwd NAME`, field 6), and a `main` function. With no arguments it prints a usage message to standard error and exits with status 1.

To have a second real user to test with, run `useradd -m priya` in the container.

<details>
<summary>Check your work</summary>

```bash
#!/bin/bash
# check-users.sh: report whether each user exists, and their home directory.
# Usage: ./check-users.sh USER...

user_exists() {
    id "$1" > /dev/null 2>&1
}

home_dir() {
    getent passwd "$1" | cut -d: -f6
}

main() {
    if [ $# -eq 0 ]; then
        echo "Usage: $0 USER..." >&2
        exit 1
    fi

    local name
    for name in "$@"; do
        if user_exists "$name"; then
            echo "$name: home is $(home_dir "$name")"
        else
            echo "$name: no such user"
        fi
    done
}

main "$@"
```

```bash
root@lab:~/scripts# useradd -m priya
root@lab:~/scripts# ./check-users.sh root priya sam
root: home is /root
priya: home is /home/priya
sam: no such user
root@lab:~/scripts# ./check-users.sh
Usage: ./check-users.sh USER...
```

If every user is reported as missing, check the last line is `main "$@"` and not `main`: without `"$@"`, `main` gets no arguments, and with none it should print the usage. If `user_exists` prints `uid=0(root) …` lines, its output is not redirected to `/dev/null`.

</details>

### Task 2: Use a library

Using the `lib.sh` from this topic, write `disk-check.sh`. It takes an optional mount point (default `/`) and an optional limit in percent (default 80). It sources `lib.sh`, has a function `disk_percent` that prints how full a filesystem is as a bare number (`df --output=pcent MOUNT` gives `Use%` and a value such as ` 5%`), and logs `OK` or `WARN` with `log`. If the mount point is not a directory, it stops with `die`.

<details>
<summary>Check your work</summary>

```bash
#!/bin/bash
# disk-check.sh: warn when a filesystem is fuller than a limit.
# Usage: ./disk-check.sh [MOUNT] [LIMIT]

# shellcheck source=lib.sh
source "$(dirname "$0")/lib.sh"

disk_percent() {
    df --output=pcent "$1" | tail -n 1 | tr -dc '0-9'
}

main() {
    local mount="${1:-/}"
    local limit="${2:-80}"
    local used

    [ -d "$mount" ] || die "$mount is not a directory"
    used=$(disk_percent "$mount")

    if [ "$used" -ge "$limit" ]; then
        log "WARN $mount is ${used}% full (limit ${limit}%)"
    else
        log "OK $mount is ${used}% full (limit ${limit}%)"
    fi
}

main "$@"
```

```bash
root@lab:~/scripts# ./disk-check.sh
2026-10-25 08:41:23 OK / is 5% full (limit 80%)
root@lab:~/scripts# ./disk-check.sh / 3
2026-10-25 08:41:23 WARN / is 5% full (limit 3%)
root@lab:~/scripts# ./disk-check.sh /nope
ERROR: /nope is not a directory
root@lab:~/scripts# echo $?
1
```

`tr -dc '0-9'` deletes every character that is not a digit, which removes the space and the `%`. If you see `integer expression expected`, `disk_percent` is printing something other than a bare number, such as the `Use%` header line; check the `tail -n 1`. If you get `lib.sh: No such file or directory` when running from another directory, use the `dirname "$0"` form of `source`.

</details>

## Quiz

**1. What does this print?**

```bash
#!/bin/bash
set_vars() {
    local a=inner
    b=inner
}
a=outer
b=outer
set_vars
echo "$a $b"
```

<details>
<summary>Show answer</summary>

`outer inner`. The function's `a` is local, so the script's `a` is untouched. Its `b` is not, so it is the same variable as the script's `b`, and the function changed it.

</details>

**2. A function `count_errors` works out how many errors are in a log, and the script uses `count_errors app.log; echo "$?"` to show the result. It shows the right number for small logs and wrong numbers for large ones. Why, and what is the fix?**

<details>
<summary>Show answer</summary>

The function is returning the count with `return`, and a status can only be 0 to 255. Any count above 255 wraps round. Have the function print the number instead, and capture it: `errors=$(count_errors app.log)`.

</details>

**3. A script on a server has a function `get_version` that prints `Reading version file` and then the version number. The script does `version=$(get_version)` and writes `$version` into a config file, which ends up containing two lines. What happened, and how do you fix it?**

<details>
<summary>Show answer</summary>

`$( )` captures everything the function prints to standard output, so the message became part of the value. Send the message to standard error instead, with `echo "Reading version file" >&2`. It still shows on the screen, but only the version is captured.

</details>

**4. Why is `if [ is_running nginx ]` wrong, and what should it be?**

<details>
<summary>Show answer</summary>

`[ ]` is the `test` command. It treats `is_running` and `nginx` as strings and never calls the function. Use the function as the command `if` runs: `if is_running nginx; then`.

</details>

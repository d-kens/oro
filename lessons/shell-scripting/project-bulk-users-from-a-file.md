When a team grows by ten people, nobody wants to type `useradd` ten times, and a typo in one of them is easy to miss. In this project you write `bulk-users.sh`, a script that reads a CSV file of accounts, checks every line, creates the groups and users that are missing, brings existing users in line with the file, and prints a summary. It has a dry-run mode, and running it twice makes no changes the second time.

It uses *Loops* for reading the file line by line, *Conditionals* and *Parameter expansion* for validation, *Arguments and input* for `getopts` and the usage message, *Functions* and *Arrays* for the structure and the counters, *Exit codes and errors* for the status it returns, *Robust scripts* for `set -euo pipefail`, a trap and being safe to run twice, and *Real-world scripts* for the dry run and logging. From the Linux skill it draws on *Users and permissions*.

## What you need

The practice machine from *Shell scripting basics*, started from `~/scripts` on your computer:

```bash
$ cd ~/scripts
$ docker run -it --rm --hostname lab -v "$PWD":/root/scripts -w /root/scripts ubuntu:24.04
root@lab:~/scripts#
```

Install ShellCheck:

```bash
root@lab:~/scripts# apt update && apt install -y shellcheck
```

The container is the right place for this project, because the script creates real accounts and the container throws them away when you exit. On a machine you care about, only run it with `-n` until you trust it.

Save this sample file as `users.csv`. Lines 5 to 7 and line 10 are wrong on purpose, and line 8 is blank:

```text
username,full name,group,shell
sam,Sam Lee,developers,/bin/bash
priya,Priya Shah,developers,/bin/bash
alex,Alex Kim,ops,/bin/sh
jo,Jo Brown,ops
Morgan,Morgan Diaz,ops,/bin/bash
taylor,Taylor Wu,support,/bin/fish

casey,Casey Moss,support,/bin/bash
sam,Sam Lee,ops,/bin/bash
```

## The brief

1. `./bulk-users.sh users.csv` reads the file, skips the header line and blank lines, and handles each other line on its own. Check: the output mentions every non-blank line from 2 to 10.
2. Each line is validated before anything changes: exactly four fields, a valid user name and group name (lower case letters, digits, `_` and `-`, starting with a letter or `_`), a non-empty full name, a shell listed in `/etc/shells`, and a user name not already seen earlier in the file. A bad line is reported with its line number and the reason, and the script carries on. Check: lines 5, 6, 7 and 10 of the sample are reported.
3. Missing groups are created with `groupadd`, and missing users with `useradd`, including a home directory, the full name, the group and the shell. Check: `getent passwd sam` and `id sam`.
4. A user who exists but has a different primary group or shell is updated with `usermod`. Check: change alex's shell in the file, run again, and `getent passwd alex` shows the new shell.
5. Running the script a second time with the same file changes nothing and reports every good line as skipped. Check: the summary says created 0, updated 0.
6. `-n` prints the commands it would run and changes nothing. Check: after a dry run, `getent passwd sam` prints nothing.
7. The script ends with a summary of created, updated, skipped and failed, and exits 0 if nothing failed, 1 if any line failed, and 2 for a usage error or when run without root outside a dry run. Check: `echo $?`.
8. The script passes ShellCheck. Check: `shellcheck bulk-users.sh` prints nothing.

## Steps

### Read and split the file

Start with a loop that reads the file and prints each line with its number, before it does anything to accounts. Three details matter in a file that came from someone else:

- `while IFS= read -r line` keeps the line exactly as written. Add `|| [[ -n $line ]]` so the last line is still read when the file does not end with a newline, which is common in files saved by spreadsheet programs.
- A file saved on Windows ends each line with a carriage return. `line=${line%$'\r'}` removes it; otherwise the shell on the last field would be `/bin/bash\r`, which is not in `/etc/shells`.
- Split a line into fields with `IFS=, read -r username fullname group shell extra <<< "$line"`. Naming a fifth variable catches lines with too many fields: anything after the fourth comma lands in `extra`.

Hint: count lines yourself in a variable, and count every line, including the header and blank ones, so the numbers you report match what someone sees in an editor.

<details>
<summary>Show a solution</summary>

A first version, `read-csv.sh`, to check the splitting:

```bash
#!/bin/bash
set -euo pipefail

lineno=0
while IFS= read -r line || [[ -n $line ]]; do
  lineno=$(( lineno + 1 ))
  line=${line%$'\r'}
  [[ -z ${line//[[:space:]]/} ]] && continue
  (( lineno == 1 )) && [[ $line == username,* ]] && continue
  IFS=, read -r username fullname group shell extra <<< "$line"
  printf '%2d user=%-7s name=%-12s group=%-11s shell=%-10s extra=%s\n' \
    "$lineno" "$username" "$fullname" "$group" "$shell" "$extra"
done < "$1"
```

```bash
root@lab:~/scripts# ./read-csv.sh users.csv
 2 user=sam     name=Sam Lee      group=developers  shell=/bin/bash  extra=
 3 user=priya   name=Priya Shah   group=developers  shell=/bin/bash  extra=
 4 user=alex    name=Alex Kim     group=ops         shell=/bin/sh    extra=
 5 user=jo      name=Jo Brown     group=ops         shell=           extra=
 6 user=Morgan  name=Morgan Diaz  group=ops         shell=/bin/bash  extra=
 7 user=taylor  name=Taylor Wu    group=support     shell=/bin/fish  extra=
 9 user=casey   name=Casey Moss   group=support     shell=/bin/bash  extra=
10 user=sam     name=Sam Lee      group=ops         shell=/bin/bash  extra=
```

Line 5 has an empty shell and nothing in `extra`, so it has too few fields. Line 8 is not printed because it is blank.

A common mistake is `for line in $(cat users.csv)`. That splits on every space as well as every newline, so `Sam Lee` becomes two items, and the line numbers are lost.

</details>

### Validate each line

Write a function, `validate`, that takes the five fields and prints the reason the line is bad, or prints nothing if it is good. The caller captures it with `problem=$(validate ...)` and treats any output as a failure. One function with one job is easy to test on its own.

Check, in this order: too many fields, too few, the user name, the full name, the group, the shell, and duplicates. Keep the patterns strict; the names end up in system files, and a name with a space or a capital letter causes trouble later.

Hint: put the name pattern in a variable, `readonly NAME_RE='^[a-z_][a-z0-9_-]{0,31}$'`, and use it unquoted on the right of `=~`, since quoting it would make it a plain string. `grep -qxF -- "$shell" /etc/shells` checks that the shell is listed as a whole line. For duplicates, keep an associative array `seen` from user name to the line number where it first appeared. A full name must not contain `:`, because that is the field separator in `/etc/passwd`.

<details>
<summary>Show a solution</summary>

```bash
validate() {
  local username=$1 fullname=$2 group=$3 shell=$4 extra=$5
  if [[ -n $extra ]]; then echo "too many fields"
  elif [[ -z $shell ]]; then echo "expected 4 fields"
  elif [[ ! $username =~ $NAME_RE ]]; then echo "bad username '$username'"
  elif [[ -z $fullname || $fullname == *:* ]]; then echo "bad full name '$fullname'"
  elif [[ ! $group =~ $NAME_RE ]]; then echo "bad group '$group'"
  elif ! grep -qxF -- "$shell" /etc/shells; then echo "shell '$shell' is not in /etc/shells"
  elif [[ -n ${seen[$username]:-} ]]; then echo "duplicate of line ${seen[$username]}"
  fi
}
```

`${seen[$username]:-}` gives an empty string when the key is missing. Without `:-`, `set -u` stops the script the first time it looks up a name it has not seen.

The function runs inside `$( )`, a subshell, so it can read `seen` but must not change it. The main loop records `seen[$username]=$lineno` after a line passes.

</details>

### Create or update, with a dry run

Now act on a good line. Look the user up with `getent passwd`, which also finds users from a directory service, unlike reading `/etc/passwd` directly.

- If the group is missing, create it with `groupadd`.
- If the user is missing, create it with `useradd -m -c "$fullname" -g "$group" -s "$shell" "$username"`.
- If the user exists, compare its primary group (`id -gn`) and shell (the last field of the `getent` line) with the file. Collect only the differences in an array, such as `(-s /bin/bash)`, and call `usermod` only if the array is not empty. Otherwise count the line as skipped.

That comparison is what makes the script safe to run twice: it changes only what differs, so a second run finds nothing to do.

For the dry run, route every command that changes the system through one function, `run`. With `-n` it prints the command; otherwise it runs it. Each check above still runs in a dry run, because looking does no harm.

Hint: `"$@"` inside `run` runs the arguments as a command with each one intact. To print a command so that it could be pasted back into a shell, use `printf ' %q' "$@"`, which escapes spaces. Count results in an associative array, `count[created]` and so on. Avoid `(( count[created]++ ))`: when the old value is 0 it returns a failure status and `set -e` ends the script.

<details>
<summary>Show a solution</summary>

This is the whole script, `bulk-users.sh`:

```bash
#!/bin/bash
# Creates and updates user accounts from a CSV file of
# username,full name,group,shell. Safe to run more than once.
# Exits 0 when every line worked, 1 if any line failed, 2 on a usage error.
set -euo pipefail

readonly SCRIPT_NAME=${0##*/}
readonly NAME_RE='^[a-z_][a-z0-9_-]{0,31}$'

dry_run=false
note=""                   # set to " (dry run)" with -n
declare -A count=([created]=0 [updated]=0 [skipped]=0 [failed]=0)
declare -A seen=()        # usernames already handled in this file
declare -A new_groups=()  # groups created (or that would be) in this run

usage() {
  echo "Usage: $SCRIPT_NAME [-n] [-h] FILE.csv"
  echo "  -n  dry run: print what would change, change nothing"
  echo "  -h  show this help"
}

log() {
  printf '%s %s\n' "$(date '+%F %T')" "$*"
}

err() {
  printf '%s ERROR: %s\n' "$(date '+%F %T')" "$*" >&2
}

# Runs a command, or only prints it in a dry run.
run() {
  if $dry_run; then
    log "would run:$(printf ' %q' "$@")"
  else
    "$@"
  fi
}

bump() {
  count[$1]=$(( count[$1] + 1 ))
}

summary() {
  log "Summary$note: created ${count[created]}, updated ${count[updated]}," \
      "skipped ${count[skipped]}, failed ${count[failed]}"
}

# Prints the reason a line is invalid, or nothing if it is fine.
validate() {
  local username=$1 fullname=$2 group=$3 shell=$4 extra=$5
  if [[ -n $extra ]]; then echo "too many fields"
  elif [[ -z $shell ]]; then echo "expected 4 fields"
  elif [[ ! $username =~ $NAME_RE ]]; then echo "bad username '$username'"
  elif [[ -z $fullname || $fullname == *:* ]]; then echo "bad full name '$fullname'"
  elif [[ ! $group =~ $NAME_RE ]]; then echo "bad group '$group'"
  elif ! grep -qxF -- "$shell" /etc/shells; then echo "shell '$shell' is not in /etc/shells"
  elif [[ -n ${seen[$username]:-} ]]; then echo "duplicate of line ${seen[$username]}"
  fi
}

ensure_group() {
  local group=$1
  getent group "$group" > /dev/null && return 0
  [[ -n ${new_groups[$group]:-} ]] && return 0
  run groupadd "$group" || return 1
  new_groups[$group]=1
  log "group $group created$note"
}

# Creates the user, or brings an existing one in line with the file.
apply_user() {
  local lineno=$1 username=$2 fullname=$3 group=$4 shell=$5
  local entry cur_group cur_shell changes=()

  if ! entry=$(getent passwd "$username"); then
    if run useradd -m -c "$fullname" -g "$group" -s "$shell" "$username"; then
      log "line $lineno: $username created$note"
      bump created
    else
      err "line $lineno: useradd failed for $username"
      bump failed
    fi
    return
  fi

  cur_group=$(id -gn "$username")
  cur_shell=${entry##*:}
  [[ $cur_group != "$group" ]] && changes+=(-g "$group")
  [[ $cur_shell != "$shell" ]] && changes+=(-s "$shell")

  if (( ${#changes[@]} == 0 )); then
    log "line $lineno: $username already up to date"
    bump skipped
  elif run usermod "${changes[@]}" "$username"; then
    log "line $lineno: $username updated (${changes[*]})$note"
    bump updated
  else
    err "line $lineno: usermod failed for $username"
    bump failed
  fi
}

main() {
  local opt
  while getopts ':nh' opt; do
    case $opt in
      n) dry_run=true; note=" (dry run)" ;;
      h) usage; exit 0 ;;
      *) usage >&2; exit 2 ;;
    esac
  done
  shift $((OPTIND - 1))

  if (( $# != 1 )); then
    usage >&2
    exit 2
  fi
  local file=$1
  [[ -r $file ]] || { err "cannot read $file"; exit 2; }
  if ! $dry_run && (( EUID != 0 )); then
    err "run as root, or use -n for a dry run"
    exit 2
  fi

  trap 'err "interrupted"; summary; exit 130' INT TERM
  $dry_run && log "Dry run: nothing will be changed"

  local line lineno=0 username fullname group shell extra problem
  while IFS= read -r line || [[ -n $line ]]; do
    lineno=$(( lineno + 1 ))
    line=${line%$'\r'}                       # tolerate Windows line endings
    [[ -z ${line//[[:space:]]/} ]] && continue
    (( lineno == 1 )) && [[ $line == username,* ]] && continue

    IFS=, read -r username fullname group shell extra <<< "$line"
    problem=$(validate "$username" "$fullname" "$group" "$shell" "$extra")
    if [[ -n $problem ]]; then
      err "line $lineno: $problem"
      bump failed
      continue
    fi
    seen[$username]=$lineno

    if ! ensure_group "$group"; then
      err "line $lineno: could not create group $group"
      bump failed
      continue
    fi
    apply_user "$lineno" "$username" "$fullname" "$group" "$shell"
  done < "$file"

  summary
  (( count[failed] == 0 )) || exit 1
}

main "$@"
```

A few things to notice:

- In a dry run a new group does not get created, so the next user in the same group would ask for it again. The `new_groups` array remembers groups this run has created, or would have.
- The `trap` on `INT` and `TERM` prints the summary if you press Ctrl+C halfway through a long file, so you know how far it got. Exit status 130 is the usual one for a script stopped by Ctrl+C.
- The root check comes after the options are read, so `-n` works for anyone.

```bash
root@lab:~/scripts# chmod +x bulk-users.sh
root@lab:~/scripts# shellcheck bulk-users.sh
root@lab:~/scripts#
```

</details>

### Run it, then run it again

Try it in the safe order: a dry run, the real run, and a second real run. Then change the file and see an update.

<details>
<summary>Show a solution</summary>

The dry run:

```bash
root@lab:~/scripts# ./bulk-users.sh -n users.csv; echo "exit $?"
2026-10-25 09:01:21 Dry run: nothing will be changed
2026-10-25 09:01:21 would run: groupadd developers
2026-10-25 09:01:21 group developers created (dry run)
2026-10-25 09:01:21 would run: useradd -m -c Sam\ Lee -g developers -s /bin/bash sam
2026-10-25 09:01:21 line 2: sam created (dry run)
2026-10-25 09:01:21 would run: useradd -m -c Priya\ Shah -g developers -s /bin/bash priya
2026-10-25 09:01:21 line 3: priya created (dry run)
2026-10-25 09:01:21 would run: groupadd ops
2026-10-25 09:01:21 group ops created (dry run)
2026-10-25 09:01:21 would run: useradd -m -c Alex\ Kim -g ops -s /bin/sh alex
2026-10-25 09:01:21 line 4: alex created (dry run)
2026-10-25 09:01:21 ERROR: line 5: expected 4 fields
2026-10-25 09:01:21 ERROR: line 6: bad username 'Morgan'
2026-10-25 09:01:21 ERROR: line 7: shell '/bin/fish' is not in /etc/shells
2026-10-25 09:01:21 would run: groupadd support
2026-10-25 09:01:21 group support created (dry run)
2026-10-25 09:01:21 would run: useradd -m -c Casey\ Moss -g support -s /bin/bash casey
2026-10-25 09:01:21 line 9: casey created (dry run)
2026-10-25 09:01:21 ERROR: line 10: duplicate of line 2
2026-10-25 09:01:21 Summary (dry run): created 4, updated 0, skipped 0, failed 4
exit 1
root@lab:~/scripts# getent passwd sam || echo "no user sam"
no user sam
```

`Sam\ Lee` is how `%q` shows a value with a space in it: one argument, not two.

The real run, and the same command again:

```bash
root@lab:~/scripts# ./bulk-users.sh users.csv
2026-10-25 09:01:21 group developers created
2026-10-25 09:01:21 line 2: sam created
2026-10-25 09:01:21 line 3: priya created
2026-10-25 09:01:21 group ops created
2026-10-25 09:01:21 line 4: alex created
2026-10-25 09:01:21 ERROR: line 5: expected 4 fields
2026-10-25 09:01:21 ERROR: line 6: bad username 'Morgan'
2026-10-25 09:01:21 ERROR: line 7: shell '/bin/fish' is not in /etc/shells
2026-10-25 09:01:21 group support created
2026-10-25 09:01:21 line 9: casey created
2026-10-25 09:01:21 ERROR: line 10: duplicate of line 2
2026-10-25 09:01:21 Summary: created 4, updated 0, skipped 0, failed 4
root@lab:~/scripts# ./bulk-users.sh users.csv
2026-10-25 09:01:21 line 2: sam already up to date
2026-10-25 09:01:21 line 3: priya already up to date
2026-10-25 09:01:21 line 4: alex already up to date
2026-10-25 09:01:21 ERROR: line 5: expected 4 fields
2026-10-25 09:01:21 ERROR: line 6: bad username 'Morgan'
2026-10-25 09:01:21 ERROR: line 7: shell '/bin/fish' is not in /etc/shells
2026-10-25 09:01:21 line 9: casey already up to date
2026-10-25 09:01:21 ERROR: line 10: duplicate of line 2
2026-10-25 09:01:21 Summary: created 0, updated 0, skipped 4, failed 4
```

The second run creates nothing and changes nothing. It exits 1 both times because the sample still has four bad lines; fix or remove them and it exits 0.

Now edit the file: change alex's shell on line 4 to `/bin/bash` and move priya to the `ops` group on line 3. Check with a dry run, then apply:

```bash
root@lab:~/scripts# ./bulk-users.sh -n users.csv 2> /dev/null
2026-10-25 09:01:21 Dry run: nothing will be changed
2026-10-25 09:01:21 line 2: sam already up to date
2026-10-25 09:01:21 would run: usermod -g ops priya
2026-10-25 09:01:21 line 3: priya updated (-g ops) (dry run)
2026-10-25 09:01:21 would run: usermod -s /bin/bash alex
2026-10-25 09:01:21 line 4: alex updated (-s /bin/bash) (dry run)
2026-10-25 09:01:21 line 9: casey already up to date
2026-10-25 09:01:21 Summary (dry run): created 0, updated 2, skipped 2, failed 4
root@lab:~/scripts# ./bulk-users.sh users.csv 2> /dev/null
2026-10-25 09:01:21 line 2: sam already up to date
2026-10-25 09:01:21 line 3: priya updated (-g ops)
2026-10-25 09:01:21 line 4: alex updated (-s /bin/bash)
2026-10-25 09:01:21 line 9: casey already up to date
2026-10-25 09:01:21 Summary: created 0, updated 2, skipped 2, failed 4
```

`2> /dev/null` hides the error lines for the bad rows, which you have already seen; they still count in the summary. `usermod -g` changes the primary group only. Priya's old group, `developers`, still exists, which is what you want when other people are in it.

</details>

## Check it works

The script is clean and has a usage message:

```bash
root@lab:~/scripts# shellcheck bulk-users.sh && echo "no warnings"
no warnings
root@lab:~/scripts# ./bulk-users.sh; echo "exit $?"
Usage: bulk-users.sh [-n] [-h] FILE.csv
  -n  dry run: print what would change, change nothing
  -h  show this help
exit 2
```

The accounts match the file:

```bash
root@lab:~/scripts# getent passwd sam priya alex casey
sam:x:1001:1001:Sam Lee:/home/sam:/bin/bash
priya:x:1002:1002:Priya Shah:/home/priya:/bin/bash
alex:x:1003:1002:Alex Kim:/home/alex:/bin/bash
casey:x:1004:1003:Casey Moss:/home/casey:/bin/bash
root@lab:~/scripts# id priya
uid=1002(priya) gid=1002(ops) groups=1002(ops)
root@lab:~/scripts# ls /home
alex
casey
priya
sam
ubuntu
```

A third run changes nothing:

```bash
root@lab:~/scripts# ./bulk-users.sh users.csv 2> /dev/null | tail -n 1
2026-10-25 09:01:21 Summary: created 0, updated 0, skipped 4, failed 4
```

Without root, it refuses to change anything:

```bash
root@lab:~/scripts# su -s /bin/bash sam -c "./bulk-users.sh users.csv"; echo "exit $?"
2026-10-25 09:01:21 ERROR: run as root, or use -n for a dry run
exit 2
```

## Going further

- Add a `-r` option that locks (`usermod -L`) users who are in a given group but no longer in the file, with the dry run respected.
- Accept supplementary groups in a fifth column, separated by `;`, and apply them with `usermod -aG`.
- Read the file from standard input when the argument is `-`, so the script can sit at the end of a pipeline.

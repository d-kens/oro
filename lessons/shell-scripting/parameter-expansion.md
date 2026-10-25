So far you have read variables with `$name` and `${name}`. Inside the braces, Bash can do more than read the value: it can fill in a default, stop when a value is missing, cut a path into folder and file name, swap one word for another, and change case. This is **parameter expansion**, and it replaces many small calls to `basename`, `dirname`, `sed` and `tr`.

Because it all happens inside Bash, it is fast, and it keeps a value as one piece when you quote it. By the end you can give settings sensible defaults, take paths and file names apart, rename files in bulk, and read the dense `${...}` lines you will meet in other people's scripts.

## Defaults and required values

Scripts often read settings from the environment, as in the *Shell variables* topic. When a setting is not given, you usually want either a sensible default or a clear error.

**`${var:-default}`** gives the value of `var`, or `default` if `var` is unset or empty:

```bash
#!/bin/bash
# show-settings.sh: show settings, with defaults for anything not set.
env_name=${APP_ENV:-development}
port=${PORT:-8080}
echo "Environment: $env_name"
echo "Port: $port"
```

```bash
root@lab:~/scripts# ./show-settings.sh
Environment: development
Port: 8080
root@lab:~/scripts# APP_ENV=staging PORT=9000 ./show-settings.sh
Environment: staging
Port: 9000
```

`${var:-default}` does not change `var` itself. **`${var:=default}`** does: if `var` is unset or empty, it sets it to the default and then gives the value. It is often written on a line of its own after `:`, a command that does nothing, so the only effect is the assignment:

```bash
#!/bin/bash
: "${LOG_DIR:=/var/log/shop}"
echo "Logging to $LOG_DIR"
```

```bash
root@lab:~/scripts# ./log-dir.sh
Logging to /var/log/shop
root@lab:~/scripts# LOG_DIR=/tmp/logs ./log-dir.sh
Logging to /tmp/logs
```

**`${var:?message}`** stops the script with an error if `var` is unset or empty. Use it for values the script cannot do without:

```bash
#!/bin/bash
# clean-build.sh: empty the build folder.
build_dir=${BUILD_DIR:?BUILD_DIR must be set}
echo "Cleaning $build_dir"
```

```bash
root@lab:~/scripts# ./clean-build.sh
./clean-build.sh: line 3: BUILD_DIR: BUILD_DIR must be set
root@lab:~/scripts# echo $?
1
root@lab:~/scripts# BUILD_DIR=/srv/build ./clean-build.sh
Cleaning /srv/build
```

This matters most before anything destructive. If `BUILD_DIR` were empty, `rm -rf "$BUILD_DIR"/*` would become `rm -rf /*`. `rm -rf "${BUILD_DIR:?}"/*` refuses to run instead.

Each of these also has a form without the colon, such as `${var-default}`, which only applies when `var` is unset, not when it is set but empty. The colon forms are what you want almost every time.

## Length

**`${#var}`** gives the number of characters in the value:

```bash
root@lab:~/scripts# token="abc123"
root@lab:~/scripts# echo "${#token}"
6
```

It is handy for simple checks, such as `[[ ${#password} -lt 12 ]]` to reject a short password, or `[[ ${#name} -gt 32 ]]` to reject a user name that is too long.

## Trimming the start and end

Four expansions remove a pattern from the start or end of a value. The patterns use the same `*` and `?` as file names.

| Expansion | Removes | Match |
| --- | --- | --- |
| `${var#pattern}` | From the start | Shortest |
| `${var##pattern}` | From the start | Longest |
| `${var%pattern}` | From the end | Shortest |
| `${var%%pattern}` | From the end | Longest |

To remember which is which: on most keyboards `#` is to the left of `%`, so `#` trims the left and `%` the right. One symbol removes as little as possible, two as much as possible. Here they are on one path:

```bash
#!/bin/bash
path="/var/log/nginx/access.log.gz"
echo "${path#*/}"
echo "${path##*/}"
echo "${path%.*}"
echo "${path%%.*}"
```

```bash
root@lab:~/scripts# ./trim.sh
var/log/nginx/access.log.gz
access.log.gz
/var/log/nginx/access.log
/var/log/nginx/access
```

- `#*/` removed the shortest match of "anything then `/`" from the start, which is only the first `/`.
- `##*/` removed the longest, everything up to the last `/`, leaving the file name.
- `%.*` removed the shortest "`.` then anything" from the end, the last extension.
- `%%.*` removed the longest, from the first `.` onwards.

### Splitting a path

Put together, these take a path apart without running `dirname` or `basename`:

```bash
#!/bin/bash
# split-path.sh: take a path apart without calling other programs.
path="/srv/shop/releases/build-42.tar.gz"
dir=${path%/*}
file=${path##*/}
name=${file%%.*}
ext=${file#*.}
echo "Folder:    $dir"
echo "File:      $file"
echo "Name:      $name"
echo "Extension: $ext"
```

```bash
root@lab:~/scripts# ./split-path.sh
Folder:    /srv/shop/releases
File:      build-42.tar.gz
Name:      build-42
Extension: tar.gz
```

Choose one or two symbols on purpose. For `build-42.tar.gz`, `${file%.*}` gives `build-42.tar` and `${file##*.}` gives `gz`, which may be what you want if you only care about the last extension. A name with dots in it, such as `release.v2.zip`, shows the difference too. Also note that `${path%/*}` on a path with no `/`, such as `app.log`, gives back `app.log` unchanged, where `dirname` would give `.`.

### Renaming files

A common use is changing a file's extension in a loop:

```bash
#!/bin/bash
# rename-jpeg.sh: rename every .jpeg file in this folder to .jpg.
for file in *.jpeg; do
    [[ -e $file ]] || continue
    new="${file%.jpeg}.jpg"
    mv -- "$file" "$new"
    echo "$file -> $new"
done
```

```bash
root@lab:~/scripts/photos# ../rename-jpeg.sh
beach day.jpeg -> beach day.jpg
cat.jpeg -> cat.jpg
```

`${file%.jpeg}` removes the exact text `.jpeg` from the end, and `.jpg` is added back. The `--` tells `mv` that no options follow, so a file name starting with `-` is not mistaken for one. As always, `"$file"` and `"$new"` are quoted, so `beach day.jpeg` stays one name.

## Replacing text

**`${var/old/new}`** replaces the first match of `old` with `new`, and **`${var//old/new}`** replaces every match. Leave out `new` to delete:

```bash
#!/bin/bash
msg="disk full on web-01, disk check failed"
echo "${msg/disk/DISK}"
echo "${msg//disk/DISK}"
echo "${msg// /_}"
echo "${msg//disk}"
```

```bash
root@lab:~/scripts# ./replace.sh
DISK full on web-01, disk check failed
DISK full on web-01, DISK check failed
disk_full_on_web-01,_disk_check_failed
 full on web-01,  check failed
```

`${msg// /_}` turning spaces into underscores is a quick way to make a value safe to use as a file name. `old` can be a pattern, so `${version//[^0-9.]}` deletes everything that is not a digit or a dot. For anything more involved, such as replacing across many lines of a file, `sed` from the Linux skill's *Pipes and text* topic is the better tool.

## Changing case

**`${var^^}`** gives the value in upper case and **`${var,,}`** in lower case. One `^` changes only the first character:

```bash
#!/bin/bash
env_name="Staging"
echo "${env_name^^}"
echo "${env_name,,}"
user="priya"
echo "${user^}"
```

```bash
root@lab:~/scripts# ./case.sh
STAGING
staging
Priya
```

Lower-casing a value before you compare it saves listing every spelling. `case "${answer,,}" in yes|y) ...` accepts `Yes`, `YES` and `y` alike. These forms are Bash 4 and later; macOS still ships Bash 3.2 as `/bin/bash`, so they fail there, but they work on any current Linux server.

## Substrings

**`${var:offset:length}`** gives `length` characters starting at `offset`, counting from 0. Leave out `:length` to take everything to the end:

```bash
#!/bin/bash
stamp="20261025-143005"
echo "Year:  ${stamp:0:4}"
echo "Month: ${stamp:4:2}"
echo "Time:  ${stamp:9}"
echo "Last 2: ${stamp: -2}"
echo "Wrong: ${stamp:-2}"
```

```bash
root@lab:~/scripts# ./substr.sh
Year:  2026
Month: 10
Time:  143005
Last 2: 05
Wrong: 20261025-143005
```

A negative offset counts from the end, but it needs a space after the colon. Without it, `${stamp:-2}` is the default-value form from the start of this topic: `stamp` is set, so you get the whole value.

## All forms at a glance

| Expansion | Gives | Example, with `f="/srv/app.tar.gz"` |
| --- | --- | --- |
| `${var:-x}` | The value, or `x` if unset or empty | `${PORT:-8080}` gives `8080` if `PORT` is empty |
| `${var:=x}` | Same, and sets `var` to `x` | `${PORT:=8080}` |
| `${var:?msg}` | The value, or stops with `msg` | `${PORT:?set PORT}` |
| `${#var}` | The length | `${#f}` gives `15` |
| `${var#p}`, `${var##p}` | Trimmed from the start | `${f##*/}` gives `app.tar.gz` |
| `${var%p}`, `${var%%p}` | Trimmed from the end | `${f%%.*}` gives `/srv/app` |
| `${var/a/b}`, `${var//a/b}` | First or every `a` replaced | `${f//./_}` gives `/srv/app_tar_gz` |
| `${var^^}`, `${var,,}` | Upper or lower case | `${f^^}` gives `/SRV/APP.TAR.GZ` |
| `${var:o:n}` | `n` characters from offset `o` | `${f:5:3}` gives `app` |

## Tasks

### Task 1: Tidy uploaded file names

Make a folder `uploads` containing `Beach Day.JPEG`, `cat.jpeg`, `Q3 Report.PDF` and `notes.txt`. Write `tidy-names.sh` that renames every file in `uploads/` so that its name is lower case, spaces become `-`, and a `.jpeg` ending becomes `.jpg`. It prints each rename and skips files that are already tidy. Use only parameter expansion to build the new names.

<details>
<summary>Check your work</summary>

```bash
#!/bin/bash
# tidy-names.sh: lower-case file names in uploads/, use - for spaces, .jpg for .jpeg.
for path in uploads/*; do
    [[ -e $path ]] || continue
    file=${path##*/}

    new=${file,,}
    new=${new// /-}
    if [[ $new == *.jpeg ]]; then
        new="${new%.jpeg}.jpg"
    fi

    if [[ $new == "$file" ]]; then
        echo "unchanged: $file"
        continue
    fi
    mv -- "$path" "uploads/$new"
    echo "$file -> $new"
done
```

```bash
root@lab:~/scripts# mkdir uploads
root@lab:~/scripts# touch 'uploads/Beach Day.JPEG' uploads/cat.jpeg 'uploads/Q3 Report.PDF' uploads/notes.txt
root@lab:~/scripts# ./tidy-names.sh
Beach Day.JPEG -> beach-day.jpg
Q3 Report.PDF -> q3-report.pdf
cat.jpeg -> cat.jpg
unchanged: notes.txt
root@lab:~/scripts# ls uploads
beach-day.jpg  cat.jpg  notes.txt  q3-report.pdf
```

Lower-casing first means the `.jpeg` check also catches `.JPEG`. The `"$file"` on the right of `==` is quoted so it is compared as text, not as a pattern. The likely mistake is `${new/ /-}` with one slash, which only replaces the first space, so `My Beach Day.JPEG` would become `my-beach day.jpg`.

</details>

### Task 2: A backup plan with defaults

Write `backup-plan.sh` that reads three settings from the environment:

- `APP_NAME`, required: stop with a helpful message if it is missing.
- `BACKUP_DIR`, default `/var/backups`.
- `KEEP_DAYS`, default `7`.

It builds the archive path `BACKUP_DIR/APP_NAME-YYYY-MM-DD.tar.gz` and prints a heading with the app name in upper case, the archive path, the archive's file name on its own, and the number of days to keep.

<details>
<summary>Check your work</summary>

```bash
#!/bin/bash
# backup-plan.sh: show where a backup would go, using settings from the environment.
app=${APP_NAME:?set APP_NAME to the app to back up}
backup_dir=${BACKUP_DIR:-/var/backups}
keep_days=${KEEP_DAYS:-7}

archive="$backup_dir/$app-$(date +%F).tar.gz"

echo "== Backup plan for ${app^^} =="
echo "Archive:   $archive"
echo "File name: ${archive##*/}"
echo "Keep:      $keep_days days"
```

```bash
root@lab:~/scripts# ./backup-plan.sh
./backup-plan.sh: line 3: APP_NAME: set APP_NAME to the app to back up
root@lab:~/scripts# APP_NAME=shop ./backup-plan.sh
== Backup plan for SHOP ==
Archive:   /var/backups/shop-2026-10-25.tar.gz
File name: shop-2026-10-25.tar.gz
Keep:      7 days
root@lab:~/scripts# APP_NAME=shop BACKUP_DIR=/mnt/backup KEEP_DAYS=30 ./backup-plan.sh
== Backup plan for SHOP ==
Archive:   /mnt/backup/shop-2026-10-25.tar.gz
File name: shop-2026-10-25.tar.gz
Keep:      30 days
```

`$app-` works without braces because `-` cannot be part of a variable name. The likely mistake is `${BACKUP_DIR-/var/backups}` without the colon: then `BACKUP_DIR= ./backup-plan.sh` gives an empty folder and the archive path starts with `/shop-`, at the root of the disk.

</details>

## Quiz

**1. What does this script print?**

```bash
#!/bin/bash
file="report.final.tar.gz"
echo "${file%.*}"
echo "${file%%.*}"
echo "${file##*.}"
echo "${#file}"
```

<details>
<summary>Show answer</summary>

```text
report.final.tar
report
gz
19
```

`%.*` removes the shortest `.something` from the end, `%%.*` the longest, from the first dot. `##*.` removes everything up to the last dot from the start. The name is 19 characters long.

</details>

**2. A clean-up script on a server runs `rm -rf "$CACHE_DIR"/*`. One night it runs under cron, where `CACHE_DIR` is not set. What happens, and how do you protect it with parameter expansion?**

<details>
<summary>Show answer</summary>

The empty variable leaves `rm -rf /*`, which tries to delete everything on the machine that the user can delete. Write `rm -rf "${CACHE_DIR:?}"/*`, or check it once at the top with `cache_dir=${CACHE_DIR:?CACHE_DIR must be set}`. The script then stops with an error instead of running `rm`.

</details>

**3. What is the difference between `${PORT:-8080}` and `${PORT:=8080}`?**

<details>
<summary>Show answer</summary>

Both give `8080` when `PORT` is unset or empty. `:-` only substitutes the value at that point and leaves `PORT` as it was. `:=` also assigns `8080` to `PORT`, so later uses of `$PORT` in the script see it.

</details>

**4. You want the last four characters of `serial="SN-2026-7781"` and write `${serial:-4}`, but you get the whole string. Why, and what is the fix?**

<details>
<summary>Show answer</summary>

`:-` is the default-value form, and `serial` is set, so you get its value. A negative offset needs a space or parentheses to tell them apart: `${serial: -4}` or `${serial:(-4)}`, which give `7781`.

</details>

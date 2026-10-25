A normal variable holds one value. When a script works on a list, such as several hosts, a set of files or the lines of a file, you can squeeze the list into one string separated by spaces, and it works until one of the items contains a space. An **array** holds a list of separate values, so each item stays whole whatever it contains.

By the end you can create, read, extend and slice indexed arrays, loop over them, load a file or a command's output into one, collect file names without breaking them on spaces, and use associative arrays to look things up and count them.

## Indexed arrays

An **indexed array** is a list of values numbered from 0. You create one with brackets, and read an item with `${name[index]}`:

```bash
#!/bin/bash
# servers.sh: the basics of an indexed array.
servers=(web-01 web-02 db-01)

echo "First:  ${servers[0]}"
echo "Last:   ${servers[-1]}"
echo "All:    ${servers[*]}"
echo "Count:  ${#servers[@]}"

servers+=(cache-01)
echo "After adding: ${servers[*]} (${#servers[@]})"
echo "Second and third: ${servers[*]:1:2}"
```

```bash
root@lab:~/scripts# ./servers.sh
First:  web-01
Last:   db-01
All:    web-01 web-02 db-01
Count:  3
After adding: web-01 web-02 db-01 cache-01 (4)
Second and third: web-02 db-01
```

| Form | Gives |
| --- | --- |
| `${arr[0]}` | The first item |
| `${arr[-1]}` | The last item |
| `"${arr[@]}"` | Every item, each kept separate |
| `${#arr[@]}` | The number of items |
| `arr+=(x y)` | Adds `x` and `y` to the end |
| `"${arr[@]:1:2}"` | A **slice**: 2 items starting at index 1 |
| `"${!arr[@]}"` | The indexes, `0 1 2 …` |

The braces are required. Without them Bash reads `$servers` as the first item only, and `$servers[1]` as the first item followed by the text `[1]`:

```bash
root@lab:~/scripts# servers=(web-01 web-02 db-01)
root@lab:~/scripts# echo $servers
web-01
root@lab:~/scripts# echo $servers[1]
web-01[1]
root@lab:~/scripts# echo ${servers[1]}
web-02
```

Arrays are a Bash feature, which is one reason this skill's scripts start with `#!/bin/bash` and not `#!/bin/sh`.

## "${arr[@]}" and ${arr[*]}

Expanding a whole array follows the same rules as `"$@"` in the *Arguments and input* topic, and the same mistake is just as easy to make:

```bash
#!/bin/bash
# quote-array.sh: the ways of expanding a whole array.
files=("app.log" "old app.log" "error.log")

echo 'With "${files[@]}":'
for f in "${files[@]}"; do echo "  [$f]"; done

echo 'With ${files[@]} unquoted:'
for f in ${files[@]}; do echo "  [$f]"; done

echo 'With "${files[*]}":'
for f in "${files[*]}"; do echo "  [$f]"; done
```

```bash
root@lab:~/scripts# ./quote-array.sh
With "${files[@]}":
  [app.log]
  [old app.log]
  [error.log]
With ${files[@]} unquoted:
  [app.log]
  [old]
  [app.log]
  [error.log]
With "${files[*]}":
  [app.log old app.log error.log]
```

- **`"${files[@]}"`**, quoted, gives each item as one word. Use it to loop over an array or pass it to a command: `cp -- "${files[@]}" /backup/`.
- **Unquoted**, either form splits every item on spaces. `old app.log` becomes two words, and a command given those words looks for two files that don't exist.
- **`"${files[*]}"`** joins the items into a single string. Use it only for display, as in `echo "Hosts: ${servers[*]}"`.

## Looping over an array

Most of the time you want the values, so loop over `"${arr[@]}"` as above. When you also need each item's position, loop over the indexes with `"${!arr[@]}"`:

```bash
#!/bin/bash
# index-loop.sh: loop over the positions as well as the values.
steps=("stop app" "copy files" "start app")

for i in "${!steps[@]}"; do
    echo "Step $((i + 1)) of ${#steps[@]}: ${steps[i]}"
done
```

```bash
root@lab:~/scripts# ./index-loop.sh
Step 1 of 3: stop app
Step 2 of 3: copy files
Step 3 of 3: start app
```

Inside the brackets of an indexed array you can write `i` rather than `$i`, because the index is treated as arithmetic, which the *Arithmetic and strings* topic covers.

## Loading lines into an array

**`mapfile`** reads lines into an array, one line per item. **`readarray`** is another name for the same command. Use `-t` to drop the newline from the end of each line:

```bash
root@lab:~/scripts# cat hosts.txt
web-01
web-02
db-01
```

```bash
#!/bin/bash
# readhosts.sh: load a file and a command's output into arrays.
mapfile -t hosts < hosts.txt
echo "${#hosts[@]} hosts, the first is ${hosts[0]}"

mapfile -t users < <(cut -d: -f1 /etc/passwd | head -n 3)
echo "Users: ${users[*]}"
```

```bash
root@lab:~/scripts# ./readhosts.sh
3 hosts, the first is web-01
Users: root daemon bin
```

To load a command's output, use `< <(command)`. The `<(command)` part is **process substitution**: Bash runs the command and gives its output a file name, which `mapfile` then reads like any file.

The obvious alternative, a pipe, does not work:

```bash
#!/bin/bash
cut -d: -f1 /etc/passwd | mapfile -t users
echo "Found ${#users[@]} users"
```

```bash
root@lab:~/scripts# ./pipe-mistake.sh
Found 0 users
```

Each part of a pipeline runs in its own subshell. `mapfile` filled an array in that subshell, which then exited and took the array with it. The same thing happens to `while read` loops at the end of a pipe that set variables.

Also avoid `hosts=($(cat hosts.txt))`. It splits on every space, not on lines, so a line such as `build box` becomes two items, and words like `*` are expanded as file names.

## Keeping file names with spaces intact

File names can contain spaces, and occasionally stranger characters. Two common ways of listing files break them:

```bash
root@lab:~/scripts# ls logs
 app.log   error.log  'old app.log'
root@lab:~/scripts# for f in $(ls logs); do echo "Found: $f"; done
Found: app.log
Found: error.log
Found: old
Found: app.log
```

The output of `ls` is just text, and the unquoted `$( )` splits it on spaces. Saving it in a string first, as in `files=$(ls logs)`, has the same problem when you later use `$files`.

The right way is to let the shell build the list. A **glob** puts each matching name into the array as one item, whatever characters it contains:

```bash
#!/bin/bash
# logfiles.sh: collect file names safely, then use them.
files=(logs/*.log)
echo "${#files[@]} files"
for f in "${files[@]}"; do
    echo "Found: $f"
done
```

```bash
root@lab:~/scripts# ./logfiles.sh
3 files
Found: logs/app.log
Found: logs/error.log
Found: logs/old app.log
```

If nothing matches, a glob stays as the literal text `logs/*.log`, giving an array of one item that is not a file. Put **`shopt -s nullglob`** near the top of the script and an unmatched glob gives an empty array instead.

When you need `find`, to search subdirectories or match on age or size, have it end each name with a null character rather than a newline, and tell `mapfile` to split on that. A null is the one character that cannot appear in a file name:

```bash
#!/bin/bash
# findfiles.sh: collect the results of find, spaces and all.
mapfile -d '' -t files < <(find logs -name '*.log' -print0)
echo "${#files[@]} files"
ls -l -- "${files[@]}"
```

```bash
root@lab:~/scripts# ./findfiles.sh
3 files
-rw-r--r-- 1 root root 0 Oct 25 08:49 logs/app.log
-rw-r--r-- 1 root root 0 Oct 25 08:49 logs/error.log
-rw-r--r-- 1 root root 0 Oct 25 08:49 logs/old app.log
```

The `--` tells `ls` that what follows are file names, not options, in case one of them starts with a dash.

## Associative arrays

An **associative array** uses strings as keys instead of numbers, like a small lookup table. You must create it with **`declare -A`** first:

```bash
#!/bin/bash
# owners.sh: an associative array maps names to values.
declare -A owner
owner[web-01]=sam
owner[db-01]=priya
owner["build box"]=alex

echo "web-01 belongs to ${owner[web-01]}"
echo "Hosts: ${!owner[*]}"

for host in "${!owner[@]}"; do
    echo "$host -> ${owner[$host]}"
done
```

```bash
root@lab:~/scripts# ./owners.sh
web-01 belongs to sam
Hosts: build box db-01 web-01
build box -> alex
db-01 -> priya
web-01 -> sam
```

`"${!owner[@]}"` gives the keys, and `"${owner[@]}"` the values. The keys come out in no particular order, not the order you added them, so pipe the output through `sort` when order matters.

Leaving out `declare -A` is the classic mistake. Bash then makes an ordinary indexed array, works out each key as a number (an unknown word counts as 0), and every key lands on the same item:

```bash
#!/bin/bash
port[web]=80
port[db]=5432
echo "web uses port ${port[web]}"
```

```bash
root@lab:~/scripts# ./nodeclare.sh
web uses port 5432
```

**Counting** is the most common use. Take each line, pick out a key, and add one to its count. With this access log:

```bash
root@lab:~/scripts# cat access.log
10.0.0.5 GET /index.html 200
10.0.0.7 GET /login 200
10.0.0.5 POST /login 302
10.0.0.9 GET /admin 403
10.0.0.7 GET /missing 404
10.0.0.5 GET /index.html 200
10.0.0.9 GET /favicon.ico 404
```

```bash
#!/bin/bash
# status-count.sh: count requests per HTTP status code.
declare -A count

while read -r _ _ _ status; do
    count[$status]=$(( ${count[$status]:-0} + 1 ))
done < access.log

for status in "${!count[@]}"; do
    echo "$status ${count[$status]}"
done | sort
```

```bash
root@lab:~/scripts# ./status-count.sh
200 3
302 1
403 1
404 2
```

`read -r _ _ _ status` splits each line into fields, throws the first three away into `_`, and keeps the fourth. `${count[$status]:-0}` is 0 the first time a status is seen.

To **check whether a key exists**, use `[[ -v arr[key] ]]`. It is true for a key that is set, even to an empty value, which testing the value alone cannot tell you:

```bash
#!/bin/bash
# haskey.sh: check whether a key is in an associative array.
declare -A owner=([web-01]=sam [db-01]=priya [test-01]="")

for host in web-01 test-01 cache-01; do
    if [[ -v owner[$host] ]]; then
        echo "$host is listed, owner '${owner[$host]}'"
    else
        echo "$host is not listed"
    fi
done
```

```bash
root@lab:~/scripts# ./haskey.sh
web-01 is listed, owner 'sam'
test-01 is listed, owner ''
cache-01 is not listed
```

## Tasks

### Task 1: Back up log files

Write `backup-logs.sh DIR DEST`, which copies every `.log` file in `DIR` into `DEST`, creating `DEST` if needed, and then lists the names it copied. Collect the files in an array with a glob. If there are no `.log` files it says so and exits with status 0. Test it with a directory containing `old app.log`, and with one containing no logs.

<details>
<summary>Check your work</summary>

```bash
#!/bin/bash
# backup-logs.sh: copy every .log file in a directory into a backup directory.
# Usage: ./backup-logs.sh DIR DEST

if [ $# -ne 2 ]; then
    echo "Usage: $0 DIR DEST" >&2
    exit 1
fi

shopt -s nullglob
files=("$1"/*.log)

if [ ${#files[@]} -eq 0 ]; then
    echo "No .log files in $1"
    exit 0
fi

mkdir -p "$2"
cp -- "${files[@]}" "$2"/
echo "Copied ${#files[@]} files to $2:"
for f in "${files[@]}"; do
    echo "  ${f##*/}"
done
```

```bash
root@lab:~/scripts# ./backup-logs.sh logs /tmp/logbak
Copied 3 files to /tmp/logbak:
  app.log
  error.log
  old app.log
root@lab:~/scripts# ./backup-logs.sh /etc /tmp/x
No .log files in /etc
```

`${f##*/}` removes everything up to the last `/`, from the *Parameter expansion* topic. Without `shopt -s nullglob`, the empty case reports `Copied 1 files` and `cp` fails on a file called `/etc/*.log`. If `cp` complains about `old` and `app.log`, a `"${files[@]}"` has lost its quotes.

</details>

### Task 2: Requests per client

Write `ip-count.sh LOG [IP]` for the `access.log` format above. With only the log, it prints each client IP and its number of requests, busiest first. With an IP as well, it prints just that IP's count, or `No requests from IP` if it never appears. Use an associative array, and `-v` for the lookup.

<details>
<summary>Check your work</summary>

```bash
#!/bin/bash
# ip-count.sh: count requests per client IP in an access log.
# Usage: ./ip-count.sh LOG [IP]

if [ $# -lt 1 ] || [ $# -gt 2 ]; then
    echo "Usage: $0 LOG [IP]" >&2
    exit 1
fi

declare -A requests
while read -r ip _; do
    requests[$ip]=$(( ${requests[$ip]:-0} + 1 ))
done < "$1"

if [ $# -eq 2 ]; then
    if [[ -v requests[$2] ]]; then
        echo "$2 made ${requests[$2]} requests"
    else
        echo "No requests from $2"
    fi
    exit 0
fi

for ip in "${!requests[@]}"; do
    echo "${requests[$ip]} $ip"
done | sort -rn
```

```bash
root@lab:~/scripts# ./ip-count.sh access.log
3 10.0.0.5
2 10.0.0.9
2 10.0.0.7
root@lab:~/scripts# ./ip-count.sh access.log 10.0.0.9
10.0.0.9 made 2 requests
root@lab:~/scripts# ./ip-count.sh access.log 10.0.0.1
No requests from 10.0.0.1
```

Printing the count first makes the sort easy: `sort -rn` sorts numerically, largest first. If every IP shows one combined total, `declare -A` is missing and all the keys landed on item 0. In `read -r ip _`, the `_` collects the rest of the line, so `ip` gets only the first field.

</details>

## Quiz

**1. What does this script print?**

```bash
#!/bin/bash
arr=(one "two three" four)
echo "${#arr[@]}"
for x in ${arr[@]}; do echo "$x"; done | wc -l
```

<details>
<summary>Show answer</summary>

```
3
4
```

The array has three items, because `"two three"` was quoted when it was created. The loop uses `${arr[@]}` without quotes, so `two three` is split into two words and the loop runs four times.

</details>

**2. A clean-up script on a server does `old=$(find /var/log/app -name '*.gz' -mtime +30)` and then `rm $old`. One day it fails with `rm: cannot remove '/var/log/app/web': No such file or directory`. What happened, and how would you write it?**

<details>
<summary>Show answer</summary>

One of the files had a space in its name, such as `web 01.gz`, and the unquoted `$old` split it into two words, neither of which is a file. Quoting `"$old"` would not help, because then all the names are one argument. Collect the names in an array instead and pass it quoted:

```bash
mapfile -d '' -t old < <(find /var/log/app -name '*.gz' -mtime +30 -print0)
rm -f -- "${old[@]}"
```

For this particular job, `find … -delete` also avoids the problem.

</details>

**3. `ls *.conf | mapfile -t confs` runs without an error, but `${#confs[@]}` is 0 afterwards. Why?**

<details>
<summary>Show answer</summary>

`mapfile` is at the end of a pipe, so it runs in a subshell. It filled the array there, and the array disappeared when the subshell exited. Use `mapfile -t confs < <(command)`, or here simply a glob: `confs=(*.conf)`.

</details>

**4. How do you tell the difference between a key that is not in an associative array and a key whose value is empty?**

<details>
<summary>Show answer</summary>

Use `[[ -v arr[key] ]]`, which is true when the key exists, whatever its value. Testing the value with `[ -z "${arr[key]}" ]` is true in both cases, so it cannot tell them apart.

</details>

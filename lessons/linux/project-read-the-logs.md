A web server writes one line to its access log for every request it answers. When something goes wrong, or someone asks how busy the site was, that log is where you look. In this project you generate a day of web traffic, answer six questions about it with pipelines, and then turn those pipelines into a script that reports on any log you give it.

It draws mostly on the *Pipes and text* topic, with help from *Reading files*, *Finding things*, *Creating and moving files* and *Users and permissions* (to make the script executable).

## What you need

Any Linux shell works for this project. The Docker container from the *What Linux is* topic is enough:

```bash
$ docker run -it --rm --hostname lab ubuntu:24.04
```

Everything you need is already in the Ubuntu image: `bash`, `cut`, `sort`, `uniq`, `awk`, `grep` and `wc`. You also need an editor to write the scripts. `nano` is not in the Docker image, so install it first:

```bash
$ apt update && apt install -y nano
```

If you would rather keep your files when the container exits, work in WSL, a Multipass VM or a Linux machine instead. The answers below come from Bash 5, which is what Ubuntu 24.04 ships.

## The brief

Work in a directory called `logs` in your home directory.

1. Create a script `make-log.sh` that writes a realistic access log to `access.log`. The log must be the same every time you run the script. Check: run it twice and compare the files with `cmp`; it prints nothing when they are identical.
2. Find the total number of requests. Check: a single number from one pipeline.
3. Find the busiest hour of the day and how many requests it had. Check: one line with a count and an hour.
4. Find the five client IP addresses that sent the most requests. Check: five lines, busiest first, each with a count.
5. Find what share of requests failed with a server error (any `5xx` status), as a percentage to one decimal place. Check: one number such as `3.5`.
6. Find the five most requested pages that do not exist (status `404`). Check: five lines, most requested first.
7. Count the requests for each status code. Check: one line per code, ordered by code, and the counts add up to the total from step 2.
8. Write a script `report.sh` that takes the path of a log as its only argument and prints the answers to steps 2 to 7. With no argument, or a file it cannot read, it prints a clear message to standard error and exits with status 1. Check: `./report.sh access.log` prints the report, and `./report.sh; echo $?` prints the usage message and `1`.

## Steps

### Generate the log

You need data before you can read it. Real logs hold real visitors' addresses, so the script below makes up its own traffic using the IP ranges set aside for documentation (`192.0.2.x`, `198.51.100.x` and `203.0.113.x`), which never belong to a real machine.

The script uses `$RANDOM`, a shell variable that gives a different number between 0 and 32767 each time you read it. Setting `RANDOM=42` at the start *seeds* it: from that point the sequence of numbers is always the same, so your log matches the one the answers below came from. Lists in the script repeat some entries on purpose. Picking at random from a list where `14` appears six times makes 2 pm a busier hour than 3 am, which appears once.

Create the directory, open `make-log.sh` in your editor and type or paste the script from the solution. Then make it executable and run it.

<details>
<summary>Show a solution</summary>

```bash
$ mkdir -p ~/logs
$ cd ~/logs
$ nano make-log.sh
```

```bash
#!/usr/bin/env bash
# Writes a web server access log for one day to the file given as the first argument.
set -euo pipefail

out=${1:-access.log}
lines=3000
RANDOM=42   # a fixed seed: the same "random" numbers every time

# Busy hours appear more often in this list, so more requests land in them.
hours=(00 01 02 03 04 05 06 07 07 08 08 08 09 09 09 09 10 10 10 10 10 11 11 11 11
       12 12 12 13 13 13 13 14 14 14 14 14 14 15 15 15 15 16 16 16 17 17 18 18 19 19 20 20 21 22 23)

# A few clients send far more requests than the rest.
ips=(203.0.113.10 203.0.113.10 203.0.113.10 203.0.113.10 203.0.113.10 203.0.113.10
     198.51.100.23 198.51.100.23 198.51.100.23 198.51.100.23
     192.0.2.44 192.0.2.44 192.0.2.44
     203.0.113.77 203.0.113.77
     192.0.2.5 192.0.2.8 192.0.2.13 192.0.2.21 192.0.2.30 192.0.2.67 192.0.2.99
     198.51.100.4 198.51.100.15 198.51.100.42 198.51.100.61 198.51.100.88
     203.0.113.2 203.0.113.19 203.0.113.33 203.0.113.50 203.0.113.91)

# Pages that exist, the common ones listed more than once.
pages=(/ / / / /index.html /index.html /about.html /products.html /products.html
       /contact.html /blog/ /blog/first-post.html /blog/second-post.html
       /css/site.css /css/site.css /js/app.js /js/app.js /images/logo.png /images/logo.png
       /api/orders /api/orders /api/orders /api/users /login /login)

# Pages that do not exist and always return 404.
missing=(/wp-login.php /wp-login.php /wp-login.php /.env /.env /favicon.ico /favicon.ico
         /favicon.ico /favicon.ico /old-page.html /admin /blog/third-post.html)

agents=("Mozilla/5.0 (X11; Linux x86_64)" "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)" "curl/8.5.0" "ExampleBot/1.0")

for ((i = 0; i < lines; i++)); do
  hour=${hours[RANDOM % ${#hours[@]}]}
  printf -v time '%s:%02d:%02d' "$hour" $((RANDOM % 60)) $((RANDOM % 60))
  ip=${ips[RANDOM % ${#ips[@]}]}
  agent=${agents[RANDOM % ${#agents[@]}]}
  method=GET
  roll=$((RANDOM % 100))
  if ((roll < 8)); then
    path=${missing[RANDOM % ${#missing[@]}]}
    status=404
  else
    path=${pages[RANDOM % ${#pages[@]}]}
    if [[ $path == /api/* || $path == /login ]]; then
      if ((RANDOM % 3 == 0)); then method=POST; fi
      if ((roll >= 92)); then
        codes=(500 502 503)
        status=${codes[RANDOM % 3]}
      else
        status=200
      fi
    elif ((roll >= 97)); then
      status=503
    elif ((roll >= 90)); then
      status=304
    else
      status=200
    fi
  fi
  if ((status == 304)); then size=0; else size=$((200 + RANDOM % 9000)); fi
  printf '%s - - [23/Oct/2026:%s +0000] "%s %s HTTP/1.1" %s %s "-" "%s"\n' \
    "$ip" "$time" "$method" "$path" "$status" "$size" "$agent"
done > "$out.unsorted"

# Put the lines in time order, as a real server would have written them.
LC_ALL=C sort -t ' ' -k4,4 "$out.unsorted" > "$out"
rm "$out.unsorted"

echo "Wrote $lines lines to $out"
```

Save, then:

```bash
$ chmod +x make-log.sh
$ ./make-log.sh
Wrote 3000 lines to access.log
$ ./make-log.sh copy.log
Wrote 3000 lines to copy.log
$ cmp access.log copy.log
$ rm copy.log
```

`cmp` printing nothing means the two files are byte for byte the same.

Two details keep the output repeatable. The time is built with `printf -v time` rather than `time=$(printf ...)`, and the loop writes to a file rather than into a pipe. Both `$( )` and a pipe run commands in a *subshell*, and Bash gives each subshell a fresh random seed, which would break the fixed sequence.

</details>

### Learn the shape of a line

Before you write any pipeline, look at the data. Use `head` to see the first few lines and pick one apart. The format is close to the *combined log format* that most web servers use. Work out which field holds what when you split the line on spaces, because `cut -d ' '` and `awk` both count fields that way.

Hint: number the fields of one line with `awk '{ for (i = 1; i <= NF; i++) print i, $i }'`.

<details>
<summary>Show a solution</summary>

```bash
$ head -n 3 access.log
203.0.113.2 - - [23/Oct/2026:00:00:28 +0000] "GET / HTTP/1.1" 200 4266 "-" "curl/8.5.0"
203.0.113.33 - - [23/Oct/2026:00:01:21 +0000] "GET / HTTP/1.1" 200 2556 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
192.0.2.5 - - [23/Oct/2026:00:04:02 +0000] "GET /.env HTTP/1.1" 404 4343 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
```

Split on spaces, the fields you need are:

| Field | Example | Meaning |
| --- | --- | --- |
| `$1` | `192.0.2.5` | The client's IP address |
| `$4` | `[23/Oct/2026:00:04:02` | Date and time |
| `$6` | `"GET` | The method, with a stray quote |
| `$7` | `/.env` | The path that was asked for |
| `$9` | `404` | The status code |
| `$10` | `4343` | The size of the response in bytes |

The user agent at the end contains spaces, so its words land in several fields. You do not need it here.

</details>

### Count and group

The pattern behind most log questions is the same: pull out one field, sort it so equal values sit next to each other, count them with `uniq -c`, then sort the counts with `sort -rn` so the biggest comes first. Use it to answer steps 2, 4 and 7.

For step 7 you want the result ordered by status code, not by count. Look at which field the code is in after `uniq -c` and sort on that one.

<details>
<summary>Show a solution</summary>

Total requests is the number of lines:

```bash
$ wc -l < access.log
3000
```

Reading from `<` stops `wc` printing the file name after the number, which matters when you put the result in a variable later.

The top five clients:

```bash
$ cut -d ' ' -f1 access.log | sort | uniq -c | sort -rn | head -n 5
    556 203.0.113.10
    374 198.51.100.23
    276 192.0.2.44
    185 203.0.113.77
    115 198.51.100.88
```

Requests per status code, ordered by code:

```bash
$ awk '{ print $9 }' access.log | sort | uniq -c | sort -k2,2n
   2483 200
    168 304
    245 404
     10 500
     16 502
     78 503
```

`sort -k2,2n` sorts numerically on the second field, the code. The counts add up to 3000.

</details>

### Time and errors

The hour sits inside the fourth field, between the first and second colons: `[23/Oct/2026:14:05:09`. An IPv4 address has no colons, so if you split the whole line on `:` instead of on spaces, the hour is field 2. Count those and keep the top one.

For the 5xx share you need two numbers, the count of lines whose status is between 500 and 599 and the total, and then a division. The shell only does whole-number arithmetic, so let `awk` do the division.

For missing pages, filter on the status field before you count paths. It is tempting to use `grep ' 404 '`, but try it and compare the count with the `awk` one. A response that happens to be 404 bytes long matches too.

<details>
<summary>Show a solution</summary>

The busiest hour:

```bash
$ cut -d: -f2 access.log | sort | uniq -c | sort -rn | head -n 1
    312 14
```

The hour from 14:00 to 14:59 had 312 requests. Drop the `head` to see the whole day, quiet at night and busy in the working day.

The share of server errors:

```bash
$ awk '$9 >= 500 && $9 < 600' access.log | wc -l
104
$ awk '$9 >= 500 && $9 < 600 { e++ } END { printf "%.1f\n", 100 * e / NR }' access.log
3.5
```

`NR` is the number of lines `awk` has read, so at the `END` it is the total. 104 of 3000 requests is 3.5%.

The most requested missing pages:

```bash
$ awk '$9 == 404 { print $7 }' access.log | sort | uniq -c | sort -rn | head -n 5
     86 /favicon.ico
     57 /wp-login.php
     52 /.env
     21 /old-page.html
     18 /blog/third-post.html
```

And why matching the field matters:

```bash
$ grep -c ' 404 ' access.log
246
$ awk '$9 == 404' access.log | wc -l
245
```

The extra line is a successful request whose size was 404 bytes. Requests for `/wp-login.php` and `/.env` on a site that has neither are usually automated scanners looking for weak spots, which is worth knowing when you read real logs.

</details>

### Wrap it in a script

Pipelines you type once are easy to lose. Put them in `report.sh` so you, or anyone on your team, can run the same report on tomorrow's log.

Start the script with `set -euo pipefail` so it stops on the first error. Check the arguments before doing anything else: `$#` is the number of arguments, and `[[ -r $log ]]` is true when the file exists and you can read it. Send error messages to standard error with `>&2`, and `exit 1` after them. Use `"$log"` with quotes everywhere, so a path with a space in it still works.

Hint: store the total and the 5xx count in variables with `$( )`, then print the percentage from them.

<details>
<summary>Show a solution</summary>

```bash
#!/usr/bin/env bash
# Prints a summary of a web server access log.
# Usage: ./report.sh path/to/access.log
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 LOGFILE" >&2
  exit 1
fi

log=$1

if [[ ! -r $log ]]; then
  echo "Error: cannot read $log" >&2
  exit 1
fi

total=$(wc -l < "$log")
errors=$(awk '$9 >= 500 && $9 < 600' "$log" | wc -l)

echo "Report for $log"
echo
echo "Total requests: $total"
echo "Server errors (5xx): $errors ($(awk -v e="$errors" -v t="$total" 'BEGIN { printf "%.1f", 100 * e / t }')%)"
echo
echo "Busiest hour:"
cut -d: -f2 "$log" | sort | uniq -c | sort -rn | head -n 1
echo
echo "Top 5 clients:"
cut -d ' ' -f1 "$log" | sort | uniq -c | sort -rn | head -n 5
echo
echo "Most requested missing pages:"
awk '$9 == 404 { print $7 }' "$log" | sort | uniq -c | sort -rn | head -n 5
echo
echo "Requests per status code:"
awk '{ print $9 }' "$log" | sort | uniq -c | sort -k2,2n
```

```bash
$ chmod +x report.sh
$ bash -n report.sh
```

`bash -n` reads the script and reports syntax errors without running anything. No output means it found none.

`awk -v e="$errors"` passes a shell variable into `awk`, where it is called `e`. A `BEGIN` block runs before `awk` reads any input, and since no file is given it reads none, so the block is all that runs.

</details>

## Check it works

The log is repeatable:

```bash
$ ./make-log.sh /tmp/again.log && cmp access.log /tmp/again.log && echo identical
Wrote 3000 lines to /tmp/again.log
identical
```

The report answers every question:

```bash
$ ./report.sh access.log
Report for access.log

Total requests: 3000
Server errors (5xx): 104 (3.5%)

Busiest hour:
    312 14

Top 5 clients:
    556 203.0.113.10
    374 198.51.100.23
    276 192.0.2.44
    185 203.0.113.77
    115 198.51.100.88

Most requested missing pages:
     86 /favicon.ico
     57 /wp-login.php
     52 /.env
     21 /old-page.html
     18 /blog/third-post.html

Requests per status code:
   2483 200
    168 304
    245 404
     10 500
     16 502
     78 503
```

The status counts add up to the total:

```bash
$ awk '{ print $9 }' access.log | sort | uniq -c | awk '{ sum += $1 } END { print sum }'
3000
```

Bad input gives a clear message and a non-zero exit status:

```bash
$ ./report.sh; echo "exit status $?"
Usage: ./report.sh LOGFILE
exit status 1
$ ./report.sh missing.log; echo "exit status $?"
Error: cannot read missing.log
exit status 1
```

If your numbers differ from these, check that `RANDOM=42` is in the script and that your Bash is version 5 or later (`bash --version`).

## Going further

- Add the total bytes sent, using `awk` to add up field 10, and print it in megabytes.
- Make `report.sh` accept a second argument, a status code, and list the paths that returned it.
- Print the busiest hour per client IP for the top client, to see whether it behaves like a person or a script.

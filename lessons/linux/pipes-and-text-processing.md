Most of what you look at on a server is text: logs, config files, the output of other commands. Linux gives you many small commands that each do one thing to text, and a way to join them so the output of one becomes the input of the next. Put together, they answer questions that would otherwise need a script.

By the end you can send output and errors where you want them, chain commands with pipes, and cut, count, sort and rewrite lines until a log file tells you what you need to know.

## A sample log

The examples in this topic use a small web server access log. Create it in your home directory so you can follow along. Everything between the first line and `EOF` goes into the file:

```bash
$ cat > access.log <<'EOF'
192.0.2.10 - - [24/Oct/2026:09:00:01 +0000] "GET / HTTP/1.1" 200 512
198.51.100.7 - - [24/Oct/2026:09:00:03 +0000] "GET /login HTTP/1.1" 200 1024
192.0.2.10 - - [24/Oct/2026:09:00:04 +0000] "GET /about HTTP/1.1" 200 768
203.0.113.5 - - [24/Oct/2026:09:00:07 +0000] "GET /admin HTTP/1.1" 404 128
192.0.2.10 - - [24/Oct/2026:09:00:09 +0000] "POST /login HTTP/1.1" 302 64
203.0.113.5 - - [24/Oct/2026:09:00:11 +0000] "GET /wp-login.php HTTP/1.1" 404 128
198.51.100.7 - - [24/Oct/2026:09:00:15 +0000] "GET /dashboard HTTP/1.1" 200 2048
203.0.113.5 - - [24/Oct/2026:09:00:16 +0000] "GET /.env HTTP/1.1" 404 128
192.0.2.10 - - [24/Oct/2026:09:00:20 +0000] "GET /api/orders HTTP/1.1" 500 256
198.51.100.7 - - [24/Oct/2026:09:00:22 +0000] "GET /api/orders HTTP/1.1" 200 4096
EOF
```

Each line is one request. Split on spaces, the fields you care about are:

| Field | Example | Meaning |
| --- | --- | --- |
| 1 | `192.0.2.10` | The client's IP address |
| 4 | `[24/Oct/2026:09:00:01` | The time |
| 6 | `"GET` | The method |
| 7 | `/login` | The path |
| 9 | `200` | The status code |
| 10 | `512` | The response size in bytes |

## Three streams

Every program starts with three **streams** already open:

| Stream | Number | Normally connected to |
| --- | --- | --- |
| **stdin** (standard input) | 0 | Your keyboard |
| **stdout** (standard output) | 1 | Your screen |
| **stderr** (standard error) | 2 | Your screen |

Normal output goes to stdout and error messages go to stderr. Both appear on your screen, so they look the same, but the shell can send them to different places.

You already know `>` and `>>`. They redirect stdout. Errors still reach the screen:

```bash
$ ls /root /nope > out.txt
ls: cannot access '/nope': No such file or directory
```

`2>` redirects stderr, so you can keep the two apart:

```bash
$ ls /root /nope > out.txt 2> err.txt
$ cat err.txt
ls: cannot access '/nope': No such file or directory
```

`2>&1` means "send stderr to wherever stdout is going now". Use it to catch everything in one file:

```bash
$ ls /root /nope > all.txt 2>&1
```

The order matters. The shell reads redirections from left to right, so `2>&1 > all.txt` points stderr at the screen first and only then moves stdout to the file. Put `2>&1` last.

**`/dev/null`** is a special file that throws away whatever is written to it. Use it when you only care whether a command worked, not what it said:

```bash
$ ls /nope 2> /dev/null
$ echo $?
2
```

`$?` holds the exit code of the last command. Zero means success; anything else means it failed.

`<` goes the other way and feeds a file to a command's stdin. `wc -l` counts lines, and when it reads from stdin it has no file name to print:

```bash
$ wc -l access.log
10 access.log
$ wc -l < access.log
10
```

## Pipes

A **pipe**, written `|`, connects the stdout of one command to the stdin of the next. Nothing is written to disk in between.

```bash
$ grep " 404 " access.log | wc -l
3
```

`grep` picks out the lines with a 404 status, and `wc -l` counts them. You can chain as many commands as you like. Each one is a step, and you can build a pipeline one step at a time, checking the output before adding the next.

`wc` on its own counts lines, words and bytes:

```bash
$ wc access.log
 10 100 767 access.log
```

Use `-l` for lines, `-w` for words and `-c` for bytes. Pipes carry stdout only. Errors still go to the screen unless you add `2>&1` before the `|`.

## Cutting, counting and sorting

**`cut`** takes columns out of each line. `-d` sets the delimiter, the character that separates fields, and `-f` picks the fields:

```bash
$ cut -d " " -f 1 access.log
192.0.2.10
198.51.100.7
192.0.2.10
203.0.113.5
192.0.2.10
203.0.113.5
198.51.100.7
203.0.113.5
192.0.2.10
198.51.100.7
```

Any single character can be the delimiter. The request is between the double quotes, so split on `"` to get it:

```bash
$ cut -d '"' -f 2 access.log | head -n 3
GET / HTTP/1.1
GET /login HTTP/1.1
GET /about HTTP/1.1
```

**`sort`** puts lines in order. **`uniq`** removes a line when it is the same as the one before it, so it only works on sorted input. With `-c` it also counts how many times each line appeared:

```bash
$ cut -d " " -f 1 access.log | sort | uniq -c
      4 192.0.2.10
      3 198.51.100.7
      3 203.0.113.5
```

Without the `sort`, `uniq` only merges lines that happen to be next to each other, and the counts are wrong:

```bash
$ cut -d " " -f 9 access.log | uniq -c | head -n 3
      3 200
      1 404
      1 302
```

`sort` compares text by default, so `1024` comes before `128`. Use `-n` to sort as numbers and `-r` to reverse:

| Option | Effect |
| --- | --- |
| `sort -n` | Sort numerically |
| `sort -r` | Reverse the order |
| `sort -rn` | Largest number first |
| `sort -u` | Sort and drop duplicates, like `sort \| uniq` |
| `sort -k 2` | Sort on the second field |

`sort | uniq -c | sort -rn` is the pattern you will type most. It means "count each value, most common first":

```bash
$ cut -d " " -f 9 access.log | sort | uniq -c | sort -rn
      5 200
      3 404
      1 500
      1 302
```

**`tr`** translates characters. It reads only stdin, so you always pipe into it:

```bash
$ echo "web-01 web-02 web-03" | tr " " "\n"
web-01
web-02
web-03
$ echo "Hello World" | tr a-z A-Z
HELLO WORLD
```

`tr -s " "` squeezes runs of spaces into one, which helps before `cut` when columns are lined up with several spaces.

## sed and awk

**`sed`** edits a stream of text. You will mostly use it for one thing, substitution: `s/old/new/` replaces the first match on each line, and `s/old/new/g` replaces every match.

```bash
$ sed "s/HTTP\/1.1/HTTP\/2/" access.log | head -n 2
192.0.2.10 - - [24/Oct/2026:09:00:01 +0000] "GET / HTTP/2" 200 512
198.51.100.7 - - [24/Oct/2026:09:00:03 +0000] "GET /login HTTP/2" 200 1024
```

The slashes in the path need a backslash in front so `sed` does not read them as separators. Any character can be the separator, so `s|HTTP/1.1|HTTP/2|` is easier to read.

`sed` prints the changed text and leaves the file alone. `sed -i` edits the file in place. Try the command without `-i` first, and only add it once the output looks right.

**`awk`** splits each line on whitespace into fields named `$1`, `$2` and so on, and runs a small program on them. Unlike `cut`, it treats any run of spaces as one separator.

```bash
$ awk '{print $1, $9}' access.log | head -n 3
192.0.2.10 200
198.51.100.7 200
192.0.2.10 200
```

Put a condition before the braces to act only on matching lines:

```bash
$ awk '$9 >= 400 {print $7, $9}' access.log
/admin 404
/wp-login.php 404
/.env 404
/api/orders 500
```

An `END` block runs after the last line, which lets you add things up:

```bash
$ awk '{sum += $10} END {print sum}' access.log
9152
```

Use single quotes around `awk` programs. In double quotes the shell would replace `$1` with its own variable before `awk` sees it. `-F` sets a different separator, for example `awk -F: '{print $1}' /etc/passwd` for the user names.

## tee, xargs and $(…)

**`tee`** copies its input to a file and also passes it on down the pipe. Use it to save a step's output while you keep working on it:

```bash
$ grep " 404 " access.log | tee notfound.log | wc -l
3
$ wc -l < notfound.log
3
```

`tee -a` appends instead of replacing.

**`xargs`** turns lines from stdin into arguments for another command. Some commands, such as `rm` and `wc` with file names, take their input as arguments rather than reading stdin, and `xargs` bridges the gap:

```bash
$ find /var/log -name "*.log" | xargs wc -l
```

This counts the lines in every `.log` file `find` returns. File names with spaces confuse plain `xargs`; for those use `find … -print0 | xargs -0`.

**`$(…)`** runs a command and puts its output in place, as you saw in the first topic. It works anywhere in a command line:

```bash
$ echo "access.log has $(wc -l < access.log) requests"
access.log has 10 requests
```

## Answering a question with a pipeline

Say you want to know which client caused the most errors. Build the answer one step at a time.

Keep only the failed requests, those with a status that is not 200:

```bash
$ grep -v " 200 " access.log
```

Take the IP address from each of those lines, count each one, put the largest count first, and keep the top line:

```bash
$ grep -v " 200 " access.log | awk '{print $1}' | sort | uniq -c | sort -rn | head -n 1
      3 203.0.113.5
```

Each part is simple. Reading it back from left to right tells you exactly how the answer was reached, which is why people paste pipelines like this into incident notes. The same shape answers "which paths are requested most", "which status codes appear" or "which hours were busiest". Only the first step and the field you pick change.

## Tasks

Do these in your Linux shell. Both use a larger log. This loop writes 96 requests to `web.log`, including a client that probes for files it should not see:

```bash
$ ips=(192.0.2.10 198.51.100.7 192.0.2.44 198.51.100.23 192.0.2.10)
$ pages=(/ /login /api/orders /about / /api/orders /pricing)
$ for i in $(seq 1 90); do
    code=200
    if (( i % 13 == 0 )); then code=500; fi
    printf '%s - - [24/Oct/2026:10:%02d:%02d +0000] "GET %s HTTP/1.1" %s %d\n' \
      "${ips[i % 5]}" $((i / 60)) $((i % 60)) "${pages[i % 7]}" "$code" $((i * 37 % 900 + 100))
  done > web.log
$ for p in /admin /.env /wp-login.php /backup.zip /config.php /.git/config; do
    printf '203.0.113.5 - - [24/Oct/2026:10:02:00 +0000] "GET %s HTTP/1.1" 404 128\n' "$p"
  done >> web.log
```

Type the lines without the `$`. Check that `wc -l web.log` prints `96 web.log` before you start.

### Task 1: Who is busiest

Using `web.log`, answer three questions, one pipeline each:

1. How many requests did each IP address make, busiest first?
2. How many responses were there of each status code?
3. Which paths returned a 500 error, and how many times each?

<details>
<summary>Check your work</summary>

```bash
$ cut -d " " -f 1 web.log | sort | uniq -c | sort -rn
     36 192.0.2.10
     18 198.51.100.7
     18 198.51.100.23
     18 192.0.2.44
      6 203.0.113.5
$ cut -d " " -f 9 web.log | sort | uniq -c | sort -rn
     84 200
      6 500
      6 404
$ awk '$9 == 500 {print $7}' web.log | sort | uniq -c | sort -rn
      2 /api/orders
      1 /pricing
      1 /login
      1 /about
      1 /
```

You can use `awk '{print $1}'` in place of `cut` for the first two. If your counts are all 1 or 2, you left out the first `sort`, and `uniq -c` only merged lines that were next to each other.

</details>

### Task 2: Follow the suspicious client

Find the IP address with the most 404 responses. Then, in one command that uses `$(…)` for the address, save every request from that address to `suspect.log` with `tee` and print how many there are. Finish by listing the paths it asked for.

<details>
<summary>Check your work</summary>

First find the address:

```bash
$ awk '$9 == 404 {print $1}' web.log | sort | uniq -c | sort -rn | head -n 1
      6 203.0.113.5
```

Then use the same pipeline inside `$(…)`, adding a last `awk` to keep only the address:

```bash
$ grep "^$(awk '$9 == 404 {print $1}' web.log | sort | uniq -c | sort -rn | head -n 1 | awk '{print $2}') " web.log | tee suspect.log | wc -l
6
$ awk '{print $7}' suspect.log
/admin
/.env
/wp-login.php
/backup.zip
/config.php
/.git/config
```

The `^` anchors the match to the start of the line and the space after `)` stops `192.0.2.1` from matching `192.0.2.10`. If `wc -l` prints 0, check that the inner pipeline prints only the address, with no count in front of it.

</details>

## Quiz

**1. What is the difference between `cmd > out.txt 2>&1` and `cmd 2>&1 > out.txt`?**

<details>
<summary>Show answer</summary>

The first sends stdout to the file and then sends stderr to the same place, so both end up in `out.txt`. The second points stderr at the screen, where stdout was at that moment, and only then moves stdout to the file. Errors still appear on the screen.

</details>

**2. Why does `cut -d " " -f 1 access.log | uniq -c` give wrong counts?**

<details>
<summary>Show answer</summary>

`uniq` only merges lines that are next to each other. The same IP appears in several places in the file, so each run is counted separately. Put `sort` before `uniq -c`.

</details>

**3. You are on a server and a cron job writes a log that fills the screen with progress messages. You only want to see errors, and you want to know if the job failed. How do you run it?**

<details>
<summary>Show answer</summary>

Send stdout to `/dev/null` and leave stderr alone, then check the exit code:

```bash
$ ./job.sh > /dev/null
$ echo $?
```

Errors still reach the screen, and a non-zero `$?` means the job failed.

</details>

**4. You want to replace every `http://` with `https://` in `site.conf`. What do you run, and what do you check first?**

<details>
<summary>Show answer</summary>

Run it without `-i` first and read the output:

```bash
$ sed 's|http://|https://|g' site.conf
```

When it looks right, run the same command with `sed -i` to change the file. Using `|` as the separator saves escaping every `/`, and `g` replaces every match on a line, not just the first.

</details>

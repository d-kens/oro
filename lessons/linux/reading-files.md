Most of what you need to know about a server is written down in files. Config files say how a service is set up, and log files say what it did and what went wrong. Reading them quickly, without opening an editor, is one of the things you will do most.

By the end you can print a short file, page through a long one, look at just its start or end, and watch a log file as new lines arrive.

## Printing a file with cat

`cat` prints a whole file to the screen:

```bash
$ cat app.conf
port=8080
host=0.0.0.0
log_level=info
```

The name comes from *concatenate*: give it several files and it prints them one after another, as if they were one.

```bash
$ cat app.conf extra.conf
port=8080
host=0.0.0.0
log_level=info
name=web
```

`-n` numbers the lines, which helps when an error message says "line 3":

```bash
$ cat -n app.conf
     1	port=8080
     2	host=0.0.0.0
     3	log_level=info
```

`cat` is right for short files. On a file with thousands of lines, everything scrolls past and you see only the end. The errors you can expect:

```bash
$ cat nothere
cat: nothere: No such file or directory
$ cat /etc
cat: /etc: Is a directory
```

Only use `cat` on text. Programs and images are **binary files**, and printing one fills the screen with junk and can leave your terminal in a strange state. If that happens, type `reset` and press Enter.

## Counting lines with wc

Before you open a file, it helps to know how big it is. `wc` (*word count*) counts lines, words and bytes; `-l` gives just the lines:

```bash
$ wc -l app.log
500 app.log
$ wc app.log
  500  1500  9892 app.log
```

A file of 20 lines is fine for `cat`. A file of 500,000 lines is not.

## Paging with less

`less` shows a file one screen at a time and lets you move around in it. It does not load the whole file first, so it opens huge logs quickly.

The Docker Ubuntu image does not include `less`. Install it first:

```bash
$ apt update && apt install -y less
```

Then open a file:

```bash
$ less app.log
```

The keys you need:

| Key | What it does |
| --- | --- |
| <kbd>Space</kbd> or <kbd>f</kbd> | Forward one screen |
| <kbd>b</kbd> | Back one screen |
| <kbd>↑</kbd> and <kbd>↓</kbd> | One line at a time |
| <kbd>g</kbd> and <kbd>G</kbd> | Jump to the start or the end |
| <kbd>/</kbd> then text | Search forward; <kbd>n</kbd> for the next match, <kbd>N</kbd> for the previous |
| <kbd>q</kbd> | Quit |

`less -N app.log` shows line numbers. `less` never changes the file, so you cannot damage anything with it. That makes it the safe way to look at a config file on a production server. `man` uses the same reader, so these keys work there too.

If `less` is missing and you cannot install it, `more` does a simpler job: <kbd>Space</kbd> to go forward and <kbd>q</kbd> to quit.

## The start and the end: head and tail

Often you only want one end of a file. The start of a CSV file shows its column names. The end of a log shows what happened last.

`head` prints the first 10 lines, and `tail` the last 10. `-n` sets how many:

```bash
$ head -n 3 app.log
request 1 handled
request 2 handled
request 3 handled
$ tail -n 3 app.log
request 498 handled
request 499 handled
request 500 handled
```

`tail -n +N` is different: it prints from line `N` to the end. `tail -n +498 app.log` prints lines 498, 499 and 500.

To see a range in the middle, for example lines 100 to 105, take the first 105 lines and then the last 6 of those:

```bash
$ head -n 105 app.log | tail -n 6
request 100 handled
request 101 handled
request 102 handled
request 103 handled
request 104 handled
request 105 handled
```

The `|` sends what `head` prints into `tail` instead of to the screen. It is called a **pipe**, and the *Pipes and text* topic covers it.

## Following a log as it grows

When a service is running, its log keeps growing. `tail -f` (*follow*) prints the last lines and then waits, printing each new line as it is written:

```bash
$ tail -f /var/log/app/app.log
2026-10-24 09:41:02 INFO request handled in 12 ms
2026-10-24 09:41:05 INFO request handled in 9 ms
2026-10-24 09:41:07 ERROR database connection refused
```

It keeps running until you press <kbd>Ctrl</kbd>+<kbd>C</kbd>. A common way to debug is to run `tail -f` on the log in one terminal, then make a request or restart the service in another, and watch what appears.

Logs are often **rotated**: when a log gets large or a day ends, it is renamed to something like `app.log.1` and a new, empty `app.log` is started. Plain `tail -f` keeps following the old, renamed file and goes quiet. `tail -F` follows the *name* instead, and switches to the new file when it appears. On a server, `tail -F` is usually the one you want.

You can follow a log from inside `less` too. Press <kbd>F</kbd> to start following, and <kbd>Ctrl</kbd>+<kbd>C</kbd> to stop and scroll back through what arrived. Logs from services managed by systemd are read with `journalctl`, which the *Services with systemd* topic covers.

## Tasks

Do these in your Linux shell. Start by creating a log with 500 lines. `seq -f` prints numbers into a line of text:

```bash
$ cd ~
$ seq -f "request %g handled" 1 500 > app.log
```

### Task 1: Look at parts of a file

Using `wc`, `head` and `tail`, find:

1. how many lines `app.log` has
2. its first 2 lines
3. its last 4 lines
4. line 250 on its own

<details>
<summary>Check your work</summary>

```bash
$ wc -l app.log
500 app.log
$ head -n 2 app.log
request 1 handled
request 2 handled
$ tail -n 4 app.log
request 497 handled
request 498 handled
request 499 handled
request 500 handled
$ head -n 250 app.log | tail -n 1
request 250 handled
```

For line 250, `head -n 250` stops at line 250 and `tail -n 1` keeps only that last line. If you used `tail -n +250`, you got line 250 and everything after it.

</details>

### Task 2: Follow a growing log

Start something that writes a line to `live.log` every two seconds, twenty times, while you keep using the shell. The `&` at the end runs it in the background; the *Processes* topic explains this.

```bash
$ for i in $(seq 1 20); do echo "tick $i"; sleep 2; done >> live.log &
[1] 41
```

The number after `[1]` will differ. Now follow `live.log`, watch a few lines arrive, then stop following.

<details>
<summary>Check your work</summary>

```bash
$ tail -f live.log
tick 1
tick 2
tick 3
tick 4
tick 5
^C
```

A new `tick` line appears every two seconds. <kbd>Ctrl</kbd>+<kbd>C</kbd> stops `tail`, not the writer. Run `tail -n 3 live.log` a few seconds later and you will see the count has kept going. When the loop finishes, the shell prints a line starting with `[1]+  Done`.

If nothing new appears, check that you wrote `>> live.log` and that the name you follow matches exactly.

</details>

## Quiz

**1. You want to check the column names at the top of a CSV file with two million rows. Which command do you use, and which should you avoid?**

<details>
<summary>Show answer</summary>

`head -n 1 file.csv`, or `head` for the first few rows. Avoid `cat`, which prints all two million rows to your screen.

</details>

**2. You are on a server and users report errors right now. The service writes to `/var/log/app/app.log`. How do you see new lines as they are written, and how do you stop?**

<details>
<summary>Show answer</summary>

`tail -F /var/log/app/app.log`, or `tail -f`. It prints the last lines and then each new one as it arrives. Press <kbd>Ctrl</kbd>+<kbd>C</kbd> to stop. `-F` keeps following if the log is rotated while you watch.

</details>

**3. What is the difference between `tail -n 5 app.log` and `tail -n +5 app.log`?**

<details>
<summary>Show answer</summary>

`tail -n 5` prints the last 5 lines. `tail -n +5` prints everything from line 5 to the end.

</details>

**4. Inside `less`, how do you find the first line containing `ERROR`, jump to the next one, and leave?**

<details>
<summary>Show answer</summary>

Type `/ERROR` and press Enter to jump to the first match. Press <kbd>n</kbd> for the next match. Press <kbd>q</kbd> to quit.

</details>

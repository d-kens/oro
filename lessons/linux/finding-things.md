On a real server you rarely know exactly where things are. Somewhere among thousands of files is the config file that sets the database host, the log line that explains the crash, or the old dump that is filling the disk. Two commands find them: `grep` searches *inside* files for text, and `find` searches for files by their name, size or age.

By the end you can search one file or a whole directory tree for a word, and find files by name, type, size and modified time.

## Searching inside files with grep

`grep` prints every line of a file that contains the text you give it. The text comes first, then the file:

```bash
$ grep ERROR logs/app.log
09:01:13 ERROR database timeout
09:03:41 ERROR database timeout
```

The text is called the **pattern**. If it contains spaces, put it in quotes, or `grep` takes the second word as a file name:

```bash
$ grep "database timeout" logs/app.log
09:01:13 ERROR database timeout
09:03:41 ERROR database timeout
$ grep database timeout logs/app.log
grep: timeout: No such file or directory
logs/app.log:09:01:13 ERROR database timeout
logs/app.log:09:01:14 WARN retrying database connection
logs/app.log:09:03:41 ERROR database timeout
```

When nothing matches, `grep` prints nothing. That is not an error; there is simply no such line.

Like everything else in Linux, `grep` is case-sensitive. `ERROR` does not match `error`.

## Useful grep options

| Option | What it does |
| --- | --- |
| `-i` | Ignore case |
| `-n` | Show line numbers |
| `-c` | Print only the number of matching lines |
| `-v` | Print the lines that do *not* match |
| `-w` | Match whole words only |
| `-r` | Search every file under a directory |
| `-l` | Print only the names of files that match |

`-i` catches the error lines that a different part of the program wrote in lower case:

```bash
$ grep -i error logs/app.log
09:01:13 ERROR database timeout
09:01:20 error: cache miss storm
09:03:41 ERROR database timeout
```

`-n` tells you where each match is, so you can jump to it in `less` or an editor. `-c` answers "how many":

```bash
$ grep -n ERROR logs/app.log
3:09:01:13 ERROR database timeout
7:09:03:41 ERROR database timeout
$ grep -c ERROR logs/app.log
2
```

`-v` turns the search around. On a busy log, hiding the routine `INFO` lines often leaves only the ones worth reading:

```bash
$ grep -v INFO logs/app.log
09:01:13 ERROR database timeout
09:01:14 WARN retrying database connection
09:01:20 error: cache miss storm
09:03:41 ERROR database timeout
```

`grep` can do far more than match fixed text. The pattern is a *regular expression*, where some characters have special meanings. For now, keep to plain words; the *Pipes and text* topic goes further.

## Searching a whole directory

`-r` (*recursive*) searches every file under a directory. Each match is printed with the file it came from:

```bash
$ grep -r db_host .
./config/app.conf:db_host=db-01
./config/db.conf:db_host=db-01
```

The `.` means "start here". This is how you answer "which config file sets this?" on a machine you do not know. Add `-l` when you only want the file names, and `-n` when you want to open the file at the right line:

```bash
$ grep -rl db_host .
./config/app.conf
./config/db.conf
$ grep -rn port config
config/app.conf:1:port=8080
config/db.conf:2:db_port=5432
```

Notice that `port` also matched `db_port`. `-w` limits the match to the whole word `port`.

Searching a big tree such as `/` or `/usr` can take a long time and match binary files. Start the search as close to the files as you can, for example `/etc` for configuration.

## Finding files with find

`grep` looks at what is in files. `find` looks at the files themselves. Give it a directory to start from and a test to apply; it walks down through every subdirectory and prints each path that passes.

`-name` matches the file name. Use `*` to match any characters, and put the pattern in quotes so the shell passes it to `find` unchanged instead of expanding it first:

```bash
$ find . -name "*.conf"
./config/app.conf
./config/db.conf
$ find /etc -name hostname
/etc/hostname
```

`-iname` is the same but ignores case. `-type` limits the results to files (`f`) or directories (`d`):

```bash
$ find . -type d
.
./logs
./old
./config
```

`find` prints paths in the order it meets them on disk, not sorted.

When several tests are given, a file must pass all of them:

```bash
$ find . -type f -name "app*"
./logs/app.log
./config/app.conf
```

## Finding by size and age

Two more tests answer the questions you ask when a disk is filling up.

`-size` finds files by size. `+` means more than, `-` means less than, and the units are `k`, `M` and `G`:

```bash
$ find . -size +1M
./old/dump.sql
```

`-mtime` finds files by when their contents last changed, counted in days. `-mtime +30` means more than 30 days ago, and `-mtime -1` means within the last day. `-mmin` does the same in minutes.

```bash
$ find . -mtime +30
./old/dump.sql
$ find . -type f -mtime -1
./logs/app.log
./logs/worker.log
./config/app.conf
./config/db.conf
```

Some tests worth knowing:

| Test | Matches |
| --- | --- |
| `-name "*.log"` | Names ending in `.log` |
| `-iname "readme*"` | Names starting with `readme`, any case |
| `-type f` / `-type d` | Files / directories |
| `-size +100M` | Bigger than 100 MB |
| `-mtime +7` | Changed more than 7 days ago |
| `-mmin -10` | Changed in the last 10 minutes |
| `-maxdepth 1` | Only look this many levels down |

When you search from `/` as an ordinary user, `find` prints `Permission denied` for every directory you cannot read. Add `2>/dev/null` to the end to hide those messages; the *Pipes and text* topic explains how that works.

`find` can also act on what it finds, for example `-delete`, or `-exec` to run a command on each file. Always run the same `find` without the action first and read the list. A wrong test followed by `-delete` removes files just as quickly as `rm -r`.

## Tasks

Do these in your Linux shell. Start by creating a small site to search:

```bash
$ mkdir -p ~/site/config ~/site/logs ~/site/old && cd ~/site
$ printf 'port=8080\ndb_host=db-01\n' > config/app.conf
$ printf 'db_host=db-01\ndb_port=5432\n' > config/db.conf
$ printf '09:00 INFO started\n09:01 ERROR db timeout\n09:02 WARN retrying\n09:03 error: cache full\n09:04 INFO request\n' > logs/app.log
$ printf '09:00 INFO worker started\n' > logs/worker.log
$ seq 1 300000 > old/dump.sql
$ touch -d "2026-09-01" old/dump.sql
```

### Task 1: Search inside files

From `~/site`, answer each question with one `grep` command:

1. How many lines in `logs/app.log` contain `ERROR`, in capitals?
2. Which lines in `logs/app.log` mention an error in any case?
3. Which files under `~/site` mention `db_host`? Print only their names.

<details>
<summary>Check your work</summary>

```bash
$ grep -c ERROR logs/app.log
1
$ grep -i error logs/app.log
09:01 ERROR db timeout
09:03 error: cache full
$ grep -rl db_host .
./config/app.conf
./config/db.conf
```

If question 2 returned only one line, you left out `-i`. If question 3 printed whole lines, use `-l` for names only. If it said `Is a directory`, you left out `-r`.

</details>

### Task 2: Find files

From `~/site`, use `find` to list:

1. every `.log` file
2. every file bigger than 1 MB
3. every file that has not changed for more than 30 days

<details>
<summary>Check your work</summary>

```bash
$ find . -name "*.log"
./logs/app.log
./logs/worker.log
$ find . -size +1M
./old/dump.sql
$ find . -type f -mtime +30
./old/dump.sql
```

The order of `.log` files may differ on your machine. If the first command printed nothing, check the quotes and the `*`: `-name ".log"` matches only a file called exactly `.log`.

</details>

## Quiz

**1. What is the difference between what `grep` searches and what `find` searches?**

<details>
<summary>Show answer</summary>

`grep` searches the text inside files and prints matching lines. `find` searches for files themselves, by name, type, size, age and so on, and prints their paths.

</details>

**2. You are on a server you have never seen, and you need to know which config file under `/etc/app` sets `max_connections`, and on which line. What do you run?**

<details>
<summary>Show answer</summary>

`grep -rn max_connections /etc/app`. `-r` searches every file under the directory, and `-n` adds the line number to each match.

</details>

**3. The disk on `web-01` is nearly full. How do you list files under `/var` bigger than 500 MB?**

<details>
<summary>Show answer</summary>

`find /var -type f -size +500M`. If you are not root, add `2>/dev/null` to hide the `Permission denied` messages. The *Disks and space* topic shows how to see which directories use the most space.

</details>

**4. Why should you write `find . -name "*.log"` with quotes, rather than `find . -name *.log`?**

<details>
<summary>Show answer</summary>

Without quotes, the shell expands `*.log` itself, using the files in the current directory, before `find` runs. If there is one `app.log` here, `find` only looks for files named `app.log`. If there are two, `find` gets an extra argument and fails. With quotes, `find` gets the pattern and applies it in every directory.

</details>

## Creating files with touch

`touch` creates an empty file:

```bash
$ touch notes.txt
$ ls -l notes.txt
-rw-r--r-- 1 root root 0 Oct 24 11:18 notes.txt
```

- If the file already exists, `touch` leaves its contents alone and only sets its modified time to now.
- You will more often create a file by writing into it with `>`, as in the first topic, or with an editor, which the *Editing files with nano and vim* topic covers.

## Creating directories with mkdir

`mkdir` (*make directory*) creates a directory:

```bash
$ mkdir reports
```

It fails in two cases:

```bash
$ mkdir reports
mkdir: cannot create directory 'reports': File exists
$ mkdir a/b/c
mkdir: cannot create directory 'a/b/c': No such file or directory
```

- `File exists` means a file or directory with that name is already there.
- `No such file or directory` means a **parent directory**, one of the directories along the path, is missing. Here `a` and `a/b` do not exist yet.

`-p` (*parents*) fixes both. It creates every missing directory along the path, and does not complain if they already exist:

```bash
$ mkdir -p a/b/c
$ mkdir -p a/b/c
```

Because `mkdir -p` is safe to run twice, scripts nearly always use it.

## Copying with cp

`cp` (*copy*) copies a file. The first argument is the **source**, the file you copy from. The last argument is the **destination**, where the copy goes:

```bash
$ cp app.conf app.conf.bak
$ ls
app.conf  app.conf.bak  notes.txt  reports
```

If the destination is a directory that already exists, the copy goes inside it and keeps its name. You can copy several files into a directory in one go:

```bash
$ cp app.conf app.conf.bak reports/
$ ls reports
app.conf  app.conf.bak
```

`cp` skips directories unless you add `-r` (*recursive*). **Recursive** means the command also works on everything inside the directory, and everything inside those directories, all the way down:

```bash
$ cp reports reports-old
cp: -r not specified; omitting directory 'reports'
$ cp -r reports reports-old
$ ls reports-old
app.conf  app.conf.bak
```

Watch what happens when you run the same `cp -r` again:

- `reports-old` now exists, so the second copy goes *inside* it, as `reports-old/reports`.
- Check with `ls` after copying directories.

Copy a config file before you change it. If your edit breaks the service, you copy the old version back.

## Moving and renaming with mv

`mv` (*move*) works like `cp`, except the original is gone afterwards.

- Linux has no separate rename command. Renaming is moving a file to a new name in the same directory.
- `mv` moves directories without needing `-r`.

```bash
$ mv notes.txt todo.txt
$ mv todo.txt reports/
$ ls reports
app.conf  app.conf.bak  todo.txt
$ mv reports-old archive
```

There is one trap. If the destination is not an existing directory, `mv` treats it as a new name. If you mean to move `app.conf` into a directory called `backup`, and that directory does not exist, the file is renamed to `backup` instead:

```bash
$ mv app.conf backup
$ ls -l backup
-rw-r--r-- 1 root root 10 Oct 24 11:18 backup
```

Put a `/` after a name you mean as a directory. Then `mv` and `cp` stop with an error if it is not one:

```bash
$ mv app.conf backup/
mv: cannot move 'app.conf' to 'backup/': Not a directory
```

## How cp and mv overwrite files

**Overwriting** a file means replacing what is in it with something else. `cp` and `mv` overwrite an existing destination file without asking. This copy silently wipes out whatever was in `app.conf`:

```bash
$ cp app.conf.bak app.conf
```

Three options help:

| Option | What it does |
| --- | --- |
| `-i` | Ask before overwriting (*interactive*); answer `y` or `n` |
| `-n` | Never overwrite an existing file |
| `-v` | Print what was done (*verbose*) |

```bash
$ cp -i app.conf.bak app.conf
cp: overwrite 'app.conf'? n
$ cp -v app.conf.bak app.conf
'app.conf.bak' -> 'app.conf'
```

Use `-v` in scripts and with wildcards, so you can see exactly which files were touched.

## Deleting with rm and rmdir

`rm` (*remove*) deletes files:

```bash
$ rm reports/todo.txt
```

- There is no undo and no recycle bin. The file is not moved anywhere; it is gone.
- Linux does not ask "are you sure" unless you add `-i`.

`rm` refuses to delete a directory on its own. There are two ways to delete one:

- `rmdir` (*remove directory*) deletes a directory only if it is empty, which makes it a safe choice.
- `rm -r` deletes a directory and everything inside it.

```bash
$ rm archive
rm: cannot remove 'archive': Is a directory
$ rmdir archive
rmdir: failed to remove 'archive': Directory not empty
$ rm -r archive
```

You will see `rm -rf` in many guides. `-f` (*force*) means do not ask and do not complain about missing files.

- Together, `-r` and `-f` delete a whole tree without a single question.
- Used on the wrong path, on a server, as root, this is how people lose data.
- Read every `rm -r` twice before you press Enter, and use an absolute path when you are not sure where you are.

Spaces in names matter even more with `rm`. `rm my notes.txt` tries to delete two files, `my` and `notes.txt`. If both existed, both would be gone:

```bash
$ rm my notes.txt
rm: cannot remove 'my': No such file or directory
rm: cannot remove 'notes.txt': No such file or directory
$ rm "my notes.txt"
```

## Wildcards with cp, mv and rm

The `*` wildcard from the *Listing files* topic works with all of these commands. `rm *.log` deletes every file ending in `.log` in the working directory.

The shell expands the pattern before the command runs, so you can check it first:

1. Run `ls` with the same pattern.
2. Read the list.
3. Swap `ls` for `rm`.

```bash
$ ls *.log
a.log  b.log
$ rm -v *.log
removed 'a.log'
removed 'b.log'
```

A stray space is the classic disaster. `rm * .log`, with a space, deletes *everything* in the directory, then complains that `.log` does not exist. Listing first catches it. `rm -i` asks about each file, which is slow but sensible when you are unsure.

## Tasks

Do these in your Linux shell.

### Task 1: Tidy a directory

Create a messy directory:

```bash
$ mkdir -p ~/tidy && cd ~/tidy
$ touch app.log worker.log db.conf app.conf readme.txt
```

Now, from inside `~/tidy`:

1. Create directories `logs` and `config`.
2. Move both `.log` files into `logs` with one command.
3. Copy both `.conf` files into `config`, so the originals stay where they are.
4. Rename `readme.txt` to `README`.

Check the result with `ls -R`, which lists subdirectories too.

<details>
<summary>Check your work</summary>

```bash
$ mkdir logs config
$ mv *.log logs/
$ cp *.conf config/
$ mv readme.txt README
$ ls -R
.:
README  app.conf  config  db.conf  logs

./config:
app.conf  db.conf

./logs:
app.log  worker.log
```

`app.conf` and `db.conf` appear twice because you copied them. If they only appear in `config`, you used `mv`. If `ls *.log` shows nothing before step 2, check that you are in `~/tidy`.

</details>

### Task 2: Clean up safely

Still in `~/tidy`:

1. Delete the two `.conf` files at the top level, but not the copies in `config`. List them first.
2. Try to remove the `logs` directory with `rmdir`, and read the error.
3. Remove `logs` and its contents.

<details>
<summary>Check your work</summary>

```bash
$ ls *.conf
app.conf  db.conf
$ rm -v *.conf
removed 'app.conf'
removed 'db.conf'
$ rmdir logs
rmdir: failed to remove 'logs': Directory not empty
$ rm -r logs
$ ls -R
.:
README  config

./config:
app.conf  db.conf
```

`*.conf` only matches names in the current directory, so the copies in `config` are safe. `rmdir` refuses because `logs` still holds files; `rm -r` deletes the directory and what is in it.

</details>

## Quiz

**1. You run `cp -r site backup` twice. What do you end up with?**

<details>
<summary>Show answer</summary>

The first run creates `backup` as a copy of `site`. On the second run `backup` already exists, so `cp` puts a copy inside it: `backup/site`. You now have the files twice.

</details>

**2. You are on a server about to change `/etc/app/app.conf`. What do you run first, and why?**

<details>
<summary>Show answer</summary>

`cp /etc/app/app.conf /etc/app/app.conf.bak`, or a similar backup name. If your change breaks the service, you can copy the original back with `cp /etc/app/app.conf.bak /etc/app/app.conf` and be running again in seconds.

</details>

**3. What is the difference between `rmdir old` and `rm -r old`?**

<details>
<summary>Show answer</summary>

`rmdir old` only works if `old` is empty, so it cannot delete anything you did not expect. `rm -r old` deletes the directory and everything inside it, without asking.

</details>

**4. You meant to type `rm *.tmp` but typed `rm * .tmp`. What happens, and how would you have caught it?**

<details>
<summary>Show answer</summary>

The space splits it into two arguments: `*`, which matches every file in the directory, and `.tmp`. `rm` deletes every file there, then reports that `.tmp` does not exist. Running `ls * .tmp` first would have shown the whole directory and warned you.

</details>

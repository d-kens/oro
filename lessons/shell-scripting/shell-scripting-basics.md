The Linux skill had you type commands one at a time. A **script** is those same commands saved in a file, so you can run them again, share them, schedule them, and get the same result every time. Most of the automation around servers, from setting up a machine to deploying a release, starts as a shell script.

This topic writes and runs your first scripts. By the end you can create a script, make it executable, run it in the three usual ways, and know which shell is running it.

## Set up your practice machine

Use the same Ubuntu container as the Linux skill, with one addition: a folder on your own computer shared into it. Your scripts then live on your computer, so you can edit them in any editor you like, and they survive when the container is deleted.

On your own computer, make a folder for this skill and start the container from inside it:

```bash
$ mkdir -p ~/scripts && cd ~/scripts
$ docker run -it --rm --hostname lab -v "$PWD":/root/scripts -w /root/scripts ubuntu:24.04
root@lab:~/scripts#
```

- `-v "$PWD":/root/scripts` shares the folder you are in as `/root/scripts` inside the container.
- `-w /root/scripts` starts you in that folder.

Anything you save in `~/scripts` on your computer appears in the container straight away, and the other way round. On Windows, run the commands from your WSL Ubuntu terminal, or skip Docker and work in WSL directly.

To edit inside the container instead, install nano once per session with `apt update && apt install -y nano`.

## Your first script

A script is a plain text file. Create `hello.sh` with these three lines:

```bash
#!/bin/bash
# Print a greeting and some facts about the machine.
echo "Hello from $(hostname)"
```

- The first line, starting `#!`, is the **shebang**. It tells the system which program should run the file, here `/bin/bash`.
- Lines starting with `#` after that are **comments**. Bash ignores them; they are for the next person to read the script, which is often you.
- The rest are commands, exactly as you would type them at the prompt.

The `.sh` ending is a convention for people. Linux does not need it, and the shebang is what decides how the file is run.

## Making it executable and running it

Try to run the file by its path:

```bash
root@lab:~/scripts# ./hello.sh
bash: ./hello.sh: Permission denied
```

In a folder shared from macOS the message reads `bad interpreter: Permission denied` instead; it means the same thing. A new file is not executable. Give it the execute permission, which the Linux skill's *Users and permissions* topic covered, and run it again:

```bash
root@lab:~/scripts# chmod +x hello.sh
root@lab:~/scripts# ls -l hello.sh
-rwxr-xr-x 1 root root 95 Oct 25 09:14 hello.sh
root@lab:~/scripts# ./hello.sh
Hello from lab
```

The `./` matters. When you type a bare name like `hello.sh`, the shell looks for it only in the directories listed in `PATH`, and the current directory is not one of them:

```bash
root@lab:~/scripts# hello.sh
bash: hello.sh: command not found
```

`./hello.sh` gives the path directly: "the file `hello.sh` in this directory".

## Three ways to run a script

| Command | What runs it | Needs execute permission | Changes your shell |
| --- | --- | --- | --- |
| `./hello.sh` | The program in the shebang, as a new process | Yes | No |
| `bash hello.sh` | Bash, as a new process; the shebang is ignored | No | No |
| `source hello.sh` or `. hello.sh` | Your current shell, line by line | No | Yes |

The first two start a **new process**: a fresh shell runs the script and exits, and anything the script changes, such as a variable or the current directory, disappears with it. `source` runs the lines in *your* shell, so their changes stay. You can see the difference with a script that changes directory:

```bash
root@lab:~/scripts# printf '#!/bin/bash\ncd /tmp\npwd\n' > go.sh
root@lab:~/scripts# chmod +x go.sh
root@lab:~/scripts# ./go.sh
/tmp
root@lab:~/scripts# source go.sh
/tmp
root@lab:/tmp#
```

After `./go.sh` you are still in `~/scripts`, because only the script's own shell moved. After `source go.sh` your prompt shows `/tmp`: your own shell ran the `cd`. Run `cd ~/scripts` to go back.

Use `./script.sh` for scripts. Use `source` only for files whose whole job is to change your shell, such as `~/.bashrc`.

## Bash, sh and the shebang

Several shells exist, and they are not all the same:

- **sh** is the basic shell that every Unix-like system has. On Ubuntu, `/bin/sh` is a small, fast shell called *dash*.
- **Bash** is a larger shell with many extra features: arrays, `[[ ]]`, `$(( ))` and more, which this skill uses throughout.

A script that uses Bash features but starts with `#!/bin/sh` will fail in confusing ways:

```bash
root@lab:~/scripts# printf '#!/bin/sh\nnames=(web db)\necho ${names[0]}\n' > arr.sh
root@lab:~/scripts# chmod +x arr.sh && ./arr.sh
./arr.sh: 2: Syntax error: "(" unexpected
```

The same file with `#!/bin/bash` prints `web`. Every script in this skill starts with `#!/bin/bash`. You will also see `#!/usr/bin/env bash`, which finds Bash wherever it is installed in `PATH`; it is common on systems where Bash is not in `/bin`, such as some macOS and BSD machines. Both are fine.

To check which Bash you have:

```bash
root@lab:~/scripts# bash --version | head -n 1
GNU bash, version 5.2.21(1)-release (aarch64-unknown-linux-gnu)
```

## Comments and layout

A script is read far more often than it is written. A few habits from the start:

```bash
#!/bin/bash
# disk-report.sh: show how full the root filesystem is.
# Usage: ./disk-report.sh

echo "Disk use on $(hostname), $(date +%F)"
df -h /
```

- Put a comment at the top saying what the script does and how to run it.
- Leave blank lines between steps.
- Comment *why* something is done when it is not obvious. Don't repeat what the command already says.

Long commands can be split over lines by ending each line with a backslash, with nothing after it, not even a space:

```bash
tar -czf backup.tar.gz \
    --exclude='*.tmp' \
    /etc
```

## Tasks

### Task 1: A machine summary script

Write a script called `summary.sh` that prints, one per line:

1. `Host: ` and the machine's name
2. `User: ` and the user running the script
3. `Kernel: ` and the kernel version
4. `Uptime: ` and the output of `uptime -p`

Make it executable and run it with `./summary.sh`. Then run it with `bash summary.sh` and check the output is the same.

<details>
<summary>Check your work</summary>

```bash
#!/bin/bash
# summary.sh: print a short description of this machine.
echo "Host: $(hostname)"
echo "User: $(whoami)"
echo "Kernel: $(uname -r)"
echo "Uptime: $(uptime -p)"
```

```bash
root@lab:~/scripts# chmod +x summary.sh
root@lab:~/scripts# ./summary.sh
Host: lab
User: root
Kernel: 6.12.54-linuxkit
Uptime: up 2 hours, 41 minutes
```

The uptime is your computer's or the Docker machine's, not the container's, because containers share the host's kernel. If you see `Permission denied`, you skipped `chmod +x`. If you see `$(hostname)` printed literally, you used single quotes: `$( )` only runs inside double quotes, which the *Shell variables* topic explains.

</details>

### Task 2: Install it as a command

Make `summary.sh` runnable from any directory as just `summary`, without `./` or the `.sh`. Put a copy in a directory that is already in `PATH`, and check it works from `/tmp`.

<details>
<summary>Check your work</summary>

`/usr/local/bin` is in `PATH` on every Ubuntu machine and is the usual place for scripts you install yourself:

```bash
root@lab:~/scripts# echo $PATH
/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
root@lab:~/scripts# cp summary.sh /usr/local/bin/summary
root@lab:~/scripts# cd /tmp
root@lab:/tmp# summary
Host: lab
User: root
Kernel: 6.12.54-linuxkit
Uptime: up 2 hours, 42 minutes
root@lab:/tmp# command -v summary
/usr/local/bin/summary
```

The copy keeps its execute permission. On a server where you are not root, use `sudo cp`, or put scripts in `~/.local/bin`, which Ubuntu adds to `PATH` for ordinary users once the directory exists. This copy lives in the container, so it is gone when you exit; your original stays in `~/scripts`.

</details>

## Quiz

**1. A colleague's script starts with `#!/bin/sh` and fails with `Syntax error: "(" unexpected` on a line that defines an array. What is wrong?**

<details>
<summary>Show answer</summary>

On Ubuntu, `/bin/sh` is dash, which has no arrays. The script uses a Bash feature but asks for sh. Change the shebang to `#!/bin/bash`, or run it with `bash script.sh`.

</details>

**2. You run `bash deploy.sh` and it works, but `./deploy.sh` says `Permission denied`. Why?**

<details>
<summary>Show answer</summary>

`bash deploy.sh` only needs to read the file, because Bash is the program being run. `./deploy.sh` runs the file itself, which needs the execute permission. Fix it with `chmod +x deploy.sh`.

</details>

**3. A script called `setenv.sh` exports `APP_ENV=staging`. You run `./setenv.sh` and then `echo $APP_ENV`, and nothing is printed. How do you get the variable into your shell?**

<details>
<summary>Show answer</summary>

`./setenv.sh` runs in a new process, and its variables disappear when it exits. Run it with `source setenv.sh` (or `. setenv.sh`) so the lines run in your current shell.

</details>

**4. On a server, you type `backup` and get `command not found`, but `/opt/tools/backup` exists and is executable. Give two ways to run it.**

<details>
<summary>Show answer</summary>

Run it by its full path, `/opt/tools/backup`, or add its directory to `PATH` with `export PATH="$PATH:/opt/tools"` and then type `backup`. A third option is to copy or link it into a directory already in `PATH`, such as `/usr/local/bin`.

</details>

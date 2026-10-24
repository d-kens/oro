A program on disk does nothing until you run it. Once it runs, it is a **process**: a program in memory, with its own number, an owner, and a share of the CPU. A busy server runs dozens or hundreds of them. When an application hangs, or something uses all the CPU, your job is to find the right process and stop it cleanly.

By the end you can list processes, find one by name, run a command in the background, send it signals, and stop a process that ignores a polite request.

## What a process is

Each process has a **process ID** or *PID*, a number the kernel hands out when the process starts. Each process also has a **parent**, the process that started it, whose PID is the *PPID*. When you type a command, your shell starts it as a child of the shell.

`$$` holds the PID of your shell:

```bash
$ echo $$
1
```

In the Docker container your shell is PID 1, because it is the first and only thing the container started. On a normal Linux machine PID 1 is **systemd**, which starts everything else when the machine boots. The *Services with systemd* topic covers it.

The kernel shows every process as a directory under `/proc`, named after its PID. Tools such as `ps` read their information from there.

## Seeing what is running

`ps` on its own lists the processes started from this terminal:

```bash
$ ps
  PID TTY          TIME CMD
    1 pts/0    00:00:00 bash
   12 pts/0    00:00:00 ps
```

`ps` sees itself, because it is running while it looks. To see every process on the machine, use `ps -ef` or `ps aux`. Both are common; `-ef` shows the parent, `aux` shows CPU and memory use.

```bash
$ ps -ef
UID        PID  PPID  C STIME TTY          TIME CMD
root         1     0  0 11:20 pts/0    00:00:00 bash
root        14     1  0 11:21 pts/0    00:00:00 sleep 600
root        15     1  0 11:21 pts/0    00:00:00 ps -ef
```

```bash
$ ps aux
USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root         1  0.0  0.0   4296  3584 pts/0    Ss   11:20   0:00 bash
root        14  0.0  0.0   2696  1408 pts/0    S    11:21   0:00 sleep 600
root        16  0.0  0.0   7888  3712 pts/0    R+   11:21   0:00 ps aux
```

| Column | Meaning |
| --- | --- |
| `USER` or `UID` | The user the process runs as |
| `PID`, `PPID` | Its own number and its parent's |
| `%CPU`, `%MEM` | Share of the CPU and of memory it is using |
| `STAT` | State: `R` running, `S` sleeping (waiting for something), `T` stopped, `Z` zombie |
| `COMMAND` or `CMD` | The command line it was started with |

On a server the list is long. `pgrep` finds processes by name, and `-a` prints the command line too:

```bash
$ pgrep -a sleep
14 sleep 600
```

`top` shows the same list, sorted by CPU use and updated every few seconds. The *Watching a machine* topic covers it.

## Foreground and background

A command normally runs in the **foreground**: the shell waits for it to finish before giving you the prompt back. <kbd>Ctrl</kbd>+<kbd>C</kbd> stops it.

Put `&` at the end of a command to run it in the **background**. The shell prints a job number in brackets and the PID, then gives you the prompt straight away:

```bash
$ sleep 600 &
[1] 226
$ sleep 900 &
[2] 228
$ jobs
[1]-  Running                 sleep 600 &
[2]+  Running                 sleep 900 &
```

`jobs` lists the background jobs of this shell. You can refer to a job as `%1`, `%2` and so on, in place of its PID.

| Keys or command | What it does |
| --- | --- |
| <kbd>Ctrl</kbd>+<kbd>Z</kbd> | Pause the foreground command; it becomes a stopped job |
| `bg %1` | Let a stopped job carry on in the background |
| `fg %1` | Bring a job back to the foreground |

Background jobs belong to your shell. If you close the terminal they are usually stopped too. Anything that must keep running belongs in a service, which the next topic covers.

## Signals

You stop a process by sending it a **signal**, a short message from the kernel. The command is called `kill`, but sending a signal does not always mean killing. The ones you will use:

| Number | Name | Sent by | What it means |
| --- | --- | --- | --- |
| 15 | `SIGTERM` | `kill PID` | Please finish up and exit. The default. |
| 2 | `SIGINT` | <kbd>Ctrl</kbd>+<kbd>C</kbd> | Interrupt from the keyboard |
| 1 | `SIGHUP` | `kill -HUP PID` | Many services reload their config when they get it |
| 9 | `SIGKILL` | `kill -9 PID` | Removed by the kernel at once. Cannot be caught or ignored. |

A program can catch `SIGTERM` and `SIGINT`, close its files, finish what it was writing and exit tidily. It can also choose to ignore them. `SIGKILL` never reaches the program at all: the kernel simply ends it.

```bash
$ kill 226
$ jobs
[1]-  Terminated              sleep 600
[2]+  Running                 sleep 900 &
$ kill %2
$
[2]+  Terminated              sleep 900
```

`kill -l` lists every signal. `pkill name` sends a signal to every process with that name, so check first with `pgrep -a name` that it matches only what you mean.

If the PID does not exist, perhaps because the process has already exited, `kill` says so:

```bash
$ kill 4312
bash: kill: (4312) - No such process
```

## Stopping a process that will not stop

Work up from polite to forceful:

1. Ask: `kill PID`, which sends `SIGTERM`.
2. Wait a few seconds and check with `ps -p PID` or `pgrep -a name`.
3. Only if it is still there, force it: `kill -9 PID`.

Do not start with `kill -9`. The process gets no chance to clean up, so it can leave half-written files, lock files or temporary files behind, and a database may need to repair itself when it next starts.

Here is a script that ignores `SIGTERM`. `trap` tells the shell what to do when a signal arrives; here it prints a message and carries on.

```bash
#!/bin/bash
trap 'echo "stubborn: ignoring SIGTERM"' TERM
while true; do sleep 1; done
```

```bash
$ ./stubborn.sh &
[1] 249
$ kill 249
stubborn: ignoring SIGTERM
$ ps -p 249
    PID TTY          TIME CMD
    249 pts/0    00:00:00 stubborn.sh
$ kill -9 249
$
[1]+  Killed                  ./stubborn.sh
```

Two cases where even `kill -9` seems not to work. A process in state `D` is waiting on a disk or network file system inside the kernel, and goes when that wait ends. A process in state `Z`, a *zombie*, has already exited; it is only an entry waiting for its parent to collect it, and it uses no CPU or memory.

## Tasks

Do these in your Linux shell.

### Task 1: Find and stop background jobs

Start `sleep 500`, `sleep 600` and `sleep 700` in the background. List them with `jobs` and with `pgrep -a sleep`. Stop `sleep 600` using its PID, and `sleep 700` using its job number. Check that only `sleep 500` is left, then stop it too.

<details>
<summary>Check your work</summary>

```bash
$ sleep 500 &
[1] 31
$ sleep 600 &
[2] 32
$ sleep 700 &
[3] 33
$ pgrep -a sleep
31 sleep 500
32 sleep 600
33 sleep 700
$ kill 32
$ kill %3
[2]-  Terminated              sleep 600
$ jobs
[1]-  Running                 sleep 500 &
[3]+  Terminated              sleep 700
$ pgrep -a sleep
31 sleep 500
$ kill %1
$
[1]+  Terminated              sleep 500
```

The shell reports a finished job just before it shows the next prompt, so the `Terminated` lines can appear one command later than you expect. Your PIDs will differ; use the ones `pgrep` prints. A common slip is `kill 3` when you meant `kill %3`: without the `%`, the shell treats 3 as a PID, and you get `No such process` or, worse, signal a different process.

</details>

### Task 2: Deal with a stubborn process

Create `stubborn.sh` from the script above with the editor from the *Editing files* topic, make it executable with `chmod u+x stubborn.sh`, and start it in the background. Try to stop it with a plain `kill`, confirm it is still running, then stop it for good.

<details>
<summary>Check your work</summary>

```bash
$ chmod u+x stubborn.sh
$ ./stubborn.sh &
[1] 249
$ kill $(pgrep -f stubborn)
stubborn: ignoring SIGTERM
$ ps -o pid,stat,cmd
  PID STAT CMD
    1 Ss   bash
  249 S    /bin/bash ./stubborn.sh
  259 S    sleep 1
  261 R+   ps -o pid,stat,cmd
$ kill -9 249
$
[1]+  Killed                  ./stubborn.sh
```

`pgrep -f` matches against the whole command line, so it finds the script whatever name the process shows. `$(…)` puts its PID into the `kill` command. If you see `Permission denied` when you start the script, you skipped the `chmod`.

</details>

## Quiz

**1. You are on web-01. An application has stopped answering and is using 100% of a CPU. What do you do, in order?**

<details>
<summary>Show answer</summary>

Find its PID with `pgrep -a` or `ps aux`. Send `kill PID` and give it a few seconds. Check whether it is still there with `ps -p PID`. Only if it is, use `kill -9 PID`. Then find out why it hung, for example from its logs.

</details>

**2. What is the difference between `kill 4312` and `kill -9 4312`?**

<details>
<summary>Show answer</summary>

`kill 4312` sends `SIGTERM`, which asks the process to exit and lets it clean up first. It can also ignore the request. `kill -9 4312` sends `SIGKILL`: the kernel removes the process at once, and the process cannot catch it or clean up.

</details>

**3. In `ps -ef` output, what does the PPID column tell you, and what is PID 1 on a normal Linux server?**

<details>
<summary>Show answer</summary>

PPID is the PID of the parent, the process that started this one. On a normal server PID 1 is systemd, which starts everything else at boot. In a container PID 1 is whatever the container was started with, often a shell.

</details>

**4. You run `kill 4312` and get `No such process`. What does that mean?**

<details>
<summary>Show answer</summary>

There is no process with that PID. Usually it has already exited, or you typed the wrong number. Check with `pgrep -a` or `ps aux` before trying again.

</details>

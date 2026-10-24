When someone says a server is slow, the first job is to look at it. Is the CPU working flat out? Has memory run out? Are processes waiting on a slow disk? A handful of commands answer these questions in under a minute, and they are the same on every Linux machine.

By the end you can read the load average, use `top` to see what is using the CPU and memory, tell used memory from memory the kernel is borrowing for cache, find the heaviest processes with `ps`, and decide whether a machine is busy or broken.

## Load average

`uptime` prints one line: the time, how long the machine has been running, how many users are logged in, and the **load average**:

```bash
$ uptime
 10:42:07 up 12 days,  3:18,  1 user,  load average: 3.84, 2.10, 1.25
```

The load average is the number of processes that are either running on a CPU or waiting for one, averaged over the last **1, 5 and 15 minutes**. Processes waiting for the disk count too.

The number only means something next to the number of CPUs. `nproc` tells you that:

```bash
$ nproc
4
```

With 4 CPUs, a load of 4 means every CPU is busy and nothing is waiting. A load of 1 means three CPUs are idle. A load of 12 means that, on average, two processes are waiting for each one that runs.

Reading the three numbers together tells you the direction. `3.84, 2.10, 1.25` is rising: the last minute was much busier than the last quarter of an hour. `0.50, 2.80, 3.90` is falling: something heavy has just finished.

## top and htop

`top` shows a live view that refreshes every few seconds. Press <kbd>q</kbd> to quit.

```bash
$ top
top - 10:42:11 up 12 days,  3:18,  1 user,  load average: 3.84, 2.10, 1.25
Tasks: 142 total,   3 running, 139 sleeping,   0 stopped,   0 zombie
%Cpu(s): 71.2 us,  4.1 sy,  0.0 ni, 23.9 id,  0.6 wa,  0.0 hi,  0.2 si,  0.0 st
MiB Mem :   7837.0 total,    412.6 free,   5120.3 used,   2304.1 buff/cache
MiB Swap:      0.0 total,      0.0 free,      0.0 used.   2716.7 avail Mem

    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
   2214 app       20   0 3104812 2.1g  31204 R 196.4  27.4  41:02.18 java
    981 postgres  20   0  402312 148m 141020 S  38.2   1.9  12:47.55 postgres
   1503 www-data  20   0   56120  9412   6120 S   2.0   0.1   0:31.02 nginx
```

The header is a summary of the whole machine. The CPU line is the one to learn:

| Field | Meaning |
| --- | --- |
| `us` | Time running ordinary programs |
| `sy` | Time running the kernel on behalf of programs |
| `id` | Idle time |
| `wa` | Time with nothing to run because programs are waiting for the disk |
| `st` | *Steal*: time a virtual machine wanted the CPU but the host gave it to another machine |

Below the header, processes are sorted by CPU use. `%CPU` is a share of one CPU, so a busy program using two CPUs shows `196.4`. `RES` is the memory the process is really using. The `S` column is the state from the *Processes* topic: `R` running, `S` sleeping, `D` waiting on the disk and impossible to interrupt.

Useful keys while `top` is running: <kbd>M</kbd> sorts by memory, <kbd>P</kbd> sorts by CPU again, <kbd>1</kbd> shows each CPU on its own line, and <kbd>k</kbd> asks for a PID to send a signal to.

`htop` does the same job with colour and scrolling. Install it with `apt install -y htop`, but learn `top` first: it is on every machine.

## Memory: free

`free -h` shows memory in readable units:

```bash
$ free -h
               total        used        free      shared  buff/cache   available
Mem:           7.7Gi       5.0Gi       402Mi        12Mi       2.3Gi       2.7Gi
Swap:             0B          0B          0B
```

`free` looks alarming here, but it is not the column to read. Linux uses memory that no program needs to **cache** files it has read recently, which makes the next read faster. That cache is `buff/cache`, and the kernel gives it back the moment a program asks for memory.

The column that matters is **available**: how much memory programs can still get, counting the cache that can be freed. Low `free` with plenty of `available` is a healthy machine. Low `available` is a machine running out of memory.

**Swap** is disk space used as overflow when memory is full. It keeps the machine alive, but disk is far slower than memory, so heavy swap use makes everything slow. When memory and swap run out, the kernel's **OOM killer** (*out of memory*) stops a process to free memory, usually the largest one. You see it in the kernel log with `journalctl -k | grep -i oom`.

## Over time: vmstat

`top` shows a moment. `vmstat` prints one line per interval, so you can see a trend. `vmstat 2 5` prints five lines, two seconds apart:

```bash
$ vmstat 2 5
procs -----------memory---------- ---swap-- -----io---- -system-- -------cpu-------
 r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st gu
 4  0      0 412604  37316 2266812    0    0    12   140 2689 3104 70  4 25  1  0  0
 5  0      0 409880  37316 2267020    0    0     0    88 2711 3210 72  4 23  1  0  0
 4  0      0 411112  37316 2267340    0    0     0    64 2650 3050 71  5 23  1  0  0
...
```

Ignore the first line, an average since boot. Then read:

- `r`: processes running or waiting for a CPU. More than the number of CPUs, for a while, means the CPU is the bottleneck.
- `b`: processes blocked waiting for the disk. Anything above zero for a while is worth a look.
- `si` and `so`: memory swapped in and out per second. They should be zero.
- `us`, `sy`, `id`, `wa`: the same CPU fields as in `top`.

## The heaviest processes: ps

`top` is interactive. For a quick answer, or in a script, sort `ps` output instead. `-eo` chooses the columns and `--sort=-%cpu` sorts by CPU with the largest first:

```bash
$ ps -eo pid,user,%cpu,%mem,comm --sort=-%cpu | head -5
    PID USER     %CPU %MEM COMMAND
   2214 app      98.1 27.4 java
    981 postgres 18.6  1.9 postgres
   1503 www-data  0.4  0.1 nginx
      1 root      0.0  0.1 systemd
```

Sort by memory the same way, with `rss`, the resident memory in kilobytes:

```bash
$ ps -eo pid,user,%mem,rss,comm --sort=-%mem | head -4
    PID USER     %MEM   RSS COMMAND
   2214 app      27.4 2201604 java
    981 postgres  1.9 151552 postgres
    640 root      0.4  31840 containerd
```

`%CPU` in `ps` is the average since the process started, not the current moment, so a process that just became busy can rank lower here than in `top`.

## Where the numbers come from: /proc

All these tools read **`/proc`**, a directory the kernel fills with live information. Its files take no disk space and are made fresh each time you read them.

```bash
$ cat /proc/loadavg
3.84 2.10 1.25 5/311 2290
$ head -3 /proc/meminfo
MemTotal:        8025128 kB
MemFree:          422508 kB
MemAvailable:    2781872 kB
$ grep -c ^processor /proc/cpuinfo
4
```

Each process has a directory named after its PID. `/proc/2214/status` shows its name, state and memory, and `/proc/2214/cmdline` the full command it was started with.

## Busy or broken

A busy server is doing its job with no room to spare. A broken one is stuck. The signs:

| What you see | Likely meaning |
| --- | --- |
| High load, high `us`, one known process at the top of `top` | Busy. The program is working hard; more CPUs or less work |
| High load, low `us`, high `wa`, processes in state `D` | Stuck on the disk: a full or failing disk, or a slow network volume |
| Low `available`, `si` and `so` above zero | Out of memory and swapping; everything slows down |
| A process missing and `oom` in `journalctl -k` | The kernel killed it to free memory |
| High `st` | The machine is starved by its host, not by its own work |
| Normal numbers, but the service does not answer | Not a resource problem; check the service and its logs |

The last row matters. A machine with a load of 0.1 can still be broken, because a crashed service uses no CPU. Pair these commands with `systemctl status` and `journalctl` from the *Services with systemd* topic.

## Tasks

Do these in your Linux shell. In a Docker container, `uptime`, `top` and `free` show the whole Docker machine, not only the container, so your numbers may include other work on your computer.

### Task 1: Find the process eating the CPU

Start two processes that use a full CPU each, in the background:

```bash
$ yes > /dev/null &
$ yes > /dev/null &
```

Find them in `top`, and then with a sorted `ps`. Wait a minute and run `uptime` to see the load rise. Then stop both processes.

<details>
<summary>Check your work</summary>

```bash
$ top -bn1 | head -12
top - 11:17:19 up 4 min,  0 user,  load average: 0.90, 0.50, 0.20
Tasks:   5 total,   3 running,   2 sleeping,   0 stopped,   0 zombie
...
    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
     12 root      20   0    2272   1160   1068 R 100.0   0.0   0:05.20 yes
     13 root      20   0    2272   1152   1060 R 100.0   0.0   0:05.20 yes
$ ps -eo pid,user,%cpu,%mem,comm --sort=-%cpu | head -3
    PID USER     %CPU %MEM COMMAND
     12 root      100  0.0 yes
     13 root      100  0.0 yes
$ uptime
 11:18:30 up 5 min,  0 user,  load average: 1.76, 0.84, 0.34
$ kill %1 %2
```

`-bn1` runs `top` once and prints, which is handy for copying. The 1-minute load rises towards 2, one for each busy process, while the 15-minute figure moves slowly. If you forgot `&`, the shell waits for `yes`: press <kbd>Ctrl</kbd>+<kbd>C</kbd> and start again.

</details>

### Task 2: A one-screen health check

Write the commands that answer, in order: how many CPUs this machine has, the three load averages, how much memory is available, and the three processes using the most memory. Read the load and the CPU count from `/proc` rather than from `uptime`.

<details>
<summary>Check your work</summary>

```bash
$ grep -c ^processor /proc/cpuinfo
8
$ cut -d ' ' -f 1-3 /proc/loadavg
0.12 0.31 0.28
$ free -h | grep Mem
Mem:           7.7Gi       780Mi       6.4Gi       772Ki       649Mi       6.9Gi
$ ps -eo pid,user,%mem,rss,comm --sort=-%mem | head -4
    PID USER     %MEM   RSS COMMAND
     21 root      0.0  3600 ps
      1 root      0.0  3020 bash
     22 root      0.0  1240 head
```

`nproc` gives the same CPU count. The available memory is the last number on the `Mem:` line, not the `free` column. The container runs so few processes that `ps` and `head` themselves make the list; on a real server you would see your applications.

</details>

## Quiz

**1. A server with 2 CPUs shows `load average: 6.10, 5.95, 6.02`. What does that tell you?**

<details>
<summary>Show answer</summary>

On average about six processes want a CPU and only two can run, so roughly four are always waiting. It has been like that for at least 15 minutes. The machine is overloaded, not having a short spike.

</details>

**2. `free -h` shows 300Mi free and 5.1Gi available on an 8Gi machine. Is it short of memory?**

<details>
<summary>Show answer</summary>

No. Most of the difference is file cache, which the kernel gives back when a program needs memory. `available` is the number to watch, and 5.1Gi is plenty.

</details>

**3. You are on a server that feels slow. The load is 9 on 4 CPUs, but `top` shows `us` at 5% and `wa` at 80%, with several processes in state `D`. What is the likely cause?**

<details>
<summary>Show answer</summary>

The CPUs are mostly idle; processes are waiting for the disk. Check whether a disk is full with `df -h`, whether one is failing in `journalctl -k`, and whether a network volume is slow. More CPU would not help.

</details>

**4. An application process disappeared overnight with no error in its own log. Where do you look, and for what?**

<details>
<summary>Show answer</summary>

In the kernel log, with `journalctl -k | grep -i oom` (or `dmesg`). If the machine ran out of memory, the OOM killer recorded which process it killed and how much memory it was using.

</details>

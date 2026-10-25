A monitoring system can only act on what a check tells it. In this project you write `health-check.sh`, a script that looks at disk use, free memory, the load average and a list of processes, prints a short table of OK, WARN and FAIL lines, and exits with 0, 1 or 2 so that cron, a monitor or another script knows how worried to be.

It uses *Arguments and input* for `getopts` and the usage message, *Functions* and *Arrays* for the structure, *Arithmetic and strings* for the sums and `printf`, *Exit codes and errors* for the status it returns, *Robust scripts* for `set -euo pipefail` and a trap, and *Real-world scripts* for the config file, logging and cron. From the Linux skill it draws on *Disks and space*, *Watching a machine*, *Processes* and *Running things on a schedule*.

## What you need

The practice machine from *Shell scripting basics*, started from `~/scripts` on your computer:

```bash
$ cd ~/scripts
$ docker run -it --rm --hostname lab -v "$PWD":/root/scripts -w /root/scripts ubuntu:24.04
root@lab:~/scripts#
```

Install cron and ShellCheck, and start the cron service by hand, because the container has no init system to do it for you:

```bash
root@lab:~/scripts# apt update && apt install -y cron shellcheck
root@lab:~/scripts# service cron start
 * Starting periodic command scheduler cron
   ...done.
```

The container runs very little, so give the script something to look for. `sleep infinity` runs until it is killed; start one in the background as a stand-in for a service:

```bash
root@lab:~/scripts# sleep infinity &
[1] 412
```

Your process ID will differ. The memory and load figures in this page come from one machine; yours will show different numbers, which is fine.

## The brief

1. `./health-check.sh` with no options checks disk use of `/`, available memory and the load average, and prints a table with a header and one line per check. Check: run it and read the table.
2. `-d MOUNT` checks a mount point and `-p NAME` checks that a process is running. Both can be given more than once. Check: `./health-check.sh -d / -d /root/scripts -p sleep` shows two disk lines and a process line.
3. Every threshold has a default, can be set in a config file read with `-c FILE`, and can be overridden on the command line with `-s KEY=VALUE`. Check: `-s DISK_WARN=1` turns the disk line to WARN.
4. The script exits 0 when everything is OK, 1 when the worst result is WARN, and 2 when anything is FAIL. A usage error exits 3. Check: `echo $?` after each kind of run.
5. `-o FILE` also writes the report, with the host name and time, to a file. The file is replaced in one step, so a reader never sees half a report. Check: `cat` the file.
6. The script passes ShellCheck and has a usage message. Check: `shellcheck health-check.sh` prints nothing, and `-h` prints the usage.
7. Cron runs it every five minutes and records an alert line whenever it exits non-zero. Check: `crontab -l`, and a temporary every-minute entry writes the report within a minute.

## Steps

### Gather the numbers by hand

Before you write a script, find each number at the prompt. You need four things:

- **Disk use** of a mount point, as a percentage. `df --output=pcent /` prints just that column; the last line holds the number, with spaces and a `%` around it.
- **Available memory**. `/proc/meminfo` has `MemTotal` and `MemAvailable` in kilobytes. Use `MemAvailable`, not `MemFree`: Linux uses spare memory for its file cache and gives it back when a program needs it, so free memory is always low on a busy machine.
- **Load**. The first number in `/proc/loadavg` is the 1-minute load average. A load of 2.0 means very different things on 1 CPU and on 16, so compare it with `nproc`.
- **Processes**. `pgrep -x NAME` matches the process name exactly, and `-c` prints a count.

Hint: Bash does whole-number maths only. Load is a decimal, so turn `0.39` into hundredths, 39, before you divide by the CPU count. Watch out for a part like `08`: Bash reads a leading zero as octal, and `08` is not valid octal. `10#` forces base 10.

<details>
<summary>Show a solution</summary>

```bash
root@lab:~/scripts# df --output=pcent / | tail -n 1
  5%
root@lab:~/scripts# grep -E '^Mem(Total|Available):' /proc/meminfo
MemTotal:        8025128 kB
MemAvailable:    7280516 kB
root@lab:~/scripts# cat /proc/loadavg; nproc
0.36 0.24 0.16 1/307 23
8
root@lab:~/scripts# pgrep -cx sleep
1
root@lab:~/scripts# pgrep -cx cron
1
root@lab:~/scripts# pgrep -cx nginx; echo "exit $?"
0
exit 1
```

`pgrep` exits 1 when nothing matches. Under `set -e` that would stop the script, so the finished script writes `pgrep -cx -- "$name" || true`.

The load sum, with the `10#` guard:

```bash
root@lab:~/scripts# load=0.36; cpus=8
root@lab:~/scripts# whole=${load%.*}; frac=${load#*.}
root@lab:~/scripts# echo $(( (10#$whole * 100 + 10#$frac) / cpus ))
4
```

That is 4 percent of the machine's capacity. 100 percent means every CPU is busy on average.

</details>

### Plan the script

Decide the shape before you type. A plan that works well:

- **Settings** at the top as plain variables with defaults: `disk_warn=80`, `disk_fail=90`, `mem_warn=20` and `mem_fail=10` (percent available), `load_warn=100` and `load_fail=200` (load as a percentage of the CPUs), an array `mounts=(/)` and an empty array `processes=()`.
- **One function per check**: `check_disk`, `check_memory`, `check_load`, `check_process`. Each one calls `record STATUS CHECK DETAIL` and does nothing else with the output.
- **`record`** formats a line with `printf` into a `results` array and remembers the worst status so far in `worst`, as 0, 1 or 2. At the end, `exit "$worst"` is the whole exit-code logic.
- **A usage message, `log` and `die`**. `log` writes a timestamped line to standard error, so the table on standard output stays clean for anyone piping it. `die` logs and exits 3, which monitoring tools commonly read as "unknown": the check itself could not run.

Hint: keep the layout in one place. A format like `'%-6s %-20s %s'` pads the status to 6 characters and the check name to 20, so the columns line up whatever the values are.

<details>
<summary>Show a solution</summary>

This is how `record` and one check look. The full script is in the next stage.

```bash
record() {
  local status=$1 check=$2 detail=$3 code
  case $status in
    OK)   code=0 ;;
    WARN) code=1 ;;
    *)    code=2 ;;
  esac
  (( code > worst )) && worst=$code
  results+=("$(printf '%-6s %-20s %s' "$status" "$check" "$detail")")
}
```

Storing finished lines in an array means the report can be printed to the screen and written to a file without running the checks twice.

`(( code > worst )) && worst=$code` returns a non-zero status when the test is false, but `set -e` ignores failures on the left of `&&`, so it is safe here. It would not be safe as the last line of the function, because the function would then return that status.

</details>

### Add options and a config file

The thresholds that suit a build server do not suit a database server, so they must be changeable without editing the script. Use two layers: a config file for each machine, and `-s KEY=VALUE` on the command line for one-off changes. The command line wins.

The config file is plain `KEY=VALUE` lines with `#` comments. You could `source` it, but then anything in the file runs as code, as root, from cron. Reading it line by line with `IFS='=' read -r key value` and accepting only known keys is safer, and it gives a clear error for a typo.

Hint: send both the file and `-s` through one function, `set_setting KEY VALUE`, so they cannot drift apart. Check numbers with `[[ $value =~ ^[0-9]+$ ]]`. For lists, `read -ra mounts <<< "$value"` splits a space-separated value into an array. Since `-c` may come after `-s` on the command line, collect the options in `getopts` first and apply them afterwards in the right order.

<details>
<summary>Show a solution</summary>

Save this as `health.conf`:

```text
# Settings for health-check.sh
DISK_WARN=70
DISK_FAIL=90
MEM_WARN=25
MEM_FAIL=10
LOAD_WARN=100
LOAD_FAIL=200
MOUNTS=/ /root/scripts
PROCESSES=sleep cron
```

And this is the whole script, `health-check.sh`:

```bash
#!/bin/bash
# Checks disk use, available memory, load and named processes.
# Exits 0 when all is well, 1 on a warning, 2 on a failure and 3 on a usage error.
set -euo pipefail

readonly SCRIPT_NAME=${0##*/}

# Defaults. A config file (-c) changes them, and -s changes them again.
disk_warn=80     # percent used
disk_fail=90
mem_warn=20      # percent available
mem_fail=10
load_warn=100    # 1-minute load as a percentage of the CPU count
load_fail=200
mounts=(/)
processes=()

report_file=""
results=()
worst=0

usage() {
  cat <<USAGE
Usage: $SCRIPT_NAME [-c FILE] [-s KEY=VALUE]... [-d MOUNT]... [-p NAME]... [-o FILE]
  -c FILE       read settings from FILE (KEY=VALUE lines)
  -s KEY=VALUE  set one setting, overriding the config file
  -d MOUNT      check disk use of MOUNT (repeatable, default /)
  -p NAME       check that a process called NAME is running (repeatable)
  -o FILE       also write the report to FILE
  -h            show this help
Keys: DISK_WARN DISK_FAIL MEM_WARN MEM_FAIL LOAD_WARN LOAD_FAIL MOUNTS PROCESSES
USAGE
}

log() {
  printf '%s %s: %s\n' "$(date '+%F %T')" "$SCRIPT_NAME" "$*" >&2
}

die() {
  log "ERROR: $*"
  exit 3
}

is_number() {
  [[ $1 =~ ^[0-9]+$ ]]
}

# Applies one KEY=VALUE setting from the config file or -s.
set_setting() {
  local key=$1 value=$2
  case $key in
    DISK_WARN|DISK_FAIL|MEM_WARN|MEM_FAIL|LOAD_WARN|LOAD_FAIL)
      is_number "$value" || die "$key must be a whole number, got '$value'"
      printf -v "${key,,}" '%s' "$value"
      ;;
    MOUNTS)    read -ra mounts <<< "$value" ;;
    PROCESSES) read -ra processes <<< "$value" ;;
    *) die "unknown setting '$key'" ;;
  esac
}

load_config() {
  local file=$1 key value
  [[ -r $file ]] || die "cannot read config file $file"
  while IFS='=' read -r key value || [[ -n $key ]]; do
    [[ -z $key || $key == \#* ]] && continue
    set_setting "$key" "$value"
  done < "$file"
}

# Records one result line and remembers the worst status seen so far.
record() {
  local status=$1 check=$2 detail=$3 code
  case $status in
    OK)   code=0 ;;
    WARN) code=1 ;;
    *)    code=2 ;;
  esac
  (( code > worst )) && worst=$code
  results+=("$(printf '%-6s %-20s %s' "$status" "$check" "$detail")")
}

# Prints OK, WARN or FAIL for a value where higher is worse.
grade_high() {
  local value=$1 warn=$2 fail=$3
  if (( value >= fail )); then echo FAIL
  elif (( value >= warn )); then echo WARN
  else echo OK
  fi
}

check_disk() {
  local mount=$1 used
  if ! used=$(df --output=pcent "$mount" 2>/dev/null | tail -n 1); then
    record FAIL "disk $mount" "not found"
    return
  fi
  used=${used//[ %]/}
  record "$(grade_high "$used" "$disk_warn" "$disk_fail")" "disk $mount" "${used}% used"
}

check_memory() {
  local total available pct status
  total=$(awk '/^MemTotal:/ {print $2}' /proc/meminfo)
  available=$(awk '/^MemAvailable:/ {print $2}' /proc/meminfo)
  pct=$(( available * 100 / total ))
  if (( pct <= mem_fail )); then status=FAIL
  elif (( pct <= mem_warn )); then status=WARN
  else status=OK
  fi
  record "$status" "memory" "${pct}% available ($(( available / 1024 )) MiB)"
}

check_load() {
  local load1 cpus whole frac pct
  read -r load1 _ < /proc/loadavg
  cpus=$(nproc)
  whole=${load1%.*}
  frac=${load1#*.}
  # Work in hundredths so Bash's integer maths is enough: 1.50 becomes 150.
  pct=$(( (10#$whole * 100 + 10#$frac) / cpus ))
  record "$(grade_high "$pct" "$load_warn" "$load_fail")" "load" "$load1 on $cpus CPUs (${pct}%)"
}

check_process() {
  local name=$1 count
  count=$(pgrep -cx -- "$name" || true)
  if (( count > 0 )); then
    record OK "process $name" "$count running"
  else
    record FAIL "process $name" "not running"
  fi
}

print_table() {
  printf '%-6s %-20s %s\n' STATUS CHECK DETAIL
  printf '%s\n' "${results[@]}"
}

write_report() {
  local file=$1 tmp
  tmp=$(mktemp "$file.XXXXXX") || die "cannot write to $(dirname "$file")"
  trap 'rm -f "$tmp"' EXIT
  {
    printf 'Health check on %s at %s\n' "$(hostname)" "$(date '+%F %T')"
    print_table
  } > "$tmp"
  mv "$tmp" "$file"
  trap - EXIT
  log "report written to $file"
}

main() {
  local opt config="" extra_mounts=() extra_processes=() overrides=()

  while getopts ':c:s:d:p:o:h' opt; do
    case $opt in
      c) config=$OPTARG ;;
      s) overrides+=("$OPTARG") ;;
      d) extra_mounts+=("$OPTARG") ;;
      p) extra_processes+=("$OPTARG") ;;
      o) report_file=$OPTARG ;;
      h) usage; exit 0 ;;
      :) usage >&2; die "option -$OPTARG needs a value" ;;
      *) usage >&2; die "unknown option -$OPTARG" ;;
    esac
  done
  shift $((OPTIND - 1))
  (( $# == 0 )) || { usage >&2; die "unexpected argument '$1'"; }

  # Config file first, then -s, so the command line wins.
  [[ -n $config ]] && load_config "$config"
  local pair
  for pair in "${overrides[@]}"; do
    [[ $pair == *=* ]] || die "-s needs KEY=VALUE, got '$pair'"
    set_setting "${pair%%=*}" "${pair#*=}"
  done
  (( ${#extra_mounts[@]} > 0 )) && mounts=("${extra_mounts[@]}")
  (( ${#extra_processes[@]} > 0 )) && processes=("${extra_processes[@]}")

  local mount name
  for mount in "${mounts[@]}"; do
    check_disk "$mount"
  done
  check_memory
  check_load
  for name in "${processes[@]}"; do
    check_process "$name"
  done

  print_table
  [[ -n $report_file ]] && write_report "$report_file"
  exit "$worst"
}

main "$@"
```

Two lines deserve a closer look:

- `printf -v "${key,,}" '%s' "$value"` assigns to the variable whose name is the key in lower case, so `DISK_WARN` sets `disk_warn`. The `case` above it means only known names get this far.
- In `write_report`, the report goes to a temporary file in the same directory and is then renamed over the old one with `mv`. A rename within one file system is a single step, so a monitor reading the file sees the old report or the new one, never half of one. The `trap` removes the temporary file if the script dies before the rename.

```bash
root@lab:~/scripts# chmod +x health-check.sh
root@lab:~/scripts# shellcheck health-check.sh
root@lab:~/scripts#
```

</details>

### Run it from cron

A health check earns its keep when nobody is watching. Add a cron entry that runs it every five minutes with the config file, writes the report to `/var/log/health-report.txt`, and appends a line to `/var/log/health-alerts.log` whenever it exits non-zero. In a real setup that last part might send a message or call a monitoring system instead.

Cron runs jobs with a short `PATH`, no terminal and `/bin/sh`, not Bash. Use full paths for the script and the config file, and keep the command on the line simple.

Hint: in `cmd || other`, `$?` inside `other` is still the status of `cmd`, but only until something else runs. Put `$?` before any `$(date)` in the same line. Add a temporary every-minute entry to test it, then remove it.

<details>
<summary>Show a solution</summary>

```bash
root@lab:~/scripts# EDITOR=nano crontab -e
```

Install nano first with `apt install -y nano` if you have not. Add these lines, save and exit:

```text
*/5 * * * * /root/scripts/health-check.sh -c /root/scripts/health.conf -o /var/log/health-report.txt > /dev/null 2>&1 || echo "exit $? at $(date)" >> /var/log/health-alerts.log
* * * * * /root/scripts/health-check.sh -c /root/scripts/health.conf -o /var/log/health-report.txt > /dev/null 2>&1 || echo "exit $? at $(date)" >> /var/log/health-alerts.log
```

Wait until the minute after next, then look at what cron produced:

```bash
root@lab:~/scripts# date
Sun Oct 25 09:20:15 UTC 2026
root@lab:~/scripts# cat /var/log/health-report.txt
Health check on lab at 2026-10-25 09:20:01
STATUS CHECK                DETAIL
OK     disk /               5% used
OK     disk /root/scripts   61% used
OK     memory               92% available (7269 MiB)
OK     load                 0.31 on 8 CPUs (3%)
OK     process sleep        1 running
OK     process cron         2 running
root@lab:~/scripts# cat /var/log/health-alerts.log
cat: /var/log/health-alerts.log: No such file or directory
```

Every check is OK, because `cron` and `sleep` are both running. There are two `cron` processes: the daemon, and the copy of it that is running this job. Stop the `sleep` and wait another minute:

```bash
root@lab:~/scripts# pkill -x sleep
[1]+  Terminated              sleep infinity
root@lab:~/scripts# cat /var/log/health-report.txt
Health check on lab at 2026-10-25 09:21:01
STATUS CHECK                DETAIL
OK     disk /               5% used
OK     disk /root/scripts   61% used
OK     memory               92% available (7280 MiB)
OK     load                 0.63 on 8 CPUs (7%)
FAIL   process sleep        not running
OK     process cron         2 running
root@lab:~/scripts# cat /var/log/health-alerts.log
exit 2 at Sun Oct 25 09:21:01 UTC 2026
```

The alert log shows exit 2, a failure. Now run `crontab -e` again and delete the every-minute line.

</details>

## Check it works

The script is clean and has a usage message:

```bash
root@lab:~/scripts# shellcheck health-check.sh && echo "no warnings"
no warnings
root@lab:~/scripts# ./health-check.sh -h
Usage: health-check.sh [-c FILE] [-s KEY=VALUE]... [-d MOUNT]... [-p NAME]... [-o FILE]
  -c FILE       read settings from FILE (KEY=VALUE lines)
  -s KEY=VALUE  set one setting, overriding the config file
  -d MOUNT      check disk use of MOUNT (repeatable, default /)
  -p NAME       check that a process called NAME is running (repeatable)
  -o FILE       also write the report to FILE
  -h            show this help
Keys: DISK_WARN DISK_FAIL MEM_WARN MEM_FAIL LOAD_WARN LOAD_FAIL MOUNTS PROCESSES
```

All OK exits 0:

```bash
root@lab:~/scripts# ./health-check.sh -p sleep; echo "exit $?"
STATUS CHECK                DETAIL
OK     disk /               5% used
OK     memory               92% available (7223 MiB)
OK     load                 0.17 on 8 CPUs (2%)
OK     process sleep        1 running
exit 0
```

A warning exits 1, and the report file matches the screen:

```bash
root@lab:~/scripts# ./health-check.sh -c health.conf -s DISK_WARN=1 -p sleep -o /tmp/report.txt; echo "exit $?"
STATUS CHECK                DETAIL
WARN   disk /               5% used
WARN   disk /root/scripts   61% used
OK     memory               92% available (7221 MiB)
OK     load                 0.17 on 8 CPUs (2%)
OK     process sleep        1 running
2026-10-25 09:17:31 health-check.sh: report written to /tmp/report.txt
exit 1
root@lab:~/scripts# cat /tmp/report.txt
Health check on lab at 2026-10-25 09:17:31
STATUS CHECK                DETAIL
WARN   disk /               5% used
WARN   disk /root/scripts   61% used
OK     memory               92% available (7221 MiB)
OK     load                 0.17 on 8 CPUs (2%)
OK     process sleep        1 running
```

A failure exits 2:

```bash
root@lab:~/scripts# ./health-check.sh -d / -d /root/scripts -p sleep -p nginx; echo "exit $?"
STATUS CHECK                DETAIL
OK     disk /               5% used
OK     disk /root/scripts   61% used
OK     memory               92% available (7227 MiB)
OK     load                 0.17 on 8 CPUs (2%)
OK     process sleep        1 running
FAIL   process nginx        not running
exit 2
```

A usage error exits 3, with a clear message on standard error:

```bash
root@lab:~/scripts# ./health-check.sh -s DISK_WARN=lots; echo "exit $?"
2026-10-25 09:17:31 health-check.sh: ERROR: DISK_WARN must be a whole number, got 'lots'
exit 3
root@lab:~/scripts# ./health-check.sh -c missing.conf; echo "exit $?"
2026-10-25 09:17:31 health-check.sh: ERROR: cannot read config file missing.conf
exit 3
```

The five-minute entry is installed and the every-minute one is gone:

```bash
root@lab:~/scripts# crontab -l | grep -c health-check
1
```

## Going further

- Add a `-q` option that prints only the WARN and FAIL lines, for a quieter cron mail.
- Add a check that a URL answers with `curl -fsS --max-time 5`, graded FAIL when it does not.
- Write the report as JSON with `printf` as well, so another program can read it without parsing the table.

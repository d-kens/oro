Servers do a lot of work when nobody is watching. Backups run at night, old logs are cleaned up, certificates are renewed, and reports are sent every Monday. On Linux the classic tool for this is **cron**, and newer systems also use **systemd timers**. Setting up a job is quick. Making sure it really ran is the part that needs care.

By the end you can write a cron schedule, add and list your scheduled jobs, save what a job prints to a log, recognise a systemd timer, and check whether a job ran and why it failed.

## cron and the crontab

**cron** is a service that wakes up once a minute, reads a list of jobs, and starts the ones whose time has come. Each user has their own list, called a **crontab** (*cron table*).

The Docker image does not include cron, and a container does not start services on its own. Install it and start it by hand:

```bash
$ apt update && apt install -y cron
$ service cron start
 * Starting periodic command scheduler cron
   ...done.
$ service cron status
 * cron is running
```

On a real server cron is already installed and runs all the time under systemd, as the *Services with systemd* topic showed: `systemctl status cron`. On Red Hat-based systems the service is called `crond`.

You manage your crontab with the `crontab` command:

| Command | What it does |
| --- | --- |
| `crontab -l` | List your jobs |
| `crontab -e` | Edit your jobs in your editor |
| `crontab -r` | Delete all your jobs, without asking |
| `sudo crontab -u sam -l` | List another user's jobs |

```bash
$ crontab -l
no crontab for root
```

`crontab -e` opens the file in the editor named by `EDITOR`, or in `nano`. The Docker image has no editor, so install one first with `apt install -y nano`. When you save and close, `crontab` checks the file and installs it. Do not edit the files under `/var/spool/cron/` directly; always go through `crontab`. Be careful with `-r`: it sits next to `-e` on the keyboard.

Besides personal crontabs there are system-wide ones: `/etc/crontab` and the files in `/etc/cron.d/`. Their lines have an extra field, the user to run the job as. Scripts dropped into `/etc/cron.daily/`, `/etc/cron.weekly/` and similar directories run once a day or once a week.

## The schedule

Each line of a crontab is one job: five time fields, then the command.

```text
┌───────── minute (0-59)
│ ┌─────── hour (0-23)
│ │ ┌───── day of the month (1-31)
│ │ │ ┌─── month (1-12)
│ │ │ │ ┌─ day of the week (0-7, where 0 and 7 are Sunday)
│ │ │ │ │
30 2 * * * /usr/local/bin/backup.sh
```

A `*` means "every". The job runs when all the fields match the current time. Within a field:

- `1,15` is a list: the 1st and the 15th.
- `1-5` is a range: Monday to Friday in the day-of-week field.
- `*/10` is a step: every 10th value, so every 10 minutes in the minute field.

| Schedule | Runs |
| --- | --- |
| `* * * * *` | Every minute |
| `*/5 * * * *` | Every 5 minutes |
| `0 * * * *` | At the start of every hour |
| `30 2 * * *` | Every day at 02:30 |
| `0 9 * * 1-5` | At 09:00, Monday to Friday |
| `0 0 1 * *` | At midnight on the 1st of each month |
| `15 3 * * 0` | At 03:15 every Sunday |
| `@reboot` | Once, when cron starts after a boot |

Times are in the server's time zone, which on cloud servers is usually UTC. Check with `date`. Two common mistakes: `* 2 * * *` runs every minute from 02:00 to 02:59, not once, and the minute comes **before** the hour.

## The job's environment and its output

Cron does not run your job the way your terminal would. It starts it with `/bin/sh`, from your home directory, with very few environment variables, and without reading `~/.bashrc` or `~/.profile`. The *Your shell* topic explains those files. In practice:

- Use **full paths** for scripts and files: `/root/bin/report.sh`, not `report.sh` or `~/bin/report.sh`.
- Do not count on variables or aliases from your startup files. Set what the job needs in the script.
- A `%` in a crontab line has a special meaning: it ends the command. Write it as `\%`, for example `date +\%F`, or move the command into a script.

Anything a job prints has nowhere to go. Cron tries to email it to the user, and on most servers there is no mail set up, so it is lost. Send it to a log file instead, and include errors with `2>&1`:

```text
30 2 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1
```

`>>` adds to the file each time instead of replacing it, and `2>&1` sends error messages to the same place as normal output. The *Pipes and text* topic explains both. Without `2>&1`, the one message you need when a job fails is the one you lose.

## Checking that a job ran

A job that is in the crontab is not a job that works. Check three things.

**Did cron start it?** On Ubuntu, cron records every job it starts in the system log:

```bash
$ grep CRON /var/log/syslog | tail -3
Oct 24 02:30:01 web-01 CRON[41822]: (root) CMD (/usr/local/bin/backup.sh >> /var/log/backup.log 2>&1)
$ journalctl -u cron --since today
```

The Docker container has no system log, so these work on a real server only.

**What did it print?** Read the log file you sent its output to, with `tail`. If the job failed, the error is there:

```text
/bin/sh: 1: backup.sh: not found
```

That message means a missing full path.

**Did it do its job?** Check the result itself: the backup file exists and has today's date, the old logs are gone. Make your scripts print a line with the date when they start and finish, so the log answers this for you.

To test a job without waiting for its time, run exactly the command from the crontab line in your shell. If it works there but not under cron, the difference is almost always `PATH`, a variable, or the working directory. Setting a temporary `* * * * *` copy of the job and watching its log for two minutes shows you how it behaves under cron.

## systemd timers

On systems with systemd, a **timer** is the other way to schedule work. A timer is a unit file that starts a service unit on a schedule. A daily backup takes two files:

```ini
# /etc/systemd/system/backup.service
[Unit]
Description=Nightly backup

[Service]
Type=oneshot
ExecStart=/usr/local/bin/backup.sh
```

```ini
# /etc/systemd/system/backup.timer
[Unit]
Description=Run the backup every night

[Timer]
OnCalendar=*-*-* 02:30:00
Persistent=true

[Install]
WantedBy=timers.target
```

You start it with `systemctl enable --now backup.timer`. `Persistent=true` means a run missed while the machine was off happens at the next boot, which cron does not do. The job's output goes to the journal automatically, so `journalctl -u backup.service` shows every run without any redirection. `systemctl list-timers` lists all timers with their last and next run:

```bash
$ systemctl list-timers
NEXT                        LEFT     LAST                        PASSED  UNIT                ACTIVATES
Sun 2026-10-25 02:30:00 UTC 15h left Sat 2026-10-24 02:30:01 UTC 8h ago  backup.timer        backup.service
Sun 2026-10-25 00:00:00 UTC 13h left Sat 2026-10-24 00:00:01 UTC 10h ago logrotate.timer     logrotate.service
```

Use cron for a quick job and because you will find it on every server. Use a timer when you want the job's logs in the journal, missed runs caught up, or the job managed like any other service. systemd does not run in the Docker container, so timers are for a real machine.

## Tasks

Do these in your Linux shell.

### Task 1: A job every minute

Install and start cron. Create a script `/root/bin/report.sh` that prints the date and the line for `/` from `df -h`, and make it executable. Schedule it to run every minute, with its output and errors added to `/root/report.log`. After two minutes, check the log. To add the line without an editor, you can use `echo '…' | crontab -`, which replaces your crontab with what you pipe in.

<details>
<summary>Check your work</summary>

```bash
$ apt update && apt install -y cron
$ service cron start
$ mkdir -p /root/bin
$ printf '#!/bin/bash\necho "$(date) disk: $(df -h / | tail -1)"\n' > /root/bin/report.sh
$ chmod +x /root/bin/report.sh
$ /root/bin/report.sh
Sat Oct 24 11:19:42 UTC 2026 disk: overlay          59G   17G   40G  30% /
$ echo '* * * * * /root/bin/report.sh >> /root/report.log 2>&1' | crontab -
$ crontab -l
* * * * * /root/bin/report.sh >> /root/report.log 2>&1
```

Two minutes later:

```bash
$ cat /root/report.log
Sat Oct 24 11:20:01 UTC 2026 disk: overlay          59G   17G   40G  30% /
Sat Oct 24 11:21:01 UTC 2026 disk: overlay          59G   17G   40G  30% /
```

Each line comes a few seconds after the start of a minute. If the log never appears, check that cron is running with `service cron status`; it stops when the container stops.

</details>

### Task 2: Find out why a job fails

Add a second job that runs every minute, calls the script without its path, and logs to `/root/broken.log`. Keep the first job. Wait for it to run, find the error, and fix the line. Then remove both jobs.

<details>
<summary>Check your work</summary>

`crontab -` replaces the whole crontab, so list the old line together with the new one:

```bash
$ ( crontab -l; echo '* * * * * report.sh >> /root/broken.log 2>&1' ) | crontab -
$ crontab -l
* * * * * /root/bin/report.sh >> /root/report.log 2>&1
* * * * * report.sh >> /root/broken.log 2>&1
```

A minute later:

```bash
$ cat /root/broken.log
/bin/sh: 1: report.sh: not found
```

`/root/bin` is not in cron's `PATH`, so the shell cannot find `report.sh`. Fix it by using `/root/bin/report.sh` in the line, with `crontab -e` or another `crontab -`. `crontab -r` then removes both jobs. Without `2>&1`, `broken.log` would be empty and you would see no error at all.

</details>

## Quiz

**1. Write the schedule for a job that runs at 06:15 on weekdays.**

<details>
<summary>Show answer</summary>

`15 6 * * 1-5`. The minute comes first, then the hour; `1-5` in the last field is Monday to Friday.

</details>

**2. What is wrong with the schedule `* 3 * * *` for a nightly cleanup?**

<details>
<summary>Show answer</summary>

It runs every minute between 03:00 and 03:59, 60 times. For once a night, use `0 3 * * *`.

</details>

**3. You are on a server and a backup script works when you run it, but the cron job that calls it produces no backups. What do you check, in order?**

<details>
<summary>Show answer</summary>

Check that cron started it, with `grep CRON /var/log/syslog` or `journalctl -u cron`. Then read the job's log; if the crontab line has no `>> file 2>&1`, add it so you can see the error. The usual causes are a command without a full path, a variable set only in your `~/.bashrc`, a relative path that depends on the current directory, or an unescaped `%`.

</details>

**4. Name two things a systemd timer gives you that a cron job does not.**

<details>
<summary>Show answer</summary>

Its output goes to the journal automatically, readable with `journalctl -u` on the service. With `Persistent=true`, a run missed while the machine was off happens at the next start. `systemctl list-timers` also shows when each one last ran and runs next.

</details>

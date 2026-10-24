A **service** is a program that runs in the background with no terminal attached: a web server, a database, the SSH server you log in through. It has to start when the machine boots, come back if it crashes, and keep a log you can read later. On almost every current Linux distribution, **systemd** does all three.

By the end you can check, start, stop, restart and enable a service, read its logs with `journalctl`, and write a unit file that turns your own script into a service.

## Where to practise this topic

systemd does not run in a plain Docker container. A container starts only the one program you asked for, here your shell, and that program is PID 1 instead of systemd. In the container `systemctl` is either missing or refuses to work:

```text
System has not been booted with systemd as init system (PID 1). Can't operate.
Failed to connect to bus: Host is down
```

For this topic, use a full Linux machine:

- **Windows.** Use WSL. Current Ubuntu on WSL runs systemd by default.
- **macOS.** Use a Multipass virtual machine:

  ```bash
  $ multipass launch --name lab
  $ multipass shell lab
  ```

- **Linux.** Use your own machine.

There you are an ordinary user, so the commands that change the system start with `sudo`, which the *Users and permissions* topic explains. On Multipass the user is called `ubuntu` and `sudo` does not ask for a password; on WSL it asks for the password you chose when you set it up.

## Units and systemctl

systemd is PID 1 on a normal machine. It starts everything else, and it manages each thing through a **unit**, described in a small text file. Units come in several types; a service unit's name ends in `.service`. You talk to systemd with `systemctl`.

`systemctl status` is the first thing to run when a service misbehaves. The `cron` service, which runs scheduled jobs, is on every Ubuntu machine:

```bash
$ systemctl status cron
● cron.service - Regular background program processing daemon
     Loaded: loaded (/usr/lib/systemd/system/cron.service; enabled; preset: enabled)
     Active: active (running) since Sat 2026-10-24 11:27:51 UTC; 2h 5min ago
       Docs: man:cron(8)
   Main PID: 356 (cron)
      Tasks: 1 (limit: 9396)
     Memory: 616.0K (peak: 1.5M)
        CPU: 3ms
     CGroup: /system.slice/cron.service
             └─356 /usr/sbin/cron -f -P

Oct 24 11:27:51 lab systemd[1]: Started cron.service - Regular background program processing daemon.
Oct 24 11:27:51 lab cron[356]: (CRON) INFO (pidfile fd = 3)
```

The lines that matter most:

| Line | What it tells you |
| --- | --- |
| `Loaded` | Where the unit file is, and whether the service is **enabled** to start at boot |
| `Active` | Whether it is running now, and since when |
| `Main PID` | The process systemd is watching |
| The last lines | The most recent log lines from the service |

If the output is longer than the screen, it opens in a reader; press <kbd>q</kbd> to leave. Status does not need `sudo`.

## Start, stop, restart and enable

Two separate questions: is the service running **now**, and will it start at **boot**? `start` and `stop` answer the first. `enable` and `disable` answer the second.

| Command | What it does |
| --- | --- |
| `sudo systemctl start cron` | Start it now |
| `sudo systemctl stop cron` | Stop it now |
| `sudo systemctl restart cron` | Stop it and start it again, for example after a config change |
| `sudo systemctl reload cron` | Ask it to reread its config without stopping, if the service supports it |
| `sudo systemctl enable cron` | Start it at every boot |
| `sudo systemctl disable cron` | Do not start it at boot |
| `sudo systemctl enable --now cron` | Enable and start in one go |
| `systemctl is-active cron` | Print `active` or `inactive` |
| `systemctl is-enabled cron` | Print `enabled` or `disabled` |

```bash
$ sudo systemctl stop cron
$ systemctl is-active cron
inactive
$ systemctl is-enabled cron
enabled
$ sudo systemctl start cron
$ systemctl is-active cron
active
```

A stopped service can still be enabled, and a running one can be disabled. A service that was started by hand but never enabled runs fine until the next reboot, then stays off.

To see every running service:

```bash
$ systemctl list-units --type=service --state=running
```

## Reading logs with journalctl

systemd collects everything a service prints into the **journal**. `journalctl` reads it, and `-u` picks one unit:

```bash
$ journalctl -u cron
Oct 24 11:27:51 lab systemd[1]: Started cron.service - Regular background program processing daemon.
Oct 24 11:27:51 lab cron[356]: (CRON) INFO (pidfile fd = 3)
Oct 24 11:27:51 lab cron[356]: (CRON) INFO (Skipping @reboot jobs -- not system startup)
```

Each line has a time, the machine, the program with its PID in brackets, and the message. Useful options:

| Option | What it does |
| --- | --- |
| `-n 20` | Only the last 20 lines |
| `-f` | Keep following new lines as they arrive; <kbd>Ctrl</kbd>+<kbd>C</kbd> to stop |
| `--since "10 minutes ago"` | Only lines after that time |
| `-b` | Only lines since the last boot |
| `-p err` | Only errors and worse |
| `--no-pager` | Print straight to the terminal instead of opening a reader |

If `journalctl` shows nothing, or warns that you are not seeing messages from other users, run it with `sudo`.

## Writing a unit file

Packages install their unit files under `/usr/lib/systemd/system`. Your own go in `/etc/systemd/system`, which also takes priority. Say you have a script at `/usr/local/bin/clock.sh`. This unit, saved as `/etc/systemd/system/clock.service`, makes it a service called `clock`:

```text
[Unit]
Description=Write the date to a file every five seconds

[Service]
ExecStart=/usr/local/bin/clock.sh
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

| Line | Meaning |
| --- | --- |
| `Description` | The name shown in `status` and in the logs |
| `ExecStart` | The command to run, with its full path. It must keep running; when it exits, systemd counts the service as stopped. |
| `Restart=on-failure` | Start it again if it crashes or is killed, but not after a clean `systemctl stop` |
| `WantedBy=multi-user.target` | What `enable` hooks it into: the normal state of a booted server |

The service runs as root unless you add a `User=` line under `[Service]`.

Two rules catch most people out. The command in `ExecStart` must be executable, or the service fails with `status=203/EXEC`. And after you create or change a unit file, run `sudo systemctl daemon-reload` so systemd reads it again. If you forget, `systemctl` reminds you:

```text
Warning: The unit file, source configuration file or drop-ins of clock.service changed on disk. Run 'systemctl daemon-reload' to reload units.
```

`systemd-analyze verify` checks a unit file for mistakes. It prints nothing if the file is fine:

```bash
$ systemd-analyze verify /etc/systemd/system/clock.service
$ sudo chmod -x /usr/local/bin/clock.sh
$ systemd-analyze verify /etc/systemd/system/clock.service
clock.service: Command /usr/local/bin/clock.sh is not executable: Permission denied
```

## Tasks

Do these on your WSL, Multipass or Linux machine, not in the Docker container.

### Task 1: Turn a script into a service

Write the script `/usr/local/bin/clock.sh` below with `sudo nano`, and make it executable. Then write the `clock.service` unit from above, load it, enable and start it, and check that it is running, that `/var/log/clock.log` is growing and that the journal has its messages.

```bash
#!/bin/bash
# Write the date to a file every five seconds, forever.
while true; do
  date >> /var/log/clock.log
  echo "wrote the time"
  sleep 5
done
```

<details>
<summary>Check your work</summary>

```bash
$ sudo nano /usr/local/bin/clock.sh
$ sudo chmod +x /usr/local/bin/clock.sh
$ sudo nano /etc/systemd/system/clock.service
$ systemd-analyze verify /etc/systemd/system/clock.service
$ sudo systemctl daemon-reload
$ sudo systemctl enable --now clock
Created symlink /etc/systemd/system/multi-user.target.wants/clock.service → /etc/systemd/system/clock.service.
$ systemctl status clock
● clock.service - Write the date to a file every five seconds
     Loaded: loaded (/etc/systemd/system/clock.service; enabled; preset: enabled)
     Active: active (running) since Sat 2026-10-24 11:27:52 UTC; 11s ago
   Main PID: 400 (clock.sh)
      Tasks: 2 (limit: 9396)
     Memory: 524.0K (peak: 1.2M)
        CPU: 14ms
     CGroup: /system.slice/clock.service
             ├─400 /bin/bash /usr/local/bin/clock.sh
             └─407 sleep 5

Oct 24 11:27:52 lab systemd[1]: Started clock.service - Write the date to a file every five seconds.
Oct 24 11:27:52 lab clock.sh[400]: wrote the time
Oct 24 11:27:57 lab clock.sh[400]: wrote the time
Oct 24 11:28:02 lab clock.sh[400]: wrote the time
$ tail -n 3 /var/log/clock.log
Sat Oct 24 11:27:52 UTC 2026
Sat Oct 24 11:27:57 UTC 2026
Sat Oct 24 11:28:02 UTC 2026
$ journalctl -u clock -n 2
Oct 24 11:27:57 lab clock.sh[400]: wrote the time
Oct 24 11:28:02 lab clock.sh[400]: wrote the time
```

The `date` lines go to the file; the `echo` lines go to the journal. If `status` shows `failed` with `status=203/EXEC`, the script is not executable or the path in `ExecStart` is wrong. If `systemctl` says `Unit clock.service not found`, check the file name and run `daemon-reload`.

</details>

### Task 2: Watch it come back, then switch it off

Kill the service's main process with `kill -9` and use the journal to show that systemd started it again. Then stop and disable the service, and confirm it is neither running nor enabled.

<details>
<summary>Check your work</summary>

Take the PID from the `Main PID` line of `systemctl status clock`:

```bash
$ sudo kill -9 400
$ journalctl -u clock -n 5
Oct 24 11:28:10 lab systemd[1]: clock.service: Main process exited, code=killed, status=9/KILL
Oct 24 11:28:10 lab systemd[1]: clock.service: Failed with result 'signal'.
Oct 24 11:28:10 lab systemd[1]: clock.service: Scheduled restart job, restart counter is at 1.
Oct 24 11:28:10 lab systemd[1]: Started clock.service - Write the date to a file every five seconds.
Oct 24 11:28:10 lab clock.sh[424]: wrote the time
$ sudo systemctl disable --now clock
Removed "/etc/systemd/system/multi-user.target.wants/clock.service".
$ systemctl is-active clock
inactive
$ systemctl is-enabled clock
disabled
```

The new process has a new PID, 424 here. `Restart=on-failure` brought it back because it was killed. `systemctl stop` does not trigger a restart, which is why stopping it works. If you only `stop` the service and forget `disable`, it starts again at the next boot.

</details>

## Quiz

**1. You are on web-01. Yesterday you installed a service and ran `sudo systemctl start app`. After this morning's reboot it is not running. What did you miss, and how do you fix it?**

<details>
<summary>Show answer</summary>

The service was started but never enabled, so systemd did not start it at boot. Run `sudo systemctl enable --now app` to start it now and at every boot.

</details>

**2. You changed `ExecStart` in a unit file and restarted the service, but it still runs the old command. Why?**

<details>
<summary>Show answer</summary>

systemd still has the old version of the unit file loaded. Run `sudo systemctl daemon-reload`, then restart the service.

</details>

**3. `systemctl status app` shows `failed` and `status=203/EXEC`. What do you check?**

<details>
<summary>Show answer</summary>

systemd could not run the command in `ExecStart`. Check that the path is complete and correct, and that the file is executable, for example with `ls -l` on it. `systemd-analyze verify` on the unit file reports both problems.

</details>

**4. How do you see the last 50 log lines of the service `app` and keep watching for new ones?**

<details>
<summary>Show answer</summary>

`journalctl -u app -n 50 -f`. Press <kbd>Ctrl</kbd>+<kbd>C</kbd> to stop following.

</details>

When a new server arrives, someone has to make it ready for the people and programs that will use it. In this project you do that for a small web team: you create their accounts, give them a shared directory that only they can use, run their web site as a service that starts on boot, and let one person restart it without handing them full control of the machine.

It uses the *Users and permissions* topic most, along with *Services with systemd*, *Installing software*, *Editing files* and *Processes*.

**This project needs a real Linux machine or a virtual machine**, because it uses systemd to start the service on boot, and a plain Docker container does not run systemd. Use one of these:

- **Windows:** Ubuntu in WSL. Recent versions run systemd by default. Check with `ps -p 1 -o comm=`, which should print `systemd`.
- **macOS:** a Multipass VM. Run `multipass launch --name lab`, then `multipass shell lab`.
- **Linux:** your own machine, or a VM on it, if you are happy to add users to it.

The user and directory parts also work in the Docker container from earlier topics, if you want to practise them first.

## What you need

A shell on the machine as a user who can run `sudo`. On Multipass that is the `ubuntu` user you are logged in as. The commands below start with `$ sudo` for that reason.

Make sure the packages are up to date and install the two tools the project uses: `python3`, to serve the web site, and `curl`, to test it. Both are often installed already, in which case `apt` says so.

```bash
$ sudo apt update
$ sudo apt install -y python3 curl
```

## The brief

1. There is a group `webteam`. The users `sam` and `priya` are in it, each with a home directory and Bash as their shell. A third user, `alex`, exists but is not in the team. Check: `id sam`, `id priya` and `id alex`.
2. There is a directory `/srv/webteam`, owned by `root` and the group `webteam`, that team members can read and write and nobody else can open. New files created inside it belong to the `webteam` group whoever creates them. Check: `ls -ld /srv/webteam` shows `drwxrws---` with owner `root` and group `webteam`, and a file `sam` creates there has group `webteam`.
3. `priya` can read and change a file that `sam` created in the directory. `alex` cannot list the directory. Check: try both as each user.
4. A web site in `/srv/webteam/site` is served on port 8080 by a systemd service called `team-site`, running as a system user `website` with no login shell. Check: `curl http://127.0.0.1:8080/` returns the page, and `ps` shows the process owned by `website`.
5. The service starts on boot. Check: `systemctl is-enabled team-site` prints `enabled`, and after a reboot the page is still served without you starting anything.
6. `sam` can restart the service and see its status with `sudo`, and cannot run anything else as root. Check: `sudo -l -U sam` lists exactly those two commands, and `sudo systemctl stop team-site` as `sam` is refused.

## Steps

### Create the users and the group

Create the group first, then the users, adding `sam` and `priya` to the group as you create them. Ask `useradd` to make a home directory and to set the shell to `/bin/bash`; without those options you get no home directory and a basic `sh` shell.

Give `sam` a password, because `sudo` will ask `sam` for one later.

Hint: `useradd -G` sets the extra groups a user belongs to. If you forget it, `usermod -aG webteam USER` adds the group afterwards. Leave out the `a` and `usermod` replaces all the user's extra groups instead of adding one.

<details>
<summary>Show a solution</summary>

```bash
$ sudo groupadd webteam
$ sudo useradd -m -s /bin/bash -G webteam sam
$ sudo useradd -m -s /bin/bash -G webteam priya
$ sudo useradd -m -s /bin/bash alex
$ sudo passwd sam
New password:
Retype new password:
passwd: password updated successfully
$ id sam
uid=1001(sam) gid=1002(sam) groups=1002(sam),1001(webteam)
$ id priya
uid=1002(priya) gid=1003(priya) groups=1003(priya),1001(webteam)
$ id alex
uid=1003(alex) gid=1004(alex) groups=1004(alex)
$ getent group webteam
webteam:x:1001:sam,priya
```

Your numbers may differ. Each user also gets a private group with their own name, which is their primary group.

</details>

### Build the shared directory

Create `/srv/webteam` with a `site` directory inside it. Hand both to `root` as owner and `webteam` as group, then set the permissions.

Think about what each part of the mode must be:

- The owner, `root`, can do anything regardless, so `7` is fine.
- The group needs to list, enter and create files: read, write and execute, `7`.
- Everyone else should not even see inside: `0`.
- On top of that, the **setgid** bit on a directory makes new files and subdirectories inherit the directory's group instead of the creator's primary group. Without it, a file `sam` creates would belong to the group `sam`, and `priya` could not change it. In octal, setgid is a `2` in front of the usual three digits.

Hint: in `ls -l` the setgid bit shows as an `s` in place of the group's `x`.

<details>
<summary>Show a solution</summary>

```bash
$ sudo mkdir -p /srv/webteam/site
$ sudo chown -R root:webteam /srv/webteam
$ sudo chmod 2770 /srv/webteam /srv/webteam/site
$ ls -ld /srv/webteam /srv/webteam/site
drwxrws--- 3 root webteam 4096 Oct 24 11:23 /srv/webteam
drwxrws--- 2 root webteam 4096 Oct 24 11:23 /srv/webteam/site
```

Now test it as the users. `sudo -iu USER` opens a login shell as that user, the same as if they had logged in, and `exit` brings you back.

```bash
$ sudo -iu sam
sam@lab:~$ echo "<h1>Team site</h1>" > /srv/webteam/site/index.html
sam@lab:~$ ls -l /srv/webteam/site
total 4
-rw-rw-r-- 1 sam webteam 19 Oct 24 11:23 index.html
sam@lab:~$ exit
```

The file belongs to the group `webteam`, thanks to setgid. It is also group-writable: Ubuntu gives ordinary users a *umask* of `002` when each has a private group of their own, so new files are `rw-rw-r--` rather than `rw-r--r--`. The `r` for others does not matter here, because no one outside the group can get into the directory to reach the file.

```bash
$ sudo -iu priya
priya@lab:~$ echo "<p>Edited by priya</p>" >> /srv/webteam/site/index.html
priya@lab:~$ cat /srv/webteam/site/index.html
<h1>Team site</h1>
<p>Edited by priya</p>
priya@lab:~$ exit
$ sudo -iu alex
alex@lab:~$ ls /srv/webteam
ls: cannot open directory '/srv/webteam': Permission denied
alex@lab:~$ exit
```

Group membership is read when a user logs in. If you add a user to a group while they are logged in, they need to log out and in again before it applies.

</details>

### Run the site as a service

The site needs a program to serve it. Python includes a small web server, `python3 -m http.server`, which serves the files in a directory. It is fine for a lab; a real site would use a server such as nginx.

Do not run it as root, and not as `sam` either: if the program were ever broken into, the attacker would get that account's rights. Create a **system user** for it instead. A system user has a low user ID, no home directory and no login shell, so no one can log in as it. Add it to `webteam` so it can read the site.

Then write a unit file in `/etc/systemd/system/team-site.service`. It needs three sections:

- `[Unit]` with a description, and an instruction to start after the network is up.
- `[Service]` with the user and group to run as, the full command to run, and a rule to restart the program if it fails.
- `[Install]` saying which target pulls the service in at boot. For a server, that is `multi-user.target`.

Bind the server to `127.0.0.1` so only this machine can reach it. After writing the file, tell systemd to reload its configuration, then enable and start the service in one command.

Hint: systemd does not search your `PATH`, so give the full path to `python3`. `command -v python3` prints it.

<details>
<summary>Show a solution</summary>

```bash
$ sudo useradd --system --no-create-home --shell /usr/sbin/nologin -G webteam website
$ id website
uid=999(website) gid=999(website) groups=999(website),1001(webteam)
$ command -v python3
/usr/bin/python3
$ sudo nano /etc/systemd/system/team-site.service
```

```ini
[Unit]
Description=Team web site
After=network.target

[Service]
User=website
Group=webteam
ExecStart=/usr/bin/python3 -m http.server 8080 --bind 127.0.0.1 --directory /srv/webteam/site
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
$ sudo systemd-analyze verify /etc/systemd/system/team-site.service
$ sudo systemctl daemon-reload
$ sudo systemctl enable --now team-site
Created symlink /etc/systemd/system/multi-user.target.wants/team-site.service → /etc/systemd/system/team-site.service.
$ curl http://127.0.0.1:8080/
<h1>Team site</h1>
<p>Edited by priya</p>
```

`systemd-analyze verify` prints nothing when the unit file is valid. `enable` creates the link that makes the service start at boot, and `--now` also starts it straight away.

`Group=webteam` makes `webteam` the process's main group. That is enough to read the site, so adding `website` to the group with `-G` is not strictly needed for the service. It does make the intent clear when someone runs `id website` later.

If `curl` fails, read what the service said with `sudo journalctl -u team-site`.

</details>

### Give sam a narrow sudo rule

`sam` looks after the site and needs to restart it after changing the configuration. Adding `sam` to the `sudo` group would allow that, but it would also allow everything else. Write a rule that allows only `systemctl restart team-site` and `systemctl status team-site`.

Put the rule in its own file in `/etc/sudoers.d/` and always edit it with `visudo`. `visudo` checks the syntax before saving. A broken sudoers file can lock everyone out of `sudo`, and on a server without another way in, that is hard to fix.

A sudoers rule reads: *who*, *on which hosts*, *as which user*, *which commands*. Commands need their full paths.

<details>
<summary>Show a solution</summary>

```bash
$ sudo visudo -f /etc/sudoers.d/sam
```

Add this single line, then save and exit:

```text
sam ALL=(root) /usr/bin/systemctl restart team-site, /usr/bin/systemctl status team-site
```

Check the file and list what `sam` may run:

```bash
$ sudo visudo -cf /etc/sudoers.d/sam
/etc/sudoers.d/sam: parsed OK
$ sudo -l -U sam
...
User sam may run the following commands on lab:
    (root) /usr/bin/systemctl restart team-site, /usr/bin/systemctl status team-site
```

Now try it as `sam`. `sudo` asks for `sam`'s own password, not root's:

```bash
$ sudo -iu sam
sam@lab:~$ sudo systemctl restart team-site
[sudo] password for sam:
sam@lab:~$ sudo systemctl stop team-site
Sorry, user sam is not allowed to execute '/usr/bin/systemctl stop team-site' as root on lab.
sam@lab:~$ sudo apt update
Sorry, user sam is not allowed to execute '/usr/bin/apt update' as root on lab.
sam@lab:~$ exit
```

The rule matches the whole command line, so `restart team-site` is allowed but `restart` of any other service is not.

</details>

### Prove it survives a reboot

A service that only runs because you started it by hand will be gone after the next reboot, often at the worst moment. Restart the machine and check that the site comes back without you doing anything.

<details>
<summary>Show a solution</summary>

On Multipass, reboot from inside the VM, wait a few seconds, and open a new shell:

```bash
$ sudo reboot
```

```bash
multipass shell lab
```

On WSL, close the Ubuntu window, run `wsl --shutdown` in PowerShell, and open Ubuntu again.

Then:

```bash
$ systemctl is-active team-site
active
$ curl http://127.0.0.1:8080/
<h1>Team site</h1>
<p>Edited by priya</p>
```

</details>

## Check it works

Users and group:

```bash
$ getent group webteam
webteam:x:1001:sam,priya,website
$ id -nG alex
alex
```

The shared directory, with setgid and no access for others:

```bash
$ ls -ld /srv/webteam
drwxrws--- 3 root webteam 4096 Oct 24 11:23 /srv/webteam
$ stat -c '%a %U %G' /srv/webteam
2770 root webteam
$ sudo ls -l /srv/webteam/site
total 4
-rw-rw-r-- 1 sam webteam 42 Oct 24 11:24 index.html
$ sudo -u alex ls /srv/webteam
ls: cannot open directory '/srv/webteam': Permission denied
```

The service is enabled, running as `website`, and serving the page:

```bash
$ systemctl is-enabled team-site
enabled
$ systemctl is-active team-site
active
$ ps -o user=,cmd= -C python3
website  /usr/bin/python3 -m http.server 8080 --bind 127.0.0.1 --directory /srv/webteam/site
$ curl -s http://127.0.0.1:8080/
<h1>Team site</h1>
<p>Edited by priya</p>
```

The `website` user cannot log in:

```bash
$ getent passwd website
website:x:999:999::/home/website:/usr/sbin/nologin
```

The home directory is listed but does not exist, which is what `--no-create-home` means. The user ID may differ on your machine; system users get IDs below 1000.

The sudo rule is narrow:

```bash
$ sudo -l -U sam | tail -n 2
User sam may run the following commands on lab:
    (root) /usr/bin/systemctl restart team-site, /usr/bin/systemctl status team-site
```

## Going further

- Add a default ACL with `setfacl -d -m g:webteam:rwX /srv/webteam` so new files are group-writable whatever the creator's umask.
- Replace the Python server with nginx, serving `/srv/webteam/site`, and work out which user nginx must run as to read it.
- Add `ProtectSystem=strict` and `NoNewPrivileges=true` to the unit, check it still works, and read `systemd-analyze security team-site`.

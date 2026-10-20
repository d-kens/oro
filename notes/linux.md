**Linux is an operating system: the base software that runs a computer, like Windows on a laptop or iOS on an iPhone. Most servers on the internet run Linux, so it is the first tool every cloud engineer needs.**

**By the end of this topic you will have a small website running on your own Linux machine. It will start by itself, restart itself if it crashes, and you will know how to find and fix the three most common reasons it breaks.**

This topic answers eight questions, in order. Most of them build up to the final lab:

1. How do I move around and work with files?
2. Who is allowed to do what?
3. What is running on the machine?
4. How do I install software?
5. How do I run something on a schedule?
6. How do I keep a program running all the time?
7. How do I see what a program is saying?
8. How do I find out what is wrong?

Then the lab puts it all together.

## Before you start: get a Linux terminal

You control Linux by typing commands into a **terminal**, a window where you type text instead of clicking. The program inside it that reads your commands is called the **shell**.

Practise on a Linux machine of your own, never on a server someone else depends on. Pick the option for your computer.

### On Windows: WSL

WSL lets you run Linux inside Windows.

1. Right-click the Start button and choose **Terminal (Admin)**, or **Windows PowerShell (Admin)** on Windows 10.
2. Type `wsl --install` and press Enter. This installs Linux (Ubuntu, the most popular version).
3. Restart your computer when it asks.
4. Open **Ubuntu** from the Start menu. The first time, it asks you to choose a username and a password. Remember the password.

Check that it is ready for this topic:

```bash
ps -p 1 -o comm=
```

It should print `systemd`. If it prints `init`, run the command below, then close Ubuntu, run `wsl --shutdown` in the Windows terminal, and open Ubuntu again:

```bash
echo -e "[boot]\nsystemd=true" | sudo tee /etc/wsl.conf
```

**To open a second terminal**, open Ubuntu again from the Start menu.

### On a Mac: Multipass

Multipass runs a small Linux computer inside your Mac, called a **virtual machine**.

1. Download Multipass from [canonical.com/multipass](https://canonical.com/multipass) and install it.
2. Open the **Terminal** app and type:

```bash
multipass launch --name lab 24.04
```

This downloads Ubuntu and creates a virtual machine called `lab`. It takes a few minutes.

3. Connect to it:

```bash
multipass shell lab
```

**To open a second terminal**, open a new Terminal window and run `multipass shell lab` again. When you finish for the day, type `exit`, then `multipass stop lab`.

Multipass also works on Windows and Linux, if you prefer it to WSL.

### Your first look

You now see a line like this, called the **prompt**:

```text
ubuntu@lab:~$
```

It means: you are user `ubuntu`, on machine `lab`, in folder `~` (your home folder), and the `$` says Linux is waiting for a command. Type a command and press Enter.

Three things to know before you start:

- In the code blocks below, text after a `#` is a note for you. You do not need to type it.
- Some commands start with `sudo`, which means "run this as the administrator". It may ask for your password. **Nothing appears on screen while you type a password.** That is normal. Type it and press Enter.
- **To paste into the terminal**, Ctrl+V usually does not work. Use **Ctrl+Shift+V** in Ubuntu's terminal, **right-click** or Ctrl+V in Windows Terminal, and **Cmd+V** on a Mac.

## 1. How do I move around and work with files?

Linux keeps every file in one big tree of folders. The top of the tree is `/`, called the **root**. Your own files live in your **home folder**, `/home/<your username>`, which has the shortcut `~`.

A **path** is the address of a file in the tree, such as `/home/ubuntu/notes.txt`.

Try these commands one at a time:

```bash
pwd                       # where am I? prints your home folder, such as /home/ubuntu
ls                        # what is in this folder?
mkdir practice            # make a folder called practice
cd practice               # go into it
nano notes.txt            # open a text editor on a new file
```

`nano` is a simple text editor that runs inside the terminal. Type a line of text, then press **Ctrl+O** and **Enter** to save, and **Ctrl+X** to exit.

```bash
cat notes.txt             # show what is in the file
cp notes.txt copy.txt     # copy it
ls                        # you see: copy.txt  notes.txt
mv copy.txt old.txt       # rename it (mv means move)
rm old.txt                # delete it
cd ..                     # go back up one folder
```

**`rm` has no recycle bin.** A deleted file is gone for good, so check what you are deleting first.

`cp` and `rm` work on single files. To copy or delete a folder and everything inside it, add `-r`:

```bash
cp -r practice backup     # copy the whole practice folder
rm -r backup              # delete the folder and everything in it: check twice before you press Enter
```

Files and folders whose names start with a dot, such as `.bashrc`, are **hidden**: plain `ls` does not show them. They usually hold settings. `ls -a` shows everything, including hidden ones.

Three shortcuts that save you time:

- Press **Tab** while typing a file or folder name and the shell completes it for you.
- Press the **Up arrow** to bring back your previous commands, so you do not have to type them again.
- To learn about any command, add `--help`, such as `ls --help`. For the full manual, type `man ls` and press **q** to quit.

A few folders you will visit often:

| Folder | What lives there |
| --- | --- |
| `/etc` | Settings files for the system and its programs |
| `/var/log` | Log files: the messages programs write about what they are doing |
| `/home` | Each user's home folder |
| `/opt` | Extra software you add yourself. The lab's website will live here |
| `/tmp` | Temporary files, cleared when the machine restarts |

**Your turn:** inside `practice`, make a folder called `site`, and in it a file called `index.html` that contains the word `Hello`. Then show the file's contents from your home folder, in one command.

<details>
<summary>Show answer</summary>

```bash
cd ~
mkdir practice/site
nano practice/site/index.html      # type Hello, save with Ctrl+O and Enter, exit with Ctrl+X
cat practice/site/index.html       # prints: Hello
```

</details>

## 2. Who is allowed to do what?

### Users and the administrator

Every person, and every program, uses Linux as a **user**. Each file belongs to a user.

One special user, **root**, is the administrator and can do anything. You do not log in as root. Instead you put `sudo` in front of a single command that needs administrator power. Using root as little as possible means one mistake cannot damage the whole machine.

```bash
whoami                    # your username
id                        # your username, and the groups you belong to
```

A **group** is a named set of users who share access to files, such as a `developers` group. `id` lists the groups you belong to.

### Reading permissions

Run `ls -l` in your `practice` folder:

```bash
cd ~/practice
ls -l
```

You see lines like this:

```text
-rw-r--r-- 1 ubuntu ubuntu   6 Oct  4 10:00 notes.txt
drwxr-xr-x 2 ubuntu ubuntu 4096 Oct  4 10:00 site
```

The first column says who can do what. Split it into four parts:

```text
 -    rw-    r--    r--
type  owner  group  everyone else
```

- **Type:** `-` is a file, `d` is a folder (d for directory).
- Then three sets of three letters: what the **owner** can do, what the file's **group** can do, and what **everyone else** can do.
- **r** means read, **w** means write (change), **x** means run it as a program, or, for a folder, go inside it. A `-` means "not allowed".

So `rw-r--r--` means: the owner can read and change it, and everyone else can only read it.

### Changing permissions

`chmod` changes permissions. They are usually written as three numbers, one each for owner, group and everyone else. You only need four:

| Number | Means | Use it for |
| --- | --- | --- |
| `644` | Owner reads and writes, everyone else reads | Normal files |
| `755` | Owner does everything, everyone else reads and enters (a folder) or runs (a program) | Folders and programs |
| `600` | Only the owner can read and write | Secrets, such as keys and passwords |
| `700` | Only the owner can do anything | Private folders |

Try it. `nobody` is a built-in user that owns nothing and has no special rights, which makes it handy for testing:

```bash
echo "my secret" > /tmp/secret.txt     # make a file (> writes text into a file)
chmod 600 /tmp/secret.txt              # only you can read it
sudo -u nobody cat /tmp/secret.txt     # try to read it as the user nobody
```

You see `Permission denied`. Now open it up and try again:

```bash
chmod 644 /tmp/secret.txt
sudo -u nobody cat /tmp/secret.txt     # prints: my secret
```

Permissions say what the owner can do, so it also matters **who** the owner is. `chown` changes it:

```bash
sudo chown nobody /tmp/secret.txt      # nobody now owns the file
ls -l /tmp/secret.txt                  # the owner column now says nobody
```

This is how Linux keeps users and programs apart. In the lab, the website runs as its own user, so it can only reach the files you allow.

**Your turn:** make `notes.txt` readable and writable only by you, then check with `ls -l`.

<details>
<summary>Show answer</summary>

```bash
chmod 600 ~/practice/notes.txt
ls -l ~/practice/notes.txt     # starts with -rw-------
```

</details>

### Logging in to real servers: SSH

You will not need this until you work with real servers, but it belongs with permissions. On a real job, servers are in a data centre, not in front of you. You connect to them with **SSH**, which gives you a terminal on the remote machine. Instead of a password, you usually use an **SSH key**: a pair of files that prove who you are.

```bash
ssh-keygen -t ed25519      # make a key pair; press Enter to accept the defaults
ls -l ~/.ssh               # see the two files it made
```

- `id_ed25519` is your **private key**. It never leaves your computer, and its permissions must be `600`.
- `id_ed25519.pub` is your **public key**. You give it to a server so the server recognises you, then log in with `ssh user@server-address`.

## 3. What is running on the machine?

A running program is called a **process**. Every process has a number, its **PID** (process ID), and belongs to a user.

Start a process that just waits for 300 seconds. The `&` at the end runs it in the background, so you get your prompt back:

```bash
sleep 300 &               # prints something like [1] 4321; 4321 is the PID
pgrep -a sleep            # find processes by name: shows the PID and the command
```

To stop a process, use `kill` with its PID:

```bash
kill 4321                 # use the PID you saw
pgrep -a sleep            # prints nothing: it has stopped
```

`kill` sends the process a **signal**: a short message from Linux. By default it sends **SIGTERM**, a polite request to stop, so the program can finish what it is doing first. If a process ignores that, `kill -9 <PID>` sends **SIGKILL**, which forces it to stop at once. Use `-9` only as a last resort, because the program gets no chance to save its work.

For a program running in front of you, press **Ctrl+C** to stop it.

To see what is busy right now:

```bash
top                       # a live list of processes, busiest at the top; press q to quit
```

**Your turn:** start two `sleep 300 &` processes, find both PIDs, and stop them both.

<details>
<summary>Show answer</summary>

```bash
sleep 300 &
sleep 300 &
pgrep -a sleep            # shows two PIDs
kill 4321 4322            # use your two PIDs; kill accepts several at once
```

</details>

## 4. How do I install software?

Linux installs software with a **package manager**: a tool that downloads programs from a trusted online store, along with anything else they need to run. On Ubuntu it is called `apt`.

Install the tools the rest of this topic uses:

```bash
sudo apt update                          # get the latest list of available software; always do this first
sudo apt install -y curl lsof            # -y answers "yes" to the install question
```

- **curl** fetches a web page and prints it in the terminal. You will use it to test your website.
- **lsof** shows which program is using a file or a network port.

Check that curl works:

```bash
curl --version            # prints the version number
```

To remove a program, use `sudo apt remove <name>`. To update everything installed, use `sudo apt update` then `sudo apt upgrade`. Keeping software up to date is one of the simplest ways to keep a server secure.

Other versions of Linux use a different package manager with the same idea. For example, Fedora and Amazon Linux use `dnf`: `sudo dnf install curl`.

**Your turn:** install `htop`, a friendlier version of `top`. Run it, quit, then uninstall it.

<details>
<summary>Show answer</summary>

```bash
sudo apt install -y htop
htop                      # press q to quit
sudo apt remove -y htop
```

</details>

## 5. How do I run something on a schedule?

**cron** runs commands on a schedule, such as a backup every night. Each user has a list of scheduled jobs called a **crontab**.

Open yours:

```bash
crontab -e
```

The first time, it asks which editor to use. Choose `nano`. Go to the bottom of the file and add this line, then save and exit:

```text
* * * * * date >> /tmp/cron-test.txt
```

This runs `date` (print the date and time) every minute and adds the result to the end of `/tmp/cron-test.txt` (`>>` adds to a file, `>` replaces it). Wait two minutes, then:

```bash
cat /tmp/cron-test.txt                # one line per minute
```

The five `*` fields are the schedule:

```text
*      *      *        *       *
minute hour   day of   month   day of week
0-59   0-23   month    1-12    0-6 (0 is Sunday)
```

A `*` means "every". Some examples:

| Schedule | Means |
| --- | --- |
| `* * * * *` | Every minute |
| `*/5 * * * *` | Every 5 minutes |
| `0 2 * * *` | Every day at 02:00 |
| `30 9 * * 1-5` | 09:30, Monday to Friday |

Two rules that prevent most cron problems:

1. **Use full paths** to programs and files, such as `/home/ubuntu/backup.sh`, not `backup.sh`. cron runs jobs from your home folder, not wherever you happen to be, and only looks for programs in a few standard places.
2. **Send the output to a file**, as above. Otherwise you never see what happened.

**Your turn:** change the job to run every 2 minutes. Then remove it, so it does not keep running.

<details>
<summary>Show answer</summary>

Run `crontab -e` and change the line to `*/2 * * * * date >> /tmp/cron-test.txt`. To remove it, run `crontab -e` again, delete the line, then save and exit. `crontab -l` lists your jobs, so you can check it is gone.

</details>

## 6. How do I keep a program running all the time?

cron runs a program at set times. A website has to run all the time, and that is a different job. This is where you build the website.

### Step 1: run it by hand

Create the website's page:

```bash
sudo mkdir /opt/hello
sudo nano /opt/hello/index.html     # type: Hello from Linux, then save and exit
```

Now start a tiny web server. Python, which comes with Ubuntu, has one built in:

```bash
python3 -m http.server 8080 --directory /opt/hello
```

It prints `Serving HTTP on ... port 8080` and keeps running. **8080** is the **port**: a numbered door on the machine that a network program listens on, so other programs know where to find it.

Open a **second terminal** and fetch the page:

```bash
curl http://localhost:8080          # prints: Hello from Linux
```

`localhost` means "this machine".

Go back to the first terminal and press **Ctrl+C**. The server stops, and the website is gone. It would also stop if you closed the terminal or restarted the machine. A real website must keep running without anyone watching it. That is the job of **systemd**.

### Step 2: let systemd run it

**systemd** is the program that starts everything when Linux boots up, and then looks after programs that run in the background, called **services**. It starts them, restarts them if they crash, and keeps their logs.

First, create a user just for the website. It is a user for a program, not a person, so it gets no home folder and cannot log in:

```bash
sudo useradd --system --no-create-home --shell /usr/sbin/nologin hello
```

Next, describe the service in a **unit file**, systemd's name for a small settings file:

```bash
sudo nano /etc/systemd/system/hello.service
```

Type or paste this, then save and exit:

```ini
[Unit]
Description=Hello website

[Service]
User=hello
ExecStart=/usr/bin/python3 -m http.server 8080 --directory /opt/hello
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

| Line | What it means |
| --- | --- |
| `Description=` | A name for humans |
| `User=hello` | Run as the `hello` user, not as root |
| `ExecStart=` | The command to run, with the program's full path |
| `Restart=always` | If it stops for any reason, start it again |
| `RestartSec=3` | Wait 3 seconds before restarting |
| `WantedBy=multi-user.target` | Start it automatically when the machine boots |

To find a program's full path, use `which`:

```bash
which python3                         # prints: /usr/bin/python3
```

Now tell systemd about it and start it:

```bash
sudo systemctl daemon-reload          # make systemd re-read its unit files
sudo systemctl enable --now hello     # start at every boot (enable), and start it now (--now)
systemctl status hello                # check on it
```

`systemctl status` shows **active (running)** in green, the **Main PID**, and the last few lines the service printed. Press **q** if it does not return you to the prompt.

```bash
curl http://localhost:8080            # prints: Hello from Linux
```

### Step 3: prove systemd looks after it

Kill the website's process, as if it had crashed:

```bash
systemctl status hello                # note the Main PID
sudo kill <Main PID>                  # use the number you saw
sleep 4                               # wait for the 3-second restart
systemctl status hello                # active (running) again, with a new PID
```

systemd noticed the process had gone and started a new one.

### Step 4: prove it starts at boot

Restart the whole Linux machine, then check the website without starting anything yourself.

- **Multipass:** type `exit`, then run `multipass restart lab` and `multipass shell lab`.
- **WSL:** close Ubuntu, run `wsl --shutdown` in a Windows terminal, then open Ubuntu again.

```bash
systemctl status hello                # active (running), started at boot
curl http://localhost:8080            # Hello from Linux
```

This works because you ran `enable`.

The commands you will use most:

| Task | Command |
| --- | --- |
| Is it running, and if not, why? | `systemctl status hello` |
| Stop it, start it, restart it | `sudo systemctl stop hello`, `start`, `restart` |
| Start or stop starting at boot | `sudo systemctl enable hello`, `disable` |
| After editing a unit file | `sudo systemctl daemon-reload` |

**Your turn:** stop the website. Check that `systemctl status` says **inactive** and that `curl` fails. Then start it again.

<details>
<summary>Show answer</summary>

```bash
sudo systemctl stop hello
systemctl status hello                # inactive (dead)
curl http://localhost:8080            # curl: (7) Failed to connect ...
sudo systemctl start hello
curl http://localhost:8080            # works again
```

</details>

## 7. How do I see what a program is saying?

Programs write messages about what they are doing, called **logs**. systemd collects the logs of every service it runs. Read them with `journalctl`:

```bash
journalctl -u hello                   # all logs for the hello service (-u means unit); press q to quit
journalctl -u hello -n 20             # only the last 20 lines
journalctl -u hello --since "10 min ago"
```

If it says you are not allowed to see the messages, put `sudo` in front.

The most useful one is **follow** mode, which shows new lines as they arrive. Run it in your first terminal:

```bash
journalctl -u hello -f                # Ctrl+C to stop following
```

Then, in your second terminal, run `curl http://localhost:8080` a few times. Each request appears in the first terminal as a line like:

```text
"GET / HTTP/1.1" 200 -
```

`200` means the request worked. When something goes wrong, the answer is almost always in the logs.

Some programs write their own log files in `/var/log` instead. These files are often too long for `cat`, so use these:

```bash
less /var/log/dpkg.log                # scroll with the arrow keys, q to quit (dpkg.log records what apt installed)
tail -n 20 /var/log/dpkg.log          # only the last 20 lines
tail -f /var/log/dpkg.log             # follow new lines as they arrive; Ctrl+C to stop
grep curl /var/log/dpkg.log           # only the lines that contain "curl"
```

`grep` also works on any command's output, using `|` (a **pipe**, which sends one command's output into the next): `journalctl -u hello | grep 404` shows only the 404 errors.

**Your turn:** ask the website for a page that does not exist, then find the error in the logs.

<details>
<summary>Show answer</summary>

```bash
curl http://localhost:8080/missing
journalctl -u hello -n 5              # shows: code 404, message File not found
```

`404` means "not found".

</details>

## 8. How do I find out what is wrong?

When a server is slow or broken, start with the question, then pick the tool:

| Question | Command | What to look at |
| --- | --- | --- |
| Is my service running? | `systemctl status hello` | active (running), or the reason it stopped |
| What did it say? | `journalctl -u hello -n 50` | Error messages near the end |
| Which process is using the CPU or memory? | `top` | The processes at the top |
| Is memory running out? | `free -h` | The **available** column |
| Is the disk full? | `df -h` | The **Use%** column |
| Which folder is using the space? | `sudo du -sh /var/* \| sort -h` | The biggest folders, at the bottom |
| What is listening on a port? | `sudo ss -tlnp` | The port number and the program's name |
| Who is using port 8080? | `sudo lsof -i :8080` | The program, its PID and its user |

In `sudo du -sh /var/* | sort -h`, `du` measures each folder and the pipe sends the result to `sort -h`, which puts them in order of size.

Do not panic if the "free" memory in `free -h` looks low. Linux uses spare memory to speed things up and gives it back when programs need it. **available** is the number that matters.

Try them on your machine:

```bash
df -h /                               # how full is the main disk?
free -h                               # how much memory is available?
sudo ss -tlnp | grep 8080             # what is listening on port 8080?
sudo lsof -i :8080                    # the same, with the user it runs as
```

`grep 8080` keeps only the lines about port 8080. Both commands show `python3`, and `lsof` also shows it runs as user `hello`. That is your website. (`lsof` shows port 8080 by its standard nickname, `http-alt`.)

## 9. Lab: break the website and fix it

Real problems rarely announce themselves. This lab builds the most important habit in operations: **when something breaks, look at the evidence before you change anything.**

You will break your website in three common ways. For each one: notice the symptom, use the tools from this topic to find the cause, then fix it. Your exact messages may look slightly different, so look for lines similar to the ones shown.

Before you start, check that the website works:

```bash
systemctl status hello                # active (running)
curl http://localhost:8080            # Hello from Linux
```

### Break 1: a typo in the unit file

Open the unit file and change `python3` to `python4` in the `ExecStart` line, then save and exit:

```bash
sudo nano /etc/systemd/system/hello.service
sudo systemctl daemon-reload
sudo systemctl restart hello
```

**Symptom:** `curl http://localhost:8080` fails to connect.

**Investigate:**

```bash
systemctl status hello
```

The service is **activating (auto-restart)**, not running: it keeps failing and systemd keeps retrying. Look at the `Process:` line:

```text
Process: 389 ExecStart=/usr/bin/python4 -m http.server 8080 --directory /opt/hello (code=exited, status=203/EXEC)
```

`203/EXEC` means systemd could not start the program at all. The line shows which program it tried, so check that it exists:

```bash
ls /usr/bin/python4                   # No such file or directory
which python3                         # /usr/bin/python3: the path it should be
```

**Fix:** there is no program called `python4`. Open the unit file again, change it back to `python3`, then:

```bash
sudo systemctl daemon-reload
sudo systemctl restart hello
curl http://localhost:8080            # works again
```

**Lesson:** after you edit a unit file, run `daemon-reload`, or systemd keeps using the old version.

### Break 2: wrong permissions

```bash
sudo chmod 700 /opt/hello
curl http://localhost:8080
```

**Symptom:** curl gets an error page saying **404** and `No permission to list directory`. But `systemctl status hello` still says **active (running)**. The service is up, but it is not working.

**Investigate:** the service runs as the `hello` user, so test as that user:

```bash
sudo -u hello ls /opt/hello           # Permission denied
ls -ld /opt/hello                     # -d shows the folder itself, not what is inside
```

`ls -ld` shows `drwx------ ... root root`. The folder belongs to root, and only root may enter it, so the `hello` user cannot reach `index.html`.

**Fix:**

```bash
sudo chmod 755 /opt/hello
curl http://localhost:8080            # works again
```

Another fix would be `sudo chown hello /opt/hello`, making `hello` the owner, since the owner can already do everything. Both work. Choose `chmod 755` when the files are not secret, as here.

**Lesson:** "running" does not mean "working". Always test a service from the outside, and check permissions as the user the service runs as.

### Break 3: the port is already taken

Stop the website, then, in your **second terminal**, start another program on the same port and leave it running:

```bash
sudo systemctl stop hello             # first terminal
python3 -m http.server 8080           # second terminal
```

Back in the first terminal, start the website again:

```bash
sudo systemctl start hello
```

**Symptom:** curl now shows a page listing the files in your folder, not `Hello from Linux`. The wrong program is answering.

**Investigate:**

```bash
systemctl status hello                # activating (auto-restart): it keeps failing
journalctl -u hello -n 20             # ends with: OSError: [Errno 98] Address already in use
sudo lsof -i :8080                    # who has the port?
```

`lsof` shows a `python3` process on port 8080 running as **your** user, not `hello`. That is the program in your second terminal.

**Fix:** press **Ctrl+C** in the second terminal. You do not need to do anything else. Wait a few seconds, then:

```bash
systemctl status hello                # active (running)
curl http://localhost:8080            # Hello from Linux
```

**Lesson:** "Address already in use" means another program holds the port, and `lsof` or `ss` tells you which one. Because of `Restart=always` and `RestartSec=3`, systemd kept trying every 3 seconds and recovered by itself once the port was free.

### Write it up

For each break, write three lines in your own notes:

1. **Symptom:** what you noticed first.
2. **Evidence:** the exact log line or command output that explained it.
3. **Fix:** what you changed, and how you checked it worked.

Real teams use the same format to write up problems in production (see SRE practice and incident management, later in the roadmap).

### Clean up

```bash
sudo systemctl disable --now hello
sudo rm /etc/systemd/system/hello.service
sudo systemctl daemon-reload
sudo rm -r /opt/hello
sudo userdel hello
sudo rm -f /tmp/secret.txt /tmp/cron-test.txt   # -f: no error if a file is already gone
rm -r ~/practice
```

If you did not remove the cron job earlier, run `crontab -e` and delete its line too.

## Summary

You can now:

- **Move around and manage files** with `pwd`, `ls`, `cd`, `mkdir`, `cp`, `mv`, `rm`, and edit them with `nano`.
- **Read and set permissions** with `ls -l` and `chmod`, and use `sudo` only when you need it.
- **Find and stop processes** with `pgrep`, `kill` and `top`.
- **Install software** with `apt`.
- **Schedule jobs** with cron.
- **Run a program as a service** with systemd, so it starts at boot and restarts when it stops.
- **Read a service's logs** with `journalctl`.
- **Investigate problems** with `systemctl status`, `journalctl`, `df`, `free`, `ss` and `lsof`.

Most of all: **when something breaks, read the evidence first, then change one thing at a time.**

**Next:** Networking basics. Every cloud service is reached over a network, so it helps to know how computers find and talk to each other.

## Further reading

- [The Linux Command Line](https://linuxcommand.org/tlcl.php) by William Shotts: a free book for complete beginners.
- [Linux Journey](https://labex.io/linuxjourney): short, free lessons on each part of this topic.
- [Ubuntu's command line tutorial for beginners](https://ubuntu.com/tutorials/command-line-for-beginners): a guided first hour in the terminal.

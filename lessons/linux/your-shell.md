The shell is more than a place to type commands. It keeps settings that every program you start can read, it decides which program a name like `ls` means, and it reads a few files when it starts that you can change. Most "it works in my terminal but not in the script" problems come down to these.

By the end you can read and set environment variables, explain how the shell finds a command through `PATH`, add your own directory to it, make aliases, and put your settings in the right startup file so they last.

## Variables and the environment

A **shell variable** is a name with a value. Set it with `=` and no spaces around it, and read it with `$` in front:

```bash
$ GREETING=hello
$ echo $GREETING
hello
$ GREETING = hello
bash: GREETING: command not found
```

With spaces, the shell reads `GREETING` as a command name.

Some variables are part of the **environment**: a set of names and values that every program receives from the program that started it. Programs read their settings from it. `env` lists the environment, and `printenv` prints one value:

```bash
$ env
HOSTNAME=lab
PWD=/root
HOME=/root
TERM=xterm
SHLVL=1
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
...
$ printenv HOME
/root
```

| Variable | Holds |
| --- | --- |
| `HOME` | Your home directory, which `~` stands for |
| `USER` | Your user name (often unset in a Docker container) |
| `PWD` | The directory you are in |
| `SHELL` | Your login shell |
| `PATH` | The directories searched for commands |
| `EDITOR` | The editor programs such as `crontab -e` open |

By convention, environment variables are written in capitals.

## export

A plain variable belongs to the current shell only. A program you start from it, including another shell, does not see it. `export` moves the variable into the environment, so every program started afterwards receives a copy:

```bash
$ APP_ENV=staging
$ bash -c 'echo "child sees: [$APP_ENV]"'
child sees: []
$ export APP_ENV
$ bash -c 'echo "child sees: [$APP_ENV]"'
child sees: [staging]
```

You can set and export in one step with `export APP_ENV=staging`. The single quotes stop your shell from replacing `$APP_ENV` itself, so the child shell does it.

To give a variable to one command only, put it in front of that command:

```bash
$ LOG_LEVEL=debug ./app.sh
```

`./app.sh` sees `LOG_LEVEL=debug`; your shell does not keep it. `unset APP_ENV` removes a variable.

A child gets a **copy**. Changes it makes never reach the parent shell. That is why a script that runs `export` or `cd` does not change your shell once it finishes.

## PATH and how a command is found

When you type `ls`, the shell has to find a program called `ls`. It checks in this order:

1. **Aliases**, which are covered below.
2. **Built-in commands**, part of the shell itself, such as `cd`, `echo` and `export`.
3. Each directory in **`PATH`**, from left to right. The first match wins.

`PATH` is a list of directories separated by colons:

```bash
$ echo $PATH
/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
```

`type` tells you what a name means and where it was found. `-a` shows every match, not just the first:

```bash
$ type ls
ls is aliased to `ls --color=auto'
$ type cd
cd is a shell builtin
$ type -a echo
echo is a shell builtin
echo is /usr/bin/echo
echo is /bin/echo
```

A program that is not in any `PATH` directory is not found by its name, even if it is in the current directory. You run it by its path instead:

```bash
$ ls ~/bin
hello
$ hello
bash: hello: command not found
$ ~/bin/hello
hello from hello
```

To make `hello` work by name, put its directory at the front of `PATH`. Keep the old value with `$PATH`, or you lose every other command:

```bash
$ export PATH="$HOME/bin:$PATH"
$ hello
hello from hello
$ command -v hello
/root/bin/hello
```

If you set `PATH` to something without `:$PATH`, commands like `ls` stop working in that shell. Close the shell and open a new one; the change was never saved.

Putting your directory first lets your programs override system ones with the same name. Putting it last, `"$PATH:$HOME/bin"`, means system programs win.

## Aliases

An **alias** is a short name for a longer command. The shell replaces the name before it runs anything:

```bash
$ alias ll='ls -alF'
$ alias ports='ss -tlnp'
$ alias
alias ll='ls -alF'
alias ports='ss -tlnp'
...
$ unalias ports
```

Ubuntu already defines several, such as `ll`, `la`, and `ls` with colours. Aliases only work in an interactive shell you are typing into. Scripts ignore them, so do not rely on one inside a script; write the full command there.

## The files your shell reads

Everything above disappears when you close the shell. To keep it, put it in a file the shell reads when it starts. Which file depends on how the shell was started:

| File | Read by | Put here |
| --- | --- | --- |
| `~/.profile` | **Login shells**: when you log in over SSH or at a console | Environment variables, `PATH` |
| `~/.bashrc` | **Interactive** shells that are not login shells: a new terminal tab, `docker run -it`, or typing `bash` | Aliases, prompt, shell options |
| `/etc/profile`, `/etc/bash.bashrc` | The same shells, for every user | Settings for all users; needs root |

On Ubuntu, `~/.profile` also reads `~/.bashrc`, so a login shell gets both. If a `~/.bash_profile` exists, Bash reads it instead of `~/.profile`, which is a common reason for settings that seem to be ignored.

Scripts and **cron jobs read neither file**. A command that works in your terminal because of something in `~/.bashrc` can fail when cron runs it. The *Running things on a schedule* topic deals with this.

Editing the file changes nothing in shells that are already running. `source` reads a file into the current shell, so you can apply a change without logging out:

```bash
$ echo 'alias c=clear' >> ~/.bashrc
$ type c
bash: type: c: not found
$ source ~/.bashrc
$ type c
c is aliased to `clear'
```

`. ~/.bashrc`, with a dot, does the same thing. Running the file as a script instead, with `bash ~/.bashrc`, would load it into a child shell that exits straight away.

## The prompt

The prompt is the value of the variable **`PS1`**. Ubuntu sets it in `~/.bashrc`. Special sequences stand for live values: `\u` the user, `\h` the host name, `\w` the current directory, `\t` the time, and `\$` a `$`, or `#` for root.

```bash
root@lab:~# PS1='\u@\h [\t] \w\$ '
root@lab [11:27:12] ~#
```

Showing the host name in the prompt is the useful part: it tells you which server you are typing into before you run something. To keep a new prompt, set `PS1` in `~/.bashrc`.

## Tasks

Do these in your Linux shell.

### Task 1: Your own command

Create a directory `~/bin` and a script `~/bin/hello` that prints `hello from` followed by the machine's name. Make it executable. Then change `PATH` so that typing `hello` runs it from any directory. Finally, make the change permanent and check it in a new shell.

<details>
<summary>Check your work</summary>

```bash
$ mkdir -p ~/bin
$ printf '#!/bin/bash\necho "hello from $(hostname)"\n' > ~/bin/hello
$ chmod +x ~/bin/hello
$ hello
bash: hello: command not found
$ export PATH="$HOME/bin:$PATH"
$ cd /tmp
$ hello
hello from lab
$ echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc
$ env -i HOME=/root bash
$ command -v hello
/root/bin/hello
$ exit
```

A plain `bash` would inherit the `PATH` you already exported, so it proves nothing. `env -i` starts the new shell with an empty environment, apart from `HOME`, the way a fresh login does, and that shell finds `hello` only because it read `~/.bashrc`. Use single quotes around the line you add to `~/.bashrc`, so the file holds `$HOME/bin:$PATH` and not the expanded value of today's `PATH`. If you get `Permission denied`, you skipped `chmod +x`.

</details>

### Task 2: Variables a child can see

Set a variable `APP_ENV=staging` without exporting it and show that a child shell (`bash -c 'echo $APP_ENV'`) cannot see it. Export it and show that the child can. Then add `export APP_ENV=staging` and an alias `ll='ls -lh'` to `~/.bashrc`, and load them into your current shell without starting a new one.

<details>
<summary>Check your work</summary>

```bash
$ APP_ENV=staging
$ bash -c 'echo "[$APP_ENV]"'
[]
$ export APP_ENV
$ bash -c 'echo "[$APP_ENV]"'
[staging]
$ echo 'export APP_ENV=staging' >> ~/.bashrc
$ echo "alias ll='ls -lh'" >> ~/.bashrc
$ source ~/.bashrc
$ type ll
ll is aliased to `ls -lh'
```

Ubuntu's `~/.bashrc` already defines `ll` as `ls -alF`. Your line comes later in the file, so it wins. If `type ll` still shows the old alias, you forgot `source`.

</details>

## Quiz

**1. What is the difference between `APP_ENV=prod` and `export APP_ENV=prod`?**

<details>
<summary>Show answer</summary>

The first sets a variable in the current shell only. The second also puts it in the environment, so programs started from this shell receive it.

</details>

**2. You install a tool into `/opt/tool/bin`, but typing `tool` gives `command not found`. Why, and what are two ways to run it?**

<details>
<summary>Show answer</summary>

`/opt/tool/bin` is not in `PATH`, so the shell does not look there. Run it by its full path, `/opt/tool/bin/tool`, or add the directory with `export PATH="$PATH:/opt/tool/bin"`, and put that line in `~/.profile` or `~/.bashrc` to keep it.

</details>

**3. You are on a server and you added `export DB_HOST=db-01` to `~/.bashrc`. It works in your terminal, but a cron job that needs it fails. Why?**

<details>
<summary>Show answer</summary>

Cron runs jobs without reading `~/.bashrc` or `~/.profile`, so the variable is never set. Set it in the script itself, or at the top of the crontab.

</details>

**4. Two programs called `deploy` exist, one in `/usr/local/bin` and one in `/usr/bin`. How do you find out which one runs when you type `deploy`?**

<details>
<summary>Show answer</summary>

`type -a deploy` lists both in the order the shell finds them; the first line is the one that runs. With the usual `PATH`, `/usr/local/bin` comes first. `command -v deploy` prints just the winner.

</details>

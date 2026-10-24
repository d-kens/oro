Sooner or later you need to change a file on a server: a port number in a config file, a line in a script, a setting that a colleague asked you to turn on. Servers have no desktop and no graphical editor, so you edit the file in the terminal. Two editors cover almost every case. **nano** is simple and shows its keys on screen. **vim** is harder to learn, but it is installed on nearly every Linux machine, including the small ones where nano is missing.

By the end you can open a file in nano, change it and save it, do the same in vim, and get out of vim when you are stuck.

## Get the editors and a file to practise on

The Docker Ubuntu image leaves out both editors to stay small. Install them; the *Installing software* topic explains what these commands do.

```bash
$ apt update && apt install -y nano vim
```

On a normal Ubuntu server nano is usually there already, and `vi` (a smaller relative of vim) is there on almost every distribution.

Create a small config file to practise on. `printf` prints text, and each `\n` starts a new line:

```bash
$ cd ~
$ printf '# app settings\nport=8080\nlog_level=info\nworkers=2\n' > app.conf
$ cat app.conf
# app settings
port=8080
log_level=info
workers=2
```

Before you edit a real config file, copy it. If your change breaks something, you can put the old file back in one command:

```bash
$ cp app.conf app.conf.bak
```

## nano

Open the file by giving its name. If the file does not exist, nano creates it when you save.

```bash
$ nano app.conf
```

```text
  GNU nano 7.2                        app.conf
# app settings
port=8080
log_level=info
workers=2



                                [ Read 4 lines ]
^G Help      ^O Write Out ^W Where Is  ^K Cut       ^T Execute   ^C Location
^X Exit      ^R Read File ^\ Replace   ^U Paste     ^J Justify   ^/ Go To Line
```

nano works like a basic text box. Move with the arrow keys, type to insert text, and use <kbd>Backspace</kbd> and <kbd>Delete</kbd> to remove it. The two lines at the bottom are a reminder of the commands. `^` means <kbd>Ctrl</kbd>, so `^X` is <kbd>Ctrl</kbd>+<kbd>X</kbd>. `M-` means <kbd>Alt</kbd>.

| Keys | What it does |
| --- | --- |
| <kbd>Ctrl</kbd>+<kbd>O</kbd>, then <kbd>Enter</kbd> | Save (nano calls it *write out*) |
| <kbd>Ctrl</kbd>+<kbd>X</kbd> | Exit |
| <kbd>Ctrl</kbd>+<kbd>W</kbd> | Search for text |
| <kbd>Ctrl</kbd>+<kbd>K</kbd> | Cut the current line |
| <kbd>Ctrl</kbd>+<kbd>U</kbd> | Paste the line you cut |
| <kbd>Ctrl</kbd>+<kbd>_</kbd> | Go to a line number |
| <kbd>Ctrl</kbd>+<kbd>C</kbd> | Cancel the question at the bottom |

Saving takes two steps. <kbd>Ctrl</kbd>+<kbd>O</kbd> asks for the file name, already filled in, and <kbd>Enter</kbd> confirms it:

```text
File Name to Write: app.conf
```

nano then reports how many lines it wrote:

```text
                               [ Wrote 4 lines ]
```

If you press <kbd>Ctrl</kbd>+<kbd>X</kbd> with unsaved changes, nano asks first:

```text
Save modified buffer?
 Y Yes
 N No           ^C Cancel
```

<kbd>Y</kbd> saves (press <kbd>Enter</kbd> to confirm the name), <kbd>N</kbd> throws your changes away, and <kbd>Ctrl</kbd>+<kbd>C</kbd> takes you back to the file.

Error messages often name a line number. `nano -l app.conf` shows line numbers down the left side.

## vim and its modes

vim is worth learning for one reason: it is always there. Some commands also open it without asking you, for example when a tool needs you to type a message. If you have never used it, it looks broken, because typing letters does not type letters.

That is because vim has **modes**:

| Mode | What your keys do | How you get there |
| --- | --- | --- |
| Normal | Each key is a command: move, delete, search | vim starts here; <kbd>Esc</kbd> always brings you back |
| Insert | Keys type text, as in any editor | <kbd>i</kbd> from normal mode |
| Command line | You type a command after a `:` at the bottom | <kbd>:</kbd> from normal mode |

Open the file:

```bash
$ vim app.conf
```

```text
# app settings
port=8080
log_level=info
workers=2
~
~
"app.conf" 4L, 50B                                            1,1           All
```

The `~` lines are past the end of the file. The bottom line shows the file's size and, on the right, the cursor's line and column.

You start in normal mode. Move to where you want to type, press <kbd>i</kbd>, and the bottom line changes:

```text
-- INSERT --                                                  1,1           All
```

Now you can type and delete as normal. When you are done, press <kbd>Esc</kbd> to go back to normal mode. If you are ever unsure which mode you are in, press <kbd>Esc</kbd>. It does no harm in normal mode.

## Saving and quitting vim

Save and quit from normal mode by typing a command that starts with `:`. The command appears at the bottom of the screen and runs when you press <kbd>Enter</kbd>.

| Command | What it does |
| --- | --- |
| `:w` | Save (*write*) |
| `:q` | Quit; refused if you have unsaved changes |
| `:wq` | Save and quit |
| `:q!` | Quit and throw away your changes |

If you try `:q` after changing the file, vim refuses:

```text
E37: No write since last change (add ! to override)
```

You decide: `:wq` to keep the change, or `:q!` to drop it.

When you are lost in vim and want out without changing anything, this always works: press <kbd>Esc</kbd> twice, type `:q!` and press <kbd>Enter</kbd>.

## Moving, searching and changing text in vim

The arrow keys move the cursor in normal mode. These normal-mode keys cover what you need on a server:

| Keys | What it does |
| --- | --- |
| `gg` | Go to the first line |
| `G` | Go to the last line |
| `:12` then <kbd>Enter</kbd> | Go to line 12 |
| `/text` then <kbd>Enter</kbd> | Search forward for `text` |
| `n` and `N` | Go to the next and the previous match |
| `x` | Delete the character under the cursor |
| `dd` | Delete the whole line |
| `cw` | Delete from the cursor to the end of the word and switch to insert mode |
| `o` | Open a new line below and switch to insert mode |
| `u` | Undo the last change |

Searching puts the cursor on the first letter of the match, which makes `cw` handy. To change `info` to `debug`, type `/info`, <kbd>Enter</kbd>, `cw`, `debug`, <kbd>Esc</kbd>.

If a search finds nothing, vim tells you at the bottom:

```text
E486: Pattern not found: nothere
```

You will also see `h`, `j`, `k` and `l` used to move left, down, up and right. They come from keyboards that had no arrow keys, and many people still use them because their hands stay on the letters.

## Editing files you do not own

Most config files live under `/etc` and belong to root. As an ordinary user you can open them but not save them; nano says `Permission denied` when you try to write. Open the file as root instead, with `sudo nano /etc/...` or `sudo vim /etc/...`. The *Users and permissions* topic explains owners and `sudo`.

After editing, compare your file with the copy you made. `diff` prints only the lines that changed: `<` lines are from the first file, `>` lines from the second.

```bash
$ diff app.conf.bak app.conf
2c2
< port=8080
---
> port=9090
```

## Tasks

Do these in your Linux shell, with the editors installed and `app.conf` created as shown above.

### Task 1: Change a file with nano

Make a backup of `app.conf` called `app.conf.bak`. Then, in nano, change the port from `8080` to `9090` and add a new last line `timeout=30`. Save, exit, and check the result with `cat` and `diff`.

<details>
<summary>Check your work</summary>

```bash
$ cp app.conf app.conf.bak
$ nano app.conf
```

Move down to the `port` line, press <kbd>End</kbd>, delete `8080` with <kbd>Backspace</kbd> and type `9090`. Move to the empty line below `workers=2` and type `timeout=30`. Save with <kbd>Ctrl</kbd>+<kbd>O</kbd> and <kbd>Enter</kbd>, then exit with <kbd>Ctrl</kbd>+<kbd>X</kbd>.

```bash
$ cat app.conf
# app settings
port=9090
log_level=info
workers=2
timeout=30
$ diff app.conf.bak app.conf
2c2
< port=8080
---
> port=9090
4a5
> timeout=30
```

If `cat` still shows `8080`, you exited without saving. Pressing <kbd>N</kbd> at *Save modified buffer?* throws the changes away. If `diff` prints nothing, the backup was made after the edit, not before.

</details>

### Task 2: Change a file with vim, then walk away from a change

Open `app.conf` in vim. Change `log_level=info` to `log_level=debug`, delete the `workers=2` line, then save and quit. Open the file again, delete the first line, and quit without saving.

<details>
<summary>Check your work</summary>

```bash
$ vim app.conf
```

Type each of these in normal mode:

1. `/info` and <kbd>Enter</kbd>, which puts the cursor on `info`.
2. `cw`, then type `debug`, then <kbd>Esc</kbd>.
3. `/workers` and <kbd>Enter</kbd>, then `dd`.
4. `:wq` and <kbd>Enter</kbd>.

```bash
$ cat app.conf
# app settings
port=9090
log_level=debug
timeout=30
```

For the second part, open the file again, press `gg` and `dd`, then type `:q!` and <kbd>Enter</kbd>. `cat app.conf` shows the same four lines as above, so the deleted line is still there.

If you see letters like `/info` or `cw` typed into the file, you were in insert mode. Press <kbd>Esc</kbd>, then `u` to undo, until the file looks right again.

</details>

## Quiz

**1. You are on a server and run a command that opens a file in an editor you do not recognise. The bottom line is empty, there are `~` lines down the left side, and typing makes strange things happen. How do you get out without changing the file?**

<details>
<summary>Show answer</summary>

It is vim. Press <kbd>Esc</kbd> to get back to normal mode, then type `:q!` and press <kbd>Enter</kbd>. That quits and throws away anything you may have changed by accident.

</details>

**2. In vim you type `:q` and see `E37: No write since last change`. What does it mean, and what are your two choices?**

<details>
<summary>Show answer</summary>

The file has changes you have not saved, so vim will not quit. Use `:wq` to save and quit, or `:q!` to quit and drop the changes.

</details>

**3. The bottom of nano shows `^O Write Out` and `M-U Undo`. Which keys do you press for each?**

<details>
<summary>Show answer</summary>

`^` means <kbd>Ctrl</kbd> and `M-` means <kbd>Alt</kbd>. <kbd>Ctrl</kbd>+<kbd>O</kbd> saves the file and <kbd>Alt</kbd>+<kbd>U</kbd> undoes the last change.

</details>

**4. Why copy a config file before you edit it, and why learn vim when nano is easier?**

<details>
<summary>Show answer</summary>

The copy lets you see exactly what you changed with `diff`, and put the old file back with `cp` if the service will not start. vim, or its smaller relative `vi`, is installed on almost every Linux machine, while nano can be missing on minimal servers and container images.

</details>

Copying new files over a live site works until the day a copy stops halfway or the new version is broken, and then there is no quick way back. In this project you write `deploy.sh`, a script that puts each release in its own timestamped directory, switches the live site to it in one step with a symlink, checks it, and switches back by itself if the check fails. It keeps the last five releases, refuses to run twice at once, and can roll back on request.

It uses *Arguments and input* for `getopts` and the usage message, *Functions* and *Arrays* for the structure and the release list, *Exit codes and errors* for the status it returns, *Robust scripts* for `set -euo pipefail`, a trap and a lock file, and *Real-world scripts* for logging. From the Linux skill it draws on *Links* for symlinks and *Creating and moving files* for `cp` and `mv`.

## What you need

The practice machine from *Shell scripting basics*, started from `~/scripts` on your computer:

```bash
$ cd ~/scripts
$ docker run -it --rm --hostname lab -v "$PWD":/root/scripts -w /root/scripts ubuntu:24.04
root@lab:~/scripts#
```

Install ShellCheck, Python and curl. Python is only there to serve the site with its built-in web server, and curl to fetch pages from it:

```bash
root@lab:~/scripts# apt update && apt install -y shellcheck python3 curl
```

Then make the site you will deploy, a folder called `site` with two files. Save this as `site/index.html`:

```html
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="deploy-check" content="ok">
  <title>Example site</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>Version 1</h1>
</body>
</html>
```

And a one-line stylesheet:

```bash
root@lab:~/scripts# echo "body { font-family: sans-serif; }" > site/style.css
```

The `deploy-check` line is the **marker**: text that every good release contains. The script looks for it after each switch. A real site might use a version string or a health page instead; the idea is the same.

## The brief

1. `./deploy.sh site` copies the site to `/srv/site/releases/<timestamp>`, for example `/srv/site/releases/20261025-091808`. Check: `ls /srv/site/releases`.
2. `/srv/site/current` is a symlink to the live release, and it is replaced in a single step, never deleted and recreated. Check: `ls -l /srv/site` shows `current ->` the newest release.
3. After switching, the script checks that `current/index.html` exists and contains the marker. With `-u URL` it also fetches the page with curl and looks for the marker there. Check: a deploy prints `check passed`.
4. When the check fails, the script switches back to the release that was live before, deletes the failed release and exits 1. Check: deploy a version without the marker, and the web server still serves the old version.
5. Only the newest five releases are kept, and the live one is never deleted. Check: deploy six more times and count the releases.
6. Two deploys cannot run at the same time; the second one stops with a clear error. Check: hold the lock with `flock` and try to deploy.
7. `./deploy.sh --rollback` switches to the release before the current one, and fails cleanly when there is none. Check: run it twice in a row on a fresh install.
8. The script has a usage message, exits 2 on a usage error, and passes ShellCheck. Check: `./deploy.sh` with no argument, and `shellcheck deploy.sh`.

## Steps

### Swap a symlink in one step

The whole design rests on one idea: the web server serves `/srv/site/current`, and `current` is a symlink to one release directory. Deploying means pointing the symlink somewhere else.

The obvious command, `ln -sfn NEW current`, is not one step. It removes the old link and then creates the new one, and for that moment `current` does not exist. A request arriving then gets an error. The safe way is to make the new link under a temporary name and then rename it over the old one. A rename within one file system is atomic: anyone looking sees the old link or the new one, never neither.

Hint: `mv` on a symlink to a directory moves the link into that directory, which is not what you want. `mv -T` treats the destination as a plain name to replace.

<details>
<summary>Show a solution</summary>

Try it by hand with two empty directories:

```bash
root@lab:~/scripts# mkdir -p /tmp/swap/a /tmp/swap/b && cd /tmp/swap
root@lab:/tmp/swap# ln -s /tmp/swap/a current
root@lab:/tmp/swap# ln -sfn /tmp/swap/b current.new
root@lab:/tmp/swap# mv -T current.new current
root@lab:/tmp/swap# readlink current
/tmp/swap/b
root@lab:/tmp/swap# ls
a  b  current
root@lab:/tmp/swap# cd ~/scripts
```

Without `-T`, `mv current.new current` would follow `current` to the directory `a` and move the new link inside it as `a/current.new`, leaving the live link unchanged.

In the script this becomes a small function:

```bash
switch_to() {
  local release=$1
  ln -sfn "$release" "$base/current.new"
  mv -T "$base/current.new" "$base/current"
  log "current -> $release"
}
```

</details>

### Plan the deploy

Write the steps down before the code. A deploy that is safe to interrupt at any point looks like this:

1. Check the source has an `index.html`, before touching anything.
2. Work out the release name from `date '+%Y%m%d-%H%M%S'`. Names in this form sort in time order, so a plain sorted list of releases is oldest first.
3. Remember which release is live now, with `readlink`, so you can go back to it.
4. Copy the source to `<release>.tmp`, then rename it to `<release>`. If the copy dies halfway, only a `.tmp` directory is left, never something that looks like a finished release. A `trap` on `EXIT` removes the `.tmp` directory if the script stops before the rename.
5. Switch `current` to the new release and run the check.
6. If the check passes, delete old releases beyond the newest five, skipping the live one. If it fails, switch back to the previous release and delete the failed one.

Hint: write a `check_site` function that returns 0 or 1 and logs why it failed. For the HTTP part, capture the page with `body=$(curl -fsS --max-time 5 "$url")` and then test `[[ $body == *"$marker"* ]]`. Piping `curl` into `grep -q` looks shorter but can fail under `pipefail`: `grep -q` exits at the first match, and curl, still writing, is killed by the closed pipe.

<details>
<summary>Show a solution</summary>

```bash
check_site() {
  local index="$base/current/index.html" body
  if [[ ! -f $index ]]; then
    log "check failed: no index.html"
    return 1
  fi
  if ! grep -qF -- "$marker" "$index"; then
    log "check failed: index.html does not contain '$marker'"
    return 1
  fi
  if [[ -n $check_url ]]; then
    if ! body=$(curl -fsS --max-time 5 "$check_url"); then
      log "check failed: could not fetch $check_url"
      return 1
    fi
    if [[ $body != *"$marker"* ]]; then
      log "check failed: $check_url does not contain '$marker'"
      return 1
    fi
  fi
  log "check passed"
}
```

`curl -f` makes an HTTP error such as 404 a failure, rather than printing the error page and exiting 0. `--max-time` stops a hung server from hanging the deploy.

The check runs after the switch, so a broken release is live for a moment before the rollback. Checking the release directory before switching as well catches most problems with no visible effect; the check after the switch catches the rest, such as a server that cannot read the new files.

</details>

### Lock, prune and roll back

Three pieces remain.

- **The lock.** If two people deploy at once, each may record the other's release as the one to go back to. `flock` takes a lock on an open file and the kernel releases it when the process exits, even after a crash, so there is no stale lock file to clean up. Open the lock file on a spare file descriptor with `exec 9> FILE`, then `flock -n 9`, which fails at once instead of waiting.
- **Pruning.** Build an array of release directories from a glob, oldest first, and remove entries from the front until five are left, skipping whichever one `current` points to. After a rollback the live release may be an old one, and deleting it would take the site down.
- **Rollback.** Find the live release in the array and switch to the one before it. If it is the first one, there is nothing older; say so and exit 1.

Hint: `getopts` only handles short options like `-r`. To accept `--rollback` too, loop over the arguments first and replace `--rollback` with `-r`, then `set -- "${args[@]}"` and run `getopts` as usual. A function can fill an array named by its caller with `local -n out=$1`, a **name reference**.

<details>
<summary>Show a solution</summary>

This is the whole script, `deploy.sh`:

```bash
#!/bin/bash
# Releases a static site into a timestamped directory, switches to it
# with a symlink, checks it, and rolls back if the check fails.
# Exits 0 on success, 1 on a failed deploy or rollback, 2 on a usage error.
set -euo pipefail

readonly SCRIPT_NAME=${0##*/}

base=/srv/site
keep=5
marker='deploy-check'
check_url=""

usage() {
  cat <<USAGE
Usage: $SCRIPT_NAME [options] SOURCE_DIR
       $SCRIPT_NAME [options] --rollback
  -r, --rollback  switch back to the release before the current one
  -b DIR          base directory (default $base)
  -k N            number of releases to keep (default $keep)
  -m TEXT         text index.html must contain (default '$marker')
  -u URL          also fetch URL with curl and look for the text there
  -h, --help      show this help
USAGE
}

log() {
  printf '%s %s\n' "$(date '+%F %T')" "$*"
}

die() {
  printf '%s ERROR: %s\n' "$(date '+%F %T')" "$*" >&2
  exit 1
}

# Points current at a release in one step: build the new link beside
# the old one, then rename it over the old one.
switch_to() {
  local release=$1
  ln -sfn "$release" "$base/current.new"
  mv -T "$base/current.new" "$base/current"
  log "current -> $release"
}

current_release() {
  readlink "$base/current" || true
}

# Fills the array named by $1 with release directories, oldest first.
list_releases() {
  local -n out=$1
  out=()
  local dir
  for dir in "$base"/releases/*/; do
    [[ -d $dir ]] && out+=("${dir%/}")
  done
}

check_site() {
  local index="$base/current/index.html" body
  if [[ ! -f $index ]]; then
    log "check failed: no index.html"
    return 1
  fi
  if ! grep -qF -- "$marker" "$index"; then
    log "check failed: index.html does not contain '$marker'"
    return 1
  fi
  if [[ -n $check_url ]]; then
    if ! body=$(curl -fsS --max-time 5 "$check_url"); then
      log "check failed: could not fetch $check_url"
      return 1
    fi
    if [[ $body != *"$marker"* ]]; then
      log "check failed: $check_url does not contain '$marker'"
      return 1
    fi
  fi
  log "check passed"
}

prune() {
  local releases=() current i
  list_releases releases
  current=$(current_release)
  for (( i = 0; i < ${#releases[@]} - keep; i++ )); do
    [[ ${releases[i]} == "$current" ]] && continue
    rm -rf -- "${releases[i]}"
    log "removed old release ${releases[i]##*/}"
  done
}

deploy() {
  local source=$1 release previous
  [[ -f $source/index.html ]] || die "$source has no index.html"

  release="$base/releases/$(date '+%Y%m%d-%H%M%S')"
  [[ -e $release ]] && die "$release already exists; wait a second and try again"
  previous=$(current_release)

  # Copy into a temporary name first, so a half-copied release never
  # looks like a real one. The trap removes it if the copy fails.
  trap 'rm -rf -- "$release.tmp"' EXIT
  mkdir -p "$release.tmp"
  cp -R -- "$source/." "$release.tmp/"
  mv -- "$release.tmp" "$release"
  trap - EXIT
  log "copied $source to $release"

  switch_to "$release"
  if check_site; then
    prune
    log "deploy of ${release##*/} finished"
    return 0
  fi

  if [[ -n $previous ]]; then
    log "rolling back to ${previous##*/}"
    switch_to "$previous"
  else
    rm -f -- "$base/current"
    log "no earlier release to roll back to; removed current"
  fi
  rm -rf -- "$release"
  log "removed failed release ${release##*/}"
  return 1
}

rollback() {
  local releases=() current i
  list_releases releases
  current=$(current_release)
  [[ -n $current ]] || die "nothing is deployed yet"
  for (( i = ${#releases[@]} - 1; i > 0; i-- )); do
    if [[ ${releases[i]} == "$current" ]]; then
      switch_to "${releases[i - 1]}"
      check_site || log "warning: the release you rolled back to fails its check"
      return 0
    fi
  done
  die "no release older than ${current##*/}"
}

main() {
  # getopts only knows short options, so turn the long ones into short ones first.
  local arg args=()
  for arg in "$@"; do
    case $arg in
      --rollback) args+=(-r) ;;
      --help)     args+=(-h) ;;
      --?*)       usage >&2; echo "Unknown option $arg" >&2; exit 2 ;;
      *)          args+=("$arg") ;;
    esac
  done
  set -- "${args[@]}"

  local opt mode=deploy
  while getopts ':rb:k:m:u:h' opt; do
    case $opt in
      r) mode=rollback ;;
      b) base=$OPTARG ;;
      k) keep=$OPTARG ;;
      m) marker=$OPTARG ;;
      u) check_url=$OPTARG ;;
      h) usage; exit 0 ;;
      :) usage >&2; echo "Option -$OPTARG needs a value" >&2; exit 2 ;;
      *) usage >&2; echo "Unknown option -$OPTARG" >&2; exit 2 ;;
    esac
  done
  shift $((OPTIND - 1))
  [[ $keep =~ ^[1-9][0-9]*$ ]] || { echo "-k needs a number above 0" >&2; exit 2; }

  if [[ $mode == deploy && $# -ne 1 ]] || [[ $mode == rollback && $# -ne 0 ]]; then
    usage >&2
    exit 2
  fi

  mkdir -p "$base/releases"

  # Hold a lock on file descriptor 9 for as long as the script runs.
  exec 9> "$base/.deploy.lock"
  flock -n 9 || die "another deploy is running"

  if [[ $mode == rollback ]]; then
    rollback
  else
    deploy "$1"
  fi
}

main "$@"
```

`-b` exists so you can test against a directory in `/tmp` without touching `/srv`. `[[ -d $dir ]]` in `list_releases` guards against the glob matching nothing: then the loop gets the pattern itself as a single word, and the test throws it away.

```bash
root@lab:~/scripts# chmod +x deploy.sh
root@lab:~/scripts# shellcheck deploy.sh
root@lab:~/scripts#
```

</details>

### Deploy, break it, roll back

Deploy version 1, start a web server on the live link, and deploy version 2 with the HTTP check. Then deploy a broken version 3 and watch the script undo it. Finally, roll back by hand.

Hint: `python3 -m http.server 8080 --directory /srv/site/current` serves the directory through the symlink. It resolves the path on every request, so a switch shows up straight away without a restart. Run it in the background with `&`. Wait a second between deploys, because two in the same second would get the same release name and the script refuses that.

<details>
<summary>Show a solution</summary>

The first deploy:

```bash
root@lab:~/scripts# ./deploy.sh site
2026-10-25 09:18:08 copied site to /srv/site/releases/20261025-091808
2026-10-25 09:18:08 current -> /srv/site/releases/20261025-091808
2026-10-25 09:18:08 check passed
2026-10-25 09:18:08 deploy of 20261025-091808 finished
root@lab:~/scripts# ls -l /srv/site
total 4
lrwxrwxrwx 1 root root   34 Oct 25 09:18 current -> /srv/site/releases/20261025-091808
drwxr-xr-x 3 root root 4096 Oct 25 09:18 releases
```

Start the web server, change the heading to `Version 2` in `site/index.html`, and deploy with the HTTP check:

```bash
root@lab:~/scripts# python3 -m http.server 8080 --directory /srv/site/current > /tmp/http.log 2>&1 &
root@lab:~/scripts# sed -i "s/Version 1/Version 2/" site/index.html
root@lab:~/scripts# ./deploy.sh -u http://localhost:8080/ site
2026-10-25 09:18:10 copied site to /srv/site/releases/20261025-091810
2026-10-25 09:18:10 current -> /srv/site/releases/20261025-091810
2026-10-25 09:18:10 check passed
2026-10-25 09:18:10 deploy of 20261025-091810 finished
root@lab:~/scripts# curl -s http://localhost:8080/ | grep h1
  <h1>Version 2</h1>
```

Now break it. Change the heading to `Version 3` and delete the marker line, as if someone had replaced the page with a half-finished copy:

```bash
root@lab:~/scripts# sed -i "s/Version 2/Version 3/; /deploy-check/d" site/index.html
root@lab:~/scripts# ./deploy.sh -u http://localhost:8080/ site; echo "exit $?"
2026-10-25 09:18:11 copied site to /srv/site/releases/20261025-091811
2026-10-25 09:18:11 current -> /srv/site/releases/20261025-091811
2026-10-25 09:18:11 check failed: index.html does not contain 'deploy-check'
2026-10-25 09:18:11 rolling back to 20261025-091810
2026-10-25 09:18:11 current -> /srv/site/releases/20261025-091810
2026-10-25 09:18:11 removed failed release 20261025-091811
exit 1
root@lab:~/scripts# curl -s http://localhost:8080/ | grep h1
  <h1>Version 2</h1>
root@lab:~/scripts# ls /srv/site/releases
20261025-091808
20261025-091810
```

Version 2 is still live, and the failed release is gone. A manual rollback goes back one more step, to version 1. A second one has nowhere to go:

```bash
root@lab:~/scripts# ./deploy.sh --rollback
2026-10-25 09:18:11 current -> /srv/site/releases/20261025-091808
2026-10-25 09:18:11 check passed
root@lab:~/scripts# curl -s http://localhost:8080/ | grep h1
  <h1>Version 1</h1>
root@lab:~/scripts# ./deploy.sh --rollback; echo "exit $?"
2026-10-25 09:18:11 ERROR: no release older than 20261025-091808
exit 1
```

</details>

## Check it works

Put the marker line back into `site/index.html`, under the `charset` line. Then deploy six times, changing the heading each time, and check that only five releases remain and the newest is live:

```bash
root@lab:~/scripts# for v in 4 5 6 7 8 9; do sed -i "s/Version [0-9]*/Version $v/" site/index.html; ./deploy.sh site | grep -e removed -e finished; sleep 1; done
2026-10-25 09:18:11 deploy of 20261025-091811 finished
2026-10-25 09:18:12 deploy of 20261025-091812 finished
2026-10-25 09:18:13 deploy of 20261025-091813 finished
2026-10-25 09:18:14 removed old release 20261025-091808
2026-10-25 09:18:14 deploy of 20261025-091814 finished
2026-10-25 09:18:15 removed old release 20261025-091810
2026-10-25 09:18:15 deploy of 20261025-091815 finished
2026-10-25 09:18:16 removed old release 20261025-091811
2026-10-25 09:18:16 deploy of 20261025-091816 finished
root@lab:~/scripts# ls /srv/site/releases
20261025-091812
20261025-091813
20261025-091814
20261025-091815
20261025-091816
root@lab:~/scripts# readlink /srv/site/current
/srv/site/releases/20261025-091816
root@lab:~/scripts# curl -s http://localhost:8080/ | grep h1
  <h1>Version 9</h1>
```

A second deploy cannot start while one holds the lock. Hold it from the prompt with `flock` and a long `sleep`:

```bash
root@lab:~/scripts# flock /srv/site/.deploy.lock sleep 30 &
root@lab:~/scripts# ./deploy.sh site; echo "exit $?"
2026-10-25 09:18:18 ERROR: another deploy is running
exit 1
```

A usage error exits 2, and the script is clean:

```bash
root@lab:~/scripts# ./deploy.sh; echo "exit $?"
Usage: deploy.sh [options] SOURCE_DIR
       deploy.sh [options] --rollback
  -r, --rollback  switch back to the release before the current one
  -b DIR          base directory (default /srv/site)
  -k N            number of releases to keep (default 5)
  -m TEXT         text index.html must contain (default 'deploy-check')
  -u URL          also fetch URL with curl and look for the text there
  -h, --help      show this help
exit 2
root@lab:~/scripts# shellcheck deploy.sh && echo "no warnings"
no warnings
```

## Going further

- Run the check against the new release directory before switching too, and only switch when it passes.
- Add `-l` to list the releases with an arrow next to the live one.
- Copy the site with `rsync --link-dest` against the previous release, so unchanged files are hard links and each release costs almost no space.

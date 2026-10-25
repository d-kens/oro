SSH is how you get a shell on a remote server, and almost every server you manage will be reached this way. It encrypts everything, it checks that you are talking to the right machine, and it can carry other connections inside it. That last part lets you reach services that are not open to the network at all.

This topic sets up SSH between the lab machines with keys instead of passwords, then uses it to hop through router to a machine on another network and to forward ports. By the end you can log in with a key, keep your connections in a config file, read a host key warning, use a jump host, and reach a service that only listens on a server's own loopback.

## Start an SSH server

The lab image includes the OpenSSH server, but nothing starts it. Start `alpha` and `beta`, then on beta start the server and create an ordinary user to log in as. Ubuntu does not allow `root` to log in with a password over SSH, and logging in as a normal user is better practice anyway:

```bash
root@beta:/# service ssh start
 * Starting OpenBSD Secure Shell server sshd
   ...done.
root@beta:/# useradd -m -s /bin/bash dev
root@beta:/# passwd dev
New password:
Retype new password:
passwd: password updated successfully
```

Outside a container you would use `systemctl start ssh`, as in the Linux skill. `/usr/sbin/sshd` also starts it directly. Either way it listens on port 22. Now log in from alpha:

```bash
root@alpha:/# ssh dev@beta
The authenticity of host 'beta (10.10.0.3)' can't be established.
ED25519 key fingerprint is SHA256:R01enu2A5c3XIHySMTH5+GTkeNZwXE2fTcpjiksxPgE.
This key is not known by any other names.
Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
Warning: Permanently added 'beta' (ED25519) to the list of known hosts.
dev@beta's password:
dev@beta:~$ hostname
beta
dev@beta:~$ exit
logout
Connection to beta closed.
```

A welcome message from Ubuntu appears after the password; it is trimmed here. The question about authenticity comes up once per server, and it matters.

## Host keys and known_hosts

Every SSH server has a **host key**, a key pair that identifies it. When you connect, the server proves it holds the private half. The first time, your client has nothing to compare it with, so it shows the key's **fingerprint** and asks. Answering `yes` stores the server's public key in `~/.ssh/known_hosts`.

From then on, the client checks the key on every connection. If it ever changes, SSH refuses to connect. You can see this by giving beta new host keys:

```bash
root@beta:/# rm /etc/ssh/ssh_host_*
root@beta:/# ssh-keygen -A
ssh-keygen: generating new host keys: RSA ECDSA ED25519
root@beta:/# service ssh restart
 * Restarting OpenBSD Secure Shell server sshd
   ...done.
root@alpha:/# ssh dev@beta
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@    WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!     @
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
IT IS POSSIBLE THAT SOMEONE IS DOING SOMETHING NASTY!
Someone could be eavesdropping on you right now (man-in-the-middle attack)!
It is also possible that a host key has just been changed.
The fingerprint for the ED25519 key sent by the remote host is
SHA256:gFugvKWyj636i5CHfzPVpz8PebgdV2dOTN0P/TEETNE.
Please contact your system administrator.
Add correct host key in /root/.ssh/known_hosts to get rid of this message.
Offending ECDSA key in /root/.ssh/known_hosts:3
  remove with:
  ssh-keygen -f '/root/.ssh/known_hosts' -R 'beta'
Host key for beta has changed and you have requested strict checking.
Host key verification failed.
```

The warning is loud on purpose. It means either someone is between you and the server, or the server really was rebuilt. In the cloud, the second is common: a server is replaced and comes back at the same address with new keys. Find out which before you remove the old entry. Here you know, so remove the old entries and connect again. There are three, one for each type of key beta offered:

```bash
root@alpha:/# ssh-keygen -R beta
# Host beta found: line 1
# Host beta found: line 2
# Host beta found: line 3
/root/.ssh/known_hosts updated.
Original contents retained as /root/.ssh/known_hosts.old
```

One lab quirk: every machine starts from the same image, so before you changed beta's keys, they all shared one host key. Connecting to a second machine shows `This host key is known by the following other names` for that reason. Real servers each have their own.

## Log in with a key

Passwords can be guessed, and typing them gets old. A **key pair** is better. You keep the **private key** on your own machine and never share it. You put the **public key** on every server you want to reach. The server checks that you hold the private key without it ever being sent.

Create a key pair on alpha. Press <kbd>Enter</kbd> to accept the file name. A passphrase encrypts the private key on disk, and on a real laptop you should set one; in the lab, leaving it empty is fine:

```bash
root@alpha:/# ssh-keygen -t ed25519
Generating public/private ed25519 key pair.
Enter file in which to save the key (/root/.ssh/id_ed25519):
Enter passphrase (empty for no passphrase):
Enter same passphrase again:
Your identification has been saved in /root/.ssh/id_ed25519
Your public key has been saved in /root/.ssh/id_ed25519.pub
The key fingerprint is:
SHA256:vHRWKoWwnQiNcc2iQCAZB5c3GqKF02VZrP7yforgfpw root@alpha
```

`ed25519` is the modern key type, short and fast. `id_ed25519` is the private key and `id_ed25519.pub` the public one. Copy the public key to beta. `ssh-copy-id` logs in with your password one last time and appends the key to `~/.ssh/authorized_keys` in dev's home directory:

```bash
root@alpha:/# ssh-copy-id dev@beta
/usr/bin/ssh-copy-id: INFO: Source of key(s) to be installed: "/root/.ssh/id_ed25519.pub"
/usr/bin/ssh-copy-id: INFO: attempting to log in with the new key(s), to filter out any that are already installed
/usr/bin/ssh-copy-id: INFO: 1 key(s) remain to be installed -- if you are prompted now it is to install the new keys
dev@beta's password:

Number of key(s) added: 1

Now try logging into the machine, with:   "ssh 'dev@beta'"
and check to make sure that only the key(s) you wanted were added.
```

Now SSH asks for nothing, and you can run a single command without opening a shell:

```bash
root@alpha:/# ssh dev@beta hostname
beta
root@alpha:/# ssh dev@beta 'ls -la ~/.ssh'
total 12
drwx------ 2 dev dev 4096 Oct 25 07:41 .
drwxr-x--- 4 dev dev 4096 Oct 25 07:41 ..
-rw------- 1 dev dev   92 Oct 25 07:41 authorized_keys
```

The permissions matter. sshd ignores `authorized_keys` if the file or the `.ssh` directory can be written by anyone other than the owner, which is the usual reason key login silently falls back to a password. In the cloud, the provider puts your public key into `authorized_keys` when the server is created, which is why you never set a password there.

## The SSH config file

Typing user names, ports and options every time is tedious. `~/.ssh/config` on the client stores them per host:

```text
Host beta router
    User dev

Host web-01
    HostName 203.0.113.10
    User deploy
    Port 2222
    IdentityFile ~/.ssh/web_key
```

- `Host` is the name you type. It can list several names, and the settings apply to all of them.
- `HostName` is the real address, when the name you type is only a nickname.
- `User`, `Port` and `IdentityFile` save you `dev@`, `-p 2222` and `-i ~/.ssh/web_key`.

With the first block in place, `ssh beta` means `ssh dev@beta`. The file must not be writable by others; `chmod 600 ~/.ssh/config` is safe. The `web-01` block is only an example of the other settings, and there is no such host in the lab.

## Jump hosts

In the cloud, private servers often have no public address at all. You reach them through a **jump host**, also called a bastion: one server you can reach, that can reach the private ones. `-J` tells SSH to connect to the jump host first and carry your real connection through it.

Set up the two-network lab from the *Routing and gateways* topic: `router` on `lab` and `lab2`, and `delta` on `lab2` only. alpha cannot reach delta directly, but router can. Start SSH and create the `dev` user on both router and delta as you did on beta, then copy your key to router:

```bash
root@alpha:/# ssh-copy-id dev@router
```

delta's name means nothing to alpha, but router can resolve it, and with `-J` the final hop starts from router. Copy the key to delta through router:

```bash
root@alpha:/# ssh-copy-id -o ProxyJump=dev@router dev@delta
```

Then log in to delta in one step:

```bash
root@alpha:/# ssh -J dev@router dev@delta
dev@delta:~$ ip -br addr show eth0
eth0@if85        UP             10.20.0.2/24
```

The connection is encrypted from alpha all the way to delta. router only passes the bytes on and cannot read them, so it never needs your private key. To make this permanent, add a block to the config file:

```text
Host delta
    User dev
    ProxyJump router
```

Now `ssh delta` works, and so do `scp` and anything else that uses SSH. `ssh -v delta` shows the hop:

```text
debug1: Setting implicit ProxyCommand from ProxyJump: ssh -v -W '[%h]:%p' router
Authenticated to router ([10.10.0.254]:22) using "publickey".
Authenticated to delta (via proxy) using "publickey".
```

## Forwarding ports

SSH can also carry other TCP connections. The most useful is **local forwarding** with `-L`: a port on your machine leads, through the SSH connection, to an address and port as seen from the server.

Admin tools and databases are often set to listen only on `127.0.0.1`, so nothing on the network can reach them. Start one on beta:

```bash
root@beta:/# mkdir -p /srv/admin && echo "admin panel" > /srv/admin/index.html
root@beta:/# cd /srv/admin && python3 -m http.server 8080 --bind 127.0.0.1 &
root@alpha:/# curl http://beta:8080
curl: (7) Failed to connect to beta port 8080 after 0 ms: Couldn't connect to server
```

From alpha it is unreachable. Forward alpha's port 9000 to `localhost:8080` on beta:

```bash
root@alpha:/# ssh -f -N -L 9000:localhost:8080 dev@beta
root@alpha:/# curl http://localhost:9000
admin panel
```

- `-L 9000:localhost:8080` means: listen on port 9000 here, and send each connection to `localhost:8080` as beta sees it. `localhost` is resolved on beta, so it is beta's own loopback.
- `-N` runs no remote command, only the forward.
- `-f` sends SSH to the background once it has logged in.

alpha's port 9000 listens on its own loopback only, so other machines cannot use your tunnel. Stop it with `pkill -f 9000:localhost`, or end the SSH process any other way. The service never had to be opened in a firewall; anyone with SSH access can reach it and no one else can.

Two other kinds, briefly:

- **Remote forwarding**, `-R 9001:localhost:80`, is the reverse: a port on the server leads back to a port on your side. Run from alpha against beta, `curl localhost:9001` on beta reaches nginx on alpha. It is handy for showing someone a service on your machine.
- **Dynamic forwarding**, `-D 1080`, turns the SSH connection into a SOCKS proxy. Programs that support SOCKS send their connections through it, to any address the server can reach. From alpha, `ssh -f -N -D 1080 dev@router` followed by `curl --socks5-hostname localhost:1080 http://delta` fetches delta's web page through router.

## Tasks

### Task 1: Key login with a config file

Create `~/.ssh/config` on alpha so that `ssh beta` and `ssh router` log in as `dev` with your key, and `ssh delta` goes through router. Prove all three work by running `hostname` on each in one command.

<details>
<summary>Check your work</summary>

```text
Host beta router
    User dev

Host delta
    User dev
    ProxyJump router
```

```bash
root@alpha:/# chmod 600 ~/.ssh/config
root@alpha:/# for h in beta router delta; do ssh $h hostname; done
beta
router
delta
```

If one asks for a password, its `authorized_keys` does not have your key: run `ssh-copy-id` for it. If delta says `Could not resolve hostname`, the `ProxyJump` line is missing, and alpha is trying to look up delta itself.

</details>

### Task 2: Reach a loopback-only service on delta

On delta, start `python3 -m http.server 8080 --bind 127.0.0.1` in a directory with an `index.html` that says `private on delta`. From alpha, with one `ssh` command, forward alpha's port 9100 to that service, going through router. Fetch the page with curl.

<details>
<summary>Check your work</summary>

```bash
root@alpha:/# ssh -f -N -L 9100:localhost:8080 delta
root@alpha:/# curl http://localhost:9100
private on delta
```

With the config from Task 1, `delta` already goes through router. Without it, use `ssh -f -N -J dev@router -L 9100:localhost:8080 dev@delta`. The likely mistake is forwarding through router alone with `-L 9100:localhost:8080 dev@router`: then `localhost` means router, which has nothing on port 8080, and curl fails with `Connection reset by peer` because the tunnel has nothing to connect to.

</details>

## Quiz

**1. Which half of your key pair goes on the server, and where?**

<details>
<summary>Show answer</summary>

The public key, appended to `~/.ssh/authorized_keys` in the home directory of the user you log in as. The private key stays on your own machine.

</details>

**2. You connect to a server you use every day and get `REMOTE HOST IDENTIFICATION HAS CHANGED`. What should you do before running `ssh-keygen -R`?**

<details>
<summary>Show answer</summary>

Find out why the key changed. If the server was rebuilt or replaced, the new key is expected; compare its fingerprint with one from a trusted source, such as the server's console output. If nobody changed it, someone may be intercepting the connection, and you should not log in.

</details>

**3. A database on a server listens only on `127.0.0.1:5432`. A colleague wants to run a query from their laptop without opening the port in the firewall. They have SSH access to the server. What do they run?**

<details>
<summary>Show answer</summary>

A local forward, for example `ssh -N -L 5432:localhost:5432 user@db-01`, then point their database client at `localhost:5432` on the laptop. If the server is only reachable through a bastion, add `-J user@bastion`.

</details>

**4. Key login to a server keeps falling back to asking for a password, even though the public key is in `authorized_keys`. What do you check?**

<details>
<summary>Show answer</summary>

The permissions on the server: `~/.ssh` should be `700` and `authorized_keys` `600`, both owned by the user, and the home directory must not be writable by others. sshd ignores the key file otherwise. Then check that the client is offering the right key, with `ssh -v`.

</details>

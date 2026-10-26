The cloud is not magic and it is not in the sky. It is very large buildings full of ordinary servers, plus a great deal of software that lets many customers share them safely and lets each one create what they need in seconds.

This topic looks behind the website: the data centres, how one physical machine becomes many virtual ones, and the APIs that make self-service possible. By the end you can explain what happens when you click "create server".

## Data centres

A **data centre** is a building designed to hold servers: tens of thousands of them in rows of racks, with backup power, cooling, fast network links and guarded doors that customers never go through. Providers build them in groups around the world, which the *Regions and zones* topic covers.

## Virtualisation

If every customer got a whole physical server, the cloud would be slow to set up and wasteful: most customers need a small part of a modern server, which can have a hundred CPU cores and over a terabyte of memory.

The answer is **virtualisation**. A program called a **hypervisor** runs on the physical server, the *host*, and divides it into many **virtual machines** (*VMs*). Each VM gets its own share of CPU, memory, disk and network, and runs its own operating system. To the software inside, a VM looks exactly like a real computer.

```text
 ┌─────────────────── one physical server ───────────────────┐
 │  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐    │
 │  │  VM A   │   │  VM B   │   │  VM C   │   │  VM D   │    │
 │  │ Linux   │   │ Windows │   │ Linux   │   │ Linux   │    │
 │  │ cust. 1 │   │ cust. 2 │   │ cust. 1 │   │ cust. 3 │    │
 │  └─────────┘   └─────────┘   └─────────┘   └─────────┘    │
 │                    hypervisor                              │
 │          CPUs · memory · disks · network cards             │
 └────────────────────────────────────────────────────────────┘
```

The hypervisor keeps VMs apart: one customer cannot see another customer's memory or disks, even on the same host. This is the *resource pooling* from the first topic, and it is what lets the provider keep its hardware busy.

Because a VM is software, it can be created, stopped, copied or moved in seconds. A provider can start your server on whichever host has room, and move it if that host needs repair.

**Containers**, which the Docker skill covers, go one step further: they share the host's operating system kernel instead of running their own, so they are smaller and start faster than VMs. Clouds use both.

## The control plane and APIs

When you click "create server", no person does anything. Your request goes to the provider's **control plane**, the software that runs the cloud. It:

1. Checks who you are and whether you are allowed to do this.
2. Finds a host with enough free capacity.
3. Tells that host's hypervisor to create a VM with the size and disk image you chose.
4. Connects it to your network and gives it an address.
5. Starts measuring use, so it can bill you.

Everything goes through an **API**, an *application programming interface*: a set of requests a program can send over the network, such as "create a server of this size" or "delete this disk". The website, the command-line tool and infrastructure tools such as Terraform are all just different ways of sending the same API requests. That is why anything you can click, you can also script.

## Tasks

### Task 1: Follow the click

Without looking back, write down in order what the control plane does when someone asks for a new server.

<details>
<summary>Check your work</summary>

Check who is asking and whether they are allowed; find a host with room; tell its hypervisor to create the VM; connect it to the network and give it an address; start measuring use for billing. The order of the middle steps can vary, but checking permission always comes first.

</details>

### Task 2: Count the machines

A physical server has 96 CPU cores and 768 GB of memory. Customers rent VMs with 2 cores and 8 GB each. How many such VMs fit on it, and which runs out first, CPU or memory?

<details>
<summary>Check your work</summary>

By CPU, 96 ÷ 2 = 48 VMs. By memory, 768 ÷ 8 = 96 VMs. **CPU runs out first, at 48.** Half the memory would sit unused, which is one reason providers also sell sizes with more memory per core: mixing them lets a host's CPU and memory run out together.

</details>

## Quiz

**1. What does a hypervisor do?**

<details>
<summary>Show answer</summary>

It runs on a physical server and divides it into virtual machines, giving each one its own share of CPU, memory, disk and network, and keeping them separate from one another.

</details>

**2. Two customers have VMs on the same physical host. Can one read the other's memory?**

<details>
<summary>Show answer</summary>

No. Keeping VMs isolated from each other is one of the hypervisor's main jobs. Each customer sees only their own machine.

</details>

**3. Why can anything you do in a cloud provider's website also be done with a script?**

<details>
<summary>Show answer</summary>

Because the website is only one client of the provider's API. A script, a command-line tool or Terraform sends the same API requests, so they can do the same things.

</details>

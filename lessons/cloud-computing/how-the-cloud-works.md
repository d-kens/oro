A cloud is large buildings full of ordinary servers, plus software that lets many customers share them safely and create what they need in seconds.

This topic looks behind the website: the data centres, how one physical machine becomes many virtual ones, and the APIs that make self-service possible. By the end you can explain what happens when you click "create server".

## Data centres

**Data centre:** A building that houses servers, storage and network equipment, with the power, cooling, network connections and physical security they need to run without stopping.

A large one holds tens of thousands of servers in rows of racks. Customers never go inside. Providers build data centres in groups around the world, which the *Regions and zones* topic covers.

## Virtualisation

If every customer got a whole physical server, the cloud would be slow to set up and wasteful: most customers need a small part of a modern server, which can have a hundred CPU cores and over a terabyte of memory.

The answer is virtualisation:

- **Virtualisation:** Creating software versions of hardware, so one physical computer can run several separate computers at once.
- **Host:** The physical computer that the virtual machines run on.
- **Hypervisor:** The software on the host that creates and runs virtual machines, shares out the host's CPU, memory, disk and network between them, and keeps them apart.
- **Virtual machine (VM):** A computer made in software, with its own operating system and its own share of the host's CPU, memory, disk and network. To the software inside, it looks exactly like a real computer.

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

**Container:** An application packaged with everything it needs to run, which shares the host's operating system kernel instead of running its own.

Because they do not carry a whole operating system, containers are smaller and start faster than VMs. The Docker skill covers them. Clouds use both.

## The control plane and APIs

**Control plane:** The provider's software that receives requests to create, change or delete resources, and carries them out.

When you click "create server", no person does anything. Your request goes to the control plane, which:

1. Checks who you are and whether you are allowed to do this.
2. Finds a host with enough free capacity.
3. Tells that host's hypervisor to create a VM with the size and disk image you chose.
4. Connects it to your network and gives it an address.
5. Starts measuring use, so it can bill you.

**API (application programming interface):** A defined set of requests that a program can send to a service, such as "create a server of this size" or "delete this disk", and the answers it gets back.

Everything in the cloud goes through the provider's API. The website, the command-line tool and infrastructure tools such as Terraform are all just different ways of sending the same API requests. That is why anything you can click, you can also script.

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

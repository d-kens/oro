Scripts count things, compare sizes against limits, work out percentages, and print reports that people have to read. Bash can do whole-number arithmetic itself, without calling another program, and its `printf` command lines up text and numbers in neat columns. Both have a few rules that catch people out, mostly around decimals and around comparing numbers as if they were text.

By the end you can do integer maths with `$(( ))` and `(( ))`, get decimal results when you need them, compare strings and numbers correctly, change the case of text, and format aligned output with `printf`.

## Arithmetic with $(( ))

**`$(( expression ))`** works out an integer expression and puts the result in its place, the way `$( )` puts in a command's output:

```bash
#!/bin/bash
# maths.sh: integer arithmetic with $(( )).
a=17
b=5
echo "Sum:        $((a + b))"
echo "Difference: $((a - b))"
echo "Product:    $((a * b))"
echo "Quotient:   $((a / b))"
echo "Remainder:  $((a % b))"
echo "Power:      $((b ** 3))"
echo "Mixed:      $(( (a + b) * 2 ))"
```

```bash
root@lab:~/scripts# ./maths.sh
Sum:        22
Difference: 12
Product:    85
Quotient:   3
Remainder:  2
Power:      125
Mixed:      44
```

Inside `$(( ))` you can leave the `$` off variable names, and spaces are allowed anywhere. The usual order of operations applies, and brackets group as you would expect.

Without `$(( ))`, Bash treats `+` as an ordinary character:

```bash
root@lab:~/scripts# a=3; b=4
root@lab:~/scripts# total=$a+$b
root@lab:~/scripts# echo $total
3+4
```

**`%`** is the **modulo** operator: the remainder after dividing. `n % 2` is 0 for even numbers, and `n % 3 == 0` is true for every third number, which is handy for printing progress now and then rather than on every line:

```bash
#!/bin/bash
# every.sh: use % to act on every third item.
for (( n = 1; n <= 10; n++ )); do
    if (( n % 3 == 0 )); then
        echo "Processed $n items"
    fi
done
```

```bash
root@lab:~/scripts# ./every.sh
Processed 3 items
Processed 6 items
Processed 9 items
```

## (( )) for conditions, loops and counters

**`(( expression ))`**, without the `$`, is a command. It works out the expression and succeeds if the result is not zero. That makes it the natural way to compare numbers in `if` and `while`, and it allows C-style `for` loops:

```bash
#!/bin/bash
# disk-warn.sh: compare numbers and count with (( )).
used=$(df --output=pcent / | tail -n 1 | tr -dc '0-9')
limit=80

if (( used >= limit )); then
    echo "Disk is ${used}% full"
else
    echo "Disk is fine at ${used}%, $(( limit - used )) points below the limit"
fi

for (( i = 1; i <= 3; i++ )); do
    echo "Check $i"
done

count=0
(( count++ ))
(( count += 10 ))
echo "Count is $count"
```

```bash
root@lab:~/scripts# ./disk-warn.sh
Disk is fine at 5%, 75 points below the limit
Check 1
Check 2
Check 3
Count is 11
```

Inside `(( ))` you use the familiar symbols `<`, `<=`, `==`, `!=`, `>=` and `>`, which read more easily than `-lt` and `-ge` in `[ ]`. Both work. To change a variable, use `(( count++ ))` to add one, `(( count-- ))` to take one away, and `(( total += n ))` to add any amount.

One trap: because `(( ))` fails when the result is zero, `(( count++ ))` with `count` at 0 returns a failure status, since `count++` gives the old value, 0. That does not matter in a plain script, but it stops a script that uses `set -e`, from the *Robust scripts* topic. `(( count += 1 ))` gives the new value, so it does not have this problem.

You will also meet two older forms in existing scripts:

```bash
root@lab:~/scripts# let count=4+1
root@lab:~/scripts# echo $count
5
root@lab:~/scripts# expr 3 + 4
7
root@lab:~/scripts# expr 3 \* 4
12
```

`let` is the same as `(( ))` with a different spelling. **`expr`** is a separate program from before shells could do maths. It needs spaces around every operator, and `*` has to be escaped, or the shell turns it into a list of file names. Read them when you see them, and write `$(( ))` and `(( ))` yourself.

## Integers only, and getting decimals

Bash arithmetic is **integer only**. Division throws away anything after the point, and a decimal number is an error:

```bash
root@lab:~/scripts# echo $((7 / 2))
3
root@lab:~/scripts# echo $((1.5 + 1))
bash: 1.5 + 1: syntax error: invalid arithmetic operator (error token is ".5 + 1")
```

This catches percentages in particular. `$((3 / 4 * 100))` is 0, because `3 / 4` is already 0 before the multiplication. Multiply first and it is right: `$((3 * 100 / 4))` is 75. That is often enough.

When you need real decimals, hand the sum to **awk**, which is installed everywhere and which the Linux skill's *Pipes and text* topic introduced. Pass values in with `-v` and do the work in a `BEGIN` block, which runs without reading any input:

```bash
root@lab:~/scripts# awk 'BEGIN { printf "%.2f\n", 7 / 2 }'
3.50
root@lab:~/scripts# used=1536; total=2048
root@lab:~/scripts# awk -v u="$used" -v t="$total" 'BEGIN { printf "%.1f%%\n", u / t * 100 }'
75.0%
```

The other common tool is **bc**, a calculator that reads a sum from standard input. It is not in the Ubuntu container, so install it first:

```bash
root@lab:~/scripts# echo "scale=2; 7 / 2" | bc
bash: bc: command not found
root@lab:~/scripts# apt update && apt install -y bc
root@lab:~/scripts# echo "scale=2; 7 / 2" | bc
3.50
```

`scale=2` sets the number of decimal places. Because bc may be missing on a server, awk is the safer choice inside scripts.

One more surprise: Bash reads a number with a leading zero as **octal** (base 8). `08` and `09` are not valid octal, so values like a month from `date +%m` break the arithmetic:

```bash
root@lab:~/scripts# m=08
root@lab:~/scripts# echo $((m + 1))
bash: 08: value too great for base (error token is "08")
root@lab:~/scripts# echo $((10#$m + 1))
9
```

`10#` says "read this in base 10". Use it on any value that might have leading zeros.

## Comparing and changing strings

Numbers and strings are compared differently, and using the wrong kind of comparison gives answers that look right most of the time:

| Comparing | In `[[ ]]` | In `[ ]` | In `(( ))` |
| --- | --- | --- | --- |
| Strings, equal | `==` or `=` | `=` | |
| Strings, sort order | `<` and `>` | `\<` and `\>` | |
| Numbers | `-eq` `-lt` `-gt` … | `-eq` `-lt` `-gt` … | `==` `<` `>` … |

`<` inside `[[ ]]` compares **sort order**, character by character, not size:

```bash
#!/bin/bash
# compare.sh: string comparison against number comparison.
a=10
b=9

if [[ $a < $b ]]; then
    echo "As strings, $a sorts before $b"
fi

if (( a > b )); then
    echo "As numbers, $a is greater than $b"
fi
```

```bash
root@lab:~/scripts# ./compare.sh
As strings, 10 sorts before 9
As numbers, 10 is greater than 9
```

As text, `10` sorts first because its first character, `1`, comes before `9`. Sort order for letters also depends on the system's locale setting. In the container, which uses the plain C locale, every uppercase letter sorts before every lowercase one, so `Banana` comes before `apple`.

In single brackets the mistake is worse. `>` there is not a comparison at all but a redirection, so `[ "$a" > "$b" ]` creates a file called `9` and the test is always true:

```bash
root@lab:~/scripts# cd /tmp
root@lab:/tmp# a=10; b=9
root@lab:/tmp# [ "$a" > "$b" ] && echo "bigger"
bigger
root@lab:/tmp# ls -l 9
-rw-r--r-- 1 root root 0 Oct 25 09:00 9
```

So: compare numbers with `(( ))` or `-gt`, and strings with `==` and `!=`.

Changing case is built in. `${var^^}` gives the value in uppercase, `${var,,}` in lowercase, and `${var^}` with just the first letter in capitals. `${#var}` is the length, from the *Parameter expansion* topic. Lowercasing an answer before comparing it saves checking every spelling:

```bash
#!/bin/bash
# case.sh: change the case of a value.
env="Staging"
echo "Upper: ${env^^}"
echo "Lower: ${env,,}"
name="priya"
echo "First letter: ${name^}"
echo "Length: ${#name}"

read -r -p "Continue? [y/n] " answer
if [[ ${answer,,} == y || ${answer,,} == yes ]]; then
    echo "Continuing"
fi
```

```bash
root@lab:~/scripts# ./case.sh
Upper: STAGING
Lower: staging
First letter: Priya
Length: 5
Continue? [y/n] YES
Continuing
```

## Formatting output with printf

`echo` prints its arguments as they are. **`printf`** takes a **format string** and fills in each `%` placeholder with the next argument, which gives you control over width, alignment and decimal places. Unlike `echo`, it adds no newline unless you put `\n` in the format.

| Placeholder | Prints | Example | Output |
| --- | --- | --- | --- |
| `%s` | A string | `printf "%s\n" web-01` | `web-01` |
| `%d` | An integer | `printf "%d\n" 42` | `42` |
| `%5d` | An integer, right-aligned in 5 characters | `printf "[%5d]\n" 42` | `[   42]` |
| `%05d` | Padded with zeros | `printf "%05d\n" 42` | `00042` |
| `%-10s` | A string, left-aligned in 10 characters | `printf "[%-10s]\n" ab` | `[ab        ]` |
| `%5.2f` | A decimal, 5 characters wide, 2 places | `printf "[%5.2f]\n" 3.14159` | `[ 3.14]` |
| `%%` | A literal `%` | `printf "%d%%\n" 75` | `75%` |

The width is a minimum, so a longer value is never cut. With the same widths on every line, columns line up:

```bash
#!/bin/bash
# table.sh: an aligned table with printf.
printf "%-10s %8s %6s\n" "HOST" "MEMORY" "LOAD"
printf "%-10s %8d %6.2f\n" "web-01" 2048 0.5
printf "%-10s %8d %6.2f\n" "web-02" 4096 1.25
printf "%-10s %8d %6.2f\n" "db-01" 16384 3.141
```

```bash
root@lab:~/scripts# ./table.sh
HOST         MEMORY   LOAD
web-01         2048   0.50
web-02         4096   1.25
db-01         16384   3.14
```

Left-align text and right-align numbers, so the digits line up. Unlike `$(( ))`, `printf` handles decimals itself, so `%6.2f` rounds `3.141` to `3.14`. `%d` does not: `printf "%d" 3.5` gives `invalid number`.

If there are more arguments than placeholders, `printf` reuses the format, which makes printing a list easy:

```bash
root@lab:~/scripts# printf "%s\n" web-01 web-02 db-01
web-01
web-02
db-01
```

Never put a variable in the format string itself. Any `%` in the value is read as a placeholder:

```bash
root@lab:~/scripts# msg="Disk 90% full"
root@lab:~/scripts# printf "$msg\n"
Disk 90 0.000000ull
root@lab:~/scripts# printf "%s\n" "$msg"
Disk 90% full
```

**`printf -v name`** stores the result in a variable instead of printing it, without the cost of a `$( )`:

```bash
root@lab:~/scripts# printf -v padded "%03d" 7
root@lab:~/scripts# echo "backup-$padded.tar"
backup-007.tar
```

## Tasks

### Task 1: A file size report

Write `dir-sizes.sh DIR`, which prints a table of the regular files in a directory: the name left-aligned, the size in bytes right-aligned, and the size in KB to one decimal place. The last line gives the number of files and the totals. Keep the total in bytes with `(( ))`, and use awk for the KB values.

To have something to test with, make a directory with `mkdir data && seq 1 100 > data/small.txt && seq 1 1000 > data/numbers.txt && seq 1 5000 > "data/old notes.txt"`.

<details>
<summary>Check your work</summary>

```bash
#!/bin/bash
# dir-sizes.sh: list the files in a directory with their sizes, and a total.
# Usage: ./dir-sizes.sh DIR

if [ $# -ne 1 ] || [ ! -d "$1" ]; then
    echo "Usage: $0 DIR" >&2
    exit 1
fi

total=0
count=0
printf "%-20s %10s %8s\n" "FILE" "BYTES" "KB"

for f in "$1"/*; do
    [ -f "$f" ] || continue
    bytes=$(stat -c %s "$f")
    kb=$(awk -v b="$bytes" 'BEGIN { printf "%.1f", b / 1024 }')
    printf "%-20s %10d %8s\n" "${f##*/}" "$bytes" "$kb"
    (( total += bytes ))
    (( count += 1 ))
done

total_kb=$(awk -v b="$total" 'BEGIN { printf "%.1f", b / 1024 }')
printf "%-20s %10d %8s\n" "$count files" "$total" "$total_kb"
```

```bash
root@lab:~/scripts# ./dir-sizes.sh data
FILE                      BYTES       KB
numbers.txt                3893      3.8
old notes.txt             23893     23.3
small.txt                   292      0.3
3 files                   28078     27.4
```

The KB column uses `%8s`, because awk has already formatted the number as text. If every KB value shows `0` or `3` and so on with no decimals, you divided with `$(( ))` instead of awk. If `old notes.txt` breaks the table into `old` and `notes.txt`, a variable is missing its quotes.

</details>

### Task 2: Suggest user names

A file `people.txt` has one person per line, first name then last name, in any mix of case:

```
Sam Otieno
priya SHARMA
Alex Morgan-Lee
```

Write `usernames.sh FILE` that suggests a user name for each: the first letter of the first name followed by the last name, all lowercase, letters only, and at most 8 characters. Print an aligned table of the full name, the user name and its length, and a final line with the number of people.

<details>
<summary>Check your work</summary>

```bash
#!/bin/bash
# usernames.sh: suggest a user name for each person in a file.
# Usage: ./usernames.sh FILE   (one "First Last" per line)

if [ $# -ne 1 ]; then
    echo "Usage: $0 FILE" >&2
    exit 1
fi

count=0
printf "%-20s %-10s %s\n" "NAME" "USER" "LENGTH"

while read -r first last; do
    user="${first:0:1}${last}"
    user="${user,,}"
    user="${user//[^a-z]/}"
    user="${user:0:8}"
    printf "%-20s %-10s %d\n" "$first $last" "$user" "${#user}"
    (( count += 1 ))
done < "$1"

printf "%d people\n" "$count"
```

```bash
root@lab:~/scripts# ./usernames.sh people.txt
NAME                 USER       LENGTH
Sam Otieno           sotieno    7
priya SHARMA         psharma    7
Alex Morgan-Lee      amorganl   8
3 people
```

The order of the steps matters: lowercase before removing everything that is not `a` to `z`, or the uppercase letters in `SHARMA` are removed too. `${user:0:1}`, `${user:0:8}` and `${user//[^a-z]/}` are from the *Parameter expansion* topic. If the columns do not line up, check that the header and the rows use the same widths.

</details>

## Quiz

**1. What does this script print?**

```bash
#!/bin/bash
x=7
y=2
echo "$((x / y)) $((x % y))"
printf "%5.1f|%-4s|\n" 3.14159 ab
```

<details>
<summary>Show answer</summary>

```
3 1
  3.1|ab  |
```

`7 / 2` is 3 in integer maths, and the remainder is 1. `%5.1f` rounds to one decimal place and pads to five characters on the left; `%-4s` pads `ab` to four characters on the right.

</details>

**2. A monitoring script on a server has `if [ "$used" > 90 ]; then alert; fi`. It sends an alert every time it runs, even when the disk is nearly empty, and a file called `90` keeps appearing in its working directory. What is wrong?**

<details>
<summary>Show answer</summary>

Inside `[ ]`, `>` is a redirection, not a comparison. The command becomes `[ "$used" ]`, which is true for any non-empty value, with its output sent to a file called `90`. Compare numbers with `if (( used > 90 ))` or `if [ "$used" -gt 90 ]`.

</details>

**3. A report script uses `month=$(date +%m)` and then `$((month - 1))`. It worked from January to July and failed in August with `value too great for base`. Why, and what is the fix?**

<details>
<summary>Show answer</summary>

`date +%m` gives `08` in August, and Bash reads numbers with a leading zero as octal, where 8 and 9 are not valid digits. `01` to `07` happened to work because they mean the same in octal. Force base 10 with `$((10#$month - 1))`.

</details>

**4. You want the percentage of 300 out of 1200 to one decimal place. Why does `$((300 / 1200 * 100))` give 0, and how do you get `25.0`?**

<details>
<summary>Show answer</summary>

Bash arithmetic is integer only, and `300 / 1200` is 0 before the multiplication happens. `$((300 * 100 / 1200))` gives 25, but no decimals. For `25.0`, use awk: `awk -v a=300 -v b=1200 'BEGIN { printf "%.1f\n", a / b * 100 }'`.

</details>

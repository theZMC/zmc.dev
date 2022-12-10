---
title: How to Store Your Dotfiles on GitHub
date: "2022-12-10"
tags: ["dotfiles", "github", "git"]
description: |
  In this article, I will show you how to prepare and store your dotfiles in a git repository and push them to a remote
  repository. I will also show you how to automate the process of linking your dotfiles to their appropriate
  locations via a shell script. Finally, we'll look at how to automate keeping your dotfiles up to date with a cron job.
image:
  url: /massive-machine.png
  alt: AI-generated image of a massive machine with a bunch of workers in the foregound.
layout: ../../layouts/Markdown.astro
---
## What are Dotfiles?
Dotfiles are configuration files that are used to customize your system. Almost always, the dotfiles we refer to have
names that begin with a period, hence the name. Some common examples of dotfiles are `.bashrc`, `.vimrc`, `.gitconfig`,
and `.zshrc`. Putting a period in front of a file name on Unix or Unix-like systems marks the file as **hidden**. The idea
being that a simple `ls` command will not show these files, meaning they won't clutter up your terminal output. However,
in practice, most people use a more advanced invokation of `ls`, such as `ls -a`, which will show all files, including
these *hidden* dotfiles.

## Why Store Your Dotfiles on GitHub?
### The Scenario
Oftentimes, we as developers will create a sort of "nest" for ourselves on our local machines. We'll install our favorite
text editor, our favorite terminal emulator, our favorite shell, and our favorite set of tools. We'll slowly configure these
tools to our liking, adding plugins, changing colors, and tweaking settings. We do this one little tweak at a time, and
before we know it, we have a development environment that is uniquely ours. And most importantly, it's vastly different
from the default settings of these tools.

### The Problem
The problem is we don't stay on the same machine forever. We might get a new job, or we might get a new system, or we might
even have multiple systems we use on a regular basis. In any case, we'll have to recreate our development environment on
each new machine. This can be a tedious process, and it's easy to forget to install a tool or configure a setting. This
can lead to a lot of wasted time and frustration. It's also easy to lose your configuration files if you don't back them
up. This can be a real pain if you've spent a lot of time tweaking your dotfiles to your liking.

### The Solution
The solution is to store your dotfiles in a git repository and push them to a remote repository on GitHub (or some other
remote git repository). This way, you can easily clone your dotfiles to any new machine you use and you can keep your
dotfiles up to date by pushing/pulling to/from your remote repository on a regular basis.

## How It's Done
### Step 1: Create a New Repository
First, you'll need to create a new repository on GitHub (or some other remote git repository). You can call it whatever
you want, but I like to call mine `dotfiles`. You can make it public or private, but I recommend making it private if
you think there's any chance you might now or in the future store sensitive information in your dotfiles.
> **⚠️ NOTE:** I advise against ever storing sensitive information in a git repository, but if you do, make absolutely sure
> you mark your repository as private. Common examples of sensitive information are API keys (like for AWS or Digital Ocean),
> SSH keys, and passwords.

### Step 2: Clone Your Repository
Next, you'll need to clone your repository to your local machine.
I like to keep my dotfile directory in my home directory, but you can clone it to wherever you want. Another common convention
on linux systems is to store configuration files in a directory called `.config`. Wherever you decide to clone your
repository, make sure you remember where you put it. For this example, I'll assume you cloned your repo to
your home directory in a directory called `dotfiles`.
```bash
cd ~
git clone <your-repo-url> dotfiles
```

### Step 3: Create/Copy Your Dotfiles
Now that you have your repository cloned, you'll need to create or copy your dotfiles into the repository. For this
example, I'll assume you have a `.vimrc` file in your home directory. You can create a new file or copy an existing one
into your repository.
```bash
cp ~/.vimrc ~/dotfiles
```
To automate this process, we can use a simple bash for loop.
```bash
for file in .bashrc .vimrc .gitconfig; do cp ~/$file ~/dotfiles; done
```
Just make sure you replace the list of files with the files you want to copy. You can also use wildcards to copy all files
that match a pattern. For example, to copy all files that begin with a period, you could use the following command.
```bash
cp ~/.* ~/dotfiles
```

### Step 4: Create a Shell Script to Link Your Dotfiles
Now that you have your dotfiles in your repository, you'll need to create a shell script to link them to their appropriate
locations. For example, you'll need to link your `.vimrc` file to `~/.vimrc`. You can do this manually, but it's much easier
to automate it with a shell script. I call mine `setup.sh`, but you can call yours whatever you want. It will live in
your dotfiles repository, so it can be easily run anytime you clone your repository to a new machine. Create a new file
called `setup.sh` in your dotfiles repository and add the following code:
```bash
#!/usr/bin/env bash

# Create symlinks for dotfiles
ln -sf ~/dotfiles/.bashrc ~/
ln -sf ~/dotfiles/.vimrc ~/
ln -sf ~/dotfiles/.gitconfig ~/
```
> **ℹ What this script does:** Creates a symlink for each file listed in the for loop. A symlink is a special type of
> file that points to another file. In this case, the symlink points to the file in your dotfiles repository. This way,
> when you make changes to your dotfiles, you can push them to your remote repository and they will be available on
> all of your machines.
> The `-s` flag tells the `ln` command to create a symbolic link. The `-f` flag tells the `ln` command to overwrite
> any existing files or symlinks. If you don't use the `-f` flag, the `ln` command will fail if the file or symlink
> already exists.

### Step 5: Run Your Shell Script
Now that you have your shell script, you can run it to create symlinks for your dotfiles. But before we can run it, we'll need
to make it executable:
```bash
chmod +x ~/dotfiles/setup.sh
```
Now we can run it with the following command:
```bash
~/dotfiles/setup.sh
```
And check to make sure the symlinks were created:
```bash
ls -la ~/.vimrc
```
You should see something similar to:
```
lrwxrwxrwx 1 user user 17 Sep  1 12:00 .vimrc -> /home/user/.vimrc
```
> **ℹ What this output means:** The `l` at the beginning of the line indicates that this is a symlink and the arrow indicates
> which file the symlink points to.
Awesome! Now any time you change your dotfiles in your home directory, your git repository will be know about it and
track the changes.

### Step 6: Commit and Push Your Changes
Now that you have your dotfiles in your repository and you've created symlinks for them, you can commit and push your changes.
```bash
cd ~/dotfiles
git add .
git commit -m "added dotfiles; added setup.sh"
git push
```
> **⚠️ NOTE:** If you're using a private repository, you'll need to add your SSH key to your GitHub account. You can find
> instructions for doing this [here](https://help.github.com/articles/adding-a-new-ssh-key-to-your-github-account/).

### Step 7: Clone Your Repository to a New Machine
Now that you have your dotfiles in a remote repository, you can clone them to a new machine. Just make sure you run your
shell script to create symlinks for your dotfiles.
```bash
cd ~
git clone <your-repo-url> dotfiles
~/dotfiles/setup.sh
```

## How to Keep Your Dotfiles Synced
The last topic we'll explore is how to keep your dotfiles synced between your local machine and your remote repository.
This can be done manually, but it's going to be a lot easier and less error prone if you automate it, so that's what we'll
do. There are a few different ways to automate this process, but I'll show you how to do it with one of the oldest and most
reliable automation tools: cron.

### What is Cron?
Cron is a time-based job scheduler that runs commands at specified intervals. It's been around since the 1970s and is
still used today. It's a great tool for automating tasks that need to be run on a regular basis. For example, you can use
cron to automatically back up your database every night at 2am.

### How to Use Cron
Cron is a system service that runs in the background on POSIX-based systems (Linux, Mac, etc.). It's configured by editing
a file called a `crontab`. You can edit your user's crontab with the following command:
```bash
crontab -e
```
This will open your crontab in your default text editor. You can also use the `-l` flag to list your crontab or the `-r`
flag to remove your crontab. You can find more information about cron [here](https://en.wikipedia.org/wiki/Cron).

### How to Use Cron to Sync Your Dotfiles
Now that you know what cron is and how to use it, we can use it to sync our dotfiles. We'll be creating a new shell script
that we'll run via cron every 30 minutes. This script will pull any changes from our remote repository
and push any changes from our local repository. Create a new file called `sync.sh` in your `dotfiles` repository and add
the following code:
```bash
#!/usr/bin/env bash

# Pull changes from remote repository
git pull

# Add any new files
git add .

# Create a commit message
msg="synced dotfiles $(date)"

# Commit changes
git commit -m "$msg"

# Push changes to remote repository
git push
```

Now we need to make this script executable:
```bash
chmod +x ~/dotfiles/sync.sh
```
And we'll need to push our changes to our remote repository. Luckily, we just created a script to do that for us!
```bash
~/dotfiles/sync.sh
```
Now we can add a cron job to run our script every 30 minutes. Open your crontab with the following command:
```bash
crontab -e
```
And add the following line to the bottom of the file:
```
*/30 * * * * ~/dotfiles/sync.sh
```
> **ℹ What this line does:** Runs the `sync.sh` script every 30 minutes. You can read more about cron syntax [here](https://en.wikipedia.org/wiki/Cron#CRON_expression).

### Disclaimer
Using cron to constantly push and pull to your repo is a great way to keep your dotfiles synced, but it's not perfect. If you're constantly fiddling
with your dotfiles on multiple machines, you may run into merge conflicts. If and when this happens, you'll need to resolve the
conflicts manually. You can do this by pulling your changes from your remote repository, resolving the conflicts, and
pushing your changes back to your remote repository, but it's definitely a hassle. It's up to you to decide if the
convenience of having your dotfiles synced is worth the hassle of resolving merge conflicts since it's largely dependent
on how often you're making changes.

## Conclusion
In this tutorial, we learned how to use Git to manage our dotfiles. We also learned how to create a shell script to
automatically create symlinks for our dotfiles and how to use cron to automatically sync our dotfiles between our local
machine and our remote repository. Thanks for reading! If you have any questions or comments, feel free to reach out to me
at [zach@zmc.dev](mailto:zach@zmc.dev). Thank you!
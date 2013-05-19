---
layout: default
title: Installation
---

# Installation

Jump straight to:
[Osx](#osx) - [Windows](#windows) - [Linux](#linux)

Installing Htpc Manager can be really easy but might also cause some problems. The main requirement is you run Python. Python 2.7 is in most cases the way to go. The difficult part is installing the Python Image Library.

### Python Image Library
The Python Image Library or PIL, is used to convert and resize images retrieved from the Xbmc Api. Installing PIL is, depending on your OS, not so easy. This guide should help you with it. If you do not use Xbmc or do not want the images, you can skip the installation of PIL and you only need Python.

#### OS specific guides
[Osx](#osx) - [Windows](#windows) - [Linux](#linux)

## General usage
From the commandline you can run Htpc Manager with a few options to configure it's behavior.

#### Basic:
{% highlight text %}
python Htpc.py
{% endhighlight %}

#### Options:
Parameter | Description                   | Default value
--------- | ----------------------------- | --------
debug     | Run in debug mode             | none
daemon    | Daemonize process             | none
port      | Listen on specific port       | 8085
db        | Use a custom database         | none
datadir   | Set the datarirectory         | none
host      | Use a specific host/IP        | None/any
pid       | Location to generate pid file | false


##### Combine any of the options on the commandline

{% highlight text %}
python Htpc.py --debug --port 8089
{% endhighlight %}

## OSX

By default, Osx comes with Python 2.7 pre-installed. Great! No need to install Pyton manually! If you want, you can already [start using](#general_usage) Htpc Manager.

### Image library
The Python Image Library needs to be installed on your system to convert images provided by xbmc. To do this, the commandline tools from Xcode are needed to compile PIL.

1. #### Install Xcode from the [AppStore](https://itunes.apple.com/en/app/xcode/id497799835)
2. #### From Xcode, install commandline tools.
        Xcode -> preferences -> Download -> install commandline tools

3. #### Install macports jpeg and png support.
Download and install the [Mac Ports](http://ethan.tira-thompson.com/Mac_OS_X_Ports.html) combo installer. This is used to enable jpeg and png support for PIL.

4. #### Open up the Terminal to install and compile PIL.
        sudo easy_install pip
        sudo pip install PIL


You should now be ready to go. Take a look at the [usage](#general_usage) to get you started.

## Windows
```Windows install guide comming soon```

## Linux
```Linux install guide comming soon```
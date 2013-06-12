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
Parameter | Description                        | Default value
--------- | ---------------------------------- | --------
debug     | Run in debug mode                  | none
daemon    | Daemonize process                  | none
port      | Listen on specific port            | 8085
db        | Use a custom database              | none
datadir   | Set the datarirectory              | none
host      | Use a specific host/IP             | None/any
pid       | Location to generate pid file      | false
webdir    | Mount Htpc Manager on a custom url | /


##### Combine any of the options on the commandline

{% highlight text %}
python Htpc.py --debug --port 8089
{% endhighlight %}

## OSX

By default, Osx comes with Python 2.7 pre-installed. Great! No need to install Pyton manually! If you want, you can already [start using](#general_usage) Htpc Manager.

### Python Image library
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

Installing Python on windows requires multiple steps, follow them carefully and you should be ok. Depending on your system you can use python 32 or 64 bits.

1. #### Download Python 2.7 from [python.org](http://www.python.org/download/)
Depending on your version of Windowns you can choose the ```Python 2.7.5 Windows Installer``` or the ```Python 2.7.5 Windows X86-64 Installer```.

2. #### Install Python 2.7
Run your newly downloaded Python installer. Follow the instructions. Do not change the install directory, but keep it at "C:\Python27\\" as we will be refering to it later on.

2. #### Add python executable to system path
To run ```python``` from anywhere on the commandline, instead of ```C:\Python27\python.exe```, we add python directory to the system path. Open up the "Environment variables" *[as described here](http://www.howtogeek.com/118594/how-to-edit-your-system-path-for-easy-command-line-access/)*.

    1. Create a new System variable, name it ```PYTHONPATH``` and add the following line:
    ```C:\Python27;C:\Python27\Lib;C:\Python27\DLLs;C:\Python27\Lib\lib-tk;C:\Python27\Scripts```
    2. Open the system variable named ```path```
    3. At the end of the line add a semicolon (;) if it is not already there.
    4. After the ';' sign, add ```%PYTHONPATH%```

Python is now installed and can be used from the commandline by typing ```python```. Take a look at the [usage](#general_usage) to get you started or continue to install PIL and benefit from all the Htpc Manager features.


### Python Image library
Installing PIL on windows can be diffucult. Most downloads require the installation of visual studio so PIL can be compiled on your system. I used a precompiled version of PIL for windows.

1. #### Download the precompiled PIL installer
    * [Python 2.7 x64](https://mega.co.nz/#!8sUimBZY!NmMElxyKpCsVW9iN1AXzPhyiAIEQvTxtYHjwsL2JUVE)
    * Python 2.7 32 bit comming soon!
2. #### Install PIL
Execute your downloaded PIL installer and follow the instructions to complete the PIL install.

If everything went well, the Python Image Library is now installed. All images retieved from Xbmc should now show up nicely.

## Linux
```Linux install guide comming soon```

#Configuration

## Reverse proxy
Htpc Manager supports the use of a reverse proxy. To use a reverse proxy Htpc Manager must run on a different webdir. By default Htpc Manager runs on it's ow port, in the root. If you want to use a reverse proxy you might want to set the webdir to /htpc. In the settings you can configure a custom webdir/basepath (restart required).

A second option is to set the webdir from the commandline with the "webdir" parameter. ```Htpc.py --webdit "/htpc"```

From then on Htpc Manager rund on *localhost:8085/htpc*

If you use apache, this vhost config might help you get started. Remeber to activate mod_proxy for apache.

{% highlight bash %}
<VirtualHost *:80>
  ServerName localhost
  ServerAlias 127.0.0.1

  ProxyPreserveHost on

  ##    htpc manager
  <Location /htpc>
    order deny,allow
    deny from all
    allow from all
    ProxyPass http://192.168.2.30:8085/htpc
    ProxyPassReverse http://192.168.2.30:8085/htpc
  </Location>
</VirtualHost>
{% endhighlight %}

**Keep in mind to add the '/htpc' on the Location-tag *and* in the ProxyPass and ProxyPassReverse settings.**

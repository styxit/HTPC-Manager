This is HTPC Manager the way I want it.

Some of the differences are:

#### [New modules]
- Sonarr
- Headphones
- Samsung TV remote
- SickRage module
- Torrent search (BTN, Norbits, KAT and YTS)
- vnStat

#### [Improvements]
- NZBGet module (rewritten)
- qBittorrent module
- Transmission (add url, upload local torrent)
- SABnzbd (drag'n drop to edit que)
- Stats module is sortable.
- CouchPotato
- KODI/XBMC addons tab, where you can search/execute/enable/disable addons and a volume slider instead of a progress bar
- Send a nzb from NZB search to NZBGet in addition to SABnzbd.
- Set wanted category while adding movies in CouchPotato

#### [Misc]
- Notification if a update is available and autoupdate
- Htpc manager is now fluid. (Looks much better on high res screens)
- Delete cache folder from the settings page
- The brave and bold can choose which branch they want to use.
- Added a option for robots.txt for bot crawlers
- Make ssl cert and key automatically if you don't add a path for it
- Mask sensitive stuff from the log (username, apikey, password etc)
- Reduced size on static files
- Docker support
- Various fixes
- Added argsparse (to support python 2.6)



If you're missing something don't be afraid to make a request :)

See here for full list:
https://github.com/Hellowlol/HTPC-Manager/compare/styxit:master...master2

#### SO YOU FOUND A BUG? GREAT!
INCLUDE THIS IN YOUR ISSUE:
 - Branch
 - Commit hash
 - Your operating system and python version
 - What did you do?
 - What happened?
 - What did you expect to happen?
 - If it's a visual bug, screenshot or it didn't happen!
 - Which browser, including version
 - Link to a copy/paste of your logfile with clear debug info of the error on [PASTEBIN](http://www.pastebin.com)

#### How to enable detailed logs
1. Shutdown HTPC Manager
2. Start Htpc.py --loglevel debug (Do NOT start with --debug)
3. Start HTPC Manager and wait for error to occur again

HTPC Manager
=====

A python based web application to manage the software on your HTPC. HTPC Manager combines all your favorite software into one slick interface. See [http://htpc.io](http://htpc.io).

![Screenshot](http://htpc.io/img/screenshots/dashboard.png)


## See full installation instructions at [htpc.io](http://htpc.io/)

Requires Python 2.6 or 2.7

Start with ```python Htpc.py```

Hellowlol HTPC Manager fork [![Donate](https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=U3BELJYUPR95U)

[![Join the chat at https://gitter.im/Hellowlol/HTPC-Manager](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/Hellowlol/HTPC-Manager?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

=====
A python based web application to manage the software on your HTPC. HTPC Manager combines all your favorite software into one slick interface.
![Screenshot](http://i.imgur.com/6QEWPFf.png)

Requires Python 2.6 or 2.7

Start with ```python Htpc.py```


#### [New modules]
- Sonarr
- Headphones
- Samsung TV remote
- SickRage module
- Torrent search (BTN, Norbits, KAT, rarbg, PTP and YTS)
- vnStat
- Mylar

### [Modules]
- Couchpotato
- Deluge
- kodi
- NZBGet
- Plex
- qBittorrent
- SABnzbd
- nzb search (newznab)
- Sickbeard
- squeezebox
- Stats
- Transmission
- Tvheadend
- uTorrent

#### [Improvements]
- Pretty much every module has been improved in some way or another
- NZBGet module (rewritten)
- qBittorrent module (rewritten)
- Transmission (add url, upload local torrent)
- SABnzbd (drag & drop to edit queue)
- Stats module (Hardware info, S.M.A.R.T report)
- CouchPotato
- Plex
- KODI/XBMC addons tab, where you can search/execute/enable/disable addons and a volume slider instead of a progress bar
- Send a nzb from NZB search to NZBGet in addition to SABnzbd.

#### [Misc]
- Notification if a update is available and autoupdate
- Htpc manager is now fluid. (Looks much better on high res screens)
- Delete cache folder from the settings page
- The brave and bold can choose which branch they want to use.
- Added a option for robots.txt for bot crawlers
- Make ssl cert and key automatically if you don't add a path for it
- Mask sensitive stuff from the log (username, api key, password etc)
- Reduced size on static files
- Docker support
- Various fixes
- Download log
- Added argsparse (to support python 2.6)

If you're missing something don't be afraid to make a request :)

See here for full list:
https://github.com/Hellowlol/HTPC-Manager/compare/styxit:master...master2

#### SO YOU FOUND A BUG? GREAT!

Before you open a new issue, make sure you:
- Check if this issue has been solved before
- Are using the master2 branch (all other branches should be considered experimental)
- Update to the lastest version
- Have restart HTPC Manager

If you still have problems: INCLUDE THIS IN YOUR ISSUE
 - Screenshot of the about page
 - What did you do?
 - What happened?
 - What did you expect to happen?
 - If it's a visual bug, screenshot or it didn't happen!
 - Which browser, including version
 - Link to a copy/paste of your ENTIRE logfile (with loglevel debug!), please write the linenumber where the error occured [PASTEBIN](http://www.pastebin.com) NO logs == NO help

#### How to enable detailed logs
1. Shutdown HTPC Manager
2. Start Htpc.py --loglevel debug (Do NOT start with --dev)
3. Start HTPC Manager and wait for error to occur again/reproduce it



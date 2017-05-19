#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
This is the main executable of HTPC Manager. It parses the
command line arguments, sets globals variables and calls the
start function to start the server.
"""
import os
import sys
import htpc
import webbrowser
import locale
import logging


def parse_arguments():
    """ Get variables from commandline """
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--datadir', default=None,
                        help='Set the datadirectory')
    parser.add_argument('--db', default=None,
                        help='Use a custom database')
    parser.add_argument('--host', default=None,
                        help='Use a specific host/IP')
    parser.add_argument('--port', type=int,
                        help='Use a specific port')
    parser.add_argument('--shell', action='store_true', default=False,
                        help='This argument has has been deprecated')
    parser.add_argument('--daemon', action='store_true', default=False,
                        help='Daemonize process')
    parser.add_argument('--pid', default=False,
                        help='Generate PID file at location')
    parser.add_argument('--debug', action='store_true', default=False,
                        help='This parameter has been deprecated')
    parser.add_argument('--dev', action='store_true', default=False,
                        help='Used while developing, prints debug messages uncensored, autoreload etc')
    parser.add_argument('--openbrowser', action='store_true', default=False,
                        help='Open the browser on server start')
    parser.add_argument('--webdir', default=None,
                        help='Use a custom webdir')
    parser.add_argument('--resetauth', action='store_true', default=False,
                        help='Resets the username and password to HTPC Manager')
    parser.add_argument('--loglevel',
                        help='Set a loglevel. Allowed values: debug, info, warning, error, critical')
    parser.add_argument('--nocolor', action='store_true', default=False,
                        help='Disable colored terminal text')
    return parser.parse_args()


def load_modules():
    """ Import the system modules """
    from htpc.root import Root
    htpc.ROOT = Root()
    from htpc.settings import Settings
    htpc.ROOT.settings = Settings()
    from htpc.log import Log
    htpc.ROOT.log = Log()
    from htpc.updater import Updater
    htpc.ROOT.update = Updater()

    # Import all modules.
    from modules.kodi import Kodi
    htpc.ROOT.kodi = Kodi()
    from modules.sabnzbd import Sabnzbd
    htpc.ROOT.sabnzbd = Sabnzbd()
    from modules.couchpotato import Couchpotato
    htpc.ROOT.couchpotato = Couchpotato()
    from modules.sickbeard import Sickbeard
    htpc.ROOT.sickbeard = Sickbeard()
    from modules.transmission import Transmission
    htpc.ROOT.transmission = Transmission()
    from modules.deluge import Deluge
    htpc.ROOT.deluge = Deluge()
    from modules.squeezebox import Squeezebox
    htpc.ROOT.squeezebox = Squeezebox()
    from modules.newznab import Newznab
    htpc.ROOT.newznab = Newznab()
    from modules.utorrent import UTorrent
    htpc.ROOT.utorrent = UTorrent()
    from modules.nzbget import NZBGet
    htpc.ROOT.nzbget = NZBGet()
    from modules.qbittorrent import Qbittorrent
    htpc.ROOT.qbittorrent = Qbittorrent()
    from modules.stats import Stats
    htpc.ROOT.stats = Stats()
    from modules.tvheadend import TVHeadend
    htpc.ROOT.tvheadend = TVHeadend()
    from modules.torrentsearch import Torrentsearch
    htpc.ROOT.torrentsearch = Torrentsearch()
    from modules.plex import Plex
    htpc.ROOT.plex = Plex()
    from modules.users import Users
    htpc.ROOT.users = Users()
    from modules.sonarr import Sonarr
    htpc.ROOT.sonarr = Sonarr()
    from modules.radarr import Radarr
    htpc.ROOT.radarr = Radarr()
    from modules.sickrage import Sickrage
    htpc.ROOT.sickrage = Sickrage()
    from modules.samsungtv import Samsungtv
    htpc.ROOT.samsungtv = Samsungtv()
    from modules.vnstat import Vnstat
    htpc.ROOT.vnstat = Vnstat()
    from modules.headphones import Headphones
    htpc.ROOT.headphones = Headphones()
    from modules.mylar import Mylar
    htpc.ROOT.mylar = Mylar()
    from modules.rtorrent import RTorrent
    htpc.ROOT.rtorrent = RTorrent()
    from modules.plexpy import Plexpy
    htpc.ROOT.plexpy = Plexpy()

def init_sched():
    from apscheduler.schedulers.background import BackgroundScheduler
    htpc.SCHED = BackgroundScheduler()
    htpc.SCHED.start()


def main():
    """
    Main function is called at startup.
    """
    # Parse runtime arguments
    args = parse_arguments()

    # Set root and insert bundled libraies into path
    htpc.RUNDIR = os.path.dirname(os.path.abspath(sys.argv[0]))
    sys.path.insert(0, os.path.join(htpc.RUNDIR, 'libs'))

    try:
        locale.setlocale(locale.LC_ALL, "")
        htpc.SYS_ENCODING = locale.getpreferredencoding()
    except (locale.Error, IOError):
        pass

    # for OSes that are poorly configured I'll just force UTF-8
    if not htpc.SYS_ENCODING or htpc.SYS_ENCODING in ('ANSI_X3.4-1968', 'US-ASCII', 'ASCII'):
        htpc.SYS_ENCODING = 'UTF-8'

    if not hasattr(sys, "setdefaultencoding"):
            reload(sys)

    # python 2.7.9 verifies certs by default. This disables it
    if sys.version_info >= (2, 7, 9):
        import ssl
        ssl._create_default_https_context = ssl._create_unverified_context

    # Set datadir, create if it doesn't exist and exit if it isn't writable.
    htpc.DATADIR = os.path.join(htpc.RUNDIR, 'userdata')
    if args.datadir:
        htpc.DATADIR = args.datadir
    if not os.path.isdir(htpc.DATADIR):
        os.makedirs(htpc.DATADIR)
    if not os.access(htpc.DATADIR, os.W_OK):
        sys.exit("No write access to userdata folder")

    htpc.SCRIPTDIR = os.path.join(htpc.DATADIR, 'scripts')

    if not os.path.isdir(htpc.SCRIPTDIR):
        os.makedirs(htpc.SCRIPTDIR)

    from mako.lookup import TemplateLookup

    # Enable dev mode if needed
    htpc.DEV = args.dev

    # Set default database and overwrite if supplied through commandline
    htpc.DB = os.path.join(htpc.DATADIR, 'database.db')
    if args.db:
        htpc.DB = args.db

    # Load settings from database
    from htpc.settings import Settings
    htpc.settings = Settings()

    # Set default loglevel
    htpc.LOGLEVEL = htpc.settings.get('app_loglevel', 'info')
    if args.loglevel:
        htpc.LOGLEVEL = args.loglevel.lower()
        htpc.settings.set('app_loglevel', args.loglevel.lower())

    # Check for SSL
    htpc.USE_SSL = htpc.settings.get('app_use_ssl')
    htpc.SSLCERT = htpc.settings.get('app_ssl_cert')
    htpc.SSLKEY = htpc.settings.get('app_ssl_key')

    htpc.WEBDIR = htpc.settings.get('app_webdir', '/')
    if args.webdir:
        htpc.WEBDIR = args.webdir

    if not htpc.WEBDIR.startswith('/'):
        htpc.WEBDIR = '/' + htpc.WEBDIR
    if not htpc.WEBDIR.endswith('/'):
        htpc.WEBDIR += '/'

    htpc.TEMPLATE = os.path.join(htpc.RUNDIR, 'interfaces/',
                                 htpc.settings.get('app_template', 'default'))
    htpc.LOOKUP = TemplateLookup(directories=[os.path.join(htpc.TEMPLATE, 'html/')])

    # Overwrite host setting if supplied through commandline
    htpc.HOST = htpc.settings.get('app_host', '0.0.0.0')
    if args.host:
        htpc.HOST = args.host

    # Overwrite port setting if supplied through commandline
    htpc.PORT = int(htpc.settings.get('app_port', 8085))
    if args.port:
        htpc.PORT = args.port

    htpc.USERNAME = htpc.settings.get('app_username')
    htpc.PASSWORD = htpc.settings.get('app_password')

    # Is used for hiding logout in the menu
    if htpc.USERNAME and htpc.PASSWORD:
        htpc.AUTH = True
    else:
        htpc.AUTH = False

    # Resets the htpc manager password and username
    if args.resetauth:
        htpc.USERNAME = htpc.settings.set('app_username', '')
        htpc.PASSWORD = htpc.settings.set('app_password', '')

    htpc.NOCOLOR = args.nocolor

    # Open webbrowser
    if args.openbrowser or htpc.settings.get('openbrowser') and not htpc.DEV:
        browser_ssl = 's' if htpc.SSLCERT and htpc.SSLKEY and htpc.settings.get('app_use_ssl') else ''
        if htpc.settings.get('app_host') == '0.0.0.0':
            browser_host = 'localhost'
        else:
            browser_host = htpc.settings.get('app_host', 'localhost')
        openbrowser = 'http%s://%s:%s%s' % (browser_ssl, str(browser_host), htpc.PORT, htpc.WEBDIR[:-1])
        webbrowser.open(openbrowser, new=2, autoraise=True)

    # Select if you want to control processes and open from HTPC Manager
    htpc.SHELL = args.shell

    # Select whether to run as daemon
    htpc.DAEMON = args.daemon

    # Set Application PID
    htpc.PID = args.pid

    # Initialize Scheduler
    init_sched()

    # Inititialize root and settings page
    load_modules()

    logger = logging.getLogger('root')
    if args.debug:
        logger.warning('Commandline parameter --debug has been deprecated')
    if args.shell:
        logger.warning('Shell parameter --shell has been deprecated')

    htpc.ARGS = sys.argv

    # Start the server
    from htpc.server import start
    start()

if __name__ == '__main__':
    main()

#!/usr/bin/env python
# -*- coding: utf-8 -*-A
"""
This is the main executable of HTPC Manager. It parses the
command line arguments, sets globals variables and calls the
start function to start the server.
"""
import os
import sys
import htpc


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
    parser.add_argument('--daemon', action='store_true', default=False,
                        help='Daemonize process')
    parser.add_argument('--pid', default=False,
                        help='Generate PID file at location')
    parser.add_argument('--debug', action='store_true', default=False,
                        help='Print debug text')
    parser.add_argument('--webdir', default="/",
                        help='Use a custom webdir')
    return parser.parse_args()


def load_modules():
    """ Import the system modules """
    from htpc.root import Root
    htpc.ROOT = Root()
    from htpc.settings import Settings
    htpc.ROOT.settings = Settings()
    from htpc.updater import Updater
    htpc.ROOT.update = Updater()
    from modules.xbmc import Xbmc
    htpc.ROOT.xbmc = Xbmc()
    from modules.sabnzbd import Sabnzbd
    htpc.ROOT.sabnzbd = Sabnzbd()
    from modules.couchpotato import Couchpotato
    htpc.ROOT.couchpotato = Couchpotato()
    from modules.sickbeard import Sickbeard
    htpc.ROOT.sickbeard = Sickbeard()
    from modules.squeezebox import Squeezebox
    htpc.ROOT.squeezebox = Squeezebox()
    from modules.search import Search
    htpc.ROOT.search = Search()


def main():
    """
    Main function is called at startup.
    """

    # Set root and insert bundled libraies into path
    htpc.RUNDIR = os.path.dirname(os.path.abspath(sys.argv[0]))
    sys.path.insert(0, os.path.join(htpc.RUNDIR, 'libs'))

    from sqlobject import connectionForURI, sqlhub
    from mako.lookup import TemplateLookup

    args = parse_arguments()

    # Set datadir, create if it doesn't exist and exit if it isn't writable.
    htpc.DATADIR = os.path.join(htpc.RUNDIR, 'userdata/')
    if args.datadir:
        htpc.DATADIR = args.datadir
    if not os.path.isdir(htpc.DATADIR):
        os.makedirs(htpc.DATADIR)
    if not os.access(htpc.DATADIR, os.W_OK):
        sys.exit("No write access to datadir")

    # Set default database and overwrite if supplied through commandline
    htpc.DB = os.path.join(htpc.DATADIR, 'database.db')
    if args.db:
        htpc.DB = args.db
    # Initiate database connection
    sqlhub.processConnection = connectionForURI('sqlite:' + htpc.DB)

    htpc.WEBDIR = "/"    
    if args.webdir:
        htpc.WEBDIR = args.webdir

    # Inititialize root and settings page
    load_modules()

    # Load settings from database
    from htpc.settings import Settings
    settings = Settings()

    htpc.TEMPLATE = os.path.join('interfaces/',
                                 settings.get('app_template', 'default'))
    htpc.LOOKUP = TemplateLookup(directories=[htpc.TEMPLATE])

    # Overwrite host setting if supplied through commandline
    htpc.HOST = settings.get('app_host', '0.0.0.0')
    if args.host:
        htpc.HOST = args.host

    # Overwrite port setting if supplied through commandline
    htpc.PORT = int(settings.get('app_port', 8085))
    if args.port:
        htpc.PORT = args.port

    htpc.USERNAME = settings.get('app_username')
    htpc.PASSWORD = settings.get('app_password')

    htpc.DAEMON = False
    if args.daemon and sys.platform != 'win32':
        htpc.DAEMON = True

    htpc.PID = False
    if args.pid:
        htpc.PID = args.pid

    htpc.DEBUG = False
    if args.debug:
        htpc.DEBUG = True

    from htpc.server import start
    start()

if __name__ == '__main__':
    main()

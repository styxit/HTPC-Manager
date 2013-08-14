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
    parser.add_argument('--webdir', default=None,
                        help='Use a custom webdir')
    parser.add_argument('--loglevel', default='error',
                        help='Set a loglevel. Allowed values: debug, info, warning, error, critical')
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
    from modules.xbmc import Xbmc
    htpc.ROOT.xbmc = Xbmc()
    from modules.sabnzbd import Sabnzbd
    htpc.ROOT.sabnzbd = Sabnzbd()
    from modules.couchpotato import Couchpotato
    htpc.ROOT.couchpotato = Couchpotato()
    from modules.sickbeard import Sickbeard
    htpc.ROOT.sickbeard = Sickbeard()
    from modules.transmission import Transmission
    htpc.ROOT.transmission = Transmission()
    from modules.squeezebox import Squeezebox
    htpc.ROOT.squeezebox = Squeezebox()
    from modules.search import Search
    htpc.ROOT.search = Search()


def main():
    """
    Main function is called at startup.
    """
    # Parse runtime arguments
    args = parse_arguments()

    # Set root and insert bundled libraies into path
    htpc.RUNDIR = os.path.dirname(os.path.abspath(sys.argv[0]))
    sys.path.insert(0, os.path.join(htpc.RUNDIR, 'libs'))

    # Set datadir, create if it doesn't exist and exit if it isn't writable.
    htpc.DATADIR = os.path.join(htpc.RUNDIR, 'userdata/')
    if args.datadir:
        htpc.DATADIR = args.datadir
    if not os.path.isdir(htpc.DATADIR):
        os.makedirs(htpc.DATADIR)
    if not os.access(htpc.DATADIR, os.W_OK):
        sys.exit("No write access to userdata folder")

    from mako.lookup import TemplateLookup

    # Enable debug mode if needed
    htpc.DEBUG = args.debug

    # Set loglevel
    htpc.LOGLEVEL = args.loglevel.lower()

    # Set default database and overwrite if supplied through commandline
    htpc.DB = os.path.join(htpc.DATADIR, 'database.db')
    if args.db:
        htpc.DB = args.db

    # Load settings from database
    from htpc.settings import Settings
    htpc.settings = Settings()

    # Check for SSL
    htpc.SSLCERT = htpc.settings.get('app_ssl_cert')
    htpc.SSLKEY = htpc.settings.get('app_ssl_key')

    htpc.WEBDIR = htpc.settings.get('app_webdir', '/')
    if args.webdir:
        htpc.WEBDIR = args.webdir
    if not(htpc.WEBDIR.endswith('/')):
        htpc.WEBDIR += '/'

    # Inititialize root and settings page
    load_modules()

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

    # Select wether to run as daemon
    htpc.DAEMON = args.daemon

    # Set Application PID
    htpc.PID = args.pid

    # Start the server
    from htpc.server import start
    start()

if __name__ == '__main__':
    main()

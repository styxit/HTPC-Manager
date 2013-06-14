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
import logging

logger = None

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
    return parser.parse_args()


def load_modules():
    """ Import the system modules """
    logger.debug("Importing System modules.")
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

    #Initialize the logger
    global logger 
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    logfh = logging.FileHandler('htpc_manager.log')
    logfh.setLevel(logging.INFO)
    logch = logging.StreamHandler()
    logch.setLevel(logging.INFO)
    logformatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    logfh.setFormatter(logformatter)
    logch.setFormatter(logformatter)
    logger.addHandler(logfh)
    logger.addHandler(logch)
    logger.info("Starting HTPC-Manager.")
    
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
        logger.error("Cannot write to datadir " + htpc.DATADIR)
        sys.exit("No write access to datadir")

    # Set default database and overwrite if supplied through commandline
    htpc.DB = os.path.join(htpc.DATADIR, 'database.db')
    if args.db:
        htpc.DB = args.db
        logger.info("Connecting to database " + htpc.DB)
    # Initiate database connection
    sqlhub.processConnection = connectionForURI('sqlite:' + htpc.DB)

    # Load settings from database
    from htpc.settings import Settings
    settings = Settings()

    htpc.WEBDIR = settings.get('app_webdir', '/')
    if args.webdir:
        htpc.WEBDIR = args.webdir
        logger.info("Using context root " + htpc.WEBDIR)
    if not(htpc.WEBDIR.endswith('/')):
        htpc.WEBDIR += '/'

    # Inititialize root and settings page
    load_modules()

    htpc.TEMPLATE = os.path.join(htpc.RUNDIR, 'interfaces/',
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

    logger.info("Starting on " + htpc.HOST + ":" +  str(htpc.PORT))
    htpc.USERNAME = settings.get('app_username')
    htpc.PASSWORD = settings.get('app_password')

    htpc.DAEMON = False
    if args.daemon and sys.platform != 'win32':
        logger.info("Setting up as a daemon.")
        htpc.DAEMON = True
    
    if args.daemon and sys.platform == 'win32':
        logger.error("You are using Windows - I cannot setup daemon mode. Please use the pythonw executable instead.")

    htpc.PID = False
    if args.pid:
        htpc.PID = args.pid

    htpc.DEBUG = False
    if args.debug:
        logger.info("Enabling DEBUG-Messages")
        logger.setLevel(logging.DEBUG)
        htpc.DEBUG = True

    from htpc.server import start
    start()

if __name__ == '__main__':
    main()
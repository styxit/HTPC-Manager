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
    parser.add_argument('--loglevel', default=None,
                        help='Set a loglevel. Allowed values: DEBUG, INFO, WARNING, ERROR, CRITICAL')
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

    #Initialize the logger
    global logger
    logger = logging.getLogger()
    logch = logging.StreamHandler()
    logfh = logging.FileHandler(os.path.join(htpc.DATADIR, 'htpcmanager.log'))

    logformatter = logging.Formatter('%(asctime)s :: %(name)s :: %(levelname)s :: %(message)s')
    logfh.setFormatter(logformatter)
    logch.setFormatter(logformatter)

    loginfo = 'ERROR'
    # Set a custom loglevel if supplied via the command line
    if args.loglevel:
        loglevels = ['DEBUG','INFO','WARNING','ERROR','CRITICAL']
        if args.loglevel in loglevels:
            if args.loglevel == 'DEBUG':
                logger.setLevel(logging.DEBUG)
                logch.setLevel(logging.DEBUG)
                logfh.setLevel(logging.DEBUG)
                loginfo = 'DEBUG'
            elif args.loglevel == 'INFO':
                logger.setLevel(logging.INFO)
                logch.setLevel(logging.INFO)
                logfh.setLevel(logging.INFO)
                loginfo = 'INFO'
            elif args.loglevel == 'WARNING':
                logger.setLevel(logging.WARNING)
                logch.setLevel(logging.WARNING)
                logfh.setLevel(logging.WARNING)
                loginfo = 'WARNING'
            elif args.loglevel == 'ERROR':
                logger.setLevel(logging.ERROR)
                logch.setLevel(logging.ERROR)
                logfh.setLevel(logging.ERROR)
                loginfo = 'ERROR'
            elif args.loglevel == 'CRITICAL':
                logger.setLevel(logging.CRITICAL)
                logch.setLevel(logging.CRITICAL)
                logfh.setLevel(logging.CRITICAL)
                loginfo = 'CRITICAL'
        else:
            logger.setLevel(logging.ERROR)
            logch.setLevel(logging.ERROR)
            logfh.setLevel(logging.ERROR)
    else:
        logger.setLevel(logging.ERROR)
        logch.setLevel(logging.ERROR)
        logfh.setLevel(logging.ERROR)

    logger.addHandler(logfh)
    logger.addHandler(logch)

    logger.critical("------------------------")
    logger.critical("Welcome to HTPC-Manager!")
    logger.critical("------------------------")
    logger.critical("Loglevel set to " + loginfo)

    from sqlobject import connectionForURI, sqlhub
    from mako.lookup import TemplateLookup

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
    htpc.LOOKUP = TemplateLookup(directories=[os.path.join(htpc.TEMPLATE,'html/')])

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
        logger.info("Setting up daemon-mode")
        htpc.DAEMON = True

    if args.daemon and sys.platform == 'win32':
        logger.error("You are using Windows - I cannot setup daemon mode. Please use the pythonw executable instead.")
        logger.error("More information at http://docs.python.org/2/using/windows.html.")

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

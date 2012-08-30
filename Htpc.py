#!/usr/bin/env python
def main():
    import os, sys, shutil, argparse, htpc

    # Set root and insert bundled libraies into path
    htpc.rundir = os.path.dirname(os.path.abspath(sys.argv[0]))
    sys.path.insert(0, os.path.join(htpc.rundir, 'libs'))

    from sqlobject import connectionForURI, sqlhub
    from mako.lookup import TemplateLookup

    # Set default datadir
    datadir = os.path.join(htpc.rundir, 'userdata/')

    # Get variables from commandline
    parser = argparse.ArgumentParser()
    parser.add_argument('--datadir', default=datadir,
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
    args = parser.parse_args()

    # Set datadir, create if it doesn't exist and exit if it isn't writable.
    htpc.datadir = args.datadir
    if not os.path.isdir(htpc.datadir):
        os.makedirs(htpc.datadir)
    if not os.access(htpc.datadir, os.W_OK):
        sys.exit("No write access to datadir")

    # Set default database and overwrite if supplied through commandline
    htpc.db = os.path.join(htpc.datadir, 'database.db')
    if args.db:
        htpc.db = args.db
    # Initiate database connection
    sqlhub.processConnection = connectionForURI('sqlite:' + htpc.db)

    # Inititialize root and settings page
    htpc.modules = []
    from htpc.root import Root
    htpc.root = Root()
    from htpc.settings import Settings
    from htpc.updater import Updater
    from modules import *

    settings = htpc.settings.Settings()

    htpc.template = os.path.join('interfaces/', settings.get('app_template','default'))
    htpc.lookup = TemplateLookup(directories=[htpc.template])

    # Overwrite host setting if supplied through commandline
    htpc.host = settings.get('app_host', '0.0.0.0')
    if args.host:
        htpc.host = args.host

    # Overwrite port setting if supplied through commandline
    htpc.port = int(settings.get('app_port', 8085))
    if args.port:
        htpc.port = args.port

    htpc.username = settings.get('app_username')
    htpc.password = settings.get('app_password')

    htpc.daemon = False
    if args.daemon and sys.platform != 'win32':
        htpc.daemon = True

    htpc.pid = False
    if args.pid:
        htpc.pid = args.pid

    htpc.debug = False
    if args.debug:
        htpc.debug = True

    from htpc.server import start
    start()

if __name__ == '__main__':
    main()

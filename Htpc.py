#!/usr/bin/env python
import os, sys, htpc

# Set root and insert bundled libraies into path
htpc.rundir = os.path.dirname(os.path.abspath(sys.argv[0]))
sys.path.insert(0, os.path.join(htpc.rundir, 'libs'))

def main():
    import shutil, argparse, cherrypy
    from cherrypy.process.plugins import Daemonizer, PIDFile
    from htpc.tools import readSettings

    # Get variables from commandline
    parser = argparse.ArgumentParser()
    parser.add_argument('--datadir',
                        help='Set the datadirectory')
    parser.add_argument('--config',
                        help='Use a custom configurationfile')
    parser.add_argument('--port', type=int,
                        help='Use a specific port')
    parser.add_argument('--daemon', action='store_true', default=0,
                        help='Daemonize process')
    parser.add_argument('--pid', default=0,
                        help='Generate PID file at location')
    parser.add_argument('--debug', action='store_true', default=0,
                        help='Print debug text')
    args = parser.parse_args()

    # Set default datadir
    htpc.datadir = os.path.join(htpc.rundir, 'userdata/')
    # If datadir is set through commandline check if it exists and is writeable
    if args.datadir:
        if os.path.isdir(args.datadir):
            if os.access(args.datadir, os.W_OK):
                htpc.datadir = args.datadir
            else:
                print "No write access to datadir"
                sys.exit()
        else:
            print "Datadir does not exist"
            sys.exit()

    # Set default conf-file and overwrite if supplied through commandline
    htpc.config = os.path.join(htpc.datadir, 'config.cfg')
    if args.config:
        htpc.config = args.config

    # Read settings info variable
    htpc.settings = readSettings()

    # Overwrite port setting if supplied through commandline
    if args.port:
        htpc.settings['app_port'] = args.port

    # If running on windows ignore daemon
    if args.daemon:
        if sys.platform == 'win32':
            print "Daemon mode not possible on Windows. Starting normally"
        else:
            Daemonizer(cherrypy.engine).subscribe()

    # Generate PID
    if args.pid:
        PIDFile(cherrypy.engine, args.pid).subscribe()

    # Set server environment to production unless when debugging
    if not args.debug:
        cherrypy.config.update({
            'environment': 'production'
        })

    # Set server ip, port and root
    cherrypy.config.update({
        'server.socket_host': htpc.settings.get('app_host', '0.0.0.0'),
        'server.socket_port': htpc.settings.get('app_port', 8085),
    })

    # Set static directories
    appConfig = {
        '/': {
            'tools.staticdir.on': True,
            'tools.staticdir.root': htpc.webdir,
            'tools.staticdir.dir': '',
            'tools.encode.on': True,
            'tools.encode.encoding': 'utf-8',
            'tools.gzip.on': True
        },
        '/favicon.ico': {
            'tools.staticfile.on': True,
            'tools.staticfile.filename': "img/favicon.ico"
        }
    }
    # Require username and password if they are supplied in the configuration file
    username = htpc.settings.get('app_username','')
    password = htpc.settings.get('app_password','')
    appname = htpc.settings.get('app_name', 'HTPC Manager')
    if username and password:
        userpassdict = {username : password}
        get_ha1 = cherrypy.lib.auth_digest.get_ha1_dict_plain(userpassdict)
        appConfig['/'].update({
            'tools.auth_digest.on': True,
            'tools.auth_digest.realm': appname,
            'tools.auth_digest.get_ha1': get_ha1,
            'tools.auth_digest.key': 'a565c27146791cfb'
        })

    # System modules
    from htpc.index import Root
    htpc.root = Root()
    from htpc.system import System

    # Import modules
    import modules

    # Start the CherryPy server
    cherrypy.quickstart(htpc.root, config=appConfig)

if __name__ == '__main__':
    main()

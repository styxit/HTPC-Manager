#!/usr/bin/python
import os, sys
import htpc

# Set root and insert bundled libraies into path
htpc.root = os.path.dirname(os.path.abspath(sys.argv[0]))
sys.path.insert(0, os.path.join(htpc.root, 'libs'))

def main():
    import shutil, argparse, cherrypy
    from htpc.tools import readSettings

    # Get variables from commandline
    parser = argparse.ArgumentParser()
    parser.add_argument('--config')
    parser.add_argument('--datadir')
    parser.add_argument('--port', type=int)
    parser.add_argument('--daemon', action='store_true', default=0)
    parser.add_argument('--debug', action='store_true', default=0)
    parser.add_argument('--pid', default=0)
    args = parser.parse_args()

    # Set default conf file and copy sample if it doesnt exist
    htpc.datadir = os.path.join(htpc.root, 'userdata/')
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

    htpc.configfile = os.path.join(htpc.datadir, 'config.cfg')
    if args.config:
        htpc.configfile = args.config

    htpc.settings = readSettings(htpc.configfile)

    htpc.template = htpc.settings.get('template')
    htpc.webdir = htpc.settings.get('webdir')

    if args.port:
        htpc.settings['app_port'] = args.port

    if not args.debug:
        cherrypy.config.update({
            'environment': 'production'
        })

    # If running on windows ignore daemon
    if args.daemon and sys.platform == 'win32':
        print "Daemon mode not possible on Windows. Starting normally"
        args.daemon = 0

    # Set server ip, port and root
    cherrypy.config.update({
        'server.socket_host': htpc.settings.get('app_host', '0.0.0.0'),
        'server.socket_port': htpc.settings.get('app_port', 8085),
        'server.root': htpc.root
    })

    # Genereate a root configuration
    rootConfig = {
        'tools.staticdir.root': htpc.root,
        'tools.encode.on': True,
        'tools.encode.encoding': 'utf-8',
        'tools.staticdir.dir': '/',
        'tools.staticfile.root': htpc.root
    }

    # Require username and password if they are supplied in the configuration file
    username = htpc.settings.get('app_username','')
    password = htpc.settings.get('app_password','')
    if username and password:
        userpassdict = {username : password}
        get_ha1 = cherrypy.lib.auth_digest.get_ha1_dict_plain(userpassdict)
        rootConfig.update({
            'tools.auth_digest.on': True,
            'tools.auth_digest.realm': htpc.settings.get('app_name', 'HTPC Manager'),
            'tools.auth_digest.get_ha1': get_ha1,
            'tools.auth_digest.key': 'a565c27146791cfb'
        })

    # Set static directories
    appConfig = {
        '/':  rootConfig,
        '/favicon.ico': {
            'tools.staticfile.on': True,
            'tools.staticfile.filename': htpc.template + "/img/favicon.ico"
        },
        '/css': {
            'tools.staticdir.on': True,
            'tools.staticdir.dir': htpc.template + "/css"
        },
        '/js': {
            'tools.staticdir.on': True,
            'tools.staticdir.dir': htpc.template + "/js"
        },
        '/img': {
            'tools.staticdir.on': True,
            'tools.staticdir.dir': htpc.template + "/img"
        }
    }

    # Import modules
    import modules

    # System modules
    from htpc.index import Root
    from htpc.system import System

    # Generate PID
    if args.pid:
        cherrypy.process.plugins.PIDFile(cherrypy.engine, args.pid).subscribe()

    # Daemonize if wanted
    if args.daemon:
        cherrypy.process.plugins.Daemonizer(cherrypy.engine).subscribe()

    # Start the CherryPy server
    cherrypy.quickstart(Root(), config=appConfig)

if __name__ == '__main__':
    main()

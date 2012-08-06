#!/usr/bin/python
import os, sys
import htpc

# Set root and insert bundled libraies into path
htpc.root = os.path.dirname(os.path.abspath(sys.argv[0]))
sys.path.insert(0, os.path.join(htpc.root, 'libs'))

def main():
    import shutil, argparse, cherrypy
    from htpc.tools import readSettings

    # Set default conf file and copy sample if it doesnt exist
    htpc.config = os.path.join(htpc.root, 'userdata/config.cfg')
    if not os.path.isfile(htpc.config):
        sample = os.path.join(htpc.root, 'userdata/sample-config.cfg')
        shutil.copy(sample, htpc.config)

    # Get variables from commandline
    parser = argparse.ArgumentParser()
    parser.add_argument('-c', '--config', default=htpc.config)
    parser.add_argument('-d', '--daemon', action='store_true', default=0)
    args = parser.parse_args()

    # Confirm configuration file exists
    if not os.path.isfile(args.config):
        sys.exit("Configuration file: "+args.config+" doesn't exist.")

    htpc.configfile = args.config
    htpc.settings = readSettings(args.config)
    htpc.template = htpc.settings.get('webdir','default')

    # If running on windows ignore daemon
    if args.daemon and sys.platform == 'win32':
        print "Daemon mode not possible on Windows. Starting normally"
        #args.daemon = 0

    # Set server parameters
    cherrypy.config.update({
        #'environment': 'production',
        'server.socket_host': htpc.settings['app_host'],
        'server.socket_port': htpc.settings['app_port'],
        'server.root': htpc.root,
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
            'tools.auth_digest.realm': htpc.settings.get('app_name'),
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

    # Daemonize if wanted
    if args.daemon:
        print "Daemonizing through commandline deactivated due to bug"
        #cherrypy.process.plugins.Daemonizer(cherrypy.engine).subscribe()

    # Start the CherryPy server
    cherrypy.quickstart(Root(), config=appConfig)

if __name__ == '__main__':
    main()

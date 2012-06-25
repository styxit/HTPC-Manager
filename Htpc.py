#!/usr/bin/python
import os, sys, shutil, argparse

# Set root and insert bundled libraies into path
root = os.getcwd()
sys.path.insert(0, os.path.join(root, 'libs'))

# Import the bundled CherryPy
import cherrypy
from htpc.pagehandler import pageHandler
from htpc.tools import readSettings

# Set default conf file and copy sample if it doesnt exist
config = os.path.join(root, 'userdata/config.cfg')
if not os.path.isfile(config):
    sample = os.path.join(root, 'userdata/sample-config.cfg')
    shutil.copy(sample, config)

# Get variables from commandline
parser = argparse.ArgumentParser()
parser.add_argument('-c', '--config', default=config)
parser.add_argument('-d', '--daemon', action='store_true', default=0)
args = parser.parse_args()

# Check if the chosen configuration file exists
if not os.path.isfile(args.config):
    sys.exit("Configuration file: "+args.config+" doesn't exist.")

# Read config
config = readSettings(args.config)

# If running on windows ignore daemon
if args.daemon and sys.platform == 'win32':
    print "Daemon mode not possible on Windows. Starting normally"
    args.daemon = 0

# Set server parameters
cherrypy.config.update({
    'server.environment': 'production',
    'server.socket_host': config['app_host'],
    'server.socket_port': config['app_port'],
    'server.root': root,
})

# Genereate a root configuration
rootConfig = {
    'tools.staticdir.root': root,
    'tools.encode.on': True,
    'tools.encode.encoding': 'utf-8',
    'tools.staticdir.dir': '/',
    'tools.staticfile.root': root
}

# Require username and password if they are supplied in the configuration file
username = config.get('app_username','')
password = config.get('app_password','')
if username and password:
    userpassdict = {username : password}
    get_ha1 = cherrypy.lib.auth_digest.get_ha1_dict_plain(userpassdict)
    rootConfig.update({
        'tools.auth_digest.on': True,
        'tools.auth_digest.realm': config.get('app_name'),
        'tools.auth_digest.get_ha1': get_ha1,
        'tools.auth_digest.key': 'a565c27146791cfb'
    })

# Set template and static directories
template = os.path.join('interfaces/',config.get('template','default'))
appConfig = {
    '/':  rootConfig,
    '/favicon.ico': {
        'tools.staticfile.on': True,
        'tools.staticfile.filename': template + "/static/img/favicon.ico"
    },
    '/css': {
        'tools.staticdir.on': True,
        'tools.staticdir.dir': template + "/static/css"
    },
    '/js': {
        'tools.staticdir.on': True,
        'tools.staticdir.dir': template + "/static/js"
    },
    '/img': {
        'tools.staticdir.on': True,
        'tools.staticdir.dir': template + "/static/img"
    }
}

# Daemonize if wanted
if args.daemon:
    cherrypy.process.plugins.Daemonizer(cherrypy.engine).subscribe()

# Start the CherryPy server
cherrypy.quickstart(pageHandler(args.config), config=appConfig)

#!/usr/bin/env python
import os, cherrypy, htpc
from cherrypy.process.plugins import Daemonizer, PIDFile

def start():
    # Set server ip, port and root
    cherrypy.config.update({
        'server.socket_host': htpc.host,
        'server.socket_port': htpc.port
    })

    # Set server environment to production unless when debugging
    if not htpc.debug:
        cherrypy.config.update({
            'environment': 'production'
        })

    # Daemonize cherrypy if specified
    if htpc.daemon:
        Daemonizer(cherrypy.engine).subscribe()

    # Create PID if specified
    if htpc.pid:
        PIDFile(cherrypy.engine, htpc.pid).subscribe()

    # Set static directories
    webdir = os.path.join(htpc.rundir, htpc.template)
    favicon = os.path.join(webdir, "img/favicon.ico")
    appConfig = {
        '/': {
            'tools.staticdir.root': webdir,
            'tools.encode.on': True,
            'tools.encode.encoding': 'utf-8',
            'tools.gzip.on': True
        },
        '/js': {
            'tools.staticdir.on': True,
            'tools.staticdir.dir': 'js'
        },
        '/css': {
            'tools.staticdir.on': True,
            'tools.staticdir.dir': 'css'
        },
        '/img': {
            'tools.staticdir.on': True,
            'tools.staticdir.dir': 'img'
        },
        '/favicon.ico': {
            'tools.staticfile.on': True,
            'tools.staticfile.filename': favicon
        }
    }
    # Require username and password if they are supplied in the configuration file
    if htpc.username and htpc.password:
        userpassdict = {htpc.username : htpc.password}
        get_ha1 = cherrypy.lib.auth_digest.get_ha1_dict_plain(userpassdict)
        appConfig['/'].update({
            'tools.auth_digest.on': True,
            'tools.auth_digest.realm': "HTPC Manager",
            'tools.auth_digest.get_ha1': get_ha1,
            'tools.auth_digest.key': 'a565c27146791cfb'
        })

    # Start the CherryPy server
    cherrypy.quickstart(htpc.root, config=appConfig)

""" Initiate the HTTP server according to settings """
import os
import cherrypy
import htpc
from cherrypy.process.plugins import Daemonizer, PIDFile


def start():
    """ Main function for starting HTTP server """
    # Set server ip, port and root
    cherrypy.config.update({
        'server.socket_host': htpc.HOST,
        'server.socket_port': htpc.PORT
    })

    # Set server environment to production unless when debugging
    if not htpc.DEBUG:
        cherrypy.config.update({
            'environment': 'production'
        })

    # Daemonize cherrypy if specified
    if htpc.DAEMON:
        Daemonizer(cherrypy.engine).subscribe()

    # Create PID if specified
<<<<<<< HEAD
    if htpc.PID:
        PIDFile(cherrypy.engine, htpc.PID).subscribe()
=======
    if htpc.pid:
        PIDFile(cherrypy.engine, htpc.pid).subscribe()
>>>>>>> 31eef0c42da6432e03977db77f25c302c08130f5

    # Set static directories
    webdir = os.path.join(htpc.RUNDIR, htpc.TEMPLATE)
    favicon = os.path.join(webdir, "img/favicon.ico")
    app_config = {
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
    # Require username and password if they are set
    if htpc.USERNAME and htpc.PASSWORD:
        userpassdict = {htpc.USERNAME: htpc.PASSWORD}
        get_ha1 = cherrypy.lib.auth_digest.get_ha1_dict_plain(userpassdict)
        app_config['/'].update({
            'tools.auth_digest.on': True,
            'tools.auth_digest.realm': "HTPC Manager",
            'tools.auth_digest.get_ha1': get_ha1,
            'tools.auth_digest.key': 'a565c27146791cfb'
        })

    # Start the CherryPy server
    cherrypy.quickstart(htpc.ROOT, config=app_config)

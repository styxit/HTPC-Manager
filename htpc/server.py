""" Initiate the HTTP server according to settings """
import os
import cherrypy
import htpc
import logging
from cherrypy.process.plugins import Daemonizer, PIDFile

def start():
    """ Main function for starting HTTP server """
    logger = logging.getLogger('htpc.server')
    logger.debug("Setting up to start cherrypy")

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
    if htpc.PID:
        PIDFile(cherrypy.engine, htpc.PID).subscribe()

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
        logger.debug("Enabling username/password access")
        userpassdict = {htpc.USERNAME: htpc.PASSWORD}
        get_ha1 = cherrypy.lib.auth_digest.get_ha1_dict_plain(userpassdict)
        app_config['/'].update({
            'tools.auth_digest.on': True,
            'tools.auth_digest.realm': "HTPC Manager",
            'tools.auth_digest.get_ha1': get_ha1,
            'tools.auth_digest.key': 'a565c27146791cfb'
        })

    

    # When in INFO-mode, cherrypy will print out a ton of access messages
    # Need a way to find out why it isn't logging in the level which is set for it
    if not htpc.DEBUG:
        logging.getLogger('cherrypy.error').setLevel(logging.ERROR)
        logger = logging.getLogger('cherrypy.access')
        logger.setLevel(logging.ERROR)
        cherrypy.log.access_log = logger
    else:
        logging.getLogger('cherrypy.error').setLevel(logging.DEBUG)
        logger = logging.getLogger('cherrypy.access')
        logger.setLevel(logging.DEBUG)
        cherrypy.log.access_log = logger

    # Start the CherryPy server (remove trailing slash from webdir)
    logger.info("Starting up webserver")
    cherrypy.quickstart(htpc.ROOT, htpc.WEBDIR[:-1], config=app_config)
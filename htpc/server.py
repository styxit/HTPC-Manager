""" Initiate the HTTP server according to settings """
import os
import sys
import cherrypy
import htpc
import logging
from cherrypy.process.plugins import Daemonizer, PIDFile
from cherrypy.lib.auth_digest import get_ha1_dict_plain


def start():
    """ Main function for starting HTTP server """
    logger = logging.getLogger('htpc.server')
    logger.debug("Setting up to start cherrypy")

    # Set server ip, port and root
    cherrypy.config.update({
        'server.socket_host': htpc.HOST,
        'server.socket_port': htpc.PORT,
        'log.screen': False
    })

    # Set server environment to production unless when debugging
    if not htpc.DEBUG:
        cherrypy.config.update({
            'environment': 'production'
        })

    # Enable SSL
    if htpc.SSLCERT and htpc.SSLKEY:
        cherrypy.config.update({
            'server.ssl_module': 'builtin',
            'server.ssl_certificate': htpc.SSLCERT,
            'server.ssl_private_key': htpc.SSLKEY
        })

    # Daemonize cherrypy if specified
    if htpc.DAEMON:
        if sys.platform == 'win32':
            logger.error("You are using Windows - I cannot setup daemon mode. Please use the pythonw executable instead.")
            logger.error("More information at http://docs.python.org/2/using/windows.html.")
        else:
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
            'tools.caching.on': True,
            'tools.caching.force': True,
            'tools.caching.delay': 0,
            'tools.expires.on': True,
            'tools.expires.secs': 60 * 60 * 6,
            'tools.staticdir.on': True,
            'tools.staticdir.dir': 'js'
        },
        '/css': {
            'tools.caching.on': True,
            'tools.caching.force': True,
            'tools.caching.delay': 0,
            'tools.expires.on': True,
            'tools.expires.secs': 60 * 60 * 6,
            'tools.staticdir.on': True,
            'tools.staticdir.dir': 'css'
        },
        '/img': {
            'tools.caching.on': True,
            'tools.caching.force': True,
            'tools.caching.delay': 0,
            'tools.expires.on': True,
            'tools.expires.secs': 60 * 60 * 6,
            'tools.staticdir.on': True,
            'tools.staticdir.dir': 'img'
        },
        '/favicon.ico': {
            'tools.caching.on': True,
            'tools.caching.force': True,
            'tools.caching.delay': 0,
            'tools.expires.on': True,
            'tools.expires.secs': 60 * 60 * 6,
            'tools.staticfile.on': True,
            'tools.staticfile.filename': favicon
        },
    }
    # Require username and password if they are set
    if htpc.USERNAME and htpc.PASSWORD:
        logger.info("Enabling username/password access")
        userpassdict = {htpc.USERNAME: htpc.PASSWORD}
        get_ha1 = get_ha1_dict_plain(userpassdict)
        app_config['/'].update({
            'tools.auth_digest.on': True,
            'tools.auth_digest.realm': "HTPC Manager",
            'tools.auth_digest.get_ha1': get_ha1,
            'tools.auth_digest.key': 'a565c27146791cfb'
        })

    # Start the CherryPy server (remove trailing slash from webdir)
    logger.info("Starting up webserver")
    print '******************************************************'
    print 'Starting HTPC Manager on port ' + str(htpc.PORT) + '.'
    print 'Start your browser and go to http://localhost:' + str(htpc.PORT)
    print '******************************************************'
    cherrypy.quickstart(htpc.ROOT, htpc.WEBDIR[:-1], config=app_config)

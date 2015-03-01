#!/usr/bin/env python
# -*- coding: utf-8 -*-

""" Initiate the HTTP server according to settings """
import os
import sys
import cherrypy
import htpc
import logging
from sqlobject import SQLObjectNotFound
from htpc.manageusers import Manageusers
from cherrypy.process.plugins import Daemonizer, PIDFile
from helpers import create_https_certificates
from root import do_restart


def secureheaders():
    headers = cherrypy.response.headers
    headers['X-Frame-Options'] = 'DENY'
    headers['X-XSS-Protection'] = '1; mode=block'
    headers['Content-Security-Policy'] = "default-src='self'"


def start():
    """ Main function for starting HTTP server """
    logger = logging.getLogger('htpc.server')
    logger.debug("Setting up to start cherrypy")
    protocol = ""

    # Set server ip, port and root
    cherrypy.config.update({
        'server.socket_host': htpc.HOST,
        'server.socket_port': htpc.PORT,
        'log.screen': False,
        'server.thread_pool': 15,
        'server.socket_queue_size': 10
    })

    # Wrap htpc manager in secure headers.
    # http://cherrypy.readthedocs.org/en/latest/advanced.html#securing-your-server
    cherrypy.tools.secureheaders = cherrypy.Tool('before_finalize', secureheaders, priority=60)

    # Enable auth if username and pass is set, add to db as admin
    if htpc.USERNAME and htpc.PASSWORD:
        """ Lets see if the that username and password is already in the db"""
        try:
            user = Manageusers.selectBy(username=htpc.USERNAME).getOne()
            # If the user exist
            if user:
                # Activate the new password
                user.password = htpc.PASSWORD

        except SQLObjectNotFound:
            logger.debug("Added htpc.USERNAME and htpc.PASSWORD to Manageusers table")
            Manageusers(username=htpc.USERNAME, password=htpc.PASSWORD, role='admin')

        logger.debug('Updating cherrypy config, activating sessions and auth')

        cherrypy.config.update({
            'tools.sessions.on': True,
            'tools.auth.on': True,
            'tools.sessions.timeout': 60,
            'tools.sessions.httponly': True
            #'tools.sessions.secure': True #  Auth does not work with this on #TODO
        })

    # Set server environment to production unless when debugging
    if not htpc.DEBUG:
        cherrypy.config.update({
            'environment': 'production'
        })

    # If ssl is enabled but there is not cert og key, try to make self signed.
    if htpc.USE_SSL:
        # Check if the cert and  key exists
        if not (htpc.SSLCERT and os.path.exists(htpc.SSLCERT)) and not (htpc.SSLKEY and os.path.exists(htpc.SSLKEY)):
            serverkey = os.path.join(htpc.DATADIR, 'server.key')
            cert = os.path.join(htpc.DATADIR, 'server.crt')
            logger.debug('There isnt any certificate or key, trying to make them')

            # If they dont exist, make them.
            if create_https_certificates(serverkey, cert):
                # Save the new crt and key to settings
                htpc.SSLKEY = htpc.settings.set('app_ssl_key', serverkey)
                htpc.SSLCERT = htpc.settings.set('app_ssl_cert', cert)
                htpc.ENABLESSL = True
                logger.debug("Created certificate and key successfully")
                logger.info("Restarting to activate SSL")
                do_restart()

        if (htpc.SSLCERT and os.path.exists(htpc.SSLCERT)) and (htpc.SSLKEY and os.path.exists(htpc.SSLKEY)):
            htpc.ENABLESSL = True

    if htpc.ENABLESSL:
        protocol = "s"
        logger.debug("SSL is enabled")
        cherrypy.config.update({
                'server.ssl_module': 'builtin',
                'server.ssl_certificate': htpc.SSLKEY,
                'server.ssl_private_key': htpc.SSLCERT

        })

    if htpc.settings.get('app_use_proxy_headers'):
        cherrypy.config.update({
                'tools.proxy.on': True

        })

    if htpc.settings.get('app_use_proxy_headers') and htpc.settings.get('app_use_proxy_headers_basepath'):
        cherrypy.config.update({
                'tools.proxy.base': str(htpc.settings.get('app_use_proxy_headers_basepath'))
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

    def stopp_ap():
        htpc.SCHED.shutdown(wait=False)

    stopp_ap.priority = 10
    cherrypy.engine.subscribe('stop', stopp_ap)

    # Set static directories
    webdir = os.path.join(htpc.RUNDIR, htpc.TEMPLATE)
    favicon = os.path.join(webdir, "img/favicon.ico")
    app_config = {
        '/': {
            'tools.staticdir.root': webdir,
            'tools.encode.on': True,
            'tools.encode.encoding': 'utf-8',
            'tools.gzip.on': True,
            'tools.gzip.mime_types': ['text/html', 'text/plain', 'text/css', 'text/javascript', 'application/json', 'application/javascript'],
            'tools.secureheaders.on': True
        },
        '/js': {
            'tools.caching.on': True,
            'tools.caching.force': True,
            'tools.caching.delay': 0,
            'tools.expires.on': True,
            'tools.expires.secs': 60 * 60 * 24 * 7,
            'tools.staticdir.on': True,
            'tools.auth.on': False,
            'tools.sessions.on': False,
            'tools.staticdir.dir': 'js'
        },
        '/css': {
            'tools.caching.on': True,
            'tools.caching.force': True,
            'tools.caching.delay': 0,
            'tools.expires.on': True,
            'tools.expires.secs': 60 * 60 * 24 * 7,
            'tools.staticdir.on': True,
            'tools.auth.on': False,
            'tools.sessions.on': False,
            'tools.staticdir.dir': 'css'
        },
        '/img': {
            'tools.caching.on': True,
            'tools.caching.force': True,
            'tools.caching.delay': 0,
            'tools.expires.on': True,
            'tools.expires.secs': 60 * 60 * 24 * 7,
            'tools.staticdir.on': True,
            'tools.auth.on': False,
            'tools.sessions.on': False,
            'tools.staticdir.dir': 'img'
        },
        '/favicon.ico': {
            'tools.caching.on': True,
            'tools.caching.force': True,
            'tools.caching.delay': 0,
            'tools.expires.on': True,
            'tools.expires.secs': 60 * 60 * 24 * 7,
            'tools.staticfile.on': True,
            'tools.auth.on': False,
            'tools.sessions.on': False,
            'tools.staticfile.filename': favicon
        },
    }

    # Start the CherryPy server
    logger.info("Starting up webserver")
    print '*******************************************************************'
    print 'Starting HTPC Manager on port ' + str(htpc.PORT) + '.'
    print 'Start your browser and go to http%s://localhost:%s%s' % (protocol, htpc.PORT, htpc.WEBDIR[:-1])
    print '*******************************************************************'
    cherrypy.quickstart(htpc.ROOT, htpc.WEBDIR[:-1], config=app_config)

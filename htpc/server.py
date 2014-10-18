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


def secureheaders():
    headers = cherrypy.response.headers
    headers['X-Frame-Options'] = 'DENY'
    headers['X-XSS-Protection'] = '1; mode=block'
    headers['Content-Security-Policy'] = "default-src='self'"


def start():
    """ Main function for starting HTTP server """
    logger = logging.getLogger('htpc.server')
    logger.debug("Setting up to start cherrypy")

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
        except SQLObjectNotFound:
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

    # Start the CherryPy server (remove trailing slash from webdir)
    logger.info("Starting up webserver")
    print '******************************************************'
    print 'Starting HTPC Manager on port ' + str(htpc.PORT) + '.'
    print 'Start your browser and go to http://localhost:' + str(htpc.PORT) + htpc.WEBDIR[:-1]
    print '******************************************************'
    cherrypy.quickstart(htpc.ROOT, htpc.WEBDIR[:-1], config=app_config)

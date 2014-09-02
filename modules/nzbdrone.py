#!/usr/bin/env python
# -*- coding: utf-8 -*-

import cherrypy
import htpc
from cherrypy.lib.auth2 import require
#import requests
import urllib2
import logging
from json import loads
import datetime


class NzbDrone:
    def __init__(self):
        self.logger = logging.getLogger('modules.nzbdrone')
        htpc.MODULES.append({
            'name': 'NzbDrone',
            'id': 'nzbdrone',
            'test': htpc.WEBDIR + 'nzbdrone/version',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'nzbdrone_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'nzbdrone_name'},
                {'type': 'text', 'label': 'IP / Host', 'placeholder': 'localhost', 'name': 'nzbdrone_host'},
                {'type': 'text', 'label': 'Port', 'placeholder': '6789', 'name': 'nzbdrone_port'},
                {'type': 'text', 'label': 'Basepath', 'placeholder': '/nzbget', 'name': 'nzbdrone_basepath'},
                {'type': 'text', 'label': 'User', 'name': 'nzbdrone_username'},
                {'type': 'text', 'label': 'API', 'name': 'nzbdrone_apikey'},
                {'type': 'password', 'label': 'Password', 'name': 'nzbdrone_password'},
                {'type': 'bool', 'label': 'Use SSL', 'name': 'nzbdrone_ssl'}
            ]
        })

    @cherrypy.expose()
    @require()
    def index(self):
        return htpc.LOOKUP.get_template('nzbdrone.html').render(scriptname='nzbdrone')

    def fetch(self, path):
        try:
            host = htpc.settings.get('nzbdrone_host', '')
            port = str(htpc.settings.get('nzbdrone_port', ''))
            #username = htpc.settings.get('nzbdrone_username', '')
            #password = htpc.settings.get('nzbdrone_password', '')
            nzbdrone_basepath = htpc.settings.get('nzbdrone_basepath', '/')
            ssl = 's' if htpc.settings.get('nzbdrone_ssl', True) else ''

            if(nzbdrone_basepath == ""):
                nzbdrone_basepath = "/"
            if not(nzbdrone_basepath.endswith('/')):
                nzbdrone_basepath += "/"

            url = 'http' + ssl + '://' + host + ':' + port + nzbdrone_basepath + 'api/' + path
            print url

            request = urllib2.Request(url)
            request.add_header("X-Api-Key", "%s" % htpc.settings.get('nzbdrone_apikey', ''))
            #print urlopen(request).read()
            return loads(urllib2.urlopen(request).read())
        except Exception as e:
            print 'fetch error ', e
            return

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Rootfolder(self):
        #print self.fetch('Rootfolder')
        return self.fetch('Rootfolder')

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Series(self):
        return self.fetch('Series')

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Season(self, id):
        return self.fetch('Series/%s' % id)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def History(self):
        return self.fetch('History?page=1&pageSize=100&sortKey=date&sortDir=desc')

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Calendar(self, param=None):
        current_date = datetime.datetime.utcnow().strftime("%Y-%m-%d")
        start_date = (datetime.datetime.strptime(current_date, '%Y-%m-%d') - datetime.timedelta(days=7)).strftime('%Y-%m-%d')
        end_date = (datetime.datetime.strptime(current_date, '%Y-%m-%d') + datetime.timedelta(days=7)).strftime('%Y-%m-%d')
        p = 'Calendar?start=' + current_date + '&end=' + end_date
        return self.fetch(p)

    @cherrypy.expose()
    @require()
    def View(self, tvdbid):
        if not (tvdbid.isdigit()):
            raise cherrypy.HTTPError("500 Error", "Invalid show ID.")
            self.logger.error("Invalid show ID was supplied: " + str(tvdbid))
            return False

        return htpc.LOOKUP.get_template('nzbdrone_view.html').render(scriptname='nzbdroneview', tvdbid=tvdbid)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Search(self, query):
        params = 'Series/lookup?term=%s' % (urllib2.quote(query))
        print self.fetch(params)
        return self.fetch(params)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Profile(self):
        print self.fetch('profile')
        return self.fetch('profile')

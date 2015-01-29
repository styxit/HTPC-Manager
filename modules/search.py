#!/usr/bin/env python
# -*- coding: utf-8 -*-

import cherrypy
import htpc
from htpc.proxy import get_image
import urllib2
from json import loads
import logging
from cherrypy.lib.auth2 import require

class Search(object):
    def __init__(self):
        self.logger = logging.getLogger('modules.search')
        htpc.MODULES.append({
            'name': 'Newznab',
            'id': 'nzbsearch',
            'fields': [
                {'type':'bool', 'label':'Enable', 'name':'nzbsearch_enable'},
                {'type':'text', 'label':'Host', 'name':'newznab_host'},
                {'type':'text', 'label':'Apikey', 'name':'newznab_apikey'},
                {'type': 'bool', 'label': 'Use SSL', 'name': 'newznab_ssl'}
        ]})

    @cherrypy.expose()
    @require()
    def index(self, query='', **kwargs):
        return htpc.LOOKUP.get_template('search.html').render(query=query, scriptname='search')

    @cherrypy.expose()
    @require()
    def thumb(self, url, h=None, w=None, o=100):
        if url.startswith('rageid'):
            settings = htpc.settings
            host = settings.get('newznab_host', '').replace('http://', '').replace('https://', '')
            ssl = 's' if settings.get('newznab_ssl', 0) else ''

            url = 'http' + ssl + '://' + host + '/covers/tv/' + url[6:] + '.jpg'

        return get_image(url, h, w, o)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def getcategories(self, **kwargs):
        self.logger.debug("Fetching available categories")
        return self.fetch('caps')['categories']

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def getclients(self):
        l = []
        nzbget = {"client": "nzbget",
                  #"cmd":"",
                  "icon": "../img/nzbget.png",
                  "active": 0
        }
        if htpc.settings.get("nzbget_enable"):
            nzbget["active"] = 1

        sab = {"client": "sabnzbd",
               #"cmd":"",
               "icon": "../img/sabnzbd.png",
               "active": 0
        }
        if htpc.settings.get("sabnzbd_enable"):
            sab["active"] = 1

        l.append(nzbget)
        l.append(sab)
        return l

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def search(self, q='', cat='', **kwargs):
        if cat:
            cat = '&cat=' + cat
        result = self.fetch('search&q=' + urllib2.quote(q) + cat + '&extended=1')
        try:
            return result['channel']['item']
        except:
            return result

    def fetch(self, cmd):
        try:
            settings = htpc.settings
            host = settings.get('newznab_host', '').replace('http://', '').replace('https://', '')
            ssl = 's' if settings.get('newznab_ssl', 0) else ''
            apikey = settings.get('newznab_apikey', '')
            url = 'http' + ssl + '://' + host + '/api?o=json&apikey=' + apikey + '&t=' + cmd
            self.logger.debug("Fetching information from: " + url)
            request = urllib2.Request(url)
            request.add_header('User-agent', 'HTPC Manager')
            try:
                resource = urllib2.urlopen(request)
                return loads(resource.read())
            except urllib2.HTTPError, err:
                self.logger.error("HTTP Error Code Received: " + str(err.code))
        except:
            self.logger.error("Unable to fetch information from: " + url)
            return

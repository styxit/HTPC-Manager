# coding=utf-8

import htpc
import cherrypy
import urllib2
import urllib
import json
import jsonrpclib
import logging

#http://btnapps.net/apigen/class-btnapi.html


class Torrentsearch:
    def __init__(self):
        self.logger = logging.getLogger('modules.torrentsearch')
        htpc.MODULES.append({
            'name': 'torrentsearch',
            'id': 'torrentsearch',
            #'test': htpc.WEBDIR + 'qbittorrent/ping',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'torrentsearch_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'torrentsearch_name'},
                #{'type': 'bool', 'label': 'Enable', 'name': 'torrentsearch_btn_enable'},
                {'type': 'text', 'label': 'BTN apikey', 'name': 'torrentsearch_btn_apikey'}
                #{'type': 'text', 'label': 'IP / Host *', 'name': 'qbittorrent_host'},
                #{'type': 'text', 'label': 'Port *', 'name': 'qbittorrent_port'},
                #{'type': 'text', 'label': 'Username', 'name': 'qbittorrent_username'},
                #{'type': 'password', 'label': 'Password', 'name': 'qbittorrent_password'},
                #{'type': 'bool', 'label': 'Use SSL', 'name': 'qbittorrent_ssl'}
        ]})

    @cherrypy.expose()
    def index(self):
        return htpc.LOOKUP.get_template('torrentsearch.html').render(scriptname='torrentsearch')
    
    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def search(self, query=None):
        s = self.btn(query)
        return s

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def query(self, query=None):
        s = self.btn(query)
        return s

    @cherrypy.expose()
    #@cherrypy.tools.json_out()
    def btn(self, query=None):
        btn = jsonrpclib.Server('http://api.btnapps.net')
        result = btn.getTorrents(htpc.settings.get('torrentsearch_btn_apikey', ''), query, 999)
        search_results = []
        d = {}
        
        try:
            if 'torrents' in result:
                for k, v in result['torrents'].iteritems():
                    search_results.append(v)
                return search_results
            else:
                return result
        except Exception as e:
            print e
            
    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def getclients(self):
        d = {}
        if htpc.settings.get('qbittorrent_enable', ''):
            d['qbittorrent'] = 1
        else:
            d['qbittorrent'] = 0
        if htpc.settings.get('transmission_enable', ''):
            d['transmission'] = 1
        else:
            d['transmission'] = 0
        if htpc.settings.get('deluge_enable', ''):
            d['deluge'] = 1
        else:
            d['deluge'] = 0
        if htpc.settings.get('utorrent_enable', ''):
            d['utorrent'] = 1
        else:
            d['utorrent'] = 0
        return d
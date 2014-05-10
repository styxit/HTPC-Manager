#!/usr/bin/env python
# -*- coding: utf-8 -*-

import htpc
import cherrypy
import urllib2
import urllib
import json
import jsonrpclib
import logging

#http://btnapps.net/apigen/class-btnapi.html
#Only adding btn for now, kat and ptp will be added later.


class Torrentsearch:
    def __init__(self):
        self.logger = logging.getLogger('modules.torrentsearch')
        htpc.MODULES.append({
            'name': 'torrentsearch',
            'id': 'torrentsearch',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'torrentsearch_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'torrentsearch_name'},
                {'type': 'text', 'label': 'BTN apikey', 'name': 'torrentsearch_btn_apikey'}
        ]})

    @cherrypy.expose()
    def index(self, query='', **kwargs):
        return htpc.LOOKUP.get_template('torrentsearch.html').render(query=query, scriptname='torrentsearch')
    
    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def search(self, query=None):
        s = self.btn(query)
        return s

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def query(self, **kwargs):
        s = self.btn(query)
        return s

    @cherrypy.expose()
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
            self.logger.error("Failed to fetch search results from BTN %s" %e)
            
    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def getclients(self):
        l = []
        qbt = {}
        trans = {}
        utor = {}
        delu = {}
        if htpc.settings.get('qbittorrent_enable', ''):
            qbt['title'] = 'qBittorrent'
            qbt['active'] = 1
            qbt['path'] = 'qbittorrent/to_client/'
            l.append(qbt)
        else:
            print 'qbittorent is checking if its false even when its true'
            qbt['title'] = 'qBittorrent'
            qbt['active'] = 0
            qbt['path'] = 'qbittorrent/command/'
            l.append(qbt)
        if htpc.settings.get('transmission_enable', ''):
            trans['title'] = 'transmission'
            trans['active'] = 1
            trans['path'] = 'transmission/to_client/'
            l.append(trans)
        else:
            trans['title'] = 'transmission'
            trans['active'] = 0
            trans['path'] = 'transmission/to_client/'
            l.append(trans)
        if htpc.settings.get('deluge_enable', ''):
            delu['title'] = 'Deluge'
            delu['active'] = 1
            delu['path'] = 'deluge/to_client'
            l.append(delu)
        else:
            delu['title'] = 'Deluge'
            delu['active'] = 0
            delu['path'] = 'deluge/to_client'
            l.append(delu)
        if htpc.settings.get('utorrent_enable', ''):
            utor['title'] = 'uTorrent'
            utor['active'] = 1
            utor['path'] = 'utorrent/to_client/'
            l.append(utor)
        else:
            utor['title'] = 'uTorrent'
            utor['active'] = 0
            utor['path'] = 'utorrent/to_client/'
            l.append(utor)
        return l
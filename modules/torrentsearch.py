#!/usr/bin/env python
# -*- coding: utf-8 -*-

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
        #print 'qbittorrent_enable is: ',htpc.settings.get('qbittorrent_enable', '')
        #print 'qbittorrent_enable tpye is', type(htpc.settings.get('qbittorrent_enable', ''))
        #print 'utorrent_enable is: ',htpc.settings.get('utorrent_enable', '')
        l = []
        qbt = {}
        trans = {}
        utor = {}
        delu = {}
        if htpc.settings.get('qbittorrent_enable', ''):
            qbt['title'] = 'qBittorrent'
            qbt['active'] = 1
            qbt['cmd'] = 'download'
            qbt['path'] = 'qbittorrent/command/'

            l.append(qbt)
            #print l
        else:
            print 'qbittorent is checking if its false even when its true'
            qbt['title'] = 'qBittorrent'
            qbt['active'] = 0
            qbt['cmd'] = 'download'
            qbt['path'] = 'qbittorrent/command/'
            #l.append(d)

        if htpc.settings.get('transmission_enable', ''):
            trans['title'] = 'transmission'
            trans['active'] = 1
            trans['path'] = 'transmission/addurl/'
            trans['cmd'] = 'torrent-add'
            l.append(trans)
            #print l
            #d['transmission'] = 1
        else:
            trans['title'] = 'transmission'
            trans['active'] = 0
            trans['cmd'] = 'torrent-add'
            trans['path'] = 'transmission/addurl/'
            l.append(trans)
            #print l

        if htpc.settings.get('deluge_enable', ''):
            delu['title'] = 'Deluge'
            delu['active'] = 1
            delu['cmd'] = 'download'
            delu['path'] = '/Add/'
            l.append(delu)
            #d['deluge'] = 1
        else:
            delu['title'] = 'Deluge'
            delu['active'] = 0
            delu['cmd'] = 'download'
            delu['path'] = 'path/to/cmd'
            l.append(delu)

        if htpc.settings.get('utorrent_enable', ''):
            utor['title'] = 'uTorrent'
            utor['active'] = 1
            utor['cmd'] = 'download'
            utor['path'] = 'path'
            l.append(utor)
        else:
            utor['title'] = 'uTorrent'
            utor['active'] = 0
            utor['path'] = 'path'
            utor['cmd'] = 'download'
            l.append(utor)
        return l
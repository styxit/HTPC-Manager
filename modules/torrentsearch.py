#!/usr/bin/env python
# -*- coding: utf-8 -*-

import htpc
import cherrypy
import jsonrpclib
import logging
from ts import norbits
from ts import fenopy


class Torrentsearch:
    def __init__(self):
        self.logger = logging.getLogger('modules.torrentsearch')
        htpc.MODULES.append({
            'name': 'torrentsearch',
            'id': 'torrentsearch',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'torrentsearch_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'torrentsearch_name'},
                {'type': 'bool', 'label': 'Enable BTN', 'name': 'torrents_btn_enabled'},
                {'type': 'text', 'label': 'BTN apikey', 'name': 'torrentsearch_btn_apikey'},
                {'type': 'bool', 'label': 'Fenopy', 'name': 'torrents_fenopy_enabled'},
                {'type': 'bool', 'label': 'Fenopy verified torrents only', 'name': 'torrents_fenopy_enabled_verified'},
                {'type': 'bool', 'label': 'Norbits', 'name': 'torrents_norbits_enabled'},
                {'type': 'text', 'label': 'Norbits username', 'name': 'torrents_norbits_username'},
                {'type': 'text', 'label': 'Norbits passkey', 'name': 'torrents_norbits_passkey'}
            ]
        })

    @cherrypy.expose()
    def index(self, query='', **kwargs):
        return htpc.LOOKUP.get_template('torrentsearch.html').render(query=query, scriptname='torrentsearch')

    # Search all, add categorys and providers later
    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def search(self, query=None):
        r = []
        r += self.btn(query)
        r += self.search_fenopy(query, 'all')
        r += self.search_norbits(query, 'tv')
        return r

    @cherrypy.expose()
    def btn(self, query=None):
        btn = jsonrpclib.Server('http://api.btnapps.net')
        result = btn.getTorrents(htpc.settings.get('torrentsearch_btn_apikey', ''), query, 999)
        search_results = []

        try:
            if 'torrents' in result:
                for k, v in result['torrents'].iteritems():
                    v["BrowseURL"] = 'https://broadcasthe.net/torrents.php?id=%s&torrentid=%s' % (v['GroupID'], v['TorrentID'])
                    v["Provider"] = "btn"
                    search_results.append(v)
                return search_results
            else:
                return search_results
        except Exception as e:
            self.logger.error("Failed to fetch search results from BTN %s" % e)

    def torrentproviders(self):
        torrentproviders = ['ALL']
        if htpc.settings.get('torrents_btnapikey') and htpc.settings.get('torrents_btn_enabled') == 1:
            torrentproviders.append('BTN')

        if htpc.settings.get('torrents_fenopy_enabled') == 1:
            torrentproviders.append('fenopy')

        if htpc.settings.get('torrents_norbits_enabled') == 1 and htpc.settings.get('torrents_norbits_passkey') and htpc.settings.get('torrents_norbits_username'):
            torrentproviders.append('norbits')

        return torrentproviders

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

    def search_fenopy(self, q, cat):
        results = fenopy.search(q, cat)
        return results

    def search_norbits(self, q, cat):
        results = norbits.search(q, cat)
        return results

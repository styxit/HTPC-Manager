#!/usr/bin/env python
# -*- coding: utf-8 -*-

import htpc
import cherrypy
import jsonrpclib
import logging
from ts import norbits
from ts import yts
from ts import ka
from ts import getstrike
from cherrypy.lib.auth2 import require


class Torrentsearch(object):
    def __init__(self):
        self.logger = logging.getLogger('modules.torrentsearch')
        htpc.MODULES.append({
            'name': 'Torrent Search',
            'id': 'torrentsearch',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'torrentsearch_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'torrentsearch_name'},
                {'type': 'bool', 'label': 'Enable BTN', 'name': 'torrents_btn_enabled'},
                {'type': 'text', 'label': 'BTN apikey', 'name': 'torrentsearch_btn_apikey'},
                {'type': 'bool', 'label': 'Norbits', 'name': 'torrents_norbits_enabled'},
                {'type': 'text', 'label': 'Norbits username', 'name': 'torrents_norbits_username'},
                {'type': 'text', 'label': 'Norbits passkey', 'name': 'torrents_norbits_passkey'},
                {'type': 'bool', 'label': 'YTS', 'name': 'torrents_yts_enabled'},
                {'type': 'bool', 'label': 'KAT', 'name': 'torrents_ka_enabled'},
                {'type': 'bool', 'label': 'Strike', 'name': 'torrents_getstrike_enabled'},
            ]
        })

    @cherrypy.expose()
    @require()
    def index(self, query='', **kwargs):
        return htpc.LOOKUP.get_template('torrentsearch.html').render(query=query, scriptname='torrentsearch')

    # Search all, add categorys and providers later
    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def search(self, query=None):
        self.logger.debug(query)
        r = []
        if htpc.settings.get('torrents_btn_enabled'):
            r += self.btn(query)
        if htpc.settings.get('torrents_norbits_enabled'):
            r += self.search_norbits(query, 'all')
        if htpc.settings.get('torrents_yts_enabled'):
            r += self.search_yts(query)
        if htpc.settings.get('torrents_ka_enabled'):
            r += self.search_ka(query)
        if htpc.settings.get('torrents_getstrike_enabled'):
            r += self.search_getstrike(query, 'all')
        return r

    def btn(self, query=None):
        result = None
        try:
            btn = jsonrpclib.Server('http://api.btnapps.net')
            result = btn.getTorrents(htpc.settings.get('torrentsearch_btn_apikey', ''), query, 999)
        except Exception as e:
            self.logger.error("Failed to fetch search results from BTN %s" % e)
            return []

        search_results = []

        try:
            if result:
                if 'torrents' in result:
                    for k, v in result['torrents'].iteritems():
                        v["BrowseURL"] = 'https://broadcasthe.net/torrents.php?id=%s&torrentid=%s' % (v['GroupID'], v['TorrentID'])
                        v["Provider"] = "btn"
                        search_results.append(v)
                    return search_results
                else:
                    return search_results
            else:
                return search_results
        except Exception as e:
            self.logger.error("Failed to fetch search results from BTN %s" % e)
            return []

    def torrentproviders(self):
        torrentproviders = ['ALL']
        if htpc.settings.get('torrents_btnapikey') and htpc.settings.get('torrents_btn_enabled') == 1:
            torrentproviders.append('BTN')

        if htpc.settings.get('torrents_norbits_enabled') == 1 and htpc.settings.get('torrents_norbits_passkey') and htpc.settings.get('torrents_norbits_username'):
            torrentproviders.append('norbits')

        if htpc.settings.get('torrents_yts_enabled') == 1:
            torrentproviders.append('yts')

        if htpc.settings.get('torrents_ka_enabled') == 1:
            torrentproviders.append('ka')

        if htpc.settings.get('torrents_getstrike_enabled') == 1:
            torrentproviders.append('getstrike')

        return torrentproviders

    @cherrypy.expose()
    @require()
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

    def search_norbits(self, q, cat):
        results = norbits.search(q, cat)
        return results

    def search_yts(self, q, cat=None):
        return yts.YTS().search(q, cat)

    def search_ka(self, q, cat="all"):
        return ka.search(q, cat)

    def search_getstrike(self, q, cat):
        return getstrike.search(q, cat)

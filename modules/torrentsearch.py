#!/usr/bin/env python
# -*- coding: utf-8 -*-

import htpc
import cherrypy
import jsonrpclib
import logging
from ts import norbits
from ts import ka
from ts import ptp
from ts import rarbg
from ts import torrentproject
from cherrypy.lib.auth2 import require


class Torrentsearch(object):
    def __init__(self):
        self.logger = logging.getLogger('modules.torrentsearch')
        self.rb = rarbg.Rarbg()
        htpc.MODULES.append({
            'name': 'Torrents',
            'id': 'torrentsearch',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'torrentsearch_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'torrentsearch_name'},
                {'type': 'bool', 'label': 'Enable BTN', 'name': 'torrents_btn_enabled'},
                {'type': 'password', 'label': 'BTN apikey', 'name': 'torrents_btn_apikey'},
                {'type': 'bool', 'label': 'Norbits', 'name': 'torrents_norbits_enabled'},
                {'type': 'text', 'label': 'Norbits username', 'name': 'torrents_norbits_username'},
                {'type': 'password', 'label': 'Norbits passkey', 'name': 'torrents_norbits_passkey'},
                {'type': 'bool', 'label': 'PTP', 'name': 'torrents_ptp_enabled'},
                {'type': 'text', 'label': 'PTP username', 'name': 'torrents_ptp_username'},
                {'type': 'password', 'label': 'PTP password', 'name': 'torrents_ptp_password'},
                {'type': 'password', 'label': 'PTP passkey', 'name': 'torrents_ptp_passkey'},
                {'type': 'bool', 'label': 'Rarbg', 'name': 'torrents_rarbg_enabled'},
                {'type': 'bool', 'label': 'KAT', 'name': 'torrents_ka_enabled'},
                #{'type': 'bool', 'label': 'Strike', 'name': 'torrents_getstrike_enabled', 'desc': 'DTH tracker'},
                {'type': 'bool', 'label': 'Torrent project', 'name': 'torrents_torrentproject_enabled', 'desc': 'DTH tracker'}
            ]
        })

    @cherrypy.expose()
    @require()
    def index(self, query='', **kwargs):
        return htpc.LOOKUP.get_template('torrentsearch.html').render(query=query, scriptname='torrentsearch', torrentproviders=self.torrentproviders())

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def search(self, query=None, provider='all'):
        self.logger.debug(query)
        self.logger.debug(provider)
        r = []

        if provider == 'all':
            if htpc.settings.get('torrents_btn_enabled'):
                r += self.btn(query)
            if htpc.settings.get('torrents_norbits_enabled'):
                r += self.search_norbits(query, 'all')
            if htpc.settings.get('torrents_ka_enabled'):
                r += self.search_ka(query)
            if htpc.settings.get('torrents_getstrike_enabled'):
                r += self.search_getstrike(query, 'all')
            if htpc.settings.get('torrents_ptp_enabled'):
                r += self.search_ptp(query, 'movie')
            if htpc.settings.get('torrents_rarbg_enabled'):
                r += self.search_rarbg(query, None)
            if htpc.settings.get('torrents_torrentproject_enabled'):
                r += self.search_torrentproject(query, None)

        elif provider == 'btn':
            if htpc.settings.get('torrents_btn_enabled'):
                r += self.btn(query)
        elif provider == 'rarbg':
            if htpc.settings.get('torrents_rarbg_enabled'):
                r += self.search_rarbg(query, None)
        #elif provider == 'getstrike':
        #    if htpc.settings.get('torrents_getstrike_enabled'):
        #        r += self.search_getstrike(query, 'all')
        elif provider == 'torrentproject':
            if htpc.settings.get('torrents_torrentproject_enabled'):
                r += self.search_torrentproject(query, 'all')
        elif provider == 'kat':
            if htpc.settings.get('torrents_ka_enabled'):
                r += self.search_ka(query)
        elif provider == 'norbits':
            if htpc.settings.get('torrents_norbits_enabled'):
                r += self.search_norbits(query, 'all')

        self.logger.debug('Found %s torrents in total' % len(r))
        return r

    def btn(self, query=None):
        result = None
        try:
            btn = jsonrpclib.Server('http://api.btnapps.net')
            result = btn.getTorrents(htpc.settings.get('torrents_btn_apikey', ''), query, 999)
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
        torrentproviders = []
        if htpc.settings.get('torrents_btn_apikey') and htpc.settings.get('torrents_btn_enabled') == 1:
            torrentproviders.append('BTN')

        if (htpc.settings.get('torrents_norbits_enabled') == 1 and
            htpc.settings.get('torrents_norbits_passkey') and htpc.settings.get('torrents_norbits_username')):
            torrentproviders.append('norbits')

        if htpc.settings.get('torrents_ka_enabled') == 1:
            torrentproviders.append('KAT')

        # hope it comes back
        #if htpc.settings.get('torrents_getstrike_enabled') == 1:
        #    torrentproviders.append('GetStrike')

        if (htpc.settings.get('torrents_ptp_enabled') == 1 and htpc.settings.get('torrents_ptp_passkey')
            and htpc.settings.get('torrents_ptp_username') and htpc.settings.get('torrents_ptp_password')):
            torrentproviders.append('PTP')

        if htpc.settings.get('torrents_rarbg_enabled') == 1:
            torrentproviders.append('rarbg')

        if htpc.settings.get('torrents_torrentproject_enabled') == 1:
            torrentproviders.append('torrentproject')

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

    def search_ka(self, q, cat="all"):
        return ka.search(q, cat)

    def search_getstrike(self, q, cat):
        return getstrike.search(q, cat)

    def search_ptp(self, q, cat):
        return ptp.search(q, cat)

    def search_rarbg(self, q, cat):
        return self.rb.search(q, cat)

    def search_torrentproject(self, q, cat):
        return torrentproject.Torrentproject().search(q, cat)

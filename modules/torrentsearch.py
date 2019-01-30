#!/usr/bin/env python
# -*- coding: utf-8 -*-


import logging
import re

import cherrypy
import jsonrpclib

import htpc
from ts import norbits
from ts import ka
from ts import ptp
from ts import rarbg
from ts import torrentproject
from ts import jackett2
from cherrypy.lib.auth2 import require


regex_codec = re.compile(r'(x264|x\.264|h264|h\.264|xvid|x265|x\.265|h265|h\.265|mpeg2|divx)', re.I)
regex_source = re.compile(r'(HDTV|HD-TV|HD\.TV|WEB-DL|WEB_DL|WEB\.DL|WEB_RIP|WEB-RIP|WEBRip|WEB\.RIP|BRRIP|BDRIP|BluRay(.*)REMUX)|(?i)BluRay(.*)\.(AVC|VC-1)\.|BluRay', re.I)
regex_resolution = re.compile(r'(sd|480p|480i|720p|720i|1080p|1080i|2160p)', re.I)


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
                {'type': 'bool', 'label': 'Torrent project', 'name': 'torrents_torrentproject_enabled', 'desc': 'DTH tracker'},
                {'type': 'bool', 'label': 'Jackett', 'name': 'torrents_jackett_enabled'},
                {'type': 'text', 'label': 'Jackett host', 'name': 'torrents_jackett_host'},
                {'type': 'text', 'label': 'Jackett port', 'name': 'torrents_jackett_port'},
                {'type': 'bool', 'label': 'Jackett ssl', 'name': 'torrents_jackett_ssl'},
                {'type': 'password', 'label': 'Jackett apikey', 'name': 'torrents_jackett_apikey'},
                {'type': 'text', 'label': 'Reverse proxy link', 'placeholder': '/jackett', 'desc': 'Page title link. E.g /jackett or https://rarbg.to/', 'name': 'torrents_reverse_proxy_link'}

            ]
        })

    @cherrypy.expose()
    @require()
    def index(self, query='', **kwargs):
        return htpc.LOOKUP.get_template('torrentsearch.html').render(query=query, scriptname='torrentsearch', torrentproviders=self.torrentproviders(), webinterface=self.webinterface())

    def webinterface(self):
    # Return the reverse proxy url if specified
        return htpc.settings.get('torrents_reverse_proxy_link')

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
            if htpc.settings.get('torrents_ptp_enabled'):
                r += self.search_ptp(query, 'movie')
            if htpc.settings.get('torrents_rarbg_enabled'):
                r += self.search_rarbg(query, None)
            if htpc.settings.get('torrents_torrentproject_enabled'):
                r += self.search_torrentproject(query, None)
            if htpc.settings.get('torrents_jackett_enabled'):
                r += self.search_jackett(query, None)

        elif provider == 'btn':
            if htpc.settings.get('torrents_btn_enabled'):
                r += self.btn(query)
        elif provider == 'rarbg':
            if htpc.settings.get('torrents_rarbg_enabled'):
                r += self.search_rarbg(query, None)
        elif provider == 'torrentproject':
            if htpc.settings.get('torrents_torrentproject_enabled'):
                r += self.search_torrentproject(query, 'all')
        elif provider == 'kat':
            if htpc.settings.get('torrents_ka_enabled'):
                r += self.search_ka(query)
        elif provider == 'norbits':
            if htpc.settings.get('torrents_norbits_enabled'):
                r += self.search_norbits(query, 'all')

        elif provider == 'jackett':
            if htpc.settings.get('torrents_jackett_enabled'):
                r += self.search_jackett(query, '')

        for res in r:
            if not res.get('Source') or res.get('Source') == 'N/A':
                source = re.search(regex_source, res['ReleaseName'])
                if source:
                    source = source.group()
                else:
                    source = 'N/A'
                res['Source'] = source

            if not res.get('Codec') or res.get('Codec') == 'N/A':
                codec = re.search(regex_codec, res['ReleaseName'])
                if codec:
                    codec = codec.group()
                else:
                    codec = 'N/A'
                res['Codec'] = codec

            if not res.get('Resolution') or res.get('Resolution') == 'N/A':
                resolution = re.search(regex_resolution, res['ReleaseName'])
                if resolution:
                    resolution = resolution.group()
                else:
                    resolution = 'N/A'
                res['Resolution'] = resolution

        self.logger.debug('Found %s torrents in total' % len(r))
        return r

    def btn(self, query=None):
        result = None
        try:
            btn = jsonrpclib.Server('https://api.broadcasthe.net')
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

        if (htpc.settings.get('torrents_ptp_enabled') == 1 and htpc.settings.get('torrents_ptp_passkey')
            and htpc.settings.get('torrents_ptp_username') and htpc.settings.get('torrents_ptp_password')):
            torrentproviders.append('PTP')

        if htpc.settings.get('torrents_rarbg_enabled') == 1:
            torrentproviders.append('rarbg')

        if htpc.settings.get('torrents_torrentproject_enabled') == 1:
            torrentproviders.append('torrentproject')

        if (htpc.settings.get('torrents_jackett_enabled') == 1 and htpc.settings.get('torrents_jackett_host') and
            htpc.settings.get('torrents_jackett_port') and htpc.settings.get('torrents_jackett_apikey')):
            torrentproviders.append('jackett')

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
        rtor = {}
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
        if htpc.settings.get('rtorrent_enable', ''):
            rtor['title'] = 'rTorrent'
            rtor['active'] = 1
            rtor['path'] = 'rtorrent/to_client'
            l.append(rtor)
        else:
            rtor['title'] = 'rTorrent'
            rtor['active'] = 0
            rtor['path'] = 'rtorrent/to_client'
            l.append(rtor)

        return l

    def search_norbits(self, q, cat):
        results = norbits.search(q, cat)
        return results

    def search_ka(self, q, cat="all"):
        return ka.search(q, cat)

    def search_ptp(self, q, cat):
        return ptp.search(q, cat)

    def search_rarbg(self, q, cat):
        return self.rb.search(q, cat)

    def search_torrentproject(self, q, cat):
        return torrentproject.Torrentproject().search(q, cat)

    def search_jackett(self, q, cat='all'):
        return jackett2.jackett(q, cat)

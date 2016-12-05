#!/usr/bin/env python
# -*- coding: utf-8 -*-

import cherrypy
import htpc
from urllib import quote, urlencode
import requests
import logging
from cherrypy.lib.auth2 import require, member_of
from htpc.helpers import fix_basepath, get_image, striphttp


class Sickrage(object):
    def __init__(self):
        self.logger = logging.getLogger('modules.sickrage')
        htpc.MODULES.append({
            'name': 'Sickrage',
            'id': 'sickrage',
            'test': htpc.WEBDIR + 'sickrage/ping',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'sickrage_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'sickrage_name'},
                {'type': 'text', 'label': 'IP / Host', 'placeholder': 'localhost', 'name': 'sickrage_host'},
                {'type': 'text', 'label': 'Port', 'placeholder': '8081', 'name': 'sickrage_port'},
                {'type': 'text', 'label': 'Basepath', 'placeholder': '/sickrage', 'name': 'sickrage_basepath'},
                {'type': 'text', 'label': 'API key', 'name': 'sickrage_apikey'},
                {'type': 'bool', 'label': 'Use SSL', 'name': 'sickrage_ssl'},
                {'type': 'text', 'label': 'Reverse proxy link', 'placeholder': '', 'desc':'Reverse proxy link, e.g. https://sr.domain.com', 'name': 'sickrage_reverse_proxy_link'}
            ]
        })

    @cherrypy.expose()
    @require()
    def index(self):
        return htpc.LOOKUP.get_template('sickrage.html').render(scriptname='sickrage', webinterface=self.webinterface())

    def webinterface(self):
        host = striphttp(htpc.settings.get('sickrage_host', ''))
        port = str(htpc.settings.get('sickrage_port', ''))
        apikey = htpc.settings.get('sickrage_apikey', '')
        ssl = 's' if htpc.settings.get('sickrage_ssl', 0) else ''
        sickrage_basepath = fix_basepath(htpc.settings.get('sickrage_basepath', '/'))

        url = 'http%s://%s:%s%s' % (ssl, host, port, sickrage_basepath)

        if htpc.settings.get('sickrage_reverse_proxy_link'):
            url = htpc.settings.get('sickrage_reverse_proxy_link')

        return url

    @cherrypy.expose()
    @require()
    def view(self, indexerid):
        if not (indexerid.isdigit()):
            raise cherrypy.HTTPError('500 Error', 'Invalid show ID.')
            self.logger.error('Invalid show ID was supplied: ' + str(indexerid))
            return False

        return htpc.LOOKUP.get_template('sickrage_view.html').render(scriptname='sickrage_view', indexerid=indexerid)

    @cherrypy.expose()
    @require(member_of(htpc.role_admin))
    @cherrypy.tools.json_out()
    def ping(self, sickrage_host, sickrage_port, sickrage_apikey, sickrage_basepath, sickrage_ssl=False, **kwargs):
        ssl = 's' if sickrage_ssl else ''
        self.logger.debug('Testing connectivity')
        try:
            sickrage_basepath = fix_basepath(sickrage_basepath)

            url = 'http%s://%s:%s%sapi/%s/?cmd=sb.ping' % (ssl, striphttp(sickrage_host), sickrage_port, sickrage_basepath, sickrage_apikey)

            self.logger.debug('Trying to contact sickrage via %s' % url)
            response = requests.get(url, timeout=10, verify=False)
            ret = response.json()
            if ret.get('result') == 'success':
                self.logger.debug('Sickrage connectivity test success')
                return ret
        except:
            self.logger.error('Unable to contact sickrage via %s' % url)
            return

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetShowList(self):
        self.logger.debug('Fetching Show list')
        return self.fetch('shows&sort=name', False, 200)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetNextAired(self):
        self.logger.debug('Fetching Next Aired Episodes')
        return self.fetch('future')

    @cherrypy.expose()
    @require()
    def GetBanner(self, indexerid):
        self.logger.debug('Fetching Banner')
        cherrypy.response.headers['Content-Type'] = 'image/jpeg'
        return self.fetch('show.getbanner&indexerid=' + indexerid, True)

    @cherrypy.expose()
    @require()
    def GetPoster(self, indexerid):
        self.logger.debug('Fetching Poster')
        cherrypy.response.headers['Content-Type'] = 'image/jpeg'
        return self.fetch('show.getposter&indexerid=' + indexerid, True)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetHistory(self, limit=''):
        self.logger.debug('Fetching History')
        return self.fetch('history&limit=' + limit)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetLogs(self):
        self.logger.debug('Fetching Logs')
        return self.fetch('logs&min_level=info')

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def AddShow(self, indexername='', indexerid='', **kwargs):
        # indexername=tvrageid or tvdbid
        self.logger.debug('Adding a Show')
        return self.fetch('show.addnew&' + urlencode(kwargs))

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetShow(self, indexerid):
        self.logger.debug('Fetching Show')
        return self.fetch('show&indexerid=' + indexerid)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetEpisode(self, strShowID, strSeason, strEpisode):
        return self.fetch('episode&indexerid=' + strShowID + '&season=' + strSeason + '&episode=' + strEpisode + '&full_path=1')

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetSeason(self, indexerid, season):
        self.logger.debug('Fetching Season')
        return self.fetch('show.seasons&indexerid=' + indexerid + '&season=' + season)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def Postprocess(self, path='', force_replace=False, return_data=False, is_priority=False, type=False):
        self.logger.debug('Postprocess')
        if path:
            path = '&%s' % path
        return self.fetch('postprocess' + path, False, 120)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def Restart(self):
        self.logger.debug('Restart sr')
        return self.fetch('sb.restart', False, 15)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def SearchEpisodeDownload(self, indexerid, season, episode):
        self.logger.debug('Fetching Episode Downloads')
        return self.fetch('episode.search&indexerid=' + indexerid + '&season=' + season + '&episode=' + episode, False, 45)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def SearchSubtitle(self, indexerid, season, episode):
        self.logger.debug('Fetching subtitle')
        return self.fetch('episode.subtitlesearch&indexerid=' + indexerid + '&season=' + season + '&episode=' + episode, False, 45)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def Shutdown(self):
        self.logger.debug('Shutdown sickrage')
        return self.fetch('sb.shutdown', False, 20)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def ForceFullUpdate(self, indexerid):
        self.logger.debug('Force full update for indexerid %s' % indexerid)
        return self.fetch('show.update&indexerid=' + indexerid)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def RescanFiles(self, indexerid):
        self.logger.debug('Rescan all local files for indexerid %s' % indexerid)
        return self.fetch('show.refresh&indexerid=' + indexerid)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    @require(member_of(htpc.role_user))
    def RemoveShow(self, indexerid, show_name=''):
        self.logger.debug('Delete %s from Sickrage indexerid %s' % (show_name, indexerid))
        return self.fetch('show.delete&indexerid=%s' % indexerid)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    @require()
    def SearchShow(self, query):
        self.logger.debug('Searching tvdb and tvrage for %s query')
        return self.fetch('sb.searchindexers&indexer=0&name=%s' % quote(query), False, 60)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def ShowsStats(self):
        self.logger.debug('Grabbing tvrage statistics')
        return self.fetch('shows.stats')

    def fetch(self, cmd, img=False, timeout=20):
        
        host = striphttp(htpc.settings.get('sickrage_host', ''))
        port = str(htpc.settings.get('sickrage_port', ''))
        apikey = htpc.settings.get('sickrage_apikey', '')
        ssl = 's' if htpc.settings.get('sickrage_ssl', 0) else ''
        sickrage_basepath = fix_basepath(htpc.settings.get('sickrage_basepath', '/'))

        url = 'http%s://%s:%s%sapi/%s/?cmd=%s' % (ssl, host, port, sickrage_basepath, apikey, cmd)
        self.logger.debug('Fetching information from: %s' % url)
        
        try:
            if img is True:
                # Cache the images
                return get_image(url)

            res = requests.get(url, timeout=timeout, verify=False)
            return res.json()
        except Exception as e:
            self.logger.error('Unable to fetch information')
            self.logger.error(url)
            self.logger.error(e)
            return

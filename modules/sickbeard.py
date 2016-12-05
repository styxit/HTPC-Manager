#!/usr/bin/env python
# -*- coding: utf-8 -*-

import cherrypy
import htpc
from urllib import quote_plus
import requests
import logging
from cherrypy.lib.auth2 import require, member_of
from htpc.helpers import fix_basepath, get_image, striphttp


class Sickbeard(object):
    def __init__(self):
        self.logger = logging.getLogger('modules.sickbeard')
        htpc.MODULES.append({
            'name': 'Sick Beard',
            'id': 'sickbeard',
            'test': htpc.WEBDIR + 'sickbeard/ping',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'sickbeard_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'sickbeard_name'},
                {'type': 'text', 'label': 'IP / Host', 'placeholder': 'localhost', 'name': 'sickbeard_host'},
                {'type': 'text', 'label': 'Port', 'placeholder': '8081', 'name': 'sickbeard_port'},
                {'type': 'text', 'label': 'Basepath', 'placeholder': '/sickbeard', 'name': 'sickbeard_basepath'},
                {'type': 'text', 'label': 'API key', 'name': 'sickbeard_apikey'},
                {'type': 'bool', 'label': 'Use SSL', 'name': 'sickbeard_ssl'},
                {'type': 'text', 'label': 'Reverse proxy link', 'placeholder': '', 'desc': 'Reverse proxy link ex: https://sb.domain.com', 'name': 'sickbeard_reverse_proxy_link'},

            ]
        })

    @cherrypy.expose()
    @require()
    def index(self):
        return htpc.LOOKUP.get_template('sickbeard.html').render(scriptname='sickbeard', webinterface=self.webinterface())

    def webinterface(self):
        ''' Generate page from template '''
        ssl = 's' if htpc.settings.get('sickbeard_ssl', 0) else ''
        host = striphttp(htpc.settings.get('sickbeard_host', ''))
        port = str(htpc.settings.get('sickbeard_port', ''))
        basepath = fix_basepath(htpc.settings.get('sickbeard_basepath', '/'))

        url = 'http%s://%s:%s%s' % (ssl, host, port, basepath)

        if htpc.settings.get('sickbeard_reverse_proxy_link'):
            url = htpc.settings.get('sickbeard_reverse_proxy_link')

        return url

    @cherrypy.expose()
    @require()
    def view(self, tvdbid):
        if not (tvdbid.isdigit()):
            raise cherrypy.HTTPError('500 Error', 'Invalid show ID.')
            self.logger.error('Invalid show ID was supplied: ' + str(tvdbid))
            return False

        return htpc.LOOKUP.get_template('sickbeard_view.html').render(scriptname='sickbeard_view', tvdbid=tvdbid)

    @cherrypy.expose()
    @require(member_of(htpc.role_admin))
    @cherrypy.tools.json_out()
    def ping(self, sickbeard_host, sickbeard_port, sickbeard_apikey, sickbeard_basepath, sickbeard_ssl=False, **kwargs):
        self.logger.info('Testing connectivity')
        ssl = 's' if sickbeard_ssl else ''
        if not sickbeard_basepath:
            sickbeard_basepath = fix_basepath(sickbeard_basepath)

        url = 'http%s://%s:%s%sapi/%s/?cmd=sb.ping' % (ssl, striphttp(sickbeard_host), sickbeard_port, sickbeard_basepath, sickbeard_apikey)
        try:
            self.logger.debug('Trying to contact sickbeard via %s' % url)
            response = requests.get(url, timeout=10, verify=False)
            r = response.json()

            if r.get('result') == 'success':
                self.logger.debug('Sicbeard connectivity test success')
                return r
        except:
            self.logger.error('Unable to contact sickbeard via %s' % url)
            return

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetShowList(self):
        self.logger.debug('Fetching Show list')
        return self.fetch('shows&sort=name')

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetNextAired(self):
        self.logger.debug('Fetching Next Aired Episodes')
        return self.fetch('future')

    @cherrypy.expose()
    @require()
    def GetBanner(self, tvdbid):
        self.logger.debug('Fetching Banner')
        cherrypy.response.headers['Content-Type'] = 'image/jpeg'
        return self.fetch('show.getbanner&tvdbid=' + tvdbid, True)

    @cherrypy.expose()
    @require()
    def GetPoster(self, tvdbid):
        self.logger.debug('Fetching Poster')
        cherrypy.response.headers['Content-Type'] = 'image/jpeg'
        return self.fetch('show.getposter&tvdbid=' + tvdbid, True)

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
    def AddShow(self, tvdbid):
        self.logger.debug('Adding a Show')
        return self.fetch('show.addnew&tvdbid=' + tvdbid)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetShow(self, tvdbid):
        self.logger.debug('Fetching Show')
        return self.fetch('show&tvdbid=' + tvdbid)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetEpisode(self, strShowID, strSeason, strEpisode):
        return self.fetch('episode&tvdbid=' + strShowID + '&season=' + strSeason + '&episode=' + strEpisode + '&full_path=1')

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetSeason(self, tvdbid, season):
        self.logger.debug('Fetching Season')
        return self.fetch('show.seasons&tvdbid=' + tvdbid + '&season=' + season)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def SearchEpisodeDownload(self, tvdbid, season, episode):
        self.logger.debug('Fetching Episode Downloads')
        return self.fetch('episode.search&tvdbid=' + tvdbid + '&season=' + season + '&episode=' + episode, False, 45)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def ForceFullUpdate(self, tvdbid):
        self.logger.debug('Force full update for tvdbid ' + tvdbid)
        return self.fetch('show.update&tvdbid=' + tvdbid)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def RescanFiles(self, tvdbid):
        self.logger.debug('Rescan all local files for tvdbid ' + tvdbid)
        return self.fetch('show.refresh&tvdbid=' + tvdbid)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def RemoveShow(self, tvdbid):
        self.logger.debug('Removing Show tvdbid ' + tvdbid)
        return self.fetch('show.delete&tvdbid=' + tvdbid)

    @cherrypy.expose()
    @require()
    def SearchShow(self, query):
        try:
            self.logger.debug('Searching thetvdb for %s' % query)
            url = 'http://www.thetvdb.com/api/GetSeries.php?seriesname=' + quote_plus(query)
            r = requests.get(url, timeout=10)
            return r.content
        except Exception as e:
            self.logger.error('Failed to fetch info from thetvdb about %s %s' % (query, e))
            return

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    def Postprocess(self, path=''):
        if path:
            path = '&%s' % path

        return self.fetch('postprocess' + path)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    def Shutdown(self):
        self.logger.debug('Shutting down Sickbeard')
        return self.fetch('sb.shutdown')

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    def Restart(self):
        self.logger.debug('Restarting Sickbeard')
        return self.fetch('sb.restart')

    def fetch(self, cmd, img=False, timeout=10):
        try:
            host = htpc.settings.get('sickbeard_host', '')
            port = str(htpc.settings.get('sickbeard_port', ''))
            apikey = htpc.settings.get('sickbeard_apikey', '')
            ssl = 's' if htpc.settings.get('sickbeard_ssl', 0) else ''
            sickbeard_basepath = fix_basepath(htpc.settings.get('sickbeard_basepath', '/'))

            url = 'http' + ssl + '://' + host + ':' + str(port) + sickbeard_basepath + 'api/' + apikey + '/?cmd=' + cmd

            self.logger.debug('Fetching information from: %s' % url)

            if img is True:
                # Cache image
                return get_image(url)

            r = requests.get(url, timeout=timeout, verify=False)
            if r:
                r = r.json()

            return r
        except:
            self.logger.error('Unable to fetch information')
            return

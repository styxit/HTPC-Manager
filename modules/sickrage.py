#!/usr/bin/env python
# -*- coding: utf-8 -*-

import cherrypy
import htpc
from urllib import quote, urlencode
from urllib2 import urlopen
from json import loads
import logging
from cherrypy.lib.auth2 import require
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
                {'type': 'bool', 'label': 'Use SSL', 'name': 'sickrage_ssl'}
            ]
        })

    @cherrypy.expose()
    @require()
    def index(self):
        return htpc.LOOKUP.get_template('sickrage.html').render(scriptname='sickrage')

    @cherrypy.expose()
    @require()
    def view(self, tvdbid):
        if not (tvdbid.isdigit()):
            raise cherrypy.HTTPError("500 Error", "Invalid show ID.")
            self.logger.error("Invalid show ID was supplied: " + str(tvdbid))
            return False

        return htpc.LOOKUP.get_template('sickrage_view.html').render(scriptname='sickrage_view', tvdbid=tvdbid)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def ping(self, sickrage_host, sickrage_port, sickrage_apikey, sickrage_basepath, sickrage_ssl=False, **kwargs):
        ssl = 's' if sickrage_ssl else ''
        self.logger.debug("Testing connectivity")
        try:
            if not sickrage_basepath:
                sickrage_basepath = fix_basepath(sickrage_basepath)

            url = 'http%s://%s:%s%sapi/%s/?cmd=sb.ping' % (ssl, striphttp(sickrage_host), sickrage_port, sickrage_basepath, sickrage_apikey)

            self.logger.debug("Trying to contact sickrage via " + url)
            response = loads(urlopen(url, timeout=10).read())
            if response.get('result') == "success":
                self.logger.debug("Sickrage connectivity test success")
                return response
        except:
            self.logger.error("Unable to contact sickrage via %s" % url)
            return

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetShowList(self):
        self.logger.debug("Fetching Show list")
        return self.fetch('shows&sort=name', False, 200)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetNextAired(self):
        self.logger.debug("Fetching Next Aired Episodes")
        return self.fetch('future')

    @cherrypy.expose()
    @require()
    def GetBanner(self, tvdbid):
        self.logger.debug("Fetching Banner")
        cherrypy.response.headers['Content-Type'] = 'image/jpeg'
        return self.fetch('show.getbanner&tvdbid=' + tvdbid, True)

    @cherrypy.expose()
    @require()
    def GetPoster(self, tvdbid):
        self.logger.debug("Fetching Poster")
        cherrypy.response.headers['Content-Type'] = 'image/jpeg'
        return self.fetch('show.getposter&indexerid=' + tvdbid, True)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetHistory(self, limit=''):
        self.logger.debug("Fetching History")
        return self.fetch('history&limit=' + limit)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetLogs(self):
        self.logger.debug("Fetching Logs")
        return self.fetch('logs&min_level=info')

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def AddShow(self, indexername='', indexerid='', **kwargs):
        # indexername=tvrageid or tvdbid
        self.logger.debug("Adding a Show")
        return self.fetch('show.addnew&' + urlencode(kwargs))

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetShow(self, tvdbid):
        self.logger.debug("Fetching Show")
        return self.fetch('show&indexerid=' + tvdbid)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetEpisode(self, strShowID, strSeason, strEpisode):
        return self.fetch("episode&indexerid=" + strShowID + "&season=" + strSeason + "&episode=" + strEpisode + "&full_path=1")

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetSeason(self, tvdbid, season):
        self.logger.debug("Fetching Season")
        return self.fetch('show.seasons&indexerid=' + tvdbid + '&season=' + season)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Postprocess(self, path='', force_replace=False, return_data=False, is_priority=False, type=False):
        self.logger.debug("Postprocess")
        if path:
            path = '&%s' % path
        return self.fetch('postprocess' + path, False, 120)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Restart(self):
        self.logger.debug("Restart sb")
        return self.fetch('sb.restart', False, 15)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def SearchEpisodeDownload(self, tvdbid, season, episode):
        self.logger.debug("Fetching Episode Downloads")
        return self.fetch('episode.search&indexerid=' + tvdbid + '&season=' + season + '&episode=' + episode, False, 45)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def SearchSubtitle(self, tvdbid, season, episode):
        self.logger.debug("Fetching subtitle")
        return self.fetch('episode.subtitlesearch&indexerid=' + tvdbid + '&season=' + season + '&episode=' + episode, False, 45)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Shutdown(self):
        self.logger.debug("Shutdown sickrage")
        return self.fetch('sb.shutdown', False, 20)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def ForceFullUpdate(self, tvdbid):
        self.logger.debug("Force full update for tvdbid " + tvdbid)
        return self.fetch("show.update&indexerid=" + tvdbid)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def RescanFiles(self, tvdbid):
        self.logger.debug("Rescan all local files for tvdbid " + tvdbid)
        return self.fetch("show.refresh&indexerid=" + tvdbid)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    @require()
    def RemoveShow(self, indexerid, show_name=''):
        self.logger.debug("Delete %s from Sickrage indexerid %s" % (show_name, indexerid))
        return self.fetch("show.delete&indexerid=%s" % indexerid)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    @require()
    def SearchShow(self, query):
        self.logger.debug("Searching tvdb and tvrage for %s query")
        return self.fetch("sb.searchindexers&indexer=0&name=%s" % quote(query), False, 60)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def ShowsStats(self):
        self.logger.debug("Grabbing tvrage statistics")
        return self.fetch("shows.stats")

    def fetch(self, cmd, img=False, timeout=20):
        try:
            host = striphttp(htpc.settings.get('sickrage_host', ''))
            port = str(htpc.settings.get('sickrage_port', ''))
            apikey = htpc.settings.get('sickrage_apikey', '')
            ssl = 's' if htpc.settings.get('sickrage_ssl', 0) else ''
            sickrage_basepath = fix_basepath(htpc.settings.get('sickrage_basepath', '/'))

            url = 'http%s://%s:%s%sapi/%s/?cmd=%s' % (ssl, host, port, sickrage_basepath, apikey, cmd)

            self.logger.debug("Fetching information from: %s" % url)

            if img is True:
                # Cache the images
                return get_image(url)

            return loads(urlopen(url, timeout=timeout).read())
        except Exception as e:
            self.logger.error("Unable to fetch information")
            self.logger.error(url)
            self.logger.error(e)
            return

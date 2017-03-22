#!/usr/bin/env python
# -*- coding: utf-8 -*-

import cherrypy
import htpc
from urllib import quote
from urllib2 import urlopen
from json import loads
import logging
from cherrypy.lib.auth2 import require


class Sickbeard:
    def __init__(self):
        self.logger = logging.getLogger("modules.sickbeard")
        htpc.MODULES.append({
            "name": "Sickbeard",
            "id": "sickbeard",
            "test": htpc.WEBDIR + "sickbeard/ping",
            "fields": [
                {"type": "bool", "label": "Enable", "name": "sickbeard_enable"},
                {"type": "text", "label": "Menu name", "name": "sickbeard_name"},
                {"type": "text", "label": "IP / Host", "placeholder": "localhost", "name": "sickbeard_host"},
                {"type": "text", "label": "Port", "placeholder": "8081", "name": "sickbeard_port"},
                {"type": "text", "label": "Basepath", "placeholder": "/sickbeard", "name": "sickbeard_basepath"},
                {"type": "text", "label": "API key", "name": "sickbeard_apikey"},
                {"type": "bool", "label": "Use SSL", "name": "sickbeard_ssl"}
            ]
        })

    @cherrypy.expose()
    @require()
    def index(self):
        return htpc.LOOKUP.get_template("sickbeard.html").render(scriptname="sickbeard", webinterface=self.webinterface())

    def webinterface(self):
        """ Generate page from template """
        ssl = "s" if htpc.settings.get("sickbeard_ssl", 0) else ""
        host = htpc.settings.get("sickbeard_host", "")
        port = str(htpc.settings.get("sickbeard_port", ""))
        basepath = htpc.settings.get("sickbeard_basepath", "/")
        if not basepath.endswith("/"):
            basepath += "/"

        url = "http%s://%s::%s%s" % (ssl, host, port, basepath)

        return url

    @cherrypy.expose()
    @require()
    def view(self, tvdbid):
        if not (tvdbid.isdigit()):
            raise cherrypy.HTTPError("500 Error", "Invalid show ID.")
            self.logger.error("Invalid show ID was supplied: " + str(tvdbid))
            return False

        return htpc.LOOKUP.get_template("sickbeard_view.html").render(scriptname="sickbeard_view", tvdbid=tvdbid)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def ping(self, sickbeard_host, sickbeard_port, sickbeard_apikey, sickbeard_basepath, sickbeard_ssl = False, **kwargs):
        ssl = "s" if sickbeard_ssl else ""
        self.logger.debug("Testing connectivity")
        try:
            if not (sickbeard_basepath.endswith("/")):
                sickbeard_basepath += "/"

            url = "http" + ssl + "://" + sickbeard_host + ":" + sickbeard_port + sickbeard_basepath + "api/" + sickbeard_apikey + "/?cmd=sb.ping"
            self.logger.debug("Trying to contact sickbeard via " + url)
            response = loads(urlopen(url, timeout=10).read())
            if response.get("result") == "success":
                self.logger.debug("Sicbeard connectivity test success")
                return response
        except:
            self.logger.error("Unable to contact sickbeard via " + url)
            return

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetShowList(self):
        self.logger.debug("Fetching Show list")
        return self.fetch("shows&sort=name")

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetNextAired(self):
        self.logger.debug("Fetching Next Aired Episodes")
        return self.fetch("future")

    @cherrypy.expose()
    @require()
    def GetBanner(self, tvdbid):
        self.logger.debug("Fetching Banner")
        cherrypy.response.headers["Content-Type"] = "image/jpeg"
        return self.fetch("show.getbanner&tvdbid=" + tvdbid, True)

    @cherrypy.expose()
    @require()
    def GetPoster(self, tvdbid):
        self.logger.debug("Fetching Poster")
        cherrypy.response.headers["Content-Type"] = "image/jpeg"
        return self.fetch("show.getposter&tvdbid=" + tvdbid, True)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetHistory(self, limit=""):
        self.logger.debug("Fetching History")
        return self.fetch("history&limit=" + limit)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetLogs(self):
        self.logger.debug("Fetching Logs")
        return self.fetch("logs&min_level=info")

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def AddShow(self, tvdbid):
        self.logger.debug("Adding a Show")
        return self.fetch("show.addnew&tvdbid=" + tvdbid)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetShow(self, tvdbid):
        self.logger.debug("Fetching Show")
        return self.fetch("show&tvdbid=" + tvdbid)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetEpisode(self, strShowID, strSeason, strEpisode):
        return self.fetch("episode&tvdbid=" + strShowID + "&season=" + strSeason + "&episode=" + strEpisode + "&full_path=1")

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetSeason(self, tvdbid, season):
        self.logger.debug("Fetching Season")
        return self.fetch("show.seasons&tvdbid=" + tvdbid + "&season=" + season)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def SearchEpisodeDownload(self, tvdbid, season, episode):
        self.logger.debug("Fetching Episode Downloads")
        return self.fetch("episode.search&tvdbid=" + tvdbid + "&season=" + season + "&episode=" + episode, False, 45)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def ForceFullUpdate(self, tvdbid):
        self.logger.debug("Force full update for tvdbid " + tvdbid)
        return self.fetch("show.update&tvdbid=" + tvdbid)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def RescanFiles(self, tvdbid):
        self.logger.debug("Rescan all local files for tvdbid " + tvdbid)
        return self.fetch("show.refresh&tvdbid=" + tvdbid)

    @cherrypy.expose()
    @require()
    def SearchShow(self, query):
        try:
            url = "http://www.thetvdb.com/api/GetSeries.php?seriesname=" + quote(query)
            return urlopen(url, timeout=10).read()
        except:
            return

    def fetch(self, cmd, img=False, timeout=10):
        try:
            host = htpc.settings.get("sickbeard_host", "")
            port = str(htpc.settings.get("sickbeard_port", ""))
            apikey = htpc.settings.get("sickbeard_apikey", "")
            ssl = "s" if htpc.settings.get("sickbeard_ssl", 0) else ""
            sickbeard_basepath = htpc.settings.get("sickbeard_basepath", "/")

            if not sickbeard_basepath.endswith("/"):
                sickbeard_basepath += "/"

            url = "http" + ssl + "://" + host + ":" + str(port) + sickbeard_basepath + "api/" + apikey + "/?cmd=" + cmd

            self.logger.debug("Fetching information from: " + url)

            if img is True:
                return urlopen(url, timeout=timeout).read()

            return loads(urlopen(url, timeout=timeout).read())
        except:
            self.logger.error("Unable to fetch information")
            return

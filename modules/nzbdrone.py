#!/usr/bin/env python
# -*- coding: utf-8 -*-

import cherrypy
import htpc
from cherrypy.lib.auth2 import require
import requests
import urllib
import logging
from json import loads, dumps
import datetime as DT


class NzbDrone:
    def __init__(self):
        self.logger = logging.getLogger('modules.nzbdrone')
        htpc.MODULES.append({
            'name': 'NzbDrone',
            'id': 'nzbdrone',
            'test': htpc.WEBDIR + 'nzbdrone/Version',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'nzbdrone_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'nzbdrone_name'},
                {'type': 'text', 'label': 'IP / Host', 'placeholder': 'localhost', 'name': 'nzbdrone_host'},
                {'type': 'text', 'label': 'Port', 'placeholder': '8989', 'name': 'nzbdrone_port'},
                {'type': 'text', 'label': 'Basepath', 'placeholder': '/nzbdrone', 'name': 'nzbdrone_basepath'},
                {'type': 'text', 'label': 'API', 'name': 'nzbdrone_apikey'},
                {'type': 'bool', 'label': 'Use SSL', 'name': 'nzbdrone_ssl'}
            ]
        })

    @cherrypy.expose()
    @require()
    def index(self):
        return htpc.LOOKUP.get_template('nzbdrone.html').render(scriptname='nzbdrone')

    def fetch(self, path, banner=None, type=None, data=None):
        try:
            host = htpc.settings.get('nzbdrone_host', '')
            port = str(htpc.settings.get('nzbdrone_port', ''))
            nzbdrone_basepath = htpc.settings.get('nzbdrone_basepath', '/')
            ssl = 's' if htpc.settings.get('nzbdrone_ssl', True) else ''

            if(nzbdrone_basepath == ""):
                nzbdrone_basepath = "/"
            if not(nzbdrone_basepath.endswith('/')):
                nzbdrone_basepath += "/"

            headers = {'X-Api-Key': htpc.settings.get('nzbdrone_apikey', '')}

            url = 'http%s://%s:%s%sapi/%s' % (ssl, host, port, nzbdrone_basepath, path)

            if banner:
                #  the path includes the basepath automaticly
                url = 'http%s://%s:%s%s' % (ssl, host, port, path)
                r = requests.get(url, headers=headers)
                return r.content

            if type == 'post':
                r = requests.post(url, data=dumps(data), headers=headers)
                return r.content
    
            elif type == 'put':
                r = requests.post(url, data=dumps(data), headers=headers)
                return r.content
    
            elif type == 'delete':
                r = requests.delete(url, data=dumps(data), headers=headers)
                return r.content
    
            else:
                r = requests.get(url, headers=headers)
                return loads(r.text)
    
        except Exception as e:
            self.logger.error('Failed to fetch path=%s error %s' % (path, e))

    @cherrypy.expose()
    @require()
    def Version(self, nzbdrone_host, nzbdrone_port, nzbdrone_basepath, nzbdrone_apikey, nzbdrone_ssl = False, **kwargs):
        try:
            ssl = 's' if nzbdrone_ssl else ''
            if(nzbdrone_basepath == ""):
                nzbdrone_basepath = "/"
            if not(nzbdrone_basepath.endswith('/')):
                nzbdrone_basepath += "/"

            headers = {'X-Api-Key': str(nzbdrone_apikey)}
            url = 'http%s://%s:%s%sapi/system/status' % (ssl, nzbdrone_host, nzbdrone_port, nzbdrone_basepath)
            result = requests.get(url, headers=headers)

            return result.json()
        except:
            return

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Rootfolder(self):
        path = self.fetch('Rootfolder')
        for p in path:
            return p["path"]

    #Returns all shows
    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Series(self):
        return self.fetch('Series')

    #Return one show
    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Show(self, id, tvdbid=None):
        return self.fetch('Series/%s' % id)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Delete_Show(self, id, title, delete_date=None):
        self.logger.debug('Deleted tvshow %s' % title)
        return self.fetch('Series/%s' % id, type='delete')

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def History(self):
        return self.fetch('History?page=1&pageSize=100&sortKey=date&sortDir=desc')

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Calendar(self, param=None):
        return self.fetch('Calendar?end=%s' % (DT.date.today() + DT.timedelta(days=7)))

    @cherrypy.expose()
    @require()
    def View(self, tvdbid, id):
        if not (tvdbid.isdigit()):
            raise cherrypy.HTTPError("500 Error", "Invalid show ID.")
            self.logger.error("Invalid show ID was supplied: " + str(id))
            return False

        return htpc.LOOKUP.get_template('nzbdrone_view.html').render(scriptname='nzbdrone_view', tvdbid=tvdbid, id=id)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Episodes(self, id):
        return self.fetch('episode?seriesId=%s' % id)

    @cherrypy.expose()
    @require()
    def GetBanner(self, url=None):
        self.logger.debug("Fetching Banner")
        cherrypy.response.headers['Content-Type'] = 'image/jpeg'
        return self.fetch(url, banner=True)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Episode(self, id):
        self.logger.debug("Fetching Episode info")
        return self.fetch('episode/%s' % id)

    #Returns all the episodes from a show, with file info
    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Episodesqly(self, id):
        self.logger.debug('Fetching fileinfo for all episodes in a show')
        return self.fetch('episodefile?seriesId=%s' % id)

    #Return one episode with file info
    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Episodeqly(self, id):
        return self.fetch('episodefile/%s' % id)

    #Return the download profiles, used to match a id to  get the name
    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Profile(self):
        return self.fetch('profile')

    @cherrypy.expose()
    @require()
    def Command(self, **kwargs):
        k = kwargs
        cherrypy.response.headers['Content-Type'] = "application/json"
        try:
            data = {}
            data["name"] = k["method"]
            if k["par"] == "episodeIds":
                k["id"] = [int(k["id"])]
            data[k["par"]] = k["id"]
        except KeyError:
            pass

        return self.fetch(path='command', data=data, type='post')

    #Search for a serie
    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Lookup(self, q):
        return self.fetch('Series/lookup?term=%s' % urllib.quote(q))

    @cherrypy.expose()
    @require()
    def AddShow(self, tvdbid, quality):
        d = {}
        try:
            tvshow = self.fetch('Series/lookup?term=tvdbid:%s' % tvdbid)
            rootfolder = self.Rootfolder()
            seasoncount = 1
            season = []
            for i in tvshow:
                seasoncount += i['seasonCount']

                d["title"] = i['title']
                d["tvdbId"] = int(i['tvdbId'])
                d["qualityProfileId"] = int(quality)
                d["titleSlug"] = i['titleSlug']
                d["RootFolderPath"] = rootfolder

                for x in xrange(1, int(seasoncount)):
                    s = {"seasonNumber": x, "monitored": True}
                    season.append(s)

                d["seasons"] = season

            # Manually add correct headers since @cherrypy.tools.json_out() renders it wrong
            cherrypy.response.headers['Content-Type'] = "application/json"
            return self.fetch('Series', data=d, type='post')

        except Exception, e:
            self.logger.error('Failed to add tvshow %s %s' % (tvdbid, e))

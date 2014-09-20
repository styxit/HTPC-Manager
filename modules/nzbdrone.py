#!/usr/bin/env python
# -*- coding: utf-8 -*-

import cherrypy
import htpc
from cherrypy.lib.auth2 import require
import requests
import urllib
import urllib2
from htpc.proxy import get_image
import logging
from json import loads, dumps
import datetime


class NzbDrone:
    def __init__(self):
        self.logger = logging.getLogger('modules.nzbdrone')
        htpc.MODULES.append({
            'name': 'NzbDrone',
            'id': 'nzbdrone',
            'test': htpc.WEBDIR + 'nzbdrone/version',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'nzbdrone_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'nzbdrone_name'},
                {'type': 'text', 'label': 'IP / Host', 'placeholder': 'localhost', 'name': 'nzbdrone_host'},
                {'type': 'text', 'label': 'Port', 'placeholder': '6789', 'name': 'nzbdrone_port'},
                {'type': 'text', 'label': 'Basepath', 'placeholder': '/nzbget', 'name': 'nzbdrone_basepath'},
                {'type': 'text', 'label': 'User', 'name': 'nzbdrone_username'},
                {'type': 'text', 'label': 'API', 'name': 'nzbdrone_apikey'},
                {'type': 'password', 'label': 'Password', 'name': 'nzbdrone_password'},
                {'type': 'bool', 'label': 'Use SSL', 'name': 'nzbdrone_ssl'}
            ]
        })

    @cherrypy.expose()
    @require()
    def index(self):
        return htpc.LOOKUP.get_template('nzbdrone.html').render(scriptname='nzbdrone')

    def fetch2(self, path, banner=None, type=None, data=None):
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

            #url = 'http' + ssl + '://' + host + ':' + port + nzbdrone_basepath + 'api/' + path

            if banner:
                url = 'http%s://%s:%s%s%s' % (ssl, host, port, nzbdrone_basepath, path[1:])
                request = urllib2.Request(url, headers=headers)

            else:
                request = urllib2.Request(url, headers=headers)

            if type == 'post':
                print 'fetch post req'
                print dumps(data)
                request = urllib2.Request(url=url, headers=headers, data=dumps(data))

            #request.add_header("X-Api-Key", "%s" % htpc.settings.get('nzbdrone_apikey', ''))

            if banner:
                return urllib2.urlopen(request).read()

            else:
                return loads(urllib2.urlopen(request).read())
        except Exception as e:
            print 'fetch error ', e
            print path
            #print type
            #print data
            #print banner
            return

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
            #print url

            if banner:
                url = 'http%s://%s:%s%s%s' % (ssl, host, port, nzbdrone_basepath, path[1:])
                r = requests.get(url, headers=headers)
                return r.content

            if type == 'post':
                print data
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
                #return loads(r.content)
                return loads(r.text)
        except Exception as e:
            print 'error in path %s' % path
            print e

    def posty(self, path, data):
        
        print path
        print data
        data = dumps(data)
        host = htpc.settings.get('nzbdrone_host', '')
        port = str(htpc.settings.get('nzbdrone_port', ''))
        nzbdrone_basepath = htpc.settings.get('nzbdrone_basepath', '/')
        ssl = 's' if htpc.settings.get('nzbdrone_ssl', True) else ''

        if(nzbdrone_basepath == ""):
            nzbdrone_basepath = "/"
        if not(nzbdrone_basepath.endswith('/')):
            nzbdrone_basepath += "/"

        url = 'http%s://%s:%s%sapi/%s' % (ssl, host, port, nzbdrone_basepath, path)
        print url
        headers = {'X-Api-Key': (htpc.settings.get('nzbdrone_apikey', ''))}
        #request = urllib2.Request(url)
        #request.add_header("X-Api-Key", "%s" % htpc.settings.get('nzbdrone_apikey', ''))

        r = requests.post(url, data=data, headers=headers)

        print r.text
        print r.status_code
        print r.url

        #print urllib2.urlopen(request, data).read()

        #return urllib2.urlopen(request, data)
        



    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Rootfolder(self):
        print 'rootfolder'
        path = self.fetch('Rootfolder')
        for p in path:
            print p
            return p["path"]
        #return self.fetch('Rootfolder')

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Series(self):
        return self.fetch('Series')

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Show(self, tvdbid, id):
        print 'running SHOW'
        try:
            #print self.fetch('Series/' + id)
            return self.fetch('Series/%s' % id)
        except Exception as e:
            print e

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def History(self):
        return self.fetch('History?page=1&pageSize=100&sortKey=date&sortDir=desc')

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Calendar(self, param=None):
        current_date = datetime.datetime.utcnow().strftime("%Y-%m-%d")
        start_date = (datetime.datetime.strptime(current_date, '%Y-%m-%d') - datetime.timedelta(days=7)).strftime('%Y-%m-%d')
        end_date = (datetime.datetime.strptime(current_date, '%Y-%m-%d') + datetime.timedelta(days=7)).strftime('%Y-%m-%d')
        p = 'Calendar?start=' + current_date + '&end=' + end_date
        return self.fetch(p)

    @cherrypy.expose()
    @require()
    def View(self, tvdbid, id):
        if not (tvdbid.isdigit()):
            raise cherrypy.HTTPError("500 Error", "Invalid show ID.")
            self.logger.error("Invalid show ID was supplied: " + str(tvdbid))
            return False

        return htpc.LOOKUP.get_template('nzbdrone_view.html').render(scriptname='nzbdrone_view', tvdbid=tvdbid, id=id)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Search(self, query):
        params = 'Series/lookup?term=%s' % (urllib2.quote(query))
        print self.fetch(params)
        return self.fetch(params)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Episodes(self, id):
        params = 'episode?seriesId=%s' % id #episode
        return self.fetch(params)

    @cherrypy.expose()
    @require()
    def GetBanner(self, url):
        self.logger.debug("Fetching Banner")
        cherrypy.response.headers['Content-Type'] = 'image/jpeg'
        return self.fetch(url, banner=True)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Episode(self, id):
        return self.fetch('episode/%s' % id)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Episodesqly(self, id):
        print 'Episodesqly ', id
        params = 'episodefile?seriesId=%s' % id #episode
        print self.fetch(params)
        return self.fetch(params)
        '''
        Request URL:http://localhost:9000/api/episodefile?seriesId=397

        '''

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Episodeqly(self, id):
        return self.fetch('episodefile/%s' % id)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Profile(self):
        #print self.fetch('profile')
        return self.fetch('profile')

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Refreshseries(self, id=None):
        if id:
            d = {
                "name": "RefreshSeries",
                "seriesId": int(id)
            }
        else:
            d = {"name": "Refreshseries"}
    
        return self.fetch(path='command', data=d, type='post')

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Rescanseries(self, id=None):
        if id:
            d = {
                "name": "RescanSeries",
                "seriesId": int(id)
            }
        else:
            d = {"name": "Refreshseries"}
    
        return self.fetch(path='command', data=d, type='post')

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def EpisodeSearch(self, id=None):
        if id:
            d = {
                "name": "EpisodeSearch",
                "episodeIds": [int(id)]#int(id) # if more then one list of ints
            }
        else:
            d = {"name": "Refreshseries"}
    
        return self.fetch(path='command', data=d, type='post')
    #SeasonSearch

    @cherrypy.expose()
    @require()
    #@cherrypy.tools.json_out()
    def Command(self, **kwargs):
        k = kwargs
        print k
        cherrypy.response.headers['Content-Type'] = "application/json"
        for key, value in kwargs.iteritems():
            print key, value
        try:
            data = {}
            data["name"] = k["method"]
            if k["par"] == "episodeIds":
                k["id"] = [int(k["id"])]
            data[k["par"]] = k["id"]#int(k["id"])
            #if k['name']:
            #    del k['name']
            #    print 'lols'
        except KeyError, e:
            print e
 
        return self.fetch(path='command', data=data, type='post')

    @cherrypy.expose()
    @require()
    def System(self, path):
        #system/restart
        path = 'command/%s' % path
        #print path
        return self.fetch(path)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Lookup(self, q):
        print q
        #print self.fetch('Series/lookup?term=%s' % urllib.quote(q))
        return self.fetch('Series/lookup?term=%s' % urllib.quote(q))

    @cherrypy.expose()
    @require()
    #@cherrypy.tools.json_out()
    def AddShow(self, tvdbid, quality):
        data = []
        d = {}
        try:
            tvshow = self.fetch('Series/lookup?term=tvdbid:%s' % tvdbid) #Series/lookup/?term=tvdbid:'+tvdbid
            rootfolder = self.Rootfolder()
            seasoncount = 1
            season = []
            for i in tvshow:
                #print i
                seasoncount += i['seasonCount']
                
                d["title"] = i['title']
                d["tvdbId"] = int(i['tvdbId'])
                d["qualityProfileId"] = int(quality)
                d["titleSlug"] = i['titleSlug']
                d["RootFolderPath"] = rootfolder
                #print rootfolder
                #d['seasons'] = i['seasons']

                for x in xrange(1, int(seasoncount)):
                    s = {"seasonNumber": x, "monitored": True}
                    season.append(s)

                d["seasons"] = season
                
            
            #print self.fetch('Series', data=d, type='post')
            addshow =  self.fetch('Series', data=d, type='post')
            print 'type is'
            # Manually add correct headers since @cherrypy.tools.json_out() renders its wrong
            cherrypy.response.headers['Content-Type'] = "application/json"
            #print type(addshow)
            return addshow
        except Exception, e:
            print 'addshow error ', e


"""
tvdbId (int) title (string) qualityProfileId (int) titleSlug (string) seasons (array)
"""
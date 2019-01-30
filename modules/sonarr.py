#!/usr/bin/env python
# -*- coding: utf-8 -*-

import datetime as DT
from json import loads, dumps
import logging
import urllib

import cherrypy
from cherrypy.lib.auth2 import require, member_of
import requests

import htpc
from htpc.helpers import fix_basepath, get_image, striphttp


class Sonarr(object):
    def __init__(self):
        self.logger = logging.getLogger('modules.sonarr')
        htpc.MODULES.append({
            'name': 'Sonarr',
            'id': 'sonarr',
            'test': htpc.WEBDIR + 'sonarr/Version',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'sonarr_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'sonarr_name'},
                {'type': 'text', 'label': 'IP / Host', 'placeholder': 'localhost', 'name': 'sonarr_host'},
                {'type': 'text', 'label': 'Port', 'placeholder': '8989', 'name': 'sonarr_port'},
                {'type': 'text', 'label': 'Basepath', 'placeholder': '/sonarr', 'name': 'sonarr_basepath'},
                {'type': 'text', 'label': 'API KEY', 'name': 'sonarr_apikey'},
                {'type': 'bool', 'label': 'Use SSL', 'name': 'sonarr_ssl'},
                {'type': 'text', 'label': 'Reverse proxy link', 'placeholder': '', 'desc': 'Reverse proxy link, e.g. https://sonarr.domain.com', 'name': 'sonarr_reverse_proxy_link'},

            ]
        })

    @cherrypy.expose()
    @require()
    def index(self):
        return htpc.LOOKUP.get_template('sonarr.html').render(scriptname='sonarr', webinterface=self.webinterface(), quality=self.Profile())

    def webinterface(self):
        host = striphttp(htpc.settings.get('sonarr_host', ''))
        port = str(htpc.settings.get('sonarr_port', ''))
        sonarr_basepath = htpc.settings.get('sonarr_basepath', '/')
        ssl = 's' if htpc.settings.get('sonarr_ssl', True) else ''

        # Makes sure that the basepath is /whatever/
        sonarr_basepath = fix_basepath(sonarr_basepath)

        url = 'http%s://%s:%s%s' % (ssl, host, port, sonarr_basepath)

        if htpc.settings.get('sonarr_reverse_proxy_link'):
            url = htpc.settings.get('sonarr_reverse_proxy_link')

        return url

    def fetch(self, path, banner=None, type=None, data=None):
        try:
            host = striphttp(htpc.settings.get('sonarr_host', ''))
            port = str(htpc.settings.get('sonarr_port', ''))
            sonarr_basepath = htpc.settings.get('sonarr_basepath', '/')
            ssl = 's' if htpc.settings.get('sonarr_ssl', True) else ''

            # Makes sure that the basepath is /whatever/
            sonarr_basepath = fix_basepath(sonarr_basepath)

            headers = {'X-Api-Key': htpc.settings.get('sonarr_apikey', '')}

            url = 'http%s://%s:%s%sapi/%s' % (ssl, host, port, sonarr_basepath, path)

            if banner:
                #  the path includes the basepath automaticly (if fetched from api command 'Series')
                # Cache the image in HTPC Manager aswell.
                return get_image(url, headers=headers)

            if type == 'post':
                r = requests.post(url, data=dumps(data), headers=headers, verify=False)
                return r.content

            elif type == 'put':
                r = requests.put(url, data=dumps(data), headers=headers, verify=False)
                return r.content

            elif type == 'delete':
                r = requests.delete(url, data=dumps(data), headers=headers, verify=False)
                return r.content

            else:
                r = requests.get(url, headers=headers, verify=False)
                return loads(r.text)

        except Exception as e:
            self.logger.error('Failed to fetch url=%s path=%s error %s' % (url, path, e))
            return []

    @cherrypy.expose()
    @require(member_of(htpc.role_admin))
    def Version(self, sonarr_host, sonarr_port, sonarr_basepath, sonarr_apikey, sonarr_ssl=False, **kwargs):
        try:
            ssl = 's' if sonarr_ssl else ''

            if not sonarr_basepath:
                sonarr_basepath = fix_basepath(sonarr_basepath)

            headers = {'X-Api-Key': str(sonarr_apikey)}

            url = 'http%s://%s:%s%sapi/system/status' % (ssl, striphttp(sonarr_host), sonarr_port, sonarr_basepath)

            result = requests.get(url, headers=headers, verify=False)
            return result.json()
        except:
            return

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Rootfolder(self):
        return [folder['path'] for folder in self.fetch('Rootfolder') if folder.get('path')]

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Series(self):
        ''' Return info about all your shows '''
        return self.fetch('Series')

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Show(self, id, tvdbid=None):
        ''' Details about one show '''
        return self.fetch('Series/%s' % id)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
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
    def oldCalendar(self, param=None):
        return self.fetch('Calendar?end=%s' % (DT.date.today() + DT.timedelta(days=7)))

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Calendar(self, param=None, *args, **kwargs):
        kwargs.pop('_')
        p = urllib.urlencode(kwargs)
        episodes = self.fetch('Calendar?%s' % p)
        cal = []
        if episodes:
            for episode in episodes:
                d = {
                    'title': episode['series']['title'],
                    'season': episode['seasonNumber'],
                    'episode': episode['episodeNumber'],
                    'start': episode['airDateUtc'],
                    'overview': episode.get('overview', ''),
                    'all': episode,
                    'allDay': False,
                }

                cal.append(d)

        return cal

    @cherrypy.expose()
    @require()
    def View(self, tvdbid, id):
        if not (tvdbid.isdigit()):
            raise cherrypy.HTTPError('500 Error', 'Invalid show ID.')
            self.logger.error('Invalid show ID was supplied: ' + str(id))
            return False
        # tvdbid is acctually id, and id is tvdbid....
        return htpc.LOOKUP.get_template('sonarr_view.html').render(scriptname='sonarr_view', tvdbid=tvdbid, id=id)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Episodes(self, id):
        return self.fetch('episode?seriesId=%s' % id)

    @cherrypy.expose()
    @require()
    def GetBanner(self, url=None):
        self.logger.debug('Fetching Banner')
        cherrypy.response.headers['Content-Type'] = 'image/jpeg'
        return self.fetch(url, banner=True)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Episode(self, id):
        self.logger.debug('Fetching Episode info')
        return self.fetch('episode/%s' % id)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Episodesqly(self, id):
        self.logger.debug('Fetching fileinfo for all episodes in a show')
        return self.fetch('episodefile?seriesId=%s' % id)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Episodeqly(self, id):
        return self.fetch('episodefile/%s' % id)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Profile(self):
        return self.fetch('profile')

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    def Command(self, **kwargs):
        k = kwargs
        cherrypy.response.headers['Content-Type'] = 'application/json'
        try:
            data = {}
            data['name'] = k['method']
            if k['par'] == 'episodeIds':
                k['id'] = [int(k['id'])]
                data[k['par']] = k['id']
            if k['par'] == 'seriesId':
                data['seriesId'] = k['id']
                data['seasonNumber'] = k['sNum']
        except KeyError:
            pass
        return self.fetch(path='command', data=data, type='post')

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    @require(member_of(htpc.role_admin))
    def ToggleMonitor(self, id):
        cherrypy.response.headers['Content-Type'] = 'application/json'
        self.logger.debug('Toggling monitored status for id %s' % id)
        m = self.fetch(path='series/%s' % id, type='get')
        if m['monitored'] == True:
            m.update({"monitored": False})
        else:
            m.update({"monitored": True})
        r = self.fetch(path='series', data=m, type='put')
        return self.fetch(path='series/%s' % id, type='get')

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    @require(member_of(htpc.role_admin))
    def ToggleMonitorSeason(self, id, sn):
        cherrypy.response.headers['Content-Type'] = 'application/json'
        sn = int(sn)
        self.logger.debug('Toggling monitored status for id %s season %s' % (id,sn))
        m = self.fetch(path='series/%s' % id, type='get')
        if m['seasons'][sn]['monitored'] == True:
            m['seasons'][sn]['monitored'] = False
        else:
            m['seasons'][sn]['monitored'] = True
        r = self.fetch(path='series', data=m, type='put')
        return self.fetch(path='series/%s' % id, type='get')

    @cherrypy.expose()
    @require(member_of(htpc.role_admin))
    def DeleteContent(self, **kwargs):
        k = kwargs
        cherrypy.response.headers['Content-Type'] = 'application/json'
        data = {}
        # deleteFiles = True appears to not work, wrong format?
        # data['deleteFiles'] = k['deleteFiles']
        data['deleteFiles'] = False
        self.logger.debug('Deleting id %s' % k['id'])
        return self.fetch(path='series/%s' % k['id'], data=data, type='delete')

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Lookup(self, q):
        return self.fetch('Series/lookup?term=%s' % urllib.quote(q))

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Alerts(self):
        return self.fetch('health')

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Queue(self):
        return self.fetch('queue')

    @cherrypy.expose()
    @require()
    def AddShow(self, tvdbid, quality, monitor='all', seriestype='standard',
                rootfolder='', seasonfolder='on', specials=False): # fix me
        d = {}
        try:
            tvshow = self.fetch('Series/lookup?term=tvdbid:%s' % tvdbid)
            seasoncount = 1
            season = []
            for i in tvshow:

                self.logger.debug('monitor=%s' % monitor)

                d['title'] = i['title']
                d['tvdbId'] = int(i['tvdbId'])
                d['qualityProfileId'] = int(quality)
                d['profileId'] = int(quality)
                d['titleSlug'] = i['titleSlug']
                d['RootFolderPath'] = rootfolder
                d['monitored'] = True
                season_monitoring = False
                d['seriesType'] = seriestype

                if seasonfolder == 'on':
                    d['seasonFolder'] = True
                if specials == 'on':
                    start_on_season = 0
                else:
                    start_on_season = 1

                seasoncount += i['seasonCount']

                options = {'ignoreEpisodesWithFiles': False,
                           'ignoreEpisodesWithoutFiles': False,
                           'searchForMissingEpisodes': True}

                if monitor == 'all':
                    season_monitoring = True

                for x in xrange(start_on_season, int(seasoncount)):
                    s = {'seasonNumber': x, 'monitored': season_monitoring}
                    season.append(s)

                if monitor == 'future':
                    options['ignoreEpisodesWithFiles'] = True
                    options['ignoreEpisodesWithoutFiles'] = True
                elif monitor == 'latest':
                    season[i['seasonCount']]['monitored'] = True
                elif monitor == 'first':
                    season[1]['monitored'] = True
                elif monitor == 'missing':
                    options['ignoreEpisodesWithFiles'] = True
                elif monitor == 'existing':
                    options['ignoreEpisodesWithoutFiles'] = True
                elif monitor == 'none':
                    season_monitoring = False

                d['seasons'] = season
                d['addOptions'] = options

                i.update(d)

                # Manually add correct headers since @cherrypy.tools.json_out() renders it wrong
                cherrypy.response.headers['Content-Type'] = 'application/json'
                return self.fetch('Series', data=i, type='post')

        except Exception, e:
            self.logger.error('Failed to add tvshow %s %s' % (tvdbid, e))

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def test(self):
        tvshow = self.fetch('Series/lookup?term=tvdbid:70327')
        return tvshow

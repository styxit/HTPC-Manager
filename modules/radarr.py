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


class Radarr(object):
    def __init__(self):
        self.logger = logging.getLogger('modules.radarr')
        htpc.MODULES.append({
            'name': 'Radarr',
            'id': 'radarr',
            'test': htpc.WEBDIR + 'radarr/Version',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'radarr_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'radarr_name'},
                {'type': 'text', 'label': 'IP / Host',
                    'placeholder': 'localhost', 'name': 'radarr_host'},
                {'type': 'text', 'label': 'Port',
                    'placeholder': '7878', 'name': 'radarr_port'},
                {'type': 'text', 'label': 'Basepath',
                    'placeholder': '/radarr', 'name': 'radarr_basepath'},
                {'type': 'text', 'label': 'API KEY', 'name': 'radarr_apikey'},
                {'type': 'bool', 'label': 'Use SSL', 'name': 'radarr_ssl'},
                {'type': 'text', 'label': 'Reverse proxy link', 'placeholder': '',
                    'desc': 'Reverse proxy link, e.g. https://radarr.domain.com', 'name': 'radarr_reverse_proxy_link'},

            ]
        })

    @cherrypy.expose()
    @require()
    def index(self):
        return htpc.LOOKUP.get_template('radarr.html').render(scriptname='radarr', webinterface=self.webinterface(), quality=self.Profile())

    def webinterface(self):
        host = striphttp(htpc.settings.get('radarr_host', ''))
        port = str(htpc.settings.get('radarr_port', ''))
        radarr_basepath = htpc.settings.get('radarr_basepath', '/')
        ssl = 's' if htpc.settings.get('radarr_ssl', True) else ''

        # Makes sure that the basepath is /whatever/
        radarr_basepath = fix_basepath(radarr_basepath)

        url = 'http%s://%s:%s%s' % (ssl, host, port, radarr_basepath)

        if htpc.settings.get('radarr_reverse_proxy_link'):
            url = htpc.settings.get('radarr_reverse_proxy_link')

        return url

    def fetch(self, path, banner=None, type=None, data=None):
        try:
            host = striphttp(htpc.settings.get('radarr_host', ''))
            port = str(htpc.settings.get('radarr_port', ''))
            radarr_basepath = htpc.settings.get('radarr_basepath', '/')
            ssl = 's' if htpc.settings.get('radarr_ssl', True) else ''

            # Makes sure that the basepath is /whatever/
            radarr_basepath = fix_basepath(radarr_basepath)

            headers = {'X-Api-Key': htpc.settings.get('radarr_apikey', '')}

            url = 'http%s://%s:%s%sapi/%s' % (ssl,
                                              host, port, radarr_basepath, path)

            if banner:
                #  the path includes the basepath automaticly (if fetched from api command 'Series')
                # Cache the image in HTPC Manager aswell.
                return get_image(url, headers=headers)

            if type == 'post':
                r = requests.post(url, data=dumps(
                    data), headers=headers, verify=False)
                return r.content

            elif type == 'put':
                r = requests.put(url, data=dumps(
                    data), headers=headers, verify=False)
                return r.content

            elif type == 'delete':
                r = requests.delete(url, data=dumps(
                    data), headers=headers, verify=False)
                return r.content

            else:
                r = requests.get(url, headers=headers, verify=False)
                return loads(r.text)

        except Exception as e:
            self.logger.error(
                'Failed to fetch url=%s path=%s error %s' % (url, path, e))
            return []

    @cherrypy.expose()
    @require(member_of(htpc.role_admin))
    def Version(self, radarr_host, radarr_port, radarr_basepath, radarr_apikey, radarr_ssl=False, **kwargs):
        try:
            ssl = 's' if radarr_ssl else ''

            if not radarr_basepath:
                radarr_basepath = fix_basepath(radarr_basepath)

            headers = {'X-Api-Key': str(radarr_apikey)}

            url = 'http%s://%s:%s%sapi/system/status' % (
                ssl, striphttp(radarr_host), radarr_port, radarr_basepath)

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
    def Movies(self):
        ''' Return info about all your movies '''
        return self.fetch('Movie')

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Movie(self, id):
        ''' Details about one movie '''
        return self.fetch('Movie/%s' % id)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def Delete_movie(self, id, title, delete_date=None):
        self.logger.debug('Deleted movie %s' % title)
        return self.fetch('Movie/%d' % int(id), type='delete')

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def History(self):
        return self.fetch('History?page=1&pageSize=100&sortKey=date&sortDir=desc')

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def oldCalendar(self, param=None):
        return self.fetch('Calendar?end=%s' % (DT.date.today() + DT.timedelta(days=30)))

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Calendar(self, param=None, *args, **kwargs):
        kwargs.pop('_')
        p = urllib.urlencode(kwargs)
        movies = self.fetch('Calendar?%s' % p)
        cal = []
        if movies:
            for movie in movies:
                d = {
                    'tmdbId': movie['tmdbId'],
                    'title': movie['title'],
                    'status': movie['status'],
                    'inCinemas': movie['inCinemas'],
                    'start': movie['inCinemas'],
                    'overview': movie.get('overview', ''),
                    'all': movie,
                    'allDay': False,
                    'id': movie['id'],
                }



                cal.append(d)

        return cal

    @cherrypy.expose()
    @require()
    def View(self, id, tmdbid):
        if not (tmdbid.isdigit()):
            raise cherrypy.HTTPError('500 Error', 'Invalid movie ID.')
            self.logger.error('Invalid movie ID was supplied: ' + str(id))
            return False
        return htpc.LOOKUP.get_template('radarr_view.html').render(scriptname='radarr_view', tmdbid=tmdbid, id=id)

    @cherrypy.expose()
    @require()
    def GetBanner(self, url=None):
        self.logger.debug('Fetching Banner')
        cherrypy.response.headers['Content-Type'] = 'image/jpeg'
        return self.fetch(url, banner=True)

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
            if k['par'] == 'movieIds':
                k['id'] = [int(k['id'])]
            data[k['par']] = k['id']
        except KeyError:
            pass

        return self.fetch(path='command', data=data, type='post')

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    @require(member_of(htpc.role_admin))
    def ToggleMonitor(self, id):
        cherrypy.response.headers['Content-Type'] = 'application/json'
        self.logger.debug('Toggling monitored status for id %s' % id)
        m = self.fetch(path='movie/%s' % id, type='get')
        if m['monitored'] == True:
            m.update({"monitored": False})
        else:
            m.update({"monitored": True})
        r = self.fetch(path='movie', data=m, type='put')
        return self.fetch(path='movie/%s' % id, type='get')

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
        return self.fetch(path='movie/%s' % k['id'], data=data, type='delete')

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Lookup(self, q):
        return self.fetch('Movie/lookup?term=%s' % urllib.quote(q))

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
    def AddMovie(self, tmdbId, qualityProfileId, rootfolder='', monitored=True):
        d = {}
        try:
            movie = self.fetch('Movie/lookup/tmdb?tmdbId=%s' % tmdbId)

            self.logger.debug('monitor=%s' % monitored)

            d['title'] = movie['title']
            d['tmdbId'] = int(movie['tmdbId'])
            d['qualityProfileId'] = int(qualityProfileId)
            d['profileId'] = int(qualityProfileId)
            d['titleSlug'] = movie['titleSlug']
            d['rootFolderPath'] = rootfolder
            d['monitored'] = monitored
            d['images'] = [] # not sure if this is actually required, radarr docs says it is so it's passed TODO voodoo
            movie.update(d)

            # Manually add correct headers since @cherrypy.tools.json_out()
            # renders it wrong
            cherrypy.response.headers['Content-Type'] = 'application/json'
            return self.fetch('Movie', data=movie, type='post')

        except Exception, e:
            self.logger.error('Failed to add movie %s %s' % (tmdbId, e))

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def test(self):
        movie = self.fetch('Movie/lookup/tmdb?tmdbId=%s' % 32434)
        return movie

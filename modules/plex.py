#!/usr/bin/env python
# -*- coding: utf-8 -*-

import cherrypy
import htpc
import re
import socket
import struct
from json import loads
from urllib2 import Request, urlopen
import urllib
from htpc.helpers import get_image, striphttp, joinArgs, cachedprime
import logging
import urlparse
import base64
import platform
from cherrypy.lib.auth2 import require, member_of
import requests
from uuid import getnode
import os
import hashlib

# Only imported to check if pil is installed
# Dont remove even if import is unused
try:
    import Image
    use_pil = True
except ImportError:
    try:
        from PIL import Image
        use_pil = True
    except ImportError:
        use_pil = False

'''
Credits.

PlexGDM:
Based on PlexConect:
https://github.com/iBaa/PlexConnect/blob/master/PlexAPI.py
'''


class Plex(object):
    def __init__(self):
        self.logger = logging.getLogger('modules.plex')
        self.headers = None
        self._commandId = 0

        htpc.MODULES.append({
            'name': 'Plex',
            'id': 'plex',
            'test': htpc.WEBDIR + 'plex/ping',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'plex_enable'},

                {'type': 'select',
                 'label': 'Existing Servers',
                 'name': 'gdm_plex_servers',
                 'options': [
                            {'name': 'Select', 'value': 0}
                        ]
                },
                {'type': 'text', 'label': 'Menu name', 'name': 'plex_name'},
                {'type': 'text', 'label': 'IP / Host *', 'name': 'plex_host'},
                {'type': 'text', 'label': 'Port *', 'name': 'plex_port', 'placeholder': '32400'},
                {'type': 'bool', 'label': 'Use SSL', 'name': 'plex_ssl'},
                {'type': 'text', 'label': 'Username (optional)', 'desc': 'Plex Home activated server req username', 'name': 'plex_username'},
                {'type': 'password', 'label': 'Password (optional)', 'desc': 'Plex Home activated server req password', 'name': 'plex_password'},
                {'type': 'text', 'label': 'Mac addr.', 'name': 'plex_mac'},
                {'type': 'bool', 'label': 'Hide watched', 'name': 'plex_hide_watched'},
                {'type': 'bool', 'label': 'Hide homemovies', 'name': 'plex_hide_homemovies'},
                {'type': 'bool', 'label': 'Disable image resize', 'name': 'plex_disable_img_resize'},
                {'type': 'text', 'label': 'Reverse proxy link', 'placeholder': '', 'desc': 'Reverse proxy link, e.g. https://plex.mydomain.com', 'name': 'plex_reverse_proxy_link'},
                {'type': 'text', 'label': 'Ignore sections', 'placeholder': 'Movies, TV Shows', 'desc': '', 'name': 'plex_ignore_sections'}

            ]
        })

    @staticmethod
    def get_server_url():
        plex_host = striphttp(htpc.settings.get('plex_host', 'localhost'))
        plex_port = htpc.settings.get('plex_port', '32400')
        ssl = 's' if htpc.settings.get('plex_ssl') else ''

        return 'http%s://%s:%s' % (ssl, plex_host, plex_port)

    @cherrypy.expose()
    @require(member_of(htpc.role_admin))
    @cherrypy.tools.json_out()
    def ping(self, plex_host='', plex_port='', plex_ssl='', **kwargs):
        ''' Tests settings, returns server name on success and null on fail '''
        try:
            self.logger.debug('Testing Plex connectivity')
            ssl = 's' if plex_ssl == 'on' else ''
            url = 'http%s://%s:%s' % (ssl, striphttp(plex_host), plex_port)
            self.logger.debug('Trying to contact Plex via %s' % url)
            request = requests.get(url, headers=self.getHeaders()).json()
            self.logger.info('Connected to the Plex Media Server %s at %s' % (request.get('friendlyName'), url))
            return True
        except Exception as e:
            self.logger.error('Unable to contact Plex via %s error %s' % (url, e))
            return

    @cherrypy.expose()
    @require()
    def index(self):
        return htpc.LOOKUP.get_template('plex.html').render(scriptname='plex', webinterface=self.webinterface())

    def webinterface(self):
        ''' Generate page from template '''
        plex_url = Plex.get_server_url()
        url = '%s/web' % (plex_url)

        if htpc.settings.get('plex_reverse_proxy_link'):
            url = htpc.settings.get('plex_reverse_proxy_link')

        return url

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetRecentMovies(self, limit=5):
        ''' Get a list of recently added movies '''
        self.logger.debug('Fetching recent Movies')

        try:
            plex_url = Plex.get_server_url()
            plex_hide_homemovies = htpc.settings.get('plex_hide_homemovies', False)
            if htpc.settings.get('plex_hide_watched', False):
                hidewatched = '1'
            else:
                hidewatched = '0'
            movies = []

            for section in self.jloader('%s/library/sections' % plex_url).get('Directory', {}):
                if self.check_ignore(section['title']):
                    if section['type'] == 'movie':
                        if section['agent'] != 'com.plexapp.agents.none' or not plex_hide_homemovies:
                            for movie in self.jloader('%s/library/sections/%s/all?type=1&unwatched=%s&sort=addedAt:desc&X-Plex-Container-Start=0&X-Plex-Container-Size=%s' % (plex_url, section['key'], hidewatched, limit)).get('Metadata', {}):
                                jmovie = {}
                                genre = []

                                jmovie['title'] = movie['title']
                                jmovie['id'] = int(movie['ratingKey'])

                                if 'thumb'in movie:
                                    jmovie['thumbnail'] = movie['thumb']

                                if 'year'in movie:
                                    jmovie['year'] = movie['year']

                                if 'summary'in movie:
                                    jmovie['plot'] = movie['summary']

                                if 'duration'in movie:
                                    jmovie['runtime'] = int(movie['duration']) / 60000

                                if 'art'in movie:
                                    jmovie['fanart'] = movie['art']

                                if 'addedAt'in movie:
                                    jmovie['addedAt'] = movie['addedAt']

                                # for pms 1.3
                                if 'Genre' in movie:
                                    genre = [t.get('tag') for t in movie['Genre']]

                                jmovie['genre'] = [genre]
                                jmovie['type'] = movie['type']

                                movies.append(jmovie)

            return {'movies': sorted(movies, key=lambda k: k['addedAt'], reverse=True)[:int(limit)]}
        except Exception as e:
            self.logger.error('Unable to fetch recent movies! Exception: %s' % e)
            return

    @cherrypy.expose()
    @require(member_of(htpc.role_admin))
    @cherrypy.tools.json_out()
    def primecache(self, disable_pil=0):
        # fix me
        plex_url = Plex.get_server_url()
        headers = self.getHeaders()
        imgdir = os.path.join(htpc.DATADIR, 'images/')
        imglist = []

        disable_pil = bool(int(disable_pil))

        # if Pil isnt installed override current setting
        if use_pil is False:
            disable_pil = True

        for section in self.jloader('%s/library/sections' % plex_url).get('Directory', {}):
            for item in self.jloader('%s/library/sections/%s/all' % (plex_url, section['key'])).get('Metadata', {}):

                if 'thumb' in item:
                    d = {}
                    h = hashlib.md5(item['thumb']).hexdigest()
                    resize_sizes = [[225, 338], [300, 300], [675, 400], [100, 150], [375, 210], [375, 563], [150, 150], [525, 300], [1013, 600]]
                    if disable_pil is True:
                        # use the transcoder
                        for r in resize_sizes:
                            u = '%s/photo/:/transcode?height=%s&width=%s&url=%s' % (plex_url, r[0], r[1], item['thumb'])
                            r.append(u)
                            resized = '%s_w%s_h%s_o_%s_%s' % (os.path.join(imgdir, h), r[0], r[1], None, None)
                            r.append(resized)

                    d['resize'] = resize_sizes
                    d['hash'] = h
                    # Original image
                    d['url'] = '%s%s' % (plex_url, item['thumb'])
                    d['fp'] = os.path.join(imgdir, h)
                    imglist.append(d)

                if 'fanart' in item:
                    d = {}
                    h = hashlib.md5(item['art']).hexdigest()
                    resize_sizes = [[225, 338], [300, 300], [675, 400], [100, 150], [375, 210], [375, 563], [150, 150], [525, 300], [1013, 600]]
                    if disable_pil is True:
                        for r in resize_sizes:
                            u = '%s/photo/:/transcode?height=%s&width=%s&url=%s' % (plex_url, r[0], r[1], item['thumb'])
                            r.append(u)
                            resized = '%s_w%s_h%s_o_%s_%s' % (os.path.join(imgdir, h), r[0], r[1], None, None)
                            r.append(resized)

                    d['resize'] = resize_sizes
                    d['hash'] = h
                    # original image
                    d['url'] = '%s%s' % (plex_url, item['art'])
                    d['fp'] = os.path.join(imgdir, h)
                    imglist.append(d)

        if use_pil:
            t = cachedprime(imglist, headers=headers, plex_resize=disable_pil)
            return t

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetRecentShows(self, limit=5):
        ''' Get a list of recently added shows '''
        self.logger.debug('Fetching recent shows')
        try:
            plex_url = Plex.get_server_url()
            if htpc.settings.get('plex_hide_watched', False):
                hidewatched = '1'
            else:
                hidewatched = '0'
            episodes = []

            for section in self.jloader('%s/library/sections' % plex_url).get('Directory', {}):
                if self.check_ignore(section['title']):
                    if section['type'] == 'show':
                        for episode in self.jloader('%s/library/sections/%s/all?type=4&unwatched=%s&sort=addedAt:desc&X-Plex-Container-Start=0&X-Plex-Container-Size=%s' % (plex_url, section['key'], hidewatched, limit)).get('Metadata', {}):
                            try:
                                jepisode = {}

                                jepisode['label'] = '%sx%s. %s' % (episode['parentIndex'], episode['index'], episode['title'])
                                jepisode['id'] = int(episode['ratingKey'])

                                if 'summary'in episode:
                                    jepisode['plot'] = episode['summary']

                                if 'index'in episode:
                                    jepisode['episode'] = episode['index']

                                if 'parentIndex'in episode:
                                    jepisode['season'] = episode['parentIndex']

                                if 'grandparentTitle'in episode:
                                    jepisode['showtitle'] = episode['grandparentTitle']

                                if 'duration'in episode:
                                    jepisode['runtime'] = int(episode['duration']) / 60000

                                if 'thumb'in episode:
                                    jepisode['fanart'] = episode['thumb']

                                if 'addedAt'in episode:
                                    jepisode['addedAt'] = episode['addedAt']

                                jepisode['type'] = episode.get('type')

                                episodes.append(jepisode)
                            except Exception as e:
                                self.logger.debug("Failed looping ep %s %s" % (episode, e))
                                continue

            return {'episodes': sorted(episodes, key=lambda k: k['addedAt'], reverse=True)[:int(limit)]}
        except Exception as e:
            self.logger.error('Unable to fetch episodes! Exception: %s' % e)
            return

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetRecentAlbums(self, limit=5):
        ''' Get a list of recently added albums '''
        try:
            plex_url = Plex.get_server_url()
            albums = []

            for section in self.jloader('%s/library/sections' % plex_url).get('Directory', {}):
                if self.check_ignore(section['title']):
                    if section['type'] == 'artist':
                        for album in self.jloader('%s/library/sections/%s/recentlyAdded?X-Plex-Container-Start=0&X-Plex-Container-Size=%s' % (plex_url, section['key'], limit)).get('Metadata', {}):
                            jalbum = {}

                            jalbum['title'] = album['title']
                            jalbum['id'] = album['ratingKey']
                            jalbum['type'] = album['type']

                            if 'thumb'in album:
                                jalbum['thumbnail'] = album['thumb']

                            if 'parentTitle'in album:
                                jalbum['artist'] = album['parentTitle']

                            if 'year'in album:
                                jalbum['year'] = album['year']

                            if 'addedAt'in album:
                                jalbum['addedAt'] = album['addedAt']

                            albums.append(jalbum)

            return {'albums': sorted(albums, key=lambda k: k['addedAt'], reverse=True)[:int(limit)]}
        except Exception as e:
            self.logger.error('Unable to fetch albums! Exception: %s' % e)
            return

    @cherrypy.expose()
    @require()
    def GetThumb(self, thumb=None, h=None, w=None, o=100):
        ''' Parse thumb to get the url and send to htpc.helpers.get_image '''
        if htpc.settings.get('plex_disable_img_resize', False):
            self.logger.debug("Image resize is disabled")
            h = None
            w = None
        if thumb:
            if use_pil:
                # Use pil is its enabled as quality is 95
                url = '%s%s' % (Plex.get_server_url(), thumb)
                self.logger.debug('Using PIL to resize image to %sx%s opacity %s url %s' % (w, h, o, url))
            else:
                # Fallback to transcode if pil isnt installed, plex quality 75
                url = '%s/photo/:/transcode?height=%s&width=%s&opacity=%s&saturation=%s&url=%s' % (Plex.get_server_url(), h, w, o, 100, urllib.quote_plus('%s%s' % (Plex.get_server_url(), thumb)))
                self.logger.debug('Using plex to resize image to %sx%s opacity %s url %s' % (w, h, o, url))
        else:
            url = '/images/DefaultVideo.png'

        return get_image(url, h, w, o, headers=self.getHeaders())

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetMovies(self, start=0, end=0, hidewatched=0, f=''):
        ''' Get a list movies '''
        self.logger.debug('Fetching Movies')
        try:
            plex_url = Plex.get_server_url()
            plex_hide_homemovies = htpc.settings.get('plex_hide_homemovies', False)
            movies = []
            limits = {}
            dupe_check = []
            sortedmovies = []

            if hidewatched == '1':
                hidewatched = 'unwatched'
            else:
                hidewatched = 'all'

            f = self._filter(f, hidewatched) # tell the _filter parser about hidewatched
            self.logger.debug('_filter response was %s' % f)
            for section in self.jloader('%s/library/sections' % plex_url).get('Directory', {}):
                if self.check_ignore(section['title']):
                    if section['type'] == 'movie':
                        if section['agent'] != 'com.plexapp.agents.none' or not plex_hide_homemovies:
                            for movie in self.jloader('%s/library/sections/%s/%s' % (plex_url, section['key'], f)).get('Metadata', {}):
                                if movie['title'] not in dupe_check:
                                    dupe_check.append(movie['title'])

                                    jmovie = {}
                                    genre = []
                                    jmovie['playcount'] = 0
                                    jmovie['id'] = int(movie['ratingKey'])
                                    jmovie['dumpz'] = movie

                                    # To fix sorting we add that to title to title sort
                                    if 'titleSort' not in movie:
                                        jmovie['titlesort'] = movie['title']

                                    # As title titleSort only exist if the name is like The ... etc
                                    # Add that to titlesort
                                    if 'titleSort' in movie:
                                        jmovie['titlesort'] = movie['titleSort']

                                    jmovie['title'] = movie['title']
                                    if 'thumb'in movie:
                                        jmovie['thumbnail'] = movie['thumb']

                                    if 'year'in movie:
                                        jmovie['year'] = int(movie['year'])

                                    if 'summary'in movie:
                                        jmovie['plot'] = movie['summary']

                                    if 'studio'in movie:
                                        jmovie['studio'] = movie['studio']

                                    if 'duration'in movie:
                                        jmovie['runtime'] = int(movie['duration']) / 60000

                                    if 'art'in movie:
                                        jmovie['fanart'] = movie['art']

                                    if 'rating'in movie:
                                        jmovie['rating'] = movie['rating']

                                    if 'viewCount' in movie:
                                        jmovie['playcount'] = int(movie['viewCount'])

                                    # for pms 1.3
                                    if 'Genre' in movie:
                                        genre = [t.get('tag') for t in movie['Genre']]

                                    jmovie['type'] = movie.get('type', '')

                                    if genre:
                                        jmovie['genre'] = genre

                                    movies.append(jmovie)

                                else:
                                    continue

            limits['start'] = int(start)
            limits['total'] = len(movies)
            limits['end'] = int(end)
            if int(end) >= len(movies):
                limits['end'] = len(movies)

            sortedmovies = sorted(movies, key=lambda k: k['titlesort'])

            return {'limits': limits, 'movies': sortedmovies[int(start):int(end)]}
        except Exception as e:
            self.logger.error('Unable to fetch all movies! Exception: %s' % e)
            return

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetShows(self, start=0, end=0, hidewatched=0, f=''):
        ''' Get a list of shows '''
        try:
            plex_url = Plex.get_server_url()
            limits = {}
            tvShows = []
            dupe_check = []
            sortedshows = []

            if hidewatched == '1':
                hidewatched = 'unwatched'
            else:
                hidewatched = 'all'

            f = self._filter(f, hidewatched) # tell the _filter parser about hidewatched
            self.logger.debug('_filter response was %s' % f)

            for section in self.jloader('%s/library/sections' % plex_url).get('Directory', {}):
                if self.check_ignore(section['title']):
                    if section['type'] == 'show':
                        try:
                            for tvShow in self.jloader('%s/library/sections/%s/%s' % (plex_url, section['key'], f)).get('Metadata'):
                                # Only allow unique showname in dupecheck
                                if tvShow['title'] not in dupe_check:
                                    dupe_check.append(tvShow['title'])
                                    jshow = {}
                                    genre = []
                                    jshow['type'] = tvShow.get('type')
                                    jshow['itemcount'] = 0
                                    jshow['playcount'] = 0

                                    # for pms 1.3
                                    if 'Genre' in tvShow:
                                        genre = [t.get('tag') for t in tvShow['Genre']]

                                    # Since titleSort only exist in titles like the showname etc
                                    # Set title as titlesort
                                    if 'titleSort' not in tvShow:
                                        jshow['titlesort'] = tvShow['title']

                                    if 'titleSort' in tvShow:
                                        jshow['titlesort'] = tvShow['titleSort']

                                    jshow['title'] = tvShow['title']

                                    jshow['id'] = tvShow['ratingKey']

                                    if 'thumb'in tvShow:
                                        jshow['thumbnail'] = tvShow['thumb']

                                    if 'year'in tvShow:
                                        jshow['year'] = int(tvShow['year'])

                                    if 'summary'in tvShow:
                                        jshow['plot'] = tvShow['summary']

                                    if 'viewedLeafCount'in tvShow:
                                        jshow['playcount'] = int(tvShow['viewedLeafCount'])

                                    if 'leafCount'in tvShow:
                                        jshow['itemcount'] = int(tvShow['leafCount'])

                                    tvShows.append(jshow)
                                else:
                                    continue
                        except socket.timeout:
                            continue

                        except Exception as e:
                            self.logger.exception('%s' % e)

            limits['start'] = int(start)
            limits['total'] = len(tvShows)
            limits['end'] = int(end)
            if int(end) >= len(tvShows):
                limits['end'] = len(tvShows)

            # sort the shows before return
            sortedshows = sorted(tvShows, key=lambda k: k['titlesort'])

            return {'limits': limits, 'tvShows': sortedshows[int(start):int(end)]}

        except Exception as e:
            self.logger.error('Unable to fetch all shows! Exception: %s' % e)
            return

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetArtists(self, start=0, end=0, f=''):
        ''' Get a list of recently added artists '''
        try:
            plex_url = Plex.get_server_url()
            artists = []
            limits = {}
            dupe_check = []
            sortedartist = []

            f = self._filter(f)

            for section in self.jloader('%s/library/sections' % plex_url).get('Directory', {}):
                if self.check_ignore(section['title']):
                    if section['type'] == 'artist':
                        for artist in self.jloader('%s/library/sections/%s/%s' % (plex_url, section['key'], f)).get('Metadata'):
                            if artist['title'] not in dupe_check:
                                jartist = {}
                                jartist['type'] = artist.get('type' '')
                                dupe_check.append(artist['title'])
                                # Since titleSort only exist in titles like the xx etc
                                # Set title as titlesort
                                if 'titleSort' not in artist:
                                    jartist['titlesort'] = artist['title']

                                if 'titleSort' in artist:
                                    jartist['titlesort'] = artist['titleSort']

                                jartist['title'] = artist['title']
                                jartist['id'] = artist['ratingKey']

                                artists.append(jartist)
                            else:
                                continue

            limits['start'] = int(start)
            limits['total'] = len(artists)
            limits['end'] = int(end)
            if int(end) >= len(artists):
                limits['end'] = len(artists)

            sortedartist = sorted(artists, key=lambda k: k['titlesort'])

            return {'limits': limits, 'artists': sortedartist[int(start):int(end)]}
        except Exception as e:
            self.logger.error('Unable to fetch all artists! Exception: %s' % e)
            return

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetAlbums(self, start=0, end=0, artistid='', f=''):
        ''' Get a list of Albums '''
        try:
            plex_url = Plex.get_server_url()
            albums = []
            limits = {}

            if f == '':
                f = 'albums'
            else:
                f = self._filter(f)

            if 'type=9' not in f and f != 'albums':
                f += '&type=9'
            self.logger.debug('_filter response was %s' % f)

            for section in self.jloader('%s/library/sections' % plex_url).get('Directory', {}):
                if self.check_ignore(section['title']):
                    if section['type'] == 'artist':
                        for album in self.jloader('%s/library/sections/%s/%s' % (plex_url, section['key'], f)).get('Metadata', {}):
                            if (str(album['parentRatingKey']) == artistid) or (artistid == ''):
                                jalbum = {}

                                jalbum['title'] = album['title']

                                jalbum['id'] = album['ratingKey']

                                if 'thumb'in album:
                                    jalbum['thumbnail'] = album['thumb']

                                albums.append(jalbum)

            limits['start'] = int(start)
            limits['total'] = len(albums)
            limits['end'] = int(end)
            if int(end) >= len(albums):
                limits['end'] = len(albums)

            return {'limits': limits, 'albums': sorted(albums, key=lambda k: k['title'])[int(start):int(end)]}
        except Exception as e:
            self.logger.exception('Unable to fetch all Albums! Exception: %s' % e)
            return

    def check_ignore(self, name):
        """ Checks if a sections name is in the ignore list
            Returns True if its not in it or there is no ignore list """

        ign = htpc.settings.get('plex_ignore_sections', '')
        if ign:
            ign = htpc.settings.get('plex_ignore_sections').split(', ')
            if name not in ign:
                return True
            else:
                return False
        else:
            return True

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetSongs(self, start=0, end=0, albumid='', f=''):
        ''' Get a list of songs '''
        try:
            plex_url = Plex.get_server_url()
            songs = []
            limits = {}
            checked_path = []

            if f == '':
                f = 'all?type=10'
            else:
                f = self._filter(f)

            if 'type=10' not in f:
                f += '&type=10'

            if albumid != '':
                request = self.jloader('%s/library/metadata/%s/children' % (plex_url, albumid))

                for song in request.get('Metadata', {}):
                    jsong = {}

                    try:
                        jsong['artist'] = song['originalTitle']
                    except:
                        jsong['artist'] = request['title1']

                    jsong['label'] = song['title']

                    jsong['album'] = request['parentTitle']

                    jsong['id'] = song['ratingKey']
                    try:
                        jsong['duration'] = song['duration'] / 1000
                    except:
                        pass

                    songs.append(jsong)
            else:
                for section in self.jloader('%s/library/sections' % plex_url).get('Directory', {}):
                    # Only check file paths once!
                    if section['title'] not in htpc.settings.get('plex_ignore_sections', '').split():
                        if section['type'] == 'artist':
                            for song in self.jloader('%s/library/sections/%s/%s' % (plex_url, section['key'], f)).get('Metadata', {}):
                                jsong = {}
                                jsong['dumpz'] = song
                                if 'grandparentTitle' or 'title' in song:
                                    jsong['artist'] = song['title']
                                jsong['label'] = song['title']
                                jsong['album'] = song['parentTitle']
                                jsong['id'] = song['ratingKey']
                                try:
                                    jsong['duration'] = song['duration'] / 1000
                                except:
                                    pass

                                songs.append(jsong)

            limits['start'] = int(start)
            limits['total'] = len(songs)
            limits['end'] = int(end)
            if int(end) >= len(songs):
                limits['end'] = len(songs)

            return {'limits': limits, 'songs': songs[int(start):int(end)]}
        except:
            self.logger.exception('Unable to fetch all songs!')
            return

    def jloader(self, url, method='get', headers=None, rtype='text'):
        r = getattr(requests, method)

        if headers is None:
            headers = self.getHeaders()

        r = r(url, headers=headers)

        try:
            if r.status_code == 401:
                t = self.myPlexSignin()

            j = r.json()
            return j.get('MediaContainer', {})

        except Exception as e:
            self.logger.exception('Failed to %s %s' % (method, url))
            return {}

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetEpisodes(self, start=0, end=0, tvshowid=None, hidewatched=0, f=''):
        ''' Get information about a single TV Show '''
        self.logger.debug('Loading information for TVID %s' % tvshowid)
        try:
            plex_url = Plex.get_server_url()
            episodes = []
            limits = {}

            for episode in self.jloader('%s/library/metadata/%s/allLeaves' % (plex_url, tvshowid)).get('Metadata', {}):
                jepisode = {}
                jepisode['playcount'] = 0

                jepisode['label'] = '%sx%s. %s' % (episode['parentIndex'], episode['index'], episode['title'])
                jepisode['id'] = episode['ratingKey']

                if 'summary'in episode:
                    jepisode['plot'] = episode['summary']

                if 'grandparentTitle'in episode:
                    jepisode['showtitle'] = episode['grandparentTitle']

                if 'index'in episode:
                    jepisode['episode'] = episode['index']

                if 'parentIndex'in episode:
                    jepisode['season'] = episode['parentIndex']

                if 'viewCount'in episode:
                    jepisode['playcount'] = int(episode['viewCount'])

                if 'thumb'in episode:
                    jepisode['thumbnail'] = episode['thumb']

                if 'rating'in episode:
                    jepisode['rating'] = episode['rating']

                if hidewatched == '1':
                    if jepisode['playcount'] <= 0:
                        episodes.append(jepisode)
                else:
                    episodes.append(jepisode)

            limits['start'] = int(start)
            limits['total'] = len(episodes)
            limits['end'] = int(end)
            # TODO plocka total from headern.
            if int(end) >= len(episodes):
                limits['end'] = len(episodes)

            return {'limits': limits, 'episodes': episodes[int(start):int(end)]}
        except Exception as e:
            self.logger.error('Unable to fetch all episodes! Exception: %s' % e)
            return

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def Wake(self):
        ''' Send WakeOnLan package '''
        self.logger.info('Waking up Plex Media Server')
        try:
            addr_byte = htpc.settings.get('plex_mac', '').split(':')
            hw_addr = struct.pack('BBBBBB',
                                  int(addr_byte[0], 16),
                                  int(addr_byte[1], 16),
                                  int(addr_byte[2], 16),
                                  int(addr_byte[3], 16),
                                  int(addr_byte[4], 16),
                                  int(addr_byte[5], 16))

            msg = '\xff' * 6 + hw_addr * 16
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
            s.sendto(msg, ('255.255.255.255', 9))
            self.logger.info('WOL package sent to %s' % htpc.settings.get('plex_mac', ''))
            return 'WOL package sent'
        except Exception as e:
            self.logger.debug('Exception: %s' % e)
            self.logger.error('Unable to send WOL packet')
            return 'Unable to send WOL packet'

    def JsonLoader(self, s):
        """ Try to repair the Json returned from Plex """
        while True:
            try:
                result = loads(s)   # try to parse...
                break                    # parsing worked -> exit loop
            except Exception as e:
                unexp = int(re.findall(r'\(char (\d+)\)', str(e))[0])
                # position of unescaped '"' before that
                unesc = s.rfind(r'"', 0, unexp)
                s = s[:unesc] + r'\"' + s[unesc + 1:]
                # position of correspondig closing '"' (+2 for inserted '\')
                closg = s.find(r'"', unesc + 2)
                s = s[:closg] + r'\"' + s[closg + 1:]
        return result

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def myPlexSignin(self, username='', password=''):
        try:

            username = username or htpc.settings.get('plex_username', '')
            password = password or htpc.settings.get('plex_password', '')

            if username and password:
                self.logger.debug('Fetching auth token')
                headers = {}
                headers['Authorization'] = 'Basic %s' % base64.encodestring('%s:%s' % (username, password)).replace('\n', '')
                headers['X-Plex-Client-Identifier'] = str(hex(getnode()))
                headers['X-Plex-Product'] = 'HTPC Manager'
                headers['X-Plex-Device'] = 'HTPC Manager'
                headers['X-Plex-Version'] = '1.0'
                headers['X-Plex-Device-Name'] = socket.gethostname()
                headers['X-Plex-Platform'] = platform.system()
                headers['X-Plex-Client-Platform'] = platform.system()
                headers['X-Plex-Platform-Version'] = platform.version()
                headers['X-Plex-Provides'] = 'controller'
                r = requests.post('https://plex.tv/users/sign_in.xml', headers=headers)

                if not r:
                    r.raise_for_status()
                else:
                    compiled = re.compile('<authentication-token>(.*)<\/authentication-token>', re.DOTALL)
                    authtoken = compiled.search(r.content).group(1).strip()

                    if authtoken is not None:
                        htpc.settings.set('plex_authtoken', authtoken)
                        return authtoken
                    else:
                        self.logger.debug('Failed to get the myPlex token')

        except Exception as e:
            self.logger.error('Failed to get authtoken from plex %s' % e)
            if r.status_code == 401:
                    self.logger.debug('Clearing myplex token, username and password since authorization was denied')
                    htpc.settings.set('plex_authtoken', '')
                    htpc.settings.set('plex_username', '')
                    htpc.settings.set('plex_password', '')

    def getHeaders(self):
        if self.headers is None:
            # Make headers if they dont exist
            authtoken = htpc.settings.get('plex_authtoken', '')
            username = htpc.settings.get('plex_username', '')
            password = htpc.settings.get('plex_password', '')

            # Dont try fetch token unless you have u/p
            if not authtoken and username and password:
                self.myPlexSignin()
                authtoken = htpc.settings.get('plex_authtoken', '')

            headers = {'Accept': 'application/json'}

            headers["X-Plex-Provides"] = 'controller'
            headers["X-Plex-Platform"] = platform.uname()[0]
            headers["X-Plex-Platform-Version"] = platform.uname()[2]
            headers['X-Plex-Product'] = 'HTPC Manager'
            headers['X-Plex-Version'] = '0.9.5'
            headers['X-Plex-Device'] = platform.platform()
            headers['X-Plex-Client-Identifier'] = str(hex(getnode()))

            if authtoken:
                headers['X-Plex-Token'] = authtoken
            if username:
                headers['X-Plex-Username'] = username
            self.headers = headers
            return headers
        else:
            return self.headers

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def NowPlaying(self):
        ''' Get information about current playing item '''
        self.logger.debug('Fetching currently playing information')
        playing_items = []

        try:
            plex_url = Plex.get_server_url()

            result = self.jloader('%s/status/sessions' % plex_url)

            for t in ['Video', 'Track']:
                res = result.get(t, [])

                for video in res:
                    jplaying_item = {}
                    jplaying_item['protocolCapabilities'] = []

                    if 'index' in video:
                        jplaying_item['episode'] = int(video['index'])
                    if 'parentThumb' in video:
                            jplaying_item['fanart'] = video['parentThumb']
                            jplaying_item['thumbnail'] = video['thumb']
                    if 'parentIndex' in video:
                            jplaying_item['season'] = int(video['parentIndex'])
                    jplaying_item['title'] = video['title']

                    if 'year' in video:
                        jplaying_item['year'] = int(video['year'])

                    jplaying_item['id'] = int(video['ratingKey'])
                    jplaying_item['type'] = video['type']

                    if 'grandparentTitle' in video:
                        jplaying_item['show'] = video['grandparentTitle']
                    jplaying_item['duration'] = int(video['duration'])

                    try:
                        jplaying_item['viewOffset'] = int(video['viewOffset'])
                    except:
                        jplaying_item['viewOffset'] = 0

                    jplaying_item['state'] = video.get('Player', {}).get('state')
                    jplaying_item['player'] = video.get('Player', {}).get('title')
                    jplaying_item['machineIdentifier'] = video.get('Player', {}).get('machineIdentifier')

                    # We need some more info to see what the client supports
                    for client in self.jloader('%s/clients' % plex_url).get('Server', []):
                        if client['machineIdentifier'] == jplaying_item['machineIdentifier']:
                            jplaying_item['protocolCapabilities'] = client['protocolCapabilities'].split(',')
                            # we need this adress since we need a local ip
                            jplaying_item['address'] = client['address']

                    jplaying_item['user'] = video.get('User', {}).get('title')
                    user_thumb = video.get('User', {}).get('thumb')
                    if user_thumb:
                        jplaying_item['avatar'] = user_thumb

                    # Sometimes the client doesn't send the last timeline event. Ignore all client that almost have played the entire lenght.
                    if jplaying_item['viewOffset'] < (int(jplaying_item['duration']) - 10000):
                        playing_items.append(jplaying_item)

        except:
            self.logger.exception('Unable to fetch currently playing information!')

        return {'playing_items': playing_items}

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def UpdateLibrary(self, section_type=None):
        ''' Get information about current playing item '''
        self.logger.debug('Updating Plex library')
        try:
            plex_url = Plex.get_server_url()

            for section in self.jloader('%s/library/sections' % plex_url).get('Directory'):
                if section_type is None or section_type == section['type']:
                    self.logger.debug('Updating section %s' % section['key'])
                    try:
                        requests.get('%s/library/sections/%s/refresh' % (plex_url, section['key']), headers=self.getHeaders())
                    except Exception as e:
                        self.logger.error('Failed to update section %s on Plex: %s' % (section['key'], e))
            return 'Update command sent to Plex'
        except Exception as e:
            self.logger.error('Failed to update library! Exception: %s' % e)
            return 'Failed to update library!'

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def ControlPlayer(self, player, action, value=''): # TODO fix me
        ''' Various commands to control Plex Player '''
        self.logger.debug('Sending %s to %s value %s: ' % (action, player, value))
        self._commandId += 1

        h = self.getHeaders()
        h['commandId'] = self._commandId

        try:
            self.navigationCommands = ['moveUp', 'moveDown', 'moveLeft', 'moveRight', 'pageUp', 'pageDown', 'nextLetter', 'previousLetter', 'select', 'back', 'contextMenu', 'toggleOSD']
            self.playbackCommands = ['play', 'pause', 'stop', 'rewind', 'fastForward', 'stepForward', 'bigStepForward', 'stepBack', 'bigStepBack', 'skipNext', 'skipPrevious']
            self.applicationCommands = ['playFile', 'playMedia', 'screenshot', 'sendString', 'sendKey', 'sendVirtualKey', 'setVolume']

            plex_url = Plex.get_server_url()
            if action in self.navigationCommands:
                requests.get('%s/system/players/%s/naviation/%s' % (plex_url, player, action), headers=h)
            elif action in self.playbackCommands:
                r = requests.get('%s/player/%s/playback/%s' % (plex_url, player, action), headers=h)
            elif action.split('?')[0] in self.applicationCommands:
                requests.get('%s/system/players/%s/application/%s' % (plex_url, player, action), headers=h)
            else:
                raise ValueError('Unable to control Plex with action: %s' % action)

        except Exception as e:
            self.logger.debug('Exception: %s' % e)
            self.logger.debug('Unable to control %s to %s value %s' % (action, player, value))
            return 'error'

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetPlayers(self, filter=None):
        ''' Get list of active Players '''
        self.logger.debug('Getting players from Plex')
        try:

            plex_url = Plex.get_server_url()
            players = []
            for player in self.jloader('%s/clients' % plex_url).get('Servers', []):

                if 'protocolCapabilities' in player:
                    player['protocolCapabilities'] = player['protocolCapabilities'].split(',')
                if filter is None or filter in player['protocolCapabilities']:
                    players.append(player)

            return {'players': players}

        except Exception as e:
            self.logger.debug('Exception: %s' % e)
            self.logger.error('Unable to get players')
            return 'error'

    @cherrypy.expose()
    @require(member_of(htpc.role_admin))
    @cherrypy.tools.json_out()
    def GetServers(self, id=None):
        ''' Get list of servers '''
        self.logger.debug('Getting servers from Plex')
        try:

            IP_PlexGDM = '<broadcast>'
            Port_PlexGDM = 32414
            Msg_PlexGDM = 'M-SEARCH * HTTP/1.0'

            # setup socket for discovery -> multicast message
            GDM = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            GDM.settimeout(1.0)

            # Set the time-to-live for messages to 1 for local network
            GDM.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)

            returnData = []

            try:
                # Send data to the multicast group
                self.logger.info('Sending discovery message: %s' % Msg_PlexGDM)
                GDM.sendto(Msg_PlexGDM, (IP_PlexGDM, Port_PlexGDM))

                # Look for responses from all recipients
                while True:
                    try:
                        data, server = GDM.recvfrom(1024)
                        self.logger.debug('Received data from %s' % str(server))
                        self.logger.debug('Data received: %s' % str(data))
                        returnData.append({'from': server,
                                           'data': data})
                    except socket.timeout:
                        break
            finally:
                GDM.close()

            discovery_complete = True

            PMS_list = []
            if returnData:
                for response in returnData:
                    update = {'ip': response.get('from')[0]}

                    # Check if we had a positive HTTP response
                    if '200 OK' in response.get('data'):
                        for each in response.get('data').split('\n'):
                            # decode response data

                            if 'Content-Type:' in each:
                                update['content-type'] = each.split(':')[1].strip()
                            elif 'Resource-Identifier:' in each:
                                update['uuid'] = each.split(':')[1].strip()
                            elif 'Name:' in each:
                                update['serverName'] = each.split(':')[1].strip().decode('utf-8', 'replace')  # store in utf-8
                            elif 'Port:' in each:
                                update['port'] = each.split(':')[1].strip()
                            elif 'Updated-At:' in each:
                                update['updated'] = each.split(':')[1].strip()
                            elif 'Version:' in each:
                                update['version'] = each.split(':')[1].strip()
                    PMS_list.append(update)

            if not PMS_list:
                self.logger.info('GDM: No servers discovered')
            else:
                self.logger.info('GDM: Servers discovered: %s' % str(len(PMS_list)))

            for server in PMS_list:
                if server['uuid'] == id:
                    return {'servers': server}

            return {'servers': PMS_list}

        except Exception as e:
            self.logger.debug('Exception: %s' % e)
            self.logger.error('Unable to get players')
            return 'error'

    @cherrypy.expose()
    @require(member_of(htpc.role_user))  # req a user since it call play to "all"
    @cherrypy.tools.json_out()
    def PlayItem(self, playerip, machineid, item=None, type=None, offset=0, **kwargs): # fixme
        ''' Play a file in Plex '''
        self.logger.debug('Playing %s on %s type %s offset %s' % (item, playerip, type, offset))
        # Ripped a lot for plexapi so all credits goes there, the parameters are very picky...
        # The maybe swich to the api?
        # add type later
        try:
            plex_url = Plex.get_server_url()
            # urllib2 sucks should use requests
            data = {'shuffle': 0,
                    'continuous': 0,
                    'type': 'video'}

            data['X-Plex-Client-Identifier'] = str(hex(getnode()))
            data['uri'] = 'library://__GID__/item//library/metadata/%s' % item
            data['key'] = '/library/metadata/%s' % item
            path = 'playQueues%s' % joinArgs(data)

            quecommand = "%s/%s" % (plex_url, path)
            x = requests.post(quecommand, headers=self.getHeaders())
            # So we have qued the video, lets find it playQueueID
            find_playerq = x.json()
            playerq = find_playerq.get('playQueueID')
            # Need machineIdentifier
            s = self.JsonLoader(urlopen(Request(plex_url, headers=self.getHeaders())).read())

            b_url = '%s/system/players/%s/' % (plex_url, playerip)

            ctkey = '/playQueues/%s?window=100&own=1' % playerq
            arg = {'machineIdentifier': s.get('machineIdentifier'),
                   'key': '/library/metadata/' + item,
                   'containerKey': ctkey,
                   'offset': 0
                   }
            play = 'playback/playMedia%s' % joinArgs(arg)
            playcommand = b_url + play
            requests.get(playcommand, headers=self.getHeaders())
            self.logger.debug("playcommand is %s" % playcommand)

        except Exception as e:
            self.logger.debug('Exception: %s' % e)
            self.logger.error('Unable to play %s on player %s type %s offset %s' % (item, playerip, type, offset))
            return 'error'

    def _filter(self, s, hidewatched='all'): # default to 'all' as audio tabs don't currently specify watched/unwatched.
        self.logger.debug('called _filter with "%s" for %s' % (s, hidewatched))
        default = hidewatched
        if s == '':
            return default
        # allow foreign
        s = s.encode(encoding="UTF-8", errors='replace').strip()

        try:
            ok = len(s)
        except TypeError as e:
            self.logger.debug('converted %s to string %s' % (s, e))
            ok = len(str(s))

        if ok:
            # Check for control chars and default to title
            if '=' not in s and '<' not in s and '>' not in s and '!' not in s:
                return '%s?title=%s' % (default, urllib.quote_plus(s))
            else:
                s = urlparse.parse_qsl(s)
                # returns empty list if it fails
                if not len(s):
                    return default
                else:
                    d = dict(s)
                    for k, v in d.items():
                        if v == '':
                            return default

                        if k == 'genre':
                            # TODO: make this lookup dynamic (curl http://127.0.0.1:32400/library/sections/x/genre?X-Plex-Token=xxxxxxxxx)
                            # as classifications differ based on library type (and language I think).
							# The below appears to be out of date or not English.
                            gen = {
                                    'action': 235,
                                    'action film': 776,
                                    'adventure': 78,
                                    'animation': 263,
                                    'comedy': 391,
                                    'comedy music': 7558,
                                    'crime': 348,
                                    'documentary': 2905,
                                    'drama': 169,
                                    'family': 264,
                                    'fantacy': 79,
                                    'fantasy': 79, #allow both spellings
                                    'foreign': 3312,
                                    'forein': 3312, # allow both spellings
                                    'history': 170,
                                    'horror': 303,
                                    'music': 2361,
                                    'musical': 7556,
                                    'musical drama': 7557,
                                    'mystery': 195,
                                    'romance': 519,
                                    'romance film': 7555,
                                    'science fiction': 80,
                                    'science-fiction': 80, # allow hyphenated
                                    'slapstick': 777,
                                    'thriller': 196,
                                    'war': 659,
                                    'western': 1705
                            }
                            t = gen.get(v)
                            if t is not None:
                                d[k] = gen[v]
                            else:
                                # return filter as typed if not matched to genre above, in case someone actually knows what index to type
                                return '%s?%s' % (default, urllib.urlencode(s))

                        # TODO: If the lookup for 'genre=' can be made dynamic, then we can easily add these other filters:
                        # if k == 'director':
                        # if k == 'actor':
                        # if k == 'collection':
                        # if k == 'country':
                        # and presumably some music-related ones too.

                        if k == 'type':
                            # doesnt really do anything. you dont get appropriate response unless you
                            # are on the correct tab, would work on a general tab
                            gen = {
                                    'artist': 8,
                                    'artists': 8,
                                    'tvshows': 2,
                                    'tvshow': 2,
                                    'movies': 1,
                                    'movie': 1,
                                    'album': 9,
                                    'albums': 9,
                                    'track': 10,
                                    'tracks': 10
                            }
                            t = gen.get(v)
                            if t is not None:
                                d[k] = gen[v]
                            else:
                                return default

                    return '%s?%s' % (default, urllib.urlencode(d))

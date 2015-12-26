#!/usr/bin/env python
# -*- coding: utf-8 -*-

import cherrypy
import htpc
import logging
import requests
from cherrypy.lib.auth2 import require, member_of
from urllib import urlencode
from json import loads
from htpc.helpers import get_image, striphttp


class Headphones(object):
    def __init__(self):
        self.logger = logging.getLogger('modules.headphones')
        htpc.MODULES.append({
            'name': 'Headphones',
            'id': 'headphones',
            'test': htpc.WEBDIR + 'headphones/ping',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'headphones_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'headphones_name'},
                {'type': 'text', 'label': 'IP / Host *', 'name': 'headphones_host'},
                {'type': 'text', 'label': 'Port *', 'name': 'headphones_port'},
                {'type': 'text', 'label': 'Basepath', 'name': 'headphones_basepath'},
                {'type': 'text', 'label': 'API key', 'name': 'headphones_apikey'},
                {'type': 'bool', 'label': 'Use SSL', 'name': 'headphones_ssl'},
                {'type': 'text', "label": 'Reverse proxy link', 'placeholder': '', 'desc': 'Reverse proxy link ex: https://domain.com/hp', 'name': 'headphones_reverse_proxy_link'}

            ]
        })

    @cherrypy.expose()
    @require()
    def index(self):
        template = htpc.LOOKUP.get_template('headphones.html')
        settings = htpc.settings

        return template.render(
            scriptname='headphones',
            settings=settings,
            url=self.webinterface(),
            name=settings.get('headphones_name', 'Headphones')
        )

    def webinterface(self):
        url = Headphones._build_url()
        if htpc.settings.get('headphones_reverse_proxy_link'):
            url = htpc.settings.get('headphones_reverse_proxy_link')
        return url

    @cherrypy.expose()
    @require()
    def GetThumb(self, url=None, thumb=None, h=None, w=None, o=100):
        """ Parse thumb to get the url and send to htpc.proxy.get_image """
        self.logger.debug("Trying to fetch image via %s" % url)
        if url is None and thumb is None:
            # To stop if the image is missing
            return
        # Should never used thumb, to lazy to remove it
        if thumb:
            url = thumb
        return get_image(url, h, w, o)

    @cherrypy.expose()
    @require()
    def viewArtist(self, artist_id):
        response = self.fetch('getArtist&id=%s' % artist_id)

        for a in response['albums']:
            a['StatusText'] = _get_status_icon(a['Status'])
            a['can_download'] = True if a['Status'] not in ('Downloaded', 'Snatched', 'Wanted') else False
            a['can_skip'] = True if a['Status'] not in ('Downloaded', 'Snatched', 'Skipped') else False
            a['can_trynew'] = True if a['Status'] in ('Snatched') else False

        template = htpc.LOOKUP.get_template('headphones_view_artist.html')

        return template.render(
            scriptname='headphones_view_artist',
            artist_id=artist_id,
            artist=response['artist'][0],
            artistimg=response['artist'][0]['ArtworkURL'],
            albums=response['albums'],
            description=response['description'][0],
            module_name=htpc.settings.get('headphones_name') or 'Headphones',
        )

    @cherrypy.expose()
    @require()
    def viewAlbum(self, album_id):
        response = self.fetch('getAlbum&id=%s' % album_id)

        tracks = response['tracks']
        for t in tracks:
            duration = t['TrackDuration']
            total_seconds = duration / 1000
            minutes = total_seconds / 60
            seconds = total_seconds - (minutes * 60)
            t['DurationText'] = '%d:%02d' % (minutes, seconds)
            t['TrackStatus'] = _get_status_icon('Downloaded' if t['Location'] is not None else '')

        template = htpc.LOOKUP.get_template('headphones_view_album.html')
        return template.render(
            scriptname='headphones_view_album',
            artist_id=response['album'][0]['ArtistID'],
            album_id=album_id,
            albumimg=response['album'][0]['ArtworkURL'],
            module_name=htpc.settings.get('headphones_name', 'Headphones'),
            album=response['album'][0],
            tracks=response['tracks'],
            description=response['description'][0]
        )

    @staticmethod
    def _build_url(ssl=None, host=None, port=None, base_path=None):
        ssl = ssl or htpc.settings.get('headphones_ssl')
        host = host or htpc.settings.get('headphones_host')
        port = port or htpc.settings.get('headphones_port')
        base_path = base_path or htpc.settings.get('headphones_basepath')

        path = base_path or '/'
        if path.startswith('/') is False:
            path = '/' + path
        if path.endswith('/') is False:
            path += '/'

        url = '{protocol}://{host}:{port}{path}'.format(
            protocol='https' if ssl else 'http',
            host=striphttp(host),
            port=port,
            path=path,
        )

        return url

    @staticmethod
    def _build_api_url(command, url=None, api_key=None):
        return '{url}api?apikey={api_key}&cmd={command}'.format(
            url=url or Headphones._build_url(),
            api_key=api_key or htpc.settings.get('headphones_apikey'),
            command=command,
        )

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    @require()
    def GetArtistList(self):
        return self.fetch('getIndex')

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    @require()
    def GetWantedList(self):
        return self.fetch('getWanted')
        
    @cherrypy.expose()
    @cherrypy.tools.json_out()
    @require()
    def GetUpcomingList(self):
        return self.fetch('getUpcoming')

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    @require()
    def SearchForArtist(self, name, searchtype):
        if searchtype == "artistId":
            return self.fetch('findArtist&%s' % urlencode({'name': name.encode(encoding='UTF-8',errors='strict')}))
        else:
            return self.fetch('findAlbum&%s' % urlencode({'name': name.encode(encoding='UTF-8',errors='strict')}))

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    def RefreshArtist(self, artistId):
        return self.fetch('refreshArtist&id=%s' % artistId, text=True)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    def DeleteArtist(self, artistId):
        return self.fetch('delArtist&id=%s' % artistId, text=True)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    def PauseArtist(self, artistId):
        return self.fetch('pauseArtist&id=%s' % artistId, text=True)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    def ResumeArtist(self, artistId):
        return self.fetch('resumeArtist&id=%s' % artistId, text=True)

    @cherrypy.expose()
    @require()
    def QueueAlbum(self, albumId, new=False):
        # == Force check
        if new:
            return self.fetch('queueAlbum&id=%s&new=True' % albumId, text=True)
        return self.fetch('queueAlbum&id=%s' % albumId, text=True)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    def UnqueueAlbum(self, albumId):
        return self.fetch('unqueueAlbum&id=%s' % albumId, text=True)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    @require()
    def AddArtist(self, id, searchtype, **kwargs):
        if searchtype == "artistId":
            return self.fetch('addArtist&id=%s' % id)
        else:
            return self.fetch('addAlbum&id=%s' % id)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    @require()
    def GetHistoryList(self):
        return self.fetch('getHistory')

    @cherrypy.expose()
    @require()
    def GetAlbumArt(self, id):
        return self.fetch('getAlbumArt&id=%s' % id, img=True)

    @cherrypy.expose()
    @require()
    def GetAlbum(self, id):
        return self.fetch('getAlbum&id=%s' % id)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    def ForceSearch(self):
        return self.fetch('forceSearch', text=True)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    def ForceProcess(self, dir=None):
        if dir:
            return self.fetch('forceProcess?dir=%s' % dir, text=True)
        return self.fetch('forceProcess', text=True)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    def ForceActiveArtistsUpdate(self):
        return self.fetch('forceActiveArtistsUpdate', text=True)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    def ShutDown(self):
        return self.fetch('shutdown', text=True)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    def UpDate(self):
        return self.fetch('update', text=True)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    def ReStart(self):
        return self.fetch('restart', text=True)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    @require()
    def Choose_Specific_Download(self, id):
        return self.fetch('choose_specific_download&id=%s' % id)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    @require()
    def Download_Specific_Release(self, id, title, size, url, provider, kind):
        return self.fetch('download_specific_release&id=%s&title=%s&size=%s&url=%s&provider=%s&kind=%s' %(id, title, size, url, provider, kind))

    def fetch(self, command, url=None, api_key=None, img=False, json=True, text=False):
        url = Headphones._build_api_url(command, url, api_key)

        try:
            # So shitty api..
            if img or text:
                json = False
            result = ''
            self.logger.debug('calling api @ %s' % url)
            response = requests.get(url, timeout=30, verify=False)

            if response.status_code != 200:
                response.raise_for_status()
                self.logger.error('failed to contact headphones')
                return

            if text:
                result = response.text

            if img:
                result = response.content

            if json:
                result = response.json()

            self.logger.debug('Response: %s' % result)

            return result

        except Exception as e:
            self.logger.error("Error calling api %s: %s" % (url, e))

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    @require()
    def ping(self,
             headphones_enable, headphones_name,
             headphones_host, headphones_port,
             headphones_basepath,
             headphones_apikey,
             headphones_ssl=False,
             **kwargs):

        self.logger.debug('Attemping to ping headphones')

        url = Headphones._build_url(
            headphones_ssl,
            headphones_host,
            headphones_port,
            headphones_basepath,
        )

        return self.fetch('getVersion', url, headphones_apikey)


def _get_status_icon(status):
    green = ["Downloaded", "Active", "Processed"]
    orange = ["Snatched"]
    blue = ["Wanted"]
    red = ["Unprocessed"]

    mapsicon = {
        'Downloaded': 'fa fa-download',
        'Active': 'fa fa-rotate-right',
        'Error': 'fa fa-bell-o',
        'Paused': 'fa fa-pause',
        'Snatched': 'fa fa-share-alt',
        'Skipped': 'fa fa-fast-forward',
        'Wanted': 'fa fa-heart',
        'Processed': 'fa fa-check',
        'Unprocessed': 'fa fa-exclamation-circle'
    }

    if not status:
        return ''

    label = ''
    if status in green:
        label = 'label-success'
    elif status in orange:
        label = 'label-warning'
    elif status in blue:
        label = 'label-info'
    elif status in red:
        label = 'label-error'
    else:
        pass

    fmt = '<span class="label %s"><i class="%s fa-inverse"></i> %s</span>'

    return fmt % (label, mapsicon[status], status)

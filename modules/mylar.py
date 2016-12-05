#!/usr/bin/env python
# -*- coding: utf-8 -*-

import cherrypy
import htpc
import logging
import requests
from cherrypy.lib.auth2 import require, member_of
from urllib import urlencode

from json import loads
from htpc.helpers import get_image, serve_template, fix_basepath
from StringIO import StringIO
from contextlib import closing


class Mylar(object):
    def __init__(self):
        self.logger = logging.getLogger('modules.mylar')
        htpc.MODULES.append({
            'name': 'Mylar',
            'id': 'mylar',
            'test': htpc.WEBDIR + 'mylar/ping',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'mylar_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'mylar_name'},
                {'type': 'text', 'label': 'IP / Host *', 'name': 'mylar_host'},
                {'type': 'text', 'label': 'Port *', 'name': 'mylar_port'},
                {'type': 'text', 'label': 'Basepath', 'name': 'mylar_basepath'},
                {'type': 'text', 'label': 'API key', 'name': 'mylar_apikey'},
                {'type': 'bool', 'label': 'Use SSL', 'name': 'mylar_ssl'},
                {"type": "text", "label": "Reverse proxy link", "placeholder": "", "desc": "Reverse proxy link ex: https://hp.domain.com", "name": "mylar_reverse_proxy_link"}

            ]
        })

    @cherrypy.expose()
    @require()
    def index(self):
        return serve_template('mylar.html',
                              scriptname='mylar',
                              webinterface=Mylar.webinterface()
                            )


    @cherrypy.expose()
    @require()
    def GetThumb(self, url=None, thumb=None, h=None, w=None, o=100):
        """ Parse thumb to get the url and send to htpc.proxy.get_image """
        self.logger.debug("Trying to fetch image via %s", url)
        if url is None and thumb is None:
            # To stop if the image is missing
            return
        # Should never used thumb, to lazy to remove it
        if thumb:
            url = thumb
        return get_image(url, h, w, o)

    @cherrypy.expose()
    @require()
    def viewcomic(self, artist_id):
        response = self.fetch('getComic&id=%s' % artist_id)

        for a in response['comic']:
            a['StatusText'] = _get_status_icon(a['Status'])
            a['can_download'] = True if a['Status'] not in ('Downloaded', 'Snatched', 'Wanted') else False

        template = htpc.LOOKUP.get_template('mylar_view_comic.html')
        return template.render(
            scriptname='mylar_view_comic',
            comic_id=artist_id,
            comic=response['comic'][0],
            comicimg=response['comic'][0]['ComicImageURL'],
            issues=response['issues'],
            description=response['comic'][0]['Description'],
            module_name=htpc.settings.get('mylar_name', 'Mylar')
        )

    @staticmethod
    def _build_url(ssl=None, host=None, port=None, base_path=None):
        ssl = ssl or htpc.settings.get('mylar_ssl')
        host = host or htpc.settings.get('mylar_host')
        port = port or htpc.settings.get('mylar_port')
        path = fix_basepath(htpc.settings.get('mylar_basepath', '/'))

        url = '{protocol}://{host}:{port}{path}'.format(
            protocol='https' if ssl else 'http',
            host=host,
            port=port,
            path=path,
        )

        return url

    @staticmethod
    def webinterface():
        url = Mylar._build_url()

        if htpc.settings.get('mylar_reverse_proxy_link'):
            url = htpc.settings.get('mylar_reverse_proxy_link')

        return url

    @staticmethod
    def _build_api_url(command, url=None, api_key=None):
        return '{url}api?apikey={api_key}&cmd={command}'.format(
            url=url or Mylar._build_url(),
            api_key=api_key or htpc.settings.get('mylar_apikey'),
            command=command,
        )

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    @require()
    def getserieslist(self):
        return self.fetch('getIndex')

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    @require()
    def GetWantedList(self):
        return self.fetch('getWanted')

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    @require()
    def SearchForComic(self, name):
        return self.fetch('findComic&%s' % urlencode({'name': name.encode(encoding='UTF-8', errors='strict')}))

    @cherrypy.expose()
    @require()
    def RefreshComic(self, Id):
        return self.fetch('refreshComic&id=%s' % Id, text=True)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    def DeleteComic(self, Id):
        return self.fetch('delComic&id=%s' % Id, text=True)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    def PauseComic(self, Id):
        return self.fetch('pauseComic&id=%s' % Id, text=True)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    def ResumeComic(self, Id):
        return self.fetch('resumeComic&id=%s' % Id, text=True)

    @cherrypy.expose()
    @require()
    def QueueIssue(self, issueid=None, new=False, **kwargs):
        # Force check
        if new:
            return self.fetch('queueIssue&id=%s&new=True' % issueid, text=True)
        return self.fetch('queueIssue&id=%s' % issueid, text=True)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    def UnqueueIssue(self, issueid, name=''):
        self.logger.debug('unqued %s' % name)
        return self.fetch('unqueueIssue&id=%s' % issueid, text=True)

    @cherrypy.expose()
    @require()
    def DownloadIssue(self, issueid, name=''):
        """ downloads a issue via api and returns it to the browser """
        self.logger.debug('Downloading issue %s' % name)
        getfile = self.fetch('downloadIssue&id=%s' % issueid, img=True)
        try:
            with closing(StringIO()) as f:
                f = StringIO()
                f.write(getfile)
                return cherrypy.lib.static.serve_fileobj(f.getvalue(), content_type='application/x-download', disposition=None, name=name, debug=False)
        except Exception as e:
            self.logger.error('Failed to download %s %s %s' % (name, issueid, e))

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    @require()
    def AddComic(self, id, **kwargs):
        self.logger.debug('Added %s to mylar' % kwargs.get('name', ''))
        return self.fetch('addComic&id=%s' % id)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    @require()
    def GetHistoryList(self):
        return self.fetch('getHistory')

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    def ForceSearch(self):
        return self.fetch('forceSearch', text=True)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    def ForceProcess(self, dir_=None):
        if dir_:
            return self.fetch('forceProcess?dir_=%s' % dir_, text=True)
        return self.fetch('forceProcess', text=True)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    def ForceActiveArtistsUpdate(self):
        return self.fetch('forceActiveComicsUpdate', text=True)

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

    def fetch(self, command, url=None, api_key=None, img=False, json=True, text=False):
        url = Mylar._build_api_url(command, url, api_key)

        try:
            if img or text:
                json = False
            result = ''
            self.logger.debug('calling api @ %s' % url)
            # set a high timeout as some requests take a while..
            response = requests.get(url, timeout=120, verify=False)

            if response.status_code != 200:
                self.logger.error('failed to contact mylar')
                return

            if text:
                result = response.text

            if img:
                result = response.content

            if json:
                result = response.json()

            #self.logger.debug('Response: %s' % result)
            return result

        except Exception as e:
            self.logger.error("Error calling api %s: %s" % (url, e))

    @cherrypy.tools.json_out()
    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    def ping(self,
             mylar_enable, mylar_name,
             mylar_host, mylar_port,
             mylar_basepath,
             mylar_apikey,
             mylar_ssl=False,
             mylar_reverse_proxy_link=None):

        url = Mylar._build_url(
            mylar_ssl,
            mylar_host,
            mylar_port,
            mylar_basepath,
        )

        return self.fetch('getVersion', url, mylar_apikey)


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

    fmt = '<span class="label %s"><i class="%s icon-white"></i> %s</span>'

    return fmt % (label, mapsicon[status], status)

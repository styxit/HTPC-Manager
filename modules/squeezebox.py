#!/usr/bin/env python
# -*- coding: utf-8 -*-

import cherrypy
import urllib2
import base64
import htpc
import logging
from json import dumps, loads
from cherrypy.lib.auth2 import require
from htpc.helpers import striphttp


class Squeezebox(object):
    def __init__(self):
        self.logger = logging.getLogger('modules.squeezebox')
        htpc.MODULES.append({
            'name': 'Squeezebox',
            'id': 'squeezebox',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'squeezebox_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'squeezebox_name'},
                {'type': 'text', 'label': 'IP / Host *', 'name': 'squeezebox_host'},
                {'type': 'text', 'label': 'Port *', 'name': 'squeezebox_port'},
                {'type': 'text', 'label': 'Username', 'name': 'squeezebox_username'},
                {'type': 'password', 'label': 'Password', 'name': 'squeezebox_password'},
                {'type': 'text', 'label': 'Reverse proxy link', 'placeholder': '', 'desc': 'Reverse proxy link, e.g. https://domain.com/sq', 'name': 'squeezebox_reverse_proxy_link'},

            ]
        })

    @cherrypy.expose()
    @require()
    def index(self):
        return htpc.LOOKUP.get_template('squeezebox.html').render(scriptname='squeezebox', webinterface=self.webinterface())

    def webinterface(self):
        ip = htpc.settings.get('squeezebox_host')
        port = htpc.settings.get('squeezebox_ip')
        url = 'http://%s:%s' % (ip, port)

        if htpc.settings.get('squeezebox_reverse_proxy_link'):
            url = htpc.settings.get('squeezebox_reverse_proxy_link')

        return url

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def PlayerControl(self, player, command):
        command = urllib2.unquote(command)
        return self.jsonRequest(player, command.split())

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetPlayers(self, start=0, end=999):
        return self.jsonRequest("", ["players", start, end])

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetPlayer(self, player):
        return self.jsonRequest(player, ["status", "0"])

    @cherrypy.expose()
    @require()
    def GetCover(self, player):
        url = self.webhost('music/current/cover.jpg?player=' + player)
        request = urllib2.Request(url)
        auth = self.auth()
        if auth:
            request.add_header("Authorization", "Basic %s" % auth)
        cherrypy.response.headers['Content-Type'] = "image/jpeg"
        return urllib2.urlopen(request).read()

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetGenres(self):
        return self.jsonRequest("", ["genres", "0"])

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetArtists(self):
        return self.jsonRequest("", ["artists", "0"])

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetAlbums(self, artist=None, start=0, end=999):
        if artist:
            return self.jsonRequest("", ["albums", start, end, "artist_id:%s" % artist])
        else:
            return self.jsonRequest("", ["albums", "0"])

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetSongs(self, filter, start=0, end=999):
        return self.jsonRequest("", ["songs", start, end, filter])

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetStationGroups(self, start=0, end=999):
        return self.jsonRequest("", ["radios", start, end])

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetStationGroup(self, player='', group='local', start=0, end=999, filter=''):
        return self.jsonRequest(player, [group, 'items', start, end, filter])

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetPlaylists(self):
        return self.jsonRequest("", ["playlists", "0"])

    def webhost(self, path=''):
        host = striphttp(htpc.settings.get('squeezebox_host', ''))
        port = htpc.settings.get('squeezebox_port', '')
        return 'http://%s:%s/%s' % (host, port, path)

    def auth(self):
        username = htpc.settings.get('squeezebox_username', '')
        password = htpc.settings.get('squeezebox_password', '')
        if username and password:
            return base64.encodestring('%s:%s' % (username, password)).strip()

    def jsonRequest(self, player, params):
        data = dumps({"id": 1, "method": "slim.request", "params": [player, params]})
        self.logger.debug(data)
        request = urllib2.Request(self.webhost('jsonrpc.js'), data)
        auth = self.auth()
        if (auth):
            request.add_header("Authorization", "Basic %s" % auth)
        result = urllib2.urlopen(request, timeout=5).read()
        return loads(result.decode('utf-8'))

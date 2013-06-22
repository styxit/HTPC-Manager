import cherrypy
import urllib2
import base64
import htpc
from json import dumps, loads


class Squeezebox:
    def __init__(self):
        htpc.MODULES.append({
            'name': 'Squeezebox',
            'id': 'squeezebox',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'squeezebox_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'squeezebox_name'},
                {'type': 'text', 'label': 'IP / Host *', 'name': 'squeezebox_host'},
                {'type': 'text', 'label': 'Port *', 'name': 'squeezebox_port'},
                {'type': 'text', 'label': 'Username', 'name': 'squeezebox_username'},
                {'type': 'password', 'label': 'Password', 'name': 'squeezebox_password'}
        ]})

    @cherrypy.expose()
    def index(self):
        return htpc.LOOKUP.get_template('squeezebox.html').render(scriptname='squeezebox')

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def PlayerControl(self, player, command):
        command = urllib2.unquote(command)
        return self.jsonRequest(player, command.split())

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetPlayers(self, start=0, end=999):
        return self.jsonRequest("", ["players", start, end])

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetPlayer(self, player):
        return self.jsonRequest(player, ["status", "0"])

    @cherrypy.expose()
    def GetCover(self, player):
        url = self.webhost('music/current/cover.jpg?player=' + player)
        request = urllib2.Request(url)
        auth = self.auth()
        if auth:
            request.add_header("Authorization", "Basic %s" % auth)
        cherrypy.response.headers['Content-Type'] = "image/jpeg"
        return urllib2.urlopen(request).read()

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetGenres(self):
        return self.jsonRequest("", ["genres", "0"])

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetArtists(self):
        return self.jsonRequest("", ["artists", "0"])

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetAlbums(self, artist=None, start=0, end=999):
        if artist:
            return self.jsonRequest("", ["albums", start, end, "artist_id:%s" % artist])
        else:
            return self.jsonRequest("", ["albums", "0"])

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetSongs(self, filter, start=0, end=999):
        return self.jsonRequest("", ["songs", start, end, filter])

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetStationGroups(self, start=0, end=999):
        return self.jsonRequest("", ["radios", start, end])

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetStationGroup(self, player='', group='local', start=0, end=999, filter=''):
        return self.jsonRequest(player, [group, 'items', start, end, filter])

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetPlaylists(self):
        return self.jsonRequest("", ["playlists", "0"])

    def webhost(self, path=''):
        settings = htpc.settings.Settings()
        host = settings.get('squeezebox_host', '')
        port = str(settings.get('squeezebox_port', ''))
        return 'http://' + host + ':' + str(port) + '/' + path

    def auth(self):
        settings = htpc.settings.Settings()
        username = settings.get('squeezebox_username', '')
        password = settings.get('squeezebox_password', '')
        if username and password:
            return base64.encodestring('%s:%s' % (username, password)).strip()

    def jsonRequest(self, player, params):
        data = dumps({"id": 1, "method": "slim.request", "params": [player, params]})
        request = urllib2.Request(self.webhost('jsonrpc.js'), data)
        auth = self.auth()
        if (auth):
            request.add_header("Authorization", "Basic %s" % auth)
        result = urllib2.urlopen(request, timeout=5).read()
        return loads(result.decode('utf-8'))

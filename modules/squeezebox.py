import os, cherrypy, htpc
from Cheetah.Template import Template
import urllib2, base64, cherrypy
from json import dumps

class Squeezebox:
    @cherrypy.expose()
    def index(self):
        template = Template(file=os.path.join(htpc.template, 'squeezebox.tpl'), searchList=[htpc.settings])
        template.jsfile = 'squeezebox.js'
        return template.respond()

    @cherrypy.expose()
    def PlayerControl(self, **kwargs):
        player = kwargs.get('player') 
        command = urllib2.unquote(kwargs.get('command'))
        return self.jsonRequest(player, command.split())

    @cherrypy.expose()
    def GetPlayers(self, **kwargs):
        start = kwargs.get('start', 0)
        end = kwargs.get('end', 999)
        return self.jsonRequest("", ["players", start, end])

    @cherrypy.expose()
    def GetPlayer(self, **kwargs):
        player = kwargs.get('player') 
        return self.jsonRequest(player, ["status","0"])

    @cherrypy.expose()
    def GetCover(self, **kwargs):
        player = kwargs.get('player') 
        url = self.webhost('music/current/cover.jpg?player='+player)
        request = urllib2.Request(url)
        auth = self.auth()
        if auth:
            request.add_header("Authorization", "Basic %s" % auth)
        cherrypy.response.headers['Content-Type'] = "image/jpeg"
        return urllib2.urlopen(request).read()

    @cherrypy.expose()
    def GetGenres(self):
        return self.jsonRequest("", ["genres","0"])

    @cherrypy.expose()
    def GetArtists(self):
        return self.jsonRequest("", ["artists","0"])

    @cherrypy.expose()
    def GetAlbums(self, **kwargs):
        artist = kwargs.get('artist') 
        start = kwargs.get('start', 0) 
        end = kwargs.get('end', 999) 
        if artist:
            return self.jsonRequest("", ["albums", start, end, "artist_id:%s"%artist])
        else:
            return self.jsonRequest("", ["albums","0"])

    @cherrypy.expose()
    def GetSongs(self, **kwargs):
        filter = kwargs.get('filter') 
        start = kwargs.get('start', 0) 
        end = kwargs.get('end', 999) 
        return self.jsonRequest("", ["songs", start, end, filter])

    @cherrypy.expose()
    def GetStationGroups(self, **kwargs):
        start = kwargs.get('start', 0) 
        end = kwargs.get('end', 999) 
        return self.jsonRequest("", ["radios", start, end])

    @cherrypy.expose()
    def GetStationGroup(self, **kwargs):
        player = kwargs.get('player','')
        group = kwargs.get('group', 'local')
        start = kwargs.get('start', 0)
        end = kwargs.get('end', 999)
        filter = kwargs.get('filter')
        return self.jsonRequest(player, [group, 'items', start, end, filter])

    @cherrypy.expose()
    def GetPlaylists(self):
        return self.jsonRequest("", ["playlists","0"])

    def webhost(self, path=''):
        host = htpc.settings.get('squeezebox_host', '')
        port = str(htpc.settings.get('squeezebox_port', ''))
        return 'http://'+host+':'+str(port)+'/'+path

    def auth(self):
        username = htpc.settings.get('squeezebox_username', '')
        password = htpc.settings.get('squeezebox_password', '')
        if username and password:
            return base64.encodestring('%s:%s' % (username, password)).strip()

    def jsonRequest(self, player, params):
        print self.webhost('/jsonrpc.js')
        data = dumps({"id":1,"method":"slim.request","params":[player,params]})
        request = urllib2.Request(self.webhost('jsonrpc.js'), data)
        auth = self.auth()
        if (auth):
            request.add_header("Authorization", "Basic %s" % auth)
        result = urllib2.urlopen(request, timeout=5).read()
        return result.decode('utf-8')

cherrypy.tree.mount(Squeezebox(), "/squeezebox/")

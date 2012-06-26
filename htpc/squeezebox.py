import urllib2, base64, cherrypy
from json import dumps

class squeezebox:
    def __init__(self, host, port, username='', password=''):
        self.webhost = 'http://' + host + ':'+ str(port)
        self.auth = ''
        if username and password:
            self.auth = base64.encodestring('%s:%s' % (username, password)).strip()

    def sendRequest(self, args):
        if args.get('action') == 'control':
            command = urllib2.unquote(args.get('command'))
            return self.playerControl(args.get('player'), command)

        if args.get('action') == 'getplayers':
            return self.getPlayers()

        if args.get('action') == 'getplayer':
            return self.getPlayer(args.get('player'))

        if args.get('action') == 'getcover':
            return self.getCover(args.get('player'))

        if args.get('action') == 'getartists':
            return self.getArtists()

        if args.get('action') == 'getartist':
            return self.getArtist(args.get('artist'))

        if args.get('action') == 'getalbums':
            return self.getAlbums()

        if args.get('action') == 'getalbum':
            return self.getAlbum(args.get('album'))

        if args.get('action') == 'getplaylists':
            return self.getPlaylists()

    def playerControl(self, player, command):
        return self.jsonRequest(player, command.split())

    def getPlayers(self):
        return self.jsonRequest("", ["players","0","999"])

    def getPlayer(self, player):
        return self.jsonRequest(player, ["status","0"])

    def getCover(self, player):
        url = self.webhost+'/music/current/cover.jpg?player='+player
        request = urllib2.Request(url)
        if self.auth:
            request.add_header("Authorization", "Basic %s" % self.auth)
        cherrypy.response.headers['Content-Type'] = "image/jpeg"
        return urllib2.urlopen(request).read()

    def getArtists(self):
        return self.jsonRequest("", ["artists","0"])

    def getArtist(self, artist):
        return self.jsonRequest("", ["songs", "0", "999", "artist_id:%s"%artist])
    
    def getAlbums(self):
        return self.jsonRequest("", ["albums","0"])

    def getAlbum(self, album):
        return self.jsonRequest("", ["songs", "0", "999", "album_id:%s"%album])
    
    def getPlaylists(self):
        return self.jsonRequest("", ["playlists","0"])

    def jsonRequest(self, player, params):
        data = dumps({"id":1,"method":"slim.request","params":[player,params]})
        request = urllib2.Request(self.webhost + '/jsonrpc.js', data)
        if self.auth:
            request.add_header("Authorization", "Basic %s" % self.auth)
        return urllib2.urlopen(request, timeout=5).read()
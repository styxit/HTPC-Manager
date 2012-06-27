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

        if args.get('action') == 'getalbums':
            return self.getAlbums(args.get('artist',''))

        if args.get('action') == 'getsongs':
            return self.getSongs(args.get('filter'))

        if args.get('action') == 'getstationgroups':
            return self.getStationGroups()
       
        if args.get('action') == 'getstations':
            player = urllib2.unquote(args.get('player'))
            return self.getStations(player, args.get('group'))

        if args.get('action') == 'getplaylists':
            return self.getPlaylists()

    def playerControl(self, player, command):
        return self.jsonRequest(player, command.split())

    def getPlayers(self, start=0, end=999):
        return self.jsonRequest("", ["players", start, end])

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

    def getAlbums(self, artist="", start=0, end=999):
        if artist:
            return self.jsonRequest("", ["albums", start, end, "artist_id:%s"%artist])
        else:
            return self.jsonRequest("", ["albums","0"])

    def getSongs(self, filter, start=0, end=999):
        return self.jsonRequest("", ["songs", start, end, filter])

    def getStationGroups(self, start=0, end=999):
        return self.jsonRequest("", ["radios", start, end])

    def getStations(self, player, group='local', start=0, end=999):
        return self.jsonRequest(player, [group, 'items', start, end])

    def getPlaylists(self):
        return self.jsonRequest("", ["playlists","0"])

    def jsonRequest(self, player, params):
        data = dumps({"id":1,"method":"slim.request","params":[player,params]})
        request = urllib2.Request(self.webhost + '/jsonrpc.js', data)
        if self.auth:
            request.add_header("Authorization", "Basic %s" % self.auth)
        return urllib2.urlopen(request, timeout=5).read()
from telnetlib import Telnet
from json import dumps
import urllib2, base64, cherrypy

class squeezebox:
    def __init__(self, host, port, username='', password='', charset='utf-8'):
        self.telnet = Telnet(host, port)
        self.webhost = 'http://musik.mbw.dk'
        self.auth = base64.encodestring('%s:%s' % (username, password)).replace('\n', '')
        self.charset = charset

        if username and password:
            self.request("login %s %s" % (username, password))

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

    def getPlaylists(self):
        playlists = self.request("playlists 0")
        playlists = [i.split(":", 1) for i in playlists[2:]]
        playlists = [dict(playlists[start : start + 2]) for start in range(0, len(playlists), 2)]
        playlists = {
            'count': playlists.pop(),
            'playlists': playlists
        }
        return dumps(playlists)

    def getAlbums(self):
        albums = self.request("albums 0")
        albums = [i.split(":", 1) for i in albums[2:]]
        albums = [dict(albums[start : start + 2]) for start in range(0, len(albums), 2)]
        albums = {
            'count': albums.pop(),
            'albums': albums
        }
        return dumps(albums)

    def getAlbum(self, album):
        songs = self.request("songs 0 999 album_id:%s" % album)
        songs = [i.split(":", 1) for i in songs[4:]][:-1]
        songs = [dict(songs[start : start + 6]) for start in range(0, len(songs), 6)]
        return dumps(songs)

    def getArtists(self):
        artists = self.request("artists 0")
        artists = [i.split(":", 1) for i in artists[2:]]
        artists = [dict(artists[start : start + 2]) for start in range(0, len(artists), 2)]
        artists = {
            'count': artists.pop(),
            'artists': artists
        }
        return dumps(artists)

    def getArtist(self, artist):
        songs = self.request("songs 0 999 artist_id:%s" % artist)
        songs = [i.split(":", 1) for i in songs[4:]][:-1]
        songs = [dict(songs[start : start + 6]) for start in range(0, len(songs), 6)]
        return dumps(songs)

    def getCover(self, player):
        url = self.webhost+'/music/current/cover.jpg?player='+player
        request = urllib2.Request(url)
        request.add_header("Authorization", "Basic %s" % self.auth)
        cherrypy.response.headers['Content-Type'] = "image/jpeg"
        return urllib2.urlopen(request).read()

    def playerControl(self, player, command):
        self.request("%s %s" % (player, command))
        return "Success"

    def getPlayerCount(self):
        return int(self.request("player count ?")[2])

    def getPlayers(self):
        players = self.request("players 0 999")
        players = [i.split(":", 1) for i in players[4:]]
        players = [dict(players[start : start + 10]) for start in range(0, len(players), 10)]
        return dumps(players)

    def getPlayer(self, player):
        status = self.request("%s status 0" % player)
        status = [i.split(":", 1) for i in status[3:]]
        try:
            index = status.index(['playlist index','0'])
        except ValueError:
            return dumps(dict(status))

        player = dict(status[:index])
        status = status[index:]
        player['playlist'] = [dict(status[start : start + 7]) for start in range(0, len(status), 7)]
        return dumps(player)

    def request(self, command):
        self.telnet.write(command.encode('utf-8') + "\n")
        response = self.telnet.read_until("\n")[:-1]
        response = [urllib2.unquote(i) for i in response.split()]
        return response

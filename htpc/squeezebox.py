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
            self.simplerequest("login %s %s" % (username, password))

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

    def getCover(self, player):
        url = self.webhost+'/music/current/cover.jpg?player='+player
        request = urllib2.Request(url)
        request.add_header("Authorization", "Basic %s" % self.auth)
        cherrypy.response.headers['Content-Type'] = "image/jpeg"
        return urllib2.urlopen(request).read()

    def playerControl(self, player, command):
        self.simplerequest("%s %s" % (player, command))
        return "Success"

    def getPlayerCount(self):
        return int(self.simplerequest("player count ?")[2])

    def getPlayers(self):
        players = []
        for i in range(self.getPlayerCount()):
            players.append({
                'id': self.simplerequest("player id %i ?" % i)[3],
                'name': self.simplerequest("player name %i ?" % i)[3]
            })

        return dumps(players)

    def getPlayer(self, player):
        status = self.simplerequest("%s status 0" % player)
        status = [i.split(":", 1) for i in status[3:]]
        player = dict(status[:18])
        if player.has_key('duration') and player.has_key('time'):
            player['percentage'] = float(player['time']) / float(player['duration']) * 100
            player['time'] = "%i:%02d" % divmod(float(player['time']), 60)
            player['duration'] = "%i:%02d" % divmod(float(player['duration']), 60)

        status = status[18:]
        playlist = []
        for i in range(int(player['playlist_tracks'])):
            track = dict(status[:7])
            track['duration'] = "%i:%02d" % divmod(float(track['duration']), 60)
            playlist.append(track)
            status = status[7:]

        player['playlist'] = playlist

        return dumps(player)

    def simplerequest(self, command):
        self.telnet.write(command.encode('utf-8') + "\n")
        response = self.telnet.read_until("\n")[:-1]
        response = [urllib2.unquote(i) for i in response.split()]
        return response

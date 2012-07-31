import os, cherrypy, htpc
from Cheetah.Template import Template
import urllib, urllib2, base64
from PIL import Image, ImageEnhance
from jsonrpclib import Server
from json import dumps
import socket, struct

class Xbmc:
    def __init__(self):
        host = htpc.settings.get('xbmc_host', '')
        port = str(htpc.settings.get('xbmc_port', ''))
        username = htpc.settings.get('xbmc_username', '')
        password = htpc.settings.get('xbmc_password', '')
        self.url = 'http://' + username + ':' + password + '@' + host + ':' + str(port)
        self.req_url ='http://' + host + ':' + str(port) 
        self.auth = base64.encodestring('%s:%s' % (username, password)).replace('\n', '')
        self.hidewatched = bool(htpc.settings.get('xbmc_hide_watched', 0))
        self.ignorearticle = bool(htpc.settings.get('xbmc_ignorearticle',1))

    @cherrypy.expose()
    def index(self):
        template = Template(file=os.path.join(htpc.template, 'xbmc.tpl'), searchList=[htpc.settings])
        template.jsfile = 'xbmc.js'
        return template.respond()

    @cherrypy.expose()
    def GetThumb(self, **kwargs):
        thumb = kwargs.get('thumb')
        thumbHeight = kwargs.get('h')
        thumbWidth = kwargs.get('w')
        thumbOpacity = kwargs.get('o', 100)
        thumbParts = thumb.split('/')
        thumbFile = thumbParts.pop()
        
        thumbs = os.path.join(htpc.root, 'userdata/', 'xbmc_thumbs/')
        if not os.path.isdir(thumbs):
            os.makedirs(thumbs)

        thumbOnDisk = os.path.join(thumbs, thumbFile)
        if not os.path.isfile(thumbOnDisk + '_' + thumbWidth + '_' + thumbHeight + '.png'):
            # Hack when using nightly
            if thumb[:5]== "image" :
                url = urllib2.unquote(thumb[8:])
                request = urllib2.Request(url)
            else :
                request = urllib2.Request(self.req_url + '/vfs/' + thumb)
                request.add_header("Authorization", "Basic %s" % self.auth)
        
            fileObject = urllib2.urlopen(request)
            fileData = fileObject.read()
        
            # Find thumbmail
            f = open(thumbOnDisk, 'wb')
            f.write(fileData)
            f.close()
        
            # Resize thumbnail
            thumbOpacity = float(thumbOpacity)
            enhanceOpacity = (thumbOpacity / 100)
        
            width = int(thumbWidth)
            height = int(thumbHeight)
            image = Image.open(thumbOnDisk)
            newimage = image.resize((width, height), Image.ANTIALIAS).convert('RGBA')
            alpha = newimage.split()[3]
            alpha = ImageEnhance.Brightness(alpha).enhance(enhanceOpacity)
            newimage.putalpha(alpha)
            newimage.save(thumbOnDisk + '_' + thumbWidth + '_' + thumbHeight + '.png')
        
            # Oude weg gooien
            os.unlink(thumbOnDisk)
        
        # Plaatje weer uitlezen
        f = open(thumbOnDisk + '_' + thumbWidth + '_' + thumbHeight + '.png', 'rb')
        data = f.read()
        f.close()
        
        # Header setten en data returnen
        cherrypy.response.headers['Content-Type'] = "image/png"
        return data

    @cherrypy.expose()
    def GetMovies(self, **kwargs):
        limitstart = kwargs.get('start', 0)
        limitend = kwargs.get('end', 0)
        sortmethod = kwargs.get('sortmethod','videotitle')
        sortorder = kwargs.get('sortorder','ascending')
        try:
            xbmc = Server(self.url + '/jsonrpc')
            data = xbmc.VideoLibrary.GetMovies(sort={'order': sortorder, 'method' : sortmethod, 'ignorearticle' : self.ignorearticle}, 
                                               properties=['title', 'year', 'plot', 'thumbnail', 'file', 'fanart', 'studio', 'trailer', 'genre', 'rating'], 
                                               limits={'start' : int(limitstart), 'end' : int(limitend)})
            return dumps(data)
        except:
            return

    @cherrypy.expose()
    def GetShows(self, **kwargs):
        try:
            xbmc = Server(self.url + '/jsonrpc')
            shows = xbmc.VideoLibrary.GetTVShows(properties=['title', 'year', 'plot', 'thumbnail','playcount'])
            if self.hidewatched:
                shows['tvshows'] = filter(lambda i: i['playcount'] == 0, shows['tvshows'])
            return dumps(shows)
        except:
            return

    @cherrypy.expose()
    def GetShow(self, **kwargs):
        id = kwargs.get('item')
        server = Server(self.url + '/jsonrpc')
        showinfo = server.VideoLibrary.GetTVShowDetails(tvshowid=int(id),properties=['title', 'thumbnail'])
        episodes = server.VideoLibrary.GetEpisodes(tvshowid=int(id),properties=['episode', 'season', 'thumbnail', 'plot', 'file','playcount'])
        episodes = episodes[u'episodes']
        seasons = {}
        if self.hidewatched:
            episodes = filter(lambda i : i['playcount'] == 0,episodes)
        for episode in episodes:
            if not seasons.has_key(episode[u'season']):
                seasons[episode[u'season']] = {}
            seasons[episode[u'season']][episode[u'episode']] = episode
        return dumps({'show' : showinfo, 'seasons' : seasons})

    @cherrypy.expose()
    def PlayItem(self, **kwargs):
        item = kwargs.get('item')
        server = Server(self.url + '/jsonrpc')
        data = server.Player.Open(item={'file' : item})
        return dumps(data)

    @cherrypy.expose()
    def NowPlaying(self):
        try:
            server = Server(self.url + '/jsonrpc')
            player = server.Player.GetActivePlayers()
            application = server.Application.GetProperties(properties=['muted', 'volume', 'version'])
        except:
            return ''
        if player:
            player = player[0]
            if player[u'type'] == 'video':
                try:
                    playerInfo = server.Player.GetProperties(playerid=player[u'playerid'], properties=['speed', 'position', 'totaltime', 'time', 'percentage'])
                except:
                    return
                if playerInfo:
                    try:
                        itemInfo = server.Player.GetItem(playerid=player[u'playerid'], properties=['thumbnail', 'showtitle', 'year', 'episode', 'season', 'fanart'])
                        return dumps({'playerInfo' : playerInfo, 'itemInfo' : itemInfo, 'app' : application})
                    except:
                        return

    @cherrypy.expose()
    def ControlPlayer(self, **kwargs):
        action = kwargs.get('do')
        server = Server(self.url + '/jsonrpc')
        if action == 'SetMute':
            method = 'Application.SetMute'
            data = server._request(methodname=method, params=['toggle'])
        elif action == 'MoveLeft':
            method = 'Player.MoveLeft'
            data = server._request(methodname=method, params={'playerid' : 1, 'value' : 'smallbackward'})
        elif action == 'MoveRight':
            method = 'Player.MoveRight'
            data = server._request(methodname=method, params={'playerid' : 1, 'value' : 'smallforward'})
        else:
            method = 'Player.' + action
            data = server._request(methodname=method, params={'playerid' : 1})
        return dumps(data)

    @cherrypy.expose()
    def System(self, **kwargs):
        action = kwargs.get('do')
        server = Server(self.url + '/jsonrpc')
        if action == 'Shutdown':
            return dumps(server.System.Shutdown)
        elif action == 'Suspend':
            return dumps(server.System.Suspend)
        elif action == 'Reboot':
            return dumps(server.System.Reboot)
        elif action == 'Ping':
            try:
                return dumps(server.JSONRPC.Ping())
            except:
                return
        elif action == 'Wake':
            macaddress = '00:01:2e:47:49:76'
            try:
                addr_byte = macaddress.split(':')
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
                s.sendto(msg, ("255.255.255.255", 9))
                return 'Success'
            except:
                return 'Failed to send WOL packet'

    @cherrypy.expose()
    def Notify(self, **kwargs):
        text = urllib2.unquote(kwargs.get('text')).encode('utf-8')
        command = {'command': 'ExecBuiltIn', 'parameter': 'Notification(\'HTPC Manager\', \'' + text + '\')' }
        request = urllib2.Request(self.req_url + '/xbmcCmds/xbmcHttp/?' + urllib.urlencode(command))
        request.add_header("Authorization", "Basic %s" % self.auth)
        result = urllib2.urlopen(request)
        return result.read()

    @cherrypy.expose()
    def GetRecentMovies(self):
        server = Server(self.url + '/jsonrpc')
        data = server.VideoLibrary.GetRecentlyAddedMovies(properties=['title', 'year', 'plot', 'thumbnail', 'file', 'fanart', 'studio', 'trailer', 'genre', 'rating'])
        return dumps(data)

    @cherrypy.expose()
    def GetRecentShows(self):
        server = Server(self.url + '/jsonrpc')
        data = server.VideoLibrary.GetRecentlyAddedEpisodes(properties=['episode', 'season', 'thumbnail', 'plot', 'fanart', 'title', 'file'])
        return dumps(data)

    @cherrypy.expose()
    def GetRecentAlbums(self):
        server = Server(self.url + '/jsonrpc')
        data = server.AudioLibrary.GetRecentlyAddedAlbums(properties=['artist', 'albumlabel', 'year', 'description', 'thumbnail'])
        return dumps(data)

    @cherrypy.expose()
    def Clean(self):
        server = Server(self.url + '/jsonrpc')
        data = server.VideoLibrary.Clean()
        return dumps(data)

    @cherrypy.expose()
    def Scan(self):
        server = Server(self.url + '/jsonrpc')
        data = server.VideoLibrary.Scan()
        return dumps(data)


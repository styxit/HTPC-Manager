import os, cherrypy, htpc
from Cheetah.Template import Template
import urllib, urllib2, base64
from PIL import Image, ImageEnhance
from jsonrpclib import Server
from json import loads, dumps
import socket, struct

from htpc.tools import readSettings

class Xbmc:
    @cherrypy.expose()
    def index(self):
        template = Template(file=os.path.join(htpc.template, 'xbmc.tpl'), searchList=[htpc.settings])
        template.jsfile = 'xbmc.js'
        return template.respond()

    @cherrypy.expose()
    def getservers(self):
        servers = htpc.settings.get('xbmc_labels')
        if servers:
            servers = loads(htpc.settings.get('xbmc_labels'))
            try:
                current = htpc.xbmc
            except:
                current = servers[0]
            return dumps({'servers':servers, 'current':current})

    @cherrypy.expose()
    def setserver(self, **kwargs):
        server = kwargs.get('server')
        if (server):
            htpc.xbmc = kwargs.get('server')
            return dumps('success')
        return dumps('An error occurred')

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
                request = urllib2.Request(self.url('/vfs/'+thumb))
                auth = self.auth()
                if (auth):
                    request.add_header("Authorization", "Basic %s" % auth)
        
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
            xbmc = Server(self.url('/jsonrpc', True))
            ignorearticle = bool(htpc.settings.get('xbmc_ignorearticle',1))
            data = xbmc.VideoLibrary.GetMovies(sort={'order': sortorder, 'method': sortmethod, 'ignorearticle': ignorearticle}, 
                                               properties=['title', 'year', 'plot', 'thumbnail', 'file', 'fanart', 'studio', 'trailer', 'genre', 'rating'], 
                                               limits={'start': int(limitstart), 'end': int(limitend)})
            return dumps(data)
        except:
            return 

    @cherrypy.expose()
    def GetShows(self, **kwargs):
        try:
            xbmc = Server(self.url('/jsonrpc', True))
            shows = xbmc.VideoLibrary.GetTVShows(properties=['title', 'year', 'plot', 'thumbnail','playcount'])
            if bool(htpc.settings.get('xbmc_hide_watched', 0)):
                shows['tvshows'] = filter(lambda i: i['playcount'] == 0, shows['tvshows'])
            return dumps(shows)
        except:
            return

    @cherrypy.expose()
    def GetShow(self, **kwargs):
        id = kwargs.get('item')
        xbmc = Server(self.url('/jsonrpc', True))
        showinfo = xbmc.VideoLibrary.GetTVShowDetails(tvshowid=int(id),properties=['title', 'thumbnail'])
        episodes = xbmc.VideoLibrary.GetEpisodes(tvshowid=int(id),properties=['episode', 'season', 'thumbnail', 'plot', 'file','playcount'])
        episodes = episodes[u'episodes']
        seasons = {}
        if bool(htpc.settings.get('xbmc_hide_watched', 0)):
            episodes = filter(lambda i : i['playcount'] == 0,episodes)
        for episode in episodes:
            if not seasons.has_key(episode[u'season']):
                seasons[episode[u'season']] = {}
            seasons[episode[u'season']][episode[u'episode']] = episode
        return dumps({'show' : showinfo, 'seasons' : seasons})

    @cherrypy.expose()
    def PlayItem(self, **kwargs):
        item = kwargs.get('item')
        xbmc = Server(self.url('/jsonrpc', True))
        data = xbmc.Player.Open(item={'file' : item})
        return dumps(data)

    @cherrypy.expose()
    def NowPlaying(self):
        try:
            xbmc = Server(self.url('/jsonrpc', True))
            player = xbmc.Player.GetActivePlayers()
            application = xbmc.Application.GetProperties(properties=['muted', 'volume', 'version'])
        except:
            return ''
        if player:
            player = player[0]
            if player[u'type'] == 'video':
                try:
                    playerInfo = xbmc.Player.GetProperties(playerid=player[u'playerid'], properties=['speed', 'position', 'totaltime', 'time', 'percentage'])
                except:
                    return
                if playerInfo:
                    try:
                        itemInfo = xbmc.Player.GetItem(playerid=player[u'playerid'], properties=['thumbnail', 'showtitle', 'year', 'episode', 'season', 'fanart'])
                        return dumps({'playerInfo' : playerInfo, 'itemInfo' : itemInfo, 'app' : application})
                    except:
                        return

    @cherrypy.expose()
    def ControlPlayer(self, **kwargs):
        action = kwargs.get('do')
        xbmc = Server(self.url('/jsonrpc', True))
        if action == 'SetMute':
            data = xbmc.Application.SetMute(mute='toggle')
        elif action == 'MoveLeft':
            data = xbmc.Input.Left()
        elif action == 'MoveRight':
            data = xbmc.Input.Right()
        else:
            method = 'Player.' + action
            data = xbmc._request(methodname=method, params={'playerid' : 1})
        return dumps(data)

    @cherrypy.expose()
    def System(self, **kwargs):
        action = kwargs.get('do')
        xbmc = Server(self.url('/jsonrpc', True))
        if action == 'Shutdown':
            return dumps(xbmc.System.Shutdown())
        elif action == 'Suspend':
            return dumps(xbmc.System.Suspend())
        elif action == 'Reboot':
            return dumps(xbmc.System.Reboot())
        elif action == 'Ping':
            try:
                return dumps(xbmc.JSONRPC.Ping())
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
        request = urllib2.Request(self.url('/xbmcCmds/xbmcHttp/?' + urllib.urlencode(command)))
        auth = self.auth()
        if (auth):
            request.add_header("Authorization", "Basic %s" % auth)
        result = urllib2.urlopen(request)
        return result.read()

    @cherrypy.expose()
    def GetRecentMovies(self):
        xbmc = Server(self.url('/jsonrpc', True))
        data = xbmc.VideoLibrary.GetRecentlyAddedMovies(properties=['title', 'year', 'plot', 'thumbnail', 'file', 'fanart', 'studio', 'trailer', 'genre', 'rating'])
        return dumps(data)

    @cherrypy.expose()
    def GetRecentShows(self):
        xbmc = Server(self.url('/jsonrpc', True))
        data = xbmc.VideoLibrary.GetRecentlyAddedEpisodes(properties=['episode', 'season', 'thumbnail', 'plot', 'fanart', 'title', 'file'])
        return dumps(data)

    @cherrypy.expose()
    def GetRecentAlbums(self):
        xbmc = Server(self.url('/jsonrpc', True))
        data = xbmc.AudioLibrary.GetRecentlyAddedAlbums(properties=['artist', 'albumlabel', 'year', 'description', 'thumbnail'])
        return dumps(data)

    @cherrypy.expose()
    def Clean(self):
        xbmc = Server(self.url('/jsonrpc', True))
        data = xbmc.VideoLibrary.Clean()
        return dumps(data)

    @cherrypy.expose()
    def Scan(self):
        xbmc = Server(self.url('/jsonrpc', True))
        data = xbmc.VideoLibrary.Scan()
        return dumps(data)

    @cherrypy.expose()
    def url(self, path='', auth=False):
        try:
            settings = readSettings(htpc.configfile, htpc.xbmc)
        except:
            settings = htpc.settings
        host = settings.get('xbmc_host', '')
        port = str(settings.get('xbmc_port', ''))
        username = settings.get('xbmc_username', '')
        password = settings.get('xbmc_password', '')
        if (auth):
            return 'http://'+username+':'+password+'@'+host+':'+str(port)+path
        return 'http://'+host+':'+str(port)+path

    def auth(self):
        username = htpc.settings.get('xbmc_username', '')
        password = htpc.settings.get('xbmc_password', '')
        if username and password:
            return base64.encodestring('%s:%s' % (username, password)).replace('\n', '')

cherrypy.tree.mount(Xbmc(), "/xbmc/")

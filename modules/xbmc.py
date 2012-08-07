import os, sys, platform, subprocess
import cherrypy, htpc
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
    def Servers(self, server=None):
        if (server):
            htpc.xbmc = server
            return "success"

        servers = htpc.settings.get('xbmc_labels')
        if servers:
            servers = loads(servers)
            try:
                current = htpc.xbmc
            except:
                current = servers[0]
            return dumps({'servers':servers, 'current':current})

    @cherrypy.expose()
    def GetThumb(self, **kwargs):
        thumb = kwargs.get('thumb')
        thumbHeight = kwargs.get('h')
        thumbWidth = kwargs.get('w')
        thumbOpacity = kwargs.get('o', 100)
        thumbParts = thumb.split('/')
        thumbFile = thumbParts.pop()
        thumbType = thumbParts.pop()

        xbmc_thumbs = os.path.join(htpc.root, 'userdata/', 'xbmc_thumbs/')
        if not os.path.exists(xbmc_thumbs):
            os.makedirs(xbmc_thumbs)

        thumbOnDisk = os.path.join(xbmc_thumbs, thumbType + '_' + thumbFile)
        fileOut = os.path.join(xbmc_thumbs, thumbOnDisk + '_' + thumbWidth + '_' + thumbHeight + '.png')

        # If there is no local copy
        if not os.path.isfile(thumbOnDisk):
            if thumb.startswith('image://'): # Frodo
                url = self.url('/image/' + urllib.quote(thumb))
            else:
                url = self.url('/vfs/' + thumb)
            request = urllib2.Request(url)
            auth = self.auth()
            if (auth):
                request.add_header("Authorization", "Basic %s" % auth)

            fileObject = urllib2.urlopen(request)
            fileData = fileObject.read()
            f = open(thumbOnDisk, 'wb')
            f.write(fileData)
            f.close()

        # if there is no resized version
        if not os.path.isfile(fileOut):
            widthInt = int(thumbWidth)
            heightInt = int(thumbHeight)
            opacityFloat = float(thumbOpacity)
            enhance = opacityFloat/100
            imageResized = False

            # Resize with sips on OSX
            if False and platform.system() == 'Darwin' and not imageResized:
                try:
                    subprocess.call(['sips', '-z', thumbHeight, thumbWidth, thumbOnDisk, '--out', fileOut])
                    imageResized = True
                    print 'Used sips'
                except OSError:
                    pass

            # Resize with ImageMagick on Linux
            if False and platform.system() == 'Linux' and not imageResized:
                try:
                    subprocess.call(['convert', thumbOnDisk, '-resize', thumbWidth + 'x' + thumbHeight, fileOut])
                    imageResized = True
                    print 'Used ImageMagick'
                except OSError:
                    pass

            # resize PIL (for like openelec etc.)
            if not imageResized:
                try:
                    image = Image.open(thumbOnDisk)
                    newimage = image.resize((widthInt, heightInt), Image.ANTIALIAS).convert('RGBA')
                    alpha = newimage.split()[3]
                    alpha = ImageEnhance.Brightness(alpha).enhance(enhance)
                    newimage.putalpha(alpha)
                    newimage.save(fileOut)
                    print 'Used PIL'
                except:
                    pass

        # If the image got resized fetch the resized one otherwise use the copy
        # This is just a fallback (it makes the browser slow)
        noresizeridentifier = os.path.join(htpc.root, 'userdata/', 'no_resizer_found');
        if os.path.isfile(fileOut):
            f = open(fileOut, 'rb')
            try:
                os.unlink(noresizeridentifier)
            except:
                pass
        else:
            f = open(thumbOnDisk, 'rb')
            nf = open(noresizeridentifier, 'w')
            nf.write('1')
            nf.close()
        data = f.read()
        f.close()
        cherrypy.response.headers['Content-Type'] = "image/png"
        return data

    @cherrypy.expose()
    def GetMovies(self, start=0, end=0, sortmethod='videotitle', sortorder='ascending', **kwargs):
        try:
            ignorearticle = bool(htpc.settings.get('xbmc_ignorearticle',1))
            xbmc = Server(self.url('/jsonrpc', True))
            data = xbmc.VideoLibrary.GetMovies(sort={'order': sortorder, 'method': sortmethod, 'ignorearticle': ignorearticle}, 
                                               properties=['title', 'year', 'plot', 'thumbnail', 'file', 'fanart', 'studio', 'trailer', 'genre', 'rating'], 
                                               limits={'start': int(start), 'end': int(end)})
            return dumps(data)
        except:
            return 

    @cherrypy.expose()
    def GetShows(self, start=0, end=0, sortmethod='videotitle', sortorder='ascending', **kwargs):
        try:
            ignorearticle = bool(htpc.settings.get('xbmc_ignorearticle',1))
            xbmc = Server(self.url('/jsonrpc', True))
            shows = xbmc.VideoLibrary.GetTVShows(sort={'order': sortorder, 'method': sortmethod, 'ignorearticle': ignorearticle},
                                                 properties=['title', 'year', 'plot', 'thumbnail', 'playcount'],
                                                 limits={'start': int(start), 'end': int(end)})
            if bool(htpc.settings.get('xbmc_hide_watched', 0)):
                shows['tvshows'] = filter(lambda i: i['playcount'] == 0, shows['tvshows'])
            return dumps(shows)
        except:
            return

    @cherrypy.expose()
    def GetShow(self, tvshowid=None, **kwargs):
        xbmc = Server(self.url('/jsonrpc', True))
        showinfo = xbmc.VideoLibrary.GetTVShowDetails(tvshowid=int(tvshowid),properties=['title', 'thumbnail'])
        episodes = xbmc.VideoLibrary.GetEpisodes(tvshowid=int(tvshowid),properties=['episode', 'season', 'thumbnail', 'plot', 'file','playcount'])
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
    def PlayItem(self, item=None, **kwargs):
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
    def ControlPlayer(self, action="", **kwargs):
        xbmc = Server(self.url('/jsonrpc', True))
        if action == 'SetMute':
            data = xbmc.Application.SetMute(mute='toggle')
        elif action == 'Back':
            data = xbmc.Input.Back()
        elif action == 'Down':
            data = xbmc.Input.Down()
        elif action == 'Home':
            data = xbmc.Input.Home()
        elif action == 'Left':
            data = xbmc.Input.Left()
        elif action == 'Right':
            data = xbmc.Input.Right()
        elif action == 'Select':
            data = xbmc.Input.Select()
        elif action == 'Up':
            data = xbmc.Input.Up()
        elif action == 'MoveLeft':
            data = xbmc.Input.Left()
        elif action == 'MoveRight':
            data = xbmc.Input.Right()
        else:
            method = 'Player.' + action
            data = xbmc._request(methodname=method, params={'playerid' : 1})
        return dumps(data)

    @cherrypy.expose()
    def Subtitles(self, subtitle='', **kwargs):
        xbmc = Server(self.url('/jsonrpc', True))
        player = xbmc.Player.GetActivePlayers()
        if not player:
            return 
        try:
            if subtitle:
                subtitle = int(subtitle)
                xbmc.Player.SetSubtitle(playerid=player[0][u'playerid'], subtitle=subtitle)
                xbmc.Player.SetSubtitle(playerid=player[0][u'playerid'], subtitle='on')
        except ValueError:
            xbmc.Player.SetSubtitle(playerid=player[0][u'playerid'], subtitle='off')
        data = xbmc.Player.GetProperties(playerid=player[0][u'playerid'], properties=['subtitleenabled', 'currentsubtitle', 'subtitles'])
        data['subtitles'].insert(0, {'index':'off', 'name':'Off'})
        return dumps(data)

    @cherrypy.expose()
    def Audio(self, audio='', **kwargs):
        xbmc = Server(self.url('/jsonrpc', True))
        player = xbmc.Player.GetActivePlayers()
        if not player:
            return 
        try:
            audio = int(audio)
            xbmc.Player.SetAudioStream(playerid=player[0][u'playerid'], stream=audio)
        except ValueError:
            pass
        data = xbmc.Player.GetProperties(playerid=player[0][u'playerid'], properties=['currentaudiostream', 'audiostreams'])
        return dumps(data)

    @cherrypy.expose()
    def System(self, action='', **kwargs):
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

    @cherrypy.expose()
    def Wake(self, **kwargs):
        mac = '00:01:2e:47:49:76'
        try:
            addr_byte = mac.split(':')
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
            return 'Packet send to '+mac
        except:
            return 'Failed to send WOL packet'

    @cherrypy.expose()
    def Notify(self, text, **kwargs):
        text = urllib2.unquote(text).encode('utf-8')
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
    def Clean(self, lib='video', **kwargs):
        xbmc = Server(self.url('/jsonrpc', True))
        if lib == 'video':
            return dumps(xbmc.VideoLibrary.Clean())
        elif lib == 'audio':
            return dumps(xbmc.AudioLibrary.Clean())

    @cherrypy.expose()
    def Scan(self, lib='video'):
        xbmc = Server(self.url('/jsonrpc', True))
        if lib == 'video':
            return dumps(xbmc.VideoLibrary.Scan())
        elif lib == 'audio':
            return dumps(xbmc.AudioLibrary.Scan())

    def url(self, path='', auth=False):
        try:
            settings = readSettings(htpc.configfile, htpc.xbmc)
        except:
            settings = htpc.settings
        host = settings.get('xbmc_host', '')
        port = str(settings.get('xbmc_port', ''))
        username = settings.get('xbmc_username', '')
        password = settings.get('xbmc_password', '')
        if auth and username:
            return 'http://'+username+':'+password+'@'+host+':'+str(port)+path
        return 'http://'+host+':'+str(port)+path

    def auth(self):
        username = htpc.settings.get('xbmc_username', '')
        password = htpc.settings.get('xbmc_password', '')
        if username and password:
            return base64.encodestring('%s:%s' % (username, password)).replace('\n', '')

cherrypy.tree.mount(Xbmc(), "/xbmc/")

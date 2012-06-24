import os
import urllib
import urllib2
import base64
import cherrypy

from PIL import Image, ImageEnhance
from jsonrpclib import Server
from json import dumps

class xbmc:
    def __init__(self, host, port, username, password, hidewatched, ignorearticle=1):
        self.url = 'http://' + username + ':' + password + '@' + host + ':' + str(port)
        self.req_url ='http://' + host + ':' + str(port) 
        self.auth = base64.encodestring('%s:%s' % (username, password)).replace('\n', '')
        self.hidewatched = bool(hidewatched)
        self.ignorearticle = bool(ignorearticle)

    def sendRequest(self, args):
        if args.get('action') == 'movies':
            limitstart = args.get('start', 0)
            limitend = args.get('end', 0)
            sortmethod = args.get('sortmethod')
            sortorder = args.get('sortorder')
            return self.GetMovies(limitstart, limitend, sortmethod, sortorder)
        if args.get('action') == 'thumb':
            opacity = args.get('o', 100)
            return self.GetThumb(args.get('thumb'), args.get('w'), args.get('h'), opacity)
        if args.get('action') == 'shows':
            limitstart = args.get('start', 0)
            limitend = args.get('end', 0)
            return self.GetShows(limitstart, limitend)
        if args.get('action') == 'play':
            return self.PlayItem(args.get('item'))
        if args.get('action') == 'getshow':
            return self.GetShow(args.get('item'))
        if args.get('action') == 'nowplaying':
            return self.NowPlaying()
        if  args.get('action') == 'controlplayer':
            return self.ControlPlayer(args.get('do'));
        if  args.get('action') == 'notify':
            return self.Notify(args.get('text'));
        if  args.get('action') == 'recentmovies':
            return self.GetRecentMovies()
        if  args.get('action') == 'recentshows':
            return self.GetRecentShows()
        if  args.get('action') == 'recentalbums':
            return self.GetRecentAlbums()
        if  args.get('action') == 'clean':
            return self.Clean()
        if  args.get('action') == 'scan':
            return self.Scan()

    def GetThumb(self, thumb, thumbWidth, thumbHeight, thumbOpacity):
        thumbParts = thumb.split('/')
        thumbFile = thumbParts.pop()
        
        thumbs = os.path.join('userdata', 'xbmc_thumbs/')
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

    def GetMovies(self, limitstart=0, limitend=0, sortmethod='videotitle', sortorder='ascending'):
        server = Server(self.url + '/jsonrpc')
        data = server.VideoLibrary.GetMovies(sort={'order': sortorder, 'method' : sortmethod, 'ignorearticle' : self.ignorearticle}, 
                                             properties=['title', 'year', 'plot', 'thumbnail', 'file', 'fanart', 'studio', 'trailer', 'genre', 'rating'], 
                                             limits={'start' : int(limitstart), 'end' : int(limitend)})
        return dumps(data)

    def GetShows(self, limitstart=0, limitend=0, sortmethod='videotitle', sortorder='ascending'):
        server = Server(self.url + '/jsonrpc')
        data = server.VideoLibrary.GetTVShows(sort={'order': sortorder, 'method' : sortmethod, 'ignorearticle' : self.ignorearticle}, 
                                              properties=['title', 'year', 'plot', 'thumbnail'], 
                                              limits={'start' : int(limitstart), 'end' : int(limitend)})
        shows = server.VideoLibrary.GetTVShows(properties=['title', 'year', 'plot', 'thumbnail','playcount'])
        if self.hidewatched:
            shows[u'tvshows'] = filter(lambda i : i['playcount'] == 0,shows[u'tvshows'])
        return dumps(shows)

    def GetShow(self, id):
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

    def PlayItem(self, file):
        server = Server(self.url + '/jsonrpc')
        data = server.Player.Open(item={'file' : file})
        return dumps(data)

    def NowPlaying(self):
        server = Server(self.url + '/jsonrpc')
        player = server.Player.GetActivePlayers()
        application = server.Application.GetProperties(properties=['muted', 'volume', 'version'])
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

    def ControlPlayer(self, action):
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

    def Notify(self, text):
        text = urllib2.unquote(text)
        command = {'command': 'ExecBuiltIn', 'parameter': 'Notification(\'HTPC Manager\', \'' + text + '\')' }
        command = [command[i].encode('utf-8') for i in command]
        request = urllib2.Request(self.req_url + '/xbmcCmds/xbmcHttp/?' + urllib.urlencode(command))
        request.add_header("Authorization", "Basic %s" % self.auth)
        result = urllib2.urlopen(request)
        return result.read()

    def GetRecentMovies(self):
        server = Server(self.url + '/jsonrpc')
        data = server.VideoLibrary.GetRecentlyAddedMovies(properties=['title', 'year', 'plot', 'thumbnail', 'file', 'fanart', 'studio', 'trailer', 'genre', 'rating'])
        return dumps(data)

    def GetRecentShows(self):
        server = Server(self.url + '/jsonrpc')
        data = server.VideoLibrary.GetRecentlyAddedEpisodes(properties=['episode', 'season', 'thumbnail', 'plot', 'fanart', 'title', 'file'])
        return dumps(data)

    def GetRecentAlbums(self):
        server = Server(self.url + '/jsonrpc')
        data = server.AudioLibrary.GetRecentlyAddedAlbums(properties=['artist', 'albumlabel', 'year', 'description', 'thumbnail'])
        return dumps(data)

    def Clean(self):
        server = Server(self.url + '/jsonrpc')
        data = server.VideoLibrary.Clean()
        return dumps(data)

    def Scan(self):
        server = Server(self.url + '/jsonrpc')
        data = server.VideoLibrary.Scan()
        return dumps(data)
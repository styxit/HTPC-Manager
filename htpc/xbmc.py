from jsonrpclib import Server
from settings import readSettings
from json import dumps

import urllib2
import urllib
import base64
import cherrypy
import os
import htpc
from PIL import Image
from PIL import ImageEnhance

def xbmcFetchDataFromUrl(url):
    try:
        data = urllib2.urlopen(url)
        return data
    except:
        return ''

def xbmcGetThumb(thumb, thumbWidth, thumbHeight, thumbOpacity):

    thumbParts = thumb.split('/')
    thumbFile = thumbParts.pop()

    xbmc_thumbs = os.path.join(htpc.userdata, 'xbmc_thumbs/')
    if not os.path.isdir(xbmc_thumbs):
        os.makedirs(xbmc_thumbs)

    thumbOnDisk = os.path.join(xbmc_thumbs, thumbFile)
    if not os.path.isfile(thumbOnDisk + '_' + thumbWidth + '_' + thumbHeight + '.png'):
	# Hack when using nightly
        if thumb[:5]== "image" :
            url = urllib2.unquote(thumb[8:])
            request = urllib2.Request(url)
        else :
            config = readSettings()
            url = 'http://' + config.get('xbmc_ip') + ':' + str(config.get('xbmc_port')) + '/vfs/' + thumb
            request = urllib2.Request(url)
            base64string = base64.encodestring('%s:%s' % (config.get('xbmc_username'), config.get('xbmc_password'))).replace('\n', '')
            request.add_header("Authorization", "Basic %s" % base64string)

        fileObject = urllib2.urlopen(request)
        fileData = fileObject.read()

        # Thumbnail opslaan
        f = open(thumbOnDisk, 'wb')
        f.write(fileData)
        f.close()

        # Plaatje resizen
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

def xbmcMakeUrl():
    config = readSettings()
    if config.has_key('xbmc_port') and config.has_key('xbmc_ip') and config.has_key('xbmc_username') and config.has_key('xbmc_password'):
        url = 'http://' + config.get('xbmc_username') + ':' + config.get('xbmc_password') + '@' + config.get('xbmc_ip') + ':' + str(config.get('xbmc_port'))
        return url

def xbmcGetMovies():
    server = Server(xbmcMakeUrl() + '/jsonrpc')
    data = server.VideoLibrary.GetMovies(properties=['title', 'year', 'plot', 'thumbnail', 'file', 'fanart', 'studio', 'trailer'])
    return dumps(data)

def xbmcGetShows():
    server = Server(xbmcMakeUrl() + '/jsonrpc')
    data = server.VideoLibrary.GetTVShows(properties=['title', 'year', 'plot', 'thumbnail'])
    return dumps(data)

def xbmcGetShow(id):
    server = Server(xbmcMakeUrl() + '/jsonrpc')
    showinfo = server.VideoLibrary.GetTVShowDetails(tvshowid=int(id),properties=['title', 'thumbnail'])
    episodes = server.VideoLibrary.GetEpisodes(tvshowid=int(id),properties=['episode', 'season', 'thumbnail', 'plot', 'file'])
    episodes = episodes[u'episodes']
    seasons = {}
    for episode in episodes:
        if not seasons.has_key(episode[u'season']):
            seasons[episode[u'season']] = {}
        seasons[episode[u'season']][episode[u'episode']] = episode
    return dumps({'show' : showinfo, 'seasons' : seasons})

def xbmcPlayItem(file):
    server = Server(xbmcMakeUrl() + '/jsonrpc')
    data = server.Player.Open(item={'file' : file})
    return dumps(data)

def xbmcNowPlaying():
    server = Server(xbmcMakeUrl() + '/jsonrpc')
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

def xbmcControlPlayer(action):
    server = Server(xbmcMakeUrl() + '/jsonrpc')
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

def xbmcNotify(text):
    text = urllib2.unquote(text)
    config = readSettings()
    command = {'command': 'ExecBuiltIn', 'parameter': 'Notification(\'HTPC Manager\', \'' + text + '\')' }
    url = 'http://' + config.get('xbmc_ip') + ':' + str(config.get('xbmc_port')) + '/xbmcCmds/xbmcHttp/?' + urllib.urlencode(command)

    request = urllib2.Request(url)
    base64string = base64.encodestring('%s:%s' % (config.get('xbmc_username'), config.get('xbmc_password'))).replace('\n', '')
    request.add_header("Authorization", "Basic %s" % base64string)
    result = urllib2.urlopen(request)

    return result.read()

def xbmcGetRecentMovies():
    server = Server(xbmcMakeUrl() + '/jsonrpc')
    data = server.VideoLibrary.GetRecentlyAddedMovies(properties=['title', 'year', 'plot', 'thumbnail', 'fanart'])
    return dumps(data)

def xbmcGetRecentShows():
    server = Server(xbmcMakeUrl() + '/jsonrpc')
    data = server.VideoLibrary.GetRecentlyAddedEpisodes(properties=['episode', 'season', 'thumbnail', 'plot', 'fanart', 'title'])
    return dumps(data)

def xbmcGetRecentAlbums():
    server = Server(xbmcMakeUrl() + '/jsonrpc')
    data = server.AudioLibrary.GetRecentlyAddedAlbums(properties=['artist', 'albumlabel', 'year', 'description', 'thumbnail'])
    return dumps(data)

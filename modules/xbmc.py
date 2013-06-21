""" Module for connecting to XBMC """
import cherrypy
import htpc
import base64
import socket
import struct
from urllib2 import quote, unquote
from jsonrpclib import Server
from xmlrpclib import ProtocolError
from httplib import InvalidURL
from sqlobject import SQLObject, SQLObjectNotFound
from sqlobject.col import StringCol, IntCol
from htpc.proxy import get_image
import logging

class XbmcServers(SQLObject):
    """ SQLObject class for xbmc_servers table """
    name = StringCol()
    host = StringCol()
    port = IntCol()
    username = StringCol(default=None)
    password = StringCol(default=None)
    mac = StringCol(default=None)


class Xbmc:
    def __init__(self):
        """ Add module to list of modules on load and set required settings """
        self.logger = logging.getLogger('modules.xbmc')

        # xbmc.XBMC.GetInfoLabels(labels=["Network.MacAddress"])
        XbmcServers.createTable(ifNotExists=True)
        htpc.MODULES.append({
            'name': 'XBMC',
            'id': 'xbmc',
            'fields': [
                {'type':'bool',
                 'label':'Enable',
                 'name':'xbmc_enable'},
                {'type':'text',
                 'label':'Menu name',
                 'name':'xbmc_name'}
        ]})
        htpc.MODULES.append({
            'name': 'XBMC Servers',
            'id': 'xbmc_update_server',
            'action': htpc.WEBDIR + 'xbmc/server',
            'test': htpc.WEBDIR + 'xbmc/ping',
            'fields': [
                {'type':'select',
                 'label':'Server',
                 'name':'xbmc_server_id',
                 'options':[
                    {'name':'New', 'value':0}
                ]},
                {'type':'text',
                 'label':'Name',
                 'name':'xbmc_server_name'},
                {'type':'text',
                 'label':'IP / Host',
                 'name':'xbmc_server_host'},
                {'type':'text',
                 'label':'Port',
                 'name':'xbmc_server_port'},
                {'type':'text',
                 'label':'Username',
                 'name':'xbmc_server_username'},
                {'type':'password',
                 'label':'Password',
                 'name':'xbmc_server_password'}
        ]})
        # Set current server to the first one in database
        try:
            self.current = XbmcServers.select(limit=1).getOne().name
        except SQLObjectNotFound:
            self.logger.debug("No XBMC-Server found in database.")
            self.current = None

    @cherrypy.expose()
    def index(self):
        """ Generate page from template """
        return htpc.LOOKUP.get_template('xbmc/index.html').render()

    @cherrypy.expose()
    def playlist(self):
        """ Generate page from template """
        self.logger.debug("Generating Playlist-Page")
        return htpc.LOOKUP.get_template('xbmc/playlist.html').render()

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def ping(self, xbmc_server_host='', xbmc_server_port='',
            xbmc_server_username='', xbmc_server_password='', **kwargs):
        """ Tests settings, returns "pong" on success and null on fail """
        self.logger.debug("Testing XBMC connectivity")

        if not xbmc_server_host or not xbmc_server_port:
            self.logger.error("Please specifiy hostname and port for xbmc.")
            return
        try:
            url = xbmc_server_host + ':' + xbmc_server_port
            if xbmc_server_username and xbmc_server_password:
                url = xbmc_server_username + ':' + xbmc_server_password + '@' + url
            xbmc = Server('http://' + url + '/jsonrpc')
            self.logger.debug("Trying to contact xbmc via " + url)
            return xbmc.JSONRPC.Ping()
        except (ProtocolError, InvalidURL) as e:
            self.logger.error("Unable to contact XBMC via " + url)
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def getserver(self, id):
        """ Get XBMC server info """
        try:
            server = XbmcServers.selectBy(id=id).getOne()
            return {
                'name': server.name,
                'host': server.host,
                'port': server.port,
                'username': server.username,
                'password': server.password
            }
        except SQLObjectNotFound:
            return None

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def server(self, xbmc_server_id, xbmc_server_name, xbmc_server_host, xbmc_server_port,
            xbmc_server_username=None, xbmc_server_password=None):
        """ Create a server if id=0, else update a server """
        if xbmc_server_id == "0":
            self.logger.debug("Creating XBMC-Server in database")
            try:
                XbmcServers(name=xbmc_server_name,
                        host=xbmc_server_host,
                        port=int(xbmc_server_port),
                        username=xbmc_server_username,
                        password=xbmc_server_password)
                return True
            except ValueError:
                self.logger.error("Unable to create XBMC-Server in database")
                return False
        else:
            self.logger.debug("Updating XBMC-Server " + xbmc_server_name + " in database")
            try:
                server = XbmcServers.selectBy(id=xbmc_server_id).getOne()
                server.name = xbmc_server_name
                server.host = xbmc_server_host
                server.port = int(xbmc_server_port)
                server.username = xbmc_server_username
                server.password = xbmc_server_password
                return True
            except SQLObjectNotFound, e:
                self.logger.error("Unable to update XBMC-Server " + server.name + " in database")
                return False

    @cherrypy.expose()
    def delserver(self, id):
        """ Delete a server """
        self.logger.debug("Deleting server " + str(id))
        XbmcServers.delete(id)
        return self.index()

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def Servers(self, server=None):
        """ Get a list of all servers and the current server """
        if server:
            self.current = server
            return "successful"

        servers = []
        for x in XbmcServers.select():
            servers.append({'name': x.name, 'id': x.id})
        if len(servers) < 1:
            return
        return {'current': self.current, 'servers': servers}

    @cherrypy.expose()
    def GetThumb(self, thumb=None, h=None, w=None, o=100):
        """ Parse thumb to get the url and send to htpc.proxy.get_image """
        url = unquote(thumb)
        if not url:
            url = self.url('/images/DefaultVideo.png')
        if url.startswith('special://'):  # Eden
            url = self.url('/vfs/' + quote(url))
        elif url.startswith('image://'):  # Frodo
            url = self.url('/image/' + quote(thumb))

        self.logger.debug("Trying to fetch image via " + url)
        return get_image(url, h, w, o, self.auth())

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetMovies(self, start=0, end=0, sortmethod='title',
            sortorder='ascending'):
        """ Get a list of all movies """
        self.logger.debug("Fetching Movies")
        try:
            xbmc = Server(self.url('/jsonrpc', True))
            sort = {'order': sortorder, 'method': sortmethod, 'ignorearticle': True}
            properties = ['title', 'year', 'plot', 'thumbnail', 'file', 'fanart', 'studio', 'trailer',
                    'imdbnumber', 'genre', 'rating', 'streamdetails', 'playcount']
            limits = {'start': int(start), 'end': int(end)}
            return xbmc.VideoLibrary.GetMovies(sort=sort, properties=properties, limits=limits)
        except ValueError:
            self.logger.error("Unable to fetch movies!")
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetShows(self, start=0, end=0, sortmethod='title', sortorder='ascending', hidewatched=False):
        """ Get a list of all the TV Shows """
        self.logger.debug("Fetching TV Shows")
        try:
            xbmc = Server(self.url('/jsonrpc', True))
            sort = {'order': sortorder, 'method': sortmethod, 'ignorearticle': True}
            properties = ['title', 'year', 'plot', 'thumbnail', 'playcount']
            limits = {'start': int(start), 'end': int(end)}
            shows = xbmc.VideoLibrary.GetTVShows(sort=sort, properties=properties, limits=limits)
            if hidewatched == "1":
                shows['tvshows'] = filter(lambda i: i['playcount'] == 0, shows['tvshows'])
            return shows
        except:
            self.logger.error("Unable to fetch TV Shows")
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetShow(self, tvshowid=None, hidewatched=False):
        """ Get information about a single TV Show """
        self.logger.debug("Loading information for TVID" + str(tvshowid))
        xbmc = Server(self.url('/jsonrpc', True))
        showinfo = xbmc.VideoLibrary.GetTVShowDetails(tvshowid=int(tvshowid), properties=['title', 'thumbnail'])
        episodes = xbmc.VideoLibrary.GetEpisodes(tvshowid=int(tvshowid), properties=['episode', 'season', 'thumbnail', 'plot', 'file', 'playcount'])
        episodes = episodes[u'episodes']
        seasons = {}
        if hidewatched == "1":
            episodes = filter(lambda i: i['playcount'] == 0, episodes)
        for episode in episodes:
            if not episode['season'] in seasons:
                seasons[episode[u'season']] = {}
            seasons[episode[u'season']][episode[u'episode']] = episode
        return {'show': showinfo, 'seasons': seasons}

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetArtists(self, start=0, end=0, sortmethod='artist', sortorder='ascending', filter=''):
        """ Get a list of all artists """
        self.logger.debug("Fetching all artists in the music database")
        try:
            xbmc = Server(self.url('/jsonrpc', True))
            sort = {'order': sortorder, 'method': sortmethod, 'ignorearticle': True}
            properties = ['thumbnail', 'fanart']
            limits = {'start': int(start), 'end': int(end)}
            filter = {'field': 'artist', 'operator': 'contains', 'value': filter}
            return xbmc.AudioLibrary.GetArtists(properties=properties, limits=limits, sort=sort, filter=filter)
        except ValueError:
            logger.error("Unable to fetch artists!")
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetArtistDetails(self, artistid):
        """ Get artist details from xbmc """
        self.logger.debug("Loading information for ARTISTID " + artistid)
        try:
            xbmc = Server(self.url('/jsonrpc', True))
            properties = ['thumbnail', 'fanart', 'description']
            return xbmc.AudioLibrary.GetArtistDetails(artistid=int(artistid), properties=properties)
        except ValueError:
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetAlbums(self, artistid):
        """ Get a list of all albums for artist """
        self.logger.debug("Loading all albums for ARTISTID " + artistid)
        try:
            xbmc = Server(self.url('/jsonrpc', True))
            properties=['artist', 'albumlabel', 'year', 'description', 'thumbnail']
            filter = {'artistid': int(artistid)}
            return xbmc.AudioLibrary.GetAlbums(filter=filter, properties=properties)
        except ValueError:
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def PlayItem(self, item=None, type=None):
        """ Play a file in XBMC """
        xbmc = Server(self.url('/jsonrpc', True))
        self.logger.debug("Playing a file from the type " + type)

        if type == 'movie':
            return xbmc.Player.Open(item={'movieid': int(item)})
        if type == 'episode':
            return xbmc.Player.Open(item={'episodeid': int(item)})
        if type == 'artist':
            return xbmc.Player.Open(item={'artistid': int(item)})
        if type == 'song':
            return xbmc.Player.Open(item={'songid': int(item)})

        return xbmc.Player.Open(item={'file': item})

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def Playlist(self, type='audio'):
        """ Get a playlist from XBMC """
        self.logger.debug("Loading Playlist of type " + type)
        xbmc = Server(self.url('/jsonrpc', True))
        playlists = xbmc.Playlist.GetPlaylists()
        playlistId = -1
        for playlist in playlists:
            if playlist['type'] == type:
                playlistId = playlist['playlistid']
                print playlistId

        if playlistId is not -1:
            return xbmc.Playlist.GetItems(playlistid=playlistId, properties=['artist', 'title', 'album'])

        return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def NowPlaying(self):
        """ Get information about current playing item """
        self.logger.debug("Fetching currently playing information")
        try:
            xbmc = Server(self.url('/jsonrpc', True))
            player = xbmc.Player.GetActivePlayers()
            application = xbmc.Application.GetProperties(properties=['muted', 'volume', 'version'])

            if player[0][u'type'] == 'video':
                properties = ['speed', 'position', 'totaltime', 'time', 'percentage', 'subtitleenabled', 'currentsubtitle', 'subtitles',
                              'currentaudiostream', 'audiostreams']
                playerInfo = xbmc.Player.GetProperties(playerid=player[0][u'playerid'], properties=properties)
                itemInfo = xbmc.Player.GetItem(playerid=player[0][u'playerid'], properties=['thumbnail', 'showtitle', 'year', 'episode', 'season', 'fanart'])
                return {'playerInfo': playerInfo, 'itemInfo': itemInfo, 'app': application}

            elif player[0][u'type'] == 'audio':
                properties = ['speed', 'position', 'totaltime', 'time', 'percentage',
                              'currentaudiostream', 'audiostreams']
                playerInfo = xbmc.Player.GetProperties(playerid=player[0][u'playerid'], properties=properties)
                itemInfo = xbmc.Player.GetItem(playerid=player[0][u'playerid'], properties=['title', 'artist', 'album', 'thumbnail', 'showtitle', 'year', 'episode', 'season', 'fanart'])

                return {'playerInfo': playerInfo, 'itemInfo': itemInfo, 'app': application}
        except:
            self.logger.debug("Unable to fetch currently playing information!")
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def ControlPlayer(self, action='', percent=''):
        """ Various commands to control XBMC Player """
        self.logger.debug("Sending control to XBMC: " + action)
        xbmc = Server(self.url('/jsonrpc', True))
        player = xbmc.Player.GetActivePlayers()
        if action == 'SetMute':
            return xbmc.Application.SetMute(mute='toggle')
        elif action == 'Back':
            return xbmc.Input.Back()
        elif action == 'Down':
            return xbmc.Input.Down()
        elif action == 'Home':
            return xbmc.Input.Home()
        elif action == 'Left':
            return xbmc.Input.Left()
        elif action == 'Right':
            return xbmc.Input.Right()
        elif action == 'Select':
            return xbmc.Input.Select()
        elif action == 'Up':
            return xbmc.Input.Up()
        elif action == 'MoveLeft':
            return xbmc.Input.Left()
        elif action == 'MoveRight':
            return xbmc.Input.Right()
        elif action == 'PlayNext':
            try:
                return xbmc.Player.GoTo(playerid=player[0][u'playerid'], to='next')
            except:
                self.logger.error("Unable to control XBMC with action: " + action)
                return
        elif action == 'PlayPrev':
            try:
                return xbmc.Player.GoTo(playerid=player[0][u'playerid'], to='previous')
            except:
                self.logger.error("Unable to control XBMC with action: " + action)
                return
        elif action == 'JumpItem':
            try:
                return xbmc.Player.GoTo(playerid=player[0][u'playerid'], to=int(percent))
            except:
                self.logger.error("Unable to control XBMC with action: " + action)
                return
        elif action == 'Seek':
            try:
                percent = float(percent)
                return xbmc.Player.Seek(playerid=player[0][u'playerid'], value=percent)
            except:
                self.logger.error("Unable to control XBMC with action: " + action)
                return
        elif action:
            try:
                method = 'Player.' + action
                return xbmc._request(methodname=method, params={'playerid': player[0][u'playerid']})
            except:
                self.logger.error("Unable to control XBMC with action: " + action)
                return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def Subtitles(self, subtitle='off'):
        """ Change the subtitles """
        self.logger.debug("Changing subtitles to " + subtitle)
        try:
            xbmc = Server(self.url('/jsonrpc', True))
            player = xbmc.Player.GetActivePlayers()
            playerid = player[0][u'playerid']
            try:
                subtitle = int(subtitle)
                xbmc.Player.SetSubtitle(playerid=playerid, subtitle=subtitle)
                xbmc.Player.SetSubtitle(playerid=playerid, subtitle='on')
            except ValueError:
                self.logger.error("Unable to set subtitle to specified value " + subtitle)
                self.logger.info("Disabling subtitles")
                xbmc.Player.SetSubtitle(playerid=playerid, subtitle='off')
            return
        except:
            self.logger.error("Unable to set subtitle to specified value " + subtitle)
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def Audio(self, audio=None):
        """ Change the audio stream  """
        self.logger.debug("Chaning audio stream to " + str(audio))
        try:
            xbmc = Server(self.url('/jsonrpc', True))
            player = xbmc.Player.GetActivePlayers()
            playerid = player[0][u'playerid']
            if audio:
                try:
                    audio = int(audio)
                    xbmc.Player.SetAudioStream(playerid=playerid, stream=audio)
                except ValueError:
                    self.logger.error("Unable to change audio stream to specified value " + str(audio))
                    pass
            return
        except:
            self.logger.error("Unable to change audio stream to specified value " + str(audio))
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def System(self, action=''):
        """ Various system commands """
        xbmc = Server(self.url('/jsonrpc', True))
        if action == 'Shutdown':
            self.logger.info("Shutting down XBMC")
            return xbmc.System.Shutdown()
        elif action == 'Suspend':
            self.logger.info("Suspending XBMC")
            return xbmc.System.Suspend()
        elif action == 'Reboot':
            self.logger.info("Rebooting XBMC")
            return xbmc.System.Reboot()

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def Wake(self, mac='00:01:2e:47:49:76'):
        """ Send WakeOnLan package """
        self.logger.info("Waking up XBMC-System")
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
            return 'Packet send to ' + mac
        except:
            self.logger.error("Unable to send WOL packet")
            return 'Failed to send WOL packet'

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def Notify(self, text):
        """ Create popup in XBMC """
        self.logger.debug("Sending notification to XBMC: " + text)
        xbmc = Server(self.url('/jsonrpc', True))
        return xbmc.GUI.ShowNotification(title='HTPC manager', message=text, image='https://raw.github.com/styxit/HTPC-Manager/master/interfaces/default/img/xbmc-logo.png')

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetRecentMovies(self, limit=5):
        """ Get a list of recently added movies """
        self.logger.debug("Fetching recently added movies")
        try:
            xbmc = Server(self.url('/jsonrpc', True))
            properties = ['title', 'year', 'plot', 'thumbnail', 'file', 'fanart', 'trailer', 'imdbnumber', 'studio', 'genre', 'rating']
            limits = {'start': 0, 'end': int(limit)}
            return xbmc.VideoLibrary.GetRecentlyAddedMovies(properties=properties, limits=limits)
        except:
            self.logger.error("Unable to fetch recently added movies!")
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetRecentShows(self, limit=5):
        """ Get a list of recently added TV Shows """
        self.logger.debug("Fetching recently added TV Shows")
        try:
            xbmc = Server(self.url('/jsonrpc', True))
            properties = ['showtitle', 'season', 'episode', 'title', 'thumbnail', 'plot', 'fanart', 'file']
            limits = {'start': 0, 'end': int(limit)}
            return xbmc.VideoLibrary.GetRecentlyAddedEpisodes(properties=properties, limits=limits)
        except:
            self.logger.error("Unable to fetch recently added TV Shows")
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetRecentAlbums(self, limit=5):
        """ Get a list of recently added music """
        self.logger.debug("Fetching recently added Music")
        try:
            xbmc = Server(self.url('/jsonrpc', True))
            limits = {'start': 0, 'end': int(limit)}
            return xbmc.AudioLibrary.GetRecentlyAddedAlbums(properties=['artist', 'albumlabel', 'year', 'description', 'thumbnail'], limits=limits)
        except:
            self.logger.error("Unable to fetch recently added Music!")
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def Clean(self, lib='video'):
        """ Clean video or audio library """
        self.logger.debug("Cleaning " + lib + "-library")
        xbmc = Server(self.url('/jsonrpc', True))
        if lib == 'video':
            return xbmc.VideoLibrary.Clean()
        elif lib == 'audio':
            return xbmc.AudioLibrary.Clean()

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def Scan(self, lib='video'):
        """ Scan video or audio library for new items """
        self.logger.debug("Scanning " + lib + "-library")
        xbmc = Server(self.url('/jsonrpc', True))
        if lib == 'video':
            return xbmc.VideoLibrary.Scan()
        elif lib == 'audio':
            return xbmc.AudioLibrary.Scan()

    def url(self, path='', auth=False):
        """ Generate a URL for the RPC based on XBMC settings """
        self.logger.debug("Generate URL to call XBMC")
        try:
            server = XbmcServers.selectBy(id=self.current).getOne()
        except SQLObjectNotFound:
            server = XbmcServers.select(limit=1).getOne()
        except SQLObjectNotFound:
            logger.error("Unable to find any XBMC-Servers. Please check your settings")
            return
        url = server.host + ':' + str(server.port) + path
        if auth and server.username and server.password:
            url = server.username + ':' + server.password + '@' + url

        self.logger.debug("URL: http://" + url)
        return 'http://' + url

    def auth(self):
        """ Generate a base64 HTTP auth string based on settings """
        self.logger.debug("Generating authentication string")
        try:
            server = XbmcServers.selectBy(id=self.current).getOne()
        except SQLObjectNotFound:
            server = XbmcServers.select(limit=1).getOne()
        except SQLObjectNotFound:
            return
        if server.username and server.password:
            return base64.encodestring('%s:%s' % (server.username, server.password)).replace('\n', '')

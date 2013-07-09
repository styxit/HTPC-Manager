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
                 'name':'xbmc_name'},
                {'type':'bool',
                 'label':'Enable PVR',
                 'name':'xbmc_enable_pvr'},
                {'type':'bool',
                 'label':'Hide watched',
                 'name':'xbmc_hide_watched'}
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
                 'name':'xbmc_server_password'},
                {'type':'text',
                 'label':'Mac addr.',
                 'name':'xbmc_server_mac'}
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
        return htpc.LOOKUP.get_template('xbmc.html').render(scriptname='xbmc')


    @cherrypy.expose()
    def webinterface(self):
        """ Generate page from template """
        raise cherrypy.HTTPRedirect(self.url('', True))


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
            return xbmc.XBMC.GetInfoLabels(labels=["Network.MacAddress"])
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
                'id': server.id,
                'name': server.name,
                'host': server.host,
                'port': server.port,
                'username': server.username,
                'password': server.password,
                'mac': server.mac
            }
        except SQLObjectNotFound:
            return None

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def server(self, xbmc_server_id, xbmc_server_name, xbmc_server_host, xbmc_server_port,
            xbmc_server_username=None, xbmc_server_password=None, xbmc_server_mac=None):
        """ Create a server if id=0, else update a server """
        if xbmc_server_id == "0":
            self.logger.debug("Creating XBMC-Server in database")
            try:
                XbmcServers(name=xbmc_server_name,
                        host=xbmc_server_host,
                        port=int(xbmc_server_port),
                        username=xbmc_server_username,
                        password=xbmc_server_password,
                        mac=xbmc_server_mac)
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
                server.mac = xbmc_server_mac
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
    def GetMovies(self, start=0, end=0, sortmethod='title', sortorder='ascending', hidewatched=0, filter=''):
        """ Get a list of all movies """
        self.logger.debug("Fetching Movies")
        try:
            xbmc = Server(self.url('/jsonrpc', True))
            sort = {'order': sortorder, 'method': sortmethod, 'ignorearticle': True}
            properties = ['title', 'year', 'plot', 'thumbnail', 'file', 'fanart', 'studio', 'trailer',
                    'imdbnumber', 'genre', 'rating', 'playcount']
            limits = {'start': int(start), 'end': int(end)}
            filter = {'field': 'title', 'operator': 'contains', 'value': filter}
            if hidewatched == "1":
                filter = {"and" : [filter, {'field': 'playcount', 'operator': 'is', 'value': '0'}]}
            return xbmc.VideoLibrary.GetMovies(sort=sort, properties=properties, limits=limits, filter=filter)
        except:
            self.logger.error("Unable to fetch movies!")
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetShows(self, start=0, end=0, sortmethod='title', sortorder='ascending', hidewatched=0, filter=''):
        """ Get a list of all the TV Shows """
        self.logger.debug("Fetching TV Shows")
        try:
            xbmc = Server(self.url('/jsonrpc', True))
            sort = {'order': sortorder, 'method': sortmethod, 'ignorearticle': True}
            properties = ['title', 'year', 'plot', 'thumbnail', 'playcount']
            limits = {'start': int(start), 'end': int(end)}
            filter = {'field': 'title', 'operator': 'contains', 'value': filter}
            if hidewatched == "1":
                filter = {"and" : [filter, {'field': 'playcount', 'operator': 'is', 'value': '0'}]}
            shows = xbmc.VideoLibrary.GetTVShows(sort=sort,properties=properties, limits=limits, filter=filter)
            return shows
        except:
            self.logger.error("Unable to fetch TV Shows")
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetEpisodes(self, start=0, end=0, sortmethod='episode', sortorder='ascending', tvshowid=None, hidewatched=False, filter=''):
        """ Get information about a single TV Show """
        self.logger.debug("Loading information for TVID" + str(tvshowid))
        xbmc = Server(self.url('/jsonrpc', True))
        sort = {'order': sortorder, 'method': sortmethod, 'ignorearticle': True}
        properties = ['episode', 'season', 'thumbnail', 'plot', 'file', 'playcount']
        limits = {'start': int(start), 'end': int(end)}
        filter = {'field': 'title', 'operator': 'contains', 'value': filter}
        if hidewatched == "1":
            filter = {"and": [filter, {'field': 'playcount', 'operator': 'is', 'value': '0'}]}
        episodes = xbmc.VideoLibrary.GetEpisodes(sort=sort, tvshowid=int(tvshowid), properties=properties, limits=limits, filter=filter)
        return episodes

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
    def GetAlbums(self, start=0, end=0, sortmethod='label', sortorder='ascending', filter='', artistid=None):
        """ Get a list of all albums for artist """
        self.logger.debug("Loading all albums for ARTISTID " + str(artistid))
        try:
            xbmc = Server(self.url('/jsonrpc', True))
            sort = {'order': sortorder, 'method': sortmethod, 'ignorearticle': True}
            properties=['artist', 'title', 'year', 'description', 'thumbnail']
            limits = {'start': int(start), 'end': int(end)}
            if artistid is not None:
                filter = {'artistid': int(artistid)}
            else:
                filter = {'or': [
                             {'field': 'album', 'operator': 'contains', 'value': filter},
                             {'field': 'artist', 'operator': 'contains', 'value': filter}
                         ]}
            return xbmc.AudioLibrary.GetAlbums(properties=properties, limits=limits, sort=sort, filter=filter)
        except ValueError:
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetChannelGroups(self, type='tv'):
        """ Get PVR channel list from xbmc """
        self.logger.debug("Loading XBMC PVC channel list.")
        try:
            xbmc = Server(self.url('/jsonrpc', True))
            return xbmc.PVR.GetChannelGroups(channeltype=type)
        except ValueError:
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetChannels(self, type='tv', group=2):
        """ Get PVR channel list from xbmc """
        self.logger.debug("Loading XBMC PVC channel list.")
        try:
            xbmc = Server(self.url('/jsonrpc', True))
            return xbmc.PVR.GetChannels(channelgroupid=int(group), properties=['thumbnail'])
        except:
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def PlayItem(self, item=None, type=None):
        """ Play a file in XBMC """
        xbmc = Server(self.url('/jsonrpc', True))
        self.logger.debug("Playing a file from the type " + type)

        if type == 'movie':
            return xbmc.Player.Open(item={'movieid': int(item)})
        elif type == 'episode':
            return xbmc.Player.Open(item={'episodeid': int(item)})
        elif type == 'channel':
            return xbmc.Player.Open(item={'channelid': int(item)})
        elif type == 'artist':
            return xbmc.Player.Open(item={'artistid': int(item)})
        elif type == 'album':
            return xbmc.Player.Open(item={'albumid': int(item)})
        elif type == 'song':
            return xbmc.Player.Open(item={'songid': int(item)})
        else:
            return xbmc.Player.Open(item={'file': item})

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def QueueItem(self, item, type):
        """ Queue a file in XBMC """
        xbmc = Server(self.url('/jsonrpc', True))
        self.logger.debug("Enqueueing a file from the type " + type)

        if type == 'movie':
            return xbmc.Playlist.Add(playlistid=1, item={'movieid': int(item)})
        elif type == 'episode':
            return xbmc.Playlist.Add(playlistid=1, item={'episodeid': int(item)})
        elif type == 'channel':
            return xbmc.Playlist.Add(playlistid=1, item={'channelid': int(item)})
        elif type == 'artist':
            return xbmc.Playlist.Add(playlistid=0, item={'artistid': int(item)})
        elif type == 'album':
            return xbmc.Playlist.Add(playlistid=0, item={'albumid': int(item)})
        elif type == 'song':
            return xbmc.Playlist.Add(playlistid=0, item={'songid': int(item)})

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def RemoveItem(self, item, playlistid=0):
        """ Remove a file from the playlist """
        xbmc = Server(self.url('/jsonrpc', True))
        self.logger.debug("Removing a file from the playlist")
        return xbmc.Playlist.Remove(playlistid=playlistid, position=int(item))

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def PlaylistMove(self, position1, position2, playlistid=0):
        """ Swap files in playlist """
        playlistid = int(playlistid)
        position1 = int(position1)
        position2 = int(position2)
        i = 1 if position1 < position2 else -1
        xbmc = Server(self.url('/jsonrpc', True))
        while(position1 != position2):
            xbmc.Playlist.Swap(playlistid=playlistid, position1=position1, position2=position1+i)
            position1 += i
        return "Moved from " + str(position1) + " to " + str(position2)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def Playlist(self, type='audio'):
        """ Get a playlist from XBMC """
        self.logger.debug("Loading Playlist of type " + type)
        xbmc = Server(self.url('/jsonrpc', True))
        if type == 'video':
            return xbmc.Playlist.GetItems(playlistid=1, properties=['year', 'showtitle', 'season', 'episode', 'runtime'])

        return xbmc.Playlist.GetItems(playlistid=0, properties=['artist', 'title', 'album', 'duration'])

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def NowPlaying(self):
        """ Get information about current playing item """
        self.logger.debug("Fetching currently playing information")
        try:
            xbmc = Server(self.url('/jsonrpc', True))
            player = xbmc.Player.GetActivePlayers()[0]
            playerid = player['playerid']

            if player['type'] == 'video':
                playerprop = ['speed', 'position', 'time', 'totaltime',
                              'percentage', 'subtitleenabled', 'currentsubtitle',
                              'subtitles', 'currentaudiostream', 'audiostreams']
                itemprop = ['thumbnail', 'showtitle', 'season', 'episode', 'year', 'fanart']

            elif player['type'] == 'audio':
                playerprop = ['speed', 'position', 'time', 'totaltime', 'percentage']
                itemprop = ['thumbnail', 'title', 'artist', 'album', 'year', 'fanart']

            app = xbmc.Application.GetProperties(properties=['muted', 'volume'])
            player = xbmc.Player.GetProperties(playerid=playerid, properties=playerprop)
            item = xbmc.Player.GetItem(playerid=playerid, properties=itemprop)

            return {'playerInfo': player, 'itemInfo': item, 'app': app}
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
            playerid = xbmc.Player.GetActivePlayers()[0][u'playerid']
            try:
                subtitle = int(subtitle)
                xbmc.Player.SetSubtitle(playerid=playerid, subtitle=subtitle, enable=True)
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
            xbmc.System.Shutdown()
            return 'Shutting down XBMC.'
        elif action == 'Suspend':
            self.logger.info("Suspending XBMC")
            xbmc.System.Suspend()
            return 'Suspending XBMC.'
        elif action == 'Reboot':
            self.logger.info("Rebooting XBMC")
            xbmc.System.Reboot()
            return 'Rebooting XBMC.'

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def Wake(self, mac=''):
        """ Send WakeOnLan package """
        self.logger.info("Waking up XBMC-System")
        try:
            server = XbmcServers.selectBy(id=self.current).getOne()
            mac = server.mac
            self.logger.info("WOL: Selecting current server.")
        except SQLObjectNotFound:
            server = XbmcServers.select(limit=1).getOne()
            mac = server.mac
            self.logger.info("WOL: Selecting first server.")
        except SQLObjectNotFound:
            self.logger.info("WOL: Cannot select server.")
            return

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
            self.logger.error("WOL package sent to " + mac)
            return "WakeOnLan package sent"
        except:
            self.logger.error("Unable to send WOL packet")
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def Notify(self, text):
        """ Create popup in XBMC """
        self.logger.debug("Sending notification to XBMC: " + text)
        xbmc = Server(self.url('/jsonrpc', True))
        image='https://raw.github.com/styxit/HTPC-Manager/master/interfaces/default/img/xbmc-logo.png'
        return xbmc.GUI.ShowNotification(title='HTPC manager', message=text, image=image)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetRecentMovies(self, limit=5):
        """ Get a list of recently added movies """
        self.logger.debug("Fetching recently added movies")
        try:
            xbmc = Server(self.url('/jsonrpc', True))
            properties = ['title', 'year', 'runtime', 'plot', 'thumbnail', 'file',
                          'fanart', 'trailer', 'imdbnumber', 'studio', 'genre', 'rating']
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
            properties = ['showtitle', 'season', 'episode', 'title', 'runtime',
                          'thumbnail', 'plot', 'fanart', 'file']
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
            properties = ['artist', 'albumlabel', 'year', 'description', 'thumbnail']
            limits = {'start': 0, 'end': int(limit)}
            return xbmc.AudioLibrary.GetRecentlyAddedAlbums(properties=properties, limits=limits)
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

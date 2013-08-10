""" Module for connecting to XBMC """
import cherrypy
import htpc
import base64
import socket
import struct
from urllib2 import quote
from jsonrpclib import Server
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
            'action': htpc.WEBDIR + 'xbmc/setserver',
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
        server = htpc.settings.get('xbmc_current_server', 0)
        self.changeserver(server)

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
        """ Tests settings, returns MAC address on success and null on fail """
        self.logger.debug("Testing XBMC connectivity")
        try:
            url = xbmc_server_host + ':' + xbmc_server_port
            if xbmc_server_username and xbmc_server_password:
                url = xbmc_server_username + ':' + xbmc_server_password + '@' + url
            xbmc = Server('http://' + url + '/jsonrpc')
            self.logger.debug("Trying to contact xbmc via " + url)
            return xbmc.XBMC.GetInfoLabels(labels=["Network.MacAddress"])
        except Exception, e:
            self.logger.debug("Exception: " + str(e))
            self.logger.error("Unable to contact XBMC via " + url)
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def getserver(self, id=None):
        if id:
            """ Get XBMC server info """
            try:
                server = XbmcServers.selectBy(id=id).getOne()
                return dict((c, getattr(server, c)) for c in server.sqlmeta.columns)
            except SQLObjectNotFound:
                return

        """ Get a list of all servers and the current server """
        servers = []
        for s in XbmcServers.select():
            servers.append({'id': s.id, 'name': s.name})
        if len(servers) < 1:
            return
        try:
            current = self.current.name
        except AttributeError:
            current = None
        return {'current': current, 'servers': servers}

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def setserver(self, xbmc_server_id, xbmc_server_name, xbmc_server_host, xbmc_server_port,
            xbmc_server_username=None, xbmc_server_password=None, xbmc_server_mac=None):
        """ Create a server if id=0, else update a server """
        if xbmc_server_id == "0":
            self.logger.debug("Creating XBMC-Server in database")
            try:
                id = XbmcServers(name=xbmc_server_name,
                        host=xbmc_server_host,
                        port=int(xbmc_server_port),
                        username=xbmc_server_username,
                        password=xbmc_server_password,
                        mac=xbmc_server_mac)
                self.setcurrent(id)
                return 1
            except Exception, e:
                self.logger.debug("Exception: " + str(e))
                self.logger.error("Unable to create XBMC-Server in database")
                return 0
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
                return 1
            except SQLObjectNotFound, e:
                self.logger.error("Unable to update XBMC-Server " + server.name + " in database")
                return 0

    @cherrypy.expose()
    def delserver(self, id):
        """ Delete a server """
        self.logger.debug("Deleting server " + str(id))
        XbmcServers.delete(id)
        self.changeserver()
        return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def changeserver(self, id=0):
        try:
            self.current = XbmcServers.selectBy(id=id).getOne()
            htpc.settings.set('xbmc_current_server', id)
            self.logger.info("Selecting XBMC server: " + id)
            return "success"
        except SQLObjectNotFound:
            try:
                self.current = XbmcServers.select(limit=1).getOne()
                self.logger.error("Invalid server. Selecting first Available.")
                return "success"
            except SQLObjectNotFound:
                self.current = None
                self.logger.warning("No configured XBMC-Servers.")
                return "No valid servers"

    @cherrypy.expose()
    def GetThumb(self, thumb=None, h=None, w=None, o=100):
        """ Parse thumb to get the url and send to htpc.proxy.get_image """
        url = self.url('/images/DefaultVideo.png')
        if thumb:
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
                filter = {"and": [filter, {'field': 'playcount', 'operator': 'is', 'value': '0'}]}
            return xbmc.VideoLibrary.GetMovies(sort=sort, properties=properties, limits=limits, filter=filter)
        except Exception, e:
            self.logger.debug("Exception: " + str(e))
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
                filter = {"and": [filter, {'field': 'playcount', 'operator': 'is', 'value': '0'}]}
            shows = xbmc.VideoLibrary.GetTVShows(sort=sort, properties=properties, limits=limits, filter=filter)
            return shows
        except Exception, e:
            self.logger.debug("Exception: " + str(e))
            self.logger.error("Unable to fetch TV Shows")
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetEpisodes(self, start=0, end=0, sortmethod='episode', sortorder='ascending', tvshowid=None, hidewatched=False, filter=''):
        """ Get information about a single TV Show """
        self.logger.debug("Loading information for TVID" + str(tvshowid))
        try:
            xbmc = Server(self.url('/jsonrpc', True))
            sort = {'order': sortorder, 'method': sortmethod, 'ignorearticle': True}
            properties = ['episode', 'season', 'thumbnail', 'plot', 'file', 'playcount']
            limits = {'start': int(start), 'end': int(end)}
            filter = {'field': 'title', 'operator': 'contains', 'value': filter}
            if hidewatched == "1":
                filter = {"and": [filter, {'field': 'playcount', 'operator': 'is', 'value': '0'}]}
            episodes = xbmc.VideoLibrary.GetEpisodes(sort=sort, tvshowid=int(tvshowid), properties=properties, limits=limits, filter=filter)
            return episodes
        except:
            return

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
        except Exception, e:
            self.logger.debug("Exception: " + str(e))
            self.logger.error("Unable to fetch artists!")
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetAlbums(self, start=0, end=0, sortmethod='label', sortorder='ascending', artistid=None, filter=''):
        """ Get a list of all albums for artist """
        self.logger.debug("Loading all albums for ARTISTID " + str(artistid))
        try:
            xbmc = Server(self.url('/jsonrpc', True))
            sort = {'order': sortorder, 'method': sortmethod, 'ignorearticle': True}
            properties = ['title', 'artist', 'year', 'thumbnail']
            limits = {'start': int(start), 'end': int(end)}
            if artistid:
                filter = {'artistid': int(artistid)}
            else:
                filter = {'or': [{'field': 'album', 'operator': 'contains', 'value': filter},
                                 {'field': 'artist', 'operator': 'contains', 'value': filter}]}
            return xbmc.AudioLibrary.GetAlbums(properties=properties, limits=limits, sort=sort, filter=filter)
        except Exception, e:
            self.logger.debug("Exception: " + str(e))
            self.logger.error("Unable to fetch albums!")
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetSongs(self, start=0, end=0, sortmethod='title', sortorder='ascending', albumid=None, artistid=None, filter='', *args, **kwargs):
        """ Get a list of all songs """
        self.logger.debug("Fetching all artists in the music database")
        try:
            xbmc = Server(self.url('/jsonrpc', True))
            sort = {'order': sortorder, 'method': sortmethod, 'ignorearticle': True}
            properties = ['artist', 'artistid', 'album', 'albumid', 'duration', 'year', 'thumbnail']
            limits = {'start': int(start), 'end': int(end)}
            if albumid and filter == '':
                filter = {'albumid': int(albumid)}
            elif artistid and filter == '':
                filter = {'artistid': int(artistid)}
            else:
                filter = {'or': [{'field': 'album', 'operator': 'contains', 'value': filter},
                                 {'field': 'artist', 'operator': 'contains', 'value': filter},
                                 {'field': 'title', 'operator': 'contains', 'value': filter}]}

            return xbmc.AudioLibrary.GetSongs(properties=properties, limits=limits, sort=sort, filter=filter)
        except Exception, e:
            self.logger.debug("Exception: " + str(e))
            self.logger.error("Unable to fetch artists!")
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetChannelGroups(self, type='tv'):
        """ Get PVR channel list from xbmc """
        self.logger.debug("Loading XBMC PVC channel list.")
        try:
            xbmc = Server(self.url('/jsonrpc', True))
            return xbmc.PVR.GetChannelGroups(channeltype=type)
        except Exception, e:
            self.logger.debug("Exception: " + str(e))
            self.logger.error("Unable to fetch channelgroups!")
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetChannels(self, type='tv', group=2):
        """ Get PVR channel list from xbmc """
        self.logger.debug("Loading XBMC PVC channel list.")
        try:
            xbmc = Server(self.url('/jsonrpc', True))
            return xbmc.PVR.GetChannels(channelgroupid=int(group), properties=['thumbnail'])
        except Exception, e:
            self.logger.debug("Exception: " + str(e))
            self.logger.error("Unable to fetch channels!")
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def PlayItem(self, item=None, type=None):
        """ Play a file in XBMC """
        self.logger.debug("Playing '" + item + "' of the type " + type)
        xbmc = Server(self.url('/jsonrpc', True))
        if type == 'movie':
            return xbmc.Player.Open(item={'movieid': int(item)}, options={'resume': True})
        elif type == 'episode':
            return xbmc.Player.Open(item={'episodeid': int(item)}, options={'resume': True})
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
        self.logger.debug("Enqueueing '" + item + "' of the type " + type)
        xbmc = Server(self.url('/jsonrpc', True))
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
        self.logger.debug("Removing '" + item + "' from the playlist")
        xbmc = Server(self.url('/jsonrpc', True))
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
            xbmc.Playlist.Swap(playlistid=playlistid, position1=position1, position2=position1 + i)
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
        except IndexError:
            self.logger.debug("Nothing current playing.")
            return
        except Exception, e:
            self.logger.debug("Exception: " + str(e))
            self.logger.error("Unable to fetch currently playing information!")
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def ControlPlayer(self, action, value=''):
        """ Various commands to control XBMC Player """
        self.logger.debug("Sending control to XBMC: " + action)
        try:
            xbmc = Server(self.url('/jsonrpc', True))
            if action == 'seek':
                player = xbmc.Player.GetActivePlayers()[0]
                return xbmc.Player.Seek(playerid=player[u'playerid'], value=float(value))
            elif action == 'jump':
                player = xbmc.Player.GetActivePlayers()[0]
                return xbmc.Player.GoTo(playerid=player[u'playerid'], to=int(value))
            elif action == 'party':
                return xbmc.Player.Open(item={'partymode': 'audio'})
            else:
                return xbmc.Input.ExecuteAction(action=action)
        except Exception, e:
            self.logger.debug("Exception: " + str(e))
            self.logger.error("Unable to control XBMC with action: " + action)
            return 'error'

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def SendText(self, text):
        """ Send text to XBMC """
        self.logger.debug("Sending text to XBMC: " + text)
        xbmc = Server(self.url('/jsonrpc', True))
        return xbmc.Input.SendText(text=text)

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
                return "success"
            except ValueError:
                xbmc.Player.SetSubtitle(playerid=playerid, subtitle='off')
                return "Disabling subtitles."
        except Exception, e:
            self.logger.debug("Exception: " + str(e))
            self.logger.error("Unable to set subtitle to specified value " + subtitle)
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def Audio(self, audio):
        """ Change the audio stream  """
        self.logger.debug("Chaning audio stream to " + audio)
        try:
            xbmc = Server(self.url('/jsonrpc', True))
            playerid = xbmc.Player.GetActivePlayers()[0][u'playerid']
            return xbmc.Player.SetAudioStream(playerid=playerid, stream=int(audio))
        except Exception, e:
            self.logger.debug("Exception: " + str(e))
            self.logger.error("Unable to change audio stream to specified value " + audio)
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
    def Wake(self):
        """ Send WakeOnLan package """
        self.logger.info("Waking up XBMC-System")
        try:
            addr_byte = self.current.mac.split(':')
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
            self.logger.info("WOL package sent to " + self.current.mac)
            return "WOL package sent"
        except Exception, e:
            self.logger.debug("Exception: " + str(e))
            self.logger.error("Unable to send WOL packet")
            return "Unable to send WOL packet"

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def Notify(self, text):
        """ Create popup in XBMC """
        self.logger.debug("Sending notification to XBMC: " + text)
        xbmc = Server(self.url('/jsonrpc', True))
        image = 'https://raw.github.com/styxit/HTPC-Manager/master/interfaces/default/img/xbmc-logo.png'
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
        except Exception, e:
            self.logger.debug("Exception: " + str(e))
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
        except Exception, e:
            self.logger.debug("Exception: " + str(e))
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
        except Exception, e:
            self.logger.debug("Exception: " + str(e))
            self.logger.error("Unable to fetch recently added Music!")
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def Library(self, do='scan', lib='video'):
        xbmc = Server(self.url('/jsonrpc', True))
        if lib == 'video':
            if do == 'clean':
                return xbmc.VideoLibrary.Clean()
            else:
                return xbmc.VideoLibrary.Scan()
        else:
            if do == 'clean':
                return xbmc.AudioLibrary.Clean()
            else:
                return xbmc.AudioLibrary.Scan()

    def url(self, path='', auth=False):
        """ Generate a URL for the RPC based on XBMC settings """
        self.logger.debug("Generate URL to call XBMC")
        url = self.current.host + ':' + str(self.current.port) + path
        if auth and self.current.username and self.current.password:
            url = self.current.username + ':' + self.current.password + '@' + url

        self.logger.debug("URL: http://" + url)
        return 'http://' + url

    def auth(self):
        """ Generate a base64 HTTP auth string based on settings """
        self.logger.debug("Generating authentication string")
        if self.current.username and self.current.password:
            return base64.encodestring('%s:%s' % (self.current.username, self.current.password)).strip('\n')

#!/usr/bin/env python
# -*- coding: utf-8 -*-

""" Module for connecting to kodi """
import cherrypy
import htpc
import base64
import socket
import struct
from urllib2 import quote
from jsonrpclib import Server
from sqlobject import SQLObject, SQLObjectNotFound
from sqlobject.col import StringCol, IntCol
from htpc.helpers import get_image, cachedprime
import logging
from cherrypy.lib.auth2 import require, member_of
import os
import hashlib


class KodiServers(SQLObject):
    """ SQLObject class for kodi_servers table """
    name = StringCol()
    host = StringCol()
    port = IntCol()
    username = StringCol(default=None)
    password = StringCol(default=None)
    mac = StringCol(default=None)

    class sqlmeta(object):
        fromDatabase = True


class Kodi(object):
    def __init__(self):
        """ Add module to list of modules on load and set required settings """
        self.logger = logging.getLogger('modules.kodi')

        KodiServers.createTable(ifNotExists=True)
        try:
            KodiServers.sqlmeta.addColumn(IntCol('starterport'), changeSchema=True)
        except:
            # Will always raise if column exist
            pass

        htpc.MODULES.append({
            'name': 'Kodi',
            'id': 'kodi',
            'fields': [
                {'type': 'bool',
                 'label': 'Enable',
                 'name': 'kodi_enable'},
                {'type': 'text',
                 'label': 'Menu name',
                 'name': 'kodi_name'},
                {'type': 'bool',
                 'label': 'Enable PVR',
                 'name': 'kodi_enable_pvr'},
                {'type': 'bool',
                 'label': 'Hide watched',
                 'name': 'kodi_hide_watched'}
            ]
        })

        htpc.MODULES.append({
            'name': 'Kodi Servers',
            'id': 'kodi_update_server',
            'action': htpc.WEBDIR + 'kodi/setserver',
            'test': htpc.WEBDIR + 'kodi/ping',
            'fields': [
                {'type': 'select',
                 'label': 'Server',
                 'name': 'kodi_server_id',
                 'options': [
                    {'name': 'New', 'value': 0}
                    ]
                },
                {'type': 'text',
                 'label': 'Name',
                 'name': 'kodi_server_name'},
                {'type': 'text',
                 'label': 'IP / Host',
                 'placeholder': 'localhost',
                 'name': 'kodi_server_host'},
                {'type': 'text',
                 'label': 'Port',
                 'placeholder': '8080',
                 'name': 'kodi_server_port'},
                {'type': 'text',
                 'label': 'Username',
                 'name': 'kodi_server_username'},
                {'type': 'password',
                 'label': 'Password',
                 'name': 'kodi_server_password'},
                {'type': 'text',
                 'label': 'Mac addr.',
                 'name': 'kodi_server_mac'},
                {'type': 'text',
                 'label': 'XBMC Starter port',
                 'placeholder': '9',
                 'name': 'kodi_server_starterport'}
            ]
        })
        server = htpc.settings.get('kodi_current_server', 0)
        self.changeserver(server)

    @cherrypy.expose()
    @require()
    def index(self):
        """ Generate page from template """
        return htpc.LOOKUP.get_template('kodi.html').render(scriptname='kodi')

    @cherrypy.expose()
    @require()
    def webinterface(self):
        """ Generate page from template """
        raise cherrypy.HTTPRedirect(self.url('', True))

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    @require(member_of(htpc.role_admin))
    def primecache(self, t='all', wanted_art='all', async=True, resize=True):
        ''' find all images and cache them, might take a while...'''
        kodi = Server(self.url('/jsonrpc', True))
        url = self.url('/image/')
        # fix headers
        _head = 'Basic %s' % self.auth()
        headers = {'Authorization': _head}

        musicprop = ['fanart', 'thumbnail']
        itemprop = ['art', 'fanart', 'thumbnail']
        addonprop = ['thumbnail']
        stuff = []

        if t == 'all':
            movie = kodi.VideoLibrary.GetMovies(properties=itemprop)
            episode = kodi.VideoLibrary.GetEpisodes(properties=itemprop)
            artist = kodi.AudioLibrary.GetArtists(properties=musicprop)
            song = kodi.AudioLibrary.GetSongs(properties=musicprop)
            tvshow = kodi.VideoLibrary.GetTVShows(properties=itemprop)
            stuff = [movie, episode, artist, song, tvshow]
        elif t == 'movie':
            movie = kodi.VideoLibrary.GetMovies(properties=itemprop)
            stuff.append(movie)
        elif t == 'episode':
            episode = kodi.VideoLibrary.GetEpisodes(properties=itemprop)
            stuff.append(episode)
        elif t == 'song':
            song = kodi.AudioLibrary.GetSongs(properties=musicprop)
            stuff.append(song)
        elif t == 'tvshow':
            tvshow = kodi.VideoLibrary.GetTVShows(properties=itemprop)
            stuff.append(tvshow)
        elif t == 'addon':
            addon = kodi.Addons.GetAddons(content='unknown', enabled='all', properties=addonprop)
            stuff.append(addon)

        imgdir = os.path.join(htpc.DATADIR, 'images/')

        imglist = []

        self.logger.debug('Fetching every image we can find from kodi')  # todo add addon images

        resize_sizes = [[225, 338], [200, 300], [675, 400], [100, 150], [375, 210], [150, 150]]

        for item in stuff:
            for k, v in item.items():
                if k in ['episodes', 'movies', 'tvshows', 'songs', 'artists', 'addons']:
                    self.logger.debug('There where %s %s' % (len(item[k]), k))
                    for kk in item[k]:
                        for kkk, vvv, in kk.items():
                            d = {}
                            if kkk == wanted_art or wanted_art == 'all':
                                if kkk == 'art':
                                    for z, a in kk['art'].items():
                                        if z == wanted_art or wanted_art == 'all':
                                            _url = url + quote(a)
                                            h = hashlib.md5(_url).hexdigest()
                                            d['fp'] = os.path.join(imgdir, h)
                                            d['hash'] = h
                                            d['url'] = _url
                                            d['resize'] = resize_sizes
                                            imglist.append(d)

                                if kkk in ['fanart', 'thumbnail']:
                                    _url = url + quote(vvv)
                                    h = hashlib.md5(_url).hexdigest()
                                    d['fp'] = os.path.join(imgdir, h)
                                    d['hash'] = h
                                    d['url'] = _url
                                    d['resize'] = resize_sizes
                                    imglist.append(d)

        self.logger.debug('Found %s images in total' % len(imglist))

        try:
            if async:
                t = cachedprime(imglist, headers, resize=bool(resize))
                return t

        except Exception as e:
            self.logger.debug('%s' % e)

    @cherrypy.expose()
    @require(member_of(htpc.role_admin))
    @cherrypy.tools.json_out()
    def ping(self, kodi_server_host='', kodi_server_port='',
             kodi_server_username='', kodi_server_password='', **kwargs):
        """ Tests settings, returns MAC address on success and null on fail """
        self.logger.debug("Testing kodi connectivity")
        try:
            url = kodi_server_host + ':' + kodi_server_port
            if kodi_server_username and kodi_server_password:
                url = kodi_server_username + ':' + kodi_server_password + '@' + url
            kodi = Server('http://' + url + '/jsonrpc')
            self.logger.debug("Trying to contact kodi via %s" % url)
            return kodi.XBMC.GetInfoLabels(labels=["Network.MacAddress"])
        except Exception, e:
            self.logger.exception(e)
            self.logger.error("Unable to contact kodi via %s", url)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def getserver(self, id=None):
        if id:
            """ Get kodi server info """
            try:
                server = KodiServers.selectBy(id=id).getOne()
                return dict((c, getattr(server, c)) for c in server.sqlmeta.columns)
            except SQLObjectNotFound:
                return

        """ Get a list of all servers and the current server """
        servers = []
        for s in KodiServers.select():
            servers.append({'id': s.id, 'name': s.name})
        if not servers:
            return
        try:
            current = self.current.name
        except AttributeError:
            current = None
        return {'current': current, 'servers': servers}

    @cherrypy.expose()
    @require(member_of(htpc.role_admin))
    @cherrypy.tools.json_out()
    def setserver(self, kodi_server_id, kodi_server_name, kodi_server_host, kodi_server_port,
                  kodi_server_username=None, kodi_server_password=None, kodi_server_mac=None, kodi_server_starterport=''):
        """ Create a server if id=0, else update a server """
        if kodi_server_starterport == '':
            kodi_server_starterport = None
        else:
            kodi_server_starterport = int(kodi_server_starterport)
        if kodi_server_id == "0":
            self.logger.debug("Creating kodi-Server in database")
            try:
                server = KodiServers(name=kodi_server_name,
                                     host=kodi_server_host,
                                     port=int(kodi_server_port),
                                     username=kodi_server_username,
                                     password=kodi_server_password,
                                     mac=kodi_server_mac,
                                     starterport=kodi_server_starterport)

                self.changeserver(server.id)
                htpc.BLACKLISTWORDS.append(kodi_server_password)
                return 1
            except Exception, e:
                self.logger.debug("Exception: " + str(e))
                self.logger.error("Unable to create kodi-Server in database")
                return 0
        else:
            self.logger.debug("Updating kodi-Server " + kodi_server_name + " in database")
            try:
                server = KodiServers.selectBy(id=kodi_server_id).getOne()
                server.name = kodi_server_name
                server.host = kodi_server_host
                server.port = int(kodi_server_port)
                server.username = kodi_server_username
                server.password = kodi_server_password
                server.mac = kodi_server_mac
                server.starterport = kodi_server_starterport
                return 1
            except SQLObjectNotFound, e:
                self.logger.error("Unable to update kodi-Server " + server.name + " in database")
                return 0

    @cherrypy.expose()
    @require(member_of(htpc.role_admin))
    def delserver(self, id):
        """ Delete a server """
        self.logger.debug("Deleting server " + str(id))
        KodiServers.delete(id)
        self.changeserver()
        return

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def changeserver(self, id=0):
        try:
            self.current = KodiServers.selectBy(id=id).getOne()
            htpc.settings.set('kodi_current_server', str(id))
            self.logger.info("Selecting kodi server: %s", id)
            return "success"
        except SQLObjectNotFound:
            try:
                self.current = KodiServers.select(limit=1).getOne()
                self.logger.error("Invalid server. Selecting first Available.")
                return "success"
            except SQLObjectNotFound:
                self.current = None
                self.logger.warning("No configured kodi-Servers.")
                return "No valid servers"

    @cherrypy.expose()
    @require()
    def GetThumb(self, thumb=None, h=None, w=None, o=100, mode=None):
        """ Parse thumb to get the url and send to htpc.proxy.get_image """
        url = self.url('/images/DefaultVideo.png')
        if thumb:
            url = self.url('/image/' + quote(thumb))
        self.logger.debug("Trying to fetch image via %s" % url)
        return get_image(url, h, w, o, mode, self.auth())

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetMovies(self, start=0, end=0, sortmethod='title', sortorder='ascending', hidewatched=0, filter=''):
        """ Get a list of all movies """
        self.logger.debug("Fetching Movies")
        try:
            kodi = Server(self.url('/jsonrpc', True))
            sort = {'order': sortorder, 'method': sortmethod, 'ignorearticle': True}
            properties = ['title', 'year', 'plot', 'thumbnail', 'file', 'fanart', 'studio', 'trailer',
                          'imdbnumber', 'genre', 'rating', 'playcount']
            limits = {'start': int(start), 'end': int(end)}
            filter = {'field': 'title', 'operator': 'contains', 'value': filter}
            if hidewatched == "1":
                filter = {"and": [filter, {'field': 'playcount', 'operator': 'is', 'value': '0'}]}
            return kodi.VideoLibrary.GetMovies(sort=sort, properties=properties, limits=limits, filter=filter)
        except Exception, e:
            self.logger.exception(e)
            self.logger.error("Unable to fetch movies!")
            return

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetShows(self, start=0, end=0, sortmethod='title', sortorder='ascending', hidewatched=0, filter=''):
        """ Get a list of all the TV Shows """
        self.logger.debug("Fetching TV Shows")
        try:
            kodi = Server(self.url('/jsonrpc', True))
            sort = {'order': sortorder, 'method': sortmethod, 'ignorearticle': True}
            properties = ['title', 'year', 'plot', 'thumbnail', 'playcount']
            limits = {'start': int(start), 'end': int(end)}
            filter = {'field': 'title', 'operator': 'contains', 'value': filter}
            if hidewatched == "1":
                filter = {"and": [filter, {'field': 'playcount', 'operator': 'is', 'value': '0'}]}
            shows = kodi.VideoLibrary.GetTVShows(sort=sort, properties=properties, limits=limits, filter=filter)
            return shows
        except Exception, e:
            self.logger.exception(e)
            self.logger.error("Unable to fetch TV Shows")
            return

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetEpisodes(self, start=0, end=0, sortmethod='episode', sortorder='ascending', tvshowid=None, hidewatched=False, filter=''):
        """ Get information about a single TV Show """
        self.logger.debug("Loading information for TVID %s", str(tvshowid))
        try:
            kodi = Server(self.url('/jsonrpc', True))
            sort = {'order': sortorder, 'method': sortmethod, 'ignorearticle': True}
            properties = ['episode', 'season', 'thumbnail', 'plot', 'file', 'playcount']
            limits = {'start': int(start), 'end': int(end)}
            filter = {'field': 'title', 'operator': 'contains', 'value': filter}
            if hidewatched == "1":
                filter = {"and": [filter, {'field': 'playcount', 'operator': 'is', 'value': '0'}]}
            episodes = kodi.VideoLibrary.GetEpisodes(sort=sort, tvshowid=int(tvshowid), properties=properties, limits=limits, filter=filter)
            return episodes
        except:
            return

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetArtists(self, start=0, end=0, sortmethod='artist', sortorder='ascending', filter=''):
        """ Get a list of all artists """
        self.logger.debug("Fetching all artists in the music database")
        try:
            kodi = Server(self.url('/jsonrpc', True))
            sort = {'order': sortorder, 'method': sortmethod, 'ignorearticle': True}
            properties = ['thumbnail', 'fanart']
            limits = {'start': int(start), 'end': int(end)}
            filter = {'field': 'artist', 'operator': 'contains', 'value': filter}
            return kodi.AudioLibrary.GetArtists(properties=properties, limits=limits, sort=sort, filter=filter)
        except Exception, e:
            self.logger.exception(e)
            self.logger.error("Unable to fetch artists!")
            return

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetAlbums(self, start=0, end=0, sortmethod='label', sortorder='ascending', artistid=None, filter=''):
        """ Get a list of all albums for artist """
        self.logger.debug("Loading all albums for ARTISTID %s", str(artistid))
        try:
            kodi = Server(self.url('/jsonrpc', True))
            sort = {'order': sortorder, 'method': sortmethod, 'ignorearticle': True}
            properties = ['title', 'artist', 'year', 'thumbnail']
            limits = {'start': int(start), 'end': int(end)}
            if artistid:
                filter = {'artistid': int(artistid)}
            else:
                filter = {'or': [{'field': 'album', 'operator': 'contains', 'value': filter},
                                 {'field': 'artist', 'operator': 'contains', 'value': filter}]}
            return kodi.AudioLibrary.GetAlbums(properties=properties, limits=limits, sort=sort, filter=filter)
        except Exception, e:
            self.logger.debug("Exception: %s", str(e))
            self.logger.error("Unable to fetch albums!")
            return

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetSongs(self, start=0, end=0, sortmethod='title', sortorder='ascending', albumid=None, artistid=None, filter='', *args, **kwargs):
        """ Get a list of all songs """
        self.logger.debug("Fetching all artists in the music database")
        try:
            kodi = Server(self.url('/jsonrpc', True))
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

            return kodi.AudioLibrary.GetSongs(properties=properties, limits=limits, sort=sort, filter=filter)
        except Exception, e:
            self.logger.exception(e)
            self.logger.error("Unable to fetch artists!")
            return

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetChannelGroups(self, type='tv'):
        """ Get PVR channel list from kodi """
        self.logger.debug("Loading kodi PVC channel list.")
        try:
            kodi = Server(self.url('/jsonrpc', True))
            return kodi.PVR.GetChannelGroups(channeltype=type)
        except Exception, e:
            self.logger.exception(e)
            self.logger.error("Unable to fetch channelgroups!")
            return

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetChannels(self, type='tv', group=2):
        """ Get PVR channel list from kodi """
        self.logger.debug("Loading kodi PVC channel list.")
        try:
            kodi = Server(self.url('/jsonrpc', True))
            return kodi.PVR.GetChannels(channelgroupid=int(group), properties=['thumbnail'])
        except Exception, e:
            self.logger.exception(e)
            self.logger.error("Unable to fetch channels!")
            return

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def ExecuteAddon(self, addon, cmd0='', cmd1=''):
        if cmd0 == 'undefined':
            cmd0 = ''
        # cmd0 is a parameter to the addon, usual a input of some kind
        if cmd1 == 'undefined':
            cmd1 = ''
        """ Execute an kodi addon """
        self.logger.debug('Execute %s with commands cmd0 %s and cmd1 %s' % (addon, cmd0, cmd1))
        kodi = Server(self.url('/jsonrpc', True))
        if addon == 'script.artwork.downloader':
            return kodi.Addons.ExecuteAddon(addonid=addon, params=['tvshow', 'movie', 'musicvideos'])
        elif addon == 'script.cinema.experience':
            cmd = 'movieid=' + int(cmd0)
            return kodi.Addons.ExecuteAddon(addon, cmd)
        elif addon == 'plugin.video.youtube':
            cmd = 'action=play_video&videoid=' + cmd0
            return kodi.Addons.ExecuteAddon(addon, cmd)
        elif addon == 'script.cdartmanager':
            return kodi.Addons.ExecuteAddon('addonid=' + addon, cmd0)
        elif addon == 'plugin.video.twitch':
            if cmd0:  # If search
                return kodi.Addons.ExecuteAddon(addon, '/searchresults/'+ cmd0 + '/0' )
            else:  # Open plugin
                return kodi.Addons.ExecuteAddon(addon, '/')
        elif addon == 'plugin.video.nrk':
            if cmd0:
                # Does not work in kodi or via this one, think its a addon problem
                cmd = '/search/%s/1' % cmd0
                return kodi.Addons.ExecuteAddon(addon, cmd)
            else:
                return kodi.Addons.ExeceuteAddon(addonid=addon)
        elif addon == 'script.globalsearch':
            kodi.Addons.ExecuteAddon(addon, '/searchstring/'+ cmd0)
            return kodi.Input.SendText(text=cmd0)
        else:
            return kodi.Addons.ExecuteAddon(addonid=addon)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def Enable_DisableAddon(self, addonid=None, enabled=None):
        kodi = Server(self.url('/jsonrpc', True))
        return kodi.Addons.SetAddonEnabled(addonid=addonid, enabled=bool(int(enabled)))

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetAddons(self):
        kodi = Server(self.url('/jsonrpc', True))
        prop = ['name', 'thumbnail', 'description', 'author', 'version', 'enabled', 'rating', 'summary']
        addons = kodi.Addons.GetAddons(content='unknown', enabled='all', properties=prop)['addons']
        return addons

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def PlayItem(self, item=None, type=None):
        """ Play a file in kodi """
        self.logger.debug("Playing '%s' of the type %s", item, type)
        kodi = Server(self.url('/jsonrpc', True))
        if type == 'movie':
            return kodi.Player.Open(item={'movieid': int(item)}, options={'resume': True})
        elif type == 'episode':
            return kodi.Player.Open(item={'episodeid': int(item)}, options={'resume': True})
        elif type == 'channel':
            return kodi.Player.Open(item={'channelid': int(item)})
        elif type == 'artist':
            return kodi.Player.Open(item={'artistid': int(item)})
        elif type == 'album':
            return kodi.Player.Open(item={'albumid': int(item)})
        elif type == 'song':
            return kodi.Player.Open(item={'songid': int(item)})
        else:
            return kodi.Player.Open(item={'file': item})

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def QueueItem(self, item, type):
        """ Queue a file in kodi """
        self.logger.debug("Enqueueing '%s' of the type %s", item, type)
        kodi = Server(self.url('/jsonrpc', True))
        if type == 'movie':
            return kodi.Playlist.Add(playlistid=1, item={'movieid': int(item)})
        elif type == 'episode':
            return kodi.Playlist.Add(playlistid=1, item={'episodeid': int(item)})
        elif type == 'channel':
            return kodi.Playlist.Add(playlistid=1, item={'channelid': int(item)})
        elif type == 'artist':
            return kodi.Playlist.Add(playlistid=0, item={'artistid': int(item)})
        elif type == 'album':
            return kodi.Playlist.Add(playlistid=0, item={'albumid': int(item)})
        elif type == 'song':
            return kodi.Playlist.Add(playlistid=0, item={'songid': int(item)})

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def RemoveItem(self, item, playlistid=0):
        """ Remove a file from the playlist """
        self.logger.debug("Removing '%s' from the playlist", item)
        kodi = Server(self.url('/jsonrpc', True))
        return kodi.Playlist.Remove(playlistid=playlistid, position=int(item))

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def PlaylistMove(self, position1, position2, playlistid=0):
        """ Swap files in playlist """
        playlistid = int(playlistid)
        position1 = int(position1)
        position2 = int(position2)
        i = 1 if position1 < position2 else -1
        kodi = Server(self.url('/jsonrpc', True))
        while(position1 != position2):
            kodi.Playlist.Swap(playlistid=playlistid, position1=position1, position2=position1 + i)
            position1 += i
        return "Moved from " + str(position1) + " to " + str(position2)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Playlist(self, type='audio'):
        """ Get a playlist from kodi """
        self.logger.debug("Loading Playlist of type %s", type)
        kodi = Server(self.url('/jsonrpc', True))
        if type == 'video':
            return kodi.Playlist.GetItems(playlistid=1, properties=['year', 'showtitle', 'season', 'episode', 'runtime'])

        return kodi.Playlist.GetItems(playlistid=0, properties=['artist', 'title', 'album', 'duration'])

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def NowPlaying(self):
        """ Get information about current playing item """
        self.logger.debug("Fetching currently playing information")
        try:
            kodi = Server(self.url('/jsonrpc', True))
            player = kodi.Player.GetActivePlayers()[0]
            playerid = player['playerid']

            if player['type'] == 'video':
                playerprop = ['speed', 'position', 'time', 'totaltime',
                              'percentage', 'subtitleenabled', 'currentsubtitle',
                              'subtitles', 'currentaudiostream', 'audiostreams']

                itemprop = ['title', 'season', 'episode', 'duration', 'showtitle',
                            'fanart', 'tvshowid', 'plot', 'thumbnail', 'year']

            elif player['type'] == 'audio':
                playerprop = ['speed', 'position', 'time', 'totaltime', 'percentage']
                itemprop = ['title', 'duration', 'fanart', 'artist', 'albumartist', 'album', 'track', 'artistid', 'albumid', 'thumbnail', 'year']

            app = kodi.Application.GetProperties(properties=['muted', 'volume'])
            player = kodi.Player.GetProperties(playerid=playerid, properties=playerprop)
            item = kodi.Player.GetItem(playerid=playerid, properties=itemprop)

            return {'playerInfo': player, 'itemInfo': item, 'app': app}
        except IndexError:
            return
        except Exception, e:
            self.logger.exception(e)
            self.logger.error("Unable to fetch currently playing information!")
            return

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def ControlPlayer(self, action, value=''):
        """ Various commands to control kodi Player """
        self.logger.debug("Sending control to kodi %s", action)
        try:
            kodi = Server(self.url('/jsonrpc', True))
            if action == 'seek':
                player = kodi.Player.GetActivePlayers()[0]
                return kodi.Player.Seek(playerid=player[u'playerid'], value=float(value))
            elif action == 'jump':
                player = kodi.Player.GetActivePlayers()[0]
                return kodi.Player.GoTo(playerid=player[u'playerid'], to=int(value))
            elif action == 'party':
                return kodi.Player.Open(item={'partymode': 'audio'})
            elif action == 'getsub':
                try:
                    # Frodo
                    return kodi.Addons.ExecuteAddon(addonid='script.kodi.subtitles')
                except:
                    pass
                try:
                    # Gotham
                    return kodi.GUI.ActivateWindow(window='subtitlesearch')
                except:
                    pass
            elif action == 'volume':
                return kodi.Application.SetVolume(volume=int(value))
            else:
                return kodi.Input.ExecuteAction(action=action)
        except Exception, e:
            self.logger.exception(e)
            self.logger.error("Unable to control kodi with action: %s", action)
            return 'error'

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def SendText(self, text):
        """ Send text to kodi """
        self.logger.debug("Sending text to kodi: %s", text)
        kodi = Server(self.url('/jsonrpc', True))
        return kodi.Input.SendText(text=text)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Subtitles(self, subtitle='off'):
        """ Change the subtitles """
        self.logger.debug("Changing subtitles to %s", subtitle)
        try:
            kodi = Server(self.url('/jsonrpc', True))
            playerid = kodi.Player.GetActivePlayers()[0][u'playerid']
            try:
                subtitle = int(subtitle)
                kodi.Player.SetSubtitle(playerid=playerid, subtitle=subtitle, enable=True)
                return "success"
            except ValueError:
                kodi.Player.SetSubtitle(playerid=playerid, subtitle='off')
                return "Disabling subtitles."
        except Exception, e:
            self.logger.exception(e)
            self.logger.error("Unable to set subtitle to specified value %s", subtitle)
            return

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Audio(self, audio):
        """ Change the audio stream  """
        self.logger.debug("Chaning audio stream to %s", audio)
        try:
            kodi = Server(self.url('/jsonrpc', True))
            playerid = kodi.Player.GetActivePlayers()[0][u'playerid']
            return kodi.Player.SetAudioStream(playerid=playerid, stream=int(audio))
        except Exception, e:
            self.logger.exception(e)
            self.logger.error("Unable to change audio stream to specified value %s", audio)
            return

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def System(self, action=''):
        """ Various system commands """
        kodi = Server(self.url('/jsonrpc', True))
        if action == 'Quit':
            self.logger.info("Exiting kodi")
            kodi.Application.Quit()
            return 'Exiting kodi.'
        if action == 'Shutdown':
            self.logger.info("Shutting down kodi")
            kodi.System.Shutdown()
            return 'Shutting down kodi.'
        elif action == 'Suspend':
            self.logger.info("Suspending kodi")
            kodi.System.Suspend()
            return 'Suspending kodi.'
        elif action == 'Reboot':
            self.logger.info("Rebooting kodi")
            kodi.System.Reboot()
            return 'Rebooting kodi.'

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def Wake(self):
        """ Send WakeOnLan package """
        self.logger.info("Waking up kodi-System")
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
            self.logger.info("WOL package sent to %s", self.current.mac)
            return "WOL package sent"
        except Exception, e:
            self.logger.exception(e)
            self.logger.error("Unable to send WOL packet")
            return "Unable to send WOL packet"

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def Run(self):
        """ Send XBMC Starter packet """
        self.logger.info("Sending XBMC Starter packet")
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.sendto("YatseStart-Xbmc", (self.current.host, self.current.starterport))
            self.logger.info("XBMC Starter package sent to %s:%s", self.current.host, self.current.starterport)
            return "XBMC Starter packet sent"
        except Exception, e:
            self.logger.exception(e)
            self.logger.error("Unable to send XBMC Starter packet")
            self.logger.debug('Have you installed http://yatse.leetzone.org/redmine/projects/androidwidget/wiki/XbmcStarter?')
            return "Unable to send XBMC Starter packet"

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Notify(self, text):
        """ Create popup in kodi """
        self.logger.debug("Sending notification to kodi: %s" % text)
        kodi = Server(self.url('/jsonrpc', True))
        image = '../interfaces/default/img/kodi-logo.png'
        return kodi.GUI.ShowNotification(title='HTPC manager', message=text, image=image)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetRecentMovies(self, limit=5):
        """ Get a list of recently added movies """
        self.logger.debug("Fetching recently added movies")
        try:
            kodi = Server(self.url('/jsonrpc', True))
            properties = ['title', 'year', 'runtime', 'plot', 'thumbnail', 'file',
                          'fanart', 'trailer', 'imdbnumber', 'studio', 'genre', 'rating']
            limits = {'start': 0, 'end': int(limit)}
            return kodi.VideoLibrary.GetRecentlyAddedMovies(properties=properties, limits=limits)
        except Exception, e:
            self.logger.exception(e)
            self.logger.error("Unable to fetch recently added movies!")
            return

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetRecentShows(self, limit=5):
        """ Get a list of recently added TV Shows """
        self.logger.debug("Fetching recently added TV Shows")
        try:
            kodi = Server(self.url('/jsonrpc', True))
            properties = ['showtitle', 'season', 'episode', 'title', 'runtime',
                          'thumbnail', 'plot', 'fanart', 'file']
            limits = {'start': 0, 'end': int(limit)}
            return kodi.VideoLibrary.GetRecentlyAddedEpisodes(properties=properties, limits=limits)
        except Exception, e:
            self.logger.exception(e)
            self.logger.error("Unable to fetch recently added TV Shows")
            return

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetRecentAlbums(self, limit=5):
        """ Get a list of recently added music """
        self.logger.debug("Fetching recently added Music")
        try:
            kodi = Server(self.url('/jsonrpc', True))
            properties = ['artist', 'albumlabel', 'year', 'description', 'thumbnail']
            limits = {'start': 0, 'end': int(limit)}
            return kodi.AudioLibrary.GetRecentlyAddedAlbums(properties=properties, limits=limits)
        except Exception, e:
            self.logger.exception(e)
            self.logger.error("Unable to fetch recently added Music!")
            return

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Library(self, do='scan', lib='video'):
        kodi = Server(self.url('/jsonrpc', True))
        if lib == 'video':
            if do == 'clean':
                return kodi.VideoLibrary.Clean()
            else:
                return kodi.VideoLibrary.Scan()
        else:
            if do == 'clean':
                return kodi.AudioLibrary.Clean()
            else:
                return kodi.AudioLibrary.Scan()

    def url(self, path='', auth=False):
        """ Generate a URL for the RPC based on kodi settings """
        url = self.current.host + ':' + str(self.current.port) + path
        if auth and self.current.username and self.current.password:
            url = self.current.username + ':' + self.current.password + '@' + url

        self.logger.debug("URL: http://%s" % url)
        return 'http://' + url

    def auth(self):
        """ Generate a base64 HTTP auth string based on settings """
        if self.current.username and self.current.password:
            return base64.encodestring('%s:%s' % (self.current.username, self.current.password)).strip('\n')

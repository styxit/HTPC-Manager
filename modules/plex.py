import cherrypy
import htpc
import re
import socket
import struct
from json import loads, dumps
from urllib2 import Request, urlopen
from htpc.proxy import get_image
import logging
import urllib


class Plex:
    def __init__(self):
        self.logger = logging.getLogger('modules.plex')

        htpc.MODULES.append({
            'name': 'Plex',
            'id': 'plex',
            'test': htpc.WEBDIR + 'plex/ping',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'plex_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'plex_name'},
                {'type': 'text', 'label': 'IP / Host *', 'name': 'plex_host'},
                {'type': 'text', 'label': 'Port *', 'name': 'plex_port'},
                {'type': 'text', 'label': 'Mac addr.', 'name':'plex_mac'},
                {'type':'bool', 'label':'Hide watched', 'name':'plex_hide_watched'}]})

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def ping(self, plex_host='', plex_port='', **kwargs):
        """ Tests settings, returns server name on success and null on fail """
        try:
            self.logger.debug("Testing Plex connectivity")

            url = "http://%s:%s" % (plex_host, plex_port)
            self.logger.debug("Trying to contact Plex via " + url)
            request =  loads(urlopen(Request(url, headers={"Accept": "application/json"})).read())
            self.logger.info("Connected to the Plex Media Server %s at %s" % (request.get('friendlyName'), url))
            return True
        except:
            self.logger.error("Unable to contact Plex via " + url)
            return

    @cherrypy.expose()
    def index(self):
        return htpc.LOOKUP.get_template('plex.html').render(scriptname='plex')

    @cherrypy.expose()
    def webinterface(self):
        """ Generate page from template """
        plex_host = htpc.settings.get('plex_host', 'localhost')
        plex_port = htpc.settings.get('plex_port', '32400')

        url = "http://%s:%s/web" % (plex_host, plex_port)

        raise cherrypy.HTTPRedirect(url('', True))
        
    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetRecentMovies(self, limit=5):
        """ Get a list of recently added movies """
        self.logger.debug("Fetching recent Movies")

        try:
            plex_host = htpc.settings.get('plex_host', 'localhost')
            plex_port = htpc.settings.get('plex_port', '32400')
            movies = []

            for section in self.JsonLoader(urlopen(Request('http://%s:%s/library/sections' % (plex_host, plex_port), headers={"Accept": "application/json"})).read())["_children"]:
                if section['type'] == "movie":
                    for movie in self.JsonLoader(urlopen(Request('http://%s:%s/library/sections/%s/all?type=1&sort=addedAt:desc&X-Plex-Container-Start=0&X-Plex-Container-Size=%s' % (plex_host, plex_port, section["key"], limit), headers={"Accept": "application/json"})).read())["_children"]:
                        jmovie = {}
                        genre = []

                        jmovie['title'] = movie["title"]
                        if 'thumb'in movie:
                           jmovie['thumbnail'] = movie["thumb"]

                        if 'year'in movie:
                           jmovie['year'] = movie["year"]

                        if 'summary'in movie:
                           jmovie['plot'] = movie["summary"]

                        if 'duration'in movie:
                           jmovie['runtime'] = int(movie['duration']) / 60000

                        if 'art'in movie:
                           jmovie['fanart'] = movie["art"]

                        if 'addedAt'in movie:
                           jmovie['addedAt'] = movie["addedAt"]

                        for attrib in movie['_children']:
                            if attrib['_elementType'] == 'Genre':
                                genre.append(attrib['tag'])
                           

                        jmovie['genre'] = [genre]

                        movies.append(jmovie)

            return {'movies': sorted(movies, key=lambda k: k['addedAt'], reverse=True)[:int(limit)]}
        except Exception, e:
            print ("Exception: " + str(e))
            print ("Unable to fetch recent movies!")
            return


    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetRecentShows(self, limit=5):
        """ Get a list of recently added movies """
        try:
            plex_host = htpc.settings.get('plex_host', 'localhost')
            plex_port = htpc.settings.get('plex_port', '32400')
            episodes = []

            for section in self.JsonLoader(urlopen(Request('http://%s:%s/library/sections' % (plex_host, plex_port), headers={"Accept": "application/json"})).read())["_children"]:
                if section['type'] == "show":
                    for episode in self.JsonLoader(urlopen(Request('http://%s:%s/library/sections/%s/all?type=4&sort=addedAt:desc&X-Plex-Container-Start=0&X-Plex-Container-Size=%s' % (plex_host, plex_port, section["key"], limit), headers={"Accept": "application/json"})).read())["_children"]:
                        jepisode = {}
        
                        jepisode['label'] = "%sx%s. %s" % (episode["parentIndex"], episode["index"], episode["title"])
        
                        if 'summary'in episode:
                            jepisode['plot'] = episode["summary"]
        
                        if 'index'in episode:
                            jepisode['episode'] = episode["index"]
        
                        if 'parentIndex'in episode:
                            jepisode['season'] = episode["parentIndex"]

                        if 'grandparentTitle'in episode:
                            jepisode['showtitle'] = episode["grandparentTitle"]

                        if 'duration'in episode:
                           jepisode['runtime'] = int(episode['duration']) / 60000
        
                        if 'thumb'in episode:
                            jepisode['fanart'] = episode["thumb"]
                            
                        if 'addedAt'in episode:
                           jepisode['addedAt'] = episode["addedAt"]
        
                        episodes.append(jepisode)


            return {'episodes': sorted(episodes, key=lambda k: k['addedAt'], reverse=True)[:int(limit)]}
        except Exception, e:
            print ("Exception: " + str(e))
            print ("Unable to fetch episodes movies!")
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetRecentAlbums(self, limit=5):
        """ Get a list of recently added albums """
        try:
            plex_host = htpc.settings.get('plex_host', 'localhost')
            plex_port = htpc.settings.get('plex_port', '32400')
            albums = []

            for section in self.JsonLoader(urlopen(Request('http://%s:%s/library/sections' % (plex_host, plex_port), headers={"Accept": "application/json"})).read())["_children"]:
                if section['type'] == "artist":
                    for album in self.JsonLoader(urlopen(Request('http://%s:%s/library/sections/%s/recentlyAdded?X-Plex-Container-Start=0&X-Plex-Container-Size=%s' % (plex_host, plex_port, section["key"], limit), headers={"Accept": "application/json"})).read())["_children"]:
                        jalbum = {}
        
                        jalbum['title'] = album["title"]
        
                        if 'thumb'in album:
                            jalbum['thumbnail'] = album["thumb"]

                        if 'parentTitle'in album:
                            jalbum['artist'] = album["parentTitle"]

                        if 'year'in album:
                            jalbum['year'] = album["year"]
                            
                        if 'addedAt'in album:
                           jalbum['addedAt'] = album["addedAt"]
        
                        albums.append(jalbum)


            return {'albums': sorted(albums, key=lambda k: k['addedAt'], reverse=True)[:int(limit)]}
        except Exception, e:
            print ("Exception: " + str(e))
            print ("Unable to fetch albums!")
            return


    @cherrypy.expose()
    def GetThumb(self, thumb=None, h=None, w=None, o=100):
        """ Parse thumb to get the url and send to htpc.proxy.get_image """
        #url = self.url('/images/DefaultVideo.png')
        if thumb:
            if o > 100:
                url = "http://%s:%s%s" % (htpc.settings.get('plex_host', 'localhost'), htpc.settings.get('plex_port', '32400'), thumb)
            else:
                # If o < 100 transcode on Plex server to widen format support
                url = "http://%s:%s/photo/:/transcode?height=%s&width=%s&url=%s" % (htpc.settings.get('plex_host', 'localhost'), htpc.settings.get('plex_port', '32400'), h, w, urllib.quote_plus("http://%s:%s%s" % (htpc.settings.get('plex_host', 'localhost'), htpc.settings.get('plex_port', '32400'), thumb)))
                h=None
                w=None
        else:
            url = "/images/DefaultVideo.png"

        self.logger.debug("Trying to fetch image via " + url)
        return get_image(url, h, w, o, "")

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetMovies(self, start=0, end=0, hidewatched=0):
        """ Get a list of recently added movies """
        self.logger.debug("Fetching Movies")

        try:
            plex_host = htpc.settings.get('plex_host', 'localhost')
            plex_port = htpc.settings.get('plex_port', '32400')
            movies = []

            if hidewatched == '1':
               hidewatched = "unwatched"
            else:
               hidewatched = "all"

            for section in self.JsonLoader(urlopen(Request('http://%s:%s/library/sections' % (plex_host, plex_port), headers={"Accept": "application/json"})).read())["_children"]:
                if section['type'] == "movie":
                    for movie in self.JsonLoader(urlopen(Request('http://%s:%s/library/sections/%s/%s' % (plex_host, plex_port, section["key"], hidewatched), headers={"Accept": "application/json"})).read())["_children"]:
                        jmovie = {}
                        genre = []
                        jmovie['playcount'] = 0

                        jmovie['title'] = movie["title"]
                        if 'thumb'in movie:
                           jmovie['thumbnail'] = movie["thumb"]

                        if 'year'in movie:
                           jmovie['year'] = int(movie["year"])

                        if 'summary'in movie:
                           jmovie['plot'] = movie["summary"]

                        if 'studio'in movie:
                           jmovie['studio'] = movie["studio"]

                        if 'duration'in movie:
                           jmovie['runtime'] = int(movie['duration']) / 60000

                        if 'art'in movie:
                           jmovie['fanart'] = movie["art"]

                        if 'rating'in movie:
                           jmovie['rating'] = movie["rating"]

                        if 'viewCount' in movie:
                           jmovie['playcount'] = int(movie["viewCount"])

                        for attrib in movie['_children']:
                            if attrib['_elementType'] == 'Genre':
                                genre.append(attrib['tag'])

                        if len(genre) != 0:
                            jmovie['genre'] = genre

                        movies.append(jmovie)

                    limits = {'start': int(start), 'total': len(movies), 'end': int(end)}
                    if int(end) >= len(movies):
                        limits['end'] = len(movies)

            return {'limits': limits, 'movies': sorted(movies, key=lambda k: k['title'])[int(start):int(end)] }
        except Exception, e:
            print ("Exception: " + str(e))
            print ("Unable to fetch all movies!")
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetShows(self, start=0, end=0, hidewatched=0):
        """ Get a list of recently added movies """
        try:
            plex_host = htpc.settings.get('plex_host', '')
            plex_port = htpc.settings.get('plex_port', '32400')
            tvShows = []

            if hidewatched == '1':
               hidewatched = "unwatched"
            else:
               hidewatched = "all"

            for section in self.JsonLoader(urlopen(Request('http://%s:%s/library/sections' % (plex_host, plex_port), headers={"Accept": "application/json"})).read())["_children"]:
                if section['type'] == "show":

                    for tvShow in self.JsonLoader(urlopen(Request('http://%s:%s/library/sections/%s/%s' % (plex_host, plex_port, section['key'], hidewatched), headers={"Accept": "application/json"})).read())["_children"]:
                        jshow = {}
                        jshow['itemcount'] = 0
                        jshow['playcount'] = 0

                        jshow['title'] = tvShow["title"]
                        
                        jshow['tvshowid'] = tvShow["ratingKey"]
                        
                        if 'thumb'in tvShow:
                           jshow['thumbnail'] = tvShow["thumb"]

                        if 'year'in tvShow:
                           jshow['year'] = int(tvShow["year"])

                        if 'summary'in tvShow:
                           jshow['plot'] = tvShow["summary"]
                           
                        if 'viewedLeafCount'in tvShow:
                           jshow['playcount'] = int(tvShow["viewedLeafCount"])

                        if 'leafCount'in tvShow:
                           jshow['itemcount'] = int(tvShow["leafCount"])

                        tvShows.append(jshow)
                    
                    limits = {'start': int(start), 'total': len(tvShows), 'end': int(end)}
                    if int(end) >= len(tvShows):
                        limits['end'] = len(tvShows)

            return {'limits': limits, 'tvShows': sorted(tvShows, key=lambda k: k['title'])[int(start):int(end)] }
        except Exception, e:
            print ("Exception: " + str(e))
            print ("Unable to fetch all shows!")
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetArtists(self, start=0, end=0):
        """ Get a list of recently added artists """
        try:
            plex_host = htpc.settings.get('plex_host', '')
            plex_port = htpc.settings.get('plex_port', '32400')
            artists = []

            for section in self.JsonLoader(urlopen(Request('http://%s:%s/library/sections' % (plex_host, plex_port), headers={"Accept": "application/json"})).read())["_children"]:
                if section['type'] == "artist":

                    for artist in self.JsonLoader(urlopen(Request('http://%s:%s/library/sections/%s/all' % (plex_host, plex_port, section['key']), headers={"Accept": "application/json"})).read())["_children"]:
                        jartist = {}
                        genre = []

                        jartist['title'] = artist["title"]
                        
                        jartist['artistid'] = artist["ratingKey"]
                        
                        artists.append(jartist)
                    
                    limits = {'start': int(start), 'total': len(artists), 'end': int(end)}
                    if int(end) >= len(artists):
                        limits['end'] = len(artists)

            return {'limits': limits, 'artists': sorted(artists, key=lambda k: k['title'])[int(start):int(end)] }
        except Exception, e:
            print ("Exception: " + str(e))
            print ("Unable to fetch all artists!")
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetAlbums(self, start=0, end=0):
        """ Get a list of Albums """
        try:
            plex_host = htpc.settings.get('plex_host', '')
            plex_port = htpc.settings.get('plex_port', '32400')
            albums = []

            for section in self.JsonLoader(urlopen(Request('http://%s:%s/library/sections' % (plex_host, plex_port), headers={"Accept": "application/json"})).read())["_children"]:
                if section['type'] == "artist":

                    for album in self.JsonLoader(urlopen(Request('http://%s:%s/library/sections/%s/albums' % (plex_host, plex_port, section['key']), headers={"Accept": "application/json"})).read())["_children"]:
                        jalbum = {}

                        jalbum['title'] = album["title"]
                        
                        jalbum['albumid'] = album["ratingKey"]

                        if 'thumb'in album:
                            jalbum['thumbnail'] = album["thumb"]
                        
                        albums.append(jalbum)
                    
                    limits = {'start': int(start), 'total': len(albums), 'end': int(end)}
                    if int(end) >= len(albums):
                        limits['end'] = len(albums)
            print albums
            return {'limits': limits, 'albums': sorted(albums, key=lambda k: k['title'])[int(start):int(end)] }
        except Exception, e:
            print ("Exception: " + str(e))
            print ("Unable to fetch all Albums!")
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetEpisodes(self, start=0, end=0, tvshowid=None, hidewatched=0):
        """ Get information about a single TV Show """
        self.logger.debug("Loading information for TVID" + str(tvshowid))
        try:
            plex_host = htpc.settings.get('plex_host', '')
            plex_port = htpc.settings.get('plex_port', '32400')
            episodes = []

            for episode in self.JsonLoader(urlopen(Request('http://%s:%s/library/metadata/%s/allLeaves' % (plex_host, plex_port, tvshowid), headers={"Accept": "application/json"})).read())["_children"]:
                jepisode = {}
                jepisode['playcount'] = 0

                jepisode['label'] = "%sx%s. %s" % (episode["parentIndex"], episode["index"], episode["title"])

                if 'summary'in episode:
                    jepisode['plot'] = episode["summary"]

                if 'grandparentTitle'in episode:
                    jepisode['showtitle'] = episode["grandparentTitle"]

                if 'index'in episode:
                    jepisode['episode'] = episode["index"]

                if 'parentIndex'in episode:
                    jepisode['season'] = episode["parentIndex"]

                if 'viewCount'in episode:
                    jepisode['playcount'] = int(episode["viewCount"])

                if 'thumb'in episode:
                    jepisode['thumbnail'] = episode["thumb"]

                if hidewatched == '1':
                    if jepisode['playcount'] <= 0:
                        episodes.append(jepisode)
                else:
                    episodes.append(jepisode)
                    
            limits = {'start': int(start), 'total': len(episodes), 'end': int(end)}
            # TODO plocka total from headern.
            if int(end) >= len(episodes):
                limits['end'] = len(episodes)

            return {'limits': limits, 'episodes': episodes[int(start):int(end)] }
        except Exception, e:
            print ("Exception: " + str(e))
            print ("Unable to fetch all episodes!")
            return


    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def Wake(self):
        """ Send WakeOnLan package """
        self.logger.info("Waking up Plex Media Server")
        try:
            addr_byte = htpc.settings.get('plex_mac', '').split(':')
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
            self.logger.info("WOL package sent to " + htpc.settings.get('plex_mac', ''))
            return 'WOL package sent'
        except Exception, e:
            self.logger.debug("Exception: " + str(e))
            self.logger.error("Unable to send WOL packet")
            return 'Unable to send WOL packet'

    def JsonLoader(self, s):
        """ Try to repair the Json returned from Plex """
        while True:
            try:
                result = loads(s)   # try to parse...
                break                    # parsing worked -> exit loop
            except Exception as e:
                unexp = int(re.findall(r'\(char (\d+)\)', str(e))[0])
                # position of unescaped '"' before that
                unesc = s.rfind(r'"', 0, unexp)
                s = s[:unesc] + r'\"' + s[unesc+1:]
                # position of correspondig closing '"' (+2 for inserted '\')
                closg = s.find(r'"', unesc + 2)
                s = s[:closg] + r'\"' + s[closg+1:]
        return result


    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def NowPlaying(self):
        """ Get information about current playing item """
        self.logger.debug("Fetching currently playing information")
        try:
            plex_host = htpc.settings.get('plex_host', '')
            plex_port = htpc.settings.get('plex_port', '32400')
            playing_items = []

            for video in self.JsonLoader(urlopen(Request('http://%s:%s/status/sessions' % (plex_host, plex_port), headers={"Accept": "application/json"})).read())["_children"]:
                jplaying_item = {}
                jplaying_item['protocolCapabilities'] = []

                if 'index' in video:
                    jplaying_item['episode'] = int(video['index'])
                if 'parentThumb' in video:
                    jplaying_item['fanart'] = video['parentThumb']
                jplaying_item['thumbnail'] =  video['thumb']
                if 'parentIndex' in video:
                    jplaying_item['season'] = int(video['parentIndex'])
                jplaying_item['title'] = video['title']
                jplaying_item['year'] = int(video['year'])
                jplaying_item['id'] = int(video['ratingKey'])
                jplaying_item['type'] = video['type']
                if 'grandparentTitle' in video:
                    jplaying_item['show'] = video['grandparentTitle']
                jplaying_item['duration'] = int(video['duration'])
                try:
                    jplaying_item['viewOffset'] = int(video['viewOffset'])
                except:
                    jplaying_item['viewOffset'] = 0
                #jplaying_item['state'] = video['state']

                for children in video["_children"]:
                    if children['_elementType'] == 'Player':
                        jplaying_item['state'] = children['state']
                        jplaying_item['player'] = children['title']
                        # We need some more info to see what the client supports
                        for client in self.JsonLoader(urlopen(Request('http://%s:%s/clients' % (plex_host, plex_port), headers={"Accept": "application/json"})).read())["_children"]:
                            if client['machineIdentifier'] == children['machineIdentifier']:
                                jplaying_item['protocolCapabilities'] = client['protocolCapabilities'].split(',')
                                jplaying_item['address'] = client['address']

                    if children['_elementType'] == 'User':
                        if 'title' in children:
                            jplaying_item['user'] = children['title']
                        if 'thumb' in children:
                            jplaying_item['avatar'] = children['thumb']

                # Sometimes the client doesn't send the last timeline event. Ignore all client that almost have played the entire lenght.
                if jplaying_item['viewOffset'] < (int(jplaying_item['duration']) - 60000):
                    playing_items.append(jplaying_item)
                
            return {'playing_items': playing_items}
            
        except Exception, e:
            print ("Exception: " + str(e))
            self.logger.error("Unable to fetch currently playing information!")
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def UpdateLibrary(self, section_type=None):
        """ Get information about current playing item """
        self.logger.debug("Updating Plex library")
        try:
            plex_host = htpc.settings.get('plex_host', '')
            plex_port = htpc.settings.get('plex_port', '32400')

            for section in self.JsonLoader(urlopen(Request('http://%s:%s/library/sections' % (plex_host, plex_port), headers={"Accept": "application/json"})).read())["_children"]:
                if section_type == None or section_type == section['type']:
                    self.logger.debug("Updating section %s" % section['key'])
                    try:
                        urllib.urlopen('http://%s:%s/library/sections/%s/refresh' % (plex_host, plex_port, section['key']))
                    except Exception, e:
                        self.logger.error('Failed to update section %s on Plex: ' + (section['key'], ex(e)))
            return 'Update command sent to Plex'
        except Exception, e:
            print ("Exception: " + str(e))
            self.logger.error("Failed to update library!")
            return 'Failed to update library!'

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def ControlPlayer(self, player, action, value=''):
        """ Various commands to control Plex Player """
        self.logger.debug("Sending control to Plex: " + action)
        try:

            self.navigationCommands = ['moveUp', 'moveDown', 'moveLeft', 'moveRight', 'pageUp', 'pageDown', 'nextLetter', 'previousLetter', 'select', 'back', 'contextMenu', 'toggleOSD']
            self.playbackCommands = ['play', 'pause', 'stop', 'rewind', 'fastForward', 'stepForward', 'bigStepForward', 'stepBack', 'bigStepBack', 'skipNext', 'skipPrevious']
            self.applicationCommands = ['playFile', 'playMedia', 'screenshot', 'sendString', 'sendKey', 'sendVirtualKey']

            plex_host = htpc.settings.get('plex_host', '')
            plex_port = htpc.settings.get('plex_port', '32400')
            if action in self.navigationCommands:
                urllib.urlopen('http://%s:%s/system/players/%s/naviation/%s' % (plex_host, plex_port, player, action))
            elif action in self.playbackCommands:
                print urllib.urlopen('http://%s:%s/system/players/%s/playback/%s' % (plex_host, plex_port, player, action))
            elif action in self.applicationCommands:
                urllib.urlopen('http://%s:%s/system/players/%s/application/%s' % (plex_host, plex_port, player, action))
            else:
                raise ValueError("Unable to control Plex with action: " + action)

        except Exception, e:
            self.logger.debug("Exception: " + str(e))
            self.logger.error("Unable to control Plex with action: " + action)
            return 'error'

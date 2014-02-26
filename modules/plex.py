import cherrypy
import htpc
import re
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
                {'type': 'text', 'label': 'Mac addr.', 'name':'plex_mac'}]})

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
    @cherrypy.tools.json_out()
    def GetRecentMovies(self, limit=5):
        """ Get a list of recently added movies """
        try:
            plex_host = htpc.settings.get('plex_host', '')
            plex_port = htpc.settings.get('plex_port', '32400')

            videotree = etree.parse(
                "http://%s:%s/library/sections/%s/recentlyAdded" %
                (plex_host, plex_port, self.moviesSection)
            )

            movies = []
            for movie in videotree.xpath('//Video')[0:limit]:
                title = movie.attrib['title']
                thumbnail = movie.attrib['art']
                
                if(hasattr(movie, 'viewCount')):
                    playcount = movie.attrib['viewCount']
                else:
                    playcount = 0
                year = movie.attrib['year']
                plot = movie.attrib['summary']
                runtime = int(movie.attrib['duration']) / 1000

                jmovie = {
                    'title': title,
                    'thumbnail': thumbnail,
                    'playcount': playcount,
                    'year': year,
                    'plot': plot,
                    'runtime': runtime}

                movies.append(jmovie)

            return json.dumps({'movies': movies})
        except Exception, e:
            print ("Exception: " + str(e))
            print ("Unable to fetch recently added movies!")
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetRecentShows(self, limit=5):
        """ Get a list of recently added movies """
        try:
            plex_host = htpc.settings.get('plex_host', '10.0.1.5')
            plex_port = htpc.settings.get('plex_port', '32400')
            videotree = etree.parse(
                "http://%s:%s/library/sections/%s/recentlyAdded"
                % (plex_host, plex_port, 2)
            )

            series = []
            for movie in videotree.xpath('//Video')[0:limit]:
                title = movie.attrib['title']
                showTitle = movie.attrib['grandparentTitle']
                thumbnail = 'http://10.0.1.5:32400' \
                    + movie.attrib['grandparentThumb']
                playcount = 1
                if(hasattr(movie, 'year')):
                    year = movie.attrib['year']
                else:
                    year = 0
                plot = movie.attrib['summary']
                runtime = int(movie.attrib['duration']) / 1000

                episode = {
                    'title': title,
                    'showTitle': showTitle,
                    'thumbnail': thumbnail,
                    'playcount': playcount,
                    'year': year,
                    'plot': plot,
                    'runtime': runtime}

                series.append(episode)
            return json.dumps({'episodes': series})
        except Exception, e:
            print ("Exception: " + str(e))
            print ("Unable to fetch recently added movies!")
            return

    @cherrypy.expose()
    def GetThumb(self, thumb=None, h=None, w=None, o=100):
        """ Parse thumb to get the url and send to htpc.proxy.get_image """
        #url = self.url('/images/DefaultVideo.png')
        if thumb:
            url = "http://%s:%s/photo/:/transcode?height=%s&width=%s&url=%s" % (htpc.settings.get('plex_host', 'localhost'), htpc.settings.get('plex_port', '32400'), h, w, urllib.quote_plus("http://%s:%s%s" % (htpc.settings.get('plex_host', 'localhost'), htpc.settings.get('plex_port', '32400'), thumb)))
        else:
            url = "/images/DefaultVideo.png"

        self.logger.debug("Trying to fetch image via " + url)
        return get_image(url, o, "")

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetMovies(self, start=0, end=0):
        """ Get a list of recently added movies """
        self.logger.debug("Fetching Movies")

        try:
            plex_host = htpc.settings.get('plex_host', 'localhost')
            plex_port = htpc.settings.get('plex_port', '32400')
            movies = []

            for section in self.JsonLoader(urlopen(Request('http://%s:%s/library/sections' % (plex_host, plex_port), headers={"Accept": "application/json"})).read())["_children"]:
                if section['type'] == "movie":
                    for movie in self.JsonLoader(urlopen(Request('http://%s:%s/library/sections/%s/all' % (plex_host, plex_port, section["key"]), headers={"Accept": "application/json"})).read())["_children"]:
                        #print movie
                        jmovie = {}
                        genre = []

                        jmovie['title'] = movie["title"]
                        if 'thumb'in movie:
                           jmovie['thumbnail'] = movie["thumb"]

                        if 'year'in movie:
                           jmovie['year'] = movie["year"]

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

                        for attrib in movie['_children']:
                            if attrib['_elementType'] == 'Genre':
                                genre.append(attrib['tag'])

                        if len(genre) != 0:
                            jmovie['genre'] = ', '.join(genre)

                        movies.append(jmovie)

                    limits = {'start': int(start), 'total': len(movies), 'end': int(end)}
                    if int(end) >= len(movies):
                        limits['end'] = len(movies)

            return dumps({'limits': limits, 'movies': sorted(movies, key=lambda k: k['title'])[int(start):int(end)] })
        except Exception, e:
            print ("Exception: " + str(e))
            print ("Unable to fetch all movies!")
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def ListShows(self, start=0, end=0):
        """ Get a list of recently added movies """
        try:
            plex_host = htpc.settings.get('plex_host', '')
            plex_port = htpc.settings.get('plex_port', '32400')
            tvShows = []

            for section in self.JsonLoader(urlopen(Request('http://%s:%s/library/sections' % (plex_host, plex_port), headers={"Accept": "application/json"})).read())["_children"]:
                if section['type'] == "show":

                    for tvShow in self.JsonLoader(urlopen(Request('http://%s:%s/library/sections/%s/all' % (plex_host, plex_port, section['key']), headers={"Accept": "application/json"})).read())["_children"]:
                        jshow = {}

                        jshow['title'] = tvShow["title"]
                        
                        jshow['tvshowid'] = tvShow["ratingKey"]
                        
                        if 'thumb'in tvShow:
                           jshow['thumbnail'] = tvShow["thumb"]

                        if 'year'in tvShow:
                           jshow['year'] = tvShow["year"]

                        if 'summary'in tvShow:
                           jshow['plot'] = tvShow["summary"]
                           
                        if 'viewedLeafCount'in tvShow:
                           jshow['playcount'] = tvShow["viewedLeafCount"]
                        
                        tvShows.append(jshow)
                    
                    limits = {'start': int(start), 'total': len(tvShows), 'end': int(end)}
                    if int(end) >= len(tvShows):
                        limits['end'] = len(tvShows)

            return dumps({'limits': limits, 'tvShows': sorted(tvShows, key=lambda k: k['title'])[int(start):int(end)] })
        except Exception, e:
            print ("Exception: " + str(e))
            print ("Unable to fetch all shows!")
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetEpisodes(self, start=0, end=0, sortmethod='episode', sortorder='ascending', tvshowid=None, hidewatched=False):
        """ Get information about a single TV Show """
        self.logger.debug("Loading information for TVID" + str(tvshowid))
        try:
            plex_host = htpc.settings.get('plex_host', '')
            plex_port = htpc.settings.get('plex_port', '32400')
            episodes = []

            for episode in self.JsonLoader(urlopen(Request('http://%s:%s/library/metadata/%s/allLeaves' % (plex_host, plex_port, tvshowid), headers={"Accept": "application/json"})).read())["_children"]:
                jepisode = {}

                jepisode['label'] = "%sx%s. %s" % (episode["parentIndex"], episode["index"], episode["title"])

                if 'summary'in episode:
                    jepisode['plot'] = episode["summary"]

                if 'index'in episode:
                    jepisode['episode'] = episode["index"]

                if 'parentIndex'in episode:
                    jepisode['season'] = episode["parentIndex"]

                if 'viewCount'in episode:
                    jepisode['playcount'] = episode["viewCount"]

                if 'thumb'in episode:
                    jepisode['thumbnail'] = episode["thumb"]

                episodes.append(jepisode)
                    
            limits = {'start': int(start), 'total': len(episodes), 'end': int(end)}
            if int(end) >= len(episodes):
                limits['end'] = len(episodes)

            return dumps({'limits': limits, 'episodes': episodes[int(start):int(end)] })
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
            addr_byte = self.htpc.settings.get('plex_mac', '').split(':')
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
                jplaying_item['viewOffset'] = int(video['viewOffset'])
                #jplaying_item['state'] = video['state']

                for children in video["_children"]:
                    if children['_elementType'] == 'Player':
                        jplaying_item['state'] = children['state']
                playing_items.append(jplaying_item)
                
                    
            print dumps({'playing_items': playing_items}) 
            return dumps({'playing_items': playing_items})
            
        except Exception, e:
            print ("Exception: " + str(e))
            self.logger.error("Unable to fetch currently playing information!")
            return

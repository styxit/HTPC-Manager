import cherrypy
import htpc
from urllib import quote
from urllib2 import urlopen
from json import loads
from urllib2 import Request
import base64

class Sickbeard:
    def __init__(self):
        htpc.MODULES.append({
            'name': 'Sickbeard',
            'id': 'sickbeard',
            'test': htpc.WEBDIR + 'sickbeard/ping',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'sickbeard_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'sickbeard_name'},
                {'type': 'text', 'label': 'IP / Host *', 'name': 'sickbeard_host'},
                {'type': 'text', 'label': 'Port *', 'name': 'sickbeard_port'},
                {'type': 'text', 'label': 'API key', 'name': 'sickbeard_apikey'},
		{'type': 'text', 'label': 'Basepath', 'name': 'sickbeard_basepath'},
                {'type': 'text', 'label': 'User', 'name': 'sickbeard_user'},
                {'type': 'password', 'label': 'Password', 'name': 'sickbeard_password'}
        ]})

    @cherrypy.expose()
    def index(self):
        return htpc.LOOKUP.get_template('sickbeard/index.html').render()

    @cherrypy.expose()    
    def view(self, tvdbid):
        if not (tvdbid.isdigit()):
          raise cherrypy.HTTPError("500 Error", "Invalid show ID.")
          return False
          
        return htpc.LOOKUP.get_template('sickbeard/view.html').render(tvdbid=tvdbid)    

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def ping(self, sickbeard_host, sickbeard_port, sickbeard_apikey, **kwargs):
        try:
            settings = htpc.settings.Settings()
            user = settings.get('sickbeard_user', '')
            password = settings.get('sickbeard_password', '')
            sickbeard_basepath = settings.get('sickbeard_basepath', '/')
            if(sickbeard_basepath == ""):
              sickbeard_basepath = "/"
            url = 'http://' + sickbeard_host + ':' + sickbeard_port + sickbeard_basepath + 'api/' + sickbeard_apikey + '/?cmd='
            request = Request(url + 'sb.ping')
            if user != '' and password != '':
              base64string = base64.encodestring('%s:%s' % (user, password)).replace('\n', '')
              request.add_header("Authorization", "Basic %s" % base64string)
            
            response = loads(urlopen(request, timeout=10).read())
            if response.get('result') == "success":
                return response
        except:
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetShowList(self):
        return self.fetch('shows&sort=name')

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetNextAired(self):
        return self.fetch('future')

    @cherrypy.expose()
    def GetBanner(self, tvdbid):
        cherrypy.response.headers['Content-Type'] = 'image/jpeg'
        return self.fetch('show.getbanner&tvdbid=' + tvdbid, True)

    @cherrypy.expose()
    def GetPoster(self, tvdbid):
        cherrypy.response.headers['Content-Type'] = 'image/jpeg'
        return self.fetch('show.getposter&tvdbid=' + tvdbid, True)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetHistory(self, limit=''):
        return self.fetch('history&limit=' + limit)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetLogs(self):
        return self.fetch('logs&min_level=info')

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def AddShow(self, tvdbid):
        return self.fetch('show.addnew&tvdbid=' + tvdbid)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetShow(self, tvdbid):
        return self.fetch('show&tvdbid=' + tvdbid)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetSeason(self, tvdbid, season):
        return self.fetch('show.seasons&tvdbid=' + tvdbid + '&season=' + season)
        
    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def SearchEpisodeDownload(self, tvdbid, season, episode):
        return self.fetch('episode.search&tvdbid=' + tvdbid + '&season=' + season + '&episode=' + episode, False, 45)

    @cherrypy.expose()
    def SearchShow(self, query):
        try:
            url = 'http://www.thetvdb.com/api/GetSeries.php?seriesname=' + quote(query)
            return urlopen(url, timeout=10).read()
        except:
            return

    def fetch(self, cmd, img=False, timeout = 10):
        try:
            settings = htpc.settings.Settings()
            host = settings.get('sickbeard_host', '')
            port = str(settings.get('sickbeard_port', ''))
            apikey = settings.get('sickbeard_apikey', '')
            user = settings.get('sickbeard_user', '')
            password = settings.get('sickbeard_password', '')
            sickbeard_basepath = settings.get('sickbeard_basepath', '/')
            if(sickbeard_basepath == ""):
              sickbeard_basepath = "/"
            url = 'http://' + host + ':' + str(port) + sickbeard_basepath + 'api/' + apikey + '/?cmd=' + cmd
            request = Request(url)
            if user != '' and password != '':
              base64string = base64.encodestring('%s:%s' % (user, password)).replace('\n', '')
              request.add_header("Authorization", "Basic %s" % base64string)
            if (img == True):
              return urlopen(request, timeout=timeout).read()
              
            return loads(urlopen(request, timeout=timeout).read())
        except:
            return

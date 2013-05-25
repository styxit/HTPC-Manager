import cherrypy
import htpc
from htpc.proxy import get_image
from json import loads
from urllib2 import urlopen

class Couchpotato:
    def __init__(self):
        htpc.MODULES.append({
            'name': 'CouchPotato',
            'id': 'couchpotato',
            'test': htpc.WEBDIR + 'couchpotato/ping',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'couchpotato_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'couchpotato_name'},
                {'type': 'text', 'label': 'IP / Host *', 'name': 'couchpotato_host'},
                {'type': 'text', 'label': 'Port *', 'name': 'couchpotato_port'},
                {'type': 'text', 'label': 'API key', 'name': 'couchpotato_apikey'},
                {'type': 'text', 'label': 'Basepath (starts with a slash)', 'name': 'couchpotato_basepath'}
        ]})

    @cherrypy.expose()
    def index(self):
        return htpc.LOOKUP.get_template('couchpotato.html').render()

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def ping(self, couchpotato_host, couchpotato_port, couchpotato_apikey, couchpotato_basepath, **kwargs):

        if(couchpotato_basepath == ""):
            couchpotato_basepath = "/"
        if not(couchpotato_basepath.endswith('/')):
            couchpotato_basepath += "/"

        url = 'http://' + couchpotato_host + ':' + couchpotato_port + couchpotato_basepath + 'api/' + couchpotato_apikey
        try:
            return loads(urlopen(url + '/app.available', timeout=10).read())
        except:
            return

    @cherrypy.expose()
    def GetImage(self, url, h=None, w=None, o=None):
        return get_image(url, h, w, o)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetMovieList(self, limit=''):
        return self.fetch('movie.list?status=active&limit_offset=' + limit)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetNotificationList(self, limit='20'):
        data = self.fetch('notification.list?limit_offset=' + limit)
        self.fetch('notification.markread')
        return data

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def DeleteMovie(self, id=''):
        return self.fetch('movie.delete/?id=' + id)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def RefreshMovie(self, id):
        return self.fetch('movie.refresh/?id=' + id)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def EditMovie(self, id, profile):
        return self.fetch('movie.edit/?id=' + id + '&profile_id=' + profile)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def SearchMovie(self, q=''):
        return self.fetch('movie.search/?q=' + q)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetProfiles(self):
        return self.fetch('profile.list')

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def AddMovie(self, profile_id='', identifier='', title=''):
        return self.fetch('movie.add/?profile_id=' + profile_id + '&identifier=' + identifier + '&title=' + title)

    def fetch(self, path):
        try:
            settings = htpc.settings.Settings()
            host = settings.get('couchpotato_host', '')
            port = str(settings.get('couchpotato_port', ''))
            apikey = settings.get('couchpotato_apikey', '')

            couchpotato_basepath = settings.get('couchpotato_basepath', '/')
            if(couchpotato_basepath == ""):
              couchpotato_basepath = "/"
            if not(couchpotato_basepath.endswith('/')):
                couchpotato_basepath += "/"

            url = 'http://' + host + ':' + port + couchpotato_basepath + 'api/' + apikey + '/' + path

            return loads(urlopen(url, timeout=10).read())
        except:
            return

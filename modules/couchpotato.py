import os, cherrypy, htpc
from Cheetah.Template import Template
from htpc.tools import SafeFetchFromUrl

class CouchPotato:
    def __init__(self):
        host = htpc.settings.get('couchpotato_host', '')
        port = str(htpc.settings.get('couchpotato_port', ''))
        apikey = htpc.settings.get('couchpotato_apikey', '')
        self.url = 'http://'+host+':'+port+'/api/'+apikey+'/';

    @cherrypy.expose()
    def index(self):
        template = Template(file=os.path.join(htpc.template, 'couchpotato.tpl'), searchList=[htpc.settings])
        template.jsfile = 'couchpotato.js'
        return template.respond()

    @cherrypy.expose()
    def GetMovieList(self):
        return SafeFetchFromUrl(self.url + 'movie.list')

    @cherrypy.expose()
    def GetNotificationList(self):
        return SafeFetchFromUrl(self.url + 'notification.list')
    
    @cherrypy.expose()
    def DeleteMovie(self, **kwargs):
        return SafeFetchFromUrl(self.url + 'movie.delete/?id=' + kwargs.get('id'))
    
    @cherrypy.expose()
    def RefreshMovie(self, **kwargs):
        return SafeFetchFromUrl(self.url + 'movie.refresh/?id=' +  kwargs.get('id'))
    
    @cherrypy.expose()
    def SearchMovie(self, **kwargs):
        return SafeFetchFromUrl(self.url + 'movie.search/?q=' +  kwargs.get('q'))
    
    @cherrypy.expose()
    def AddMovie(self, **kwargs):
        return SafeFetchFromUrl(self.url + 'movie.add/?profile_id='+kwargs.get('profile_id')+'&identifier='+kwargs.get('identifier')+'&title='+kwargs.get('title'))

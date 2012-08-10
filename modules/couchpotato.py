import os, cherrypy, htpc
from htpc.tools import template, SafeFetchFromUrl

class CouchPotato:
    def __init__(self):
        host = htpc.settings.get('couchpotato_host', '')
        port = str(htpc.settings.get('couchpotato_port', ''))
        apikey = htpc.settings.get('couchpotato_apikey', '')
        self.url = 'http://'+host+':'+port+'/api/'+apikey+'/';

    @cherrypy.expose()
    def index(self):
        return template('couchpotato.html')

    @cherrypy.expose()
    def GetMovieList(self, **kwargs):
        limit = kwargs.get('limit','')
        return SafeFetchFromUrl(self.url + 'movie.list?limit_offset='+limit)

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

htpc.root.couchpotato = CouchPotato()

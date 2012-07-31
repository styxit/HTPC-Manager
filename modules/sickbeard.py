import os, cherrypy, htpc
from Cheetah.Template import Template
from urllib import quote
from htpc.tools import SafeFetchFromUrl

class Sickbeard:
    def __init__(self):
        host = htpc.settings.get('sickbeard_host', '')
        port = str(htpc.settings.get('sickbeard_port', ''))
        apikey = htpc.settings.get('sickbeard_apikey', '')
        self.url = 'http://' + host + ':' + str(port) + '/api/' + apikey + '/?cmd=';

    @cherrypy.expose()
    def index(self):
        template = Template(file=os.path.join(htpc.template, 'sickbeard.tpl'), searchList=[htpc.settings])
        template.jsfile = 'sickbeard.js'
        return template.respond()

    @cherrypy.expose()
    def GetShowList(self):
        return SafeFetchFromUrl(self.url + 'shows&sort=name')

    @cherrypy.expose()
    def GetNextAired(self):
        return SafeFetchFromUrl(self.url + 'future')

    @cherrypy.expose()
    def GetPoster(self, **kwargs):
        return SafeFetchFromUrl(self.url + 'show.getposter&tvdbid=' + kwargs.get('tvdbid'))

    @cherrypy.expose()
    def GetHistory(self, **kwargs):
        return SafeFetchFromUrl(self.url + 'history&limit=' + kwargs.get('limit'))

    @cherrypy.expose()
    def GetLogs(self):
        return SafeFetchFromUrl(self.url + 'logs&min_level=info')

    @cherrypy.expose()
    def AddShow(self, **kwargs):
        return SafeFetchFromUrl(self.url + 'show.addnew&tvdbid=' + kwargs.get('tvdbid'))

    @cherrypy.expose()
    def GetShow(self, **kwargs):
        return SafeFetchFromUrl(self.url + 'show&tvdbid=' + kwargs.get('tvdbid'))

    @cherrypy.expose()
    def SearchShow(self, **kwargs):
        seriesname = quote(kwargs.get('query'))
        return SafeFetchFromUrl('http://www.thetvdb.com/api/GetSeries.php?seriesname='+seriesname)

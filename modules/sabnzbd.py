import os, cherrypy, htpc
from urllib import quote
from htpc.tools import template, SafeFetchFromUrl

class Sabnzbd:
    def __init__(self):
        host = htpc.settings.get('sabnzbd_host', '')
        port = str(htpc.settings.get('sabnzbd_port', ''))
        apikey = htpc.settings.get('sabnzbd_apikey', '')
        ssl = htpc.settings.get('sabnzbd_ssl', 0)
        useSSL = ''
        if int(ssl):
            useSSL = 's'
        self.url = 'http'+useSSL+'://'+host+':'+port+'/sabnzbd/api?output=json&apikey='+apikey

    @cherrypy.expose()
    def index(self):
        return template('sabnzbd.html')

    @cherrypy.expose()
    def GetHistory(self, **kwargs):
        return SafeFetchFromUrl(self.url + '&mode=history&limit=' + str(kwargs.get('limit')))

    @cherrypy.expose()
    def GetStatus(self):
        return SafeFetchFromUrl(self.url + '&mode=queue')

    @cherrypy.expose()
    def GetWarnings(self):
        return SafeFetchFromUrl(self.url + '&mode=warnings')

    @cherrypy.expose()
    def TogglePause(self, **kwargs):
        return SafeFetchFromUrl(self.url + '&mode=' + kwargs.get('mode'))

    @cherrypy.expose()
    def AddNzbFromUrl(self, **kwargs):
        url = kwargs.get('nzb_url')
        cat = kwargs.get('nzb_category')
        category = ''
        if cat:
            category = '&cat=' + str(cat)
        return SafeFetchFromUrl(self.url + '&mode=addurl&name=' + quote(url) + category)

    @cherrypy.expose()
    def DeleteNzb(self, **kwargs):
        return SafeFetchFromUrl(self.url + '&mode=queue&name=delete&value=' + kwargs.get('id'))

    @cherrypy.expose()
    def DeleteHistory(self, **kwargs):
        return SafeFetchFromUrl(self.url + '&mode=history&name=delete&value=' + kwargs.get('id'))

    @cherrypy.expose()
    def Retry(self, **kwargs):
        return SafeFetchFromUrl(self.url + '&mode=retry&value=' + kwargs.get('id'))

    @cherrypy.expose()
    def GetCategories(self):
        return SafeFetchFromUrl(self.url + '&mode=get_cats')

    @cherrypy.expose()
    def ChangeCategory(self, **kwargs):
        return SafeFetchFromUrl(self.url + '&mode=change_cat&value=' + kwargs.get('id') + '&value2=' + kwargs.get('cat'))

    @cherrypy.expose()
    def SetSpeed(self, **kwargs):
        return SafeFetchFromUrl(self.url + '&mode=config&name=speedlimit&value=' + str(kwargs.get('speed')))

htpc.root.sabnzbd = Sabnzbd()

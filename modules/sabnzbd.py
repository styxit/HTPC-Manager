import os, cherrypy, htpc
from urllib import quote
from urllib2 import urlopen
from json import loads

class Sabnzbd:
    def __init__(self):
        htpc.modules.append({
            'name': 'SABnzbd',
            'id': 'sabnzbd',
            'test': '/sabnzbd/version',
            'fields': [
                {'type':'bool', 'label':'Enable', 'name':'sabnzbd_enable'},
                {'type':'text', 'label':'Menu name', 'name':'sabnzbd_name'},
                {'type':'text', 'label':'IP / Host *', 'name':'sabnzbd_host'},
                {'type':'text', 'label':'Port *', 'name':'sabnzbd_port'},
                {'type':'text', 'label':'API key', 'name':'sabnzbd_apikey'},
                {'type':'bool', 'label':'Use SSL', 'name':'sabnzbd_ssl'}
        ]})

    @cherrypy.expose()
    def index(self):
        return htpc.lookup.get_template('sabnzbd.html').render()

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def version(self, sabnzbd_host, sabnzbd_port, sabnzbd_apikey, sabnzbd_ssl=False, **kwargs):
        ssl = 's' if sabnzbd_ssl else ''
        url = 'http'+ssl+'://'+sabnzbd_host+':'+sabnzbd_port+'/sabnzbd/api?output=json&apikey='+sabnzbd_apikey
        try:
            return loads(urlopen(url+'&mode=version', timeout=10).read())
        except:
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetHistory(self, limit=''):
        return self.fetch('&mode=history&limit='+limit)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetStatus(self):
        return self.fetch('&mode=queue')

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetWarnings(self):
        return self.fetch('&mode=warnings')

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def TogglePause(self, mode=''):
        return self.fetch('&mode='+mode)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def AddNzbFromUrl(self, nzb_url, nzb_category=''):
        if nzb_category:
            nzb_category = '&cat='+nzb_category
        return self.fetch('&mode=addurl&name='+quote(nzb_url)+nzb_category)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def DeleteNzb(self, id):
        return self.fetch('&mode=queue&name=delete&value='+id)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def DeleteHistory(self, id):
        return self.fetch('&mode=history&name=delete&value='+id)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def Retry(self, id):
        return self.fetch('&mode=retry&value='+id)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetCategories(self):
        return self.fetch('&mode=get_cats')

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def ChangeCategory(self, id, cat):
        return self.fetch('&mode=change_cat&value='+id+'&value2='+cat)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def SetSpeed(self, speed):
        return self.fetch('&mode=config&name=speedlimit&value='+speed)

    def fetch(self, path):
        try:
            settings = htpc.settings.Settings()
            host = settings.get('sabnzbd_host', '')
            port = str(settings.get('sabnzbd_port', ''))
            apikey = settings.get('sabnzbd_apikey', '')
            ssl = 's' if settings.get('sabnzbd_ssl', 0) else ''
            url = 'http'+ssl+'://'+host+':'+port+'/sabnzbd/api?output=json&apikey='+apikey+path
            return loads(urlopen(url, timeout=10).read())
        except:
            return

htpc.root.sabnzbd = Sabnzbd()

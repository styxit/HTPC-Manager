import cherrypy
import htpc
from urllib import quote
from urllib2 import urlopen
from json import loads
import logging

class Sabnzbd:
    def __init__(self):
        self.logger = logging.getLogger('modules.sabnzbd')
        htpc.MODULES.append({
            'name': 'SABnzbd',
            'id': 'sabnzbd',
            'test': htpc.WEBDIR + 'sabnzbd/version',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'sabnzbd_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'sabnzbd_name'},
                {'type': 'text', 'label': 'IP / Host *', 'name': 'sabnzbd_host'},
                {'type': 'text', 'label': 'Port *', 'name': 'sabnzbd_port'},
                {'type': 'text', 'label': 'Basepath', 'name': 'sabnzbd_basepath'},
                {'type': 'text', 'label': 'API key', 'name': 'sabnzbd_apikey'},
                {'type': 'bool', 'label': 'Use SSL', 'name': 'sabnzbd_ssl'}
        ]})

    @cherrypy.expose()
    def index(self):
        return htpc.LOOKUP.get_template('sabnzbd.html').render(scriptname='sabnzbd')

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def version(self, sabnzbd_host, sabnzbd_basepath, sabnzbd_port, sabnzbd_apikey, sabnzbd_ssl=False, **kwargs):
        self.logger.debug("Fetching version information from sabnzbd")
        ssl = 's' if sabnzbd_ssl else ''

        if(sabnzbd_basepath == ""):
          sabnzbd_basepath = "/sabnzbd/"
        if not(sabnzbd_basepath.endswith('/')):
            sabnzbd_basepath += "/"

        url = 'http' + ssl + '://' + sabnzbd_host + ':' + sabnzbd_port + sabnzbd_basepath + 'api?output=json&apikey=' + sabnzbd_apikey
        try:
            return loads(urlopen(url + '&mode=version', timeout=10).read())
        except:
            self.logger.error("Unable to contact sabnzbd via " + url)
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetHistory(self, limit=''):
        self.logger.debug("Fetching history")
        return self.fetch('&mode=history&limit=' + limit)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetStatus(self):
        self.logger.debug("Fetching queue")
        return self.fetch('&mode=queue')

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetWarnings(self):
        self.logger.debug("Fetching warning")
        return self.fetch('&mode=warnings')

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def TogglePause(self, mode=''):
        self.logger.debug("Pausing")
        return self.fetch('&mode=' + mode)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def AddNzbFromUrl(self, nzb_url, nzb_category=''):
        self.logger.debug("Adding nzb from url")
        if nzb_category:
            nzb_category = '&cat=' + nzb_category
        return self.fetch('&mode=addurl&name=' + quote(nzb_url) + nzb_category)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def DeleteNzb(self, id):
        self.logger.debug("Deleting nzb")
        return self.fetch('&mode=queue&name=delete&value=' + id)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def DeleteHistory(self, id):
        self.logger.debug("Deleting history")
        return self.fetch('&mode=history&name=delete&value=' + id)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def Retry(self, id):
        self.logger.debug("Retry download")
        return self.fetch('&mode=retry&value=' + id)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def GetCategories(self):
        self.logger.debug("Fetch available categories")
        return self.fetch('&mode=get_cats')

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def ChangeCategory(self, id, cat):
        self.logger.debug("Changing category of download")
        return self.fetch('&mode=change_cat&value=' + id + '&value2=' + cat)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def SetSpeed(self, speed):
        self.logger.debug("Setting speed-limit")
        return self.fetch('&mode=config&name=speedlimit&value=' + speed)

    def fetch(self, path):
        try:
            host = htpc.settings.get('sabnzbd_host', '')
            port = str(htpc.settings.get('sabnzbd_port', ''))
            apikey = htpc.settings.get('sabnzbd_apikey', '')
            sabnzbd_basepath = htpc.settings.get('sabnzbd_basepath', '/sabnzbd/')
            ssl = 's' if htpc.settings.get('sabnzbd_ssl', 0) else ''
                        
            if(sabnzbd_basepath == ""):
                sabnzbd_basepath = "/sabnzbd/"
            if not(sabnzbd_basepath.endswith('/')):
                sabnzbd_basepath += "/"

            url = 'http' + ssl + '://' + host + ':' + port + sabnzbd_basepath + 'api?output=json&apikey=' + apikey + path
            self.logger.debug("Fetching information from: " + url)
            return loads(urlopen(url, timeout=10).read())
        except:
            self.logger.error("Cannot contact sabnzbd")
            return

import os, cherrypy
import htpc.tools as tools

from Cheetah.Template import Template

from htpc.sabnzbd import sabnzbd
from htpc.couchpotato import couchpotato
from htpc.sickbeard import sickbeard
from htpc.nzbsearch import nzbsearch
from htpc.xbmc import xbmc
from htpc.squeezebox import squeezebox

class pageHandler:
    def __init__(self, configfile):
        self.root = os.getcwd()
        self.configfile = configfile
        self.config = tools.readSettings(configfile)
        self.webdir = os.path.join(self.root, 'interfaces', self.config['template'])

    @cherrypy.expose()
    def index(self):
        template = Template(file=os.path.join(self.webdir, 'dash.tpl'), searchList=[self.config]);
        template.appname = self.config['app_name']
        template.webdir = self.webdir
        template.submenu = ''
        template.jsfile = 'dash.js'
        return template.respond()

    @cherrypy.expose()
    def settings(self, **kwargs):
        if kwargs:
            self.config = tools.saveSettings(self.configfile,kwargs)

        template = Template(file=os.path.join(self.webdir, 'settings.tpl'), searchList=[self.config])
        template.appname = self.config['app_name']
        template.webdir = self.webdir
        template.jsfile = 'settings.js'
        template.submenu = 'settings'
        return template.respond()

    @cherrypy.expose()
    def sabnzbd(self, **kwargs):
        template = Template(file=os.path.join(self.webdir, 'sabnzbd.tpl'), searchList=[self.config])
        template.appname = self.config['app_name']
        template.webdir = self.webdir
        template.jsfile = 'sabnzbd.js'
        template.submenu = 'sabnzbd'
        return template.respond()
    
    @cherrypy.expose()
    def couchpotato(self, **kwargs):
        template = Template(file=os.path.join(self.webdir, 'couchpotato.tpl'), searchList=[self.config])
        template.appname = self.config['app_name']
        template.webdir = self.webdir
        template.jsfile = 'couchpotato.js'
        template.submenu = 'couchpotato'
        return template.respond()

    @cherrypy.expose()
    def sickbeard(self, **args):
        template = Template(file=os.path.join(self.webdir, 'sickbeard.tpl'), searchList=[self.config])
        template.appname = self.config['app_name']
        template.webdir = self.webdir
        template.jsfile = 'sickbeard.js'
        template.submenu = 'sickbeard'
        return template.respond()

    @cherrypy.expose()
    def squeezebox(self, **args):
        template = Template(file=os.path.join(self.webdir, 'squeezebox.tpl'), searchList=[self.config])
        template.appname = self.config['app_name']
        template.webdir = self.webdir
        template.jsfile = 'squeezebox.js'
        template.submenu = 'squeezebox'
        return template.respond()

    @cherrypy.expose()
    def xbmc(self, **args):
        template = Template(file=os.path.join(self.webdir, 'xbmc.tpl'), searchList=[self.config])
        template.appname = self.config['app_name']
        template.webdir = self.webdir
        template.jsfile = 'xbmc.js'
        template.submenu = 'xbmc'
        return template.respond()

    @cherrypy.expose()
    def nzbsearch(self, **kwargs):
        template = Template(file=os.path.join(self.webdir, 'nzbsearch.tpl'), searchList=[self.config])
        template.appname = self.config['app_name']
        template.webdir = self.webdir
        template.jsfile = 'nzbsearch.js'
        template.submenu = 'nzbsearch'
        return template.respond()

    @cherrypy.expose()
    def json(self, *args, **kwargs):
        if len(args) == 0:
            return 'JSON error'

        page = args[0]

        if page == 'shutdown':
            return tools.shutdown()

        elif page == 'restart':
            return tools.restart()

        elif page == 'update':
            return tools.update()

        elif page == 'checkupdate':
            return tools.checkUpdate()

        elif page == 'diskspace':
            return tools.getDiskspace()
                    
        elif page == 'sabnzbd' and self.config.get('use_sabnzbd'):
            host = self.config.get('sabnzbd_host')
            port = self.config.get('sabnzbd_port')
            apikey = self.config.get('sabnzbd_apikey')
            ssl = self.config.get('sabnzbd_ssl')
            return sabnzbd(host,port,apikey,ssl).sendRequest(kwargs)
        
        elif page == 'couchpotato' and self.config.get('use_couchpotato'):
            host = self.config.get('couchpotato_host')
            port = self.config.get('couchpotato_port')
            apikey = self.config.get('couchpotato_apikey')
            return couchpotato(host,port,apikey).sendRequest(kwargs)

        elif page == 'sickbeard' and self.config.get('use_sickbeard'):
            host = self.config.get('sickbeard_host')
            port = self.config.get('sickbeard_port')
            apikey = self.config.get('sickbeard_apikey')
            return sickbeard(host,port,apikey).sendRequest(kwargs)

        elif page == 'squeezebox' and self.config.get('use_squeezebox'):
            host = self.config.get('squeezebox_host')
            port = self.config.get('squeezebox_port')
            username = self.config.get('squeezebox_username','')
            password = self.config.get('squeezebox_password','')
            return squeezebox(host,port,username,password).sendRequest(kwargs)

        elif page == 'nzbsearch' and self.config.get('use_nzbsearch'):
            apikey = self.config.get('nzbmatrix_apikey')
            return nzbsearch(apikey).sendRequest(kwargs)

        elif page == 'xbmc' and self.config.get('use_xbmc'):
            host = self.config.get('xbmc_host')
            port = self.config.get('xbmc_port')
            username = self.config.get('xbmc_username')
            password = self.config.get('xbmc_password')
            hidewatched = self.config.get('xbmc_hide_watched')
            ignorearticle = self.config.get('xbmc_ignore_articles',1)
            return xbmc(host,port,username,password,self.root,hidewatched,ignorearticle).sendRequest(kwargs)
import os, cherrypy

from Cheetah.Template import Template

from htpc.sabnzbd import sabnzbd
from htpc.couchpotato import couchpotato
from htpc.sickbeard import sickbeard
from htpc.nzbsearch import nzbsearch
from htpc.xbmc import xbmc
from htpc.squeezebox import squeezebox
from htpc.tools import *

class pageHandler:
    def __init__(self, configfile):
        self.root = os.getcwd()
        self.configfile = configfile
        self.config = readSettings(configfile)
        self.webdir = os.path.join(self.root, 'interfaces', self.config['template'])

    @cherrypy.expose()
    def index(self):
        template = Template(file=os.path.join(self.webdir, 'main.tpl'), searchList=[self.config]);
        template.appname = self.config['app_name']
        template.webdir = self.webdir
        template.submenu = ''
        template.jsfile = 'main.js'
        return template.respond()

    @cherrypy.expose()
    def settings(self, **kwargs):
        if kwargs:
            self.config = saveSettings(self.configfile,kwargs)

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
    def json(self, **args):
        if args.get('which') == 'system':
            if args.get('action') == 'shutdown':
                return shutdown()
            if args.get('action') == 'restart':
                return restart()
            if args.get('action') == 'update':
                return update()
            if args.get('action') == 'checkupdate':
                return checkUpdate()
            if args.get('action') == 'diskspace':
                return getDiskspace()
                    
        if args.get('which') == 'sabnzbd' and self.config.get('use_sabnzbd'):
            host = self.config.get('sabnzbd_host')
            port = self.config.get('sabnzbd_port')
            apikey = self.config.get('sabnzbd_apikey')
            ssl = self.config.get('sabnzbd_ssl')
            return sabnzbd(host,port,apikey,ssl).sendRequest(args)
        
        if args.get('which') == 'couchpotato' and self.config.get('use_couchpotato'):
            host = self.config.get('couchpotato_host')
            port = self.config.get('couchpotato_port')
            apikey = self.config.get('couchpotato_apikey')
            return couchpotato(host,port,apikey).sendRequest(args)

        if args.get('which') == 'sickbeard' and self.config.get('use_sickbeard'):
            host = self.config.get('sickbeard_host')
            port = self.config.get('sickbeard_port')
            apikey = self.config.get('sickbeard_apikey')
            return sickbeard(host,port,apikey).sendRequest(args)

        if args.get('which') == 'squeezebox' and self.config.get('use_squeezebox'):
            host = self.config.get('squeezebox_host')
            port = self.config.get('squeezebox_port')
            username = self.config.get('squeezebox_username','')
            password = self.config.get('squeezebox_password','')
            return squeezebox(host,port,username,password).sendRequest(args)

        if args.get('which') == 'nzbsearch' and self.config.get('use_nzbsearch'):
            apikey = self.config.get('nzbmatrix_apikey')
            return nzbsearch(apikey).sendRequest(args)

        if args.get('which') == 'xbmc' and self.config.get('use_xbmc'):
            host = self.config.get('xbmc_host')
            port = self.config.get('xbmc_port')
            username = self.config.get('xbmc_username')
            password = self.config.get('xbmc_password')
            hidewatched = self.config.get('xbmc_hide_watched')
            ignorearticle = self.config.get('xbmc_ignore_articles',1)
            return xbmc(host,port,username,password,self.root,hidewatched,ignorearticle).sendRequest(args)


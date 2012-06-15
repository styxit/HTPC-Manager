import os
import cherrypy

from Cheetah.Template import Template

from htpc.sabnzbd import sabnzbd
from htpc.nzbsearch import nzbsearch
from htpc.sickbeard import sickbeard
from htpc.xbmc import xbmc
from htpc.settings import readSettings, saveSettings, removeThumbs
from htpc.squeezebox import squeezebox

import ConfigParser

class pageHandler:
    def __init__(self, configfile):
        self.configfile = configfile
        self.root = os.getcwd()
        self.config = readSettings(configfile)
        self.webdir = os.path.join(os.getcwd(), 'templates', self.config['template'])

    # Frontpage
    @cherrypy.expose()
    def index(self):
        template = Template(file=os.path.join(self.webdir, 'main.tpl'), searchList=[self.config]);
        template.appname = self.config['app_name']
        template.webdir = self.webdir
        template.submenu = ''
        template.jsfile = 'main.js'
        return template.respond()

    @cherrypy.expose()
    def shutdown(self):
         cherrypy.engine.exit()
         return "Shutdown complete!"

    @cherrypy.expose()
    def settings(self, **kwargs):
        if kwargs:
            if kwargs.has_key('save_settings'):
                del kwargs['save_settings']
                if not kwargs.has_key('use_sabnzbd'):
                    kwargs['use_sabnzbd'] = 0
                if not kwargs.has_key('use_sickbeard'):
                    kwargs['use_sickbeard'] = 0
                if not kwargs.has_key('use_squeezebox'):
                    kwargs['use_squeezebox'] = 0
                if not kwargs.has_key('use_xbmc'):
                    kwargs['use_xbmc'] = 0
                if not kwargs.has_key('use_nzbsearch'):
                    kwargs['use_nzbsearch'] = 0
                if not kwargs.has_key('xbmc_show_banners'):
                    kwargs['xbmc_show_banners'] = 0
                if not kwargs.has_key('xbmc_hide_watched'):
                    kwargs['xbmc_hide_watched'] = 0
                self.config = saveSettings(self.configfile,kwargs)

            if kwargs.has_key('regenerate_thumbs'):
                removeThumbs(self.config['userdir'])

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
        if args.get('which') == 'sabnzbd' and self.config.get('use_sabnzbd'):
            host = self.config.get('sabnzbd_host')
            port = self.config.get('sabnzbd_port')
            apikey = self.config.get('sabnzbd_apikey')
            ssl = self.config.get('sabnzbd_ssl')
            return sabnzbd(host,port,apikey,ssl).sendRequest(args)

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
            userdir = os.path.join(self.root, self.config.get('userdir'))
            return xbmc(host,port,username,password,userdir,hidewatched).sendRequest(args)

import os
import sys
import cherrypy
import htpc.settings

from Cheetah.Template import Template

from htpc.sabnzbd import sabnzbdGetHistory
from htpc.sabnzbd import sabnzbdGetStatus
from htpc.sabnzbd import sabnzbdGetWarnings
from htpc.sabnzbd import sabnzbdTogglePause
from htpc.sabnzbd import sabnzbdAddNzbFromUrl
from htpc.sabnzbd import sabnzbdDeleteNzb
from htpc.sabnzbd import sabnzbdDeleteHistory
from htpc.sabnzbd import sabnzbdRetry
from htpc.sabnzbd import sabnzbdGetCategories
from htpc.sabnzbd import sabnzbdChangeCategory
from htpc.sabnzbd import sabnzbdSetSpeed

from htpc.sickbeard import sbGetShowList
from htpc.sickbeard import sbGetPoster
from htpc.sickbeard import sbGetNextAired
from htpc.sickbeard import sbGetHistory
from htpc.sickbeard import sbSearchShow
from htpc.sickbeard import sbGetLogs
from htpc.sickbeard import sbAddShow
from htpc.sickbeard import sbGetShow

from htpc.xbmc import xbmcGetMovies
from htpc.xbmc import xbmcGetThumb
from htpc.xbmc import xbmcGetShows
from htpc.xbmc import xbmcPlayItem
from htpc.xbmc import xbmcGetShow
from htpc.xbmc import xbmcNowPlaying
from htpc.xbmc import xbmcControlPlayer
from htpc.xbmc import xbmcNotify
from htpc.xbmc import xbmcGetRecentMovies
from htpc.xbmc import xbmcGetRecentShows
from htpc.xbmc import xbmcGetRecentAlbums

from htpc.nzbsearch import searchNZBs

root = os.getcwd()

# Create userdata folder if it doesnt exist
userdata = os.path.join(root, 'userdata/')
if not os.path.isdir(userdata):
    os.makedirs(userdata)

# Settings
settingsfile = os.path.join(userdata, 'config.cfg')
config = htpc.settings.readSettings()

appname = 'HTPC Manager'
host = config.get('my_host','0.0.0.0')
port = config.get('my_port',8084)
daemonize = config.get('daemonize',0)
username = config.get('my_username','')
password = config.get('my_password','')

class pageHandler:
    def __init__(self):
        self.template = config.get('template','default')
        self.webdir = os.path.join(root, 'interfaces/', self.template)

    # Frontpage
    @cherrypy.expose()
    def index(self):
        template = Template(file=os.path.join(self.webdir, 'main.tpl'), searchList=[config]);
        template.appname = appname
        template.webdir = self.webdir
        template.submenu = ''
        template.jsfile = 'main.js'
        return template.respond()

    @cherrypy.expose()
    def test(self):
        return "True"

    @cherrypy.expose()
    def shutdown(self):
         cherrypy.engine.exit()
         return "Shutdown complete"

    @cherrypy.expose()
    def settings(self, **kwargs):
        global config
        if kwargs:
            if kwargs.has_key('save_settings'):
                del kwargs['save_settings']
                if not kwargs.has_key('daemonize'):
                    kwargs['daemonize'] = 0
                if not kwargs.has_key('use_nzb'):
                    kwargs['use_nzb'] = 0
                if not kwargs.has_key('use_sb'):
                    kwargs['use_sb'] = 0
                if not kwargs.has_key('use_xbmc'):
                    kwargs['use_xbmc'] = 0
                if not kwargs.has_key('use_nzbmatrix'):
                    kwargs['use_nzbmatrix'] = 0
                if not kwargs.has_key('xbmc_show_banners'):
                    kwargs['xbmc_show_banners'] = 0
                htpc.settings.saveSettings(kwargs)
                config = htpc.settings.readSettings()

            if kwargs.has_key('regenerate_thumbs'):
                htpc.settings.removeThumbs()

        template = Template(file=os.path.join(self.webdir, 'settings.tpl'), searchList=[config])
        template.appname = appname
        template.webdir = self.webdir
        template.jsfile = 'settings.js'
        template.submenu = 'settings'

        return template.respond()

    @cherrypy.expose()
    def sabnzbd(self, **kwargs):
        template = Template(file=os.path.join(self.webdir, 'sabnzbd.tpl'), searchList=[config])
        template.appname = appname
        template.jsfile = 'sabnzbd.js'
        template.webdir = self.webdir
        template.submenu = 'sabnzbd'

        return template.respond()

    @cherrypy.expose()
    def sickbeard(self, **args):
        template = Template(file=os.path.join(self.webdir, 'sickbeard.tpl'), searchList=[config])
        template.jsfile = 'sickbeard.js'

        template.appname = appname
        template.webdir = self.webdir
        template.submenu = 'sickbeard'

        return template.respond()

    @cherrypy.expose()
    def xbmc(self, **args):
        template = Template(file=os.path.join(self.webdir, 'xbmc.tpl'), searchList=[config])
        template.jsfile = 'xbmc.js'

        template.appname = appname
        template.webdir = self.webdir
        template.submenu = 'xbmc'

        return template.respond()

    @cherrypy.expose()
    def nzbsearch(self, **kwargs):
        template = Template(file=os.path.join(self.webdir, 'nzbsearch.tpl'), searchList=[config])
        template.appname = appname
        template.jsfile = 'nzbsearch.js'
        template.webdir = self.webdir
        template.submenu = 'nzbsearch'

        return template.respond()

    @cherrypy.expose()
    def json(self, **args):

        # Kijken welke actie we moeten ondernemen
        if args.get('which') == 'sabnzbd':
            if args.get('action') == 'history':
                return sabnzbdGetHistory(args.get('limit'))
            if args.get('action') == 'status':
                return sabnzbdGetStatus()
            if args.get('action') == 'warnings':
                return sabnzbdGetWarnings()
            if args.get('action') == 'pause' or args.get('action') == 'resume':
                return sabnzbdTogglePause(args.get('action'))
            if args.get('action') == 'addnzb':
                return sabnzbdAddNzbFromUrl(args.get('nzb_url'), args.get('nzb_category'))
            if args.get('action') == 'delete':
                return sabnzbdDeleteNzb(args.get('id'))
            if args.get('action') == 'deletehistory':
                return sabnzbdDeleteHistory(args.get('id'))
            if args.get('action') == 'retry':
                return sabnzbdRetry(args.get('id'))
            if args.get('action') == 'categories':
                return sabnzbdGetCategories()
            if args.get('action') == 'change_cat':
                return sabnzbdChangeCategory(args.get('id'), args.get('value'))
            if args.get('action') == 'speed':
                return sabnzbdSetSpeed(args.get('value'))

        if args.get('which') == 'sickbeard':
            if args.get('action') == 'showlist':
                return sbGetShowList()
            if args.get('action') == 'nextaired':
                return sbGetNextAired()
            if args.get('action') == 'getposter':
                return sbGetPoster(args.get('tvdbid'))
            if args.get('action') == 'history':
                return sbGetHistory(args.get('limit'))
            if args.get('action') == 'searchtvdb':
                return sbSearchShow(args.get('query'))
            if args.get('action') == 'logs':
                return sbGetLogs()
            if args.get('action') == 'addshow':
                return sbAddShow(args.get('tvdbid'))
            if args.get('action') == 'getshow':
                return sbGetShow(args.get('tvdbid'))

        if args.get('which') == 'xbmc':
            if args.get('action') == 'movies':
                return xbmcGetMovies()
            if args.get('action') == 'thumb':
                opacity = 100
                if args.has_key('o'):
                    opacity = args.get('o')
                return xbmcGetThumb(args.get('thumb'), args.get('w'), args.get('h'), opacity)
            if args.get('action') == 'shows':
                return xbmcGetShows()
            if args.get('action') == 'play':
                return xbmcPlayItem(args.get('item'))
            if args.get('action') == 'getshow':
                return xbmcGetShow(args.get('item'))
            if args.get('action') == 'nowplaying':
                return xbmcNowPlaying()
            if  args.get('action') == 'controlplayer':
                return xbmcControlPlayer(args.get('do'));
            if  args.get('action') == 'notify':
                return xbmcNotify(args.get('text'));
            if  args.get('action') == 'recentmovies':
                return xbmcGetRecentMovies()
            if  args.get('action') == 'recentshows':
                return xbmcGetRecentShows()
            if  args.get('action') == 'recentalbums':
                return xbmcGetRecentAlbums()

        if args.get('which') == 'nzbsearch':
            if args.has_key('query'):
                return searchNZBs(args.get('query'))

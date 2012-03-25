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

# Standaard variabelen
host = "0.0.0.0"
port = 8084
root = os.path.dirname(os.path.abspath(sys.argv[0]))
password = ''

# Userdata folder maken
userdata = os.path.join(root, 'userdata/')
if not os.path.isdir(userdata):
    os.makedirs(userdata)

# Settings file
settingsfile = os.path.join(userdata, 'config.cfg')
config = htpc.settings.readSettings()

if config.has_key('my_port') and config.get('my_port') != '':
    configPort = config.get('my_port')
    port = int(configPort)

class pageHandler:
    def __init__(self, root):

        self.root = root
        self.webdir = os.path.join(self.root, 'interfaces/default/')
        self.appname = 'HTPC Manager'

    @cherrypy.expose()
    def index(self):
        # Searchlist voor template ophalen
        searchList = htpc.settings.readSettings()
        template = Template(file=os.path.join(self.webdir, 'main.tpl'), searchList=[searchList]);
        template.appname = self.appname
        template.webdir = self.webdir
        template.submenu = ''
        template.jsfile = 'main.js'
        return template.respond()

    @cherrypy.expose()
    def settings(self, **kwargs):

        # Als er een POST is
        if kwargs:
            if kwargs.has_key('save_settings'):
                if not kwargs.has_key('use_nzb'):
                    kwargs['use_nzb'] = 'no'
                if not kwargs.has_key('use_sb'):
                    kwargs['use_sb'] = 'no'
                if not kwargs.has_key('use_xbmc'):
                    kwargs['use_xbmc'] = 'no'
                if not kwargs.has_key('use_nzbmatrix'):
                    kwargs['use_nzbmatrix'] = 'no'
                if not kwargs.has_key('xbmc_show_banners'):
                    kwargs['xbmc_show_banners'] = 'no'
                htpc.settings.saveSettings(kwargs)

            if kwargs.has_key('regenerate_thumbs'):
                htpc.settings.removeThumbs()

            raise cherrypy.HTTPRedirect('')


        # Searchlist voor template ophalen
        searchList = htpc.settings.readSettings()

        # Template vullen
        template = Template(file=os.path.join(self.webdir, 'settings.tpl'), searchList=[searchList])
        template.appname = self.appname
        template.webdir = self.webdir
        template.jsfile = 'settings.js'
        template.submenu = 'settings'

        return template.respond()

    @cherrypy.expose()
    def sabnzbd(self, **kwargs):

        # Searchlist voor template ophalen
        searchList = htpc.settings.readSettings()

        # Template vullen
        template = Template(file=os.path.join(self.webdir, 'sabnzbd.tpl'), searchList=[searchList])
        template.appname = self.appname
        template.jsfile = 'sabnzbd.js'
        template.webdir = self.webdir
        template.submenu = 'sabnzbd'

        return template.respond()

    @cherrypy.expose()
    def sickbeard(self, **args):

        # Searchlist voor template ophalen
        searchList = htpc.settings.readSettings()

        # Template vullen
        template = Template(file=os.path.join(self.webdir, 'sickbeard.tpl'), searchList=[searchList])
        template.jsfile = 'sickbeard.js'

        template.appname = self.appname
        template.webdir = self.webdir
        template.submenu = 'sickbeard'

        return template.respond()

    @cherrypy.expose()
    def xbmc(self, **args):

        # Searchlist voor template ophalen
        searchList = htpc.settings.readSettings()

        # Template vullen
        template = Template(file=os.path.join(self.webdir, 'xbmc.tpl'), searchList=[searchList])
        template.jsfile = 'xbmc.js'

        template.appname = self.appname
        template.webdir = self.webdir
        template.submenu = 'xbmc'

        return template.respond()

    @cherrypy.expose()
    def nzbsearch(self, **kwargs):

        # Searchlist voor template ophalen
        searchList = htpc.settings.readSettings()

        # Template vullen
        template = Template(file=os.path.join(self.webdir, 'nzbsearch.tpl'), searchList=[searchList])
        template.appname = self.appname
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

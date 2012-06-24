import sys, os, shutil
import ConfigParser, cherrypy
from urllib2 import urlopen
from json import dumps

def SafeFetchFromUrl(url):
    try:
	    return urlopen(url).read()
    except:
	    return ''

def readSettings(configfile, section = 'htpc'):
    if not os.path.isfile(configfile):
	    return {}

    config = ConfigParser.ConfigParser()
    config.read(configfile)
    items = config.items(section)

    configDict = {}
    for key, val in items:
        try:
            configDict[key] = int(val)
        except ValueError:
            configDict[key] = val
    return configDict

def saveSettings(configfile, data, section = 'htpc'):
    # Set unchecked checkboxes to 0
    if not data.has_key('use_sabnzbd'):
        data['use_sabnzbd'] = 0
    if not data.has_key('use_sickbeard'):
        data['use_sickbeard'] = 0
    if not data.has_key('use_squeezebox'):
        data['use_squeezebox'] = 0
    if not data.has_key('use_xbmc'):
        data['use_xbmc'] = 0
    if not data.has_key('use_nzbsearch'):
        data['use_nzbsearch'] = 0
    if not data.has_key('xbmc_show_banners'):
        data['xbmc_show_banners'] = 0
    if not data.has_key('xbmc_hide_watched'):
        data['xbmc_hide_watched'] = 0

    config = ConfigParser.ConfigParser()
    config.read(configfile)

    if not config.has_section(section):
	    config.add_section(section)

    for key, val in data.items():
	    config.set(section, key, val)

    with open(configfile, 'w') as f:
	    config.write(f)

    return readSettings(configfile)

def removeThumbs():
    xbmc_thumbs = os.path.join('userdata/', '/xbmc_thumbs/')
    if os.path.isdir(xbmc_thumbs):
	    shutil.rmtree(xbmc_thumbs)
        
def getDiskspace():
    return dumps({})

def shutdown():
    cherrypy.engine.exit()
    sys.exit(0)

def restart():
    cherrypy.engine.exit()
    arguments = sys.argv[:]
    arguments.insert(0, sys.executable)
    if sys.platform == 'win32':
	    arguments = ['"%s"' % arg for arg in arguments]
    os.chdir(os.getcwd())
    os.execv(sys.executable, arguments)

def checkUpdate():
    return dumps({'available' : 0})

def update():
    cherrypy.engine.exit()
    '''
    Do update stuff...
    '''
    cherrypy.server.start()
    return dumps({'update' : 'success'})
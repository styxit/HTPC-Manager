import os, shutil, ConfigParser
import htpc
from urllib2 import urlopen

def SafeFetchFromUrl(url):
    try:
        return urlopen(url, timeout=5).read()
    except:
        return ''

def readSettings(section='htpc'):
    configDict = {}

    if os.path.isfile(htpc.config):
        config = ConfigParser.ConfigParser()
        config.read(htpc.config)
        items = config.items(section)

        for key, val in items:
            try:
                configDict[key] = int(val)
            except ValueError:
                configDict[key] = val

    if section == 'htpc':
        htpc.template = os.path.join('interfaces/', configDict.get('template','default'))
        htpc.webdir = os.path.join(htpc.rundir, htpc.template)
        templates = os.listdir("interfaces/")
        themes = os.listdir(os.path.join(htpc.template, "css/themes/"))
        configDict.update({
            'template': htpc.template,
            'webdir': htpc.webdir,
            'templates': templates,
            'themes': themes
        })

    return configDict

def saveSettings(data, section='htpc'):
    # Set unchecked checkboxes to 0
    checkboxes = ('use_sabnzbd', 'use_couchpotato', 'use_squeezebox', 'use_xbmc', 'use_nzbsearch',
                  'xbmc_show_banners', 'xbmc_hide_watched', 'use_dash_rec_movies', 'use_dash_rec_tv',
                  'use_dash_rec_music', 'use_dash_sickbeard', 'use_dash_couchpotato', 'use_dash_sabnzbd')
    for box in checkboxes:
        if not data.has_key(box):
            data[box] = 0
        
    config = ConfigParser.ConfigParser()
    config.read(htpc.config)

    if not config.has_section(section):
        config.add_section(section)

    for key, val in data.items():
        config.set(section, key, val)

    with open(htpc.config, 'w') as f:
        config.write(f)

    return readSettings()

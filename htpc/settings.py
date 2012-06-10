import ConfigParser
import htpc
import os
import shutil

def saveSettings(data, section = 'htpc'):

    config = ConfigParser.ConfigParser()
    config.read(htpc.settingsfile)

    if not config.has_section(section):
        config.add_section(section)

    for key in data:
        val = data.get(key)
        config.set(section, key, val)

    with open(htpc.settingsfile, 'w') as configfile:
        config.write(configfile)

def readSettings():
    if not os.path.isfile(htpc.settingsfile):
        return {}
    else:

        config = ConfigParser.ConfigParser()
        config.read(htpc.settingsfile)
        items = config.items('htpc')

        toReturn = {}
        for key, val in items:
            try:
                toReturn[key] = int(val)
            except ValueError:
                toReturn[key] = val
        return toReturn

def removeThumbs():
    xbmc_thumbs = os.path.join(htpc.userdata, 'xbmc_thumbs/')
    if os.path.isdir(xbmc_thumbs):
        shutil.rmtree(xbmc_thumbs)

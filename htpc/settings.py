import ConfigParser
import os, shutil

def saveSettings(configfile, data, section = 'htpc'):
    config = ConfigParser.ConfigParser()
    config.read(configfile)

    if not config.has_section(section):
        config.add_section(section)

    for key, val in data.items():
        config.set(section, key, val)

    with open(configfile, 'w') as f:
        config.write(f)

    return readSettings(configfile)

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

def removeThumbs(userdata):
    xbmc_thumbs = os.path.join(userdata, 'xbmc_thumbs/')
    if os.path.isdir(xbmc_thumbs):
        shutil.rmtree(xbmc_thumbs)

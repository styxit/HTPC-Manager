import urllib2
import urllib
from settings import readSettings
from json import dumps

def searchFetchDataFromUrl(url):
    try:
        data = urllib2.urlopen(url)
        return data.read()
    except:
        return ''

def nzbMatrixMakeUrl(options):
    config = readSettings()
    if config.has_key('nzbmatrix_apikey'):
        url = 'http://api.nzbmatrix.com/v1.1/search.php?apikey=' + config.get('nzbmatrix_apikey') + '&' + urllib.urlencode(options)
        return url

def nzbMatrixSearch(query, catid):
    options = {
        'search': query,
        'catid' : catid
    }
    url = nzbMatrixMakeUrl(options)
    data = searchFetchDataFromUrl(url)
    toReturn = {}
    itemCounter = 0;
    if data != 'error:nothing_found':
        items = data.split('|')
        for item in items:
            item = item.strip()
            if not toReturn.has_key(itemCounter):
                toReturn[itemCounter] = {}

            itemparts = item.split(';')
            for itempart in itemparts:
                itemdata = itempart.split(':', 1)
                try:
                    toReturn[itemCounter][itemdata[0].strip()] = itemdata[1].strip()
                except:
                    pass
            itemCounter = itemCounter + 1
        return toReturn


def searchNZBs(query):
    # Eventuele andere search providers hier aanroepen en resultatne dan samenvoegen
    searchTerm = query.encode('utf-8')
    return dumps(nzbMatrixSearch(searchTerm, ''))

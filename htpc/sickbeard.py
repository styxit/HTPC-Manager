import urllib2
import urllib
from settings import readSettings

def sbFetchDataFromUrl(url):
    try:
        data = urllib2.urlopen(url)
        return data
    except:
        return ''

def sbMakeUrl(command):
    config = readSettings()
    if config.has_key('sb_port') and config.has_key('sb_ip') and config.has_key('sb_apikey'):
        url = 'http://' + config.get('sb_ip') + ':' + str(config.get('sb_port')) + '/api/' + config.get('sb_apikey') + '/?cmd=' + command;
        return url

def sbGetShowList():
    data = sbFetchDataFromUrl(sbMakeUrl('shows'))
    return data

def sbGetNextAired():
    data = sbFetchDataFromUrl(sbMakeUrl('future'))
    return data

def sbGetPoster(tvdbid):
    data = sbFetchDataFromUrl(sbMakeUrl('show.getposter&tvdbid=' + str(tvdbid)))
    return data

def sbGetHistory(limit):
    data = sbFetchDataFromUrl(sbMakeUrl('history&limit=' + limit))
    return data

def sbGetLogs():
    data = sbFetchDataFromUrl(sbMakeUrl('logs&min_level=info'))
    return data

def sbSearchShow(seriename):
    print seriename
    seriename = urllib.quote(seriename)
    print seriename
    xmlData = sbFetchDataFromUrl('http://www.thetvdb.com/api/GetSeries.php?seriesname=' + seriename)
    return xmlData

def sbAddShow(tvdbid):
    data = sbFetchDataFromUrl(sbMakeUrl('show.addnew&tvdbid=' + tvdbid))
    return data

def sbGetShow(tvdbdid):
    data = sbFetchDataFromUrl(sbMakeUrl('show&tvdbid=' + tvdbdid))
    return data

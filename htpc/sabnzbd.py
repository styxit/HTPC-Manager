import urllib2
from settings import readSettings
from urllib import quote

def sabnzbdFetchDataFromUrl(url):
    data = urllib2.urlopen(url)
    return data

def sabnzbdMakeUrl(extrapart):
    config = readSettings();
    useSSL = '';
    if config.get('nzb_ssl') == 'yes':
        useSSL = 's';
    url = 'http' + useSSL + '://' + config.get('nzb_ip') + ':' + str(config.get('nzb_port')) + '/sabnzbd/api?' + extrapart + '&output=json&apikey=' + config.get('nzb_apikey') + '&ma_username=' + config.get('nzb_username') + '&ma_password=' + config.get('nzb_password');
    return url

def sabnzbdGetHistory(limit):
    data = sabnzbdFetchDataFromUrl(sabnzbdMakeUrl('mode=history&limit=' + str(limit)))
    return data

def sabnzbdGetStatus():
    data = sabnzbdFetchDataFromUrl(sabnzbdMakeUrl('mode=queue'))
    return data

def sabnzbdGetWarnings():
    data = sabnzbdFetchDataFromUrl(sabnzbdMakeUrl('mode=warnings'))
    return data

def sabnzbdTogglePause(mode):
    data = sabnzbdFetchDataFromUrl(sabnzbdMakeUrl('mode=' + mode))
    return data

def sabnzbdAddNzbFromUrl(url, cat):
    
    if url != '':
        category = ''
        if cat != '':
            category = '&cat=' + str(cat)
        nzburl = quote(url)

        data = sabnzbdFetchDataFromUrl(sabnzbdMakeUrl('mode=addurl&name=' + nzburl + category))
        return data

def sabnzbdDeleteNzb(id):
    data = sabnzbdFetchDataFromUrl(sabnzbdMakeUrl('mode=queue&name=delete&value=' + id))
    return data

def sabnzbdDeleteHistory(id):
    data = sabnzbdFetchDataFromUrl(sabnzbdMakeUrl('mode=history&name=delete&value=' + id))
    return data

def sabnzbdRetry(id):
    data = sabnzbdFetchDataFromUrl(sabnzbdMakeUrl('mode=retry&value=' + id))
    return data

def sabnzbdGetCategories():
    data = sabnzbdFetchDataFromUrl(sabnzbdMakeUrl('mode=get_cats'))
    return data

def sabnzbdChangeCategory(id, cat):
    data = sabnzbdFetchDataFromUrl(sabnzbdMakeUrl('mode=change_cat&value=' + id + '&value2=' + cat))
    return data

def sabnzbdSetSpeed(speed):
    data = sabnzbdFetchDataFromUrl(sabnzbdMakeUrl('mode=config&name=speedlimit&value=' + str(speed)))
    return data
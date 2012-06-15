from urllib2 import urlopen

def SafeFetchFromUrl(url):
    try:
        return urlopen(url).read()
    except:
        return ''

import cherrypy
import htpc
from htpc.proxy import get_image
from urllib import urlencode
from urllib2 import urlopen, quote
from re import findall
from json import loads
import logging

class Search:
    def __init__(self):
        self.logger = logging.getLogger('modules.search')
        htpc.MODULES.append({
            'name': 'Newznab',
            'id': 'nzbsearch',
            'test': htpc.WEBDIR + 'search/ping',
            'fields': [
                {'type':'bool', 'label':'Enable', 'name':'nzbsearch_enable'},
                {'type':'text', 'label':'Host', 'name':'newznab_host'},
                {'type':'text', 'label':'Apikey', 'name':'newznab_apikey'}
        ]})

    @cherrypy.expose()
    def index(self, query='', **kwargs):
        return htpc.LOOKUP.get_template('search.html').render(query=query, scriptname='search')

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def ping(self, newznab_host, newznab_apikey, **kwargs):
        self.logger.debug("Pinging newznab-host")
        return 1

    @cherrypy.expose()
    def thumb(self, url, h=None, w=None, o=100):
        if url.startswith('rageid'):
            settings = htpc.settings.Settings()
            host = settings.get('newznab_host', '')

            if 'http://' in host:
                url = host + '/covers/tv/' + url[6:] + '.jpg'
            else:
                url = 'http://' + host + '/covers/tv/' + url[6:] + '.jpg'

        return get_image(url, h, w, o)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def getcategories(self, **kwargs):
        self.logger.debug("Fetching available categories")
        return self.fetch('caps')['categories']

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def search(self, q='', cat='', **kwargs):
        if cat:
            cat = '&cat=' + cat
        result = self.fetch('search&q=' + quote(q) + cat + '&extended=1')
        try:
            return result['channel']['item']
        except:
            return result

    def fetch(self, cmd):
        try:
            settings = htpc.settings.Settings()
            host = settings.get('newznab_host', '')
            apikey = settings.get('newznab_apikey', '')

            if 'http://' in host:
                url = host + '/api?o=json&apikey=' + apikey + '&t=' + cmd
            else:
                url = 'http://' + host + '/api?o=json&apikey=' + apikey + '&t=' + cmd

            self.logger.debug("Fetching information from: " + url)
            return loads(urlopen(url, timeout=10).read())
        except:
            self.logger.error("Unable to fetch information from: " + url)
            return

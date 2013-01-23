import cherrypy
import htpc
from urllib import urlencode
from urllib2 import urlopen, quote
from re import findall
from json import loads

class Search:
    def __init__(self):
        htpc.MODULES.append({
            'name': 'Newznab',
            'id': 'nzbsearch',
            'test': '/search/ping',
            'fields': [
                {'type':'bool', 'label':'Enable', 'name':'nzbsearch_enable'},
                {'type':'text', 'label':'Host', 'name':'newznab_host'},
                {'type':'text', 'label':'Apikey', 'name':'newznab_apikey'}
        ]})

    @cherrypy.expose()
    def index(self, query='', **kwargs):
        return htpc.LOOKUP.get_template('search.html').render(query=query)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def ping(self, newznab_host, newznab_apikey, **kwargs):
        return 1

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def getcategories(self, **kwargs):
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
        settings = htpc.settings.Settings()
        host = settings.get('newznab_host', '')
        apikey = settings.get('newznab_apikey', '')
        url = 'http://' + host + '/api?o=json&apikey=' + apikey + '&t=' + cmd
        return loads(urlopen(url, timeout=10).read())
        try:
            return
        except:
            return

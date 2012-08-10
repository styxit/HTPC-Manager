import os, cherrypy, htpc
from urllib import urlencode
from re import findall
from json import dumps
from htpc.tools import template, SafeFetchFromUrl

class Search:
    def __init__(self):
        self.url = 'http://api.nzbmatrix.com/v1.1/'
        self.apikey = htpc.settings.get('nzbmatrix_apikey', '')

    @cherrypy.expose()
    def index(self, *args, **kwargs):
        if kwargs.has_key('query'):
            return self.nzbMatrixSearch({
                'search': kwargs.get('query',''),
                'catid' : kwargs.get('catid','')
            }, 
                'search.php'
            )
        elif kwargs.has_key('nzbid'):
            return self.nzbMatrixSearch({
                'id': kwargs.get('nzbid','')
            },
                'details.php'
            )

        searchString = kwargs.get('search','')
        htpc.settings.update({'search':searchString})
        return template('search.html')

    def nzbMatrixSearch(self, options, page):
        url = self.url + page + '?apikey='+self.apikey+'&'
        source = SafeFetchFromUrl(url+urlencode(options)).decode("cp1252").encode('utf-8')

        if source.startswith('error'):
            return source

        data = {}
        for index, text in enumerate(source[:-2].split('\n|\n')):
            data[index] = {}
            for item in findall("(.*?):(.*?);", text):
                data[index][item[0]] = item[1]

        return dumps(data)

    @cherrypy.expose()
    def getNzbMatrixCategories(self):
        return dumps([
            {'id': 0, 'name': 'Everything'},
            {'label': 'Movies', 'value': [
                {'id': 1, 'name': 'Movies: DVD'},
                {'id': 2, 'name': 'Movies: Divx/Xvid'},
                {'id': 54, 'name': 'Movies: BRRip'},
                {'id': 42, 'name': 'Movies: HD (x264)'},
                {'id': 50, 'name': 'Movies: HD (Image)'},
                {'id': 48, 'name': 'Movies: WMV-HD'},
                {'id': 3, 'name': 'Movies: SVCD/VCD'},
                {'id': 4, 'name': 'Movies: Other'},
            ]},
            {'label': 'TV', 'value': [
                {'id': 5, 'name': 'TV: DVD'},
                {'id': 6, 'name': 'TV: Divx/Xvid'},
                {'id': 41, 'name': 'TV: HD'},
                {'id': 7, 'name': 'TV: Sport/Ent'},
                {'id': 8, 'name': 'TV: Other'},
            ]},
            {'label': 'Documentaries', 'value': [
                {'id': 9, 'name': 'Documentaries: STD'},
                {'id': 53, 'name': 'Documentaries: HD'},
            ]},
            {'label': 'Games', 'value': [
                {'id': 10, 'name': 'Games: PC'},
                {'id': 11, 'name': 'Games: PS2'},
                {'id': 43, 'name': 'Games: PS3'},
                {'id': 12, 'name': 'Games: PSP'},
                {'id': 13, 'name': 'Games: Xbox'},
                {'id': 14, 'name': 'Games: Xbox360'},
                {'id': 56, 'name': 'Games: Xbox360 (Other)'},
                {'id': 15, 'name': 'Games: PS1'},
                {'id': 16, 'name': 'Games: Dreamcast'},
                {'id': 44, 'name': 'Games: Wii'},
                {'id': 51, 'name': 'Games: Wii VC'},
                {'id': 45, 'name': 'Games: DS'},
                {'id': 46, 'name': 'Games: GameCube'},
                {'id': 17, 'name': 'Games: Other'},
            ]},
            {'label': 'Apps', 'value': [
                {'id': 18, 'name': 'Apps: PC'},
                {'id': 19, 'name': 'Apps: Mac'},
                {'id': 52, 'name': 'Apps: Portable'},
                {'id': 20, 'name': 'Apps: Linux'},
                {'id': 55, 'name': 'Apps: Phone'},
                {'id': 21, 'name': 'Apps: Other'},
            ]},
            {'label': 'Music', 'value': [
                {'id': 22, 'name': 'Music: MP3 Albums'},
                {'id': 47, 'name': 'Music: MP3 Singles'},
                {'id': 23, 'name': 'Music: Lossless'},
                {'id': 24, 'name': 'Music: DVD'},
                {'id': 25, 'name': 'Music: Video'},
                {'id': 27, 'name': 'Music: Other'},
            ]},
            {'label': 'Anime', 'value': [
                {'id': 28, 'name': 'Anime: ALL'},
            ]},
            {'label': 'Other', 'value': [
                {'id': 49, 'name': 'Other: Audio Books'},
                {'id': 33, 'name': 'Other: Emulation'},
                {'id': 34, 'name': 'Other: PPC/PDA'},
                {'id': 26, 'name': 'Other: Radio'},
                {'id': 36, 'name': 'Other: E-Books'},
                {'id': 37, 'name': 'Other: Images'},
                {'id': 38, 'name': 'Other: Mobile Phone'},
                {'id': 39, 'name': 'Other: Extra Pars/Fills'},
                {'id': 40, 'name': 'Other: Other'},
            ]}
        ])

htpc.root.search = Search()

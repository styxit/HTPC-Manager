#!/usr/bin/env python
# -*- coding: utf-8 -*-

import cherrypy
import htpc
from htpc.helpers import get_image, fan_art, tvmaze
import urllib2
import logging
from cherrypy.lib.auth2 import require, member_of
import requests
import concurrent.futures as cf
from requests_futures.sessions import FuturesSession
from sqlobject import SQLObject, SQLObjectNotFound
from sqlobject.col import StringCol
from htpc.helpers import striphttp
import xmltodict


class NewznabIndexers(SQLObject):
    """ SQLObject class for NewznabIndexers table """
    name = StringCol()
    host = StringCol()
    apikey = StringCol()
    use_ssl = StringCol(default=None)
    apiurl = StringCol(default=None)

    class sqlmeta(object):
        fromDatabase = True


class Newznab(object):
    def __init__(self):
        self.logger = logging.getLogger('modules.newznab')
        self.headers = {'User-Agent': 'HTPC-Manager'}
        NewznabIndexers.createTable(ifNotExists=True)
        htpc.MODULES.append({
            'name': 'Newznab',
            'action': htpc.WEBDIR + 'newznab/setindexer',
            'id': 'newznab',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'newznab_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'newznab_name'},
                {'type': 'bool', 'label': 'Show link in menu', 'name': 'newznab_show_in_menu'},
                {'type': 'select',
                 'label': 'Indexers',
                 'name': 'newznab_indexer_id',
                 'options': [
                        {'name': 'New', 'value': 0}
                    ]
                },
                {'type': 'text', 'label': 'Name', 'name': 'newznab_indexer_name'},
                {'type': 'text', 'label': 'API URL', 'name': 'newznab_indexer_host'},
                {'type': 'text', 'label': 'API KEY', 'name': 'newznab_indexer_apikey'},
                {'type': 'bool', 'label': 'Use SSL', 'name': 'newznab_indexer_ssl'},

            ]
        })
        index = htpc.settings.get('newznab_current_indexer', 0)
        self.changeindexer(index)

    @cherrypy.expose()
    @require()
    def index(self, query='', **kwargs):
        return htpc.LOOKUP.get_template('newznab.html').render(query=query, scriptname='newznab')

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def getindexer(self, id=None):
        if id:
            """ Get NewznabIndexers server info """
            try:
                indexers = NewznabIndexers.selectBy(id=id).getOne()
                return dict((c, getattr(indexers, c)) for c in indexers.sqlmeta.columns)
            except SQLObjectNotFound:
                return

        """ Get a list of all servers and the current server """
        all_indexers = []
        for i in NewznabIndexers.select():
            all_indexers.append({'id': i.id, 'name': i.name})

        if not all_indexers:
            return

        try:
            current = self.current.name
        except AttributeError:
            current = None
        return {'current': current, 'indexers': all_indexers}

    @cherrypy.expose()
    @require(member_of("admin"))
    def delindexer(self, id):
        """ Delete a server """
        self.logger.debug("Deleting indexer %s" % id)
        NewznabIndexers.delete(id)
        self.changeindexer()
        return

    @cherrypy.expose()
    @require(member_of(htpc.role_admin))
    @cherrypy.tools.json_out()
    def changeindexer(self, id=0):
        try:
            self.current = NewznabIndexers.selectBy(id=id).getOne()
            htpc.settings.set('newznab_current_indexer', str(id))
            return "success"
        except SQLObjectNotFound:
            try:
                self.current = NewznabIndexers.select(limit=1).getOne()
                self.logger.error("Invalid indexer. Selecting first Available.")
                return "success"
            except SQLObjectNotFound:
                self.current = None
                self.logger.warning("No configured Indexers.")
                return "No valid indexers"

    @cherrypy.tools.json_out()
    @cherrypy.expose()
    @require(member_of(htpc.role_admin))
    def setindexer(self, **kw):
        """
        newznab_enable='',
        newznab_name='',
        newznab_show_in_menu='',
        newznab_indexer_id='',
        newznab_indexer_name='',
        newznab_indexer_host='',
        newznab_indexer_apikey='',
        newznab_indexer_ssl='',
        """
        # kw is empty if kw is predef to ''
        for k, v in kw.items():
            if k not in ('newznab_enable', 'newznab_name', 'newznab_show_in_menu',
                         'newznab_indexer_id', 'newznab_indexer_name',
                         'newznab_indexer_host', 'newznab_indexer_apikey', 'newznab_indexer_ssl'):
                            del kw[k]

            # protection against the hack
            # only allow correct kw be save to db
            if k in ['newznab_enable', 'newznab_name', 'newznab_show_in_menu']:
                htpc.settings.set(k, v)

        # Clean hostname
        host = striphttp(kw.get('newznab_indexer_host')).rstrip('/')

        # make the search url
        ssl = 's' if kw.get('newznab_indexer_ssl') == 'on' else ''

        apiurl = 'http%s://%s/api?o=xml&apikey=%s&t=' % (ssl, host, kw.get('newznab_indexer_apikey'))

        if kw.get('newznab_indexer_id') == "0":
            self.logger.debug("Creating newznab indexer in database")
            try:
                indexer = NewznabIndexers(name=kw.get('newznab_indexer_name'),
                                          host=host,
                                          apikey=kw.get('newznab_indexer_apikey'),
                                          use_ssl=kw.get('newznab_indexer_ssl'),
                                          apiurl=apiurl)

                if kw.get('newznab_indexer_apikey') not in htpc.BLACKLISTWORDS:
                    htpc.BLACKLISTWORDS.append(kw.get('newznab_indexer_apikey'))

                self.changeindexer(indexer.id)
                return 1
            except Exception as e:
                self.logger.debug("Exception: %s" % e)
                self.logger.error("Unable to create newznab indexer in database")
                return 0
        else:
            # Dont allow empty indexer be saved to db
            if host == '':
                self.logger.error('You must provide a url to the indexers %s' % kw.get('newznab_indexer_name', ''))
                return 0
            self.logger.debug("Updating newznab indexer %s in database" % kw.get('newznab_indexer_name'))
            try:
                indexer = NewznabIndexers.selectBy(id=kw.get('newznab_indexer_id')).getOne()
                indexer.name = kw.get('newznab_indexer_name')
                indexer.host = host
                indexer.apikey = kw.get('newznab_indexer_apikey')
                indexer.use_ssl = kw.get('newznab_indexer_ssl', 'on')
                indexer.apiurl = apiurl

                return 1
            except SQLObjectNotFound, e:
                self.logger.error("Unable to update %s in database %s" % (kw.get('newznab_indexer_name'), e))
                return 0

    @cherrypy.expose()
    @require()
    def thumb(self, url='', h=None, w=None, o=100, category=None, **kwargs):
        ''' If the indexer has a url, it uses that one to download if not it will try to
            find a url via fanart.tv or tvmaze
        '''
        fanart_results = []

        t = None
        # coverurl is missing..
        if 'tvrage' in kwargs:
            t = 'tvrage'
            _id = kwargs['tvrage']
            url = None
        elif 'thetvdb' in kwargs:
            t = 'thetvdb'
            _id = kwargs['thetvdb']
            url = None
        elif 'imdb' in kwargs:
            t = 'imdb'
            _id = kwargs['imdb']
            url = None

        # do http://omdbapi.com/ aswell?
        if t:
            if category:
                cat = category.split('>')[0].lower().strip()

                if cat == 'movie':
                    cat == 'movies'

            if cat in ('tv', 'movies'):
                imagetype = None

                if t in ('thetvdb', 'tvrage'):
                    imagetype = 'tvposter'

                elif t == 'imdb':
                    _id = 'tt%s' % _id
                    imagetype = 'movieposter'

                # lets try fanart.tv first
                if t in ('thetvdb', 'imdb'):
                    fanart_results = fan_art(_id, t=cat, wanted_art=imagetype)

                if len(fanart_results):
                    url = fanart_results[0]
                else:
                    tvmazecomp = {'tv': 'shows',
                                  'movies': 'movies'}
                    tvmaze_results = tvmaze(_id, t, tvmazecomp[cat])

                    if len(tvmaze_results):
                        url = tvmaze_results[0]

            elif cat == 'music':
                # todo?
                pass
            elif cat == 'games':
                pass

        if url:
            self.logger.debug('Downloading %s' % url)
            return get_image(url, h, w, o)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def getcategories(self, **kwargs):
        self.logger.debug("Fetching available categories")
        xml = self.fetchxml('caps')
        if xml:
            return xml['caps']['categories']

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def getclients(self):
        l = []
        nzbget = {"client": "NZBGet",
                  "active": 0
        }
        if htpc.settings.get("nzbget_enable"):
            nzbget["active"] = 1

        sab = {"client": "SABnzbd",
               "active": 0
        }
        if htpc.settings.get("sabnzbd_enable"):
            sab["active"] = 1

        l.append(nzbget)
        l.append(sab)
        return l

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def search(self, q='', cat='', indexer='all', **kwargs):
        self.logger.debug("Searching for %s category %s on indexer %s" % (q, cat, indexer))
        if cat:
            cat = '&cat=' + cat

        sess = FuturesSession(max_workers=8)
        job_list = []

        if indexer == 'all':
            for i in NewznabIndexers.select():
                cmd = 'search&q=' + urllib2.quote(q.encode(encoding="UTF-8")) + cat + '&extended=1'
                u = i.apiurl
                u += cmd
                u = u.replace('o=json', 'o=xml')
                job_list.append(u)
        else:
            for i in NewznabIndexers.select():
                if i.name == indexer:
                    cmd = 'search&q=' + urllib2.quote(q.encode(encoding="UTF-8")) + cat + '&extended=1'
                    u = i.apiurl
                    u += cmd
                    u = u.replace('o=json', 'o=xml')
                    job_list.append(u)

        result = []
        future = []

        for url in job_list:
            try:
                self.logger.debug('Fetching search results from %s' % url)
                t = sess.get(url, timeout=60, headers=self.headers)
            except Exception as e:
                self.logger.error('%s when fetching %s' % (e, url))
                continue

            future.append(t)

        for future in cf.as_completed(future):
            if future.exception() is not None:
                self.logger.error('Failed to fetch results %s' % (future.exception()))
            else:
                f = []
                res = future.result()
                try:
                    provider_res = xmltodict.parse(res.content, attr_prefix='')
                    if provider_res:
                        if 'rss' in provider_res:
                            if 'channel' in provider_res['rss']:
                                    if 'item' in provider_res['rss']['channel']:
                                        f.append(provider_res['rss']['channel'])

                        if 'error' in provider_res:
                            self.logger.debug('%s %s' % (provider_res['rss']['channel']['title'], provider_res['error']['description']))

                except Exception as e:
                    self.logger.error(res.url, e, exc_info=True)

                result.append(f)

        return result

    # leave this for now
    def fetch(self, cmd):
        try:
            indexer = NewznabIndexers.select(limit=1).getOne()
            host = striphttp(indexer.host).rstrip('/')
            ssl = 's' if indexer.use_ssl == 'on' else ''
            apikey = indexer.apikey

        except SQLObjectNotFound:
            self.logger.warning("No configured Indexers. Please add one")
            return

        url = 'http' + ssl + '://' + host + '/api?o=json&apikey=' + apikey + '&t=' + cmd

        self.logger.debug("Fetching information from: %s" % url)
        try:
            # some newznab providers are insanely slow
            r = requests.get(url, timeout=20, headers=self.headers)
            return r.json()
        except ValueError as e:
            self.logger.error('%s' % e)
            try:
                self.logger.debug('Trying to convert xml to json')
                r = requests.get(url, timeout=20)
                return xmltodict.parse(r.content)
            except:
                self.logger.error('Failed to contert xml to js')
        except Exception as e:
            self.logger.error("Unable to fetch information from: %s %s" % (url, e))
            return

    def fetchxml(self, cmd):
        ''' convert xml to python object '''
        try:
            indexer = NewznabIndexers.select(limit=1).getOne()
            host = striphttp(indexer.host).rstrip('/')
            ssl = 's' if indexer.use_ssl == 'on' else ''
            apikey = indexer.apikey

        except SQLObjectNotFound:
            self.logger.warning("No configured Indexers. Please add one")
            return

        url = 'http' + ssl + '://' + host + '/api?o=xml&apikey=' + apikey + '&t=' + cmd

        self.logger.debug("Fetching category information from: %s" % url)
        try:
            # some newznab providers are insanely slow
            r = requests.get(url, timeout=20, headers=self.headers)
            if r.status_code == requests.codes.ok:
                xml = xmltodict.parse(r.content)
                if xml.get('error'):
                    self.logger.error('%s %s' % (url, xml['error']['@description']))
                else:
                    return xml

        except Exception as e:
            self.logger.error("Unable to fetch information from: %s %s" % (url, e))
            return

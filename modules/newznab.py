#!/usr/bin/env python
# -*- coding: utf-8 -*-

import cherrypy
import htpc
from htpc.helpers import get_image
import urllib2
from json import loads
import logging
from cherrypy.lib.auth2 import require
import requests
import concurrent.futures as cf
from requests_futures.sessions import FuturesSession
from sqlobject import SQLObject, SQLObjectNotFound
from sqlobject.col import StringCol
from htpc.helpers import striphttp
import xmltodict


class NewznabIndexers(SQLObject):
    """ SQLObject class for kodi_servers table """
    name = StringCol()
    host = StringCol()
    apikey = StringCol()
    use_ssl = StringCol(default=None)
    apiurl = StringCol(default=None)

    class sqlmeta:
        fromDatabase = True


class Newznab(object):
    def __init__(self):
        self.logger = logging.getLogger('modules.newznab')
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
            """ Get kodi server info """
            try:
                indexers = NewznabIndexers.selectBy(id=id).getOne()
                return dict((c, getattr(indexers, c)) for c in indexers.sqlmeta.columns)
            except SQLObjectNotFound:
                return

        """ Get a list of all servers and the current server """
        all_indexers = []
        for i in NewznabIndexers.select():
            all_indexers.append({'id': i.id, 'name': i.name})
        if len(all_indexers) < 1:
            return
        try:
            current = self.current.name
        except AttributeError:
            current = None
        return {'current': current, 'indexers': all_indexers}

    @cherrypy.expose()
    @require()
    def delindexer(self, id):
        """ Delete a server """
        self.logger.debug("Deleting indexer " + str(id))
        NewznabIndexers.delete(id)
        self.changeindexer()
        return

    @cherrypy.expose()
    @require()
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
    @require()
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
            if k in ["newznab_enable", "newznab_name", "newznab_show_in_menu"]:
                htpc.settings.set(k, v)

        self.logger.debug(kw)
        # Clean hostname
        host = striphttp(kw.get('newznab_indexer_host')).rstrip('/')

        # make the search url
        ssl = 's' if kw.get('newznab_indexer_ssl') == 'on' else ''

        apiurl = 'http%s://%s/api?o=json&apikey=%s&t=' % (ssl, host, kw.get('newznab_indexer_apikey'))

        if kw.get('newznab_indexer_id') == "0":
            self.logger.debug("Creating newznab indexer in database")
            try:
                indexer = NewznabIndexers(
                        name=kw.get('newznab_indexer_name'),
                        host=host,
                        apikey=kw.get('newznab_indexer_apikey'),
                        use_ssl=kw.get('newznab_indexer_ssl'),
                        apiurl=apiurl)

                self.changeindexer(indexer.id)
                return 1
            except Exception as e:
                self.logger.debug("Exception: %s" % e)
                self.logger.error("Unable to create newznab indexer in database")
                return 0
        else:
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
    def thumb(self, url, h=None, w=None, o=100, category=None):
        #host = htpc.settings.get('newznab_host', '').replace('https://', '').replace('http://', '')
        #ssl = 's' if htpc.settings.get('newznab_ssl', 0) else ''

        if url.startswith('rageid'):

            if category:
                try:
                    cat = category.split('>')[0].lower().strip()
                    if cat == 'tv':
                        print "thumb dick"
                        url = 'http://images.tvrage.com/shows/3/%s.jpg' % url[6:]
                except:
                    cat = 'tv'
            else:
                cat = 'tv'

            #if host.startswith('www.usenet-crawler'):
            #    url = 'http%s://%s/covers/%s/%s.jpg' % (ssl, cat, url[6:])

            #if host.startswith('api.dognzb'):
            #    url = 'http%s://dognzb.cr/content/covers/%s/%s.jpg' % (ssl, cat, url[6:])

            #if http://images.tvrage.com/shows/3/2980.jpg

        return get_image(url, h, w, o)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def getcategories(self, **kwargs):
        self.logger.debug("Fetching available categories")
        return self.fetch('caps')['categories']

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def getclients(self):
        l = []
        nzbget = {"client": "nzbget",
                  "icon": "../img/nzbget.png",
                  "active": 0
        }
        if htpc.settings.get("nzbget_enable"):
            nzbget["active"] = 1

        sab = {"client": "sabnzbd",
               "icon": "../img/sabnzbd.png",
               "active": 0
        }
        if htpc.settings.get("sabnzbd_enable"):
            sab["active"] = 1

        l.append(nzbget)
        l.append(sab)
        return l

    def cb(self, sess, resp):
        try:
            resp.data = resp.json()
        except:
            # lets assume its xml
            resp.data = loads(xmltodict.parse(resp.content))

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def search(self, q='', cat='', indexer='all', **kwargs):
        self.logger.debug("search q %s cat %s indexer %s" % (q, cat, indexer))
        if cat:
            cat = '&cat=' + cat

        sess = FuturesSession()
        job_list = []

        if indexer == 'all':
            for i in NewznabIndexers.select():
                cmd = 'search&q=' + urllib2.quote(q.encode(encoding="UTF-8")) + cat + '&extended=1'
                u = i.apiurl
                u += cmd

                job_list.append(u)
        else:
            for i in NewznabIndexers.select():
                if i.name == indexer:
                    cmd = 'search&q=' + urllib2.quote(q.encode(encoding="UTF-8")) + cat + '&extended=1'
                    u = i.apiurl
                    u += cmd
                    job_list.append(u)

        result = []
        future = []

        for url in job_list:
            future.append(sess.get(url, timeout=60, background_callback=self.cb))

        for future in cf.as_completed(future):
            if future.exception() is not None:
                self.logger.error('Failed to fetch results %s' % future.exception())
            else:
                f = []
                res = future.result()
                f.append(res.json()['channel'])
                result.append(f)

        return result

    def fetch(self, cmd):
        try:
            l = list(NewznabIndexers.select())
            if l:
                # grab the first indexer
                indexer = l[0]
                host = striphttp(indexer.host).rstrip('/')
                ssl = 's' if indexer.use_ssl == 'on' else ''
                apikey = indexer.apikey
            else:
                self.logger.error('No indexers in the db, please add one.')
                return

            url = 'http' + ssl + '://' + host + '/api?o=json&apikey=' + apikey + '&t=' + cmd

            self.logger.debug("Fetching information from: %s" % url)
            try:
                # some newznab providers are insanely slow
                r = requests.get(url, timeout=160)
                return r.json()
            except Exception as err:
                self.logger.error("HTTP Error Code Received: %s" % err)
                return
        except Exception as e:
            self.logger.error("Unable to fetch information from: %s %s" % (url, e))
            return



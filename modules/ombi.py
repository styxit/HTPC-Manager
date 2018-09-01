#!/usr/bin/env python
# -*- coding: utf-8 -*-


__author__ = 'jeremysherriff'


import requests
import cherrypy
from cherrypy.lib.auth2 import require, member_of
import datetime as DT
from json import loads, dumps
import logging
# import urllib
import htpc
# from HTMLParser import HTMLParser
from htpc.helpers import get_image

logger = logging.getLogger('modules.ombi')

class Ombi(object):
    _token = ''
    # _cookies = None

    def __init__(self):
        # self.logger = logging.getLogger('modules.ombi')
        # self.sess = requests.Session()
        htpc.MODULES.append({
            'name': 'Ombi',
            'id': 'ombi',
            'test': htpc.WEBDIR + 'ombi/test',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'ombi_enable'},
                {'type': 'text', 'label': 'Menu name *', 'name': 'ombi_name'},
                {'type': 'text', 'label': 'IP / Host *', 'name': 'ombi_host'},
                {'type': 'text', 'label': 'Port *', 'placeholder': '5000', 'name': 'ombi_port'},
                {'type': 'text', 'label': 'Username', 'name': 'ombi_username', 'desc': 'Consider creating an Ombi admin user just for HTPC'},
                {'type': 'password', 'label': 'Password', 'name': 'ombi_password'},
                {'type': 'text', 'label': 'Reverse proxy link', 'placeholder': '', 'desc': 'eg /reverse or https://ombi.domain.com', 'name': 'ombi_reverse_proxy_link'},

            ]
        })

    @cherrypy.expose()
    @require()
    def index(self):
        return htpc.LOOKUP.get_template('ombi.html').render(scriptname='ombi', webinterface=self.webinterface())

    def webinterface(self):
    # Construct the server:port url unless the reverse proxy url is specified
        ssl = 's' if htpc.settings.get('ombi_ssl', False) else ''
        ip = htpc.settings.get('ombi_host')
        port = htpc.settings.get('ombi_port')
        url = 'http%s://%s:%s/' % (ssl, ip, port)
        if htpc.settings.get('ombi_reverse_proxy_link'):
            url = htpc.settings.get('ombi_reverse_proxy_link')
        return url

    def ping(self, ombi_host, ombi_port, ombi_ssl=False, **kwargs):
        """ Checks server is reachable without confirming credentials.
            As this doesn't need auth, we build and call the endpoint ourselves.
        """
        ssl = 's' if ombi_ssl else ''
        url = "api/v1/Status/info"
        u = 'http%s://%s:%s/%s' % (ssl, ombi_host, ombi_port, url)

        try:
            res = requests.get(u)
            if res.status_code == 200:
                return True
            else:
                logger.error('Unable to contact Ombi via %s Response %s %s' % (u, str(res.status_code), str(res.reason)))
                return False
        except Exception, e:
            logger.error('Exception thrown via %s Response %s' % (u, str(e)))
            return False

    @cherrypy.expose()
    @require(member_of(htpc.role_admin))
    def test(self, **kwargs):
        # Fuller version of ping(). Includes auth test.
        if self.ping(**kwargs):
            logger.debug('ping ok, now trying credentials')
            url = 'api/v1/Settings/about'
            res = self._ombi_get(url)
            if res != 'False':
                logger.debug('Successful Ombi test')
                return 'True'
            logger.error('Ombi test failed: %s' % res)
        return

    @cherrypy.expose()
    @require()
    # @cherrypy.tools.json_out()
    def dummy(self):
        # x = self.auth()
        x = 'api/v1/Request/tv'
        d = self._ombi_get(x)
        if d != 'False':
            return 'Response: %s' % d
        return 'Failed: %s' % str(d)

    @cherrypy.expose()
    @require(member_of(htpc.role_admin))
    def content_sync(self, source, mode, **kwargs):
        if source == 'plex':
            if self.get_plex_enabled() == 'True':
                if mode == 'full':
                    url = 'api/v1/Job/plexcontentcacher'
                else:
                    url = 'api/v1/Job/plexrecentlyadded'
        if source == 'emby':
            if self.get_emby_enabled() == 'True':
                url = 'api/v1/Job/embycontentcacher'
        d = self._ombi_post(url)
        if d != 'False':
            logger.debug('%s %s sync triggered' % (source, mode))
            return 'True'
        logger.debug('%s %s sync failed' % (source, mode))
        return 'False'

    @cherrypy.expose()
    @require()
    def get_emby_enabled(self):
        d = self._ombi_get('api/v1/Settings/emby')
        if d != 'False':
            return str(d['enable'])
        logger.debug('Couldnt get Ombi settings for Emby')
        return 'False'

    @cherrypy.expose()
    @require()
    def get_plex_enabled(self):
        d = self._ombi_get('api/v1/Settings/plex')
        if d != 'False':
            return str(d['enable'])
        logger.debug('Couldnt get Ombi settings for Plex')
        return 'False'

    def _ombi_get(self, url):
        """
        Combined function to make all swagger API GET calls.
        Builds the url, authenticates and grabs token if there isn't one.
        :url: api endpoint
        :return: the json response content or 'False'
        """
        logger.debug('Doing GET request to %s' % url )
        if self.auth() == 'False':
            logger.debug('GET request died - auth failed')
            return 'False'
        ssl = 's' if htpc.settings.get('ombi_ssl', False) else ''
        ip = htpc.settings.get('ombi_host')
        port = htpc.settings.get('ombi_port')
        u = 'http%s://%s:%s/%s' % (ssl, ip, port, url)
        h = dict()
        h.update({ 'Authorization': self._token})
        r = requests.get( u, headers=h )
        if r.status_code == 200:
            d = r.json()
            # logger.debug('Ombi GET successful\n%s' % d)
            return d
        logger.error('Request failed %s %s %s' % (u, str(r.status_code), r.reason))
        return 'False'

    def _ombi_post(self, url, data=''):
        """
        Combined function to make all swagger API POSTs.
        Builds the url, authenticates and grabs token if there isn't one.
        :url: api endpoint
        :param data: post data in json format
        :return: the response data in json format or 'False'
        """
        logger.debug('Doing POST request to %s:\n%s' % (url, data) )
        if self.auth() == 'False':
            logger.debug('POST request died - auth failed')
            return 'False'
        ssl = 's' if htpc.settings.get('ombi_ssl', False) else ''
        ip = htpc.settings.get('ombi_host')
        port = htpc.settings.get('ombi_port')
        u = 'http%s://%s:%s/%s' % (ssl, ip, port, url)
        h = dict()
        h.update({ 'Authorization': self._token})
        r = requests.post( u, headers=h, json=data )
        if r.status_code == 200:
            logger.debug('Ombi POST successful:\n%s' % r.json())
            return r
        logger.error('Request failed %s %s %s' % (u, str(r.status_code), r.reason))
        return 'False'

    def _ombi_put(self, url, data=''):
        """
        Combined function to make all swagger API PUTs.
        Builds the url, authenticates and grabs token if there isn't one.
        :url: api endpoint
        :param data: PUT data in json format
        :return: the response data in json format or 'False'
        """
        logger.debug('Doing PUT request to %s:\n%s' % (url, data) )
        if self.auth() == 'False':
            logger.debug('PUT request died - auth failed')
            return 'False'
        ssl = 's' if htpc.settings.get('ombi_ssl', False) else ''
        ip = htpc.settings.get('ombi_host')
        port = htpc.settings.get('ombi_port')
        u = 'http%s://%s:%s/%s' % (ssl, ip, port, url)
        h = dict()
        h.update({ 'Authorization': self._token})
        r = requests.put( u, headers=h, json=data )
        if r.status_code == 200:
            logger.debug('Ombi PUT successful:\n%s' % r.json())
            return r
        logger.error('Request failed %s %s %s' % (u, str(r.status_code), r.reason))
        return 'False'

    def _ombi_delete(self, url):
        """
        Combined function to make all swagger API DELETE calls.
        Builds the url, authenticates and grabs token if there isn't one.
        :url: api endpoint
        :return: the json response content or 'False'
        """
        logger.debug('Doing DELETE request to %s' % url )
        if self.auth() == 'False':
            logger.debug('DELETE request died - auth failed')
            return 'False'
        ssl = 's' if htpc.settings.get('ombi_ssl', False) else ''
        ip = htpc.settings.get('ombi_host')
        port = htpc.settings.get('ombi_port')
        u = 'http%s://%s:%s/%s' % (ssl, ip, port, url)
        h = dict()
        h.update({ 'Authorization': self._token})
        r = requests.delete( u, headers=h )
        if r.status_code == 200:
            # d = r.json()
            logger.debug('Ombi DELETE successful\n%s' % r)
            return r
        logger.error('Request failed %s %s %s' % (u, str(r.status_code), r.reason))
        return 'False'

    def auth(self, authtry = 0):
        if authtry >= 2:
            logger.error('Auth attempts exceeded')
            return 'False'
        ssl = 's' if htpc.settings.get('ombi_ssl', False) else ''
        ip = htpc.settings.get('ombi_host')
        port = htpc.settings.get('ombi_port')
        user = htpc.settings.get('ombi_username')
        passwd = htpc.settings.get('ombi_password')
        if self._token == '':
            url = 'api/v1/Token'
            u = 'http%s://%s:%s/%s' % (ssl, ip, port, url)

            h = dict()
            j = dict()
            j.update({ "username": user, "password": passwd })
            r = requests.post( u, json=j )
            if r.status_code == 200:
                d = r.json()
                self._token = 'Bearer ' + str(d['access_token'])
                logger.info('Ombi auth successful')
                return 'True'
            else:
                self._token = ''
                logger.error('Could not get auth token from Ombi: %s %s' % ( str(r.status_code), str(r.reason) ))
                return 'False'
        else:
            # Test the existing token
            url = 'api/v1/Settings/about'
            u = 'http%s://%s:%s/%s' % (ssl, ip, port, url)
            h = dict()
            h.update({ 'Authorization': self._token})
            r = requests.get( u, headers=h )
            if r.status_code == 401: # means we need to re-authenticate
                logger.debug('Re-auth needed %s %s' % (str(r.status_code), str(r.reason)))
                authtry += 1
                self._token = ''
                return self.auth(authtry)
            elif r.status_code == 200:
                # logger.debug('Existing token is OK')
                return 'True'
        logger.error('Unable to authenticate on try %s: Response %s %s' % (authtry, str(r.status_code), str(r.reason)))
        return 'False'

    @cherrypy.tools.json_out()
    @cherrypy.expose()
    @require()
    def movie_requests(self):
        u = 'api/v1/Request/movie'
        logger.debug('Fetching all movie requests via %s' % u)
        d = self._ombi_get(u)
        if d != 'False':
            return d
        else:
            logger.error('Unable to get movies requests')
            return 'False'

    @cherrypy.tools.json_out()
    @cherrypy.expose()
    @require()
    def tv_requests(self):
        u = 'api/v1/Request/tvlite'
        logger.debug('Fetching all tv requests via %s' % u)
        d = self._ombi_get(u)
        if d != 'False':
            return d
        else:
            logger.error('Unable to get tv requests')
            return 'False'

    @cherrypy.tools.json_out()
    @cherrypy.expose()
    @require()
    def get_searchresult(self, t, q, l):
        logger.debug('Doing %s for %s based on %s' % (l,t,q))
        u = ''
        if l == 'search':
            u = 'api/v1/Search/'+t+'/'+q
        else:
            if t == 'movie':
                if q in ['popular','nowplaying','toprated','upcoming']:
                    u = 'api/v1/Search/'+t+'/'+q
                else:
                    u = 'api/v1/Search/'+t+'/'+q+'/similar'
            if t == 'tv':
                if q in ['popular','anticipated','mostwatched','trending']:
                    u = 'api/v1/Search/'+t+'/'+q
        if u != '':
            d = self._ombi_get(u)
            if d != 'False':
                return d
        logger.debug('Bad %s hint' % l)
        return 'False'

    @cherrypy.tools.json_out()
    @cherrypy.expose()
    @require()
    def get_extrainfo(self, t, q, k=''):
        # logger.debug('Fetching extra %s info for %s %s' % (t,q,k))
        u = 'api/v1/Search/'+t+'/info/'+q
        d = self._ombi_get(u)
        if d != 'False':
            if k == '':
                return d
            else:
                # logger.debug('%s %s' % (k,d[k]))
                return d[k]
        logger.debug('Bad question')
        return 'False'

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def request_movie(self, id, **kwargs):
        logger.debug('Requesting movie id %s' % id)
        u = 'api/v1/Request/movie'
        d = dict()
        d.update({ 'theMovieDbId':id })
        r = self._ombi_post(u, d)
        if r != 'False':
            return r.json()
        logger.debug('Bad request')
        return 'False'

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    # @cherrypy.tools.json_out() # response is json payload so don't need this
    def do_maction(self, id, action, **kwargs):
        """
        :param ctype: content type for api url
        :param id: id from the GET /api/v1/Request/movie response
        :param action: must be in below list
        :param kwargs:
        :return: result message in json format
        """
        logger.debug('Performing %s on movie %s' % (action,id) )
        if action not in ('approve', 'available', 'unavailable', 'deny', 'remove'):
            raise cherrypy.HTTPError('500 Error', 'Invalid action')
            return '{"500": "Invalid action"}'
        u = 'api/v1/Request/movie/%s' % action
        d = dict()
        d.update({ 'id': id })
        if action == 'remove':
            u = 'api/v1/Request/movie/%s' % id
            r = self._ombi_delete(u)
        elif action == 'deny':
            r = self._ombi_put(u, d)
        else:
            r = self._ombi_post(u, d)
        if r != 'False':
            return r
        logger.error('Bad request to api')
        return 'False'


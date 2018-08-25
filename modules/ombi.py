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
            if res.status_code == 200:
                logger.debug('Successful Ombi test')
                return 'True'
            logger.error('Unable to contact Ombi via %s Response %s %s' % (url, str(res.status_code), str(res.reason)))
        return

    @cherrypy.expose()
    @require()
    # @cherrypy.tools.json_out()
    def dummy(self):
        # x = self.auth()
        x = 'api/v1/Settings/ombi'
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
        :return: the json respoonse content or 'False'
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
        logger.debug('Doing POST request to %s %s' % (url, data) )
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
            d = r.json()
            logger.debug('Ombi POST successful\n%s' % d)
            return d
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
                logger.debug('Re-auth needed %s %s' % (str(res.status_code), str(res.reason)))
                authtry += 1
                self._token = ''
                return self.auth(authtry)
            elif r.status_code == 200:
                logger.debug('Existing token is OK')
                return 'True'
        logger.error('Unable to authenticate on try %s: Response %s %s' % (authtry, str(res.status_code), str(res.reason)))
        return 'False'

    def _get_url(self, host=None, port=None):
        u_host = host or htpc.settings.get('utorrent_host')
        u_port = port or htpc.settings.get('utorrent_port')
        return 'http://{}:{}/gui/'.format(striphttp(u_host), u_port)

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
            logger.debug('Unable to get movies requests')
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
            return r
        logger.debug('Bad request')
        return 'False'

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def remove(self, torrent_id):
        return self.do_action('remove', hash=torrent_id).json()

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def deny(self, torrent_id):
        return self.do_action('removedata', hash=torrent_id).json()

    def do_action(self, action, hash=None, s=None, **kwargs):
        """
        :param action:
        :param hash:
        :param kwargs:
        :rtype: requests.Response
        :return:
        """
        if action not in ('start', 'stop', 'pause', 'forcestart', 'unpause', 'remove', 'removedata', 'add-url', 'recheck', 'setprio',
                          'queuebottom', 'queuetop', 'queuedown', 'queueup', 'getfiles', 'getsettings', 'setsetting'):
            raise AttributeError
        if action == 'add-url':
            return self.fetch('&action=%s&s=%s' % (action, s))

        params_str = ''.join(["&%s=%s" % (k, v) for k, v in kwargs.items()])

        if hash is None:
            # getsettings
            return self.fetch('&action=%s%s' % (action, params_str))

        return self.fetch('&action=%s%s&hash=%s' % (action, params_str, hash))

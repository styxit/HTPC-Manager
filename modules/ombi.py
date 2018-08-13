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
        # ip = htpc.settings.get('ombi_host')
        # port = htpc.settings.get('ombi_port')
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
    # @cherrypy.tools.json_out()
    def test(self, **kwargs):
        """ Fuller version of ping(). Includes auth test.
            self.logger.info('Testing connectivity and credentials')
        """
        if self.ping(**kwargs):
            # logger.debug('ping ok, now trying credentials')
            url = 'api/v1/Settings/about'
            res = self._ombi_get(url)
            if res.status_code == 200:
                logger.debug('Successful Ombi test via %s Response %s %s' % (url, str(res.status_code), str(res.reason)))
                return res.content
            logger.error('Unable to contact Ombi via %s Response %s %s' % (url, str(res.status_code), str(res.reason)))
        return

    # @cherrypy.expose()
    # @require(member_of(htpc.role_admin))
    # @cherrypy.tools.json_out()
    # def dummy(self):
        # x = self.auth()
        # if x:
            # return self._token
        # else:
            # return 'Token auth failed'

    def _ombi_get(self, url):
        """
        Combined function to make all Ombi API calls.
        Builds the url, authenticates and grabs token if there isn't one.
        If the call doesn't need auth, don't use this function.
        :param args:
        :url: api endpoint
        :return: the requests response object.
        """
        logger.debug('Doing GET request to %s' % url )
        if self._token == '':
            r = self.auth()
            if r.status_code != 200:
                logger.debug('GET request died - auth failed')
                return r
        ssl = 's' if htpc.settings.get('ombi_ssl', False) else ''
        ip = htpc.settings.get('ombi_host')
        port = htpc.settings.get('ombi_port')
        u = 'http%s://%s:%s/%s' % (ssl, ip, port, url)
        h = dict()
        h.update({ 'Authorization': self._token})
        r = requests.get( u, headers=h )
        if r.status_code in [401, 400, 300]: # means we need to re-authenticate
            logger.debug('Token has expired, re-authenticating')
            r = self.auth()
            if self._token != '':
                logger.debug('Repeating GET after auth')
                self._ombi_get(url)
            else:
                logger.debug('GET Request died - could not re-authenticate')
                return r
        # logger.debug('GET response: %s %s' % ( str(r.status_code), str(r.reason) ))
        if r.status_code == 200:
            d = r.json()
            logger.debug('Ombi GET successful')
        else:
            logger.error('Request failed %s %s %s' % (u, str(r.status_code), r.reason))
        return r
        
    def _ombi_post(self, url, data):
        """
        Combined function to make all Ombi API calls.
        Builds the url, authenticates and grabs token if there isn't one.
        If the call doesn't need auth, don't use this function.
        :param args:
        :url: api endpoint
        :return: the requests response object.
        """
        logger.debug('Doing POST request to %s' % url )
        if self._token == '':
            r = self.auth()
            if r.status_code != 200:
                logger.debug('POST request died - auth failed')
                return r
        ssl = 's' if htpc.settings.get('ombi_ssl', False) else ''
        ip = htpc.settings.get('ombi_host')
        port = htpc.settings.get('ombi_port')
        u = 'http%s://%s:%s/%s' % (ssl, ip, port, url)
        h = dict()
        h.update({ 'Authorization': self._token})
        r = requests.post( u, json=data )
        if r.status_code in [401, 400, 300]: # means we need to re-authenticate
            logger.debug('Token has expired, re-authenticating')
            r = self.auth()
            if self._token != '':
                logger.debug('Repeating POST after auth')
                self._ombi_post(url)
            else:
                logger.debug('POST Request died - could not re-authenticate')
                return r
        logger.debug('POST response: %s %s' % ( str(r.status_code), str(r.reason) ))
        if r.status_code == 200:
            d = r.json()
            self._token = 'Bearer ' + str(d['access_token'])
            logger.debug('Ombi POST successful')
        else:
            logger.error('Request failed %s %s %s' % (u, str(r.status_code), r.reason))
        return r

    def auth(self):
        ssl = 's' if htpc.settings.get('ombi_ssl', False) else ''
        ip = htpc.settings.get('ombi_host')
        port = htpc.settings.get('ombi_port')
        user = htpc.settings.get('ombi_username')
        passwd = htpc.settings.get('ombi_password')
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
        else:
            self._token = ''
            logger.error('Could not get auth token from Ombi: %s %s' % ( str(r.status_code), str(r.reason) ))
        return r

    def _get_url(self, host=None, port=None):
        u_host = host or htpc.settings.get('utorrent_host')
        u_port = port or htpc.settings.get('utorrent_port')
        return 'http://{}:{}/gui/'.format(striphttp(u_host), u_port)

    def fetch(self, args, username='', password='', host='', port=''):
        """
        :param args:
        :rtype: requests.Response
        :return:
        """
        password = password or htpc.settings.get('utorrent_password', '')
        username = username or htpc.settings.get('utorrent_username', '')
        host = host or htpc.settings.get('utorrent_host')
        port = port or htpc.settings.get('utorrent_port')

        token_str = '?token=%s' % self._token

        url = self._get_url(host, port) + token_str + args

        logger.debug('Fetching %s' % url)

        try:
            r = self.sess.get(url, timeout=5, auth=(username, password))

            # Api returns 300 if invalid token according to the docs but it really returns 400
            # ut 3.4.5 returns 401 when you try to get the token
            if r.status_code in [401, 400, 300]:
                token = self.auth(host, port, username, password)
                if token:
                    return self.fetch(args)

            elif r.status_code == 404:
                logger.error('Check your settings, invalid username or password')

            elif r.status_code == 200:
                if r:
                    return r

        except Exception as e:
            logger.error('Failed to fetch %s with args %s %s' % (url, args, e), exc_info=True)


    @cherrypy.tools.json_out()
    @cherrypy.expose()
    @require()
    def movie_requests(self):
        u = 'api/v1/Request/movie'
        logger.debug('Fetching all movies requests via %s' % u)
        req = self._ombi_get(u)
        if req:
            return req.json()
        else:
            return {'result': 500}

    @cherrypy.tools.json_out()
    @cherrypy.expose()
    @require()
    def torrents(self):
        req = self.fetch('&list=1')
        if req:
            torrents = req.json()['torrents']
            return {'torrents': [TorrentResult(tor) for tor in torrents], 'result': req.status_code}
        else:
            return {'result': 500}

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def start(self, torrent_id):
        return self.do_action('start', hash=torrent_id).json()

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def stop(self, torrent_id):
        return self.do_action('stop', hash=torrent_id).json()

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def remove(self, torrent_id):
        return self.do_action('remove', hash=torrent_id).json()

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def remove_data(self, torrent_id):
        return self.do_action('removedata', hash=torrent_id).json()

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def add_url(self, url):
        try:
            res = self.do_action('add-url', s=url)
            return {'result': res.status_code}
        except ConnectionError, e:
            logger.exception(e)

    @cherrypy.tools.json_out()
    @require()
    @cherrypy.expose()
    def get_speed_limit(self):
        r = self.do_action('getsettings')
        d = {}
        if r:
            for k in r.json()['settings']:
                if 'max_dl_rate' in k:
                    d['dl'] = k[2]
                elif 'max_ul_rate' in k:
                        d['ul'] = k[2]

        return d

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def to_client(self, link, torrentname, **kwargs):
        try:
            logger.info('Added %s to uTorrent' % torrentname)
            res = self.do_action('add-url', s=link)
            return {'result': res.status_code}
        except Exception as e:
            logger.error('Failed to sendt %s to uTorrent %s %s' % (link, torrentname, e))

    def change_label(self, hash, label):
        return self.do_action('setprops', hash=hash, s='label', v=label)

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

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def change_speed(self, **kw):
        if 'max_ul_rate' or 'max_dl_rate' in kw:
            self.do_action('setsetting', kw)
        else:
            logger.error('Wrong parameters given')

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    def set_upspeed(self, speed, *arg, **kw):
        return self.fetch('&action=setsetting&s=max_ul_rate&v=' + speed)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    def set_downspeed(self, speed, *arg, **kw):
        return self.fetch('&action=setsetting&s=max_dl_rate&v=' + speed)


#!/usr/bin/env python
# -*- coding: utf-8 -*-

__author__ = 'jeremysherriff'


import requests
from cherrypy.lib.auth2 import require, member_of
import logging
import htpc
import cherrypy
from HTMLParser import HTMLParser
from htpc.helpers import striphttp

logger = logging.getLogger('modules.ombi')

class Ombi(object):
    # _token = ''
    # _cookies = None

    def __init__(self):
        # self.logger = logging.getLogger('modules.ombi')
        # self.sess = requests.Session()
        htpc.MODULES.append({
            'name': 'Ombi',
            'id': 'ombi',
            'test': htpc.WEBDIR + 'ombi/ping',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'ombi_enable'},
                {'type': 'text', 'label': 'Menu name *', 'name': 'ombi_name'},
                {'type': 'text', 'label': 'IP / Host *', 'name': 'ombi_host'},
                {'type': 'text', 'label': 'Port *', 'placeholder': '5000', 'name': 'ombi_port'},
                {'type': 'text', 'label': 'Username', 'name': 'ombi_username', 'desc': 'Consider creating an Ombi admin user just for HTPC'},
                {'type': 'password', 'label': 'Password', 'name': 'ombi_password'},
                # {'type': 'text', 'label': 'Basepath', 'placeholder': '/request', 'name': 'ombi_basepath'},
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

    @cherrypy.expose()
    @require()
    # @cherrypy.tools.json_out()
    def ping(self):
        """
        Checks server is reachable without confirming credentials.
        Uses Status/info endpoint as it returns version which might be useful(?)
        As this doesn't need auth we build and call the endpoint ourselves.
        """
        ssl = 's' if htpc.settings.get('ombi_ssl', False) else ''
        ip = htpc.settings.get('ombi_host')
        port = htpc.settings.get('ombi_port')
        url = "api/v1/Status/info"
        u = 'http%s://%s:%s/%s' % (ssl, ip, port, url)

        try:
            res = requests.get(u)
            if res.status_code == 200:
                logger.debug('Ombi ping via ' + str(u))
                return True
            else:
                logger.error('Unable to contact Ombi via %s Response %s %s' % (u, str(res.status_code), str(res.reason)))
                return False
        except Exception, e:
            logger.error('Unable to contact Ombi via %s Response %s' % (u, str(e)))
            return False


    @cherrypy.expose()
    @require(member_of(htpc.role_admin))
    @cherrypy.tools.json_out()
    def test(self):
        # Fuller version of ping(). Includes auth test.
        # self.logger.info('Testing connectivity and credentials')
        url = 'api/v1/Stats'
        
        res = self._ombi_fetch('GET', url)
        if res.status_code == 200:
            return res.content
        else:
            # self.logger.info('Unable to contact Ombi via %s Response %s %s' % (u, str(res.response_code), str(res.reason)))
            return False

    def _ombi_fetch(self, rtype, url):
        """
        Combined function to make all Ombi API calls.
        Builds the url, authenticates and grabs token if there isn't one.
        If the call doesn't need auth, don't use this function.
        :param args:
        :rtype: GET, POST, PUT, DELETE
        :url: api endpoint
        :return: the requests response object.
        """
        # self.logger.info('Doing %s request to %s' % (rtype, url) )
        ssl = 's' if htpc.settings.get('ombi_ssl', False) else ''
        ip = htpc.settings.get('ombi_host')
        port = htpc.settings.get('ombi_port')
        u = 'http%s://%s:%s/%s' % (ssl, ip, port, url)
        return False

    def _get_url(self, host=None, port=None):
        u_host = host or htpc.settings.get('utorrent_host')
        u_port = port or htpc.settings.get('utorrent_port')
        return 'http://{}:{}/gui/'.format(striphttp(u_host), u_port)

    def auth(self, host, port, username, pwd):
        logger.debug('Fetching auth token')
        token_page = self.sess.get(self._get_url(host, port) + 'token.html', auth=(username, pwd))
        self._token = AuthTokenParser().token(token_page.content)
        self._cookies = token_page.cookies
        logger.debug('Auth token is %s' % self._token)
        return self._token

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


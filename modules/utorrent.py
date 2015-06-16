#!/usr/bin/env python
# -*- coding: utf-8 -*-


__author__ = 'quentingerome'


import requests
from cherrypy.lib.auth2 import require
import logging
import htpc
import cherrypy
from HTMLParser import HTMLParser
from htpc.helpers import striphttp

logger = logging.getLogger('modules.utorrent')


class AuthTokenParser(HTMLParser):
    token = None

    def handle_data(self, data):
        self._token = data

    def token(self, html):
        self._token = None
        self.feed(html)
        return self._token


fields = {
    'name': 2,
    'id': 0,
    'status': 1,
    'size': 3,
    'percentage_done': 4,
    'dl': 5,
    'up': 6,
    'dl_speed': 9,
    'up_speed': 8,
    'eta': 10,
    'ratio': 7,
}

status = {
    1: 'Started',
    2: 'Checking',
    4: 'Started&Checked',
    8: 'Checked',
    16: 'Error',
    32: 'Paused',
    64: 'Queued',
    128: 'Loaded'
}


def _get_torrent_state(state_sum):
    """
    Returns a list of all states of the torrent
    :param value: int
    :return: str
    """

    states = []
    for ps in sorted(status.keys(), reverse=True):
        if not state_sum:
            break
        if ps <= state_sum:
            states.append(ps)
            state_sum -= ps
    return states


def TorrentResult(values):
    """

    :param values:
    :type values: list
    :return:
    :rtype: dict
    """

    def get_result(vals):
        for key, idx in fields.items():
            if key != 'status':
                yield key, vals[idx]
            else:
                yield key, _get_torrent_state(vals[idx])

    return dict([(k, v) for k, v in get_result(values)])


class ConnectionError(Exception):
    pass


class UTorrent(object):
    _token = ''
    _cookies = None

    def __init__(self):
        self.sess = requests.session()
        htpc.MODULES.append({
            'name': 'uTorrent',
            'id': 'utorrent',
            'test': htpc.WEBDIR + 'utorrent/ping',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'utorrent_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'utorrent_name'},
                {'type': 'text', 'label': 'IP / Host *', 'name': 'utorrent_host'},
                {'type': 'text', 'label': 'Port', 'placeholder': '8080', 'name': 'utorrent_port'},
                {'type': 'text', 'label': 'Username', 'name': 'utorrent_username'},
                {'type': 'password', 'label': 'Password', 'name': 'utorrent_password'},
                {'type': 'text', 'label': 'Reverse proxy link', 'placeholder': '', 'desc': 'Reverse proxy link, e.g. https://utorrent.domain.com', 'name': 'utorrent_reverse_proxy_link'},

            ]
        })

    @cherrypy.expose()
    @require()
    def index(self):
        return htpc.LOOKUP.get_template('utorrent.html').render(scriptname='utorrent', webinterface=self.webinterface())

    def webinterface(self):
        ip = htpc.settings.get('utorrent_host')
        port = htpc.settings.get('utorrent_port')
        url = 'http://%s:%s/gui/' % (ip, port)

        if htpc.settings.get('utorrent_reverse_proxy_link'):
            url = htpc.settings.get('utorrent_reverse_proxy_link')

        return url

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def torrents(self):
        req = self.fetch('&list=1')
        # handle this better
        if req:
            torrents = req.json()['torrents']
            return {'torrents': [TorrentResult(tor) for tor in torrents], 'result': req.status_code}
        else:
            return {'result': 500}

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def start(self, torrent_id):
        return self.do_action('start', hash=torrent_id).json()

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def stop(self, torrent_id):
        return self.do_action('stop', hash=torrent_id).json()

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def remove(self, torrent_id):
        return self.do_action('remove', hash=torrent_id).json()

    @cherrypy.expose()
    @require()
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
        if r.json():
            for k in r.json()['settings']:
                if "max_dl_rate" in k:
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

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def ping(self, utorrent_host='', utorrent_port='',
             utorrent_username='', utorrent_password='', **kwargs):
        logger.debug("Testing uTorrent connectivity")
        try:
            res = self._fetch(utorrent_host, utorrent_port, utorrent_username, utorrent_password, '?list=1')
            logger.debug("Trying to contact uTorrent via " + self._get_url(utorrent_host, utorrent_port))
            if res.status_code == 200:
                return True
            else:
                return
        except Exception, e:
            logger.debug("Exception: %s" % e)
            logger.error("Unable to contact uTorrent via " + self._get_url(utorrent_host, utorrent_port))
            return

    def do_action(self, action, hash=None, s=None, **kwargs):
        """
        :param action:
        :param hash:
        :param kwargs:
        :rtype: requests.Response
        :return:
        """
        if action not in ('start', 'stop', 'pause', 'forcestart', 'unpause', 'remove', 'add-url', 'recheck', 'setprio',
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
    @require()
    @cherrypy.tools.json_out()
    def change_speed(self, **kw):
        if 'max_ul_rate' or 'max_dl_rate' in kw:
            self.do_action('setsetting', kw)
        else:
            logger.error('Wrong parameters given')

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def set_upspeed(self, speed, *arg, **kw):
        return self.fetch('&action=setsetting&s=max_ul_rate&v=' + speed)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def set_download(self, speed, *arg, **kw):
        return self.fetch('&action=setsetting&s=max_dl_rate&v=' + speed)

    def _get_url(self, host=None, port=None):
        u_host = host or htpc.settings.get('utorrent_host')
        u_port = port or htpc.settings.get('utorrent_port')

        return 'http://{}:{}/gui/'.format(striphttp(u_host), u_port)

    def auth(self, host, port, username, pwd):
        logger.debug('Fetching auth token')
        token_page = requests.get(self._get_url(host, port) + 'token.html', auth=(username, pwd))
        self._token = AuthTokenParser().token(token_page.content)
        self._cookies = token_page.cookies
        logger.debug('Auth token is %s' % self._token)

    def _fetch(self, host, port, username, pwd, args):
        """

        :param host:
        :param port:
        :param username:
        :param pwd:
        :param args:
        :rtype: requests.Response
        :return:
        """
        if not args:
            return

        token_str = '?token=%s' % self._token

        url = self._get_url(host, port) + token_str + args
        logger.debug('Trying to _fetch %s' % url)

        try:
            response = self.sess.get(self._get_url(host, port) + token_str + args,
                                     auth=(username, pwd), cookies=self._cookies)
            return response

        except Exception as e:
            logger.error("Fail to get %s exception %s" % (url, e))

    def fetch(self, args):
        """
        :param args:
        :rtype: requests.Response
        :return:
        """
        password = htpc.settings.get('utorrent_password', '')
        username = htpc.settings.get('utorrent_username', '')
        host = htpc.settings.get('utorrent_host')
        port = htpc.settings.get('utorrent_port')
        try:
            r = self._fetch(host, port, username, password, args)
            # Api returns 300 if invalid token according to the docs
            # really returns 400
            # Check for a valid http code
            if r.status_code == 200:
                return r
            elif r.status_code == 400:
                # Fetch a new token
                self.auth(host, port, username, password)
                r = self._fetch(host, port, username, password, args)
            else:
                # log http status and error message
                self.logger.error("%s" % r.raise_for_status())
                return r

        except Exception as e:
            logger.error("Failed to fetch args %s %s" % (args, e))

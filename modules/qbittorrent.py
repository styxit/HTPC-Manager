#!/usr/bin/env python
# -*- coding: utf-8 -*-

import htpc
import cherrypy
import json
import logging
import time
import math
from cherrypy.lib.auth2 import require, member_of
from htpc.helpers import striphttp, sizeof
import requests
from requests.auth import HTTPDigestAuth


class Qbittorrent(object):
    session = requests.Session()

    def __init__(self):
        self.logger = logging.getLogger('modules.qbittorrent')
        self.newapi = False
        self.authenticated = False
        self.testapi = None
        htpc.MODULES.append({
            'name': 'qBittorrent',
            'id': 'qbittorrent',
            'test': htpc.WEBDIR + 'qbittorrent/ping',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'qbittorrent_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'qbittorrent_name'},
                {'type': 'text', 'label': 'IP / Host', 'placeholder': 'localhost', 'name': 'qbittorrent_host'},
                {'type': 'text', 'label': 'Port', 'placeholder': '8080', 'name': 'qbittorrent_port'},
                {'type': 'text', 'label': 'Username', 'name': 'qbittorrent_username'},
                {'type': 'password', 'label': 'Password', 'name': 'qbittorrent_password'},
                {'type': 'bool', 'label': 'Use SSL', 'name': 'qbittorrent_ssl'},
                {'type': 'text', 'label': 'Reverse proxy link', 'placeholder': '', 'desc': 'Reverse proxy link ex: https://qbt.domain.com', 'name': 'qbittorrent_reverse_proxy_link'},

            ]
        })

    @cherrypy.expose()
    @require()
    def index(self):
        return htpc.LOOKUP.get_template('qbittorrent.html').render(scriptname='qbittorrent', webinterface=self.webinterface())

    def webinterface(self):
        host = striphttp(htpc.settings.get('qbittorrent_host', ''))
        port = htpc.settings.get('qbittorrent_port', '')
        ssl = 's' if htpc.settings.get('qbittorrent_ssl', 0) else ''
        url = 'http%s://%s:%s/' % (ssl, host, port)
        if htpc.settings.get('qbittorrent_reverse_proxy_link'):
            url = htpc.settings.get('qbittorrent_reverse_proxy_link')
        return url

    def qbturl(self):
        host = striphttp(htpc.settings.get('qbittorrent_host', ''))
        port = htpc.settings.get('qbittorrent_port', '')
        ssl = 's' if htpc.settings.get('qbittorrent_ssl', 0) else ''
        url = 'http%s://%s:%s/' % (ssl, host, port)
        return url

    @cherrypy.expose()
    @require()
    def login(self):
        self.logger.debug('Trying to login to qbittorrent')
        try:
            d = {'username': htpc.settings.get('qbittorrent_username', ''),
                 'password': htpc.settings.get('qbittorrent_password', '')
                 }
            # F33d da cookie monster
            r = self.session.post(self.qbturl() + 'login', data=d, verify=False, timeout=5)
            if r.content == 'Ok.':
                self.logger.debug('Successfully logged in with new api')
                self.authenticated = True
                self.newapi = True
            else:
                self.logger.error('Check your username and password')
            return r.content
        except Exception as e:
            self.logger.error('Failed to auth with new api %s' % e)
            return

    def _fetch(self, u, post=False, params=None, data=None):

        if params is None:
            params = {}

        host = striphttp(htpc.settings.get('qbittorrent_host', ''))
        port = htpc.settings.get('qbittorrent_port', '')
        ssl = 's' if htpc.settings.get('qbittorrent_ssl') else ''
        url = 'http%s://%s:%s/' % (ssl, host, port)
        username = htpc.settings.get('qbittorrent_username', '')
        password = htpc.settings.get('qbittorrent_password', '')

        url += u

        if self.testapi is None:
            self.ping()

        if self.newapi:
            if self.authenticated is False:
                self.login()

        if post:
            if self.newapi:
                r = self.session.post(url, data=data, verify=False, timeout=8)
            else:
                r = self.session.post(url, data=data, verify=False, timeout=8, auth=HTTPDigestAuth(username, password))
        else:
            if self.newapi:
                r = self.session.get(url, verify=False, timeout=8)
            else:
                r = self.session.get(url, verify=False, timeout=8, auth=HTTPDigestAuth(username, password))

        return r

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def fetch(self):
        try:
            if self.newapi:
                result = self._fetch('query/torrents?filter=all&sort=size&reverse=false')
                torrents = result.json()
                l = []
                for torrent in torrents:
                    t = {}
                    for k, v in torrent.items():
                        t[k] = v
                        if k == 'size':
                            t['size'] = sizeof(int(v))
                        if k == 'eta':
                            eta = time.strftime('%H:%M:%S', time.gmtime(v))
                            if eta == '00:00:00':
                                eta = u'\u221E'
                            t['eta'] = eta
                        if k == 'ratio':
                            t['ratio'] = math.ceil(v)
                    l.append(t)

                return l
            else:
                result = self._fetch('json/torrents')
                # r.json() does not like the infinity
                return json.loads(result.content)

        except Exception as e:
            self.logger.error("Couldn't get torrents %s" % e)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def get_speed(self):
        ''' Get total download and upload speed '''
        try:
            d = {}
            if not self.newapi:
                result = self._fetch('json/transferInfo/')
                result = result.json()

                speeddown = result['dl_info']
                speedup = result['up_info']

                list_of_down = speeddown.split()
                list_of_up = speedup.split()

                ds = list_of_down[1] + ' ' + list_of_down[2]
                dlstat = list_of_down[5] + ' ' + list_of_down[6]
                us = list_of_up[1] + ' ' + list_of_up[2]
                ulstat = list_of_down[5] + ' ' + list_of_down[6]

                d = {
                    'qbittorrent_speed_down': ds,
                    'qbittorrent_speed_up': us,
                    'qbittorrent_total_dl': dlstat,
                    'qbittorrent_total_ul': ulstat
                }
            else:
                # new api stuff
                result = self._fetch('query/transferInfo')
                result = result.json()

                d = {
                    'qbittorrent_speed_down': sizeof(result['dl_info_speed']),
                    'qbittorrent_speed_up': sizeof(result['up_info_speed']),
                    'qbittorrent_total_dl': sizeof(result['dl_info_data']),
                    'qbittorrent_total_ul': sizeof(result['up_info_data'])
                }

            return d

        except Exception as e:
            self.logger.error("Couldn't get total download and uploads speed %s" % e)

    def get_global_dl_limit(self):
        try:
            result = self._fetch('command/getGlobalDlLimit/')
            speed = int(result.content)
            speed /= 1024
            return speed
        except Exception as e:
            self.logger.error("Couldn't get global download limit %s" % e)

    def get_global_ul_limit(self):
        try:
            result = self._fetch('command/getGlobalUpLimit')

            speed = int(result.content)
            speed /= 1024
            return speed
        except Exception as e:
            self.logger.error("Couldn't get global upload limit %s" % e)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def get_global_limit(self):
        try:
            d = {}
            d['dl_limit'] = self.get_global_dl_limit()
            d['ul_limit'] = self.get_global_ul_limit()
            return d
        except Exception as e:
            self.logger.debug("Couldn't get global upload and download limits %s" % e)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    def command(self, cmd=None, hash=None, name=None, dlurl=None):
        ''' Handles pause, resume, delete singel torrents '''
        try:
            self.logger.debug('%s %s' % (cmd, name))
            data = {}

            if cmd == 'delete':
                data['hashes'] = hash

            elif cmd == 'download':
                data['urls'] = dlurl

            elif cmd == 'resumeall' or cmd == 'pauseall':
                # this does not work, bug in qbt see
                # https://github.com/qbittorrent/qBittorrent/issues/3016
                if self.newapi:
                    cmd = cmd[:-3] + 'All'

            else:
                data['hash'] = hash

            url = 'command/%s' % cmd

            # data is form encode..
            r = self._fetch(url, post=True, data=data)
            return r.content

        except Exception as e:
            self.logger.error('Failed at %s %s %s %s' % (cmd, name, hash, e))

    @cherrypy.expose()
    @require()
    def to_client(self, link, torrentname, **kwargs):
        ''' Is used by torrent search '''
        try:
            url = 'command/download/'
            data = {}
            data['urls'] = link
            return self._fetch(url, data=data, post=True)
            self.logger.info('%s %s is sendt to qBittorrent' % (torrentname, link))
        except Exception as e:
            self.logger.error('Failed to send %s %s to qBittorrent %s' % (link, torrentname, e))

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    def set_speedlimit(self, type=None, speed=None):
        ''' Sets global upload and download speed '''
        try:
            self.logger.debug('Setting %s to %s' % (type, speed))
            speed = int(speed)

            if speed == 0:
                speed = 0
            else:
                speed = speed * 1024

            url = 'command/' + type + '/'

            data = {}
            data['limit'] = speed

            r = self._fetch(url, data=data, post=True)
            return r.content

        except Exception as e:
            self.logger.error('Failed to set %s to %s %s' % (type, speed, e))

    @cherrypy.expose()
    @require()  # leave it as it uses this is get api version
    @cherrypy.tools.json_out()
    def ping(self, qbittorrent_host='', qbittorrent_port='', qbittorrent_username='', qbittorrent_password='', qbittorrent_ssl=False, **kw):
        self.logger.debug('Trying to connect to qBittorret')
        host = qbittorrent_host or htpc.settings.get('qbittorrent_host')
        port = qbittorrent_port or htpc.settings.get('qbittorrent_port')
        username = qbittorrent_username or htpc.settings.get('qbittorrent_username')
        password = qbittorrent_password or htpc.settings.get('qbittorrent_password')
        ssl = 's' if qbittorrent_ssl or htpc.settings.get('qbittorrent_ssl') else ''

        url = 'http%s://%s:%s/' % (ssl, host, port)

        self.newapi = False
        self.authenticated = False
        try:
            # We assume that its atleast 3.2 if this works.
            r = requests.get(url + 'version/api', timeout=8, verify=False)
            self.logger.debug('Trying to connect with new API %s' % r.url)
            # Old api returns a empty page
            if r.content != '' and r.ok:
                self.newapi = r.content
                self.testapi = True
                return r.content
            else:
                raise requests.ConnectionError

        except Exception as e:
            self.logger.debug('Failed to figure out what api version, trying old API')
            try:
                r = requests.post(url + 'json/torrents', auth=HTTPDigestAuth(username, password), timeout=10, verify=False)
                if r.ok:
                    self.logger.debug('Old API works %s' % r.url)
                    # Disable new api stuff
                    self.testapi = True
                    self.newapi = False
                    self.authenticated = False

            except Exception as e:
                self.newapi = False
                self.authenticated = False
                self.logger.debug('Failed to contact qBittorrent via old and newapi')
                self.logger.error('Cant contact qBittorrent, check you settings and try again %s' % e)

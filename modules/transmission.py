#!/usr/bin/env python
# -*- coding: utf-8 -*-

import cherrypy
import htpc
import requests
from json import dumps
import logging
from cherrypy.lib.auth2 import require, member_of
from htpc.helpers import fix_basepath, striphttp


class Transmission(object):
    # Transmission Session ID
    sessionId = ''
    reqz = requests.Session()

    def __init__(self):
        self.logger = logging.getLogger('modules.transmission')
        htpc.MODULES.append({
            'name': 'Transmission',
            'id': 'transmission',
            'test': htpc.WEBDIR + 'transmission/ping',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'transmission_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'transmission_name'},
                {'type': 'text', 'label': 'IP / Host', 'placeholder': 'localhost', 'name': 'transmission_host'},
                {'type': 'text', 'label': 'Port', 'placeholder': '9091', 'name': 'transmission_port'},
                {'type': 'text', 'label': 'Rpc url', 'placeholder': '', 'name': 'transmission_rpcbasepath'},
                {'type': 'text', 'label': 'Username', 'name': 'transmission_username'},
                {'type': 'password', 'label': 'Password', 'name': 'transmission_password'},
                {'type': 'text', 'label': 'Reverse Proxy link', 'desc': 'Reverse proxy link, e.g. https://transmission.domain.com', 'name': 'transmission_reverse_proxy_link'}
            ]
        })

    @cherrypy.expose()
    @require()
    def index(self):
        return htpc.LOOKUP.get_template('transmission.html').render(scriptname='transmission',
                                                                    webinterface=Transmission.webinterface())

    @staticmethod
    def webinterface():
        if htpc.settings.get('transmission_reverse_proxy_link'):
            url = htpc.settings.get('transmission_reverse_proxy_link')
        else:
            host = striphttp(htpc.settings.get('transmission_host', ''))
            port = htpc.settings.get('transmission_port', '9091')
            basepath = htpc.settings.get('transmission_rpcbasepath')

            # Default basepath is transmission
            if not basepath:
                basepath = '/transmission/'

            basepath = fix_basepath(basepath)

            url = 'http://%s:%s%sweb' % (host, port, basepath)

        return url

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def queue(self):
        fields = ['id', 'name', 'status', 'comment', 'downloadDir', 'downloadDir', 'percentDone', 'isFinished', 'eta', 'rateDownload', 'rateUpload', 'uploadRatio']
        return self.fetch('torrent-get', {'fields': fields})

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def stats(self):
        return self.fetch('session-stats')

    @cherrypy.expose()
    @require(member_of(htpc.role_admin))
    @cherrypy.tools.json_out()
    def ping(self, **kwargs):
        ''' Test connection to Transmission '''
        host = kwargs['transmission_host']
        port = kwargs['transmission_port']
        username = kwargs['transmission_username']
        password = kwargs['transmission_password']
        basepath = kwargs['transmission_rpcbasepath']
        auth = None

        if not basepath:
            basepath = fix_basepath('/transmission/')
        url = 'http://%s:%s%srpc' % (striphttp(host), port, basepath)

        # format post data
        data = {'method': 'session-get'}
        data = dumps(data)

        # Set Header
        header = {
            'X-Transmission-Session-Id': self.sessionId,
            'Content-Type': 'json; charset=UTF-8'
        }

        # Add authentication
        if username and password:
            auth = (username, password)

        try:
            r = self.reqz.post(url, data=data, timeout=10, headers=header, auth=auth)
            if r.ok:
                return r.json()
            else:
                if r.status_code == 409 and r.headers['x-transmission-session-id']:
                    self.logger.debug('Retry Transmission api with new session id.')
                    res = self.renewsession(url, data, header, auth, r)
                    return res

        except Exception as e:
            self.logger.error('Unable to fetch information from: %s %s' % (url, e))
            return

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def session(self):
        return self.fetch('session-get')

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def set_downspeed(self, speed):
        if int(speed) == 0:
            return self.fetch('session-set', {'speed-limit-down-enabled': False})
        return self.fetch('session-set', {'speed-limit-down': int(speed), 'speed-limit-down-enabled': True})

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def set_upspeed(self, speed):
        if int(speed) == 0:
            return self.fetch('session-set', {'speed-limit-up-enabled': False})
        return self.fetch('session-set', {'speed-limit-up': int(speed), 'speed-limit-up-enabled': True})

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def start(self, torrentId=False):
        if torrentId is False:
            return self.fetch('torrent-start-now')

        try:
            torrentId = int(torrentId)
        except ValueError:
            return False
        return self.fetch('torrent-start-now', {'ids': torrentId})

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def stop(self, torrentId=False):
        if torrentId is False:
            return self.fetch('torrent-stop')

        try:
            torrentId = int(torrentId)
        except ValueError:
            return False
        return self.fetch('torrent-stop', {'ids': torrentId})

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Add(self, filename=None, metainfo=None):
        if metainfo:
            return self.fetch('torrent-add', {'metainfo': metainfo})

        return self.fetch('torrent-add', {'filename': filename})

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def remove(self, torrentId):
        try:
            torrentId = int(torrentId)
        except ValueError:
            return False
        return self.fetch('torrent-remove', {'ids': torrentId})

    #For torrent search
    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def to_client(self, link, torrentname, **kwargs):
        try:
            self.logger.info('Added %s to uTorrent' % torrentname)
            return self.fetch('torrent-add', {'filename': link})
        except Exception as e:
            self.logger.debug('Failed to add %s to Transmission %s %s'(torrentname, link, e))

    # Wrapper to access the Transmission Api
    # If the first call fails, there probably is no valid Session ID so we try it again
    def fetch(self, method, arguments=''):
        ''' Do request to Transmission api '''
        self.logger.debug('Request transmission method: ' + method)

        host = striphttp(htpc.settings.get('transmission_host', ''))
        port = str(htpc.settings.get('transmission_port', ''))
        basepath = htpc.settings.get('transmission_rpcbasepath')
        username = htpc.settings.get('transmission_username')
        password = htpc.settings.get('transmission_password')

        auth = None

        # Default basepath is transmission
        if not basepath:
            basepath = '/transmission/'

        basepath = fix_basepath(basepath)

        url = 'http://%s:%s%srpc' % (host, str(port), basepath)

        # format post data
        data = {'method': method}
        if arguments:
            data['arguments'] = arguments
        data = dumps(data)

        # Set Header
        header = {
            'X-Transmission-Session-Id': self.sessionId,
            'Content-Type': 'json; charset=UTF-8'
        }

        if username and password:
            auth = (username, password)

        try:
            r = self.reqz.post(url, data=data, timeout=10, auth=auth, headers=header)
            if r.ok:
                return r.json()
            else:
                if r.status_code == 409 and r.headers['x-transmission-session-id']:
                    self.renewsession(url, data, header, auth, r)

        except Exception as e:
            self.logger.error('Unable to fetch information from: %s %s %s' % (url, data, e))
            return

    def renewsession(self, url, data, header, auth, r):
        self.logger.debug('Retry Transmission api with new session id.')
        self.sessionId = r.headers['x-transmission-session-id']
        header['X-Transmission-Session-Id'] = self.sessionId
        try:
            r = self.reqz.post(url, data=data, timeout=10, headers=header, auth=auth)
            if r.ok:
                return r.json()
        except Exception as e:
            self.logger.error('Unable access Transmission api with new session id. %s' % e)

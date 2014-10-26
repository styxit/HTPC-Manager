#!/usr/bin/env python
# -*- coding: utf-8 -*-

import cherrypy
import htpc
import urllib2
import base64
from json import loads, dumps
import logging
from cherrypy.lib.auth2 import require


class Transmission:
    # Transmission Session ID
    sessionId = ''

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
                {'type': 'text', 'label': 'Reverse Proxy', 'placeholder': '', 'name': 'transmission_revproxy'},
                {'type': 'text', 'label': 'Rpc url', 'placeholder': '', 'name': 'transmission_rpcbasepath'},
                {'type': 'text', 'label': 'Username', 'name': 'transmission_username'},
                {'type': 'password', 'label': 'Password', 'name': 'transmission_password'}
            ]
        })

    @cherrypy.expose()
    @require()
    def index(self):
        return htpc.LOOKUP.get_template('transmission.html').render(scriptname='transmission')

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
    @require()
    @cherrypy.tools.json_out()
    def ping(self, **kwargs):
        """ Test connection to Transmission """
        host = kwargs["transmission_host"]
        port = kwargs["transmission_port"]
        username = kwargs["transmission_username"]
        password = kwargs["transmission_password"]
        basepath = kwargs["transmission_rpcbasepath"]

        if basepath:
            if not basepath.startswith('/'):
                basepath = '/%s' % basepath
            if not basepath.endswith('/'):
                basepath += '/'
        else:
            # Default basepath is transmission
            basepath = '/transmission/'

        url = 'http://' + host + ':' + str(port) + basepath + 'rpc/'

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
            authentication = base64.encodestring('%s:%s' % (username, password)).replace('\n', '')
            header['Authorization'] = "Basic %s" % authentication

        try:
            request = urllib2.Request(url, data=data, headers=header)
            response = urllib2.urlopen(request).read()
            return loads(response)
        except urllib2.HTTPError, e:
             # Fetching url failed Maybe Transmission session must be renewed
            if (e.getcode() == 409 and e.headers['X-Transmission-Session-Id']):
                self.logger.debug("Setting new session ID provided by Transmission")

                # If response is 409 re-set session id from header
                self.sessionId = e.headers['X-Transmission-Session-Id']

                self.logger.debug("Retry Transmission api with new session id.")
                try:
                    header['X-Transmission-Session-Id'] = self.sessionId

                    req = urllib2.Request(url, data=data, headers=header)
                    response = urllib2.urlopen(req).read()
                    return loads(response)
                except:
                    self.logger.error("Unable access Transmission api with new session id.")
                    return
        except Exception:
            self.logger.error("Unable to fetch information from: " + url)
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def session(self):
        return self.fetch('session-get')

    @cherrypy.expose()
    @require()
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
    @require()
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
    def Add(self, filename):
        return self.fetch('torrent-add', {'filename': filename})

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def remove(self, torrentId):
        try:
            torrentId = int(torrentId)
        except ValueError:
            return False
        return self.fetch('torrent-remove', {'ids': torrentId})

    # Wrapper to access the Transmission Api
    # If the first call fails, there probably is no valid Session ID so we try it again
    def fetch(self, method, arguments=''):
        """ Do request to Transmission api """
        self.logger.debug("Request transmission method: " + method)

        host = htpc.settings.get('transmission_host', '')
        port = str(htpc.settings.get('transmission_port', ''))

        # Default basepath is transmission
        basepath = htpc.settings.get('transmission_rpcbasepath', '/transmission/')

        if basepath:
            if not basepath.startswith('/'):
                basepath = '/%s' % basepath
            if not basepath.endswith('/'):
                basepath += '/'
        else:
            basepath = '/transmission/'

        url = 'http://' + host + ':' + str(port) + basepath + 'rpc/'

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

        # Add authentication
        authentication = self.auth()
        if authentication:
            header['Authorization'] = "Basic %s" % authentication

        try:
            request = urllib2.Request(url, data=data, headers=header)
            response = urllib2.urlopen(request).read()
            return loads(response)
        except urllib2.HTTPError, e:
             # Fetching url failed Maybe Transmission session must be renewed
            if (e.getcode() == 409 and e.headers['X-Transmission-Session-Id']):
                self.logger.debug("Setting new session ID provided by Transmission")

                # If response is 409 re-set session id from header
                self.sessionId = e.headers['X-Transmission-Session-Id']

                self.logger.debug("Retry Transmission api with new session id.")
                try:
                    header['X-Transmission-Session-Id'] = self.sessionId

                    req = urllib2.Request(url, data=data, headers=header)
                    response = urllib2.urlopen(req).read()
                    return loads(response)
                except:
                    self.logger.error("Unable access Transmission api with new session id.")
                    return
        except Exception:
            self.logger.error("Unable to fetch information from: " + url)
            return

    # Construct url with login details
    def auth(self):
        """ Generate a base64 HTTP auth string based on settings """
        self.logger.debug("Generating authentication string for transmission")

        password = htpc.settings.get('transmission_password', '')
        username = htpc.settings.get('transmission_username', '')

        if username and password:
            return base64.encodestring('%s:%s' % (username, password)).replace('\n', '')

        return False

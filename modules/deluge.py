#!/usr/bin/env python
# -*- coding: utf-8 -*-

import cherrypy
import htpc
import requests
from json import dumps
import logging
from cherrypy.lib.auth2 import require
from htpc.helpers import fix_basepath, striphttp


class Deluge(object):
    session = requests.Session()

    def __init__(self):
        self.logger = logging.getLogger('modules.deluge')
        htpc.MODULES.append({
            'name': 'Deluge',
            'id': 'deluge',
            'test': htpc.WEBDIR + 'deluge/ping',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'deluge_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'deluge_name'},
                {'type': 'text', 'label': 'IP / Host *', 'name': 'deluge_host'},
                {'type': 'text', 'label': 'Port *', 'name': 'deluge_port'},
                {'type': 'bool', 'label': 'Use SSL', 'name': 'deluge_ssl'},
                {'type': 'text', 'label': 'Basepath', 'name': 'deluge_basepath'},
                {'type': 'password', 'label': 'Password', 'name': 'deluge_password'},
                {"type": "text", "label": "Reverse proxy link", "placeholder": "", "desc":"Reverse proxy link ex: https://deluge.domain.com", "name": "deluge_reverse_proxy_link"}

            ]
        })

    @cherrypy.expose()
    @require()
    def index(self):
        return htpc.LOOKUP.get_template('deluge.html').render(scriptname='deluge', webinterface=self.webinterface())

    def webinterface(self):
        host = striphttp(htpc.settings.get('deluge_host', ''))
        port = str(htpc.settings.get('deluge_port', ''))
        deluge_basepath = fix_basepath(htpc.settings.get('deluge_basepath', ''))
        ssl = 's' if htpc.settings.get('deluge_ssl') else ''

        url = 'http%s://%s:%s%s' % (ssl, host, port, deluge_basepath)

        if htpc.settings.get('deluge_reverse_proxy_link'):
            url = htpc.settings.get('deluge_reverse_proxy_link')

        return url

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def connected(self):
        return self.fetch('web.connected')

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def connect(self, hostid):
        return self.fetch('web.connect', [hostid])

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def get_hosts(self):
        return self.fetch('web.get_hosts')

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def queue(self):
        fields = ['progress', 'is_finished', 'ratio', 'name', 'download_payload_rate',
                  'upload_payload_rate', 'eta', 'state', 'hash', 'total_size']

        return self.fetch('core.get_torrents_status', [[], fields])

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def stats(self):
        fields = ["payload_download_rate", "payload_upload_rate"]
        return self.fetch('core.get_session_status', [fields])

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def start(self, torrentId):
        torrents = [torrentId]
        return self.fetch('core.resume_torrent', [torrents])

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def stop(self, torrentId):
        torrents = [torrentId]
        return self.fetch('core.pause_torrent', [torrents])

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def remove(self, torrentId, removeData):
        removeDataBool = bool(int(removeData))
        return self.fetch('core.remove_torrent', [torrentId, removeDataBool])

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def to_client(self, link, torrentname, **kwargs):
        try:
            self.logger.info('Added %s to deluge' % torrentname)
            # Find download path
            download_path = self.fetch('core.get_config_value', ['download_location'])
            if link.startswith('magnet'):
                path = link
            else:
                # deluge doesnt like a named download...
                link = link.split('?title=')[0]
                get_url = self.fetch('web.download_torrent_from_url', [link])
                path = get_url['result']

            return self.fetch('web.add_torrents', [[{'path': path, 'options': {'download_location': download_path['result']}}]])

        except Exception as e:
            self.logger.debug('Failed adding %s to deluge %s %s' % (torrentname, link, e))

    def fetch(self, method, arguments=None):
        """ Do request to Deluge api """
        if arguments is None:
            arguments = []

        host = striphttp(htpc.settings.get('deluge_host', ''))
        port = htpc.settings.get('deluge_port', '')
        deluge_basepath = fix_basepath(htpc.settings.get('deluge_basepath', '/'))
        ssl = 's' if htpc.settings.get('deluge_ssl') else ''

        url = 'http%s://%s:%s%sjson' % (ssl, host, port, deluge_basepath)

        self.logger.debug("Request deluge method: %s arguments %s" % (method, arguments))
        try:
            # format post data
            data = {'id': 1, 'method': method, 'params': arguments}

            response = self.session.post(url, data=dumps(data), verify=False)
            result = response.json()
            self.logger.debug("response is %s" % response.content)
            if result and result['error']:
                self.logger.debug('Authenticating')
                self.session.post(url, data=dumps({"method": "auth.login", "params": [htpc.settings.get('deluge_password', '')], "id": 1}), verify=False)
                response = self.session.post(url, data=dumps(data), verify=False)

            self.logger.debug("response is %s" % response.text)
            return result
        except Exception as e:
            self.logger.error('Failed to fetch method %s  arguments %s %s' % (method, arguments, e))

#!/usr/bin/env python
# -*- coding: utf-8 -*-

import cherrypy
import htpc
import requests
from json import dumps
import logging
from cherrypy.lib.auth2 import require, member_of
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
                {"type": "text", "label": "Reverse proxy link", "placeholder": "", "desc": "Reverse proxy link ex: https://deluge.domain.com", "name": "deluge_reverse_proxy_link"}

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

    def q2(self):
        """ not in use atm, todo """
        par = ["queue", "name", "total_wanted", "state", "progress", "num_seeds",
               "total_seeds", "num_peers", "total_peers", "download_payload_rate",
               "upload_payload_rate", "eta", "ratio", "distributed_copies", "is_auto_managed",
               "time_added", "tracker_host", "save_path", "total_done", "total_uploaded",
               "max_download_speed", "max_upload_speed", "seeds_peers_ratio"]

        return self.fetch('web.update_ui', [par, {}])

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def status(self):
        ''' quick  '''
        results = self.fetch('web.update_ui', [['payload_upload_rate', 'payload_download_rate, state'], {}])
        if results['error'] is None:
            # py. 2.6..
            d = dict(tuple(results['result']['filters']['state']))
            results['result']['filters']['state'] = d

        return results

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def stats(self):
        fields = ['payload_upload_rate', 'payload_download_rate, state']
        return self.fetch('core.get_session_status', [fields])

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def start(self, torrentId):
        return self.fetch('core.resume_torrent', [[torrentId]])

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def stop(self, torrentId=None):
        return self.fetch('core.pause_torrent', [[torrentId]])

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def do_all(self, status):
        if status == 'resume':
            method = 'core.resume_all_torrents'
        else:
            method = 'core.pause_all_torrents'

        return self.fetch(method)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def daemon(self, status, port):
        if status == 'start':
            action = 'web.start_daemon'
        else:
            action = 'web.stop_daemon'
        return self.fetch(action, [int(port)])

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def set_dlspeed(self, speed):
        self.logger.debug('Set download speed to %s' % speed)
        if speed == '0':
            speed = -1
        return self.fetch('core.set_config', [{'max_download_speed': int(speed)}])

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def set_ulspeed(self, speed):
        if speed == '0':
            speed = -1
        self.logger.debug('Set upload speed to %s' % speed)

        return self.fetch('core.set_config', [{'max_upload_speed': int(speed)}])

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def addtorrent(self, torrent, filename=''):
        result = self.fetch('core.add_torrent_file', [filename, torrent, {}])
        return result

    '''
    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def getconfig(self):
        #should be removed
        return self.fetch('core.get_config')
    '''

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def get_speed(self):
        ''' speed limit '''
        result = self.fetch('core.get_config')
        # Dunno why the f, core.get_config_values didnt work...
        d = {}
        if result:
            d['max_download_speed'] = result['result']['max_download_speed']
            d['max_upload_speed'] = result['result']['max_upload_speed']
            result['result'] = d
            return result

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def remove(self, torrentId, removeData):
        removeDataBool = bool(int(removeData))
        return self.fetch('core.remove_torrent', [torrentId, removeDataBool])

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def to_client(self, link='', torrentname='', **kwargs):
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
            headers = {'Content-Type': 'application/json'}

            response = self.session.post(url, data=dumps(data), headers=headers, verify=False)
            result = response.json()
            if result and result['error']:
                self.logger.debug('Authenticating')
                self.session.post(url, data=dumps({"method": "auth.login", "params": [htpc.settings.get('deluge_password', '')], "id": 1}), headers=headers, verify=False)
                response = self.session.post(url, data=dumps(data), headers=headers, verify=False)

            return result
        except Exception as e:
            self.logger.error('Failed to fetch method %s  arguments %s %s' % (method, arguments, e))

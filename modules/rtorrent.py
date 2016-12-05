#!/usr/bin/env python
from __future__ import division

import htpc, cherrypy, logging, xmlrpclib, base64
from cherrypy.lib.auth2 import require, member_of
from htpc.helpers import serve_template, fix_basepath, striphttp

class RTorrent(object):
    def __init__(self):
        self.logger = logging.getLogger('modules.rtorrent')
        htpc.MODULES.append({
            'name': 'rTorrent',
            'id': 'rtorrent',
            'test': htpc.WEBDIR + 'rtorrent/ping',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'rtorrent_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'rtorrent_menuname'},
                {'type': 'bool', 'label': 'Use SSL', 'name': 'rtorrent_ssl'},
                {'type': 'text', 'label': 'Host *', 'name': 'rtorrent_host', 'placeholder': 'localhost:80',
                 'desc': 'RPC Communication URI. Usually scgi://localhost:5000, httprpc://localhost/rutorrent or localhost:80'},
                {'type': 'text', 'label': 'RPC Path', 'name': 'rtorrent_rpcpath',
                 'placeholder': '/RPC2', 'desc': 'Change if your RPC mount is at a different path'},
                {'type': 'text', 'label': 'Username', 'name': 'rtorrent_username'},
                {'type': 'password', 'label': 'Password',
                    'name': 'rtorrent_password'},
            ]
        })

    @cherrypy.expose()
    @require()
    def index(self):
        return htpc.LOOKUP.get_template('rtorrent.html').render(scriptname='rtorrent')

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def queue(self):
        server = xmlrpclib.Server(self.stored_rpcurl())
        torrents = server.d.multicall("main", "d.get_name=",
                                      "d.get_bytes_done=", "d.get_complete=", "d.get_ratio=",
                                      "d.get_down_rate=", "d.get_up_rate=", "d.get_size_bytes=",
                                      "d.get_hash=", "d.get_state=")
        results = []
        for torrent in torrents:
            results.append({
                'name': torrent[0],
                'progress': (torrent[1] / torrent[6]) * 100,
                'is_finished': torrent[2],
                'ratio': torrent[3],
                'download_payload_rate': torrent[4],
                'upload_payload_rate': torrent[5],
                'eta': '-1',  # TODO implement eta calculation
                'state': 'Started' if torrent[8] == 1 else 'Paused',
                'hash': torrent[7],
                'total_size': torrent[6]
            })
        return {'result': results}

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def ping(self, rtorrent_host, rtorrent_rpcpath, rtorrent_username='', rtorrent_password='', rtorrent_ssl=False, **kwargs):
        server_url = self.rpc_url(
            rtorrent_host, rtorrent_rpcpath, rtorrent_ssl, rtorrent_username, rtorrent_password)
        self.logger.debug("Trying to contact rtorrent via %s" % server_url)
        server = xmlrpclib.Server(server_url)
        return server.system.client_version()

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def start(self, torrentId=False):
        self.logger.debug("Starting torrent %s" % (torrentId))
        server = xmlrpclib.Server(self.stored_rpcurl())
        if torrentId is False:
            return server.d.multicall("main", "d.start")
        return server.d.start(torrentId)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def stop(self, torrentId=False):
        self.logger.debug("Stopping torrent %s" % (torrentId))
        server = xmlrpclib.Server(self.stored_rpcurl())
        if torrentId is False:
            return server.d.multicall("main", "d.stop")
        return server.d.stop(torrentId)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def remove(self, torrentId):
        self.logger.debug("Removing torrent %s" % (torrentId))
        server = xmlrpclib.Server(self.stored_rpcurl())
        return server.d.erase(torrentId)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def add(self, filename=None, metainfo=None):
        self.logger.debug("Adding torrent: %s" % filename)
        server = xmlrpclib.Server(self.stored_rpcurl())
        if metainfo:
            data = base64.b64decode(metainfo)
            res = server.load_raw_start(xmlrpclib.Binary(data))
        else:
            res = server.load_start(filename)
        return {'error': False} if res == 0 else {'error': True}

    # For torrent search
    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def to_client(self, link, torrentname, **kwargs):
        self.logger.debug("Adding torrent from torrentsearch")
        try:
            return self.add(link)
        except Exception as e:
            self.logger.debug('Failed to add %s to rTorrent %s %s' % (torrentname, link, e))

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def stats(self):
        server = xmlrpclib.Server(self.stored_rpcurl())
        mc = xmlrpclib.MultiCall(server)
        mc.throttle.global_down.rate()
        mc.throttle.global_up.rate()
        mc.throttle.global_down.max_rate()
        mc.throttle.global_up.max_rate()
        results = mc()
        return {
            'result': {
                'stats': {
                    'download_rate': str(results[0] if results[0] >= 1024 else 0),
                    'upload_rate': str(results[1] if results[1] >= 1024 else 0),
                    'max_download_speed': str(results[2] / 1024 if results[2] >= 1024 else -1),
                    'max_upload_speed': str(results[3] / 1024 if results[3] >= 1024 else -1)
                }
            }
        }

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def set_downspeed(self, speed):
        speed = "%sk" % speed
        self.logger.debug('Set download speed to %s' % speed)
        server = xmlrpclib.Server(self.stored_rpcurl())
        result = server.set_download_rate(speed)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def set_upspeed(self, speed):
        speed = "%sk" % speed
        self.logger.debug('Set upload speed to %s' % speed)
        server = xmlrpclib.Server(self.stored_rpcurl())
        result = server.set_upload_rate(speed)

    def stored_rpcurl(self):
        return self.rpc_url(htpc.settings.get('rtorrent_host', ''), htpc.settings.get('rtorrent_rpcpath', ''),
                            htpc.settings.get('rtorrent_ssl'), htpc.settings.get('rtorrent_username', ''), htpc.settings.get('rtorrent_password', ''))

    def rpc_url(self, host, rpc_path, ssl, username, password):
        host = striphttp(host)
        rpc_path = fix_basepath(rpc_path).rstrip('/')
        if not rpc_path:
            rpc_path = '/RPC2'
        ssl = 's' if ssl else ''
        auth_string = ""
        if username or password:
            auth_string = "%s:%s@" % (username, password)
        server_url = 'http%s://%s%s%s' % (ssl, auth_string, host, rpc_path)
        return server_url

# plexpy
import logging

import requests
import cherrypy
import htpc
from htpc.helpers import get_image, striphttp
import sys

from cherrypy.lib.auth2 import require, member_of
from urllib import urlencode
from functools import partial
import inspect
import json




class Plexpy(object):
    def __init__(self, *args, **kwargs):
        self.logger = logging.getLogger('modules.plexpy')
        htpc.MODULES.append({
            'name': 'Plexpy',
            'id': 'plexpy',
            'test': htpc.WEBDIR + 'plexpy/ping',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'plexpy_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'plexpy_name'},
                {'type': 'text', 'label': 'IP / Host *', 'name': 'plexpy_host'},
                {'type': 'text', 'label': 'Port *', 'name': 'plexpy_port'},
                {'type': 'text', 'label': 'Basepath', 'name': 'plexpy_basepath'},
                {'type': 'text', 'label': 'API key', 'name': 'plexpy_apikey'},
                {'type': 'bool', 'label': 'Use SSL', 'name': 'plexpy_ssl'},
                {'type': 'text', "label": 'Reverse proxy link', 'placeholder': '', 'desc': 'Reverse proxy link ex: https://domain.com/hp', 'name': 'plexpy_reverse_proxy_link'}

            ]
        })
        # Add endpoints
        self._build_methods()


    @cherrypy.expose()
    @require()
    def index(self):
        print htpc.settings.get('plexpy_name')
        return htpc.LOOKUP.get_template('plexpy.html').render(scriptname='plexpy', webinterface=self.webinterface())

    def webinterface(self):
        url = Plexpy._build_url()
        if htpc.settings.get('headphones_reverse_proxy_link'):
            url = htpc.settings.get('headphones_reverse_proxy_link')
        return url

    @staticmethod
    def _build_url(ssl=None, host=None, port=None, base_path=None):
        ssl = ssl or htpc.settings.get('plexpy_ssl')
        host = host or htpc.settings.get('plexpy_host')
        port = port or htpc.settings.get('plexpy_port')
        base_path = base_path or htpc.settings.get('plexpy_basepath')

        path = base_path or '/'
        if path.startswith('/') is False:
            path = '/' + path
        if path.endswith('/') is False:
            path += '/'

        url = '{protocol}://{host}:{port}{path}'.format(
            protocol='https' if ssl else 'http',
            host=striphttp(host),
            port=port,
            path=path,
        )

        return url

    def _build_methods(cls):

        """Helper to build endspoints like plexpyapi"""
        r = cls._fetch(**{'cmd': 'docs'})

        def dummy(func_name='', *args, **kwargs):
            d = {'cmd': func_name}
            d.update(kwargs)
            return json.dumps(cls._fetch(**d))

        for cmd, doc in r.items():
            if cmd in []:
                func = require(partial(dummy, cmd))
            else:
                func = partial(dummy, cmd)

            setattr(cls, cmd, func)
            f = getattr(cls, cmd)
            # So the url is reachable
            f.exposed = True

        return r

    def _fetch(cls, *args, **kwargs):
        #http://10.0.0.97:8181/api/v2?apikey=df5f9f2b97e4c6dec08157d2b6a98c33&cmd=docs
        apikey = htpc.settings.get('plexpy_apikey')

        if apikey is None:
            raise

        url = '%sapi/v2?apikey=%s&%s' % (cls._build_url(), apikey, urlencode(kwargs))

        r = requests.get(url)
        r.raise_for_status()
        print r.headers

        try:
            resp = r.json()
            if resp.get('response', {}).get('result') == 'success':
                return resp['response']['data']
        except:
            return r.content

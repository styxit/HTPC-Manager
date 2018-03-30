# plexpy
from functools import partial
import json
import logging
from urllib import urlencode

import requests
import cherrypy

import htpc
from htpc.helpers import get_image, striphttp, fix_basepath
from cherrypy.lib.auth2 import require, member_of

log = logging.getLogger('modules.plexpy')


class Plexpy(object):
    def __init__(self, *args, **kwargs):
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
        # self._build_methods()

    @cherrypy.expose()
    @require()
    def index(self):
        return htpc.LOOKUP.get_template('plexpy.html').render(scriptname='plexpy', webinterface=self._webinterface())

    def ping(self, *args, **kwargs):
        k = kwargs.copy()
        k.update(dict(cmd='get_docs'))
        return self._fetch(**k)

    def _webinterface(cls):
        url = Plexpy._build_url()
        if htpc.settings.get('plexpy_reverse_proxy_link'):
            url = htpc.settings.get('plexpy_reverse_proxy_link')
        return url

    @staticmethod
    def _build_url(ssl=None, host=None, port=None, base_path=None):
        ssl = ssl or htpc.settings.get('plexpy_ssl')
        host = host or htpc.settings.get('plexpy_host')
        port = port or htpc.settings.get('plexpy_port')
        path = base_path or htpc.settings.get('plexpy_basepath', '/')

        url = '{protocol}://{host}:{port}{path}'.format(
            protocol='https' if ssl else 'http',
            host=striphttp(host),
            port=port,
            path=fix_basepath(path),
        )

        return url

    #def _build_methods(cls):
    #    """Helper to build endspoints like plexpy api"""
    #    r = cls._fetch(**{'cmd': 'docs'})
    #    if not r:
    #        return

    #    def dummy(func_name='', *args, **kwargs):
    #        d = {'cmd': func_name}
    #        d.update(kwargs)
    #        return json.dumps(cls._fetch(**d))

    #    for cmd, doc in r.items():
    #        if cmd in []:
    #            func = require(partial(dummy, cmd))
    #        else:
    #            func = partial(dummy, cmd)

    #        setattr(cls, cmd, func)
    #        f = getattr(cls, cmd)
    #        # So the url is reachable
    #        f.exposed = True
    #
    #    return r

    def _fetch(cls, *args, **kwargs):
        """Get stuff from plexpy and handles errors"""
        apikey = htpc.settings.get('plexpy_apikey')

        if apikey is None:
            raise

        url = '%sapi/v2?apikey=%s&%s' % (cls._build_url(), apikey, urlencode(kwargs))

        try:
            r = requests.get(url, verify=False)
            r.raise_for_status()
            # Lets just copy the headers for now.
            cherrypy.response.headers['Content-Type'] = r.headers.get('Content-Type', 'application/json;charset=UTF-8')
            resp = r.json()
            if resp.get('response', {}).get('result') == 'success':
                return resp['response']['data']
        except:
            log.exception('Failed to get %s' % url)
            return

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    @require()
    def get_history(self, *args, **kwargs):
        log.debug('Fetching history')
        k = kwargs.copy()
        k.update(dict(cmd='get_history'))
        return self._fetch(**k)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    @require()
    def get_activity(self, *args, **kwargs):
        log.debug('Fetching activity')
        k = kwargs.copy()
        k.update(dict(cmd='get_activity'))
        return self._fetch(**k)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    @require()
    def get_home_stats(self, *args, **kwargs):
        log.debug('Fetching home stats')
        k = kwargs.copy()
        k.update(dict(cmd='get_home_stats'))
        return self._fetch(**k)

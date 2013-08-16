# coding=utf-8
import base64
import requests

__author__ = 'quentingerome'
import logging
import htpc
import cherrypy
from lxml import html

logger = logging.getLogger('modules.transmission')


class TorrentResult(object):
    _torrent = None

    """
    HACHAGE (chaîne),
	STATUS (ÉTAT)* (entier),
	NOM (chaîne),
	TAILLE (entier, en octets),
	POURCENTAGE EN COURS (entier, en millions),
	TÉLÉCHARGÉ (entier, en octets),
	CHARGÉ (entier, en octets),
	RAPPORT (entier, en millions),
	VITESSE DE CHARGEMENT (entier, en octets par seconde),
	VITESSE DE TÉLÉCHARGEMENT (entier, en octets par seconde),
	HEURE DE FIN PRÉVUE (entier, en secondes),
	ÉTIQUETTE (chaîne),
	PAIRS CONNECTÉS (entier),
	PAIRS DANS L'ESSAIM (entier),
	SOURCES CONNECTÉES (entier),
	SOURCES DANS L'ESSAIM (entier),
	DISPONIBILITÉ (entier, exprimé selon un rapport 1/65535e),
	ORDRE DE LA FILE D'ATTENTE TORRENT (entier),
	RESTANT (entier, en octets)	],

    """


    _keys = {
        'name' : 2,
        'id' : 0,
        'status': 1,
        'size' : 3,
        'percentage_done' : 4,
        'dl' : 5,
        'up' : 6,
        'dl_speed' : 8,
        'up_speed' : 9,
        'eta' : 10,
        'ratio' : 7,
    }

    def __init__(self, torrent):
        super(TorrentResult, self).__init__()
        self._torrent = torrent

    def get(self, key):
        try:
            return self._torrent[self._keys[key]]
        except KeyError:
            raise AttributeError

    def to_dict(self):
        return {k: self._torrent[index] for k, index in self._keys.items()}


class UTorrent:
    _token = None
    _cookies = None

    def __init__(self):
        htpc.MODULES.append({
            'name': 'uTorrent',
            'id': 'utorrent',
            'test': htpc.WEBDIR + 'utorrent/ping',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'utorrent_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'utorrent_name'},
                {'type': 'text', 'label': 'IP / Host *', 'name': 'utorrent_host'},
                {'type': 'text', 'label': 'Port *', 'name': 'utorrent_port'},
                {'type': 'text', 'label': 'Username', 'name': 'utorrent_username'},
                {'type': 'password', 'label': 'Password', 'name': 'utorrent_password'}
            ]})

    @cherrypy.expose()
    def index(self):
        return htpc.LOOKUP.get_template('utorrent.html').render(scriptname='utorrent')


    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def ping(self, utorrent_host='', utorrent_port='',
            utorrent_username='', utorrent_password='', **kwargs):
        logger.debug("Testing uTorrent connectivity")
        try:
            res = self._fetch(utorrent_host, utorrent_port, utorrent_username, utorrent_password, '?list=1')
            logger.debug("Trying to contact uTorrent via " + self._get_url(utorrent_host, utorrent_port))
            return res.status_code == 200
        except Exception, e:
            logger.debug("Exception: " + str(e))
            logger.error("Unable to contact uTorrent via " + self._get_url(utorrent_host, utorrent_port))
            return

    def _get_url(self, host=None, port=None):
        u_host = host or htpc.settings.get('utorrent_host')
        u_port = port or htpc.settings.get('utorrent_port')

        return 'http://{}:{}/gui/'.format(u_host, u_port)

    def auth(self, host, port, username, pwd):
        token_page = requests.get(self._get_url(host, port)+'token.html', auth=(username, pwd))
        self._token = html.document_fromstring(token_page.content).get_element_by_id('token').text
        self._cookies = token_page.cookies

    def _fetch(self, host, port, username, pwd, args):
        if not self._cookies or not self._token:
            self.auth(host, port, username, pwd)
        if not args:
            return
        token_str = '&token=%s' % self._token

        response = requests.get(self._get_url(host, port)+args+token_str, auth=(username, pwd), cookies=self._cookies)
        return response

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def torrents(self):
        req = self.fetch('?list=1')
        torrents = req.json()['torrents']
        return {'torrents':[TorrentResult(tor).to_dict() for tor in torrents], 'result':req.status_code}

    def fetch(self, args):
        password = htpc.settings.get('utorrent_password', '')
        username = htpc.settings.get('utorrent_username', '')
        host = htpc.settings.get('utorrent_host')
        port = htpc.settings.get('utorrent_port')
        try:
            return self._fetch(host, port, username, password, args)
        except Exception, e:
            logger.exception(e)
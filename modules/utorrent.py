# coding=utf-8
import base64
import requests

__author__ = 'quentingerome'
import logging
import htpc
import cherrypy
import collections
from lxml import html

logger = logging.getLogger('modules.transmission')


class ConnectionError(Exception):
    pass

class TorrentResult(collections.Mapping):
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

    STATUS (ÉTAT) est un bitfield représenté par des entiers, qui constitue la somme des différentes valeurs des états correspondants :

    1 = Started (Démarré)
    2 = Checking (Vérification)
    4 = Start after check (Démarrer après vérification)
    8 = Checked (Vérifié)
    16 = Error (Erreur)
    32 = Paused (Suspendu)
    64 = Queued (Mis en file d'attente)
    128 = Loaded (Chargé)

    """

    _conversions = {
        'status' :
            {
                1 : 'Started',
                2 : 'Checking',
                4 : 'Started&Checked',
                8 : 'Checked',
                16: 'Error',
                32 : 'Paused',
                64 : 'Queued',
                128 : 'Loaded'
            },
        'fields' :
            {
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
            },
    }

    def _get_state(self, value):
        """
        Returns a list of all states of the torrent
        :param value: int
        :return: str
        """

        states = []
        for ps in sorted(self._conversions['status'].keys(), reverse=True):
            if not value:
                break
            if ps <= value:
                states.append(ps)
                value -= ps
        return states

    def to_dict(self):
        """
        Returns the object in dict (maybe useless, need to check)
        :rtype: dict
        """
        return {k: v for k, v in self.items()}

    def __transform_key__(self, key):
        """
        Returns the correct key according to the key passed. Each key match a single index of the values list
        :param key:
        :type: str
        :rtype: int
        """
        return self._conversions['fields'][key]

    def __init__(self, values):
        self.store = values

    def __getitem__(self, item):
        right_item = self.store[self.__transform_key__(item)]
        if item == 'status':
            return self._get_state(right_item)
        return right_item

    def __len__(self):
        return len(self.store)

    def __iter__(self):
        return iter(self._conversions['fields'])

    def __str__(self):
        return str(self.to_dict())


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
    def torrents(self):
        try:
            req = self.fetch('?list=1')
        except ConnectionError:
            return {'result' : 500}
        torrents = req.json()['torrents']
        return {'torrents':[TorrentResult(tor).to_dict() for tor in torrents], 'result':req.status_code}

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def start(self, torrent_id):
        return self.do_action('start', torrent_id).json()

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def stop(self, torrent_id):
        return self.do_action('stop', torrent_id).json()

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def remove(self, torrent_id):
        return self.do_action('remove', torrent_id).json()

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

    def do_action(self, action, torrent_id):
        if action not in ('start', 'stop', 'pause', 'forcestart', 'unpause', 'remove'):
            raise AttributeError
        try:
            return self.fetch('?action=%s&hash=%s' % (action, torrent_id))
        except ConnectionError:
            return {'result': 500}

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

    def fetch(self, args):
        password = htpc.settings.get('utorrent_password', '')
        username = htpc.settings.get('utorrent_username', '')
        host = htpc.settings.get('utorrent_host')
        port = htpc.settings.get('utorrent_port')
        try:
            return self._fetch(host, port, username, password, args)
        except requests.ConnectionError:
            raise ConnectionError
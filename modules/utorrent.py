# coding=utf-8
import requests

__author__ = 'quentingerome'
import logging
import htpc
import cherrypy
from lxml import html

logger = logging.getLogger('modules.transmission')

fields = {
	'name': 2,
	'id': 0,
	'status': 1,
	'size': 3,
	'percentage_done': 4,
	'dl': 5,
	'up': 6,
	'dl_speed': 8,
	'up_speed': 9,
	'eta': 10,
	'ratio': 7,
}

status = {
	1: 'Started',
	2: 'Checking',
	4: 'Started&Checked',
	8: 'Checked',
	16: 'Error',
	32: 'Paused',
	64: 'Queued',
	128: 'Loaded'
}


def _get_torrent_state(state_sum):
	"""
	Returns a list of all states of the torrent
	:param value: int
	:return: str
	"""

	states = []
	for ps in sorted(status.keys(), reverse=True):
		if not state_sum:
			break
		if ps <= state_sum:
			states.append(ps)
			state_sum -= ps
	return states


def TorrentResult(values):
	"""

	:param values:
	:type values: list
	:return:
	:rtype: dict
	"""

	def get_result(vals):
		for key, idx in fields.items():
			if key != 'status':
				yield key, vals[idx]
			else:
				yield key, _get_torrent_state(vals[idx])

	return dict([(k, v) for k, v in get_result(values)])


class ConnectionError(Exception):
	pass


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
			return {'result': 500}
		torrents = req.json()['torrents']
		return {'torrents': [TorrentResult(tor) for tor in torrents], 'result': req.status_code}

	@cherrypy.expose()
	@cherrypy.tools.json_out()
	def start(self, torrent_id):
		return self.do_action('start', hash=torrent_id).json()

	@cherrypy.expose()
	@cherrypy.tools.json_out()
	def stop(self, torrent_id):
		return self.do_action('stop', hash=torrent_id).json()

	@cherrypy.expose()
	@cherrypy.tools.json_out()
	def remove(self, torrent_id):
		return self.do_action('remove', hash=torrent_id).json()

	@cherrypy.expose()
	@cherrypy.tools.json_out()
	def add_url(self, url):
		try:
			res = self.do_action('add-url', s=url)
			return {'result': res.status_code}
		except ConnectionError, e:
			logger.exception(e)

	@cherrypy.expose()
	@cherrypy.tools.json_out()
	def ping(self, utorrent_host='', utorrent_port='',
			 utorrent_username='', utorrent_password='', **kwargs):
		logger.debug("Testing uTorrent connectivity")
		try:
			res = self._fetch(utorrent_host, utorrent_port, utorrent_username, utorrent_password, '?list=1')
			logger.debug("Trying to contact uTorrent via " + self._get_url(utorrent_host, utorrent_port))
			if res.status_code == 200:
				return True
			else:
				return
		except Exception, e:
			logger.debug("Exception: " + str(e))
			logger.error("Unable to contact uTorrent via " + self._get_url(utorrent_host, utorrent_port))
			return

	def do_action(self, action, hash=None, **kwargs):
		"""
        :param action:
        :param hash:
        :param kwargs:
        :rtype: requests.Response
        :return:
        """
		if action not in ('start', 'stop', 'pause', 'forcestart', 'unpause', 'remove', 'add-url'):
			raise AttributeError
		try:
			params_str = ''.join(["&%s=%s" % (k, v) for k, v in kwargs.items()])
			return self.fetch('?action=%s%s&hash=%s' % (action, params_str, hash))
		except ConnectionError:
			return {'result': 500}

	def _get_url(self, host=None, port=None):
		u_host = host or htpc.settings.get('utorrent_host')
		u_port = port or htpc.settings.get('utorrent_port')

		return 'http://{}:{}/gui/'.format(u_host, u_port)

	def auth(self, host, port, username, pwd):
		token_page = requests.get(self._get_url(host, port) + 'token.html', auth=(username, pwd))
		self._token = html.document_fromstring(token_page.content).get_element_by_id('token').text
		self._cookies = token_page.cookies

	def _fetch(self, host, port, username, pwd, args):
		"""

        :param host:
        :param port:
        :param username:
        :param pwd:
        :param args:
        :rtype: requests.Response
        :return:
        """
		if not self._cookies or not self._token:
			self.auth(host, port, username, pwd)
		if not args:
			return
		token_str = '&token=%s' % self._token

		response = requests.get(self._get_url(host, port) + args + token_str, auth=(username, pwd),
								cookies=self._cookies)
		return response

	def fetch(self, args):
		"""

        :param args:
        :rtype: requests.Response
        :return:
        """
		password = htpc.settings.get('utorrent_password', '')
		username = htpc.settings.get('utorrent_username', '')
		host = htpc.settings.get('utorrent_host')
		port = htpc.settings.get('utorrent_port')
		try:
			return self._fetch(host, port, username, password, args)
		except requests.ConnectionError:
			raise ConnectionError
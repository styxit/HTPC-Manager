#!/usr/bin/env python
# -*- coding: utf-8 -*-

import cherrypy
import htpc
from urllib import quote
from urllib2 import urlopen
from json import loads
import logging
from cherrypy.lib.auth2 import require, member_of
from htpc.helpers import fix_basepath, striphttp


class Sabnzbd(object):
    def __init__(self):
        self.logger = logging.getLogger('modules.sabnzbd')
        htpc.MODULES.append({
            'name': 'SABnzbd',
            'id': 'sabnzbd',
            'test': htpc.WEBDIR + 'sabnzbd/version',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'sabnzbd_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'sabnzbd_name'},
                {'type': 'text', 'label': 'IP / Host', 'placeholder': 'localhost', 'name': 'sabnzbd_host'},
                {'type': 'text', 'label': 'Port', 'placeholder': '8080', 'name': 'sabnzbd_port'},
                {'type': 'text', 'label': 'Basepath', 'name': 'sabnzbd_basepath'},
                {'type': 'text', 'label': 'API key', 'name': 'sabnzbd_apikey'},
                {'type': 'bool', 'label': 'Use SSL', 'name': 'sabnzbd_ssl'},
                {'type': 'text', 'label': 'Reverse proxy link', 'placeholder': '', 'desc': 'Reverse proxy link, e.g. https://sab.domain.com', 'name': 'sabnzbd_reverse_proxy_link'},

            ]
        })

    @cherrypy.expose()
    @require()
    def index(self):
        return htpc.LOOKUP.get_template('sabnzbd.html').render(scriptname='sabnzbd', webinterface=self.webinterface())

    @cherrypy.expose()
    @require(member_of(htpc.role_admin))
    @cherrypy.tools.json_out()
    def version(self, sabnzbd_host, sabnzbd_basepath, sabnzbd_port, sabnzbd_apikey, sabnzbd_ssl=False, **kwargs):
        self.logger.debug('Fetching version information from sabnzbd')
        ssl = 's' if sabnzbd_ssl else ''

        if not sabnzbd_basepath:
            sabnzbd_basepath = '/sabnzbd/'

        sabnzbd_basepath = fix_basepath(sabnzbd_basepath)

        url = 'http%s://%s:%s%sapi?output=json&apikey=%s' % (ssl, striphttp(sabnzbd_host), sabnzbd_port, sabnzbd_basepath, sabnzbd_apikey)

        try:
            return loads(urlopen(url + '&mode=version', timeout=10).read())
        except:
            self.logger.error('Unable to contact sabnzbd via ' + url)
            return

    def webinterface(self):
        host = striphttp(htpc.settings.get('sabnzbd_host', ''))
        port = str(htpc.settings.get('sabnzbd_port', ''))
        basepath = htpc.settings.get('sabnzbd_basepath')
        ssl = 's' if htpc.settings.get('sabnzbd_ssl', 0) else ''

        if not basepath:
            basepath = '/sabnzbd/'

        sabnzbd_basepath = fix_basepath(basepath)

        url = 'http%s://%s:%s%s' % (ssl, host, port, sabnzbd_basepath)

        if htpc.settings.get('sabnzbd_reverse_proxy_link'):
            url = htpc.settings.get('sabnzbd_reverse_proxy_link')

        return url

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetHistory(self, limit=''):
        self.logger.debug('Fetching history')
        return self.fetch('&mode=history&limit=' + limit)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetStatus(self):
        self.logger.debug('Fetching queue')
        return self.fetch('&mode=queue')

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetWarnings(self):
        self.logger.debug('Fetching warning')
        return self.fetch('&mode=warnings')

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def TogglePause(self, mode='', time=''):
        print mode, time
        if time:
            self.logger.debug('Pausing for %s minutes' % time)
            return self.fetch('&mode=config&name=set_pause&value=' + time)
        return self.fetch('&mode=' + mode)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def AddNzbFromUrl(self, nzb_url, nzb_category='', nzb_name=''):
        self.logger.debug('Adding nzb from url')
        self.logger.debug('%s %s %s' % (quote(nzb_url), nzb_category, nzb_name))
        if 'api.nzbgeek.info' in nzb_url:
            nzb_url = nzb_url.replace('amp;', '')
        if nzb_category:
            nzb_category = '&cat=' + nzb_category
        return self.fetch('&mode=addurl&name=' + quote(nzb_url) + nzb_category + '&priority=2')

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def DeleteNzb(self, id):
        self.logger.debug('Deleting nzb')
        return self.fetch('&mode=queue&name=delete&value=' + id)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def DeleteHistory(self, id):
        self.logger.debug('Deleting history')
        return self.fetch('&mode=history&name=delete&value=' + id)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def Retry(self, id):
        self.logger.debug('Retry download')
        return self.fetch('&mode=retry&value=' + id)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetCategories(self):
        self.logger.debug('Fetch available categories')
        return self.fetch('&mode=get_cats')

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def ChangeCategory(self, id, cat):
        self.logger.debug('Changing category of download')
        return self.fetch('&mode=change_cat&value=' + id + '&value2=' + cat)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def SetSpeed(self, speed):
        self.logger.debug('Setting speed-limit')
        return self.fetch('&mode=config&name=speedlimit&value=' + speed)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def Swap(self, v1, v2):
        self.logger.debug('Swaping nzb position to %s' % v2)
        return self.fetch('&mode=switch&value=%s&value2=%s' % (v1, v2))

    def fetch(self, path):
        try:
            host = striphttp(htpc.settings.get('sabnzbd_host', ''))
            port = str(htpc.settings.get('sabnzbd_port', ''))
            apikey = htpc.settings.get('sabnzbd_apikey', '')
            sabnzbd_basepath = fix_basepath(htpc.settings.get('sabnzbd_basepath', '/sabnzbd/'))
            ssl = 's' if htpc.settings.get('sabnzbd_ssl', 0) else ''

            url = 'http%s://%s:%s%sapi?output=json&apikey=%s%s' % (ssl, host, port, sabnzbd_basepath, apikey, path)
            self.logger.debug('Fetching information from: %s' % url)
            return loads(urlopen(url, timeout=10).read(), strict=False)
        except Exception as e:
            self.logger.error('Cannot contact sabnzbd %s' % e)
            return

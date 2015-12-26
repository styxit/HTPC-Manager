#!/usr/bin/env python
# -*- coding: utf-8 -*-

import cherrypy
import htpc
import requests
from requests.auth import HTTPBasicAuth
import logging
import base64
import re
from cherrypy.lib.auth2 import require, member_of
from jsonrpclib import jsonrpc
from htpc.helpers import fix_basepath, striphttp


class NZBGet(object):
    def __init__(self):
        self.logger = logging.getLogger('modules.nzbget')
        htpc.MODULES.append({
            'name': 'NZBGet',
            'id': 'nzbget',
            'test': htpc.WEBDIR + 'nzbget/version',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'nzbget_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'nzbget_name'},
                {'type': 'text', 'label': 'IP / Host', 'placeholder': 'localhost', 'name': 'nzbget_host'},
                {'type': 'text', 'label': 'Port', 'placeholder': '6789', 'name': 'nzbget_port'},
                {'type': 'text', 'label': 'Basepath', 'placeholder': '/nzbget', 'name': 'nzbget_basepath'},
                {'type': 'text', 'label': 'User', 'name': 'nzbget_username'},
                {'type': 'password', 'label': 'Password', 'name': 'nzbget_password'},
                {'type': 'bool', 'label': 'Use SSL', 'name': 'nzbget_ssl'},
                {'type': 'text', 'label': 'Reverse proxy link', 'placeholder': '', 'desc': 'Reverse proxy link, e.g. https://nzbget.domain.com', 'name': 'nzbget_reverse_proxy_link'},

            ]
        })

    @cherrypy.expose()
    @require()
    def index(self):
        return htpc.LOOKUP.get_template('nzbget.html').render(scriptname='nzbget', webinterface=self.webinterface())

    def nzbget_url(self):
        host = striphttp(htpc.settings.get('nzbget_host', ''))
        port = str(htpc.settings.get('nzbget_port', ''))
        username = htpc.settings.get('nzbget_username', '')
        password = htpc.settings.get('nzbget_password', '')
        nzbget_basepath = fix_basepath(htpc.settings.get('nzbget_basepath', '/'))
        ssl = 's' if htpc.settings.get('nzbget_ssl', True) else ''

        if username and password:
            authstring = '%s:%s@' % (username, password)
        else:
            authstring = ''

        url = 'http%s://%s%s:%s%sjsonrpc' % (ssl, authstring, host, port, nzbget_basepath)
        return url

    def webinterface(self):
        host = striphttp(htpc.settings.get('nzbget_host', ''))
        port = str(htpc.settings.get('nzbget_port', ''))
        username = htpc.settings.get('nzbget_username', '')
        password = htpc.settings.get('nzbget_password', '')
        nzbget_basepath = fix_basepath(htpc.settings.get('nzbget_basepath', '/'))
        ssl = 's' if htpc.settings.get('nzbget_ssl', True) else ''

        if username and password:
            authstring = '%s:%s@' % (username, password)
        else:
            authstring = ''

        url = 'http%s://%s%s:%s%s' % (ssl, authstring, host, port, nzbget_basepath)

        if htpc.settings.get('nzbget_reverse_proxy_link'):
            url = htpc.settings.get('nzbget_reverse_proxy_link')

        return url

    @cherrypy.expose()
    @require(member_of(htpc.role_admin))
    @cherrypy.tools.json_out()
    def version(self, nzbget_host, nzbget_basepath, nzbget_port, nzbget_username, nzbget_password, nzbget_ssl=False, **kwargs):
        self.logger.debug("Fetching version information from nzbget")
        ssl = 's' if nzbget_ssl else ''

        nzbget_basepath = fix_basepath(nzbget_basepath)

        url = 'http%s://%s:%s%sjsonrpc/version' % (ssl, striphttp(nzbget_host), nzbget_port, nzbget_basepath)
        try:
            if nzbget_username and nzbget_password:
                r = requests.get(url, timeout=10, auth=(nzbget_username, nzbget_password))
            else:
                r = requests.get(url, timeout=10)

            return r.json()

        except:
            self.logger.error("Unable to contact nzbget via %s" % url)
            return

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetHistory(self):
        try:
            self.logger.debug("Fetching history")
            nzbget = jsonrpc.ServerProxy('%s' % self.nzbget_url())
            return nzbget.history()
        except Exception as e:
            self.logger.error("Failed to get history %s" % e)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def Swap(self, nzbid=None, oldpos=None, newpos=None):
        self.logger.debug('Moving %s from %s to %s' % (nzbid, oldpos, newpos))
        try:
            nzbget = jsonrpc.ServerProxy('%s' % self.nzbget_url())
            relpos = int(newpos) - int(oldpos)
            return nzbget.editqueue("GroupMoveOffset", relpos, "", [int(nzbid)])
        except Exception as e:
            self.logger.error("Failed to move %s from %s to %s %s" % (nzbid, oldpos, newpos, e))

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def AddNzbFromUrl(self, nzb_url='', nzb_category='', nzb_name='', f=''):
        self.logger.info("Added %s category %s url %s" % (nzb_name, nzb_category, nzb_url))
        r = False
        try:
            nzbget = jsonrpc.ServerProxy('%s' % self.nzbget_url())
            if f:
                # f = nzbfile
                r = nzbget.append(nzb_name, nzb_category, False, f)
            else:
                sess = requests.Session()
                nzb = sess.get(nzb_url, timeout=30)

                if not nzb_name:
                    try:
                        # Try to get the filename from the download
                        # TODO check if x-dnzb-name is on all indexers
                        nzb_name = nzb.headers.get('x-dnzb-name')
                    except Exception as e:
                        self.logger.error('%s' % e)
                        self.logger.debug('Trying to parse the nzbname from content-disposition')
                        nzb_name = nzb.headers.get('content-disposition').split('filename=')[1].replace('.nzb', '').replace('"', '')

                nzb = nzb.content
                r = nzbget.append(nzb_name, nzb_category, False, base64.standard_b64encode(nzb))

        except Exception as e:
            self.logger.error("Failed to add %s %s to queue %s" % (nzb_name, nzb_url, e))
        return r

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def ForceScan(self):
        self.logger.debug('Scan incoming directory')
        try:
            nzbget = jsonrpc.ServerProxy('%s' % self.nzbget_url())
            return nzbget.scan()
        except Exception as e:
            self.logger.error('Failed while scanning incoming directory %s' % e)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetCategorys(self):
        self.logger.debug('Fetching categories')
        categorys = []
        # Add default category
        categorys.append('')
        try:
            nzbget = jsonrpc.ServerProxy('%s' % self.nzbget_url())
            config = nzbget.config()
            r = re.compile(ur'(Category\d+.name)', re.IGNORECASE)
            for category in config:
                if re.match(r, category['Name']):
                    categorys.append(category['Value'])
        except Exception as e:
            self.logger.error('Failed to fetch categorys %s' % e)

        return categorys

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def ChangeCategory(self, nzbid=None, cat=None, nzbname=None):
        self.logger.debug('Change %s nzbname id %s to category %s' % (nzbname, nzbid, cat))
        r = False
        try:
            nzbget = jsonrpc.ServerProxy('%s' % self.nzbget_url())
            if nzbid and cat:
                r = nzbget.editqueue("GroupSetCategory", 0, cat, [int(nzbid)])
        except Exception as e:
            self.logger.error('Failed to set %s on %s' % (cat, nzbname, e))
        return r

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetWarnings(self):
        try:
            self.logger.debug("Fetching warnings")
            nzbget = jsonrpc.ServerProxy('%s' % self.nzbget_url())
            return nzbget.log(0, 1000)
        except Exception as e:
            self.logger.error("Failed to fetch warnings %s" % e)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def queue(self):
        try:
            self.logger.debug("Fetching queue")
            nzbget = jsonrpc.ServerProxy('%s' % self.nzbget_url())
            return nzbget.listgroups()
        except Exception as e:
            self.logger.error("Failed to fetch queue %s" % e)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def status(self):
        try:
            self.logger.debug("Fetching status")
            nzbget = jsonrpc.ServerProxy('%s' % self.nzbget_url())
            return nzbget.status()
        except Exception as e:
            self.logger.error("Failed to fetch queue %s" % e)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def QueueAction(self, action):
        try:
            self.logger.debug(action + " ALL")
            nzbget = jsonrpc.ServerProxy('%s' % self.nzbget_url())
            if 'resume' in action:
                status = nzbget.resume()
            elif 'pause' in action:
                status = nzbget.pause()
            return status
        except Exception as e:
            self.logger.error("Failed to %s" % (action, e))

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def IndividualAction(self, nzbid='', name='', action=''):
        try:
            self.logger.debug("%s %s %s" % (action, name, nzbid))
            nzbget = jsonrpc.ServerProxy('%s' % self.nzbget_url())
            if 'resume' in action:
                action = 'GroupResume'
            elif 'pause' in action:
                action = 'GroupPause'
            elif 'delete' in action:
                action = 'GroupDelete'
            elif 'hidehistory' in action:
                action = 'HistoryDelete'
            status = nzbget.editqueue(action, 0, '', [int(nzbid)])
            return status
        except Exception as e:
            self.logger.error("Failed to %s %s %s %s" % (action, name, nzbid, e))
            return False

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def SetSpeed(self, speed):
        try:
            self.logger.debug("Setting speed-limit %s" % speed)
            nzbget = jsonrpc.ServerProxy('%s' % self.nzbget_url())
            return nzbget.rate(int(speed))
        except Exception as e:
            self.logger.error("Failed to set speed to %s %s" % (speed, e))
            return False

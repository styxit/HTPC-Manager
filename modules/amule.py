#!/usr/bin/env python
# -*- coding: utf-8 -*-

import traceback
import re
import cherrypy
import htpc
import requests
from json import loads, dumps
import logging
from cherrypy.lib.auth2 import require


class aMule:
    loginurl = ''
    mainurl = ''
    footerurl = ''
    password = ''
    
    sessionId = ''

    def __init__(self):
        self.logger = logging.getLogger('modules.amule')
        htpc.MODULES.append({
            'name': 'aMule',
            'id': 'amule',
            'test': htpc.WEBDIR + 'amule/ping',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'amule_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'amule_name'},
                {'type': 'text', 'label': 'IP / Host', 'placeholder': 'localhost', 'name': 'amule_host'},
                {'type': 'text', 'label': 'Port', 'placeholder': '4711', 'name': 'amule_port'},
                {'type': 'password', 'label': 'Password', 'name': 'amule_password'}
            ]
        })

    @cherrypy.expose()
    @require()
    def index(self):
        host = htpc.settings.get('amule_host', '')
        port = htpc.settings.get('amule_port', '')
        password = htpc.settings.get('amule_password', '')
        
        self.logger.info("Setting global variables..")
        
        self.loginurl = 'http://' + host + ':' + str(port) + '/login.php'
        self.logger.info("url=" + self.loginurl)
        
        self.mainurl = 'http://' + host + ':' + str(port) + '/amuleweb-main-dload.php'
        self.logger.info("mainurl=" + self.mainurl)
        
        self.footerurl = 'http://' + host + ':' + str(port) + '/footer.php'
        self.logger.info("footerurl=" + self.footerurl)
        
        
        self.password = password
        return htpc.LOOKUP.get_template('amule.html').render(scriptname='amule')

  
    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def ping(self, **kwargs):
        """ Test connection to aMule """
        host = kwargs["amule_host"]
        port = kwargs["amule_port"]
        password = kwargs["amule_password"]
        
        self.logger.info("Setting global variables..")
        
        self.loginurl = 'http://' + host + ':' + str(port) + '/login.php'
        self.logger.info("url=" + self.loginurl)
        
        self.mainurl = 'http://' + host + ':' + str(port) + '/amuleweb-main-dload.php'
        self.logger.info("mainurl=" + self.mainurl)
        
        self.footerurl = 'http://' + host + ':' + str(port) + '/footer.php'
        self.logger.info("footerurl=" + self.footerurl)
        
        
        self.password = password
        
        self.renewSession()
        
        return self.load()
        
    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()  
    def load(self):        
        regEx = '<div.*id="amule-data"[^>]*>(.*)<\/div>'
        self.logger.info(self.mainurl)
        response = requests.get(self.mainurl, cookies=dict(amuleweb_session_id=self.sessionId))
       
        m = re.search(regEx, response.text, re.DOTALL)
        if m is None:
            self.logger.info("No amule data found. Trying to set new amule_session_id")
            self.renewSession()
            
            response = requests.get(self.mainurl, cookies=dict(amuleweb_session_id=self.sessionId))
       
            m = re.search(regEx, response.text, re.DOTALL)
            if m is None:
                return
        
        data = m.group(1)
        
        return loads(data)
        
        
    @cherrypy.expose()
    @require()
    def start(self, fileHash=False):

        if fileHash is not False:
            data = {'command': 'resume', fileHash: 'on'}
            self.logger.info(self.mainurl)
            response = requests.post(self.mainurl, data=data, cookies=dict(amuleweb_session_id=self.sessionId))

        return
        
    @cherrypy.expose()
    @require()
    def stop(self, fileHash=False):

        if fileHash is not False:
            data = {'command': 'pause', fileHash: 'on'}
            self.logger.info(self.mainurl)
            response = requests.post(self.mainurl, data=data, cookies=dict(amuleweb_session_id=self.sessionId))

        return
        
    @cherrypy.expose()
    @require()
    def remove(self, fileHash=False):

        if fileHash is not False:
            data = {'command': 'cancel', fileHash: 'on'}
            self.logger.info(self.mainurl)
            response = requests.post(self.mainurl, data=data, cookies=dict(amuleweb_session_id=self.sessionId))

        return
        
    @cherrypy.expose()
    @require()
    def add(self, ed2klink=False):

        if ed2klink is not False:
            self.logger.info(ed2klink)
            data = {'ed2klink': ed2klink, 'selectcat': 'all', 'Submit' : 'Download link'}
            self.logger.info(self.footerurl)
            response = requests.post(self.footerurl, data=data, cookies=dict(amuleweb_session_id=self.sessionId))

        return

    def renewSession(self):
        data = {'pass': self.password}
        response = requests.post(self.loginurl, data=data)
        self.sessionId = response.cookies['amuleweb_session_id']
        self.logger.info('amuleweb_session_id=' + self.sessionId)
        return

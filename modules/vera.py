#!/usr/bin/env python
# -*- coding: utf-8 -*-

import cherrypy
import htpc
from urllib2 import urlopen
from json import loads
import logging
from cherrypy.lib.auth2 import require

class Vera:
    def __init__(self):
        self.logger = logging.getLogger('modules.vera')
        htpc.MODULES.append({
            'name': 'Vera',
            'id': 'vera',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'vera_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'vera_name'},
                {'type': 'text', 'label': 'IP / Host', 'placeholder':'192.168.0.*','name': 'vera_host'},
                {'type': 'text', 'label': 'Port', 'placeholder':'3480', 'name': 'vera_port'},
                {'type':'text', 'label':'Username (optional)', 'name':'vera_username'},
                {'type':'password', 'label':'Password (optional)', 'name':'vera_password'},
        ]})
        
    @cherrypy.expose()
    @require()				
    def index(self):
        return htpc.LOOKUP.get_template('vera.html').render(scriptname='vera')
    
    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetDevices(self):
        self.logger.debug("Fetching Devices")
        return self.fetch('data_request?id=user_data2')
        
    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def ToggleStateAction(self, dtype, id, state):
        self.logger.debug("Toggle Device State")
        if dtype == 'light':
            return self.fetch('data_request?id=action&output_format=json&DeviceNum=' + id + '&serviceId=urn:upnp-org:serviceId:Dimming1&action=SetLoadLevelTarget&newLoadlevelTarget=' + state)
        elif dtype == 'plug':
            return self.fetch('data_request?id=action&output_format=json&DeviceNum=' + id + '&serviceId=urn:upnp-org:serviceId:SwitchPower1&action=SetTarget&newTargetValue=' + state)
        elif dtype == 'lock':
            return self.fetch('data_request?id=action&output_format=json&DeviceNum=' + id + '&serviceId=urn:micasaverde-com:serviceId:DoorLock1&action=SetTarget&newTargetValue=' + state)
        else:
            self.logger.error("Unable to determine device type")
            return
   
    def fetch(self, path):
        try:
            host = htpc.settings.get('vera_host', '')
            port = str(htpc.settings.get('vera_port', ''))

            url = 'http://' + host + ':' + port + '/' + path
            self.logger.debug("Fetching information from: " + url)
            return loads(urlopen(url).read())
            
        except:
            self.logger.error("Cannot contact Vera")
            return

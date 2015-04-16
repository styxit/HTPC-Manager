#!/usr/bin/env python
# -*- coding: utf-8 -*-

import cherrypy
import htpc
import logging
import socket
import base64
import ssdp
import xmltodict
import urllib2
import re
import itertools
import operator
from cherrypy.lib.auth2 import require
#from uuid import getnode as get_mac


class Samsungtv:
    def __init__(self):
        self.logger = logging.getLogger('modules.samsungtv')
        htpc.MODULES.append({
            'name': 'Samsung Remote',
            'id': 'samsungtv',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'samsungtv_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'samsungtv_name'},
                {'type': 'select',
                 'label': 'TVs',
                 'name': 'tvs',
                 'options': [
                    {'name': 'Select', 'value': 0}
                ]},
                {'type': 'text', 'label': 'IP / Host *', 'name': 'samsungtv_host'},
                {'type': 'text', 'label': 'Tv Model', 'name': 'samsungtv_model'},
                {'type': 'text', 'label': 'HTPC Manager MAC', 'name': 'samsung_htpcmac'},
                {'type': 'text', 'label': 'HTPC Manager IP', 'name': 'samsung_htpchost'}

        ]})

    @cherrypy.expose()
    @require()
    def index(self):
        return htpc.LOOKUP.get_template('samsungtv.html').render(scriptname='samsungtv')

    @cherrypy.expose()
    @require()
    def sendkey(self, action):
        try:
            key = action
            if key == 'undefined':
                return
            else:
                src = htpc.settings.get('samsung_htpchost', '')
                mac = htpc.settings.get('samsung_htpcmac', '')
                remote = 'HTPC Manager Remote'
                dst = htpc.settings.get('samsungtv_host', '')
                application = 'python'
                tv  = htpc.settings.get('samsungtv_model', '')

                new = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                new.connect((dst, 55000))
                msg = chr(0x64) + chr(0x00) +\
                    chr(len(base64.b64encode(src)))    + chr(0x00) + base64.b64encode(src) +\
                    chr(len(base64.b64encode(mac)))    + chr(0x00) + base64.b64encode(mac) +\
                    chr(len(base64.b64encode(remote))) + chr(0x00) + base64.b64encode(remote)
                pkt = chr(0x00) +\
                    chr(len(application)) + chr(0x00) + application +\
                    chr(len(msg)) + chr(0x00) + msg
                new.send(pkt)
                msg = chr(0x00) + chr(0x00) + chr(0x00) +\
                chr(len(base64.b64encode(key))) + chr(0x00) + base64.b64encode(key)
                pkt = chr(0x00) +\
                    chr(len(tv))  + chr(0x00) + tv +\
                    chr(len(msg)) + chr(0x00) + msg
                new.send(pkt)
                new.close()
        except Exception as e:
            print e
            self.logger.debug('Failed to send %s to the tv' % key)

    def getIPfromString(self, string):
        try:
            return re.search("(\d{1,3}\.){3}\d{1,3}", string).group()
        except:
            return ''

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def findtv(self, id=None):
        result_list = []
        r = []
        sr = 0

        # Find htpc.managers ip
        ip = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        ip.connect(('8.8.8.8', 80))
        local_ip = ip.getsockname()[0]

        iid = 0

        # Tries to find the mac, this is likly to be the wrong one.. my tv accepts anything
        #mac = ':'.join(("%012X" % get_mac())[i:i+2] for i in range(0, 12, 2))
        # Fake the mac since my tv accepts anything
        mac = 'E8:E0:B7:D3:A4:62'

        # Since udp sucks balls
        while True:
            sr += 1
            search = ssdp.discover('ssdp:all')
            #search = ssdp.discover('urn:samsung.com:device:RemoteControlReceiver:1')
            r.append(search)
            if len(r) >= 2:
                break

        for i in r:
            for item in i:
                host = self.getIPfromString(item.location)
                if host:
                    try:
                        desc = urllib2.urlopen(item.location).read()
                        d = {}
                        xml = xmltodict.parse(desc)
                        if 'tv' in xml["root"]["device"]["friendlyName"].lower():
                            iid += 1
                            d["name"] = xml["root"]["device"]["friendlyName"]
                            d["host"] = host
                            d["id"] = iid
                            d["tv_model"] = xml["root"]["device"]["modelName"]
                            d["local_ip"] = local_ip
                            d["mac"] = mac
                            result_list.append(d)

                    except Exception as e:
                        pass#
        if id:
            for tt in result_list:
                if tt["id"] == int(id):
                    return tt

        if len(result_list) == 1:
            return result_list

        # Remove dupe dicts from list
        getvals = operator.itemgetter('host')
        result_list.sort(key=getvals)
        result = []
        for k, g in itertools.groupby(result_list, getvals):
            result.append(g.next())
        result_list[:] = result

        return result_list

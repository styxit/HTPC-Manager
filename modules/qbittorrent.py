# coding=utf-8

import logging
import htpc
import cherrypy
import urllib2
import urllib
import json


class qbittorrent:
    def __init__(self):
        self.logger = logging.getLogger('modules.qbittorrent')
        htpc.MODULES.append({
        'name': 'qBittorrent',
        'id': 'qbittorrent',
        'test': htpc.WEBDIR + 'qbittorrent/ping',
        'fields': [
            {'type': 'bool', 'label': 'Enable', 'name': 'qbitorrent_enable'},
            {'type': 'text', 'label': 'Menu name', 'name': 'qbittorrent_name'},
            {'type': 'text', 'label': 'IP / Host *', 'name': 'qbittorrent_host'},
            {'type': 'text', 'label': 'Port *', 'name': 'qbittorrent_port'},
            {'type': 'text', 'label': 'Username', 'name': 'qbittorrent_username'},
            {'type': 'password', 'label': 'Password', 'name': 'qbittorrent_password'},
            {'type': 'bool', 'label': 'Use SSL', 'name': 'qbittorrent_ssl'}
        ]})
        
    @cherrypy.expose()
    def index(self):
        return htpc.LOOKUP.get_template('qbittorrent.html').render(scriptname='qbittorrent')
    
    #Get url from settings and handles auth
    @cherrypy.expose()
    def qbturl(self):
        host = htpc.settings.get('qbittorrent_host')
        port = htpc.settings.get('qbittorrent_port')
        username = htpc.settings.get('qbittorrent_username')
        password = htpc.settings.get('qbittorrent_password')
        ssl = htpc.settings.get('qbittorrent_ssl')
        if ssl:
            pre ='https://'
        else:
            pre = 'http://'
        
        url = pre + host + ':' + port + '/'
        
        realm = 'Web UI Access'
        authhandler = urllib2.HTTPDigestAuthHandler()
        authhandler.add_password(realm, url, username, password)
        opener = urllib2.build_opener(authhandler)
        urllib2.install_opener(opener)
        
        return url
        
    #Fetches torrentlist from the client
    @cherrypy.expose()
    def fetch(self):
        host = htpc.settings.get('qbittorrent_host')
        port = htpc.settings.get('qbittorrent_port')
        username = htpc.settings.get('qbittorrent_username')
        password = htpc.settings.get('qbittorrent_password')
        result = None
       
        try:
            url = self.qbturl()
            result = urllib2.urlopen(url + 'json/torrents').read()
        
        except Exception as e:
            print e
        
        return result
    
    # Gets total download and upload speed
    @cherrypy.expose()
    def get_speed(self):
        url = self.qbturl()
        result = urllib2.urlopen(url + 'json/transferInfo').read()
        result = json.JSONDecoder('UTF-8').decode(result)
        
        speeddown = result['dl_info']
        speedup = result['up_info']
        
        list_of_down = speeddown.split()
        list_of_up = speedup.split()
        
        ds = list_of_down[1] + " " + list_of_down[2]
        us = list_of_up[1] + " " + list_of_up[2]
        
        d = dict()
        d["qbittorrent_speed_down"] = ds
        d["qbittorrent_speed_up"] = us
        
        l = []
        l.append(d)
        
        rr = json.dumps(l)
        
        return rr
    
    # Handles pause, resume, delete singel torrents
    @cherrypy.expose
    def command(self, cmd=None, hash=None, name=None):
        url = self.qbturl()
        url += 'command/%s/' % cmd
        data = {}
        
        if cmd == 'delete':
            data['hashes'] = hash
        else:
            data['hash'] = hash
        
        if cmd == 'resumeall' or 'pauseall':
            r = urllib2.urlopen(url + cmd)
   
        data = urllib.urlencode(data)
        
        try:
            result = urllib2.urlopen(url, data).read()
        
        except Exception as e:
            print 'Error!::%s' % e 
    
    # Sets global upload and download speed
    @cherrypy.expose
    def set_speedlimit(self, type=None, speed=None):
        speed = int(speed)
        
        if speed == 0:
            speed = 0
            
        else:
            speed = speed * 1024
        
        try:
            url = self.qbturl()
            url += 'command/' + type

        except Exception as e:
            print e
        
        data = {}
        data['limit'] = speed
        data = urllib.urlencode(data)
        
        try:
            result = urllib2.urlopen(url, data)
         
        except Exception as e:
            print e
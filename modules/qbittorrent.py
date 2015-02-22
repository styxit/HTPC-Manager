#!/usr/bin/env python
# -*- coding: utf-8 -*-

import htpc
import cherrypy
import urllib2
import urllib
import json
import logging
from cherrypy.lib.auth2 import require
from htpc.helpers import striphttp


class Qbittorrent(object):
    def __init__(self):
        self.logger = logging.getLogger("modules.qbittorrent")
        htpc.MODULES.append({
            "name": "qBittorrent",
            "id": "qbittorrent",
            #"test": htpc.WEBDIR + "qbittorrent/ping",
            "fields": [
                {"type": "bool", "label": "Enable", "name": "qbittorrent_enable"},
                {"type": "text", "label": "Menu name", "name": "qbittorrent_name"},
                {"type": "text", "label": "IP / Host", "placeholder": "localhost", "name": "qbittorrent_host"},
                {"type": "text", "label": "Port", "placeholder": "8080", "name": "qbittorrent_port"},
                {"type": "text", "label": "Username", "name": "qbittorrent_username"},
                {"type": "password", "label": "Password", "name": "qbittorrent_password"},
                {"type": "bool", "label": "Use SSL", "name": "qbittorrent_ssl"}
            ]
        })

    @cherrypy.expose()
    @require()
    def index(self):
        return htpc.LOOKUP.get_template("qbittorrent.html").render(scriptname="qbittorrent", webinterface=self.webinterface())

    def webinterface(self):
        host = striphttp(htpc.settings.get("qbittorrent_host", ""))
        port = htpc.settings.get("qbittorrent_port", "")
        ssl = "s" if htpc.settings.get("qbittorret_ssl", 0) else ""
        url = "http%s://%s:%s/" % (ssl, host, port)
        return url

    #Get url from settings and handles auth
    @cherrypy.expose()
    @require()
    def qbturl(self):
        host = striphttp(htpc.settings.get("qbittorrent_host", ""))
        port = htpc.settings.get("qbittorrent_port", "")
        username = htpc.settings.get("qbittorrent_username", "")
        password = htpc.settings.get("qbittorrent_password", "")
        ssl = "s" if htpc.settings.get("qbittorret_ssl", 0) else ""
        url = "http%s://%s:%s/" % (ssl, host, port)

        realm = "Web UI Access"
        authhandler = urllib2.HTTPDigestAuthHandler()
        authhandler.add_password(realm, url, username, password)
        opener = urllib2.build_opener(authhandler)
        urllib2.install_opener(opener)

        return url

    #Fetches torrentlist from the client
    @cherrypy.expose()
    @require()
    def fetch(self):
        result = None

        try:
            url = self.qbturl()
            result = urllib2.urlopen(url + "json/torrents/").read()

        except Exception as e:
            self.logger.error("Couldn't get torrents %s" % e)

        return result

    # Gets total download and upload speed
    @cherrypy.expose()
    @require()
    def get_speed(self):
        try:
            url = self.qbturl()
            result = urllib2.urlopen(url + "json/transferInfo/").read()
            result = json.JSONDecoder("UTF-8").decode(result)

            speeddown = result["dl_info"]
            speedup = result["up_info"]

            list_of_down = speeddown.split()
            list_of_up = speedup.split()

            ds = list_of_down[1] + " " + list_of_down[2]
            dlstat = list_of_down[5] + " " + list_of_down[6]
            us = list_of_up[1] + " " + list_of_up[2]
            ulstat = list_of_down[5] + " " + list_of_down[6]

            d = {
                "qbittorrent_speed_down": ds,
                "qbittorrent_speed_up": us,
                "qbittorrent_total_dl": dlstat,
                "qbittorrent_total_ul": ulstat
            }

            return json.dumps(d)

        except Exception as e:
            self.logger.error("Couldn't get total download and uploads speed %s" % e)

    def get_global_dl_limit(self):
        try:
            result = urllib2.urlopen(self.qbturl() + 'command/getGlobalDlLimit/').read()
            speed = int(result)
            speed /= 1024
            return speed
        except Exception as e:
            self.logger.error("Couldn't get global download limit %s" % e)

    def get_global_ul_limit(self):
        try:
            result = urllib2.urlopen(self.qbturl() + 'command/getGlobalUpLimit').read()
            speed = int(result)
            speed /= 1024
            return speed
        except Exception as e:
            self.logger.error("Couldn't get upload download limit")

    @cherrypy.expose
    def get_global_limit(self):
        try:
            d = {}
            d['dl_limit'] = self.get_global_dl_limit()
            d['ul_limit'] = self.get_global_ul_limit()
            return json.dumps(d)
        except Exception as e:
            self.logger.debug("Couldn't get global upload and download limits %s" % e)

    # Handles pause, resume, delete singel torrents
    @cherrypy.expose()
    @require()
    def command(self, cmd=None, hash=None, name=None, dlurl=None):
        try:
            self.logger.debug("%s %s" % (cmd, name))
            url = self.qbturl()
            url += "command/%s/" % cmd
            data = {}

            if cmd == "delete":
                data["hashes"] = hash

            elif cmd == 'download':
                data['urls'] = dlurl

            elif cmd == 'resumeall' or 'pauseall':
                return urllib2.urlopen(url + cmd)
            else:
                data["hash"] = hash

            if cmd == "resumeall" or "pauseall":
                urllib2.urlopen(url + cmd)

            data = urllib.urlencode(data)

            return urllib2.urlopen(url, data).read()

        except Exception as e:
            self.logger.error("Failed at %s %s %s %s" % (cmd, name, hash, e))

    #Torrent search send to torrent
    @cherrypy.expose()
    def to_client(self, link, torrentname, **kwargs):
        try:
            url = self.qbturl()
            url += 'command/download/'
            data = {}
            data['urls'] = link
            params = urllib.urlencode(data)
            result = urllib2.urlopen(url, params).read()
            self.logger.info('%s %s is sendt to qBittorrent' % (torrentname, link))
        except Exception as e:
            self.logger.error('Failed to send %s %s to qBittorrent %s' % (link, torrentname, e))

    # Sets global upload and download speed
    @cherrypy.expose()
    @require()
    def set_speedlimit(self, type=None, speed=None):
        try:
            self.logger.debug("Setting %s to %s" % (type, speed))
            speed = int(speed)

            if speed == 0:
                speed = 0
            else:
                speed = speed * 1024

            url = self.qbturl()
            url += "command/" + type + "/"

            data = {}
            data["limit"] = speed
            data = urllib.urlencode(data)

            urllib2.urlopen(url, data)

            return urllib2.urlopen(url, data).read()

        except Exception as e:
            self.logger.error("Failed to set %s to %s %s" % (type, speed, e))

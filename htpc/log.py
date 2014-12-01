#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Logging
"""
import os
import cherrypy
import htpc
import logging
import logging.handlers


class Log:
    """ Root class """
    def __init__(self):
        """ Initialize the logger """
        self.logfile = os.path.join(htpc.DATADIR, 'htpcmanager.log')
        htpc.LOGGER = logging.getLogger()
        filter_blacklistwords = BlacklistParsingFilter()
        self.logch = logging.StreamHandler()
        self.logfh = logging.handlers.RotatingFileHandler(self.logfile, maxBytes=25000000, backupCount=2)

        self.logch.addFilter(filter_blacklistwords)
        self.logfh.addFilter(filter_blacklistwords)

        logformatter = logging.Formatter('%(asctime)s :: %(name)s :: %(levelname)s :: %(message)s', "%Y-%m-%d %H:%M:%S")
        self.logch.setFormatter(logformatter)
        self.logfh.setFormatter(logformatter)

        if htpc.LOGLEVEL == 'debug' or htpc.DEBUG:
            loglevel = logging.DEBUG
        elif htpc.LOGLEVEL == 'info':
            loglevel = logging.INFO
        elif htpc.LOGLEVEL == 'warning':
            loglevel = logging.WARNING
        elif htpc.LOGLEVEL == 'error':
            loglevel = logging.ERROR
        else:
            loglevel = logging.CRITICAL

        self.logch.setLevel(loglevel)
        self.logfh.setLevel(loglevel)
        htpc.LOGGER.setLevel(loglevel)

        # Disable cherrypy access log
        logging.getLogger('cherrypy.access').propagate = False

        htpc.LOGGER.addHandler(self.logch)
        htpc.LOGGER.addHandler(self.logfh)


        htpc.LOGGER.info("Welcome to HTPC-Manager!")
        htpc.LOGGER.info("Loglevel set to " + htpc.LOGLEVEL)

    @cherrypy.expose()
    def index(self):
        """ Show log """
        return htpc.LOOKUP.get_template('log.html').render(scriptname='log')

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def getlog(self, lines=10, level=2):
        """ Get log as JSON """
        levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'][-int(level):]
        content = []
        try:
            for line in reversed(open(self.logfile, 'r').readlines()):
                line = line.split(' :: ')
                if len(line) > 1 and line[2] in levels:
                    content.append(line)
                    if len(content) >= int(lines):
                        break
        except IOError:
            # Can't log this error since there is no log file.
            pass

        return content

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def deletelog(self):
        try:
            open(self.logfile, 'w').close()
            return "Log file deleted"
        except Exception, e:
            return "Cannot delete log file: " + str(e)


class BlacklistParsingFilter(logging.Filter):
    def __init__(self):
        # Grab all the stuff that should be ignored
        self.blacklist = [  htpc.settings.get("couchpotato_apikey"),
                            htpc.settings.get("couchpotato_username"),
                            htpc.settings.get("couchpotato_password"),
                            htpc.settings.get("nzbget_username"),
                            htpc.settings.get("nzbget_password"),
                            htpc.settings.get("nzbget_apikey"),
                            htpc.settings.get("sabnzbd_apikey"),
                            htpc.settings.get("nzbget_username"),
                            htpc.settings.get("nzbget_password"),
                            htpc.settings.get("nzbget_username"),
                            htpc.settings.get("newznab_apikey"),
                            htpc.settings.get("sickbeard_apikey"),
                            htpc.settings.get("sickrage_apikey"),
                            htpc.settings.get("qbittorrent_username"),
                            htpc.settings.get("qbittorrent_password"),
                            htpc.settings.get("plex_username"),
                            htpc.settings.get("plex_password"),
                            htpc.settings.get("plex_authtoken"),
                            htpc.settings.get("transmission_username"),
                            htpc.settings.get("transmission_password"),
                            htpc.settings.get("nzbget_username"),
                            htpc.settings.get("sonarr_apikey")
                        ]

        # Remove all empty strings
        self.nebll = [i for i in self.blacklist if len(i) > 1]

    def filter(self, record):
        if not htpc.DEBUG:
            for item in self.nebll:
                if item in record.msg:
                    record.msg = record.msg.replace(item, '****')
                    return True
            else:
                return True
        else:
            return True


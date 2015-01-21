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
from settings import Setting


class Log:
    """ Root class """
    def __init__(self):
        """ Initialize the logger """
        self.logfile = os.path.join(htpc.DATADIR, 'htpcmanager.log')
        htpc.LOGGER = logging.getLogger()

        self.blacklistwords = BlackListFilter()
        self.logch = logging.StreamHandler()
        self.logfh = logging.handlers.RotatingFileHandler(self.logfile, maxBytes=25000000, backupCount=2)

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

        self.logch.addFilter(self.blacklistwords)
        self.logfh.addFilter(self.blacklistwords)

        # Disable cherrypy access log
        logging.getLogger('cherrypy.access').propagate = False

        # Disable urllib3 logger, except from criticals
        logging.getLogger("requests").setLevel(logging.CRITICAL)

        # Only show errors for paramiko
        logging.getLogger("paramiko").setLevel(logging.CRITICAL)

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


class BlackListFilter(logging.Filter):
    def __init__(self):
        pass

    def filter(self, record):
        if htpc.DEBUG:
            return True
        else:
            fl = Setting.select().orderBy(Setting.q.key)
            bl = []
            for i in fl:
                if i.key.endswith("_apikey") or i.key.endswith("_username") or i.key.endswith("_password") or i.key.endswith("_passkey"):
                    if len(i.val) > 1:
                        bl.append(i.val)

            for item in bl:
                if item in record.msg or item in "".join(record.args):
                    # hack to make logging happy
                    ras = ", ".join(record.args)
                    record.args = ras.replace(item, len(item) * '*')
                    record.msg = record.msg.replace(item, len(item) * '*')
            return True

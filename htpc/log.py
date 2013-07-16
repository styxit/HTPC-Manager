"""
Logging
"""
import os
import cherrypy
import htpc
import logging

class Log:
    """ Root class """
    def __init__(self):
        """ Initialize the logger """
        self.logfile = os.path.join(htpc.DATADIR, 'htpcmanager.log')
        htpc.LOGGER = logging.getLogger()
        self.logch = logging.StreamHandler()
        self.logfh = logging.FileHandler(self.logfile)

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
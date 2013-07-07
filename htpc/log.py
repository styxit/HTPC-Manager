"""
Logging
"""
import os
import cherrypy
import htpc

class Log:
    """ Root class """
    def __init__(self):
        """ Do nothing on load """
        pass

    @cherrypy.expose()
    def index(self):
        """ Show log """
        content = self.getlog(1, 100)
        import itertools
        content = "\n".join(itertools.chain(*content))
        return htpc.LOOKUP.get_template('log.html').render(scriptname='log', content=content)

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def getlog(self, level=2, lines=10):
        levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'][-int(level):]
        logfile = os.path.join(htpc.DATADIR, 'htpcmanager.log')
        content = []
        for line in open(logfile, 'r'):
            if any(s in line for s in levels):
                content.append(line.replace('\n','').split(' :: '))
        content = content[-int(lines):]
        return content
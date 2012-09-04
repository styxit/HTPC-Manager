"""
Root for webserver. Specifies frontpage, errorpage (default),
and pages for restarting and shutting down server.
"""
import os
import sys
import cherrypy
import htpc


class Root:
    """ Root class """
    def __init__(self):
        """ Do nothing on load """
        pass

    @cherrypy.expose()
    def index(self):
        """ Load template for frontpage """
        return htpc.LOOKUP.get_template('dash.html').render()

    @cherrypy.expose()
    def default(self, *args, **kwargs):
        """ Show error if no matching page can be found """
        return "An error occured"

    @cherrypy.expose()
    def shutdown(self):
        """ Shutdown CherryPy and exit script """
        cherrypy.engine.exit()
        sys.exit(0)

    @cherrypy.expose()
    def restart(self):
        """ Shutdown script and rerun with the same variables """
        cherrypy.engine.exit()
        arguments = sys.argv[:]
        arguments.insert(0, sys.executable)
        if sys.platform == 'win32':
            arguments = ['"%s"' % arg for arg in arguments]
        os.chdir(os.getcwd())
        os.execv(sys.executable, arguments)

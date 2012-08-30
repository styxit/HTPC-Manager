import os, sys, cherrypy, htpc

class Root:
    @cherrypy.expose()
    def index(self):
        return htpc.lookup.get_template('dash.html').render()

    @cherrypy.expose()
    def default(self, *args, **kwargs):
        return "An error occured"

    @cherrypy.expose()
    def shutdown(self):
        cherrypy.engine.exit()
        sys.exit(0)

    @cherrypy.expose()
    def restart(self):
        cherrypy.engine.exit()
        arguments = sys.argv[:]
        arguments.insert(0, sys.executable)
        if sys.platform == 'win32':
            arguments = ['"%s"' % arg for arg in arguments]
        os.chdir(os.getcwd())
        os.execv(sys.executable, arguments)

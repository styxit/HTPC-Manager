import os, sys, shutil
import cherrypy
import htpc.updater as updater
from json import dumps

class System:
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

    @cherrypy.expose()
    def checkupdate(self):
        behind, url = updater.checkGithub()
        if behind == 0:
            return dumps({'behind':behind})
        elif behind > 0:
            return dumps({'behind':behind, 'url':url})
        
        return dumps({'behind':behind, 'error':url})

    @cherrypy.expose()
    def update(self):
        cherrypy.engine.exit()
        status = updater.update()
        cherrypy.server.start()
        return dumps({'update':'success'})

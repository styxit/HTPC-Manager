import os, cherrypy, htpc
from htpc.tools import template, saveSettings

class Root:
    @cherrypy.expose()
    def index(self):
        return template('dash.html')

    @cherrypy.expose()
    def default(self, *args, **kwargs):
        return "An error occured"

    @cherrypy.expose()
    def settings(self, **kwargs):
        if kwargs:
            htpc.settings = saveSettings(kwargs)
        return template('settings.html')

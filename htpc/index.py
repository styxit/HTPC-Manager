import os, cherrypy, htpc
from Cheetah.Template import Template
from htpc.tools import saveSettings

class Root:
    @cherrypy.expose()
    def index(self):
        template = Template(file=os.path.join(htpc.webdir, 'dash.tpl'), searchList=[htpc.settings]);
        template.jsfile = 'dash.js'
        return template.respond()

    @cherrypy.expose()
    def default(self, *args, **kwargs):
        return "An error occured"

    @cherrypy.expose()
    def settings(self, **kwargs):
        if kwargs:
            htpc.settings = saveSettings(htpc.configfile,kwargs)

        template = Template(file=os.path.join(htpc.webdir, 'settings.tpl'), searchList=[htpc.settings])
        template.jsfile = 'settings.js'
        return template.respond()

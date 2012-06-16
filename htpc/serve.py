import os, cherrypy
from htpc.pagehandler import pageHandler
from htpc.settings import readSettings

class serve:
    def __init__(self, configfile, daemon = 0):
        self.configfile = configfile
        self.config = readSettings(configfile)
        self.daemonize = int(daemon)
        self.root = os.getcwd()
        self.name = self.config.get('app_name','HTPC Manager')
        self.host = self.config.get('app_host','127.0.0.1')
        self.port = int(self.config.get('app_port','8084'))
        self.username = self.config.get('app_username','')
        self.password = self.config.get('app_password','')
        self.template = 'templates/' + self.config.get('template','default')

    def start(self):
	# Set server parameters
	cherrypy.config.update({
	    'server.environment': 'production',
	    'server.socket_host': self.host,
	    'server.socket_port': self.port,
	    'server.root': self.root,
            'log.error_file': self.root + '/userdata/error.log'
	})

	# Genereate a root configuration
	rootConfig = {
	    'tools.staticdir.root': self.root,
	    'tools.encode.on': True,
	    'tools.encode.encoding': 'utf-8',
	    'tools.staticdir.dir': '/',
	    'tools.staticfile.root': self.root
	}

	# Require username and password if they are supplied in the configuration file
	if self.username and self.password:
	    userpassdict = {self.username : self.password}
	    get_ha1 = cherrypy.lib.auth_digest.get_ha1_dict_plain(userpassdict)
	    rootConfig.update({
		'tools.auth_digest.on': True,
		'tools.auth_digest.realm': self.name,
		'tools.auth_digest.get_ha1': get_ha1,
		'tools.auth_digest.key': 'a565c27146791cfb'
	    })

	appConfig = {
	    '/':  rootConfig,
	    '/favicon.ico': {
		'tools.staticfile.on': True,
		'tools.staticfile.filename': self.template + "/static/favicon.ico"
	    },
	    '/css': {
		'tools.staticdir.on': True,
		'tools.staticdir.dir': self.template + "/static/css"
	    },
	    '/js': {
		'tools.staticdir.on': True,
		'tools.staticdir.dir': self.template + "/static/js"
	    },
	    '/img': {
		'tools.staticdir.on': True,
		'tools.staticdir.dir': self.template + "/static/img"
	    }
	}

	# Daemonize if wanted
	if self.daemonize:
	    cherrypy.process.plugins.Daemonizer(cherrypy.engine).subscribe()

	# Start the CherryPy server
	cherrypy.quickstart(pageHandler(self.configfile), config=appConfig)

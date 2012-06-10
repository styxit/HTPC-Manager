import cherrypy
import htpc

# Set server parameters
cherrypy.config.update({
    'server.environment': 'production',
    'server.socket_host': htpc.host,
    'server.socket_port': htpc.port,
    'server.root' : htpc.root
})

# Genereate a root configuration
rootConfig = {
    'tools.staticdir.root': htpc.root,
    'tools.encode.on': True,
    'tools.encode.encoding': 'utf-8',
    'tools.staticdir.dir' : '/',
    'tools.staticfile.root' : htpc.root
}

# Require username and password if they are supplied in the configuration file
if htpc.username and htpc.password :
    userpassdict = {htpc.username : htpc.password}
    get_ha1 = cherrypy.lib.auth_digest.get_ha1_dict_plain(userpassdict)
    rootConfig.update({
        'tools.auth_digest.on': True,
        'tools.auth_digest.realm': htpc.appname,
        'tools.auth_digest.get_ha1': get_ha1,
        'tools.auth_digest.key': 'a565c27146791cfb'
    })

appConfig = {
    '/':  rootConfig,
    '/favicon.ico' : {
        'tools.staticfile.on' : True,
        'tools.staticfile.filename' : "interfaces/default/static/favicon.ico"
    },
    '/css': {
        'tools.staticdir.on' : True,
        'tools.staticdir.dir' : "interfaces/default/static/css"
    },
    '/js': {
        'tools.staticdir.on' : True,
        'tools.staticdir.dir' : "interfaces/default/static/js"
    },
    '/img': {
        'tools.staticdir.on' : True,
        'tools.staticdir.dir' : "interfaces/default/static/img"
    }
}

# Daemonize if wanted
if htpc.daemonize :
    cherrypy.process.plugins.Daemonizer(cherrypy.engine).subscribe()

# Start the CherryPy server
cherrypy.quickstart(htpc.pageHandler(), config=appConfig)

import cherrypy
import htpc

cherrypy.config.update({
    'server.environment': 'production',
    'server.socket_host': htpc.host,
    'server.socket_port': htpc.port,
    'server.root' : htpc.root
})

rootConfig = {
    'tools.staticdir.root': htpc.root,
    'tools.encode.on': True,
    'tools.encode.encoding': 'utf-8',
    'tools.staticdir.dir' : '/',
    'tools.staticfile.root' : htpc.root
}

if htpc.username != '' and htpc.password != '':
    userpassdict = {htpc.username : htpc.password}
    get_ha1 = cherrypy.lib.auth_digest.get_ha1_dict_plain(userpassdict)
    authDict = {
        'tools.auth_digest.on': True,
        'tools.auth_digest.realm': htpc.appname,
        'tools.auth_digest.get_ha1': get_ha1,
        'tools.auth_digest.key': 'a565c27146791cfb'
    }
    rootConfig.update(authDict)

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

# Load pagehandler
page = htpc.pageHandler(htpc.root)

# Start CherryPy
cherrypy.process.servers.check_port(htpc.host, htpc.port)
if htpc.daemonize == 'yes' :
    cherrypy.process.plugins.Daemonizer(cherrypy.engine).subscribe()
    cherrypy.tree.mount(page, "/", config=appConfig)
    cherrypy.engine.start()
    cherrypy.engine.block()    
else :
    cherrypy.tree.mount(page, "/", config=appConfig)
    cherrypy.server.start()

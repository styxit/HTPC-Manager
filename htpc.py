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

authDict = {}
config = htpc.settings.readSettings()
if config.has_key('my_username') and config.get('my_username') != '' and config.has_key('my_password') and config.get('my_password') != '':
    userpassdict = {config.get('my_username') : config.get('my_password')}
    get_ha1 = cherrypy.lib.auth_digest.get_ha1_dict_plain(userpassdict)
    authDict = {
        'tools.auth_digest.on': True,
        'tools.auth_digest.realm': 'htpc',
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

# Page inladen
page = htpc.pageHandler(htpc.root)

# Root mounten
cherrypy.tree.mount(page, "/", config=appConfig)

# Cherrypy starten
cherrypy.process.servers.check_port(htpc.host, htpc.port)
cherrypy.server.start()

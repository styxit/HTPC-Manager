#!/usr/bin/env python
# -*- coding: utf-8 -*-

""" Class for handling settings and generating settings page """
import os
from json import loads
import cherrypy
import htpc
import logging
from cherrypy.lib.auth2 import require, member_of
from sqlobject import connectionForURI, sqlhub, SQLObject, SQLObjectNotFound
from sqlobject.col import StringCol
import shutil


class Setting(SQLObject):
    """ Class for generating settings database table """
    key = StringCol()
    val = StringCol()


class Settings(object):
    """ Main class """

    def __init__(self):
        """ Create table on load if table doesnt exist """
        self.logger = logging.getLogger('htpc.settings')
        self.logger.debug('Connecting to database: ' + htpc.DB)
        sqlhub.processConnection = connectionForURI('sqlite:' + htpc.DB)
        Setting.createTable(ifNotExists=True)
        self.updatebl()

    @cherrypy.expose()
    @require(member_of("admin"))
    def index(self, **kwargs):
        """ Set keys if settings are received. Show settings page """
        if kwargs:
            for key, val in kwargs.items():
                self.set(key, val)
        return htpc.LOOKUP.get_template('settings.html').render(scriptname='settings', htpc=htpc)

    def get(self, key, defval=''):
        """ Get a setting from the database """
        try:
            val = Setting.selectBy(key=key).getOne().val
            if val in ['on', 1, '1']:
                return True
            elif val in ['off', "0", 0]:
                return False
            return val
        except SQLObjectNotFound:
            # Disabled this to not spam the log
            # self.logger.debug("Unable to find the selected object: " + key)
            return defval

    def set(self, key, val):
        """ Save a setting to the database """
        self.logger.debug("Saving settings %s to the database." % key)
        try:
            setting = Setting.selectBy(key=key).getOne()
            setting.val = val
            # each time we save something to the db we want to blacklist it
            self.updatebl()
        except SQLObjectNotFound:
            Setting(key=key, val=val)
            self.updatebl()

    def updatebl(self):
        # fix me
        from modules.newznab import NewznabIndexers
        from modules.kodi import KodiServers
        from htpc.manageusers import Manageusers
        NewznabIndexers.createTable(ifNotExists=True)
        KodiServers.createTable(ifNotExists=True)
        Manageusers.createTable(ifNotExists=True)

        bl = []

        fl = Setting.select().orderBy(Setting.q.key)
        for i in fl:
            if i.key.endswith("_apikey") or i.key.endswith("_username") or i.key.endswith("_password") or i.key.endswith("_passkey"):
                if len(i.val) > 1:
                    bl.append(i.val)

        indexers = NewznabIndexers.select().orderBy(NewznabIndexers.q.apikey)
        for indexer in indexers:
            if len(indexer.apikey) > 1:
                bl.append(indexer.apikey)

        kodi = KodiServers.select().orderBy(KodiServers.q.password)
        for k in kodi:
            if len(k.password) > 1:
                bl.append(k.password)

        users = Manageusers.select().orderBy(Manageusers.q.username)
        for user in users:
            if len(user.password) > 1:
                bl.append(user.password)

        htpc.BLACKLISTWORDS = bl
        return bl

    def get_templates(self):
        """ Get a list of available templates """
        templates = []
        for template in os.listdir(os.path.join(htpc.RUNDIR, "interfaces/")):
            current = bool(template == self.get('app_template', 'default'))
            templates.append({'name': template, 'value': template, 'selected': current})
        return templates

    def get_loglvl(self):
        """ Get a list of available templates """
        loglvl = []
        for lvl in ['info', 'debug', 'warning', 'error']:
            current = bool(lvl == self.get('app_loglevel', 'info'))
            loglvl.append({'name': lvl, 'value': lvl, 'selected': current})
        return loglvl

    def get_themes(self):
        """ Get a list of available themes """
        path = os.path.join(htpc.TEMPLATE, "css/themes/")
        themes = []
        dirs = [d for d in os.listdir(path) if os.path.isdir(os.path.join(path, d))]
        for theme in dirs:
            current = bool(theme == self.get('app_theme_mig', 'obsidian'))
            themes.append({'name': theme, 'value': theme, 'selected': current})
        return themes

    """ Save json with custom urls """
    @cherrypy.expose()
    @require(member_of("admin"))
    @cherrypy.tools.json_out()
    def urls(self, **kwargs):
        if kwargs:
            for key, val in kwargs.items():
                self.set('custom_urls', key)

    """ Get custom defined urls from database in json format """
    def getUrls(self):
        try:
            links = self.get('custom_urls', '{}')
            return loads(links)
        except:
            # Stop cherrypy from barfing is the user has entered invalid name/urls
            return loads('{}')

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    @require(member_of("admin"))
    def delete_cache(self):
        try:
            cache_folder = os.path.join(htpc.DATADIR, 'images/')
            if os.path.exists(cache_folder):
                self.logger.info('Cache folder was deleted')
                shutil.rmtree(cache_folder)
                return {'success': 'true'}
            return {'failed': 'cache folder does not exist'}
        except Exception as e:
            self.logger.error('Failed to delete cache folder ', e)
            return {'failed': e}

    @cherrypy.expose()
    #@cherrypy.tools.json_out()
    @require(member_of("admin"))
    def test(self, *args, **kw):
        """ Used for testing stuff """
        return 'test'

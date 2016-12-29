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
import re


class Setting(SQLObject):
    """ Class for generating settings database table """
    key = StringCol()
    val = StringCol()


class Settings:
    """ Main class """

    def __init__(self):
        """ Create table on load if table doesnt exist """
        self.logger = logging.getLogger('htpc.settings')
        self.logger.debug('Connecting to database: ' + htpc.DB)
        sqlhub.processConnection = connectionForURI('sqlite:' + htpc.DB)
        Setting.createTable(ifNotExists=True)

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
            if val == 'on':
                return True
            elif val == "0":
                return False
            return val
        except SQLObjectNotFound:
            self.logger.debug("Unable to find the selected object: " + key)
            return defval

    def set(self, key, val):
        """ Save a setting to the database """
        self.logger.debug("Saving settings to the database.")
        try:
            setting = Setting.selectBy(key=key).getOne()
            setting.val = val
        except SQLObjectNotFound:
            Setting(key=key, val=val)

    def get_templates(self):
        """ Get a list of available templates """
        templates = []
        for template in os.listdir(os.path.join(htpc.RUNDIR, "interfaces/")):
            current = bool(template == self.get('app_template', 'default'))
            templates.append({'name': template, 'value': template,
                'selected': current})
        return templates

    def get_themes(self):
        """ Get a list of available themes """
        path = os.path.join(htpc.TEMPLATE, "css/themes/")
        themes = []
        dirs = [d for d in os.listdir(path) if os.path.isdir(os.path.join(path, d))]
        for theme in dirs:
            current = bool(theme == self.get('app_theme', 'default'))
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
        linkstr = self.get('custom_urls', '{}')
        links = loads(linkstr)

        request = cherrypy.request
        regex = r'([a-zA-Z]+)://([.a-zA-Z0-9_-]*)(:[0-9]*)?'
        match = re.match(regex, request.base)
        kwargs = {
            'http_scheme': match.group(1),
            'http_host': match.group(2),
            'http_port': (match.group(3) or ':80')[1:],
        }

        for link in links:
            link['url'] = link['url'] % kwargs

        return links

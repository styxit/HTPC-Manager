""" Class for handling settings and generating settings page """
import os
import cherrypy
import htpc
from sqlobject import SQLObject, SQLObjectNotFound
from sqlobject.col import StringCol


class Setting(SQLObject):
    """ Class for generating settings database table """
    key = StringCol()
    val = StringCol()


class Settings:
    """ Main class """

    def __init__(self):
        """ Create table on load if table doesnt exist """
        Setting.createTable(ifNotExists=True)

    @cherrypy.expose()
    def index(self, **kwargs):
        """ Set keys if settings are received. Show settings page """
        if kwargs:
            for key, val in kwargs.items():
                self.set(key, val)
        return htpc.LOOKUP.get_template('settings.html').render()

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
            return defval

    def set(self, key, val):
        """ Save a setting to the database """
        try:
            setting = Setting.selectBy(key=key).getOne()
            setting.val = val
        except SQLObjectNotFound:
            Setting(key=key, val=val)

    def get_templates(self):
        """ Get a list of available templates """
        templates = []
        for template in os.listdir("interfaces/"):
            current = bool(template == self.get('app_template', 'default'))
            templates.append({'name': template, 'value': template,
                'selected': current})
        return templates

    def get_themes(self):
        """ Get a list of available themes """
        themes = []
        for theme in os.listdir(os.path.join(htpc.TEMPLATE, "css/themes/")):
            current = bool(theme == self.get('app_theme', 'default.css'))
            themes.append({'name': theme, 'value': theme, 'selected': current})
        return themes

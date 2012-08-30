import os, cherrypy, htpc
from sqlobject import *

class Setting(SQLObject):
    key = StringCol()
    val = StringCol()

class Settings:
    def __init__(self):
        Setting.createTable(ifNotExists=True)

    @cherrypy.expose()
    def index(self, **kwargs):
        if kwargs:
            for key, val in kwargs.items():
                self.set(key, val)
        return htpc.lookup.get_template('settings.html').render()

    def get(self, key, defval=''):
        try:
            val = Setting.selectBy(key=key).getOne().val
            if val == 'on':
                return True
            elif val == "0":
                return False
            return val
        except SQLObjectNotFound, e:
            return defval

    def set(self, key, val):
        try:
            setting = Setting.selectBy(key=key).getOne()
            setting.val = val
        except SQLObjectNotFound, e:
            Setting(key=key, val=val)

    def getTemplates(self):
        templates = []
        for t in os.listdir("interfaces/"):
            current = bool(t == self.get('app_template', 'default'))
            templates.append({'name':t, 'value':t, 'selected':current})
        return templates

    def getThemes(self):
        themes = []
        for t in os.listdir(os.path.join(htpc.template, "css/themes/")):
            current = bool(t == self.get('app_theme', 'default.css'))
            themes.append({'name':t, 'value':t, 'selected':current})
        return themes

htpc.root.settings = Settings()

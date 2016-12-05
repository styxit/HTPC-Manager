#!/usr/bin/env python
# -*- coding: utf-8 -*-

import cherrypy
import htpc
import requests
from cherrypy.lib.auth2 import require, member_of
import logging
import hashlib
from htpc.helpers import fix_basepath, get_image, striphttp, comp_table
import json
import os
import re


class Couchpotato(object):
    def __init__(self):
        self.logger = logging.getLogger('modules.couchpotato')
        htpc.MODULES.append({
            'name': 'CouchPotato',
            'id': 'couchpotato',
            'test': htpc.WEBDIR + 'couchpotato/getapikey',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'couchpotato_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'couchpotato_name'},
                {'type': 'text', 'label': 'Username', 'name': 'couchpotato_username'},
                {'type': 'password', 'label': 'Password', 'name': 'couchpotato_password'},
                {'type': 'text', 'label': 'IP / Host *', 'name': 'couchpotato_host'},
                {'type': 'text', 'label': 'Port', 'placeholder': '5050', 'name': 'couchpotato_port'},
                {'type': 'text', 'label': 'Basepath', 'placeholder': '/couchpotato', 'name': 'couchpotato_basepath'},
                {'type': 'text', 'label': 'API key', 'desc': 'Press test get apikey', 'name': 'couchpotato_apikey'},
                {'type': 'bool', 'label': 'Use SSL', 'name': 'couchpotato_ssl'},
                {'type': 'text', 'label': 'Reverse proxy link', 'placeholder': '', 'desc': 'Reverse proxy link ex: https://couchpotato.domain.com', 'name': 'couchpotato_reverse_proxy_link'},

            ]
        })

    @cherrypy.expose()
    @require()
    def index(self):
        return htpc.LOOKUP.get_template('couchpotato.html').render(scriptname='couchpotato', webinterface=self.webinterface())

    def webinterface(self):
        ''' Generate page from template '''
        ssl = 's' if htpc.settings.get('couchpotato_ssl', 0) else ''
        host = striphttp(htpc.settings.get('couchpotato_host', ''))
        port = str(htpc.settings.get('couchpotato_port', ''))
        basepath = fix_basepath(htpc.settings.get('couchpotato_basepath', '/'))

        url = 'http%s://%s:%s%s' % (ssl, host, port, basepath)

        if htpc.settings.get('couchpotato_reverse_proxy_link'):
            url = htpc.settings.get('couchpotato_reverse_proxy_link')

        return url

    def ctrl_c(self, filt):
        ctrl_char = ''
        if '!=' in filt:
            ctrl_char = '!='
        elif '==' in filt:
            ctrl_char = '=='
        elif '<=' in filt:
            ctrl_char = '<='
        elif '>=' in filt:
            ctrl_char = '>='
        elif '<=' in filt:
            ctrl_char = '=='
        elif '!' in filt:
            ctrl_char = '!'
        elif '<' in filt:
            ctrl_char = '<'
        elif '>' in filt:
            ctrl_char = '>'
        elif '=' in filt:
            ctrl_char = '='
        return ctrl_char

    def cp_filter(self, filt, collection):
        self.logger.debug('Called cp_filter %s' % filt)
        before = len(collection.get('movies', 0))
        results = []
        if collection.get('movies', ''):
            check = self.ctrl_c(filt)
            if filt:
                # default to fuzzy title search "16 blocks"
                if check == '':
                    pat = '.*?'.join(map(re.escape, filt))
                    regex = re.compile(pat, flags=re.I)
                    for m in collection['movies']:
                        f = regex.search(m['title'])
                        if f:
                            results.append(m)
                else:
                    # default to normal search
                    if check:
                        filt = filt.split(check)

                    for m in collection['movies']:
                        # flatten the info since we would normally be interessed in that
                        if 'info' in m:
                            for k, v in m['info'].iteritems():
                                m[k] = v
                                try:
                                    imdb = m['info']['rating']['imdb']
                                    m['rating'] = imdb[0]
                                except:
                                    pass

                        for k, v in m.iteritems():
                            if k.lower() == filt[0].lower():
                                if isinstance(v, dict):
                                    # actor roles='Jack Bauer'
                                    for kk, vv in v.iteritems():
                                        if v == kk:
                                            results.append(m)
                                elif isinstance(v, list):
                                    # genres=action
                                    if filt[1].lower() in [z.lower() for z in v]:
                                        results.append(m)
                                elif isinstance(v, (int, float)):
                                    # for year!=1337 rating<=5.0
                                    if check and check != '=':
                                        if comp_table[check](float(v), float(filt[1])):
                                            results.append(m)
                                elif isinstance(v, basestring):
                                    # plot='some string'
                                    if filt[1].lower() in v.lower():
                                        results.append(m)

                self.logger.debug('Filter out %s' % (before - len(results)))
                return results

    @cherrypy.expose()
    @require(member_of(htpc.role_admin))
    @cherrypy.tools.json_out()
    def ping(self, couchpotato_host, couchpotato_port, couchpotato_apikey, couchpotato_basepath, couchpotato_ssl=False, **kwargs):
        self.logger.debug('Testing connectivity to couchpotato')

        couchpotato_basepath = fix_basepath(couchpotato_basepath)
        couchpotato_host = striphttp(couchpotato_host)

        ssl = 's' if couchpotato_ssl else ''
        url = 'http%s://%s:%s%sapi/%s' % (ssl, couchpotato_host, couchpotato_port, couchpotato_apikey)
        try:
            f = requests.get(url + '/app.available/', timeout=10)
            return f.json()
        except:
            self.logger.error('Unable to connect to couchpotato')
            self.logger.debug('connection-URL: %s' % url)
            return

    @cherrypy.expose()
    @require(member_of(htpc.role_admin))
    @cherrypy.tools.json_out()
    def getapikey(self, couchpotato_username, couchpotato_password, couchpotato_host, couchpotato_port, couchpotato_apikey, couchpotato_basepath, couchpotato_ssl=False, **kwargs):
        self.logger.debug('Testing connectivity to couchpotato')
        if couchpotato_password and couchpotato_username != '':
            couchpotato_password = hashlib.md5(couchpotato_password).hexdigest()
            couchpotato_username = hashlib.md5(couchpotato_username).hexdigest()

        getkey = 'getkey/?p=%s&u=%s' % (couchpotato_password, couchpotato_username)

        couchpotato_basepath = fix_basepath(couchpotato_basepath)

        ssl = 's' if couchpotato_ssl else ''
        url = 'http%s://%s:%s%s%s' % (ssl, striphttp(couchpotato_host), couchpotato_port, couchpotato_basepath, getkey)

        try:
            f = requests.get(url, timeout=10, verify=False)
            return f.json()

        except Exception as e:
            self.logger.error('Unable to connect to couchpotato %s' % e)
            self.logger.debug('connection-URL: %s' % url)
            return

    @cherrypy.expose()
    @require()
    def GetImage(self, url, h=None, w=None, o=100, *args, **kwargs):
        # url can be a string or json
        working_url = None
        imgdir = os.path.join(htpc.DATADIR, 'images/')
        try:
            x = json.loads(url)
            if isinstance(x, list):
                tl = [(hashlib.md5(u).hexdigest(), u) for u in x]
                checkurl = []
                # check any of the images exist in the cache
                for i in tl:
                    if os.path.isfile(os.path.join(imgdir, i[0])):
                        #self.logger.debug('%s exist in cache, ignore the rest of the hashes %s' % (str(i[1]), str(tl)))
                        # dont bother checking any else if we have image
                        checkurl = []
                        working_url = i[1]
                        break
                    else:
                        checkurl.append(i)
                        continue

                if working_url:
                    return get_image(working_url, h, w, o)
                else:
                    # None of the imges existed in the cache
                    if checkurl:
                        for ii, i in enumerate(checkurl):
                            # verify that the download is ok before we try to cache it.
                            try:
                                r = requests.get(i[1], headers={'Cache-Control': 'private, max-age=0, no-cache, must-revalidate', 'Pragma': 'no-cache'})
                                if r.content:
                                    working_url = i[1]
                                    break

                            except Exception as e:
                                self.logger.error('Error: %s url: %s item: %s  loop n : %s  tuplelist %s' % (e, i[1], i, ii, str(tl)))

                        if working_url:
                            return get_image(working_url, h, w, o)

        except ValueError as e:
            if isinstance(url, basestring):
                return get_image(url, h, w, o)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetMovieList(self, status='', limit='', f=''):
        self.logger.debug('Fetching Movies')
        if status == 'done':
            status += '&type=movie&release_status=done&status_or=1'
            data = self.fetch('media.list/?status=' + status)
            if f:
                filtered_movies = self.cp_filter(f, data)
                data['movies'] = filtered_movies
                data['total'] = len(filtered_movies)
                return data
            else:
                return data

        data = self.fetch('media.list/?status=' + status + '&limit_offset=' + limit)
        if f:
            filtered_movies = self.cp_filter(f, data)
            data['movies'] = filtered_movies
            data['total'] = len(filtered_movies)
            return data
        else:
            return data

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetNotificationList(self, limit='20'):
        self.logger.debug('Fetching Notification')
        data = self.fetch('notification.list/?limit_offset=' + limit)
        self.fetch('notification.markread')
        return data

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def SearchMovie(self, q=''):
        self.logger.debug('Searching for movie')
        return self.fetch('movie.search/?q=' + q)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def AddMovie(self, movieid, profile, title, category_id=''):
        self.logger.debug('Adding movie')
        if category_id:
            return self.fetch('movie.add/?profile_id=' + profile + '&identifier=' + movieid + '&title=' + title + '&category_id=' + category_id)
        return self.fetch('movie.add/?profile_id=' + profile + '&identifier=' + movieid + '&title=' + title)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def EditMovie(self, id, profile, title):
        self.logger.debug('Editing movie')
        return self.fetch('movie.edit/?id=' + id + '&profile_id=' + profile + '&default_title=' + title)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def RefreshMovie(self, id):
        self.logger.debug('Refreshing movie')
        return self.fetch('movie.refresh/?id=' + id)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def DeleteMovie(self, id=''):
        self.logger.debug('Deleting movie')
        return self.fetch('movie.delete/?id=' + id)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetReleases(self, id=''):
        self.logger.debug('Downloading movie')
        return self.fetch('media.get/?id=' + id)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def DownloadRelease(self, id=''):
        self.logger.debug('Downloading movie')
        return self.fetch('release.manual_download/?id=' + id)

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def IgnoreRelease(self, id=''):
        self.logger.debug('Downloading movie')
        return self.fetch('release.ignore/?id=' + id)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetProfiles(self):
        self.logger.debug('Fetching available profiles')
        return self.fetch('profile.list/')

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def GetCategories(self):
        self.logger.debug('Feching categories')
        return self.fetch('category.list')

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def Suggestion(self):
        self.logger.debug('Fetching suggestion')
        return self.fetch('suggestion.view')

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def ChartsView(self):
        self.logger.debug('Fetching charts')
        return self.fetch('charts.view')

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def SuggestionIgnore(self, imdb=None, seenit=None):
        u = 'suggestion.ignore/?imdb=%s' % imdb
        if seenit:
            u += '&seenit=1'
        self.logger.debug('Fetching suggestion')
        return self.fetch(u)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def DashboardSoon(self):
        return self.fetch('dashboard.soon')

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def Restart(self):
        return self.fetch('app.restart')

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def Shutdown(self):
        return self.fetch('app.shutdown')

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def Update(self):
        return self.fetch('updater.update')

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def SearchAllWanted(self):
        return self.fetch('movie.searcher.full_search')

    @cherrypy.expose()
    @require(member_of(htpc.role_user))
    @cherrypy.tools.json_out()
    def Postprocess(self, path=''):
        u = 'renamer.scan'
        if path:
            u += '/?base_folder=%s' % path
        return self.fetch(u)

    def fetch(self, path):
        try:
            host = striphttp(htpc.settings.get('couchpotato_host', ''))
            port = str(htpc.settings.get('couchpotato_port', ''))
            apikey = htpc.settings.get('couchpotato_apikey', '')
            basepath = fix_basepath(htpc.settings.get('couchpotato_basepath', '/'))
            ssl = 's' if htpc.settings.get('couchpotato_ssl', 0) else ''

            url = 'http%s://%s:%s%sapi/%s/%s' % (ssl, host, port, basepath, apikey, path)
            self.logger.debug('Fetching information from: %s' % url)

            f = requests.get(url, timeout=60, verify=False)

            return f.json()

        except Exception as e:
            self.logger.debug('Exception: %s' % e)
            self.logger.error('Unable to fetch information')
            return

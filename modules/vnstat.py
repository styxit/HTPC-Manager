#!/usr/bin/env python
# -*- coding: utf-8 -*-

import htpc
import cherrypy
import logging
from cherrypy.lib.auth2 import require
import xmltodict
import platform
import subprocess
import re
import json
from itertools import chain
from htpc.helpers import serve_template, path_append

try:
    import paramiko
    importParamiko = True

except ImportError:
    importParamiko = False


class Vnstat(object):
    def __init__(self):
        self.version_ = None
        self.logger = logging.getLogger('modules.vnstat')
        htpc.MODULES.append({
            'name': 'vnStat',
            'id': 'vnstat',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'vnstat_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'vnstat_name'},
                {'type': 'bool', 'label': 'Use SSH?', 'desc': 'Check this if vnStat is running on a different computer', 'name': 'vnstat_use_ssh'},
                {'type': 'text', 'label': 'vnStat DB location', 'placeholder': '', 'name': 'vnstat_db', 'desc': 'Only set this if you have changed the default db location'},
                {'type': 'text', 'label': 'Interface', 'placeholder': '', 'desc': 'Only grab data from this interface, if omitted it will return all interfaces', 'name': 'vnstat_interface'},
                {'type': 'text', 'label': 'Interface speed', 'placeholder': 'eth0', 'name': 'vnstat_interface_speed', 'desc': 'Get current speed from this interface'},
                {'type': 'text', 'label': 'IP / Host', 'placeholder': 'localhost', 'name': 'vnstat_host'},
                {'type': 'text', 'label': 'Port', 'name': 'vnstat_port', 'desc': 'Default ssh port is 22'},
                {'type': 'text', 'label': 'Username', 'name': 'vnstat_username'},
                {'type': 'password', 'label': 'Password', 'name': 'vnstat_password'},

            ]
        })

    @cherrypy.expose()
    @require()
    def index(self):
        return serve_template('vnstat.html', scriptname='vnstat', importParamiko=importParamiko)

    @cherrypy.expose()
    @require()
    def run(self, parameters=''):
        if htpc.settings.get('vnstat_enable'):
            hostname = htpc.settings.get('vnstat_host', '')
            port = htpc.settings.get('vnstat_port', 22)
            username = htpc.settings.get('vnstat_username', '')
            password = htpc.settings.get('vnstat_password', '')

            # If db saves the shit as a string
            if port:
                port = int(port)

            if not parameters:
                return
            # Append path for FreeBSD and FreeNAS
            path_append()
            cmd = 'vnstat %s' % parameters

            if htpc.settings.get('vnstat_db', ''):
                cmd += ' --dbdir %s' % (htpc.settings.get('vnstat_db', ''))

            if htpc.settings.get('vnstat_interface', '') and '-i' not in parameters:
                cmd += ' -i %s' % htpc.settings.get('vnstat_interface', '')

            # Force windows users to use paramiko as here isnt any native ssh.
            if htpc.settings.get('vnstat_use_ssh') or platform.system() == 'win32':
                client = paramiko.SSHClient()
                client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                client.connect(hostname, username=username, password=password,
                               allow_agent=False, look_for_keys=False, timeout=15)


                self.logger.debug('SSH cmd %s' % cmd)
                stdin, stdout, stderr = client.exec_command(cmd)
                data_out = stdout.read()

                if data_out:
                    # Make json of shitty xml
                    # remove this line later.
                    self.logger.debug(data_out)
                    if '--xml' in cmd:
                        return xmltodict.parse(data_out)
                    else:
                        return data_out
                else:
                    self.logger.error('No data from paramiko')

            else:
                # vnstat is running on the same computer as htpc manager
                self.logger.debug('Pipeing %s from shell' % cmd)

                proc = subprocess.Popen(cmd, stdout=subprocess.PIPE,
                                        stderr=subprocess.STDOUT, shell=True, cwd=htpc.RUNDIR)
                output, err = proc.communicate()
                returncode = proc.returncode

                if output and returncode == 0:

                    if '--xml' in cmd:
                        return xmltodict.parse(output.strip())
                    else:
                        return output.strip()
                else:
                    self.logger.error('Failed to run %s from shell output %s returncode %s' % (cmd, output, returncode))

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def days(self):
        return self.run('-d --xml')

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def hours(self):
        return self.run('-h --xml')

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def exportdb(self):
        return self.run('--exportdb')

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def oneline(self):
        try:
            speed = self.tr(dash=True)
            # with --xml is returns shit
            vnstat = self.run('--oneline')
            l = vnstat.replace('\n', '').split(';')
            d = {'rxtoday': l[3],
                 'txtoday': l[4],
                 'totaltoday': l[5],
                 'average_download_today': l[6],
                 'timestamp_current_month': l[7],
                 'rx_current_month': l[8],
                 'tx_current_month': l[9],
                 'total_current_month': l[10],
                 'average_upload_today': l[11],
                 'alltime_total_rx': l[12],
                 'alltime_total_tx': l[13],
                 'alltime_total_traffic': l[14]

                 }
            # combine dicts
            info = dict(chain(d.items(), speed.items()))
            return info

        except Exception as e:
            self.logger.debug('Failed to return oneline %s' % e)
            return

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def cleartop(self):
        return self.run('--cleartop')

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def weeks(self):
        return self.run('-w --xml')

    @cherrypy.expose()
    @require()
    def tr(self, dash=False):
        interface = htpc.settings.get('vnstat_interface_speed', '')
        if interface:
            piped = self.run('-tr -i %s' % interface)
        else:
            piped = self.run('-tr')
        download = re.compile(ur'rx\s+(\d+.\d+)\s+(\w+\/s)')
        upload = re.compile(ur'tx\s+(\d+.\d+)\s+(\w+\/s)')
        rx = re.search(download, piped)
        tx = re.search(upload, piped)
        if rx:
            rx = '%s %s' % (rx.group(1), rx.group(2))
        if tx:
            tx = '%s %s' % (tx.group(1), tx.group(2))

        if dash:
            return {'download_speed': rx, 'upload_speed': tx}
        else:
            cherrypy.response.headers['Content-Type'] = 'application/json'
            return json.dumps({'rx': rx, 'tx': tx})

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def top10(self):
        return self.run('-t --xml')

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def version(self):
        reg = re.compile(ur'(\d+\.\d+)')
        search = re.search(reg, self.run('--version'))
        if search:
            self.version_ = float(search.group(1))
            return float(self.version_)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def dumpdb(self):
        if self.version_ is None:
            self.version()

        if self.version_ > 1.11:
            return self.run('--exportdb --xml')
        else:
            return self.run('--dumpdb --xml')

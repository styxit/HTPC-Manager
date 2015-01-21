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

try:
    import paramiko
    importParamiko = True

except ImportError:
    importParamiko = False


class Vnstat(object):
    def __init__(self):
        self.version_ = None
        self.logger = logging.getLogger("modules.vnstat")
        htpc.MODULES.append({
            "name": "Bandwidth",
            "id": "vnstat",
            "fields": [
                {"type": "bool", "label": "Enable", "name": "vnstat_enable"},
                {"type": "text", "label": "Menu name", "name": "vnstat_name"},
                {"type": "bool", "label": "Use SSH?", 'desc': 'Used if vnstat is running on a different computer', "name": "vnstat_use_ssh"},
                {"type": "text", "label": "Vnstat DB location", "placeholder": "", "name": "vnstat_db"},
                {"type": "text", "label": "IP / Host", "placeholder": "localhost", "name": "vnstat_host"},
                {"type": "text", "label": "port", "name": "vnstat_port"},
                {"type": "text", "label": "Username", "name": "vnstat_username"},
                {"type": "password", "label": "Password", "name": "vnstat_password"},

            ]
        })

    @cherrypy.expose()
    @require()
    def index(self):
        return htpc.LOOKUP.get_template('vnstat.html').render(scriptname='vnstat', importParamiko=importParamiko)

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

            if htpc.settings.get('vnstat_db', ''):
                cmd = "vnstat --dbdir %s %s" % (htpc.settings.get('vnstat_db', ''), parameters)
            else:
                cmd = "vnstat %s" % parameters

            # Force windows users to use paramiko as here isnt any native ssh.
            if htpc.settings.get('vnstat_use_ssh') or platform.system() == 'win32':
                client = paramiko.SSHClient()
                client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                client.connect(hostname, username=username, password=password,
                                allow_agent=False, look_for_keys=False, timeout=10)

                stdin, stdout, stderr = client.exec_command(cmd)
                data_out = stdout.read()

                # Make json of shitty xml
                if '--xml' in cmd:
                    return xmltodict.parse(data_out)
                else:
                    return data_out

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
                    self.logger.error("Failed to run %s from shell" % cmd)

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
        return self.run('--oneline')

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
    @cherrypy.tools.json_out()
    def tr(self):
        piped = self.run('-tr')
        download = re.compile(ur'rx\s+(\d+.\d+)\s+(\w+\/s)')
        upload = re.compile(ur'tx\s+(\d+.\d+)\s+(\w+\/s)')
        rx = re.search(download, piped)
        tx = re.search(upload, piped)
        if rx:
            rx = '%s %s' % (rx.group(1), rx.group(2))
        if tx:
            tx = '%s %s' % (tx.group(1), tx.group(2))

        return {'rx': rx, 'tx': tx}

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

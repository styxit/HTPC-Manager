#!/usr/bin/env python
# -*- coding: utf-8 -*-

import time
import json
from datetime import datetime
import socket
import platform
import subprocess
import cherrypy
import htpc
import logging
import os
import requests
from cherrypy.lib.auth2 import require, member_of

logger = logging.getLogger('modules.stats')

importPsutil = False
importPsutilerror = ''
try:
    import psutil
    importPsutil = True
    if psutil.version_info < (3, 0, 0):
        importPsutilerror = 'Successfully imported psutil %s, upgrade to 3.0.0 or higher' % str(psutil.version_info)
        logger.error(importPsutilerror)
        importPsutil = False


except ImportError:
    importPsutilerror = 'Could not import psutil see <a href="https://github.com/giampaolo/psutil/blob/master/INSTALL.rst">install guide</a>.'
    logger.error(importPsutilerror)
    importPsutil = False

importpySMART = False
importpySMARTerror = ''
try:
    import pySMART
    importpySMARTerror = ''
    importpySMART = True

except Exception as e:
    logger.error(e)
    importpySMARTerror = e
    importpySMART = False

if importpySMART:
    if pySMART.utils.admin() is False:
        importpySMART = False
        importpySMARTerror = 'Python should be executed as an administrator to smartmontools to work properly. Please, try to run python with elevated credentials.'
        logger.error(importpySMARTerror)


class Stats(object):
    def __init__(self):
        self.logger = logging.getLogger('modules.stats')
        self.last_check = None
        self.last_check_ip = None
        htpc.MODULES.append({
            'name': 'System Info',
            'description': '<div class="alert alert-block alert-info"><i class="fa fa-info-circle fa-fw"></i> This module shows stats about your HTPC, including CPU usage, HDD space and hardware info. You can also execute scripts and kill processes</div>',
            'id': 'stats',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'stats_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'stats_name'},
                {'type': 'bool', 'label': 'Enable psutil', 'name': 'stats_psutil_enabled'},
                {'type': 'bool', 'label': 'Use bars', 'name': 'stats_use_bars', 'desc': 'Renders CPU/memory bar instead of table'},
                {'type': 'bool', 'label': 'Whitelist', 'name': 'stats_use_whitelist', 'desc': 'By enabling this the filesystem and mountpoint fields will be whitelisted instead of blacklisted'},
                {'type': 'text', 'label': 'Filesystem', 'placeholder': 'NTFS FAT32', 'desc': 'Use whitespace as separator', 'name': 'stats_filesystem'},
                {'type': 'text', 'label': 'Mountpoint', 'placeholder': 'mountpoint1 mountpoint2', 'desc': 'Use whitespace as separator', 'name': 'stats_mountpoint'},
                {'type': 'text', 'label': 'Limit processes', 'placeholder': '50', 'desc': 'Blank = show all processes', 'name': 'stats_limit_processes'},
                {'type': 'bool', 'label': 'Enable OHM', 'desc': 'Open Hardware Monitor is used for grabbing hardware info', 'name': 'stats_ohm_enabled'},
                {'type': 'text', 'label': 'OHM IP', 'placeholder': 'localhost', 'name': 'stats_ohm_ip'},
                {'type': 'text', 'label': 'OHM port', 'placeholder': '8085', 'desc': '', 'name': 'stats_ohm_port'},
                {'type': 'bool', 'label': 'Enable S.M.A.R.T.', 'desc': 'smartmontools is used for grabbing HDD health info (python must be executed as administrator)', 'name': 'stats_smart_enabled'},
                {'type': 'bool', 'label': 'Enable Scripts', 'desc': 'Add your scripts to userdata/scripts. Dont come crying if you delete your computer', 'name': 'stats_scripts_enabled'},
                {'type': 'bool', 'label': 'Show last refresh time<br />on dashboard widget', 'desc': 'Enable dash widget status message', 'name': 'stats_dash_message_enabled'},
                {'type': 'text', 'label': 'Reverse proxy link', 'placeholder': '', 'desc': 'Page title link. E.g /webmin or https://managementbox.mydomain.com/', 'name': 'stats_reverse_proxy_link'}

            ]
        })

    @cherrypy.expose()
    @require()
    def index(self):
        return htpc.LOOKUP.get_template('stats.html').render(scriptname='stats',
                                                             importPsutil=importPsutil,
                                                             importPsutilerror=importPsutilerror,
                                                             cmdline=htpc.SHELL,
                                                             importpySMART=importpySMART,
                                                             importpySMARTerror=importpySMARTerror,
                                                             scripts=self.list_scripts(),
                                                             webinterface=self.webinterface())

    def webinterface(self):
    # Return the reverse proxy url if specified
        return htpc.settings.get('stats_reverse_proxy_link')

    @cherrypy.expose()
    @require()
    def uptime(self, dash=False):
        try:
            b = psutil.boot_time()
            d = {}
            boot = datetime.now() - datetime.fromtimestamp(b)
            boot = str(boot)
            uptime = boot[:-7]
            d['uptime'] = uptime
            if dash is True:
                return uptime
            else:
                cherrypy.response.headers['Content-Type'] = 'application/json'
                return json.dumps(d)

        except Exception as e:
            self.logger.error('Could not get uptime %s' % e)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def disk_usage(self):
        rr = None
        l = []

        # This is a blacklist
        if not htpc.settings.get('stats_use_whitelist'):
            # Mount point that should be ignored, (Linux) Let me know if there is any missing
            mntpoint = ['', '/dev/shm', '/lib/init/rw', '/sys/fs/cgroup', '/boot']

            # File systems that should be ignored
            fstypes = ['autofs', 'binfmt_misc', 'configfs', 'debugfs',
                       'devfs', 'devpts', 'devtmpfs', 'hugetlbfs',
                       'iso9660', 'linprocfs', 'mqueue', 'none',
                       'proc', 'procfs', 'pstore', 'rootfs',
                       'securityfs', 'sysfs', 'usbfs', '']

            # Adds the mointpoints that the user wants to ignore
            user_mountpoint = htpc.settings.get('stats_mountpoint')

            # If user_mountpoint isnt a empty string
            if user_mountpoint:
                mntpoint += user_mountpoint.lower().split()

            # Adds the filesystem that the user wants to ignore/require
            user_filesystem = htpc.settings.get('stats_filesystem')

            # If user_ignore_filsystem is a empty string
            if user_filesystem:
                fstypes += user_filesystem.lower().split()

            try:
                for disk in psutil.disk_partitions(all=True):
                    # To stop windows barf on empy cdrom            #File system that will be ignored  #Mountpoint that should be ignored
                    if 'cdrom' in disk.opts or disk.fstype == '' or disk.fstype.lower() in fstypes or disk.mountpoint.lower() in mntpoint:
                        continue

                    usage = psutil.disk_usage(disk.mountpoint)
                    dusage = usage._asdict()
                    dusage['mountpoint'] = disk.mountpoint
                    dusage['device'] = disk.device

                    # NTFS driver reports filesystem type as fuseblk on Linux
                    if disk.fstype == 'fuseblk':
                        dusage['fstype'] = 'NTFS'
                    else:
                        dusage['fstype'] = disk.fstype

                    l.append(dusage)
                    rr = l

            except Exception as e:
                self.logger.error('Could not get disk info %s' % e)

            return l

        else:
            # Adds the mointpoints that the user wants to ignore
            user_mountpoint = htpc.settings.get('stats_mountpoint')

            # If user_ignore_mountpoint is a empty string
            if user_mountpoint:
                user_mountpoint = user_mountpoint.lower().split()

            # Adds the filesystem that the user wants to ignore/require
            user_filesystem = htpc.settings.get('stats_filesystem')

            # If user_ignore_filsystem isnt a empty string
            if user_filesystem:
                user_filesystem = user_filesystem.lower().split()

            try:
                for disk in psutil.disk_partitions(all=True):
                    # To stop windows barf on empy cdrom            # File system that will be required  # Mountpoint that should be required
                    if 'cdrom' in disk.opts or disk.fstype == '' or disk.fstype.lower() not in user_filesystem or disk.mountpoint.lower() not in user_mountpoint:
                        continue

                    usage = psutil.disk_usage(disk.mountpoint)
                    dusage = usage._asdict()
                    dusage['mountpoint'] = disk.mountpoint
                    dusage['device'] = disk.device

                    # NTFS driver reports filesystem type as fuseblk on Linux
                    if disk.fstype == 'fuseblk':
                        dusage['fstype'] = 'NTFS'
                    else:
                        dusage['fstype'] = disk.fstype

                    l.append(dusage)
                    rr = l

            except Exception as e:
                self.logger.error('Could not get disk info %s' % e)

            return rr

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def sysinfodash(self):
        ''' used for the dash '''
        d = {}
        # Cpu stuff
        cpu = psutil.cpu_times_percent(interval=0.1, percpu=False)
        cpu = cpu._asdict()
        d['cpu'] = {'user': cpu['user'],
                    'system': cpu['system'],
                    'idle': cpu['idle']
                    }

        # Virtual memory
        vmem = psutil.virtual_memory()
        vmem = vmem._asdict()
        d['virtual'] = {'total': vmem['total'],
                        'percent': vmem['percent'],
                        'available': vmem['available']
                        }
        d['localip'] = self.get_local_ip(dash=True)
        d['externalip'] = self.get_external_ip(dash=True)
        nw_psutil = psutil.net_io_counters()
        dnw_psutil = nw_psutil._asdict()
        d['network'] = dnw_psutil
        d['uptime'] = self.uptime(dash=True)
        d['user'] = self.get_user(dash=True)

        return d

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def processes(self):
        rr = None
        limit = str(htpc.settings.get('stats_limit_processes'))
        procs = []
        procs_status = {}
        for p in psutil.process_iter():
            try:
                p.dict = p.as_dict(['username', 'memory_percent', 'create_time',
                                    'cpu_percent', 'name', 'status', 'pid', 'memory_info'], ad_value='N/A')
                # Create a readable time
                try:
                    r_time = datetime.now() - datetime.fromtimestamp(p.dict['create_time'])
                except TypeError:
                    # for shitty os
                    r_time = time.time()

                r_time = str(r_time)[:-7]
                p.dict['r_time'] = r_time
                # fix for windows process name
                if os.name == 'nt':
                    p.dict['name'] = psutil._psplatform.cext.proc_name(p.pid)

                try:
                    procs_status[p.dict['status']] += 1
                except KeyError:
                    procs_status[p.dict['status']] = 1
            except psutil.NoSuchProcess:
                pass
            else:
                procs.append(p.dict)

        # return processes sorted by CPU percent usage
        processes = sorted(procs, key=lambda p: p['cpu_percent'], reverse=True)

        # Adds the total number of processes running, not in use atm
        #processes.append(procs_status)

        # If limit is a empty string
        if not limit:
            rr = processes
        else:
            rr = processes[:int(limit)]

        return rr

    # Returns cpu usage
    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def cpu_percent(self):
        try:
            cpu = psutil.cpu_times_percent(interval=0.4, percpu=False)
            cpu = cpu._asdict()
            return cpu

        except Exception as e:
            self.logger.error('Error trying to pull cpu percent: %s' % e)

    # Not in use atm.
    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def cpu_times(self):
        try:
            cpu = psutil.cpu_times(percpu=False)
            dcpu = cpu._asdict()
            return dcpu

        except Exception as e:
            self.logger.error('Error trying to pull cpu times: %s' % e)

    # Not in use
    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def num_cpu(self):
        try:
            cpu = psutil.cpu_count(logical=False)
            dcpu = cpu._asdict()
            return dcpu

        except Exception as e:
            self.logger.error('Error trying to pull cpu cores %s' % e)

    # Fetches info about the user that is logged in.
    @cherrypy.expose()
    @require()
    def get_user(self, dash=False):
        duser = {}
        try:
            for user in psutil.users():
                duser = user._asdict()
                td = datetime.now() - datetime.fromtimestamp(duser['started'])
                td = str(td)
                td = td[:-7]
                duser['started'] = td

            if dash:
                return duser
            else:
                cherrypy.response.headers['Content-Type'] = 'application/json'
                return json.dumps(duser)

        except Exception as e:
            self.logger.error('Pulling logged in info %s' % e)

    @cherrypy.expose()
    @require()
    def get_local_ip(self, dash=False):
        d = {}
        try:
            ip = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            ip.connect(('8.8.8.8', 80))
            local_ip = (ip.getsockname()[0])
            d['localip'] = local_ip

            if dash:
                return local_ip
            else:
                cherrypy.response.headers['Content-Type'] = 'application/json'
                return json.dumps(d)

        except Exception as e:
            self.logger.error('Pulling  local ip %s' % e)

    def _get_external_ip(self, dash=False):
        try:
            # myexternalip.com/raw isn't working for me. Changed to two different sites and added error checking to ensure success.
            self.logger.debug('Checking external ip at wtfismyip.com')
            s = requests.get('http://wtfismyip.com/text')
            if s.status_code == requests.codes.ok:
                return s.content.strip()
            else:
                self.logger.error('Got bad response from wtfismyip.com HTTP ' + str(s.status_code))
                self.logger.debug('Checking external ip at ident.me')
                s = requests.get('http://ident.me/')
                if s.status_code == requests.codes.ok:
                    return s.content.strip()
                else:
                    self.logger.error('Got bad response from ident.me HTTP ' + str(s.status_code))
                    return ''
        except Exception as e:
            self.logger.error('Pulling external ip %s' % e)
            return ''

    @cherrypy.expose()
    @require()
    def get_external_ip(self, dash=False):
        if self.last_check is None:
            self.last_check_ip = self._get_external_ip()
            self.last_check = time.time()

        # only check ip each 30 min as they telling us to fuck off (http 429)
        # else retuned the cached ip
        if time.time() - self.last_check >= 3000:
            self.last_check_ip = self._get_external_ip()
            self.last_check = time.time()

            if dash:
                return self.last_check_ip
            else:
                cherrypy.response.headers['Content-Type'] = 'application/json'
                return json.dumps({'externalip': self.last_check_ip})
        else:
            if dash:
                return self.last_check_ip
            cherrypy.response.headers['Content-Type'] = 'application/json'
            return json.dumps({'externalip': self.last_check_ip})

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def sys_info(self):
        try:
            d = {}
            computer = platform.uname()
            d['system'] = computer[0]
            d['user'] = computer[1]
            d['release'] = computer[2]
            d['version'] = computer[3]
            d['machine'] = computer[4]
            d['processor'] = computer[5]
            return d

        except Exception as e:
            self.logger.error('Pulling system info %s' % e)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def network_usage(self):
        try:
            nw_psutil = psutil.net_io_counters()
            dnw_psutil = nw_psutil._asdict()
            return dnw_psutil

        except Exception as e:
            self.logger.error('Pulling network info %s' % e)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def virtual_memory(self):
        try:
            mem = psutil.virtual_memory()
            dmem = mem._asdict()
            return dmem

        except Exception as e:
            self.logger.error('Pulling physical memory %s' % e)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def swap_memory(self):
        try:
            mem = psutil.swap_memory()
            dmem = mem._asdict()
            return dmem

        except Exception as e:
            self.logger.error('Pulling swap memory %s' % e)

    # Fetches settings in the db, is used for some styling, like bars or tables
    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def return_settings(self):
        d = {}
        try:
            if str(htpc.settings.get('stats_use_bars')) == str('False'):
                d['stats_use_bars'] = 'false'
            else:
                d['stats_use_bars'] = 'true'

            d['stats_ignore_mountpoint'] = htpc.settings.get('stats_ignore_mountpoint')
            d['stats_ignore_filesystem'] = htpc.settings.get('stats_ignore_filesystem')
            d['stats_dash_message_enabled'] = htpc.settings.get('stats_dash_message_enabled')

        except Exception as e:
            self.logger.error('Getting stats settings %s' % e)

        return d

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    @require(member_of(htpc.role_admin))
    def command(self, cmd=None, pid=None, signal=None):
        dmsg = {}
        try:
            if pid:
                p = psutil.Process(pid=int(pid))
                name = p.name()
            else:
                pass

            if cmd == 'kill':
                try:
                    p.terminate()
                    dmsg['status'] = 'success'
                    msg = 'Terminated process %s %s' % (name, pid)
                    p.wait()

                except psutil.NoSuchProcess:
                    msg = 'Process %s does not exist' % name

                except psutil.AccessDenied:
                    msg = 'Dont have permission to terminate/kill %s %s' % (name, pid)
                    dmsg['status'] = 'error'

                except psutil.TimeoutExpired:
                    p.kill()
                    dmsg['status'] = 'success'
                    msg = 'Killed process %s %s' % (name, pid)

                dmsg['msg'] = msg
                self.logger.info(msg)
                return dmsg

            elif cmd == 'signal':
                p.send_signal(signal)
                msg = '%ed pid %s %s successfully with %s' % (cmd, pid, name, signal)
                dmsg['msg'] = msg
                self.logger.info(msg)
                return dmsg

        except Exception as e:
            self.logger.error('Error trying to %s %s' % (cmd, e))

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def smart_info(self):
        if importpySMART is True:
            try:
                from pySMART import DeviceList
                devlist = DeviceList()
                d = {}
                i = 0
                for hds in devlist.devices:
                    temp = 0
                    a = {}
                    x = 0
                    for atts in hds.attributes:
                        if hasattr(atts, 'name'):
                            a[x] = {'id': atts.num,
                                    'name': atts.name,
                                    'cur': atts.value,
                                    'wst': atts.worst,
                                    'thr': atts.thresh,
                                    'raw': atts.raw,
                                    'flags': atts.flags,
                                    'type': atts.type,
                                    'updated': atts.updated,
                                    'when_fail': atts.when_failed
                                    }
                            if atts.name == 'Temperature_Celsius':
                                temp = atts.raw
                            x += 1
                    if x > 0:
                        d[i] = {'assessment': hds.assessment,
                                'firmware': hds.firmware,
                                'interface': hds.interface,
                                'is_ssd': hds.is_ssd,
                                'model': hds.model,
                                'name': hds.name,
                                'serial': hds.serial,
                                'supports_smart': hds.supports_smart,
                                'capacity': hds.capacity,
                                'temperature': temp,
                                'attributes': a
                                }

                        i += 1
                return d
            except Exception as e:
                self.logger.exception('Error Pulling S.M.A.R.T. data %s' % e)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def ohm(self):
        ip = htpc.settings.get('stats_ohm_ip', 'localhost')
        port = htpc.settings.get('stats_ohm_port')
        enabled = htpc.settings.get('stats_ohm_enabled')

        if ip and port and enabled:
            try:
                u = 'http://%s:%s/data.json' % (ip, port)
                r = requests.get(u)
                if r.status_code == requests.codes.ok:
                    return r.json()
            except Exception as e:
                self.logger.error('Failed to get info from ohm %s' % e)
        else:
            self.logger.debug("Check settings, ohm isn't configured correct")
            return

    @cherrypy.expose()
    @require()
    def list_scripts(self):
        scriptdir = os.path.join(htpc.DATADIR, 'scripts/')
        scripts = []

        if not os.path.exists(scriptdir):
            os.makedirs(scriptdir)

        for root, dirs, files in os.walk(scriptdir):
            for f in files:
                name, ext = os.path.splitext(f)
                ext = ext[1:]
                if ext in ('bat', 'py', 'sh', 'cmd'):
                    d = {'filename': f,
                         'fp': os.path.join(scriptdir, f),
                         'name': name,
                         'ext': ext}

                    scripts.append(d)

        return scripts

    @cherrypy.expose()
    @require(member_of(htpc.role_admin))
    @cherrypy.tools.json_out()
    def run_script(self, script, **kwargs):
        prefix = ''
        name, ext = os.path.splitext(script)

        if ext == '.py':
            prefix = 'python'
        elif ext == '.pl':
            prefix = 'perl'

        out = error = status = None

        for root, dirs, files in os.walk(htpc.SCRIPTDIR):
            for f in files:
                if script == f:
                    if prefix:
                        script = '%s %s' % (prefix, script)
                    start = time.time()
                    try:
                        p = subprocess.Popen(script, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                             shell=True, cwd=os.path.join(htpc.DATADIR, 'scripts/'))

                        out, error = p.communicate()
                        status = p.returncode

                        if out:
                            out = out.strip()

                        if error:
                            error = error.strip()

                    except OSError as out:
                        self.logger.error('Failed to run %s error %s' % (script, out))

                    end = time.time() - start
                    d = {'runtime': end, 'result': out, 'exit_status': status}
                    return d

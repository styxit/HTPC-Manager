#!/usr/bin/env python
# -*- coding: utf-8 -*-

import time
import json
from datetime import datetime
import socket
import urllib2
import platform
from subprocess import PIPE
import cherrypy
import htpc
import logging
from cherrypy.lib.auth2 import require, member_of

logger = logging.getLogger('modules.stats')

try:
    import psutil
    importPsutil = True

except ImportError:
    logger.error("Could't import psutil. See https://raw.githubusercontent.com/giampaolo/psutil/master/INSTALL.rst")
    importPsutil = False


class Stats(object):
    def __init__(self):
        self.logger = logging.getLogger('modules.stats')
        self.last_check = None
        self.last_check_ip = None
        htpc.MODULES.append({
            'name': 'Computer stats',
            'id': 'stats',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'stats_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'stats_name'},
                {'type': 'bool', 'label': 'Use bars', 'name': 'stats_use_bars'},
                {'type': 'bool', 'label': 'Whitelist', 'name': 'stats_use_whitelist', 'desc': 'By enabling this the filesystem and mountpoints fields will become whitelist instead of blacklist'},
                {'type': 'text', 'label': 'Filesystem', 'placeholder': 'NTFS FAT32', 'desc': 'Use whitespace as separator', 'name': 'stats_filesystem'},
                {'type': 'text', 'label': 'Mountpoint', 'placeholder': 'mountpoint1 mountpoint2', 'desc': 'Use whitespace as separator', 'name': 'stats_mountpoint'},
                {'type': 'text', 'label': 'Limit processes', 'placeholder': '50', 'desc': 'Blank for all processes', 'name': 'stats_limit_processes'}
            ]
        })

    @cherrypy.expose()
    @require()
    def index(self):
        # Since many linux repos still have psutil version 0.5
        if importPsutil and psutil.version_info >= (0, 7):
            pass
        else:
            self.logger.error("Psutil is outdated, needs atleast version 0,7")

        return htpc.LOOKUP.get_template('stats.html').render(scriptname='stats', importPsutil=importPsutil, cmdline=htpc.SHELL)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def uptime(self):
        try:
            if psutil.version_info >= (2, 0, 0):
                b = psutil.boot_time()
            else:
                b = psutil.get_boot_time()
            d = {}
            boot = datetime.now() - datetime.fromtimestamp(b)
            boot = str(boot)
            uptime = boot[:-7]
            d['uptime'] = uptime
            return d

        except Exception as e:
            self.logger.error("Could not get uptime %s" % e)

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
                self.logger.error("Could not get disk info %s" % e)

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
                self.logger.error("Could not get disk info %s" % e)

            return rr

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def sysinfodash(self):
        """ used for the dash """
        d = {}
        # Cpu stuff
        cpu = psutil.cpu_times_percent(interval=0.1, percpu=False)
        cpu = cpu._asdict()
        d["cpu"] = {"user": cpu["user"],
                    "system": cpu["system"],
                    "idle": cpu["idle"]
                    }

        # Virtual memory
        vmem = psutil.virtual_memory()
        vmem = vmem._asdict()
        d["vmem"] = {"total": vmem["total"],
                     "percent": vmem["percent"],
                     "available": vmem["available"]
                     }
        d["localip"] = self.get_local_ip(dash=True)
        d["externalip"] = self.get_external_ip(dash=True)

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
                p.dict = p.as_dict(['username', 'get_memory_percent', 'create_time',
                                    'get_cpu_percent', 'name', 'status', 'pid', 'get_memory_info'])
                # Create a readable time
                r_time = datetime.now() - datetime.fromtimestamp(p.dict['create_time'])
                r_time = str(r_time)[:-7]
                p.dict['r_time'] = r_time
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
        processes.append(procs_status)

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
            self.logger.error("Error trying to pull cpu percent: %s" % e)

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
            self.logger.error("Error trying to pull cpu times: %s" % e)

    # Not in use
    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def num_cpu(self):
        try:
            if psutil.version_info >= (2, 0, 0):
                cpu = psutil.cpu_count(logical=False)
            else:
                cpu = psutil.NUM_CPUS
            dcpu = cpu._asdict()
            return dcpu

        except Exception as e:
            self.logger.error("Error trying to pull cpu cores %s" % e)

    # Fetches info about the user that is logged in.
    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def get_user(self):
        try:
            for user in psutil.get_users():
                duser = user._asdict()
                td = datetime.now() - datetime.fromtimestamp(duser['started'])
                td = str(td)
                td = td[:-7]
                duser['started'] = td
            return duser

        except Exception as e:
            self.logger.error("Pulling logged in info %s" % e)

    @cherrypy.expose()
    @require()
    def get_local_ip(self, dash=False):
        # added a small delay since getting local is faster then network usage (Does not render in the html)
        # time.sleep(0.1)
        d = {}
        try:
            ip = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            ip.connect(('8.8.8.8', 80))
            local_ip = (ip.getsockname()[0])
            d['localip'] = local_ip

        except Exception as e:
            self.logger.error("Pulling  local ip %s" % e)

        if dash:
            return local_ip
        else:
            cherrypy.response.headers['Content-Type'] = "application/json"
            return json.dumps(d)

    def _get_external_ip(self, dash=False):
        try:
            self.logger.debug("Checking external ip")
            s = urllib2.urlopen('http://myexternalip.com/raw').read()
            return s.strip()
        except Exception as e:
            self.logger.error("Pulling external ip %s" % e)
            return ""

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
                cherrypy.response.headers['Content-Type'] = "application/json"
                return json.dumps({"externalip": self.last_check_ip})
        else:
            if dash:
                return self.last_check_ip
            cherrypy.response.headers['Content-Type'] = "application/json"
            return json.dumps({"externalip": self.last_check_ip})

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
            self.logger.error("Pulling system info %s" % e)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def network_usage(self):
        try:
            nw_psutil = psutil.net_io_counters()
            dnw_psutil = nw_psutil._asdict()
            return dnw_psutil

        except Exception as e:
            self.logger.error("Pulling network info %s" % e)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def virtual_memory(self):
        try:
            mem = psutil.virtual_memory()
            dmem = mem._asdict()
            return dmem

        except Exception as e:
            self.logger.error("Pulling physical memory %s" % e)

    @cherrypy.expose()
    @require()
    @cherrypy.tools.json_out()
    def swap_memory(self):
        try:
            mem = psutil.swap_memory()
            dmem = mem._asdict()
            return dmem

        except Exception as e:
            self.logger.error("Pulling swap memory %s" % e)

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

        except Exception as e:
            self.logger.error("Getting stats settings %s" % e)

        return d

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    @require(member_of("admin"))
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
            self.logger.error("Error trying to %s" % cmd, e)

    @cherrypy.expose()
    @require(member_of("admin"))
    @cherrypy.tools.json_out()
    def cmdpopen(self, cmd=None):
        d = {}
        cmd = cmd.split(', ')

        try:
            if htpc.SHELL:
                r = psutil.Popen(cmd, stdout=PIPE, stdin=PIPE, stderr=PIPE, shell=False)
                msg = r.communicate()
                d['msg'] = msg
                self.logger.info(msg)
                return d

            else:
                msg = 'HTPC-Manager is not started with --shell'
                self.logger.error(msg)
                d['msg'] = msg
                self.logger.error(msg)
                return d

        except Exception as e:
            self.logger.error('Sending command from stat module failed: %s' % e)

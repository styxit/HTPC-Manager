#!/usr/bin/env python
# -*- coding: utf-8 -*-

import time
import json
from datetime import datetime, timedelta
import sys
import os
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

class Stats:
    def __init__(self):
        self.logger = logging.getLogger('modules.stats')
        htpc.MODULES.append({
            'name': 'Computer stats',
            'id': 'stats',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'stats_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'stats_name'},
                {'type': 'bool', 'label': 'Bar', 'name': 'stats_use_bars'},
                {'type': 'text', 'label': 'Ignore filesystem', 'placeholder':'NTFS FAT32', 'desc':'Write the filesystems you want to ignore. Serperate with whitespace', 'name': 'stats_ignore_filesystem'},
                {'type': 'text', 'label': 'Ignore mountpoint', 'placeholder': 'mountpoint1 mountpoint2', 'desc':'Write the mountpoints that you want to ignore.Seperate with whitepace','name': 'stats_ignore_mountpoint'},
                {'type': 'text', 'label': 'Limit processes', 'placeholder':'50', 'desc':'Blank for all processes', 'name': 'stats_limit_processes'}
        ]})

    @cherrypy.expose()
    @require()
    def index(self):
        #Since many linux repos still have psutil version 0.5
        if importPsutil and psutil.version_info >= (0, 7):
            pass
        else:
            self.logger.error("Psutil is outdated, needs atleast version 0,7")

        return htpc.LOOKUP.get_template('stats.html').render(scriptname='stats', importPsutil=importPsutil, cmdline=htpc.SHELL)

    @cherrypy.expose()
    @require()
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
            return json.dumps(d)
        except Exception as e:
            self.logger.error("Could not get uptime %s" % e)


    @cherrypy.expose()
    @require()
    def disk_usage(self):
        rr = None
        l = []

        #Mount point that should be ignored, (Linux) Let me know if there is any missing
        ignore_mntpoint = ['', '/dev/shm', '/lib/init/rw', '/sys/fs/cgroup', '/boot']

        #File systems that should be ignored
        ignore_fstypes = ['autofs', 'binfmt_misc', 'configfs', 'debugfs',
                                'devfs', 'devpts', 'devtmpfs', 'hugetlbfs',
                                'iso9660', 'linprocfs', 'mqueue', 'none',
                                'proc', 'procfs', 'pstore', 'rootfs',
                                'securityfs', 'sysfs', 'usbfs', '']

        #Adds the mointpoints that the user wants to ignore to the list of ignored ignorepoints
        user_ignore_mountpoint = htpc.settings.get('stats_ignore_mountpoint')

        #If user_ignore_mountpoint is a empty string
        if not user_ignore_mountpoint:
            pass
        else:
            ignore_mntpoint += user_ignore_mountpoint.split()

        #Adds the filesystem that the user wants to ignore to the list of ignored filesystem
        user_ignore_filesystem = htpc.settings.get('stats_ignore_filesystem')

        #If user_ignore_filsystem is a empty string
        if not user_ignore_filesystem:
            pass
        else:
            ignore_fstypes += user_ignore_filesystem.split()

        try:

            for disk in psutil.disk_partitions(all=True):

                # To stop windows barf on empy cdrom            #File system that will be ignored  #Mountpoint that should be ignored, linux
                if 'cdrom' in disk.opts or disk.fstype == '' or disk.fstype in ignore_fstypes or disk.mountpoint in ignore_mntpoint:
                    continue

                usage = psutil.disk_usage(disk.mountpoint)
                dusage = usage._asdict()
                dusage['mountpoint'] = disk.mountpoint
                dusage['device'] = disk.device

                #NTFS driver reports filesystem type as fuseblk on Linux
                if disk.fstype == 'fuseblk':
                    dusage['fstype'] = 'NTFS'
                else:
                    dusage['fstype'] = disk.fstype

                l.append(dusage)
                rr = json.dumps(l)

        except Exception as e:
            self.logger.error("Could not get disk info %s" % e)

        return rr

    @cherrypy.expose()
    @require()
    def processes(self):
        rr = None
        limit = str(htpc.settings.get('stats_limit_processes'))
        procs = []
        procs_status = {}
        for p in psutil.process_iter():

            try:
                p.dict = p.as_dict(['username', 'get_memory_percent', 'create_time',
                                    'get_cpu_percent', 'name', 'status', 'pid', 'get_memory_info'])
                #Create a readable time
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
        processes = sorted(procs, key=lambda p: p['cpu_percent'],
                        reverse=True)

        #Adds the total number of processes running, not in use atm
        processes.append(procs_status)

        #if limit is a empty string
        if not limit:
            rr = json.dumps(processes)
        else:
            rr = json.dumps(processes[:int(limit)])

        return rr



    #Returns cpu usage
    @cherrypy.expose()
    @require()
    def cpu_percent(self):
        jcpu = None
        try:
            cpu = psutil.cpu_times_percent(interval=0.4, percpu=False)
            cpu = cpu._asdict()
            jcpu = json.dumps(cpu)
            return jcpu
        except Exception as e:
            self.logger.error("Error trying to pull cpu percent: %s" % e)


    # Not in use atm.
    @cherrypy.expose()
    @require()
    def cpu_times(self):
        rr = None
        try:
            cpu = psutil.cpu_times(percpu=False)
            dcpu = cpu._asdict()
            rr = json.dumps(dcpu)
            return rr
        except Exception as e:
            self.logger.error("Error trying to pull cpu times: %s" % e)

    #Not in use
    @cherrypy.expose()
    @require()
    def num_cpu(self):
        try:
            if psutil.version_info >= (2,0,0):
                cpu = psutil.cpu_count(logical=False)
            else:
                cpu = psutil.NUM_CPUS
            dcpu = cpu._asdict()
            jcpu  = json.dumps(dcpu)
            return jcpu
        except Exception as e:
            self.logger.error("Error trying to pull cpu cores %s" % e)


    #Fetches info about the user that is logged in.
    @cherrypy.expose()
    @require()
    def get_user(self):
        l =[]
        d = {}
        rr = None
        try:
            for user in psutil.get_users():
                duser = user._asdict()
                td = datetime.now() - datetime.fromtimestamp(duser['started'])
                td = str(td)
                td = td[:-7]
                duser['started'] = td
                rr = json.dumps(duser)
            return rr

        except Exception as e:
            self.logger.error("Pulling logged in info %s" % e)
        return rr

    @cherrypy.expose()
    @require()
    def get_local_ip(self):
        # added a small delay since getting local is faster then network usage (Does not render in the html)
        time.sleep(0.1)
        d = {}
        rr = None
        try:
            ip = socket.socket(socket.AF_INET, socket.SOCK_DGRAM);
            ip.connect(('8.8.8.8', 80))
            local_ip =(ip.getsockname()[0])
            d['localip'] = local_ip
            rr = json.dumps(d)
            return rr
        except Exception as e:
            self.logger.error("Pulling  local ip %s" % e)


    @cherrypy.expose()
    @require()
    def get_external_ip(self):
        d = {}
        rr = None
        try:
            s = urllib2.urlopen('http://myexternalip.com/raw').read()
            d['externalip'] = s.strip()
            rr = json.dumps(d)
            return rr
        except Exception as e:
            self.logger.error("Pulling external ip %s" % e)


    @cherrypy.expose()
    @require()
    def sys_info(self):
        d = {}
        rr = None
        try:
            computer = platform.uname()
            d['system'] = computer[0]
            d['user'] = computer[1]
            d['release'] = computer[2]
            d['version'] = computer[3]
            d['machine'] = computer[4]
            d['processor'] = computer[5]
            rr = json.dumps(d)
            return rr
        except Exception as e:
            self.logger.error("Pulling system info %s" % e )


    #get network usage
    @cherrypy.expose()
    @require()
    def network_usage(self):

        try:
            nw_psutil = psutil.net_io_counters()
            dnw_psutil = nw_psutil._asdict()

            return json.dumps(dnw_psutil)

        except Exception as e:
            self.logger.error("Pulling network info %s" % e)


    @cherrypy.expose()
    @require()
    def virtual_memory(self):
        d = {}
        rr = None

        try:
            mem = psutil.virtual_memory()
            dmem = mem._asdict()
            rr = json.dumps(dmem)

            return rr

        except Exception as e:
            self.logger.error("Pulling physical memory %s" % e)


    @cherrypy.expose()
    @require()
    def swap_memory(self):
        d = {}
        rr = None

        try:
            mem = psutil.swap_memory()
            dmem = mem._asdict()
            rr = json.dumps(dmem)

            return rr

        except Exception as e:
            self.logger.error("Pulling swap memory %s" % e)

    #Fetches settings in the db, is used for some styling, like bars or tables.
    @cherrypy.expose()
    @require()
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

        return json.dumps(d)

    @cherrypy.expose()
    @require(member_of("admin"))
    def command(self, cmd=None, pid=None, signal=None):
        dmsg = {}
        jmsg =  None
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
                    msg = 'Dont have permission to terminate/kill %s %s' % (name,pid)
                    dmsg['status'] = 'error'

                except psutil.TimeoutExpired:
                    p.kill()
                    dmsg['status'] = 'success'
                    msg = 'Killed process %s %s' % (name, pid)

                dmsg['msg'] = msg
                jmsg = json.dumps(dmsg)
                self.logger.info(msg)
                return jmsg

            elif cmd == 'signal':
                p.send_signal(signal)
                msg = '%ed pid %s successfully with %s'% (cmd, name, pid, signal)
                dmsg['msg'] = msg
                jmsg = json.dumps(dmsg)
                self.logger.info(msg)
                return jmsg

        except Exception as e:
            self.logger.error("Error trying to %s" % cmd, e)


    @cherrypy.expose()
    @require(member_of("admin"))
    def cmdpopen(self, cmd=None):
        d = {}
        cmd = cmd.split(', ')

        try:
            if htpc.SHELL:
                r = psutil.Popen(cmd, stdout=PIPE, stdin=PIPE, stderr=PIPE, shell=False)
                msg = r.communicate()
                d['msg'] = msg
                jmsg = json.dumps(d)
                self.logger.info(msg)
                return jmsg

            else:
                msg = 'HTPC-Manager is not started with --shell'
                self.logger.error(msg)
                d['msg'] = msg
                jmsg = json.dumps(d)
                self.logger.error(msg)
                return jmsg

        except Exception as e:
            self.logger.error('Sending command from stat module failed: %s'% e)

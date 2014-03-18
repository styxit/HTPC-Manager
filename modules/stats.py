# coding=utf-8

import time
import json
from datetime import datetime, timedelta
import sys
import os
import socket
import urllib2
import platform

import cherrypy
import htpc
import logging

logger = logging.getLogger('modules.stats')

try:
    import psutil
    importPsutil = True

except ImportError:
    logger.error("Could't import psutil. See http://psutil.googlecode.com/hg/INSTALL")
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
                {'type': 'text', 'label': 'Ignore filesystem', 'name': 'stats_ignore_filesystem'},
                {'type': 'text', 'label': 'Ignore mountpoint', 'name': 'stats_ignore_mountpoint'},
                {'type': 'text', 'label': 'Limit processes', 'name': 'stats_limit_processes'}
        ]})

    @cherrypy.expose()
    def index(self):
        #Since many linux repos still have psutil version 0.5
        if importPsutil and psutil.version_info >= (0, 7):
            pass
        else:
            self.logger.error("Psutil is outdated, needs atleast version 0,7")

        return htpc.LOOKUP.get_template('stats.html').render(scriptname='stats', importPsutil=importPsutil)

    @cherrypy.expose()
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
    def processes(self):
        rr = None
        limit = str(htpc.settings.get('stats_limit_processes'))
        procs = []
        procs_status = {}
        for p in psutil.process_iter():
            
            try:
                p.dict = p.as_dict(['username', 'get_memory_percent', 
                                    'get_cpu_percent', 'name', 'status', 'pid', 'get_memory_info', 'create_time'])
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
    def network_usage(self):

        try:
            nw_psutil = psutil.net_io_counters()
            dnw_psutil = nw_psutil._asdict()

            return json.dumps(dnw_psutil)

        except Exception as e:
            self.logger.error("Pulling network info %s" % e)


    @cherrypy.expose()
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

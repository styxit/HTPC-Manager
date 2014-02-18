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


try: 
    import psutil
except:
    if platform.system() == 'Windows':
        print 'Have you installed psutil correctly? Use the installer on pypi, make sure you get the right processor and architecture. See http://psutil.googlecode.com/hg/INSTALL'

class Stats:
    def __init__(self):
        self.logger = logging.getLogger('modules.stats')
        htpc.MODULES.append({
            'name': 'Computer stats',
            'id': 'stats',
            #'test': htpc.WEBDIR + 'stats/ping',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'stats_enable'},
                {'type': 'text', 'label': 'Menu name', 'name': 'stats_name'},
                {'type': 'bool', 'label': 'Bar', 'name': 'stats_use_bars'},
                {'type': 'text', 'label': 'Polling', 'name': 'stats_polling'}
        ]})

    @cherrypy.expose()
    def index(self):
        return htpc.LOOKUP.get_template('stats.html').render(scriptname='stats')

    @cherrypy.expose()
    def uptime2(self):
        try:
            
            d = {}
            boot = datetime.now() - datetime.fromtimestamp(psutil.get_boot_time())
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
        
        try:
            if os.name == 'nt':
                # Need to be true, or else not network disks will show.
                for disk in psutil.disk_partitions(all=True):
                    
                    if 'cdrom' in disk.opts or disk.fstype == '':
                        #To stop windows errors if cdrom is empty
                        continue
                        
                    usage = psutil.disk_usage(disk.mountpoint)
                    dusage = usage._asdict()
                    dusage['mountpoint'] = disk.mountpoint
                    dusage['device'] = disk.device
                    l.append(dusage)
                    rr = json.dumps(l)
                    
            if os.name == 'posix':
                
                for disk in psutil.disk_partitions(all=False):
                    usage = psutil.disk_usage(disk.device)
                    dusage = usage._asdict()
                    dusage['mountpoint'] = disk.mountpoint
                    dusage['device'] = disk.device
                    l.append(dusage)
                    rr = json.dumps(l)
                    
        except Exception as e:
            self.logger.error("Could not get disk info %s" % e)
        
        return rr
 
    @cherrypy.expose()
    def disk_usage2(self):
        rr = None
        l = []
        try:
            for disk in psutil.disk_partitions(all=True):
                if os.name == 'nt':
                    if 'cdrom' in disk.opts or disk.fstype == '':
                        pass
                    else:
                        usage = psutil.disk_usage(disk.mountpoint)
                        dusage = usage._asdict()
                        dusage['mountpoint'] = disk.mountpoint
                        #jusage = json.dumps(dusage)
                        l.append(dusage)
  
                        rr = json.dumps(l)
                        
        except Exception as e:
            self.logger.error("Could not get disk info %s" % e)
        
        return rr


    #disk_usage()

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
    
    #Not in use as it returns threads aswell on windows
    @cherrypy.expose()
    def num_cpu(self):
        try:
            
            cpu = psutil.NUM_CPUS
            dcpu = cpu._asdict()
            jcpu  = json.dumps(dcpu)
            
            return jcpu
            
        except Exception as e:
            self.logger.error("Error trying to pull cpu cores %s" % e)

    #num_cpu()

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

    #get_local_ip()
    
    @cherrypy.expose()
    def get_external_ip(self):
        d = {}
        rr = None
        
        try:
            s = urllib2.urlopen('http://myexternalip.com/raw').read()
            d['externalip'] = s
            rr = json.dumps(d)
            
            return rr
            
        except Exception as e:
            self.logger.error("Pulling external ip %s" % e)

    #get_external_ip()
    
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

    #sys_info()

    #get network usage
    @cherrypy.expose()
    def network_usage(self):
        
        try:
            nw_psutil = psutil.net_io_counters()
            nw_psutil = nw_psutil._asdict()
            
            return json.dumps(nw_psutil)
            
        except Exception as e:
            self.logger.error("Pulling network info %s" % e)
            

    #print network_uage()
    
    @cherrypy.expose()
    def virtual_memory(self):
        d = {}
        rr = None
        
        try:
            mem = psutil.virtual_memory()
            mem = mem._asdict()
            rr = json.dumps(mem)
            
            return rr
            
        except Exception as e:
            self.logger.error("Pulling physical memory %s" % e)

    @cherrypy.expose()
    def swap_memory(self):
        d = {}
        rr = None
        
        try:
            
            mem = psutil.swap_memory()
            mem = mem._asdict()
            rr = json.dumps(mem)
            
            return rr
            
        except Exception as e:
            self.logger.error("Pulling swap memory %s" % e)
    
    @cherrypy.expose()
    def return_settings(self):
        d = {}
        try:
            
            if str(htpc.settings.get('stats_use_bars')) == str('False'):
                d['stats_use_bars'] = 'false'
            else:
                d['stats_use_bars'] = 'true'
            
            d['polling'] = htpc.settings.get('stats_polling')
        
        except Exception as e:
            self.logger.error("Getting stats settings %s" % e)
            
        return json.dumps(d)


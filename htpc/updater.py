"""
Update HTPC-Manager from Github. Either through git command or tarball.
Original code by Mikie (https://github.com/Mikie-Ghost/)
"""
import os
import urllib2
import tarfile
import shutil
import platform
import subprocess
import re
from json import loads
import cherrypy
import htpc
import logging


class Updater:
    """ Main class """
    def __init__(self):
        """ Set GitHub constants on load """
        self.user = 'mbw2001'
        self.repo = 'htpc-manager'
        self.branch = 'Updater'
        self.git = 'git'
        self.logger = logging.getLogger('htpc.updater')

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def index(self):
        """ Handle server requests. Update on POST. Get status on GET. """
        if cherrypy.request.method.upper() == 'POST':
            cherrypy.engine.exit()
            status = self.git_update()
            cherrypy.server.start()
            return status
        else:
            return self.check_update()

    def current(self):
        """ Get hash of current Git commit """
        self.logger.debug('Getting current version.')
        output = self.git_exec('rev-parse HEAD')
        self.logger.debug('Current version: ' + output)
        if re.match('^[a-z0-9]+$', output):
            return output

    def latest(self):
        """ Get hash of latest git commit """
        self.logger.debug('Getting latest version.')
        try:
            url = 'https://api.github.com/repos/%s/%s/commits/%s' % (
                    self.user, self.repo, self.branch)
            result = loads(urllib2.urlopen(url).read())
            latest = result['sha'].strip()
            self.logger.debug('Latest version: ' + latest)
            return latest
        except:
            return None

    def behind_by(self, current, latest):
        """ Check how many commits between current and latest """
        self.logger.debug('Checking how far behind latest')
        try:
            url = 'https://api.github.com/repos/%s/%s/compare/%s...%s' % (
                    self.user, self.repo, current, latest)
            result = loads(urllib2.urlopen(url).read())
            behind = int(result['total_commits'])
            self.logger.debug('Behind: ' + behind)
            return behind
        except Exception, e:
            self.logger.error(str(e))
            return -1

    def check_update(self):
        """ Check for updates """
        self.logger.info("Checking for updates.")
        current = self.current()
        latest = self.latest()
        if current == latest:
            self.logger.info("HTPC-Manager is Up-To-Date.")
            return 0
        else:
            behind = self.behind_by(current, latest)
            self.logger.info("Currently " + str(behind) + " commits behind.")
            return (behind, 'https://github.com/%s/%s/compare/%s...%s' % (
                      self.user, self.repo, current, latest))

    def git_update(self):
        """ Do update through git """
        self.logger.info("Attempting update through Git.")
        output = self.git_exec('pull origin %s' % self.branch)

        if not output:
            self.logger.error("Unable to update through git. Make sure that Git is located in your path and can be accessed by this application.")
            return False
        elif 'Aborting.' in output:
            self.logger.error("Update aborted.")
            return False

        return True

    def git_exec(self, args):
        """ Tool for running git program on system """
        try:
            proc = subprocess.Popen(self.git + " " +args, stdout=subprocess.PIPE,
                   stderr=subprocess.STDOUT, shell=True, cwd=htpc.RUNDIR)
            output, err = proc.communicate()
        except OSError, e:
            self.logger.warning(str(e))
            return ''

        if err:
            self.logger.warning(output + ' - ' + err)
            return ''
        elif any(s in output for s in ['not found', 'not recognized', 'fatal:']):
            self.logger.warning(output)
            return ''
        else:
            return output.strip()

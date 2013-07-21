"""
Update HTPC-Manager from Github. Either through git command or tarball.
Original code by Mikie (https://github.com/Mikie-Ghost/)
"""
from threading import Thread
import urllib2
import subprocess
import re
from json import loads
import cherrypy
import htpc
import logging


class Updater:
    """ Main class """
    def __init__(self):
        """ Set GitHub settings on load """
        self.UPDATING = 0
        self.user = htpc.settings.get('git_user', 'styxit')
        self.repo = htpc.settings.get('git_repo', 'htpc-manager')
        self.branch = htpc.settings.get('git_branch', 'master')
        self.git = htpc.settings.get('git_path', 'git')
        self.logger = logging.getLogger('htpc.updater')

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def index(self):
        """ Handle server requests. Update on POST. Get status on GET. """
        if self.git == '':
            self.logger.warning('Git not configured. Automatic update disabled.')
            return -1 
        if cherrypy.request.method.upper() == 'POST':
            Thread(target=self.git_update).start()
            return 1
        else:
            return self.check_update()

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def status(self):
        return self.UPDATING

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
            self.logger.debug('Behind: ' + str(behind))
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
        self.UPDATING = 1
        cherrypy.engine.exit()
        output = self.git_exec('pull origin %s' % self.branch)
        if not output:
            self.logger.error("Unable to update through git. Make sure that Git is located in your path and can be accessed by this application.")
        elif 'Aborting.' in output:
            self.logger.error("Update aborted.")
        cherrypy.engine.start()
        self.UPDATING = 0

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

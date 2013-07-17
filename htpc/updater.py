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
        output = self.git_exec('rev-parse HEAD')
        if re.match('^[a-z0-9]+$', output):
            return output

    def latest(self):
        """ Get hash of latest git commit """
        try:
            url = 'https://api.github.com/repos/%s/%s/commits/%s' % (
                    self.user, self.repo, self.branch)
            result = loads(urllib2.urlopen(url).read())
            return result['sha'].strip()
        except:
            return None

    def behind_by(self, current, latest):
        """ Check how many commits between current and latest """
        try:
            url = 'https://api.github.com/repos/%s/%s/compare/%s...%s' % (
                    self.user, self.repo, current, latest)
            result = loads(urllib2.urlopen(url).read())
            return int(result['behind_by'])
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
            if behind == -1:
                return behind
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
        elif line.endswith('Aborting.'):
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

    def tar_update(self):
        """ Do update from tar file """
        self.logger.info("Trying update through tar-download")
        tar_file = os.path.join(htpc.RUNDIR, '%s.tar.gz' % self.repo)
        update_folder = os.path.join(htpc.RUNDIR, 'update')

        try:
            self.logger.debug("Downloading from https://github.com/%s/%s/tarball/%s"
                    % (self.user, self.repo, self.branch))
            self.logger.debug("Downloading to " + tar_file)
            url = urllib2.urlopen('https://github.com/%s/%s/tarball/%s'
                    % (self.user, self.repo, self.branch))
            file_obj = open(tar_file, 'wb')
            file_obj.write(url.read())
            file_obj.close()
        except:
            self.logger.error("Unable to fetch tar-file. Aborting and removing left overs.")
            self.remove_update_files()
            return False

        try:
            self.logger.debug("Extracting tar file to " + update_folder)
            tar = tarfile.open(tar_file)
            tar.extractall(update_folder)
            tar.close()
        except:
            self.logger.error("Unable to extract tar-file. Aborting and removing left overs.")
            self.remove_update_files()
            return False

        latest = self.latest()
        root_src_dir = os.path.join(update_folder, '%s-%s-%s'
                % (self.user, self.repo, latest[:7]))

        try:
            self.logger.debug("Replacing the old files with the updated files.")
            for src_dir, dirs, files in os.walk(root_src_dir):
                dst_dir = src_dir.replace(root_src_dir, htpc.RUNDIR)
                if not os.path.exists(dst_dir):
                    os.mkdir(dst_dir)
                for file_ in files:
                    src_file = os.path.join(src_dir, file_)
                    dst_file = os.path.join(dst_dir, file_)
                    if os.path.exists(dst_file):
                        os.remove(dst_file)
                    shutil.move(src_file, dst_dir)
        except:
            self.logger.debug("Unable to replace the old files. Aborting and removing left overs.")
            self.remove_update_files()
            return False

        self.logger.debug("Update successful. Removing left overs.")
        self.remove_update_files()
        return True

    def remove_update_files(self):
        """ Remove leftover update files """
        tar_file = os.path.join(htpc.RUNDIR, '%s.tar.gz' % self.repo)
        update_folder = os.path.join(htpc.RUNDIR, 'update')

        if os.path.exists(tar_file):
            os.remove(tar_file)

        if os.path.exists(update_folder):
            shutil.rmtree(update_folder)

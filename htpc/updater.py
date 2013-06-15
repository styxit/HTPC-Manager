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
        self.user = 'styxit'
        self.repo = 'htpc-manager'
        self.branch = 'master'
        logger = logging.getLogger('htpc.updater')

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def index(self):
        """ Handle server requests. Update on POST. Get status on GET. """
        method = cherrypy.request.method.upper()
        if method == 'POST':
            cherrypy.engine.exit()
            if self.git_update():
                status = True
            elif self.tar_update():
                status = True
            else:
                status = False
            cherrypy.server.start()
            return {'completed': status}
        else:
            behind, url = self.check_github()
            if behind == 0:
                return {'behind': behind}
            elif behind > 0:
                return {'behind': behind, 'url': url}
            return {'behind': behind, 'error': url}

    def current_commit(self):
        """ Get hash of current Git commit """
        output, err = self.run_git('rev-parse HEAD')
        output = output.strip()
        if not re.match('^[a-z0-9]+$', output):
            print err
            return None
        return output

    def latest_commit(self):
        """ Get hash of latest git commit """
        try:
            url = 'https://api.github.com/repos/%s/%s/commits/%s' % (
                    self.user, self.repo, self.branch)
            result = urllib2.urlopen(url).read()
            git = loads(result)
            return git['sha'].strip()
        except:
            return None

    def commits_behind(self, current, latest):
        """ Check how many commits between current and latest """
        try:
            url = 'https://api.github.com/repos/%s/%s/compare/%s...%s' % (
                    self.user, self.repo, current, latest)
            result = urllib2.urlopen(url).read()
            git = loads(result)
            return int(git['total_commits'])
        except:
            return -1

    def check_github(self):
        """ Check for updates """
        logger.info("Checking for updates.")
        current = self.current_commit()
        latest = self.latest_commit()
        if current == latest:
            logger.info("HTPC-Manager is Up-To-Date.")
            return (0, '')
        else:
            behind = self.commits_behind(current, latest)
            logger.info("HTPC-Manager needs an update. Currently " + str(behind) + " commits behind")
            htpc.UPDATE = (behind, 'https://github.com/%s/%s/compare/%s...%s'
                    % (self.user, self.repo, current, latest))
            return htpc.UPDATE

    def git_update(self):
        """ Do update through git """
        logger.info("Updating through git.")
        output, err = self.run_git('pull origin %s' % self.branch)

        if not output:
            logger.error("Unable to update through git. Make sure that git is located in your path and can be accessed by this application.")
            logger.error("Message received by system: " + err)
            return err            

        for line in output.split('\n'):
            if 'Already up-to-date.' in line:
                return True
            elif line.endswith('Aborting.'):
                return False

        return True

    def tar_update(self):
        """ Do update from tar file """
        logger.info("Trying update through tar-download")
        tar_file = os.path.join(htpc.RUNDIR, '%s.tar.gz' % self.repo)
        update_folder = os.path.join(htpc.RUNDIR, 'update')

        try:
            logger.debug("Downloading from https://github.com/%s/%s/tarball/%s"
                    % (self.user, self.repo, self.branch))
            logger.debug("Downloading to " + tar_file)
            url = urllib2.urlopen('https://github.com/%s/%s/tarball/%s'
                    % (self.user, self.repo, self.branch))
            file_obj = open(tar_file, 'wb')
            file_obj.write(url.read())
            file_obj.close()
        except:
            logger.error("Unable to fetch tar-file. Aborting and removing left overs.")
            self.remove_update_files()
            return False

        try:
            logger.debug("Extracting tar file to " + update_folder)
            tar = tarfile.open(tar_file)
            tar.extractall(update_folder)
            tar.close()
        except:
            logger.error("Unable to extract tar-file. Aborting and removing left overs.")
            self.remove_update_files()
            return False

        latest = self.latest_commit()
        root_src_dir = os.path.join(update_folder, '%s-%s-%s'
                % (self.user, self.repo, latest[:7]))

        try:
            logger.debug("Replacing the old files with the updated files.")
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
            logger.debug("Unable to replace the old files. Aborting and removing left overs.")
            self.remove_update_files()
            return False

        logger.debug("Update successful. Removing left overs.")
        self.remove_update_files()
        return True

    def run_git(self, args):
        """ Tool for running git program on system """
        git_locations = ['git']

        if platform.system().lower() == 'darwin':
            git_locations.append('/usr/local/git/bin/git')

        output = err = None

        for cur_git in git_locations:
            cmd = cur_git + ' ' + args

            try:
                proc = subprocess.Popen(cmd, stdout=subprocess.PIPE,
                        stderr=subprocess.STDOUT, shell=True, cwd=htpc.RUNDIR)
                output, err = proc.communicate()
            except OSError:
                continue

            # not recognized as an internal or external command
            if 'not found' in output or "not recognized" in output:
                return ('', output)
            elif 'fatal:' in output or err:
                return ('', output)
            elif output:
                break

        return (output, err)

    def remove_update_files(self):
        """ Remove leftover update files """
        tar_file = os.path.join(htpc.RUNDIR, '%s.tar.gz' % self.repo)
        update_folder = os.path.join(htpc.RUNDIR, 'update')

        if os.path.exists(tar_file):
            os.remove(tar_file)

        if os.path.exists(update_folder):
            shutil.rmtree(update_folder)

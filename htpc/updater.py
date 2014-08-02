#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Update HTPC-Manager from Github. Either through git command or tarball.

Updater and SourceUpdater written by styxit
https://github.com/styxit

Git updater written by mbw2001
https://github.com/mbw2001

Used as reference:
- https://github.com/mrkipling/maraschino
- https://github.com/midgetspy/Sick-Beard/
"""
import os
from threading import Thread
import urllib2
import subprocess
import re
from json import loads
import cherrypy
import htpc
import logging
import tarfile
import shutil

from htpc.root import do_restart

# configure git repo
gitUser =  'Hellowlol'
gitRepo = 'HTPC-Manager'
gitBranch = 'master2'

class Updater:
    """ Main class """
    def __init__(self):
        self.logger = logging.getLogger('htpc.updater')

        self.updateEngineName = 'Unknown'
        # Set update engine. Use git updater or update from source.
        self.updateEngine = self.getEngine()

    """ Determine the update method """
    def getEngine (self):
        self.logger.debug("Selecting Update engine.")
        gitDir = os.path.join(htpc.RUNDIR, '.git')
        validGitDir = os.path.isdir(gitDir)
        validGitCommand = GitUpdater().git_exec('branch') # do simple command to test git functionality

        # If valid Git dir and git command succeeded, use Git updater
        if (validGitDir and validGitCommand):
            self.logger.info('Using GitUpdater engine')
            self.updateEngineName = 'Git'
            return GitUpdater()
        else: # Otherwise update from Sourece
            self.logger.info('Using SourceUpdater engine')
            self.updateEngineName = 'Source'
            return SourceUpdater()

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def index(self):
        """ Update on POST. Check for new updates on GET. """
        if cherrypy.request.method.upper() == 'POST':
            Thread(target=self.updateEngine.update).start()
            return 1
        else:
            return self.check_update()

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def status(self):
        """ method to determine if HTPC Manager is currently updating """
        return self.updateEngine.UPDATING


    def check_update(self):
        """
        Check for updates

        Returns dict() with the following indexes:

        UpdateNeeded    True if an update is needed, False if an update is not needed OR not possible
        latestVersion   Commit hash of the most recent commit
        currentVersion  Commit hash for the version currently in use
        versionsBehind  How many versions is the current version behind the latest version
        """
        output = {'updateNeeded': True, 'latestVersion': 'Unknown', 'currentVersion': 'Unknown', 'versionsBehind': 'Unknown'}

        self.logger.info("Checking for updates from %s." % self.updateEngineName)

        # Get current and latest version
        current = self.updateEngine.current()
        latest = self.latest()

        if (latest == False) :
            self.logger.error("Failed to determine the latest version for HTPC Manager.")
        else:
            output['latestVersion'] = latest

        if (current == False) :
            self.logger.error("Failed to determine the current version for HTPC Manager.")
        else :
            output['currentVersion'] = current

        # If current or latest failed, updating is not possible
        if (current == False or latest == False) :
            self.logger.debug("Cancel update.")
            output['updateNeeded'] = False
            return output

        # If HTPC Manager is up to date, updating is not needed
        if current == latest:
            self.logger.info("HTPC-Manager is Up-To-Date.")
            output['versionsBehind'] = 0
            output['updateNeeded'] = False
        else:
            behind = self.behind_by(current, latest)
            output['versionsBehind'] = behind

        self.logger.info("Currently " + str(output['versionsBehind']) + " commits behind.")
        return output

    def latest(self):
        """ Get hash of latest commit on github """
        self.logger.debug('Getting latest version from github.')
        try:
            url = 'https://api.github.com/repos/%s/%s/commits/%s' % (gitUser, gitRepo, gitBranch)
            result = loads(urllib2.urlopen(url).read())
            latest = result['sha'].strip()
            self.logger.debug('Latest version: ' + latest)
            self.updateEngine.latestHash = latest
            return latest
        except:
            return False

    def behind_by(self, current, latest):
        """ Check how many commits between current and latest """
        self.logger.debug('Checking how far behind latest')
        try:
            url = 'https://api.github.com/repos/%s/%s/compare/%s...%s' % (gitUser, gitRepo, current, latest)
            result = loads(urllib2.urlopen(url).read())
            behind = int(result['total_commits'])
            self.logger.debug('Behind: ' + str(behind))
            return behind
        except Exception, e:
            self.logger.error(str(e))
            self.logger.error('Could not determine how far behind')
            return 'Unknown'


""" Class to update HTPC Manager using git commands. """
class GitUpdater():
    """ Main class """
    def __init__(self):
        """ Set GitHub settings on load """
        self.UPDATING = 0

        self.git = htpc.settings.get('git_path', 'git')
        self.logger = logging.getLogger('htpc.updater')

    def current(self):
        """ Get hash of current Git commit """
        self.logger.debug('Getting current version.')
        output = self.git_exec('rev-parse HEAD')
        self.logger.debug('Current version: ' + output)

        if (output == '') :
            self.logger.error('Got no response for current Git version.')
            return False

        if re.match('^[a-z0-9]+$', output):
            return output


    def update(self):
        """ Do update through git """
        self.logger.info("Attempting update through Git.")
        self.UPDATING = 1

        output = self.git_exec('pull origin %s' % gitBranch)
        if not output:
            self.logger.error("Unable to update through git. Make sure that Git is located in your path and can be accessed by this application.")
        elif 'Aborting.' in output:
            self.logger.error("Update aborted.")
        else:
            # Restart HTPC Manager to make sure all new code is loaded
            self.logger.warning('Restarting HTPC Manager after update.')
            do_restart()

        self.UPDATING = 0


    def git_exec(self, args):
        """ Tool for running git program on system """
        try:
            proc = subprocess.Popen(self.git + " " + args, stdout=subprocess.PIPE,
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


""" Class to update HTPC Manager using Source code from Github. Requires a full download on every update."""
class SourceUpdater():

    """ Main class """
    def __init__(self):
        self.UPDATING = 0

        self.currentHash = False
        self.latestHash = False

        self.logger = logging.getLogger('htpc.updater')

        self.versionFile = os.path.join(htpc.RUNDIR, 'VERSION.txt')
        self.updateFile = os.path.join(htpc.DATADIR, 'htpc-manager-update.tar.gz')
        self.updateDir = os.path.join(htpc.DATADIR, 'update-source')

    """ Get hash of current runnig version """
    def current(self):
        self.logger.debug('Getting current version.')

        """ Check if version file exists """
        if not os.path.isfile(self.versionFile):
            self.logger.warning('Version file does not exists. Creating it now.')
            try:
                versionFileHandler = open(self.versionFile, 'w')
                versionFileHandler.close()
                return 'Unknown'
            except:
                # If version file can not be created updating is also not possible
                self.logger.error('Could not create version file.')
                return False

        """ Get version from version file """
        fp = open(self.versionFile, 'r')
        currentVersion = fp.read().strip(' \n\r')
        fp.close()

        self.logger.debug('Current version: ' + currentVersion)

        if (currentVersion == '') :
            self.logger.error('No commit hash found in version file.')
            return True

        if re.match('^[a-z0-9]+$', currentVersion):
            self.currentHash = currentVersion
            return currentVersion


    """ Do update from source """
    def update(self):
        self.logger.info("Attempting update from source.")

        self.UPDATING = 1
        cherrypy.engine.exit()

        tarUrl = 'https://github.com/%s/%s/tarball/%s' % (gitUser, gitRepo, gitBranch)

        # Download tar
        downloaded = self.__downloadTar(tarUrl, self.updateFile)
        if (downloaded is False):
            return False

        # Extract to temp folder
        extracted = self.__extractUpdate(self.updateFile, self.updateDir)
        if (extracted is False):
            return False

        # Overwite app source with source from extracted file
        overwritten = self.__updateSourcecode()
        if (overwritten is False):
            return False

        # Write new version to file
        self.__updateVersionFile(self.latestHash)

        # Restart HTPC Manager to make sure all new code is loaded
        self.logger.warning('Restarting HTPC Manager after update.')
        do_restart()

        # Cleanup after yourself
        self.__finishUpdate()

    """ Download source """
    def __downloadTar(self, url, destination):
        # Download tar
        self.logger.info('Downloading update from %s' % url)
        try:
            self.logger.debug('Downloading update file to %s' % destination)
            downloadedFile = urllib2.urlopen(url)
            f = open(destination,'wb')
            f.write(downloadedFile.read())
            f.close()
            self.logger.info('Downloading update complete')
            return True
        except:
            self.logger.warning('Failed to download update file')
            self.__finishUpdate()
            return False

    """ Extract files from downloaded tar file """
    def __extractUpdate(self, filePath, destinationFolder):
        try:
            self.logger.debug('Extracting tar file: %s' % filePath)
            tarArchive = tarfile.open(filePath)
            tarArchive.extractall(destinationFolder)
            tarArchive.close()
            return True
        except:
            self.logger.error('Failed extracting update file.')
            self.__finishUpdate()
            return False

    """ Overwrite HTPC Manager sourcecode with (new) code from update path """
    def __updateSourcecode(self):
        # Determine the path where the updated should be located
        sourceUpdateFolder = os.path.join(self.updateDir, '%s-%s-%s' % (gitUser, gitRepo, self.latestHash[:7]))

        # Where to extract the update
        targetFolder = os.path.join(htpc.RUNDIR)

        self.logger.debug('Overwriting files.')
        try:
            # Loop files and folders and place them in the HTPC Manager path
            for src_dir, dirs, files in os.walk(sourceUpdateFolder):
                dst_dir = src_dir.replace(sourceUpdateFolder, targetFolder)
                if not os.path.exists(dst_dir):
                    os.mkdir(dst_dir)
                for file_ in files:
                    src_file = os.path.join(src_dir, file_)
                    dst_file = os.path.join(dst_dir, file_)
                    if os.path.exists(dst_file):
                        os.remove(dst_file)
                    shutil.move(src_file, dst_dir)
        except:
            self.logger.warning('Failed to overwrite old files')
            self.__finishUpdate()
            return False

        self.logger.info('updating files successfull')
        return True

    """
    Write the latest commit hash to th version file.

    Used when checking for update the next time.
    """
    def __updateVersionFile(self, newVersion):
        versionFileHandler = open(self.versionFile, 'wb')
        versionFileHandler.write(newVersion)
        versionFileHandler.close()

    """ Remove leftover files after the update """
    def __finishUpdate(self):
        self.UPDATING = 0

        if os.path.isfile(self.updateFile):
            self.logger.debug('Removing update archive')
            try:
                os.remove(self.updateFile)
            except:
                pass

        if os.path.isdir(self.updateDir):
            self.logger.debug('Removing update code folder')
            try:
                shutil.rmtree(self.updateDir)
            except:
                pass


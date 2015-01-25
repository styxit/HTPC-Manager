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
import platform

from htpc.root import do_restart

# configure git repo
gitUser = 'Hellowlol'
gitRepo = 'HTPC-Manager'


class Updater:
    """ Main class """
    def __init__(self):
        self.logger = logging.getLogger('htpc.updater')
        self.updateEngineName = 'Unknown'
        # Set update engine. Use git updater or update from source.
        self.updateEngine = self.getEngine()
        self.check_update()

    """ Determine the update method """
    def getEngine(self):
        self.logger.debug("Selecting Update engine.")
        gitDir = os.path.normcase(os.path.join(htpc.RUNDIR, '.git'))
        validGitDir = os.path.isdir(gitDir)

        # If valid Git dir and git command succeeded, use Git updater
        if validGitDir and self.test_git():
            self.logger.info('Using GitUpdater engine')
            self.updateEngineName = 'Git'
            return GitUpdater()
        else:  # Otherwise update from Sourece
            self.logger.info('Using SourceUpdater engine')
            self.updateEngineName = 'Source'
            return SourceUpdater()

    def test_git(self):
        self.logger.debug("Checking if git is installed")
        gp = htpc.settings.get('git_path', 'git')
        alternative_gp = []

        # osx people who start htpc-mamanger from launchd have a broken path, so try a hail-mary attempt for them
        if platform.system().lower() == 'darwin':
            alternative_gp.append('/usr/local/git/bin/git')
        if platform.system().lower() == 'windows':
            if gp != gp.lower():
                alternative_gp.append(gp.lower())
            # Disbled this so it uses source updater while testing.
            #alternative_gp += ["%USERPROFILE%\AppData\Local\GitHub\PORTAB~1\bin\git.exe", "c:\Program Files (x86)\Git\bin\git.exe"]

        # Returns a empty string if failed
        output = GitUpdater().git_exec(gp, 'version')

        if output:
            # Found a working git path.
            self.logger.debug("Found git path %s" % gp)
            htpc.settings.set('git_path', gp)
            return True

        if alternative_gp:
            self.logger.debug("Checking for alternate git location")
            for current_gp in alternative_gp:
                self.logger.debug("Testing git path %s" % current_gp)
                output = GitUpdater().git_exec(current_gp, 'version')
                if output:
                    self.logger.debug("Found git path %s and it works!" % current_gp)
                    self.logger.debug("Saving git path %s to settings" % current_gp)
                    htpc.settings.set('git_path', current_gp)
                    return True

        return False

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def index(self, force=False):
        """ Update on POST. Check for new updates on GET. """
        if cherrypy.request.method.upper() == 'POST':
            Thread(target=self.updateEngine.update).start()
            return 1
        if cherrypy.request.method.upper() == 'POST' and force:
            self.check_update()
            Thread(target=self.updateEngine.update).start()
            return 1
        else:
            return self.check_update()

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def updatenow(self):
        Thread(target=self.updateEngine.update).start()

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
        htpc.CURRENT_HASH = current
        latest = self.updateEngine.latest()
        htpc.LATEST_HASH = latest

        if not latest:
            self.logger.error("Failed to determine the latest version for HTPC Manager.")
        else:
            output['latestVersion'] = latest

        if not current:
            self.logger.error("Failed to determine the current version for HTPC Manager.")
        else:
            output['currentVersion'] = current

        # If current or latest failed, updating is not possible
        if not current or not latest:
            self.logger.debug("Cancel update.")
            output['updateNeeded'] = False
            return output

        # If HTPC Manager is up to date, updating is not needed
        if current == latest:
            self.logger.info("HTPC-Manager is Up-To-Date.")
            output['versionsBehind'] = 0
            htpc.COMMITS_BEHIND = 0
            output['updateNeeded'] = False
        else:
            behind = self.behind_by(current, latest)
            htpc.COMMITS_BEHIND = behind
            output['versionsBehind'] = behind

        self.logger.info("Currently " + str(output['versionsBehind']) + " commits behind.")
        return output

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

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def branches(self):
        return self.updateEngine.branches()

    def update_needed(self):
        r = self.check_update()
        if r["updateNeeded"]:
            return True
        else:
            return False


class GitUpdater():
    """ Class to update HTPC Manager using git commands. """
    def __init__(self):
        """ Set GitHub settings on load """
        self.UPDATING = 0

        self.git = htpc.settings.get('git_path', 'git')
        self.logger = logging.getLogger('htpc.updater')
        #self.update_remote_origin() # Disable this since it a fork for now.

    def update_remote_origin(self):
        self.git_exec(self.git, 'config remote.origin.url https://github.com/Hellowlol/HTPC-Manager.git')

    def current_branch_name(self):
        output = self.git_exec(self.git, 'rev-parse --abbrev-ref HEAD')
        if output:
            return output
        else:
            return htpc.settings.get('branch', 'master2')

    def latest(self):
        """ Get hash of latest commit on github """
        self.logger.debug('Getting latest version from github.')
        try:
            url = 'https://api.github.com/repos/%s/%s/commits/%s' % (gitUser, gitRepo, self.current_branch_name())
            result = loads(urllib2.urlopen(url).read())
            latest = result['sha'].strip()
            self.logger.debug('Branch: %s' % self.current_branch_name())
            self.logger.debug('Latest sha: %s' % latest)
            self.latestHash = latest
            return latest
        except Exception as e:
            self.logger.error("Failed to get last commit from github")
            return False

    def current(self):
        """ Get hash of current Git commit """
        self.logger.debug('Getting current version.')
        output = self.git_exec(self.git, 'rev-parse HEAD')
        self.logger.debug('Current version: ' + output)

        if not output:
            self.logger.error('Couldnt determine installed branch.')
            return False

        if re.match('^[a-z0-9]+$', output):
            return output

    def branches(self):
        cbn = self.current_branch_name()

        d = {
            "branch": cbn,
            "branches": []
        }

        if self.current is not False:
            d["verified"] = True
        else:
            # If its false, default to master branch
            d["branch"] = htpc.settings.get('branch', 'master2')

        branches = self.git_exec(self.git, 'ls-remote --heads https://github.com/Hellowlol/HTPC-Manager.git')
        if branches:
            # find all branches except the current branch.
            d["branches"] = [b for b in re.findall('\S+\Wrefs/heads/(.*)', branches) if b != cbn]
            return d
        return [d]

    def update(self):
        """ Do update through git """
        self.logger.info("Attempting update through Git.")
        self.UPDATING = 1

        if htpc.settings.get('branch', 'master2') == self.current_branch_name():
            output = self.git_exec(self.git, 'pull origin %s' % htpc.settings.get('branch', 'master2'))
        else:
            output = self.git_exec(self.git, 'checkout -f ' + htpc.settings.get('branch', 'master2'))
        if not output:
            self.logger.error("Unable to update through git. Make sure that Git is located in your path and can be accessed by this application.")
        elif 'Aborting.' in output:
            self.logger.error("Update aborted.")
        else:
            if htpc.settings.get('git_cleanup') and not htpc.DEBUG:
                self.logger.debug("Clean up after git")
                self.git_exec(self.git, 'reset --hard')
                # Note to self rtfm before you run git commands, just wiped the data dir...
                # This command removes all untracked files and files and the files in .gitignore
                # except from the content of htpc.DATADIR and VERSION.txt
                self.git_exec(self.git, 'clean -d -fx -e %s -e VERSION.txt' % htpc.DATADIR)
            self.logger.warning('Restarting HTPC Manager after update.')
            # Restart HTPC Manager to make sure all new code is loaded
            do_restart()

        self.UPDATING = 0

    def git_exec(self, gp, args):
        """ Tool for running git program on system """
        try:
            proc = subprocess.Popen(gp + " " + args, stdout=subprocess.PIPE,
                        stderr=subprocess.STDOUT, shell=True, cwd=htpc.RUNDIR)
            output, err = proc.communicate()

            self.logger.debug("Running %s %s" % (gp, args))
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


class SourceUpdater():
    """ Class to update HTPC Manager using Source code from Github. Requires a full download on every update."""
    def __init__(self):
        self.UPDATING = 0

        self.currentHash = False
        self.verified = False

        self.logger = logging.getLogger('htpc.updater')

        self.versionFile = os.path.join(htpc.RUNDIR, 'VERSION.txt')
        self.updateFile = os.path.join(htpc.DATADIR, 'htpc-manager-update.tar.gz')
        self.updateDir = os.path.join(htpc.DATADIR, 'update-source')


    def current(self):
        """ Get hash of current runnig version """
        self.logger.debug('Getting current version.')

        # Check if version file exists
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

        if not currentVersion:
            self.logger.error('No commit hash found in version file.')
            return True

        if re.match('^[a-z0-9]+$', currentVersion):
            self.currentHash = currentVersion
            return currentVersion

    def latest(self):
        """ Get hash of latest commit on github """
        self.logger.debug('Getting latest version from github.')
        try:
            url = 'https://api.github.com/repos/%s/%s/commits/%s' % (gitUser, gitRepo, htpc.settings.get('branch', 'master2'))
            result = loads(urllib2.urlopen(url).read())
            latest = result['sha'].strip()
            self.logger.debug('Latest version: ' + latest)
            self.latestHash = latest
            return latest
        except:
            return False

    def current_branch_name(self):
        """  Tries to find the current branches by reading version file
             and matching that against all branches on github """

        versionfile = self.current()
        #current_branch = htpc.settings.get('branch', 'master2')
        current_branch = htpc.settings.get('branch', 'Unknown')
        # should return sha on success not True False
        if not isinstance(self.current(), bool):
            try:
                url = "https://api.github.com/repos/%s/%s/branches?per_page=100" % (gitUser, gitRepo)
                branches = loads(urllib2.urlopen(url).read())
                for branch in branches:
                    if branch["commit"]["sha"] == versionfile:
                        current_branch = branch["name"]
                        self.verified = True
            except:
                self.logger.debug("Couldnt figure out what branch your using, using %s" % htpc.settings.get('branch', 'master2'))
        return current_branch

    def branches(self):
        """ Returns the all the branches to gitUser and current branch """
        cbn = self.current_branch_name()
        d = {
            "branch": cbn,
            "branches": []
        }

        if self.verified:
            d["verified"] = True

        try:
            url = "https://api.github.com/repos/%s/%s/branches?per_page=100" % (gitUser, gitRepo)
            branchlist = []
            branches = loads(urllib2.urlopen(url).read())
            for branch in branches:
                branchlist.append(branch["name"])
            d["branches"] = [b for b in branchlist if b != cbn]
            return d

        except Exception, e:
            self.logger.error(str(e))
            self.logger.error('Could not find any branches, setting default master2')
            return [d]

    """ Do update from source """
    def update(self):
        self.logger.info("Attempting update from source.")

        self.UPDATING = 1
        cherrypy.engine.exit()

        tarUrl = 'https://github.com/%s/%s/tarball/%s' % (gitUser, gitRepo, htpc.settings.get('branch', 'master2'))

        # Download tar
        downloaded = self.__downloadTar(tarUrl, self.updateFile)
        if downloaded is False:
            return False

        # Extract to temp folder
        extracted = self.__extractUpdate(self.updateFile, self.updateDir)
        if extracted is False:
            return False

        # Overwite app source with source from extracted file
        overwritten = self.__updateSourcecode()
        if overwritten is False:
            return False

        # Write new version to file
        # Just call it directly in case forced update.
        self.__updateVersionFile(self.latest())

        # Cleanup after yourself
        self.__finishUpdate()

        # Restart HTPC Manager to make sure all new code is loaded
        self.logger.warning('Restarting HTPC Manager after update.')
        do_restart()

    def __downloadTar(self, url, destination):
        """ Download source """
        self.logger.info('Downloading update from %s' % url)
        try:
            self.logger.debug('Downloading update file to %s' % destination)
            downloadedFile = urllib2.urlopen(url)
            f = open(destination, 'wb')
            f.write(downloadedFile.read())
            f.close()
            self.logger.info('Downloading update complete')
            return True
        except:
            self.logger.warning('Failed to download update file')
            self.__finishUpdate()
            return False

    def __extractUpdate(self, filePath, destinationFolder):
        """ Extract files from downloaded tar file """
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
        # Find the extracted dir
        sourceUpdateFolder = [x for x in os.listdir(self.updateDir) if
                                   os.path.isdir(os.path.join(self.updateDir, x))]

        if len(sourceUpdateFolder) != 1:
            # There can only be one folder in sourceUpdateFolder
            self.logger.error("Invalid update data, update failed %s" % sourceUpdateFolder)

        # Where to extract the update
        targetFolder = os.path.join(htpc.RUNDIR)
        # Full path to the extracted dir
        contentdir = os.path.join(self.updateDir, sourceUpdateFolder[0])

        self.logger.debug('Overwriting files.')

        try:
            # Loop files and folders and place them in the HTPC Manager path
            for src_dir, dirs, files in os.walk(contentdir):
                dst_dir = src_dir.replace(contentdir, targetFolder)
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

        self.logger.info('Updating files successfull')
        return True

    def __updateVersionFile(self, newVersion):
        """
        Write the latest commit hash to the version file.

        Used when checking for update the next time.
        """
        versionFileHandler = open(self.versionFile, 'wb')
        versionFileHandler.write(newVersion)
        versionFileHandler.close()

    def __finishUpdate(self):
        """ Remove leftover files after the update """
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

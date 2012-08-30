# Original code by Mikie (https://github.com/Mikie-Ghost/)
import os, urllib2, tarfile, shutil
import platform, subprocess, re
from json import loads
import cherrypy, htpc

class Updater:
    def __init__(self):
        self.user = 'mbw2001'
        self.repo = 'htpc-manager'
        self.branch = 'master'

    @cherrypy.expose()
    @cherrypy.tools.json_out()
    def index(self):
        method = cherrypy.request.method.upper()
        if method == 'POST':
            cherrypy.engine.exit()
            if self.gitUpdate():
                status = True
            elif self.tarUpdate():
                status = True
            else:
                status = False
            cherrypy.server.start()
            return {'completed':status}
        else:
            behind, url = self.checkGithub()
            if behind == 0:
                return {'behind':behind}
            elif behind > 0:
                return {'behind':behind, 'url':url}
            return {'behind':behind, 'error':url}

    def currentCommit(self):
        output, err = self.runGit('rev-parse HEAD')
        output = output.strip()
        if not re.match('^[a-z0-9]+$', output):
            return None
        return output

    def latestCommit(self):
        try:
            url = 'https://api.github.com/repos/%s/%s/commits/%s' % (self.user, self.repo, self.branch)
            result = urllib2.urlopen(url).read()
            git = loads(result)
            return git['sha'].strip()
        except:
            return None

    def commitsBehind(self, current, latest):
        try:
            url = 'https://api.github.com/repos/%s/%s/compare/%s...%s' % (self.user, self.repo, current, latest)
            result = urllib2.urlopen(url).read()
            git = loads(result)
            return int(git['total_commits'])
        except:
            return -1

    def checkGithub(self):
        current = self.currentCommit()
        latest = self.latestCommit()
        if current == latest:
            return (0, '')
        else:
            behind = self.commitsBehind(current, latest)
            htpc.update = (behind, 'https://github.com/%s/%s/compare/%s...%s' % (self.user, self.repo, current, latest))
            return htpc.update

    def gitUpdate(self):
        output, err = self.runGit('pull origin %s' % branch)

        if not output:
            return err

        for line in output.split('\n'):
            if 'Already up-to-date.' in line:
                return True
            elif line.endswith('Aborting.'):
                return False

        return True

    def tarUpdate(self):
        tar_file = os.path.join(htpc.rundir, '%s.tar.gz' % self.repo)
        update_folder = os.path.join(htpc.rundir, 'update')

        try:
            url = urllib2.urlopen('https://github.com/%s/%s/tarball/%s' % (self.user, self.repo, self.branch))
            f = open(tar_file,'wb')
            f.write(url.read())
            f.close()
        except:
            self.removeUpdateFiles()
            return False

        try:
            tar = tarfile.open(tar_file)
            tar.extractall(update_folder)
            tar.close()
        except:
            self.removeUpdateFiles()
            return False

        latest = self.latestCommit()
        root_src_dir = os.path.join(update_folder, '%s-%s-%s' % (self.user, self.repo, latest[:7]))

        try:
            for src_dir, dirs, files in os.walk(root_src_dir):
                dst_dir = src_dir.replace(root_src_dir, htpc.rundir)
                if not os.path.exists(dst_dir):
                    os.mkdir(dst_dir)
                for file_ in files:
                    src_file = os.path.join(src_dir, file_)
                    dst_file = os.path.join(dst_dir, file_)
                    if os.path.exists(dst_file):
                        os.remove(dst_file)
                    shutil.move(src_file, dst_dir)
        except:
            self.removeUpdateFiles()
            return False

        self.removeUpdateFiles()
        return True

    def runGit(self, args):
        git_locations = ['git']

        if platform.system().lower() == 'darwin':
            git_locations.append('/usr/local/git/bin/git')

        output = err = None

        for cur_git in git_locations:
            cmd = cur_git + ' ' + args

            try:
                p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, shell=True, cwd=htpc.rundir)
                output, err = p.communicate()
            except OSError:
                continue

            if 'not found' in output or "not recognized as an internal or external command" in output:
                return ('', output)
            elif 'fatal:' in output or err:
                return ('', output)
            elif output:
                break

        return (output, err)

    def removeUpdateFiles(self):
        tar_file = os.path.join(htpc.rundir, '%s.tar.gz' % self.repo)
        update_folder = os.path.join(htpc.rundir, 'update')

        if os.path.exists(tar_file):
            os.remove(tar_file)

        if os.path.exists(update_folder):
            shutil.rmtree(update_folder)

htpc.root.update = Updater()

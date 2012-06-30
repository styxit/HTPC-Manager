# Original code by Mikie (https://github.com/Mikie-Ghost/)
import os, urllib2, tarfile, os, shutil, platform, subprocess, re, json

# Fake push 

user = 'mbw2001'
repo = 'htpc-manager'
branch = 'master'
rundir = os.getcwd()

def currentCommit():
    output, err = runGit('rev-parse HEAD')
    output = output.strip()
    if not re.match('^[a-z0-9]+$', output):
        return err
    return output

def latestCommit():
    try:
        url = 'https://api.github.com/repos/%s/%s/commits/%s' % (user, repo, branch)
        result = urllib2.urlopen(url).read()
        git = json.loads(result)
        return git['sha'].strip()
    except:
        return None

def commitsBehind(current, latest):
    if not current or not latest:
        return -1
    try:
        url = 'https://api.github.com/repos/%s/%s/compare/%s...%s' % (user, repo, current, latest)
        result = urllib2.urlopen(url).read()
        git = json.loads(result)
        return int(git['total_commits'])
    except:
        return -1

def checkGithub():
    current = currentCommit()
    latest = latestCommit()
    behind = commitsBehind(current, latest)

    if behind == 0:
        return (behind, '')
    elif behind > 0:
        return (behind, 'https://github.com/%s/%s/compare/%s...%s' % (user, repo, current, latest))

    return (behind, 'Invalid versions. Current: %s, Latest: %s' % (current, latest))

def update():
    if gitUpdate():
        return True
    elif tarUpdate():
        return True

    return False

def runGit(args):
    git_locations = ['git']

    if platform.system().lower() == 'darwin':
        git_locations.append('/usr/local/git/bin/git')

    output = err = None

    for cur_git in git_locations:
        cmd = cur_git + ' ' + args

        try:
            p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, shell=True, cwd=rundir)
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

def gitUpdate():
    output, err = runGit('pull origin %s' % branch)

    if not output:
        return False

    for line in output.split('\n'):
        if 'Already up-to-date.' in line:
            return True
        elif line.endswith('Aborting.'):
            return False

    return True

def tarUpdate():
    tar_file = os.path.join(rundir, '%s.tar.gz' % repo)
    update_folder = os.path.join(rundir, 'update')

    try:
        url = urllib2.urlopen('https://github.com/%s/%s/tarball/%s' % (user, repo, branch))
        f = open(tar_file,'wb')
        f.write(url.read())
        f.close()
    except:
        RemoveUpdateFiles()
        return False

    try:
        tar = tarfile.open(tar_file)
        tar.extractall(update_folder)
        tar.close()
    except:
        print('Failed to extract update file', 'WARNING')
        RemoveUpdateFiles()
        return False

    latest = latestCommit()
    root_src_dir = os.path.join(update_folder, '%s-%s-%s' % (user, repo, latest[:7]))

    try:
        for src_dir, dirs, files in os.walk(root_src_dir):
            dst_dir = src_dir.replace(root_src_dir, RUNDIR)
            if not os.path.exists(dst_dir):
                os.mkdir(dst_dir)
            for file_ in files:
                src_file = os.path.join(src_dir, file_)
                dst_file = os.path.join(dst_dir, file_)
                if os.path.exists(dst_file):
                    os.remove(dst_file)
                shutil.move(src_file, dst_dir)
    except:
        RemoveUpdateFiles()
        return False

    RemoveUpdateFiles()
    return True

def RemoveUpdateFiles():
    tar_file = os.path.join(rundir,'%s.tar.gz' % repo)
    update_folder = os.path.join(rundir, 'update')

    if os.path.exists(tar_file):
        os.remove(tar_file)

    if os.path.exists(update_folder):
        shutil.rmtree(update_folder)
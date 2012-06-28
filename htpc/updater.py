# Original code by Mikie (https://github.com/Mikie-Ghost/)
import os, urllib2, tarfile, os, shutil, platform, subprocess, re, json

RUNDIR = os.getcwd()
user = 'mbw2001'
repo = 'htpc-manager'
branch = 'master'

def currentCommit():
    output, err = runGit('rev-parse HEAD')

    if not output:
        print('UPDATER :: Couldn\'t find latest installed version with git', 'WARNING')
        return None

    if not re.match('^[a-z0-9]+$', output.strip()):
        print('UPDATER :: Git output doesn\'t look like a hash, not using it', 'WARNING')
        return None

    return output

def latestCommit():
    url = 'https://api.github.com/repos/%s/%s/commits/%s' % (user, repo, branch)
    result = urllib2.urlopen(url).read()
    git = json.loads(result)
    return git['sha']

def commitsBehind(current, latest):
    url = 'https://api.github.com/repos/%s/%s/compare/%s...%s' % (user, repo, current, latest)
    result = urllib2.urlopen(url).read()
    git = json.loads(result)
    return git['total_commits']

def checkGithub():
    print('UPDATER :: Checking for updates', 'INFO')

    try:
        current = currentCommit()
    except:
        print('UPDATER :: Could not get current commit from github', 'WARNING')

    try:
        latest = latestCommit()
    except:
        print('UPDATER :: Could not get latest commit from github', 'WARNING')

    try:
        behind = commitsBehind(latest, current)
    except:
        print('UPDATER :: Could not get commits behind from github', 'WARNING')

    commits_compare_url = ''
    if behind == 0:
        print('UPDATER :: Up to date', 'INFO')
    elif behind >= 1:
        print('UPDATER :: Update available, you are %i commits behind' % behind, 'INFO')
        commits_compare_url = 'https://github.com/%s/%s/compare/%s...%s' % (user, repo, current, latest)
    elif behind == -1:
        print('UPDATER :: Uknown version. Please run the updater', 'INFO')

    return (behind, commits_compare_url)

def update():
    if gitUpdate():
        return True
    else:
        print('Git update failed, attempting tarball update', 'INFO')

    tar_file = os.path.join(RUNDIR, '%s.tar.gz' % repo)
    update_folder = os.path.join(RUNDIR, 'update')

    # Download repo
    try:
        print('UPDATER :: Downloading update file to %s' % tar_file, 'DEBUG')
        url = urllib2.urlopen('https://github.com/%s/%s/tarball/%s' % (user, repo, branch))
        f = open(tar_file,'wb')
        f.write(url.read())
        f.close()
    except:
        print('UPDATER :: Failed to download update file', 'WARNING')
        RemoveUpdateFiles()
        return False

    # Extract to temp folder
    try:
        print('UPDATER :: Extracting %s' % tar_file, 'DEBUG')
        tar = tarfile.open(tar_file)
        #tar.extractall(update_folder)
        tar.close()
    except:
        print('Failed to extract update file', 'WARNING')
        RemoveUpdateFiles()
        return False

    # Overwrite old files with new ones
    latest = latestCommit()
    root_src_dir = os.path.join(update_folder, '%s-%s-%s' % (user, repo, latest[:7]))

    try:
        print('UPDATER :: Overwriting old files', 'DEBUG')
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
        print('UPDATER :: Failed to overwrite old files', 'WARNING')
        RemoveUpdateFiles()
        return False

    # Clean up
    RemoveUpdateFiles()

    return True

def runGit(args):
    git_locations = ['git']

    if platform.system().lower() == 'darwin':
        git_locations.append('/usr/local/git/bin/git')

    output = err = None

    for cur_git in git_locations:
        cmd = cur_git + ' ' + args

        try:
            print('UPDATER :: Trying to execute: "' + cmd + '" with shell in ' + RUNDIR, 'DEBUG')
            p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, shell=True, cwd=RUNDIR)
            output, err = p.communicate()
            print('UPDATER :: Git output: ' + output, 'DEBUG')
        except OSError:
            print('UPDATER :: Command ' + cmd + ' didn\'t work, couldn\'t find git', 'WARNING')
            continue

        if 'not found' in output or "not recognized as an internal or external command" in output:
            print('UPDATER :: Unable to find git with command ' + cmd, 'WARNING')
            output = None
        elif 'fatal:' in output or err:
            print('UPDATER :: Git returned bad info. Are you sure this is a git installation?', 'WARNING')
            output = None
        elif output:
            break

    return (output, err)

def gitUpdate():
    return False
    output, err = runGit('pull origin %s' % branch)

    if not output:
        print('Couldn\'t download latest version', 'ERROR')
        return False

    for line in output.split('\n'):
        if 'Already up-to-date.' in line:
            print('UPDATER :: Already up to date', 'INFO')
            print('UPDATER :: Git output: ' + str(output), 'DEBUG')
            return True
        elif line.endswith('Aborting.'):
            print('UPDATER :: Unable to update from git: '+line, 'ERROR')
            print('UPDATER :: Output: ' + str(output), 'DEBUG')
            maraschino.USE_GIT = False
            return False

    return True

def RemoveUpdateFiles():
    print('UPDATER :: Removing update files', 'INFO')
    tar_file = os.path.join(RUNDIR,'%s.tar.gz' % repo)
    update_folder = os.path.join(RUNDIR, 'update')

    try:
        if os.path.exists(tar_file):
            print('UPDATER :: Removing %s' % tar_file, 'DEBUG')
            os.remove(tar_file)
    except:
        print('UPDATER :: Could not remove %s' % tar_file, 'WARNING')

    try:
        if os.path.exists(update_folder):
            print('UPDATER :: Removing %s' % update_folder, 'DEBUG')
            shutil.rmtree(update_folder)
    except:
        print('UPDATER :: Could not remove %s' % update_folder, 'WARNING')

    return
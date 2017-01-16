#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import platform
import hashlib
import htpc
import imghdr
import logging
from cherrypy.lib.static import serve_file
from urllib2 import Request, urlopen
import urllib
import time
from functools import wraps
from operator import itemgetter
import itertools
from mako import exceptions
from mako.lookup import TemplateLookup
import requests
import workerpool


try:
    import Image
    PIL = True
except ImportError:
    try:
        from PIL import Image
        PIL = True
    except ImportError:
        PIL = False

logger = logging.getLogger('htpc.helpers')


def timeit_func(func):
    @wraps(func)
    def inner(*args, **kwargs):
        start = time.time()
        res = func(*args)
        logger.debug('%s took %s' % (func.__name__, time.time() - start))
        return res
    return inner

comp_table = {
    '==': lambda x, y: x == y,
    '!=': lambda x, y: x != y,
    '>': lambda x, y: x > y,
    '<': lambda x, y: x < y,
    '>=': lambda x, y: x >= y,
    '<=': lambda x, y: x <= y,
}


def get_image(url, height=None, width=None, opacity=100, mode=None, auth=None, headers=None, missing_image=None):
    ''' Load image form cache if possible, else download. Resize if needed '''
    opacity = float(opacity)
    logger = logging.getLogger('htpc.helpers')

    # Create image directory if it doesnt exist
    imgdir = os.path.join(htpc.DATADIR, 'images/')
    if not os.path.exists(imgdir):
        logger.debug('Creating image directory at ' + imgdir)
        os.makedirs(imgdir)

    # Create a hash of the path to use as filename
    imghash = hashlib.md5(url).hexdigest()

    # Set filename and path
    image = os.path.join(imgdir, imghash)

    # If there is no local copy of the original
    # download it
    if not os.path.isfile(image):
        logger.debug('No local image found for %s. Downloading..' % url)
        image = download_image(url, image, auth, headers)

    # Check if resize is needed
    if (height and width) or (opacity < 100) or mode:

        if PIL:
            # Set a filename for resized file
            resized = '%s_w%s_h%s_o_%s_%s' % (image, width, height, opacity, mode)

            # If there is no local resized copy
            if not os.path.isfile(resized):
                # try to resize, if we cant return original image
                image = resize_image(image, height, width, opacity, mode, resized)
                if image:
                    return serve_file(path=image, content_type='image/jpeg')

            # If the resized image is already cached
            if os.path.isfile(resized):
                image = resized

        else:
            logger.error("Can't resize when PIL is missing on system!")
            if (opacity < 100):
                image = os.path.join(htpc.RUNDIR, 'interfaces/default/img/fff_20.png')

    # Load file from disk
    if image is not None:
        imagetype = imghdr.what(os.path.abspath(image))
        if imagetype is None:
            imagetype = 'image/jpeg'
        return serve_file(path=image, content_type=imagetype)
    if missing_image:
        # full fp to missing image
        return serve_file(path=missing_image, content_type='image/jpeg')


class CacheImgDownload(workerpool.Job):
    "Job for downloading a given URL."
    def __init__(self, item, headers):
        self.url = item['url']
        self.fp = item['fp']
        self.resize = item['resize']
        self.headers = headers
        self.item = item

    def run(self):
        try:
            if self.resize:
                for i in self.resize:
                    if len(i) > 3:
                        r = requests.get(i[2], headers=self.headers)
                        with open(i[3], 'wb') as local_file:
                            local_file.write(r.content)
                # Download original image
                r = requests.get(self.url, headers=self.headers)
                with open(self.fp, 'wb') as local_file:
                    local_file.write(r.content)

        except Exception as e:
            self.logger.debug('Failed to cache image %s' % e)


def cache_resize_image(item):
    #imglist = [{'hash': '123', 'url': 'xxx', 'fp': 'filepath', 'resize': [(w, h), (w, h)]}]
    fp = item['fp']
    imagetype = imghdr.what(fp)
    if imagetype:
        # Open orginal image
        im = Image.open(fp)
        if 'resize' in item:
            for r in item['resize']:
                im = im.resize(r, Image.ANTIALIAS)
                resized = '%s_w%s_h%s_o_%s_%s' % (fp, r[0], r[1], None, None)

                if imagetype.lower() == 'jpeg' or 'jpg':
                    im.save(resized, 'JPEG', quality=95)
                else:
                    im.save(resized, imagetype)


@timeit_func
def cachedprime(urls, headers=None, resize=False, plex_resize=False):
    """
    {'hash': '1dad1d1', fp': 'filepath', 'url': 'imgurl', 'resize': [[w, h, url, dest]}
    """

    if headers is None:
        headers = {}

    logger.debug('Got %s images' % len(urls))
    urls = remove_dict_dupe_from_list(urls, 'hash')
    logger.debug('Removed all dupicate images got %s left' % len(urls))

    imgdir = os.path.join(htpc.DATADIR, 'images/')
    made_dir = False
    if not os.path.exists(imgdir):
        logger.debug('Creating image directory at %s' % imgdir)
        os.makedirs(imgdir)
        made_dir = True

    resize_list = []

    logger.debug('This can take a while..')

    # If there is no local copy of the original
    if made_dir is True:
        logger.debug('There was no image directory, so everything is missing')
        resize_list = urls

    else:
        logger.debug('Checking for missing images')
        # cba with resizes for plex
        for item in urls:
            if not os.path.isfile(item['fp']):
                logger.debug('%s was missing, download it %s' % (item['fp'], item['url']))
                resize_list.append(item)

    if made_dir is False and resize_list == 0:
        logger.debug('No missing images :)')
        return

    pool = workerpool.WorkerPool(size=20)
    for i in resize_list:
        j = CacheImgDownload(i, headers)
        pool.put(j)
    pool.shutdown()
    pool.wait()

    # use pil to resize images
    if resize_list and plex_resize is False and resize is True:
        from multiprocessing import Pool, cpu_count
        ppool = Pool(cpu_count())
        try:
            ppool.map_async(cache_resize_image, (b for b in resize_list), 5)
            ppool.close()
            ppool.join()
        except Exception as e:
            logger.debug('Failed to resize image %s' % e)
    else:
        # Already downloaded transcoded images
        return


def download_image(url, dest, auth=None, headers=None):
    ''' Download image and save to disk '''
    logger = logging.getLogger('htpc.helpers')
    logger.debug('Downloading image from %s to %s' % (url, dest))

    try:
        request = Request(url)

        if auth:
            request.add_header('Authorization', 'Basic %s' % auth)

        if headers:
            for key, value in headers.iteritems():
                request.add_header(key, value)
            # Sonarrs image api returns 304, but they cant know if a user has cleared it
            # So make sure we get data every time.
            request.add_header('Cache-Control', 'private, max-age=0, no-cache, must-revalidate')
            request.add_header('Pragma', 'no-cache')

        resp = urlopen(request).read()
        if resp:

            with open(dest, 'wb') as local_file:
                local_file.write(urlopen(request).read())
        else:
            return

        return dest

    except Exception as e:
        logger.error('Failed to download %s to %s %s' % (url, dest, e))


def resize_image(img, height, width, opacity, mode, dest):
    ''' Resize image, set opacity and save to disk '''
    try:
        imagetype = imghdr.what(img)
        im = Image.open(img)
    except IOError as e:
        logger.error('Failed to open image %s dest %s %s' % (img, dest, e))
        return
    except Exception as e:
        logger.error('%s %s %s' % (img, dest, e))
        return

    # Only resize if needed
    if height is not None or width is not None:
        size = int(width), int(height)
        im = im.resize(size, Image.ANTIALIAS)

    # Apply overlay if opacity is set
    if (opacity < 100):
        enhance = opacity / 100
        # Create white overlay image
        overlay = Image.new('RGB', size, '#FFFFFF')
        # apply overlay to resized image
        im = Image.blend(overlay, im, enhance)

    # See http://effbot.org/imagingbook/concepts.htm
    # for the different modes
    if mode:
        im = im.convert(str(mode))

    if imagetype and imagetype.lower() == 'jpeg' or 'jpg':
        im.save(dest, 'JPEG', quality=95)
    else:
        im.save(dest, imagetype)

    return dest


def fix_basepath(s):
    ''' Removes whitespace and adds / on each end '''
    if s:
        s = s.strip()
        s = s.rstrip('/')
        s = s.lstrip('/')
    if not s.startswith('/'):
        s = '/' + s
    if not s.endswith('/'):
        s += '/'
    return s


def striphttp(s):
    # hate regex and this was faster
    if s:
        s = s.strip(' ')
        s = s.replace('https://', '')
        s = s.replace('http://', '')
        return s
    else:
        return ''


def remove_dict_dupe_from_list(l, key):
    getvals = itemgetter(key)
    l.sort(key=getvals)
    result = []
    for k, g in itertools.groupby(l, getvals):
        result.append(g.next())
    return result


def create_https_certificates(ssl_cert, ssl_key):
    '''
    Create self-signed HTTPS certificares and store in paths 'ssl_cert' and 'ssl_key'
    '''
    try:
        from OpenSSL import crypto
        from certgen import createKeyPair, createCertRequest, createCertificate, TYPE_RSA, serial

    except Exception, e:
        logger.error(e)
        logger.error('You need pyopenssl and OpenSSL to make a cert')
        return False

    # Create the CA Certificate
    cakey = createKeyPair(TYPE_RSA, 2048)
    careq = createCertRequest(cakey, CN='Certificate Authority')
    cacert = createCertificate(careq, (careq, cakey), serial, (0, 60 * 60 * 24 * 365 * 10))  # ten years

    cname = 'Htpc-Manager'
    pkey = createKeyPair(TYPE_RSA, 2048)
    req = createCertRequest(pkey, CN=cname)
    cert = createCertificate(req, (cacert, cakey), serial, (0, 60 * 60 * 24 * 365 * 10))  # ten years

    # Save the key and certificate to disk
    try:
        open(ssl_key, 'w').write(crypto.dump_privatekey(crypto.FILETYPE_PEM, pkey))
        open(ssl_cert, 'w').write(crypto.dump_certificate(crypto.FILETYPE_PEM, cert))
    except Exception as e:
        logger.error('Error creating SSL key and certificate %s' % e)
        return False

    return True


def joinArgs(args):
    ''' stolen for plexapi '''
    if not args:
        return ''
    arglist = []
    for key in sorted(args, key=lambda x: x.lower()):
        value = str(args[key])
        arglist.append('%s=%s' % (key, urllib.quote(value)))
    return '?%s' % '&'.join(arglist)


def sizeof(num):
        for x in ['bytes', 'KB', 'MB', 'GB', 'TB']:
            if num < 1024.0:
                return '%3.2f %s' % (num, x)
            num /= 1024.0
        return '%3.2f %s' % (num, 'TB')


def serve_template(name, **kwargs):
    try:
        loc = os.path.join(htpc.RUNDIR, 'interfaces/',
                           htpc.settings.get('app_template', 'default'))

        template = TemplateLookup(directories=[os.path.join(loc, 'html/')])

        return template.get_template(name).render(**kwargs)

    except Exception as e:
        logger.error('%s' % exceptions.text_error_template())
        if htpc.DEV or htpc.LOGLEVEL == 'debug':
            return exceptions.html_error_template().render()


def fan_art(id, t='tvshow', wanted_art='tvposter'):
    assert t in ('tv', 'movies', 'music', 'tvshow')

    possible_image_types = ['movielogo', 'tvposter', 'moviethumb', 'seasonposter', 'seasonbanner',
                            'hdmovieclearart', 'characterart', 'hdtvlogo', 'hdclearart', 'seasonthumb',
                            'hdmovielogo', 'movieposter', 'tvbanner', 'moviedisc', 'tvthumb', 'clearart',
                            'moviebackground', 'movieart', 'showbackground', 'clearlogo', 'moviebanner',
                            'tvposter', 'movieposter'
                            ]

    # CBA with hiding the key from the logs
    url = 'http://webservice.fanart.tv/v3/%s/%s?api_key=%s' % (t, id, htpc.FANART_APIKEY)
    logger.debug('Looking for images from fanart.tv %s' % url)

    header = {"Content-type": "application/json",
              "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.101 Safari/537.36"
             }

    img_list = []

    try:
        r = requests.get(url, headers=header)

        result = r.json()
        for k, v in result.items():
            if k in possible_image_types or wanted_art == 'all':
                if k == wanted_art or wanted_art == 'all':
                    for image in v:
                        img_list.append(image['url'])

        logger.debug('Found %s images from fanart.tv' % len(img_list))
        return img_list
    except Exception as e:
        logger.error(e)
        return img_list


def tvmaze(_id, img_provider, t):
    ''' Tries to find any images to a show, if it faileds and the shows has a tvdbid
        it will call fanart to check There '''

    url = 'http://api.tvmaze.com/lookup/%s?%s=%s' % (t, img_provider, _id)
    logger.debug('Looking for images from tvmaze %s' % url)
    img_list = []

    try:
        r = requests.get(url)
        result = r.json()
        if 'image' in result:
            for k, v in result['image'].items():
                img_list.append(v)

        if img_list:
            logger.debug('Found %s images at tvmaze' % len(img_list))
            return img_list
        else:
            # no images, lets try grab the tvdbid
            if t == 'shows':
                t = 'tv'
                img_type = 'tvposter'
            elif t == 'movies':
                t = 'movies'
                img_type = 'movieposter'

            tvdbid = result['external']['thetvdb']
            fa = fan_art(tvdbid, t=t, wanted_art=img_type)
            if fa:
                return fa[0]

    except Exception as e:
        logger.info('Failed to find any images from tvmaze %s' % e)
        return img_list

OS = platform.system()

def path_append():
    ''' Appends the path for FreeBSD and FreeNAS '''
    if OS == 'FreeBSD':
        os.environ["PATH"] += '/sbin:/bin:/usr/sbin:/usr/bin:/usr/games:' +\
                              '/usr/local/sbin:/usr/local/bin:/root/bin'

#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import hashlib
import htpc
import imghdr
import logging
from cherrypy.lib.static import serve_file
from urllib2 import Request, urlopen
try:
    import Image
    PIL = True
except ImportError:
    try:
        from PIL import Image
        PIL = True
    except ImportError:
        PIL = False

logger = logging.getLogger('helpers')


def get_image(url, height=None, width=None, opacity=100, auth=None, headers=None):
    """ Load image form cache if possible, else download. Resize if needed """
    opacity = float(opacity)
    logger = logging.getLogger('htpc.proxy')

    # Create image directory if it doesnt exist
    imgdir = os.path.join(htpc.DATADIR, 'images/')
    if not os.path.exists(imgdir):
        logger.debug("Creating image directory at " + imgdir)
        os.makedirs(imgdir)

    # Create a hash of the path to use as filename
    imghash = hashlib.md5(url).hexdigest()

    # Set filename and path
    image = os.path.join(imgdir, imghash)

    # If there is no local copy of the original
    if not os.path.isfile(image):
        logger.debug("No local image found for " + image + ". Downloading")
        download_image(url, image, auth, headers)

    # Check if resize is needed
    if (height and width) or (opacity < 100):

        if PIL:
            # Set filename for resized file
            resized = image + '_w' + width + '_h' + height + '_o' + str(opacity)

            # If there is no local resized copy
            if not os.path.isfile(resized):
                # try to resize, if we cant return original image
                try:
                    resize_image(image, height, width, opacity, resized)
                except Exception as e:
                    logger.debug('%s returning orginal image %s' % (e, url))
                    return serve_file(path=image, content_type='image/png')

            # Serve the resized file
            image = resized
        else:
            logger.error("Can't resize when PIL is missing on system!")
            if (opacity < 100):
                image = os.path.join(htpc.RUNDIR, 'interfaces/default/img/fff_20.png')

    # Load file from disk
    imagetype = imghdr.what(image)
    if imagetype is not None:
        return serve_file(path=image, content_type='image/' + imagetype)


def download_image(url, dest, auth=None, headers=None):
    """ Download image and save to disk """
    logger = logging.getLogger('htpc.proxy')
    logger.debug("Downloading image from " + url + " to " + dest)

    try:
        request = Request(url)

        if (auth):
            request.add_header("Authorization", "Basic %s" % auth)

        if (headers):
            for key, value in headers.iteritems():
                request.add_header(key, value)

        with open(dest, "wb") as local_file:
            local_file.write(urlopen(request).read())
    except Exception:
        pass


def resize_image(img, height, width, opacity, dest):
    """ Resize image, set opacity and save to disk """
    size = int(width), int(height)
    imagetype = imghdr.what(img)

    im = Image.open(img)
    im = im.resize(size, Image.ANTIALIAS)

    # Apply overlay if opacity is set
    opacity = float(opacity)
    if (opacity < 100):
        enhance = opacity / 100
        # Create white overlay image
        overlay = Image.new('RGB', size, '#FFFFFF')
        # apply overlay to resized image
        im = Image.blend(overlay, im, enhance)

    if imagetype == 'jpeg':
        im.save(dest, 'JPEG', quality=95)
    im.save(dest, imagetype)
    return dest


def fix_basepath(s):
    """ Removes whitespace and adds / on each end """
    if s:
        s.strip(" ")
    if not s.startswith('/'):
        s = '/' + s
    if not s.endswith('/'):
        s += '/'
    return s


def striphttp(s):
    # hate regex and this was faster
    if s:
        s = s.strip(" ")
        s = s.replace("https://", "")
        s = s.replace("http://", "")
        return s
    else:
        return ""


def create_https_certificates(ssl_cert, ssl_key):
    """
    Create self-signed HTTPS certificares and store in paths 'ssl_cert' and 'ssl_key'
    """
    try:
        from OpenSSL import crypto
        from certgen import createKeyPair, createCertRequest, createCertificate, TYPE_RSA, serial

    except Exception, e:
        logger.error(e)
        logger.error("You need pyopenssl and OpenSSL to make a cert")
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
        logger.error("Error creating SSL key and certificate %s" % e)
        return False

    return True


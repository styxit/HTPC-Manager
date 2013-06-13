""" Tool for proxying images and resizing if needed """
import os
import hashlib
import htpc
from cherrypy.lib.static import serve_file
try:
    import Image
    import ImageEnhance
except ImportError:
    from PIL import Image, ImageEnhance
from urllib2 import Request, urlopen
from cStringIO import StringIO


def get_image(url, height=None, width=None, opacity=100, auth=None):
    """ Load image form cache if possible, else download. Resize if needed """
    # Create image directory if it doesnt exist
    imgdir = os.path.join(htpc.DATADIR, 'images/')
    if not os.path.exists(imgdir):
        os.makedirs(imgdir)

    # Create a hash of the path to use as filename
    imghash = hashlib.md5(url).hexdigest()

    # Set filename and path
    image = os.path.join(imgdir, imghash)

    # If there is no local copy of the original
    if not os.path.isfile(image + '.jpg'):
        download_image(url, image, auth)

    # Check if resize is needed
    if height and width:
        # Set filename for resized file
        resized = image + '_w' + width + '_h' + height + '_o' + str(opacity)
        # If there is no local resized copy
        if not os.path.isfile(resized + '.jpg'):
            resize_image(image, height, width, opacity, resized)
        # Serve the resized file
        image = resized

    # Load file from disk
    return serve_file(path=image + '.jpg', content_type='image/jpeg')


def download_image(url, dest, auth=None):
    """ Download image and save to disk """
    request = Request(url)
    if (auth):
        request.add_header("Authorization", "Basic %s" % auth)
    data = StringIO(urlopen(request).read())
    im = Image.open(data)
    im.save(dest + '.jpg', 'JPEG', quality=95)


def resize_image(img, height, width, opacity, dest):
    """ Resize image, set opacity and save to disk """
    size = int(width), int(height)
    im = Image.open(img + '.jpg')
    im = im.resize(size, Image.ANTIALIAS)

    # Apply overlay if opacity is set
    opacity = float(opacity)
    if (opacity < 100):
        enhance = opacity / 100
        # Create white overlay image
        overlay = Image.new('RGB', size, '#FFFFFF')
        #apply overlay to resized image
        im = Image.blend(overlay, im, enhance)

    im.save(dest + '.jpg', 'JPEG', quality=95)
    return dest

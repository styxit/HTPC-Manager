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
    if not os.path.isfile(image + '.png'):
        download_image(url, image, auth)

    # Check if resize is needed
    if height and width:
        # Set filename for resized file
        resized = image + '_w' + width + '_h' + height + '_o' + str(opacity)
        # If there is no local resized copy
        if not os.path.isfile(resized + '.png'):
            resize_image(image, height, width, opacity, resized)
        # Serve the resized file
        image = resized

    # Load file from disk
    return serve_file(path=image + '.png', content_type='image/png')


def download_image(url, dest, auth=None):
    """ Download image and save to disk """
    request = Request(url)
    if (auth):
        request.add_header("Authorization", "Basic %s" % auth)
    data = StringIO(urlopen(request).read())
    im = Image.open(data)
    im.save(dest + '.png', 'PNG')


def resize_image(img, height, width, opacity, dest):
    """ Resize image, set opacity and save to disk """
    size = int(width), int(height)
    enhance = float(opacity) / 100
    im = Image.open(img + '.png')
    im = im.resize(size, Image.ANTIALIAS).convert('RGBA')
    alpha = ImageEnhance.Brightness(im.split()[3]).enhance(enhance)
    im.putalpha(alpha)
    im.save(dest + '.png', 'PNG')
    return dest

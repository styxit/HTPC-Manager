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


def get_image(url, height=None, width=None, opacity=100, auth=None):
    """ Load image form cache if possible, else download. Resize if needed """
    # Create image directory if it doesnt exist
    imgdir = os.path.join(htpc.DATADIR, 'images/')
    if not os.path.exists(imgdir):
        os.makedirs(imgdir)

    # Create a hash of the path to use as filename
    imgname = hashlib.md5(url).hexdigest()

    original = resized = os.path.join(imgdir, imgname + '.png')
    if height and width:
        resized = os.path.join(imgdir,
                original + '_' + width + '_' + height + '.png')

    # If there is no local copy of the original
    if not os.path.isfile(original):
        original = download_image(url, original, auth)

    # If there is no local resized copy
    if not os.path.isfile(resized):
        resized = resize_image(original, height, width, opacity, resized)

    # Load file from disk
    return serve_file(path=resized, content_type='image/png')


def download_image(url, dest, auth=None):
    """ Download image and save to disk """
    request = Request(url)
    if (auth):
        request.add_header("Authorization", "Basic %s" % auth)
    data = urlopen(request).read()
    file_obj = open(dest, 'wb')
    file_obj.write(data)
    file_obj.close()
    return dest


def resize_image(img, height, width, opacity, dest):
    """ Resize image, set opacity and save to disk """
    height = int(height)
    width = int(width)
    opacity = float(opacity)
    enhance = opacity / 100
    try:
        image = Image.open(img)
        resized = image.resize((width, height),
                               Image.ANTIALIAS).convert('RGBA')
        alpha = resized.split()[3]
        alpha = ImageEnhance.Brightness(alpha).enhance(enhance)
        resized.putalpha(alpha)
        resized.save(dest)
        return dest
    except ValueError:
        return img

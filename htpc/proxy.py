import os, cherrypy, htpc
from cherrypy.lib.static import serve_file
try:
    import Image, ImageEnhance
except:
    from PIL import Image, ImageEnhance
from urllib2 import quote, unquote, Request, urlopen

def getImage(url, h=None, w=None, o=100, auth=None, **kwargs):
    # Create image directory if it doesnt exist
    imgdir = os.path.join(htpc.datadir, 'images/')
    if not os.path.exists(imgdir):
        os.makedirs(imgdir)

    fileName = unquote(unquote(url)).rsplit('/', 1).pop()
    imgName, imgType = fileName.rsplit('.', 1)

    original = resized = os.path.join(imgdir, imgType+'_'+imgName+'.png')
    if h and w:
        resized = os.path.join(imgdir, original+'_'+w+'_'+h+'.png')

    # If there is no local copy of the original
    if not os.path.isfile(original):
        original = downloadImage(url, original, auth)

    if not original:
        print "Error downloading image"
        raise cherrypy.NotFound(fileName)

    # If there is no local resized copy
    if not os.path.isfile(resized):
        resized = resizeImage(original, h, w, o, resized)

    if not resized:
        resized = original

    # Load file from disk
    return serve_file(path=resized, content_type='image/png')

def downloadImage(url, dest, auth=None):
    try:
        request = Request(url)
        if (auth):
            request.add_header("Authorization", "Basic %s" % auth)
        data = urlopen(request).read()
        f = open(dest, 'wb')
        f.write(data)
        f.close()
        return dest
    except:
        return False

def resizeImage(img, height, width, opacity, dest):
    height = int(height)
    width = int(width)
    opacity = float(opacity)
    enhance = opacity/100
    try:
        image = Image.open(img)
        resized = image.resize((width, height), Image.ANTIALIAS).convert('RGBA')
        alpha = resized.split()[3]
        alpha = ImageEnhance.Brightness(alpha).enhance(enhance)
        resized.putalpha(alpha)
        resized.save(dest)
        return dest
    except:
        return False

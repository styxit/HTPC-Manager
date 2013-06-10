#
# The Python Imaging Library.
# $Id$
#
# PPM support for PIL
#
# History:
#       96-03-24 fl     Created
#       98-03-06 fl     Write RGBA images (as RGB, that is)
#
# Copyright (c) Secret Labs AB 1997-98.
# Copyright (c) Fredrik Lundh 1996.
#
# See the README file for information on usage and redistribution.
#


__version__ = "0.2"

import string

from PIL import Image, ImageFile

#
# --------------------------------------------------------------------

b_whitespace = string.whitespace.encode()

MODES = {
    # standard
    b"P4": "1",
    b"P5": "L",
    b"P6": "RGB",
    # extensions
    b"P0CMYK": "CMYK",
    # PIL extensions (for test purposes only)
    b"PyP": "P",
    b"PyRGBA": "RGBA",
    b"PyCMYK": "CMYK"
}

def _accept(prefix):
    return prefix[0:1] == b"P" and prefix[1] in b"0456y"

##
# Image plugin for PBM, PGM, and PPM images.

class PpmImageFile(ImageFile.ImageFile):

    format = "PPM"
    format_description = "Pbmplus image"

    def _token(self, s = b""):
        while True: # read until next whitespace
            c = self.fp.read(1)
            if not c or c in b_whitespace:
                break
            s = s + c
        return s

    def _open(self):

        # check magic
        s = self.fp.read(1)
        if s != b"P":
            raise SyntaxError("not a PPM file")
        mode = MODES[self._token(s)]

        if mode == "1":
            self.mode = "1"
            rawmode = "1;I"
        else:
            self.mode = rawmode = mode

        for ix in range(3):
            while True:
                while True:
                    s = self.fp.read(1)
                    if s not in b_whitespace:
                        break
                if s != b"#":
                    break
                s = self.fp.readline()
            s = int(self._token(s))
            if ix == 0:
                xsize = s
            elif ix == 1:
                ysize = s
                if mode == "1":
                    break

        self.size = xsize, ysize
        self.tile = [("raw",
                     (0, 0, xsize, ysize),
                     self.fp.tell(),
                     (rawmode, 0, 1))]

        # ALTERNATIVE: load via builtin debug function
        # self.im = Image.core.open_ppm(self.filename)
        # self.mode = self.im.mode
        # self.size = self.im.size

#
# --------------------------------------------------------------------

def _save(im, fp, filename):
    if im.mode == "1":
        rawmode, head = "1;I", b"P4"
    elif im.mode == "L":
        rawmode, head = "L", b"P5"
    elif im.mode == "RGB":
        rawmode, head = "RGB", b"P6"
    elif im.mode == "RGBA":
        rawmode, head = "RGB", b"P6"
    else:
        raise IOError("cannot write mode %s as PPM" % im.mode)
    fp.write(head + ("\n%d %d\n" % im.size).encode('ascii'))
    if head != b"P4":
        fp.write(b"255\n")
    ImageFile._save(im, fp, [("raw", (0,0)+im.size, 0, (rawmode, 0, 1))])

    # ALTERNATIVE: save via builtin debug function
    # im._dump(filename)

#
# --------------------------------------------------------------------

Image.register_open("PPM", PpmImageFile, _accept)
Image.register_save("PPM", _save)

Image.register_extension("PPM", ".pbm")
Image.register_extension("PPM", ".pgm")
Image.register_extension("PPM", ".ppm")

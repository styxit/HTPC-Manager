#!/usr/bin/env python
# -*- coding: utf-8 -*-
import logging

logger = logging.getLogger('helpers')


def fix_basepath(s):
    """ Removes whitespace and adds / on each end """
    if s:
        s.strip(" ")
    if not s.startswith('/'):
        s = '/' + s
    if not s.endswith('/'):
        s += '/'
    return s


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


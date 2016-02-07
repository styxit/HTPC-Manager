#!/usr/bin/env python
# -*- coding: utf-8 -*-

import urllib
import logging
import re
import requests

"""
Disabled for now, hopefully someone will add/release the scrapers so clones pops up
"""

# Disable the damn warnings
requests.packages.urllib3.disable_warnings()


def search(q, cat):
    # add cat's if ts is rewritten
    url = 'https://getstrike.net/api/v2/torrents/search/?phrase=%s' % urllib.quote_plus(q)
    logger = logging.getLogger('modules.torrentsearch')
    try:
        req = requests.Session()
        r = req.get(url, verify=False, timeout=5)
        if r.status_code == 200 and r.json()['statuscode'] == 200:
            result = r.json()
            torrents = result['torrents']
            l = []
            logger.debug('getstrike found %s torrents '% result['results'])
            regex_codec = re.compile(r'(x264|x\.264|h264|h\.264|xvid|x265|x\.265|h265|h\.265|mpeg2|divx)', re.I)
            regex_source = re.compile(r'(HDTV|HD-TV|HD\.TV|WEB-DL|WEB_DL|WEB\.DL|WEB_RIP|WEB-RIP|WEBRip|WEB\.RIP|BRRIP|BDRIP|BluRay(.*)REMUX)|(?i)BluRay(.*)\.(AVC|VC-1)\.|BluRay', re.I)
            regex_resolution = re.compile(r'(sd|480p|480i|720p|720i|1080p|1080i|2160p)', re.I)
            for torrent in torrents:

                r = {
                        'Provider': 'getstrike',
                        'BrowseURL': torrent['page'],
                        'DownloadURL': torrent['magnet_uri'],
                        'ReleaseName': torrent['torrent_title'],
                        'Seeders': torrent['seeds'],
                        'Leechers': torrent['leeches'],
                        'Size': torrent['size'],
                        'Container': 'N/A',
                        'Snatched': 'N/A',
                }

                codec = re.search(regex_codec, torrent['torrent_title'])
                if codec:
                    codec = codec.group()
                else:
                    codec = 'N/A'

                resolution = re.search(regex_resolution, torrent['torrent_title'])
                if resolution:
                    resolution = resolution.group()
                else:
                    resolution = 'N/A'

                source = re.search(regex_source, torrent['torrent_title'])
                if source:
                    source = source.group()
                else:
                    source = 'N/A'

                r['Source'] = source
                r['Resolution'] = resolution
                r['Codec'] = codec

                l.append(r)
            return l
        else:
            logger.debug('Failed to fetch torrents from getstrike with query %s category %s message %s' (q, cat, r.json()['message']))
            return []
    except Exception as e:
        logger.debug('Failed to fetch any torrents from getstrike with query %s category %s error is %s' % (q, cat, e))
        return []

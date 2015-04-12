#!/usr/bin/env python
# -*- coding: utf-8 -*-

import requests
import urllib
import logging


def search(q, cat):
    # add cat's if ts is rewritten
    url = 'https://getstrike.net/api/v2/torrents/search/?phrase=%s' % urllib.quote_plus(q)
    r = requests.get(url)
    logger = logging.getLogger('modules.torrentsearch')
    try:
        r = requests.get(url, verify=False)
        if r.status_code == 200 and r.json()['statuscode'] == 200:
            result = r.json()['torrents']
            l = []
            for torrent in result:
                # Add this manually as api swicthed to magnet
                # Query the api to download the torrent, it else returns 404
                # This should be rewritten when all the torrent clientscan accept a magnet ## TODO
                doesit_exist = 'https://getstrike.net/api/v2/torrents/download/?hash=%s' % torrent['torrent_hash']
                t = requests.get(doesit_exist)
                data = t.json()
                if data['statuscode'] == 404:
                    # Couldnt get the torrent, skip it
                    continue
                else:
                    download_url = data['message']

                r = {
                        'Provider': 'getstrike',
                        'BrowseURL': torrent['page'],
                        'DownloadURL': download_url,
                        'ReleaseName': torrent['torrent_title'],
                        'Seeders': torrent['seeds'],
                        'Leechers': torrent['leeches'],
                        'Size': torrent['size'],
                        'Source': 'N/A',
                        'Resolution': 'N/A',
                        'Container': 'N/A',
                        'Codec': 'N/A',
                        'Snatched': torrent['download_count'],
                }
                l.append(r)
            return l
    except Exception as e:
        logger.debug('Failed to fetch any forrents from getstrike with query %s category %s error is %s' % (q, cat, e))
        return []

#!/usr/bin/env python
# -*- coding: utf-8 -*-

import htpc
import json
import logging
import requests


def search(q, cat):
    logger = logging.getLogger('modules.torrents')
    username = htpc.settings.get('torrents_norbits_username', '')
    passkey = htpc.settings.get('torrents_norbits_passkey', '')
    result_list = []

    category = {
                    'all': '',
                    'movies': 1,
                    'music': 5,
                    'tv': 2,
                    'software': 3,
                    'games': 4,
                    'books': 6
                }
    if cat:
            payload = {
                'username': username,
                'passkey': passkey,
                'search': str(q),
                'category': category[cat],
                'limit': 3000
            }
    else:
            payload = {
                'username': username,
                'passkey': passkey,
                'search': str(q),
                'limit': 3000
            }
    try:
        result = requests.post('https://norbits.net/api2.php?action=torrents', data=json.dumps(payload))
        results = result.json()
        print results
        if int(results['data']['total']) == 0:
            #return empty string
            pass # some error msg
        elif results['data']['torrents']:
            for rr in results['data']['torrents']:
                downloadurl = "https://norbits.net/download.php?id=%s&passkey=%s" % (rr['id'], passkey)
                browserurl = 'https://norbits.net/details.php?id=%s' % (rr['id'])

                r = {
                    "Provider": "Norbits",
                    "BrowseURL": browserurl,
                    "DownloadURL": downloadurl,
                    "ReleaseName": rr["name"],
                    "Seeders": rr["seeders"],
                    "Leechers": rr["leechers"],
                    "Size": rr["size"],
                    "Source": 'N/A',
                    "Resolution": rr["sub2_name"],
                    "Container": 'N/A',
                    "Codec": rr["sub1_name"],
                    "Snatched": 'N/A',
                }

                result_list.append(r)
        return result_list
    except Exception as e:
        print e#logger.info('Failed to search norbits %s' % e)
        return ''
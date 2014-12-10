#!/usr/bin/env python
# -*- coding: utf-8 -*-

import htpc
import urllib2
import urllib
import json
import logging


def search(query=None, cat=None):
    print "running fenopy"
    logger = logging.getLogger('modules.torrents')
    d = {}
    d['all'] = 0
    d['music'] = 1
    d['movies'] = 3
    d['tv'] = 78
    d['books'] = 7
    d['anime'] = 5
    d['games'] = 4
    d['software'] = 6
    result_list = []

    try:
        url = "http://fenopy.se/module/search/api.php?keyword=%s&sort=peer&format=json&limit=100&category=%s" % (urllib.quote_plus(query), d[cat])
        result = urllib2.urlopen(url).read()
        if 'error: no match found' in result:
            print "fucking error"
            return []

        res = json.JSONDecoder('UTF-8').decode(result)

        verified = htpc.settings.get('torrents_fenopy_enabled_verified')
        for rr in res:
            if verified and rr['verified'] != 1:
                continue

            r = {
                "Provider": "fenopy",
                "BrowseURL": rr["page"],
                "DownloadURL": rr["torrent"],
                "ReleaseName": rr["name"],
                "Seeders": rr["seeder"],
                "Leechers": rr["leecher"],
                "Size": rr["size"],
                "Source": 'N/A',
                "Resolution": 'N/A',
                "Container": 'N/A',
                "Codec": 'N/A',
                "Snatched": 'N/A',
            }

            result_list.append(r)

        return result_list

    except Exception as e:
        print e
        logger.error('Fenopy error while searching for %s %s' % (query, e))
        return []
#!/usr/bin/env python
# -*- coding: utf-8 -*-
import json
import requests
import htpc
import logger


def search(what, cat='all'):
    seeds = htpc.settings.get('torrents_seeds', 5)
    url = 'https://kickass.to'
    supported_categories = {'all': '', 'movies': 'Movies', 'tv': 'TV', 'music': 'Music', 'games': 'Games', 'software': 'Applications'}
    ret = []
    i = 1
    hits = 0

    while True and i < 3:
        results = []
        json_data = requests.get(url + '/json.php?q=%s&page=%d' % (what, i), verify=False)

        try:
            # hasnt set the correct header
            json_dict = json_data.json()
        except:
            i += 1
            continue

        if int(json_dict['total_results']) <= 0:
            return

        results = json_dict['list']
        for r in results:
            try:
                if cat != 'all' and supported_categories[cat] != r['category']:
                    continue

                if r['seeds'] >= int(seeds):
                    rr = {
                        "Provider": "ka",
                        "BrowseURL": r["link"],
                        "DownloadURL": r["torrentLink"],
                        "ReleaseName": r["title"],
                        "Seeders": r["seeds"],
                        "Leechers": r["leechs"],
                        "Size": r["size"],
                        "Source": "N/A",
                        "Resolution": "N/A",
                        "Container": "N/A",
                        "Codec": "N/A",
                        "Snatched": "N/A",
                    }
                    ret.append(rr)
            except:
                pass
        i += 1

    logger.debug(ret)
    if len(ret):
        return sorted(ret, reverse=True, key=lambda k: k['Seeders'])
    else:
        return []

#!/usr/bin/env python
# -*- coding: utf-8 -*-

import requests
import urllib
import logging


class YTS(object):
    def __init__(self):
        self.urls = {
                     "search": "https://yts.re/api/v2/list_movies.json?query_term=%s&sort_by=seeds&limit=50",
                     "movieinfo": "https://yts.re/api/v2/movie_details.json?movie_id=%s",
                     "suggestion": "https://yts.re/api/v2/movie_suggestions.json?movie_id=%s",
                     "upcoming": "https://yts.re/api/v2/list_upcoming.json"
                    }

    def _fetch(self, url):
        try:
            r = requests.get(url)
            if r.status_code == 200 and r.json()["status"] == "ok":
                return r.json()
        except:
            return []

    def _search(self, q):
        r = self._fetch(self.urls["search"] % q)
        return r

    def search(self, q, cat):
        f = self._search(urllib.quote_plus(q))
        l = []
        if f["data"]["movie_count"] >= 1:
            for torrent in f["data"]["movies"]:
                for t in torrent["torrents"]:
                    r = {
                        "Provider": "yts",
                        "BrowseURL": torrent["url"],
                        "DownloadURL": t["url"],
                        "ReleaseName": torrent["title"],
                        "Seeders": t["seeds"],
                        "Leechers": t["peers"],
                        "Size": t["size_bytes"],
                        "Source": "N/A",
                        "Resolution": t["quality"],
                        "Container": "N/A",
                        "Codec": "N/A",
                        "Snatched": "N/A",
                    }
                    l.append(r)
            logging.debug(l)
            return l
        else:
            return []

    def movieinfo(self, id):
        r = self._fetch(self.urls["movieinfo"] % id)
        return r

    def suggestion(self, id):
        r = self._fetch(self.urls["suggestion"] % id)
        return r

    def upcoming(self):
        r = self._fetch(self.urls["upcoming"])
        return r

    def details(self, id):
        r = self._fetch(self.urls["details"] % id)
        return r

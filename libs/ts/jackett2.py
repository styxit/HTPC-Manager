import logging
import urllib

import requests
import xmltodict

import htpc


logger = logging.getLogger('ts.jackett')


def jackett(query, cat):
    host = htpc.settings.get('torrents_jackett_host')
    port = htpc.settings.get('torrents_jackett_port')
    base = htpc.settings.get('torrents_jackett_base', '')
    api = htpc.settings.get('torrents_jackett_apikey')
    ssl = 's' if htpc.settings.get('torrents_jackett_ssl') else ''
    q = urllib.quote_plus(query)
    url = 'http%s://%s:%s%s/torznab/all?apikey=%s&format=json&q=%s&t=search' % (ssl, host, port, base.rstrip('/'), api, q)

    r = requests.get(url)
    results = []
    if r:
        json = xmltodict.parse(r.text, attr_prefix='')
        if json:
            try:
                for torrent in json['rss']['channel']['item']:
                    dd = {'Provider': 'jackett',
                          'BrowseURL': torrent['comments'],
                          'DownloadURL': torrent['link'],
                          'ReleaseName': torrent['title'],
                          'Size': int(torrent['size']),
                          'Container': 'N/A',
                          'Snatched': torrent.get('grabs', 'N/A')}

                    for attr in torrent['torznab:attr']:
                        if attr.get('name') == 'seeders':
                            dd['Seeders'] = int(attr.get('value', 0))

                        elif attr.get('name') == 'peers':
                            dd['Leechers'] = int(attr.get('value', 0))

                    results.append(dd)
            except Exception as e:
                logger.exception('%s' % e)

    return results

import requests
import re
import logging


class Torrentproject(object):
    def __init__(self):
        self.logger = logging.getLogger('modules.torrentsearch')
        self.urls = {'base': 'https://torrentproject.se/',
                     'search': 'https://torrentproject.se/?s=%s&out=json&orderby=best',
                     'dailydump': 'dailydump.txt.gz',
                     'hourlydump': 'hourlydump.txt.gz',
                     'verifieddailydump': 'verifieddailydump.txt.gz'
                     }
        # https://torrentproject.se/api

    def search(self, s, cat):
        try:

            result = requests.get(self.urls['search'] % s, timeout=10)
            regex_codec = re.compile(r'(x264|x\.264|h264|h\.264|xvid|x265|x\.265|h265|h\.265|mpeg2|divx)', re.I)
            regex_source = re.compile(r'(HDTV|HD-TV|HD\.TV|WEB-DL|WEB_DL|WEB\.DL|WEB_RIP|WEB-RIP|WEBRip|WEB\.RIP|BRRIP|BDRIP|BluRay(.*)REMUX)|(?i)BluRay(.*)\.(AVC|VC-1)\.|BluRay', re.I)
            regex_resolution = re.compile(r'(sd|480p|480i|720p|720i|1080p|1080i|2160p)', re.I)
            l = []
            if result:
                rr = result.json()
                results_n = rr.pop('total_found', 0)
                self.logger.debug('Torrentproject found %s torrents while searching for %s' % (results_n, s))
                for k, v in rr.items():

                    r = {
                            'Provider': 'torrentproject',
                            'BrowseURL': self.urls['base'] + v['torrent_hash'],
                            'DownloadURL': "magnet:?xt=urn:btih:" + v['torrent_hash'],
                            'ReleaseName': v['title'],
                            'Seeders': v['seeds'],
                            'Leechers': v['leechs'],
                            'Size': v['torrent_size'],
                            'Container': 'N/A',
                            'Snatched': 'N/A',
                    }

                    codec = re.search(regex_codec, v['title'])
                    if codec:
                        codec = codec.group()
                    else:
                        codec = 'N/A'

                    resolution = re.search(regex_resolution, v['title'])
                    if resolution:
                        resolution = resolution.group()
                    else:
                        resolution = 'N/A'

                    source = re.search(regex_source, v['title'])
                    if source:
                        source = source.group()
                    else:
                        source = 'N/A'

                    r['Source'] = source
                    r['Resolution'] = resolution
                    r['Codec'] = codec

                    l.append(r)

                return l

        except Exception as e:
            self.logger.error('Failed while searching for %s with torrentproject' % e, exc_info=True)
            return []

#!/usr/bin/env python
# -*- coding: utf-8 -*-

import requests
import urllib
import logging
import htpc


def search(q, cat):
    logger = logging.getLogger('modules.torrentsearch')
    logger.info('Searching for %s on ptp' % q)

    username = htpc.settings.get('torrents_ptp_username', '')
    password = htpc.settings.get('torrents_ptp_password', '')
    passkey = htpc.settings.get('torrents_ptp_passkey', '')

    if not username or not password or not passkey:
        logger.error('Check your settings, username, password or passkey is missing')
        return []

    urls = {
        'detail': 'https://tls.passthepopcorn.me/torrents.php?torrentid=%s',
        'login': 'https://tls.passthepopcorn.me/ajax.php?action=login',
        'search': 'https://tls.passthepopcorn.me/torrents.php?action=search&searchstr=%s&json=noredirect',
        'download': 'http://passthepopcorn.me/torrents.php?action=download&id=%s&authkey=%s&torrent_pass=%s'
    }

    d = {
        'username': username,
        'password': password,
        'passkey': passkey,
        'keeplogged': '1',
        'login': 'Login'
    }

    try:
        s = requests.Session()
        login = s.post(urls['login'], data=d, timeout=10)
        if login.json()['Result'] == 'Ok':
            logger.debug('Logged into PTP')
        else:
            logger.error('%s' % login.json()['Result']['Message'])
            if login.json()['Result']['Attempts'] == 1:
                # Lets not get banned.. like i did..
                logger.info('Wiped PTP username to prevent ban, please check you settings')
                htpc.settings.set('torrents_ptp_username', '')

            return []

        r = s.get(urls['search'] % urllib.quote_plus(q), timeout=10)
        result_list = []

        if r.ok:
            result = r.json()

            authkey = result['AuthKey']
            logger.debug('Found %s movies with %s' % (len(result['Movies']), q))
            for torrent in result['Movies']:
                logger.debug('Found %s torrents to %s' % (len(torrent['Torrents']), torrent['Title']))

                for t in torrent['Torrents']:
                    r = {
                        'Provider': 'passtp',
                        'BrowseURL': urls['detail'] % t['Id'],
                        'DownloadURL': urls['download'] % (t['Id'], authkey, passkey),
                        'ReleaseName': t['ReleaseName'],
                        'Seeders': t['Seeders'],
                        'Leechers': t['Leechers'],
                        'Size': int(t['Size']),
                        'Source': t['Source'],
                        'Resolution': 'N/A',
                        'Container': t['Container'],
                        'Codec': t['Codec'],
                        'Snatched': t['Snatched'],
                    }

                    result_list.append(r)

            logger.debug('Found %s torrents from PTP' % len(result_list))
        return result_list

    except Exception as e:
        logger.error('Error while fetching torrents from PTP %s' % e)
        return []

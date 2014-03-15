import cherrypy
import htpc
import logging
import socket
import base64


class Samsungtv:
    def __init__(self):
        self.logger = logging.getLogger('modules.samsungtv')
        htpc.MODULES.append({
            'name': 'Samsung Remote',
            'id': 'samsungtv',
            'fields': [
                {'type': 'bool', 'label': 'Enable', 'name': 'samsungtv_enable'},
                #Disabled to since i dont want to be in the menu, but still have access via url.
                #{'type': 'text', 'label': 'Menu name', 'name': 'samsungtv_name'},
                {'type': 'text', 'label': 'IP / Host *', 'name': 'samsungtv_host'},
                {'type': 'text', 'label': 'Tv model', 'name': 'samsungtv_model'},
                {'type': 'text', 'label': 'Htpc-Manager MAC', 'name': 'samsung_htpcmac'},
                {'type': 'text', 'label': 'HTPC-Manager IP', 'name': 'samsung_htpchost'}
               
        ]})
    
    @cherrypy.expose()
    def index(self):
        return htpc.LOOKUP.get_template('samsungtv.html').render(scriptname='samsungtv')
    
    @cherrypy.expose()
    def sendkey(self, action):
        try:
            key = action
            if key == 'undefined':
                pass
            else:
                src = htpc.settings.get('samsung_htpchost', '')
                mac = htpc.settings.get('samsung_htpcmac', '')
                remote = 'HTPC-Manager remote'
                dst = htpc.settings.get('samsungtv_host', '')
                application = 'python'
                tv  = htpc.settings.get('samsungtv_model', '')
    
                new = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                new.connect((dst, 55000))
                msg = chr(0x64) + chr(0x00) +\
                    chr(len(base64.b64encode(src)))    + chr(0x00) + base64.b64encode(src) +\
                    chr(len(base64.b64encode(mac)))    + chr(0x00) + base64.b64encode(mac) +\
                    chr(len(base64.b64encode(remote))) + chr(0x00) + base64.b64encode(remote)
                pkt = chr(0x00) +\
                    chr(len(application)) + chr(0x00) + application +\
                    chr(len(msg)) + chr(0x00) + msg
                new.send(pkt)
                msg = chr(0x00) + chr(0x00) + chr(0x00) +\
                chr(len(base64.b64encode(key))) + chr(0x00) + base64.b64encode(key)
                pkt = chr(0x00) +\
                    chr(len(tv))  + chr(0x00) + tv +\
                    chr(len(msg)) + chr(0x00) + msg
                new.send(pkt)
                new.close()
        except Exception as e:
            print e
            self.logger.debug('Failed to send %s to the tv' % key)
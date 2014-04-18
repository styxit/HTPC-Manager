import cherrypy
import htpc
import logging
import urllib2
import urllib
import base64
import json
import time

class TVHeadend:
	def __init__(self):
		self.logger = logging.getLogger('modules.tvheadend')
		htpc.MODULES.append({
			'name': 'TVHeadend',
			'id': 'tvheadend',
			'test': htpc.WEBDIR + 'TVHeadend/ping',
			'fields': [
				{'type': 'bool', 'label': 'Enable', 'name': 'tvheadend_enable'},
				{'type': 'text', 'label': 'Menu name', 'name': 'tvheadend_name'},
				{'type': 'text', 'label': 'IP / Host *', 'name': 'tvheadend_host'},
				{'type': 'text', 'label': 'Port *', 'name': 'tvheadend_port'},
				{'type': 'text', 'label': 'Username', 'name': 'tvheadend_username'},
				{'type': 'password', 'label': 'Password', 'name': 'tvheadend_password'}
		]})
		
	@cherrypy.expose()
	def index(self):
		return htpc.LOOKUP.get_template("tvheadend.html").render(scriptname="tvheadend")
	
	@cherrypy.expose()
	@cherrypy.tools.json_out()
	def GetEPG(self, strLimit = "300", strChannel = ""):
		return self.fetch("epg", { 'limit': strLimit, 'start': "0", 'channel': strChannel })
		
	@cherrypy.expose()
	@cherrypy.tools.json_out()
	def GetChannels(self):
		return self.fetch("api/channel/grid", None)
	
	@cherrypy.expose()
	@cherrypy.tools.json_out()
	def GetChannelTags(self):
		return self.fetch("channeltags", { 'op': 'listTags' })
		
	@cherrypy.expose()
	@cherrypy.tools.json_out()
	def DVRAdd(self, strEventID = ""):
		return self.fetch("dvr", { 'eventId': strEventID, 'op': "recordEvent" })
		
	@cherrypy.expose()
	@cherrypy.tools.json_out()
	def DVRDel(self, strEntryID = ""):
		return self.fetch("dvr", { 'entryId': strEntryID, 'op': "cancelEntry" })		
		
	@cherrypy.expose()
	@cherrypy.tools.json_out()
	def DVRList(self, strType = ""):
		return self.fetch("dvrlist_" + strType, None)
	
	def fetch(self, strQuery, rgpData):
		rgpHeaders = {
			'Authorization': "Basic %s" % base64.encodestring("%s:%s" % (htpc.settings.get("tvheadend_username", ""), htpc.settings.get("tvheadend_password", ""))).replace("\n", "")
		}

		strResponse = None
		strData = None
		
		if rgpData != None:
			strData = urllib.urlencode(rgpData)

		try:
			pRequest = urllib2.Request("http://%s:%s/%s" % (htpc.settings.get("tvheadend_host", ""), htpc.settings.get("tvheadend_port", ""), strQuery), data = strData, headers = rgpHeaders)
			strResponse = urllib2.urlopen(pRequest).read()
		except urllib2.HTTPError, e:
			print e

		return json.loads(strResponse)
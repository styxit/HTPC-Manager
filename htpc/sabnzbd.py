from urllib import quote
from htpc.tools import SafeFetchFromUrl

class sabnzbd:
    def __init__(self, host, port, apikey, ssl = 0):
        useSSL = ''
        if int(ssl):
            useSSL = 's'
        self.url = 'http' + useSSL + '://' + host + ':' + str(port) + '/sabnzbd/api?output=json&apikey=' + apikey
        print self.url

    def sendRequest(self,args):
	if args.get('action') == 'history':
	    return self.GetHistory(args.get('limit'))
	if args.get('action') == 'status':
	    return self.GetStatus()
	if args.get('action') == 'warnings':
	    return self.GetWarnings()
	if args.get('action') == 'pause' or args.get('action') == 'resume':
	    return self.TogglePause(args.get('action'))
	if args.get('action') == 'addnzb':
	    return self.AddNzbFromUrl(args.get('nzb_url'), args.get('nzb_category'))
	if args.get('action') == 'delete':
	    return self.DeleteNzb(args.get('id'))
	if args.get('action') == 'deletehistory':
	    return self.DeleteHistory(args.get('id'))
	if args.get('action') == 'retry':
	    return self.Retry(args.get('id'))
	if args.get('action') == 'categories':
	    return self.GetCategories()
	if args.get('action') == 'change_cat':
	    return self.ChangeCategory(args.get('id'), args.get('value'))
	if args.get('action') == 'speed':
	    return self.SetSpeed(args.get('value'))

    def GetHistory(self,limit):
	return SafeFetchFromUrl(self.url + '&mode=history&limit=' + str(limit))

    def GetStatus(self):
	return SafeFetchFromUrl(self.url + '&mode=queue')

    def GetWarnings(self):
	return SafeFetchFromUrl(self.url + '&mode=warnings')

    def TogglePause(self,mode):
	return SafeFetchFromUrl(self.url + '&mode=' + mode)

    def AddNzbFromUrl(self,url, cat):
	category = ''
	if cat:
	    category = '&cat=' + str(cat)
	return SafeFetchFromUrl(self.url + '&mode=addurl&name=' + quote(url) + category)

    def DeleteNzb(self,id):
	return SafeFetchFromUrl(self.url + '&mode=queue&name=delete&value=' + id)

    def DeleteHistory(self,id):
	return tools.tchFromUrl(self.url + '&mode=history&name=delete&value=' + id)

    def Retry(self,id):
	return SafeFetchFromUrl(self.url + '&mode=retry&value=' + id)

    def GetCategories(self):
	return SafeFetchFromUrl(self.url + '&mode=get_cats')

    def ChangeCategory(self,id, cat):
	return SafeFetchFromUrl(self.url + '&mode=change_cat&value=' + id + '&value2=' + cat)

    def SetSpeed(self,speed):
	return SafeFetchFromUrl(self.url + '&mode=config&name=speedlimit&value=' + str(speed))

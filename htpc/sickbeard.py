from urllib import quote
from htpc.tools import SafeFetchFromUrl

class sickbeard:
    def __init__(self,host,port,apikey):
	self.url = 'http://' + host + ':' + str(port) + '/api/' + apikey + '/?cmd=';

    def sendRequest(self,args):
        if args.get('action') == 'showlist':
            return self.GetShowList()
        if args.get('action') == 'nextaired':
            return self.GetNextAired()
        if args.get('action') == 'getposter':
            return self.GetPoster(args.get('tvdbid'))
        if args.get('action') == 'history':
            return self.GetHistory(args.get('limit'))
        if args.get('action') == 'searchtvdb':
            return self.SearchShow(args.get('query'))
        if args.get('action') == 'logs':
            return self.GetLogs()
        if args.get('action') == 'addshow':
            return self.AddShow(args.get('tvdbid'))
        if args.get('action') == 'getshow':
            return self.GetShow(args.get('tvdbid'))

    def GetShowList(self):
	return SafeFetchFromUrl(self.url + 'shows&sort=name')

    def GetNextAired(self):
	return SafeFetchFromUrl(self.url + 'future')

    def GetPoster(self,tvdbid):
	return SafeFetchFromUrl(self.url + 'show.getposter&tvdbid=' + str(tvdbid))

    def GetHistory(self,limit):
	return SafeFetchFromUrl(self.url + 'history&limit=' + limit)

    def GetLogs(self):
	return SafeFetchFromUrl(self.url + 'logs&min_level=info')

    def AddShow(self,tvdbid):
	return SafeFetchFromUrl(self.url + 'show.addnew&tvdbid=' + tvdbid)

    def GetShow(self,tvdbdid):
	return SafeFetchFromUrl(self.url + 'show&tvdbid=' + tvdbdid)

    def SearchShow(self,seriename):
	seriename = quote(seriename)
	return SafeFetchFromUrl('http://www.thetvdb.com/api/GetSeries.php?seriesname=' + seriename)

from htpc.tools import *

class couchpotato:
    def __init__(self, host, port, apikey):
        self.url = 'http://' + host + ':' + str(port) + '/api/' + apikey + '/';
        
    def sendRequest(self, args):
        if args.get('action') == 'movielist':
            return self.GetMovieList()
        if args.get('action') == 'notificationlist':
            return self.GetNotificationList()
        if args.get('action') == 'moviedelete':
            return self.DeleteMovie(args.get('id'))
        if args.get('action') == 'movierefresh':
            return self.RefreshMovie(args.get('id'))
        if args.get('action') == 'moviesearch':
            return self.SearchMovie(args.get('q'))
        if args.get('action') == 'movieadd':
            return self.AddMovie(args.get('profile_id'), args.get('identifier'), args.get('title'))

    def GetMovieList(self):
        return SafeFetchFromUrl(self.url + 'movie.list')

    def GetNotificationList(self):
        return SafeFetchFromUrl(self.url + 'notification.list')
    
    def DeleteMovie(self, id):
        return SafeFetchFromUrl(self.url + 'movie.delete/?id=' + id)
    
    def RefreshMovie(self, id):
        return SafeFetchFromUrl(self.url + 'movie.refresh/?id=' + id)
    
    def SearchMovie(self, q):
        return SafeFetchFromUrl(self.url + 'movie.search/?q=' + q)
    
    def AddMovie(self, profile_id, identifier, title):
        return SafeFetchFromUrl(self.url + 'movie.add/?profile_id=' + str(profile_id) + '&identifier=' + identifier + '&title=' + title)
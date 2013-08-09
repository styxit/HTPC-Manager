var profiles = $('<select>')
$(document).ready(function() {
    $(window).trigger('hashchange')
    getMovieList()
    getNotificationList()
    getHistory()
    $('#searchform').submit(function(e) {
        e.preventDefault()
        var search = $('#moviename').val()
        if (search) searchMovie(search)
    })
    $.get(WEBDIR + 'couchpotato/GetProfiles', function(data) {
        if (data == null) return
        $.each(data.list, function(i, item) {
            if (!item.hide) profiles.append($('<option>').val(item.id).text(item.label))
        })
    })
})

function getMovieList() {
    var wanted = $('#wanted-grid').empty()
    $('.spinner').show()
    $.getJSON(WEBDIR + 'couchpotato/GetMovieList', function (result) {
        $('.spinner').hide()
        if (result == null || result.total == 0) {
            wanted.append($('<li>').html('No wanted movies found'))
            return
        }
        $.each(result.movies, function(i, movie) {
            var link = $('<a>').attr('href', '#').click(function(e) {
                e.preventDefault()
                showMovie(movie)
            })
            var src = WEBDIR + 'couchpotato/GetImage?w=100&h=150&url=' + movie.library.info.images.poster[0]
            link.append($('<img>').attr('src', src).addClass('thumbnail'))
            if (movie.releases.length > 0) {
                link.append($('<i>').attr('title', 'Download').addClass('icon-white icon-download status'));
            }
            var title = shortenText(movie.library.info.original_title, 12)
            link.append($('<h6>').addClass('movie-title').html(title))
            wanted.append($('<li>').attr('id', movie.id).append(link))
        })
    })
}
function showMovie(movie) {
    if (movie.library) {
        var info = movie.library.info
        var plot = movie.library.plot
        var year = movie.library.year
    } else {
        var info = movie
        var plot = movie.plot
        var year = movie.year
    }
    var src = 'holder.js/154x231/text:No artwork'
    if (info.images.poster && info.images.poster[0]) {
        src = WEBDIR + 'couchpotato/GetImage?w=154&h=231&url=' + info.images.poster[0]
    }
    var modalImg = $('<img>').attr('src', src).addClass('thumbnail pull-left')

    var modalInfo = $('<div>').addClass('modal-movieinfo')
    if (info.runtime) {
        modalInfo.append($('<p>').html('<b>Runtime:</b> ' + parseSec(info.runtime)))
    }
    modalInfo.append($('<p>').html('<b>Plot:</b> ' + plot))
    if (info.directors) {
        modalInfo.append($('<p>').html('<b>Director:</b> ' + info.directors))
    }
    if (info.genres) {
        modalInfo.append($('<p>').html('<b>Genre:</b> ' + info.genres))
    }

    if (info.rating && info.rating.imdb) {
        modalInfo.append(
            $('<div>').raty({
                readOnly: true,
                path: WEBDIR+'img',
                score: (info.rating.imdb[0] / 2),
            })
        )
    }

    var titles = $('<select>').attr('id', 'titles')
    if (movie.library && movie.library.titles) {
        $.each(movie.library.titles, function(i, item) {
            titles.append($('<option>').text(item.title).val(item.title).prop('selected', item.default))
        })
    } else {
        $.each(info.titles, function(i, item) {
            titles.append($('<option>').text(item).val(item))
        })
    }

    profiles.unbind()
    var title = info.original_title + ' ('+year+')'
    if (movie.library) {
        profiles.change(function() {
            editMovie(movie.id, profiles.val(), titles.val())
        }).val(movie.profile_id)
        titles.change(function() {
            editMovie(movie.id, profiles.val(), titles.val())
        })
        var modalButtons = {
            'Delete' : function() {
                if (confirm('Do you want to delete: ' + title)) {
                    deleteMovie(movie.id, title)
                    hideModal()
                }
            },
            'Refresh' : function() {
                refreshMovie(movie.id, title)
                hideModal()
            }
        }
    } else {
        var modalButtons = {
            'Add' : function() {
                addMovie(movie.imdb, profiles.val(), titles.val())
                hideModal()
            }
        }
    }
    if (info.imdb) {
        $.extend(modalButtons,{
            'IMDb' : function() {
                window.open('http://www.imdb.com/title/'+info.imdb,'IMDb')
            }
        })
    }
    modalInfo.append(titles, profiles)

    if (movie.releases && movie.releases.length > 0) {
        var releaseTable = $('<table>').addClass('table table-striped table-hover')
        $.each(movie.releases, function(i, item){
            if (item.info.id === undefined) return
            releaseTable.append(
                $('<tr>').append(
                    $('<td>').append(
                        $('<a>').attr('href', '#').append(
                            $('<i>').attr('title', 'Download').addClass('icon-download')
                        ).click(function(e) {
                            e.preventDefault()
                            hideModal()
                            $.getJSON('DownloadRelease/?id='+item.id)
                        }),
                        $('<a>').attr('href','DownloadRelease?id='+item.info.id).append(
                            $('<i>').attr('title', 'Ignore').addClass('icon-remove-sign')
                        ).click(function(e) {
                            e.preventDefault()
                            $(this).closest('tr').toggleClass('ignore')
                            $.getJSON('IgnoreRelease/?id='+item.id)
                        })
                    ),
                    $('<td>').append(
                        $('<a>').attr('href', '#').text(item.info.name).click(function(e) {
                            e.preventDefault()
                            window.open(item.info.detail_url)
                        })
                    ),
                    $('<td>').html(bytesToSize(item.info.size*1000000))
                ).toggleClass('ignore', item.status_id == 3)
            )
        })
        $.extend(modalButtons,{
            'Releases' : function() {
                $('.modal-body').html(releaseTable)
            }
        })
    }

    if (info.images.backdrop.length > 0) {
        var backdrop = WEBDIR + 'couchpotato/GetImage?w=675&h=400&o=10&url=' + encodeURIComponent(info.images.backdrop)
        $('.modal-fanart').css({
            'background-image' : 'url('+backdrop+')'
        })
    }

    var modalBody = $('<div>').append(modalImg, modalInfo)
    showModal(title + ' ('+year+')',  modalBody, modalButtons)
    Holder.run()
}
function addMovie(movieid, profile, title) {
    var data = {
        movieid: movieid,
        profile: profile,
        title: encodeURIComponent(title)
    }
    $.getJSON(WEBDIR + 'couchpotato/AddMovie', data, function (result) {
        if (result == null || result.success != true) return
        setTimeout(function() {
            getMovieList()
            $('a[href=#wanted]').tab('show')
        }, 1000)
    })
}
function editMovie(id, profile, title) {
    $.getJSON(WEBDIR + 'couchpotato/EditMovie', {
        id: id,
        profile: profile,
        title: encodeURIComponent(title)
    }, function (result) {
        if (result.success) {
            notify('CouchPotato', 'Profile changed', 'info')
            getMovieList()
        } else {
            notify('CouchPotato', 'An error occured.', 'error')
        }
    })
}
function deleteMovie(id, name) {
    $.getJSON(WEBDIR + 'couchpotato/DeleteMovie', {id: id}, function (result) {
        if (result.success) {
            $('#' + id).fadeOut()
        } else {
            notify('CouchPotato', 'An error occured.', 'error')
        }
    })
}
function refreshMovie(id, name) {
    $.getJSON(WEBDIR + 'couchpotato/RefreshMovie', {id: id}, function (result) {
        if (result.success) {
            notify('CouchPotato', 'Refreshing: ' + name, 'info')
        } else {
            notify('CouchPotato', 'An error occured.', 'error')
        }
    })
}
function searchMovie(q) {
    var grid = $('#result-grid').empty()
    $('a[href=#result]').tab('show')
    $('.spinner').show()
    $.getJSON(WEBDIR + 'couchpotato/SearchMovie', {
        q: encodeURIComponent(q)
    }, function (result) {
        $('.spinner').hide()
        $.each(result.movies, function(i, movie) {
            var link = $('<a>').attr('href', '#').click(function(e) {
                e.preventDefault()
                showMovie(movie)
            })
            var src = 'holder.js/100x150/text:No artwork'
            if (movie.images.poster[0]) {
                src = WEBDIR + 'couchpotato/GetImage?w=100&h=150&url=' + movie.images.poster[0]
            }
            link.append($('<img>').attr('src', src).addClass('thumbnail'))
            var title = shortenText(movie.original_title, 12)
            link.append($('<h6>').addClass('movie-title').html(title))
            grid.append($('<li>').attr('id', movie.id).append(link))
        })
        Holder.run()
    })
}
function getNotificationList() {
    $.getJSON(WEBDIR + 'couchpotato/GetNotificationList', function (result) {
        if (result == null) return
        $.each(result.notifications, function(i, item) {
            if (!item.read) notify('Notifications', item.message, 'info')
        })
    })
}
function getHistory() {
    $.getJSON(WEBDIR + 'couchpotato/GetNotificationList', function (result) {
        if (result == null) return
        $.each(result.notifications, function(i, item) {
            $('#history-grid').prepend(
                $('<tr>').append(
                    $('<td>').text(parseDate(item.added)),
                    $('<td>').text(item.message)
                )
            )
        })
    })
}
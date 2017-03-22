$(document).ready(function () {
    loadRecentMovies()
    loadRecentTVshows()
    loadRecentAlbums()
    loadRecentMoviesPlex()
    loadRecentTVshowsPlex()
    loadRecentAlbumsPlex()
    loadDownloadHistory()
    loadNZBGetDownloadHistory()
    loadWantedMovies()
    loadNextAired()
    loadNZBDroneCalendar()
})

function loadRecentMovies () {
    if (!$('#movie-carousel').length) return
    $.getJSON(WEBDIR + 'xbmc/GetRecentMovies',function (data) {
        if (data === null || data.movies === null) return
        $.each(data.movies, function (i, movie) {
            var itemDiv = $('<div>').addClass('item carousel-item')

            if (i === 0) itemDiv.addClass('active')

            var src = WEBDIR + 'xbmc/GetThumb?h=240&w=430&thumb='+encodeURIComponent(movie.fanart)
            itemDiv.attr('style', 'background-image: url("' + src + '")')

            itemDiv.append($('<div>').addClass('carousel-caption').click(function() {
                location.href = WEBDIR +'xbmc/#movies'
            }).hover(function() {
                var text = $(this).children('p').stop().slideToggle()
            }).append(
                $('<h4>').html(movie.title + ' (' + movie.year + ')'),
                $('<p>').html(
                    '<b>Runtime</b>: ' + parseSec(movie.runtime) + '<br />' +
                    '<b>Genre</b>: ' + movie.genre.join(', ') + '<br />' +
                    movie.plot
                ).hide()
            ))
            $('#movie-carousel .carousel-inner').append(itemDiv)
        })
        $('#movie-carousel').show()
    })
}
function loadRecentTVshows () {
    if (!$('#tvshow-carousel').length) return
    $.getJSON(WEBDIR + 'xbmc/GetRecentShows', function (data) {
        if (data === null) return
        $.each(data.episodes, function (i, episode) {
            var itemDiv = $('<div>').addClass('item carousel-item')

            if (i == 0) itemDiv.addClass('active')

            var src = WEBDIR + "xbmc/GetThumb?h=240&w=430&thumb="+encodeURIComponent(episode.fanart)
            itemDiv.attr('style', 'background-image: url("' + src + '")')

            itemDiv.append($('<div>').addClass('carousel-caption').click(function() {
                location.href = 'xbmc/#shows'
            }).hover(function() {
                var text = $(this).children('p').stop().slideToggle()
            }).append(
                $('<h4>').html(episode.showtitle + ': ' + episode.label),
                $('<p>').html(
                    '<b>Runtime</b>: ' + parseSec(episode.runtime) + '<br />' + episode.plot
                ).hide()
            ))
            $('#tvshow-carousel .carousel-inner').append(itemDiv)
        })
        $('#tvshow-carousel').show()
    })
}
function loadRecentAlbums () {
    if (!$('#albums-content').length) return
    $.getJSON(WEBDIR + 'xbmc/GetRecentAlbums/4', function (data) {
        if (data === null) return
        $.each(data.albums, function (i, album) {
            var imageSrc = WEBDIR + 'js/libs/holder.js/45x45/text:No cover'
            if (album.thumbnail != '') {
                imageSrc = WEBDIR + 'xbmc/GetThumb?h=45&w=45&thumb='+encodeURIComponent(album.thumbnail)
            }

            var label = album.label
            if (album.year != '0') label += ' (' + album.year + ')'

            $('#albums-content').append(
                $('<li>').addClass('media').append(
                    $('<img>').addClass('media-object pull-left img-rounded').attr('src', imageSrc),
                    $('<div>').addClass('media-body').append(
                        $('<h5>').addClass('media-heading').html(label),
                        $('<p>').text(album.artist[0])
                    )
                ).click(function(e) {
                    location.href = 'xbmc/#albums'
                })
            )
        })
        Holder.run()
        $('#albums-content').parent().show()
    })
}

function loadRecentMoviesPlex () {
    if (!$('#movie-carousel-plex').length) return
    $.getJSON(WEBDIR + 'plex/GetRecentMovies',function (data) {
        if (data === null) return
        $.each(data.movies, function (i, movie) {
            var itemDiv = $('<div>').addClass('item carousel-item')

            if (i === 0) itemDiv.addClass('active')

            var src = WEBDIR + 'plex/GetThumb?h=240&w=430&thumb='+encodeURIComponent(movie.fanart)
            itemDiv.attr('style', 'background-image: url("' + src + '")')

            itemDiv.append($('<div>').addClass('carousel-caption').click(function() {
                location.href = WEBDIR + 'plex/#movies'
            }).hover(function() {
                var text = $(this).children('p').stop().slideToggle()
            }).append(
                $('<h4>').html(movie.title + ' (' + movie.year + ')'),
                $('<p>').html(
                    '<b>Runtime</b>: ' + parseSec(movie.runtime) + '<br />' +
                    '<b>Genre</b>: ' + movie.genre.join(', ') + '<br />' +
                    movie.plot
                ).hide()
            ))
            $('#movie-carousel-plex .carousel-inner').append(itemDiv)
        })
        $('#movie-carousel-plex').show()
    })
}
function loadRecentTVshowsPlex () {
    if (!$('#tvshow-carousel-plex').length) return
    $.getJSON(WEBDIR + 'plex/GetRecentShows', function (data) {
        if (data === null) return
        $.each(data.episodes, function (i, episode) {
            var itemDiv = $('<div>').addClass('item carousel-item')

            if (i == 0) itemDiv.addClass('active')

            var src = WEBDIR + "plex/GetThumb?h=240&w=430&thumb="+encodeURIComponent(episode.fanart)
            itemDiv.attr('style', 'background-image: url("' + src + '")')

            itemDiv.append($('<div>').addClass('carousel-caption').click(function() {
                location.href = 'plex/#shows'
            }).hover(function() {
                var text = $(this).children('p').stop().slideToggle()
            }).append(
                $('<h4>').html(episode.showtitle + ': ' + episode.label),
                $('<p>').html(
                    '<b>Runtime</b>: ' + parseSec(episode.runtime) + '<br />' + episode.plot
                ).hide()
            ))
            $('#tvshow-carousel-plex .carousel-inner').append(itemDiv)
        })
        $('#tvshow-carousel-plex').show()
    })
}
function loadRecentAlbumsPlex () {
    if (!$('#albums-content-plex').length) return
    $.getJSON(WEBDIR + 'plex/GetRecentAlbums', function (data) {
        if (data === null) return
        $.each(data.albums, function (i, album) {
            var imageSrc = WEBDIR + 'js/libs/holder.js/45x45/text:No cover'
            if (album.thumbnail != '') {
                imageSrc = WEBDIR + 'plex/GetThumb?h=45&w=45&thumb='+encodeURIComponent(album.thumbnail)
            }

            var label = album.title
            if (album.year != '0') label += ' (' + album.year + ')'
            console.log(album.artist)

            $('#albums-content-plex').append(
                $('<li>').addClass('media').append(
                    $('<img>').addClass('media-object pull-left img-rounded').attr('src', imageSrc),
                    $('<div>').addClass('media-body').append(
                        $('<h5>').addClass('media-heading').html(label),
                        $('<p>').text(album.artist)
                    )
                ).click(function(e) {
                    location.href = 'plex/#albums'
                })
            )
        })
        Holder.run()
        $('#albums-content-plex').parent().show()
    })
}
function loadDownloadHistory() {
    if (!$('#downloads_table_body').length) return
    $.getJSON(WEBDIR + 'sabnzbd/GetHistory?limit=5', function (data) {
        $.each(data.history.slots, function (i, slot) {
            var status = $('<i>').addClass('icon-ok')
            if (slot.status == 'Failed') {
                status.removeClass().addClass('icon-remove').attr('title', slot.fail_message)
            }
            $('#downloads_table_body').append(
                $('<tr>').append(
                    $('<td>').html(slot.name).attr('title', slot.name),
                    $('<td>').html(status)
                )
            )
        })
    })
}
function loadNZBGetDownloadHistory() {
    if (!$('#nzbgetdownloads_table_body').length) return
    $.getJSON(WEBDIR + 'nzbget/GetHistory?limit=5', function (data) {
        $.each(data.result, function (i, slot) {
            var status = $('<i>').addClass('icon-ok')
            if (slot.ParStatus == 'FAILURE') {
                status.removeClass().addClass('icon-remove').attr('title', slot.fail_message)
            }
            $('#nzbgetdownloads_table_body').append(
                $('<tr>').append(
                    $('<td>').html(slot.Name).attr('title', slot.Name),
                    $('<td>').html(status)
                )
            )
        })
    })
}
function loadWantedMovies() {
    if (!$('#wantedmovies_table_body').length) return
    $.getJSON(WEBDIR + 'couchpotato/GetMovieList/active/5', function (result) {
        if (result === null) {
            $('#wantedmovies_table_body').append(
                $('<tr>').append($('<td>').html('No wanted movies found').attr('colspan', '2'))
            )
            return
        }
        $.each(result.movies, function(i, item) {
            $('#wantedmovies_table_body').append(
                $('<tr>').append(
                    $('<td>').html(item.info.original_title),
                    $('<td>').addClass('alignright').html(item.info.year)
                )
            )
        })
    })
}
function loadNextAired(options) {
    if (!$('#nextaired_table_body').length) return
    $.getJSON(WEBDIR + 'sickbeard/GetNextAired', function (result) {
        if (result === null || result.data.soon.length === 0) {
            $('#nextaired_table_body').append(
                $('<tr>').append($('<td>').html('No future episodes found'))
            )
            return
        }
        var soonaired = result.data.soon
        var todayaired = result.data.today
        var nextaired = todayaired.concat(soonaired)
        $.each(nextaired, function (i, tvshow) {
            if (i >= 5) return
            var name = $('<a>').attr('href', 'sickbeard/view/' + tvshow.tvdbid).html(tvshow.show_name)
            $('#nextaired_table_body').append(
                $('<tr>').append(
                    $('<td>').append(name),
                    $('<td>').html(tvshow.ep_name),
                    $('<td>').html(tvshow.airdate)
                )
            )
        })
    })
}

function loadNZBDroneCalendar(options) {
    if (!$('#calendar_table_body').length) return
    $.getJSON(WEBDIR + 'nzbdrone/Calendar', function (result) {
        $.each(result, function (i, cal) {
          if (i >= 5) return
            var name = $('<a>').attr('href', 'nzbdrone/View/' + cal.seriesId + '/' + cal.series.tvdbId + '#' + cal.seasonNumber).html(cal.series.title)
            var row = $('<tr>'); 
            row.append(
            $('<td>').append(name),
            $('<td>').text(cal.title),
            $('<td>').text(moment(cal.airDateUtc).fromNow())
            )
     
            $('#calendar_table_body').append(row);
        });

    });
}

$(document).ready(function () {
    loadRecentMovies()
    loadRecentTVshows()
    loadRecentAlbums()
    loadDownloadHistory()
    loadNZBGetDownloadHistory()
    loadWantedMovies()
    loadNextAired()
    loadSamsungTvRemote()
})
    
function loadRecentMovies () {
    if (!$('#movie-carousel').length) return
    $.getJSON(WEBDIR + 'xbmc/GetRecentMovies',function (data) {
        if (data == null) return
        $.each(data.movies, function (i, movie) {
            var itemDiv = $('<div>').addClass('item carousel-item')

            if (i == 0) itemDiv.addClass('active')

            var src = WEBDIR + 'xbmc/GetThumb?h=240&w=430&thumb='+encodeURIComponent(movie.fanart)
            itemDiv.attr('style', 'background-image: url("' + src + '")')

            itemDiv.append($('<div>').addClass('carousel-caption').click(function() {
                location.href = 'xbmc/#movies'
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
        if (data == null) return
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
        if (data == null) return
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
            if (slot.ParStatus == 'Failed') {
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
    $.getJSON(WEBDIR + 'couchpotato/GetMovieList?limit=5', function (result) {
        if (result == null) {
            $('#wantedmovies_table_body').append(
                $('<tr>').append($('<td>').html('No wanted movies found').attr('colspan', '2'))
            )
            return
        }
        $.each(result.movies, function(i, item) {
            $('#wantedmovies_table_body').append(
                $('<tr>').append(
                    $('<td>').html(item.library.info.original_title),
                    $('<td>').addClass('alignright').html(item.library.year)
                )
            )
        })
    })
}
function loadNextAired(options) {
    if (!$('#nextaired_table_body').length) return
    $.getJSON(WEBDIR + 'sickbeard/GetNextAired', function (result) {
        if (result == null || result.data.soon.legth == 0) {
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



function loadSamsungTvRemote() {
    //$("#samsungt").html('<h3>TV remote</h3><table class="samsung_tvremote table"><tbody><tr><td><button class="btn text-center" data-player-control="KEY_POWEROFF"><i class="icon-off"></i></button></td><td>&nbsp;</td><td><button class="btn" data-player-control="KEY_SOURCE">Source</button></td></tr><tr><td>&nbsp;</td><td><button class="btn" data-player-control="KEY_HDMI">HDMI</button></td><td>&nbsp;</td></tr><tr><td><button class="btn" data-player-control="KEY_1">1</button></td><td><button class="btn" data-player-control="KEY_2">2</button></td><td><button class="btn" data-player-control="KEY_3">3</button></td></tr><tr><td><button class="btn" data-player-control="KEY_4">4</button></td><td><button class="btn" data-player-control="KEY_5">5</button></td><td><button class="btn" data-player-control="KEY_6">6</button></td></tr><tr><td><button class="btn" data-player-control="KEY_7">7</button></td><td><button class="btn" data-player-control="KEY_8">8</button></td><td><button class="btn" data-player-control="KEY_9">9</button></td></tr><tr><td><button id="ttxmix" class="btn" data-player-control="KEY_TT_MIX">TTX/Mix</button></td><td><button class="btn" data-player-control="KEY_0">0</button></td><td><button class="btn" data-player-control="KEY_PRECH">Pre-Ch</button></td></tr><tr><td><button class="btn" data-player-control="KEY_VOLUP">Vol &nbsp;<i class="icon-plus"></i></button></td><td><button class="btn" style="font-size:14px" data-player-control="KEY_MUTE"><i class="icon-volume-off"></i><i class="icon-remove"></i></button></td><td><button class="btn" data-player-control="KEY_CHUP">P &nbsp;<i class="icon-chevron-up"></button></td></tr><tr><td><button class="btn" data-player-control="KEY_VOLDOWN">Vol &nbsp;<i class="icon-minus"></i></button></td><td><button class="btn" data-player-control="KEY_CH_LIST">Ch List</button></td><td><button class="btn" data-player-control="KEY_CHDOWN">P &nbsp;<i class="icon-chevron-down"></i></button></td></tr><tr><td><button class="btn" data-player-control="KEY_CONTENTS">Content</button></td><td><button class="btn" data-player-control="KEY_MENU">Menu</button></td><td><button class="btn" data-player-control="KEY_GUIDE">Guide</button></td></tr><tr><td><button class="btn" data-player-control="KEY_TOOLS">Tools<a/></td><td><button class="btn" data-player-control="KEY_UP"><i class="icon-arrow-up"></i></button></td><td><button class="btn" data-player-control="KEY_INFO">Info</button></td></tr><tr><td><button class="btn" data-player-control="KEY_LEFT"><i class="icon-arrow-left"></i></button></td><td><button class="btn" data-player-control="KEY_ENTER">Enter</button></td><td><button class="btn" data-player-control="KEY_RIGHT"><i class="icon-arrow-right"></i></button></td></tr><tr><td><button class="btn" data-player-control="KEY_RETURN">Return</button></td><td><button class="btn" data-player-control="KEY_DOWN"><i class="icon-arrow-down"></i></button></td><td><button class="btn" data-player-control="KEY_EXIT">Exit</button></td></tr><tr><td colspan=3><table id="lettertable" width="100%" style="text-align: center;"><td><button class="btn btn2 btn-red" data-player-control="KEY_RED">A</button></td><td><button class="btn btn2 btn-green" data-player-control="KEY_GREEN">B</button></td><td><button class="btn btn2 btn-yellow" data-player-control="KEY_YELLOW">C</button></td><td><button class="btn btn2 btn-blue" data-player-control="KEY_CYAN">D</button></td></table></td></tr><tr><td><button class="btn" data-player-control="KEY_W_LINK"><i class="icon-globe"></i></button></td><td><button class="btn" data-player-control="KEY_RSS"><i class="icon-search"></i></button></td><td><button class="btn" data-player-control="KEY_MTS">3D</button></td></tr><tr><td><button class="btn" data-player-control="KEY_HELP">AD<a/></td><td><button class="btn" data-player-control="KEY_PICTURE_SIZE">P Size</button></td><td><button class="btn" data-player-control="KEY_CAPTION">Subt</button></td></tr><tr><td><button class="btn" data-player-control="KEY_REWIND"><i class="icon-backward"></i></button></td><td><button class="btn" data-player-control="KEY_PAUSE"><i class="icon-pause"></i></button></td><td><button class="btn" data-player-control="KEY_FF"><i class="icon-forward"></i></button></td></tr><tr><td><button class="btn" data-player-control="KEY_REC">REC<i class="icon-record"></button></td><td><button class="btn" data-player-control="KEY_PLAY"><i class="icon-play"></i></button></td><td><button class="btn" data-player-control="KEY_STOP"><i class="icon-stop"></button></td></tr></tbody></table>')
    $("#samsungt").html('<h3>Tv Remote</h3><table class="samsung_tvremote table"><tbody><tr><td><button class="btn text-center" data-player-control="KEY_POWEROFF"><i class="icon-off"></i></button></td><td>&nbsp;</td><td><button class="btn" data-player-control="KEY_SOURCE">Source</button></td></tr><tr><td>&nbsp;</td><td><button class="btn" data-player-control="KEY_HDMI">HDMI</button></td><td>&nbsp;</td></tr><tr><td><button class="btn" data-player-control="KEY_1">1</button></td><td><button class="btn" data-player-control="KEY_2">2</button></td><td><button class="btn" data-player-control="KEY_3">3</button></td></tr><tr><td><button class="btn" data-player-control="KEY_4">4</button></td><td><button class="btn" data-player-control="KEY_5">5</button></td><td><button class="btn" data-player-control="KEY_6">6</button></td></tr><tr><td><button class="btn" data-player-control="KEY_7">7</button></td><td><button class="btn" data-player-control="KEY_8">8</button></td><td><button class="btn" data-player-control="KEY_9">9</button></td></tr><tr><td><button id="ttxmix" class="btn" data-player-control="KEY_TT_MIX">TTX/Mix</button></td><td><button class="btn" data-player-control="KEY_0">0</button></td><td><button class="btn" data-player-control="KEY_PRECH">Pre-Ch</button></td></tr><tr><td><button class="btn" data-player-control="KEY_VOLUP">Vol &nbsp;<i class="icon-plus"></i></button></td><td><button class="btn" style="font-size:14px" data-player-control="KEY_MUTE"><i class="icon-volume-off"></i><i class="icon-remove"></i></button></td><td><button class="btn" data-player-control="KEY_CHUP">P &nbsp;<i class="icon-chevron-up"></button></td></tr><tr><td><button class="btn" data-player-control="KEY_VOLDOWN">Vol &nbsp;<i class="icon-minus"></i></button></td><td><button class="btn" data-player-control="KEY_CH_LIST">Ch List</button></td><td><button class="btn" data-player-control="KEY_CHDOWN">P &nbsp;<i class="icon-chevron-down"></i></button></td></tr><tr><td><button class="btn" data-player-control="KEY_CONTENTS">Content</button></td><td><button class="btn" data-player-control="KEY_MENU">Menu</button></td><td><button class="btn" data-player-control="KEY_GUIDE">Guide</button></td></tr><tr><td><button class="btn" data-player-control="KEY_TOOLS">Tools<a/></td><td><button class="btn" data-player-control="KEY_UP"><i class="icon-arrow-up"></i></button></td><td><button class="btn" data-player-control="KEY_INFO"><i class="icon-info"></i></button></td></tr><tr><td><button class="btn" data-player-control="KEY_LEFT"><i class="icon-arrow-left"></i></button></td><td><button class="btn" data-player-control="KEY_ENTER">Enter</button></td><td><button class="btn" data-player-control="KEY_RIGHT"><i class="icon-arrow-right"></i></button></td></tr><tr><td><button class="btn" data-player-control="KEY_RETURN"><i class="icon-undo"></i></button></td><td><button class="btn" data-player-control="KEY_DOWN"><i class="icon-arrow-down"></i></button></td><td><button class="btn" data-player-control="KEY_EXIT">Exit</button></td></tr><tr><td colspan=3><table id="lettertable" width="100%" style="text-align: center;"><td><button class="btn btn2 btn-red" data-player-control="KEY_RED">A</button></td><td><button class="btn btn2 btn-green" data-player-control="KEY_GREEN">B</button></td><td><button class="btn btn2 btn-yellow" data-player-control="KEY_YELLOW">C</button></td><td><button class="btn btn2 btn-blue" data-player-control="KEY_CYAN">D</button></td></table></td></tr><tr><td><button class="btn" data-player-control="KEY_W_LINK"><i class="icon-globe"></i></button></td><td><button class="btn" data-player-control="KEY_RSS"><i class="icon-search"></i></button></td><td><button class="btn" data-player-control="KEY_MTS">3D</button></td></tr><tr><td><button class="btn" data-player-control="KEY_TOPMENU">Emanual</button></td><td><button class="btn" data-player-control="KEY_PICTURE_SIZE">P Size</button></td><td><button class="btn" data-player-control="KEY_CAPTION">Subt</button></td></tr><tr><td><button class="btn" data-player-control="KEY_REWIND"><i class="icon-backward"></i></button></td><td><button class="btn" data-player-control="KEY_PAUSE"><i class="icon-pause"></i></button></td><td><button class="btn" data-player-control="KEY_FF"><i class="icon-forward"></i></button></td></tr><tr><td><button class="btn" data-player-control="KEY_REC"><i class="icon-circle"></button></td><td><button class="btn" data-player-control="KEY_PLAY"><i class="icon-play"></i></button></td><td><button class="btn" data-player-control="KEY_STOP"><i class="icon-stop"></button></td></tr></tbody></table>')
}

$(document).on('click', '#samsungt .samsung_tvremote tr td .btn', function () {
    $.get(WEBDIR + 'samsungtv/sendkey?action='+$(this).attr('data-player-control'));
});

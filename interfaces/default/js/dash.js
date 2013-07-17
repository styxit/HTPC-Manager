$(document).ready(function () {
    loadRecentMovies();
    loadRecentTVshows();
    loadRecentAlbums();
    loadDownloadHistory();
    loadWantedMovies();
    loadNextAired();
});

function loadRecentMovies () {
    if (!$('#movie-carousel').length) return
    $.ajax({
        url: WEBDIR + 'xbmc/GetRecentMovies',
        type: 'get',
        dataType: 'json',
        success: function (data) {
            if (data == null) return;
            $('#movie-carousel').show();
            $.each(data.movies, function (i, movie) {
                var itemDiv = $('<div>').addClass('item carousel-item');

                if (i == 0) itemDiv.addClass('active');

                itemDiv.attr('style', 'background-image: url("' + WEBDIR + 'xbmc/GetThumb?h=240&w=430&thumb='+encodeURIComponent(movie.fanart)+ '");');

                itemDiv.append($('<div>').addClass('carousel-caption').click(function() {
                    location.href = 'xbmc/#movies';
                }).hover(function() {
                    var text = $(this).children('p').slideToggle()
                }).append(
                    $('<h4>').html(movie.title + ' (' + movie.year + ')'),
                    $('<p>').html(
                        '<b>Runtime</b>: ' + parseSec(movie.runtime) + '<br />' + '<b>Genre</b>: ' + movie.genre.join(', ') + '<br />' + movie.plot
                    ).hide()
                ));
                $('#movie-carousel .carousel-inner').append(itemDiv);
            });
        }
    });
}

function loadRecentTVshows () {
    if (!$('#tvshow-carousel').length) return
    $.ajax({
        url: WEBDIR + 'xbmc/GetRecentShows',
        type: 'get',
        dataType: 'json',
        success: function (data) {
            if (data == null) return;
            $('#tvshow-carousel').show();
            $.each(data.episodes, function (i, episode) {
                var itemDiv = $('<div>').addClass('item carousel-item');

                if (i == 0) itemDiv.addClass('active');

                itemDiv.attr('style', "background-image: url(" + WEBDIR + "xbmc/GetThumb?h=240&w=430&thumb="+encodeURIComponent(episode.fanart)+ ");");

                itemDiv.append($('<div>').addClass('carousel-caption').click(function() {
                    location.href = 'xbmc/#shows';
                }).hover(function() {
                    var text = $(this).children('p').slideToggle();
                }).append(
                    $('<h4>').html(episode.showtitle + ': ' + episode.label),
                    $('<p>').html(
                        '<b>Runtime</b>: ' + parseSec(episode.runtime) + '<br />' + episode.plot
                    ).hide()
                ));

                $('#tvshow-carousel .carousel-inner').append(itemDiv);
            });
        }
    });
}

function loadRecentAlbums () {
    if (!$('#albums-content').length) return
    $.ajax({
        url: WEBDIR + 'xbmc/GetRecentAlbums/4',
        type: 'get',
        dataType: 'json',
        success: function (data) {
            if (data == null) return;
            $('#albums-content').parent().show();
            $.each(data.albums, function (i, album) {
                var imageSrc = WEBDIR + 'js/libs/holder.js/45x45/text:No cover';
                if (album.thumbnail != '') {
                    imageSrc = WEBDIR + 'xbmc/GetThumb?h=45&w=45&thumb='+encodeURIComponent(album.thumbnail);
                }

                // Frodo fix artist is now a list. Use the first.
                if($.isArray(album.artist)) album.artist = album.artist[0]

                var year = '';
                if (album.year != '0') year = ' (' + album.year + ')';

                $('#albums-content').append($('<li>').addClass('media').append(
                    $('<img>').addClass('media-object pull-left img-rounded').attr('src', imageSrc),
                    $('<div>').addClass('media-body').append(
                        $('<h5>').addClass('media-heading').html(album.label + year),
                        $('<p>').text(album.artist)
                    )
                ).click(function(e) {
                    location.href = 'xbmc/#albums';
                }));
            });

            Holder.run();
        }
    });
}

function loadDownloadHistory() {
    if (!$('#downloads_table_body').length) return
    $.ajax({
        url: WEBDIR + 'sabnzbd/GetHistory?limit=5',
        type: 'get',
        dataType: 'json',
        success: function (data) {
            $('#downloads_table_body').html('');
            $.each(data.history.slots, function (i, slot) {
                if (slot.status == 'Failed') {
                    var status = $('<i>').addClass('icon-remove');
                    status.attr('title', slot.fail_message);
                } else {
                    var status = $('<i>').addClass('icon-ok');
                }
                var row = $('<tr>')
                row.append($('<td>').html(slot.name).attr('title', slot.name));
                row.append($('<td>').html(status));
                $('#downloads_table_body').append(row);
            });
        }
    });
}

function loadWantedMovies() {
    if (!$('#wantedmovies_table_body').length) return
    $.ajax({
        url: WEBDIR + 'couchpotato/GetMovieList?limit=5',
        type: 'get',
        dataType: 'json',
        success: function (result) {
            if (result == null) {
                var row = $('<tr>')
                row.append($('<td>').html('No wanted movies found').attr('colspan', '2'));
                $('#wantedmovies_table_body').append(row);
                return false;
            }
            $.each(result.movies, function(i, item) {
                var row = $('<tr>');
                row.append($('<td>').html(item.library.info.original_title));
                row.append($('<td>').addClass('alignright').html(item.library.year));

                $('#wantedmovies_table_body').append(row);
            });
        }
    });
}

function loadNextAired(options) {
    if (!$('#nextaired_table_body').length) return
    $.ajax({
        url: WEBDIR + 'sickbeard/GetNextAired',
        type: 'get',
        dataType: 'json',
        success: function (result) {
            if (result == null || result.data.soon.legth == 0) {
                var row = $('<tr>').append($('<td>').html('No future episodes found'));
                $('#nextaired_table_body').append(row);
                return false;
            }

            var soonaired = result.data.soon;
            var todayaired = result.data.today;
            var nextaired = todayaired.concat(soonaired);

            $.each(nextaired, function (i, tvshow) {
                if (i > 5) return false;
                var name = $('<a>').attr('href', WEBDIR + 'sickbeard/view/' + tvshow.tvdbid).html(tvshow.show_name);
                var row = $('<tr>').append(
                    $('<td>').append(name),
                    $('<td>').html(tvshow.ep_name),
                    $('<td>').html(tvshow.airdate)
                );
                $('#nextaired_table_body').append(row);
            });
        }
    });
}

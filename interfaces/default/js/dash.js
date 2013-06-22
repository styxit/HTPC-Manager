$(document).ready(function () {
    loadRecentMovies();
    loadRecentTVshows();
    loadRecentAlbums();
    loadDownloadHistory();
    loadWantedMovies(5);
    loadNextAired({limit: 5});
});

function loadRecentMovies () {
    $.ajax({
        url: WEBDIR + 'xbmc/GetRecentMovies',
        type: 'get',
        dataType: 'json',
        success: function (data) {
            if (data == null) return;
            $('#movie-carousel').show();
            $.each(data.movies, function (i, movie) {
                var itemDiv = $('<div>').addClass('item');
                if (i == 0) itemDiv.addClass('active');
                
                itemDiv.attr('style', 'background-image: url("' + WEBDIR + 'xbmc/GetThumb?h=240&w=430&thumb='+encodeURIComponent(movie.fanart)+ '");');

                var itemCaption = $('<div>').addClass('carousel-caption').click(function() {
                    xbmcShowMovie(movie);
                });
                itemCaption.append($('<h4>').html(movie.title + ' (' + movie.year + ')'));
                itemCaption.append($('<p>').html(movie.plot).hide());
                itemCaption.hover(function() {
                    $(this).children('p').slideToggle();
                });
                itemDiv.append(itemCaption);
                $('#movie-carousel .carousel-inner').append(itemDiv);
            });
        }
    });
}

function loadRecentTVshows () {
    $.ajax({
        url: WEBDIR + 'xbmc/GetRecentShows',
        type: 'get',
        dataType: 'json',
        success: function (data) {
            if (data == null) return;
            $('#tvshow-carousel').show();
            $.each(data.episodes, function (i, episode) {
                var epTitle = episode.showtitle + ': ' + episode.label;
                var itemDiv = $('<div>').addClass('item ');
                if (i == 0) itemDiv.addClass('active');
                itemDiv.attr('style', "background-image: url(" + WEBDIR + "xbmc/GetThumb?h=240&w=430&thumb="+encodeURIComponent(episode.fanart)+ ");");
                var itemCaption = $('<div>').addClass('carousel-caption').click(function() {
                    xbmcShowEpisode(episode)
                });
                itemCaption.append($('<h4>').html(epTitle));
                itemCaption.append($('<p>').html(episode.plot).hide());
                itemCaption.hover(function() {
                    $(this).children('p').slideToggle();
                });
                itemDiv.append(itemCaption);
                $('#tvshow-carousel .carousel-inner').append(itemDiv);
            });
        }
    });
}

function loadRecentAlbums () {
    $.ajax({
        url: WEBDIR + 'xbmc/GetRecentAlbums/4',
        type: 'get',
        dataType: 'json',
        success: function (data) {
            if (data == null) return;
            $('#albums-content').parent().show();
            $.each(data.albums, function (i, album) {
                if (album.thumbnail != '') {
                  imageSrc = WEBDIR + 'xbmc/GetThumb?h=45&w=45&thumb='+encodeURIComponent(album.thumbnail);
                } else {
                  imageSrc = WEBDIR + 'js/libs/holder.js/45x45/text:No cover';
                }
                
                // Frodo fix artist is now a list. Use the first.
                if($.isArray(album.artist)) album.artist = album.artist[0]
                year = '';
                if (album.year != '0') {
                    year = ' (' + album.year + ')';
                }
                
                var row = $('<div>').addClass('media');
                row.append(
                  $('<a>').addClass('pull-left albumart').attr('href', '#').append(
                    $('<img>').addClass('media-object').attr('src', imageSrc)
                  ),
                  $('<div>').addClass('media-body').append(
                    $('<h5>').addClass('media-heading').html(album.label + year),
                    album.artist
                  )
                ); 
                $('#albums-content').append(row);       
            });
            
            Holder.run();
        }
    });
}

function loadDownloadHistory() {
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

function loadWantedMovies(limit) {
    $.ajax({
        url: WEBDIR + 'couchpotato/GetMovieList?limit='+limit,
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
    var defaults = {
       limit : 0
    };
    $.extend(defaults, options);

    $.ajax({
        url: WEBDIR + 'sickbeard/GetNextAired',
        type: 'get',
        dataType: 'json',
        success: function (result) {
            if (result == null) return false;

            if (result.data.soon.legth == 0) {
                var row = $('<tr>')
                row.append($('<td>').html('No future episodes found'));
                $('#nextaired_table_body').append(row);
                return false;
            }

            var soonaired = result.data.soon;
            var todayaired = result.data.today;
            var nextaired = todayaired.concat(soonaired);

            $.each(nextaired, function (i, tvshow) {
                if (defaults.limit != 0 && i == defaults.limit) {
                    return false;
                }
                var row = $('<tr>');
                var name = $('<a>').attr('href','#').html(tvshow.show_name).click(function(e){
                    loadShow(tvshow.tvdbid);
                });

                row.append(
                  $('<td>').append(name),
                  $('<td>').html(tvshow.ep_name),
                  $('<td>').html(tvshow.airdate)
                );

                $('#nextaired_table_body').append(row);
            });

            $('#nextaired_table_body').parent().trigger('update');
        }
    });
}

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
        url: '/xbmc/GetRecentMovies',
        type: 'get',
        dataType: 'json',
        success: function (data) {
            if (data == null) return;
            $('#movie-carousel').show();
            $.each(data.movies, function (i, movie) {
                var itemDiv = $('<div>').addClass('item');
                if (i == 0) itemDiv.addClass('active');
                var itemImage = $('<img>');
                itemImage.attr('src', '/xbmc/GetThumb?h=240&w=430&thumb='+encodeURIComponent(movie.fanart));
                itemImage.attr('alt', movie.title);
                itemDiv.append(itemImage);
                var itemCaption = $('<div>').addClass('carousel-caption').click(function() {
                    xbmcShowMovie(movie);
                });
                itemCaption.append($('<h4>').html(movie.title));
                itemCaption.append($('<p>').html(shortenText(movie.plot, 90)));
                itemDiv.append(itemCaption);
                $('#movie-carousel .carousel-inner').append(itemDiv);
            });
        }
    });
}

function loadRecentTVshows () {
    $.ajax({
        url: '/xbmc/GetRecentShows',
        type: 'get',
        dataType: 'json',
        success: function (data) {
            if (data == null) return;
            $('#tvshow-carousel').show();
            $.each(data.episodes, function (i, episode) {
                var epTitle = episode.label;
                var itemDiv = $('<div>').addClass('item');
                if (i == 0) itemDiv.addClass('active');
                var itemImage = $('<img>');
                itemImage.attr('src', '/xbmc/GetThumb?h=240&w=430&thumb='+encodeURIComponent(episode.fanart));
                itemImage.attr('alt', epTitle);
                itemDiv.append(itemImage);
                var itemCaption = $('<div>').addClass('carousel-caption').click(function() {
                    xbmcShowEpisode(episode)
                });
                itemCaption.append($('<h4>').html(epTitle));
                itemCaption.append($('<p>').html(shortenText(episode.plot, 90)));
                itemDiv.append(itemCaption);
                $('#tvshow-carousel .carousel-inner').append(itemDiv);
            });
        }
    });
}

function loadRecentAlbums () {
    $.ajax({
        url: '/xbmc/GetRecentAlbums/4',
        type: 'get',
        dataType: 'json',
        success: function (data) {
            if (data == null) return;
            $('#albums-content').parent().show();
            $.each(data.albums, function (i, album) {
                if (album.thumbnail != '') {
                  imageSrc = '/xbmc/GetThumb?h=45&w=45&thumb='+encodeURIComponent(album.thumbnail);
                } else {
                  imageSrc = '/js/libs/holder.js/45x45/text:No cover';
                }
                
                // Frodo fix artist is now a list. Use the first.
                if($.isArray(album.artist)) album.artist = album.artist[0]
                
                var row = $('<div>').addClass('media');
                row.append(
                  $('<a>').addClass('pull-left').attr('href', '#').append(
                    $('<img>').addClass('media-object').attr('src', imageSrc)
                  ),
                  $('<div>').addClass('media-body').append(
                    $('<h5>').addClass('media-heading').html(album.label),
                    album.artist + ' - ' + album.label + ' ',
                    $('<b>').text(album.year)
                  )
                ); 
                $('#albums-content').append(row);       
            });
            
            Holder.run();
        }
    });
}

function loadWantedMovies(limit) {
    $.ajax({
        url: '/couchpotato/GetMovieList?limit='+limit,
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
                row.append($('<td>').html(item.library.year));

                $('#wantedmovies_table_body').append(row);
            });
        }
    });
}

function loadDownloadHistory() {
    $.ajax({
        url: '/sabnzbd/GetHistory?limit=5',
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

$(document).ready(function () {
    loadDiskSpace();
    enablePlayerControls();
    loadNowPlaying();
    loadRecentMovies();
    loadRecentTVshows();
    loadRecentAlbums();
    loadNextAired({
        limit: 5
    });
    loadWantedMovies();
    loadDownloadHistory();
});

function loadDiskSpace() {
    $.ajax({
        url: '/system/diskspace',
        type: 'get',
        dataType: 'json',
        success: function (data) {
            $.each(data, function (disk, info) {
                var bytesUsed = (info.TOTAL_DISK_SPACE - info.TOTAL_FREE);
                var percentageUsed = (bytesUsed / ((info.TOTAL_DISK_SPACE) / 100));
                if (isNaN(percentageUsed)) {
                    return true;
                }
                var title = $('<h5>').html(disk);
                $('#hdd-info').append(title);
                var subTitle = $('<h6>').html(Math.round(percentageUsed) + '%, ' + bytesToSize(bytesUsed, 2) + '  / ' + bytesToSize(info.TOTAL_DISK_SPACE, 2));
                $('#hdd-info').append(subTitle);

                var progress = $('<div>').addClass('progress');
                var progressBar = $('<div>').addClass('bar').width(Math.round(percentageUsed) + '%');
                progress.append(progressBar);

                $('#hdd-info').append(progress);
            });
        }
    });
}

function loadRecentMovies () {
    $.ajax({
        url: '/xbmc/GetRecentMovies',
        type: 'get',
        dataType: 'json',
        success: function (data) {
            if (data == null) {
                return false;
            }
            $.each(data.movies, function (i, movie) {
                var itemDiv = $('<div>');
                itemDiv.addClass('item');
                if (i == 0) {
                    itemDiv.addClass('active');
                }
                var itemImage = $('<img>');
                itemImage.attr('src', '/xbmc/GetThumb?thumb=' + encodeURIComponent(movie.fanart) + '&h=240&w=430');
                itemImage.attr('alt', movie.title);
                itemImage.css({
                    width: '430px',
                    height: '240px'
                });

                var itemTitle = $('<h4>');
                itemTitle.html(movie.title);

                var itemPlot = $('<p>');
                itemPlot.html(shortenText(movie.plot, 100));
                var itemCaption = $('<div>');
                itemCaption.addClass('carousel-caption');

                itemCaption.append(itemTitle);
                itemCaption.append(itemPlot);
                itemCaption.css('cursor', 'pointer');
                itemCaption.click(function () {
                    xbmcShowMovie(movie)
                });

                itemDiv.append(itemImage);
                itemDiv.append(itemCaption);

                $('#movie-carousel').css({
                    height: '240px'
                });
                $('#movie-carousel').show();
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
            if (data == null) return false;

            $.each(data.episodes, function (i, episode) {

                var epTitle = episode.label;

                var itemDiv = $('<div>');
                itemDiv.addClass('item');
                if (i == 0) {
                    itemDiv.addClass('active');
                }
                var itemImage = $('<img>');
                itemImage.attr('src', '/xbmc/GetThumb?thumb=' + encodeURIComponent(episode.fanart) + '&h=240&w=430');
                itemImage.attr('alt', epTitle);
                itemImage.css({
                    width: '430px',
                    height: '240px'
                });

                var itemTitle = $('<h4>');
                itemTitle.html(epTitle);
                var itemPlot = $('<p>');
                itemPlot.html(shortenText(episode.plot, 100));
                var itemCaption = $('<div>');
                itemCaption.addClass('carousel-caption');

                itemCaption.append(itemTitle);
                itemCaption.append(itemPlot);
                itemCaption.css('cursor', 'pointer');
                itemCaption.click(function () {
                    xbmcShowEpisode(episode)
                });

                itemDiv.append(itemImage);
                itemDiv.append(itemCaption);

                $('#tvshow-carousel').css({
                    height: '240px'
                });
                $('#tvshow-carousel').show();
                $('#tvshow-carousel .carousel-inner').append(itemDiv);

            });
        }
    });
}

function loadRecentAlbums () {
    $.ajax({
        url: '/xbmc/GetRecentAlbums',
        type: 'get',
        dataType: 'json',
        success: function (data) {
            if (data == null) return false;

            $.each(data.albums, function (i, album) {
                if (i > 3) return;

                var itemImage = $('<img>');
                itemImage.css({
                    width: '30px',
                    height: '30px'
                });

                if (album.thumbnail == '') {
                    itemImage.attr('src', 'img/white5x5.png');
                } else {
                    itemImage.attr('src', '/xbmc/GetThumb?thumb=' + encodeURIComponent(album.thumbnail) + '&h=30&w=30');
                }

                var row = $('<tr>')
                row.append($('<td>').html(itemImage));
                row.append($('<td>').html(album.artist));
                row.append($('<td>').html(album.label));
                row.append($('<td>').html(album.year));

                $('#album-table-body').append(row);
            });
        }
    });
}

function loadWantedMovies() {
    $.ajax({
        url: '/couchpotato/GetMovieList',
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
                var failMessage = $('<span>');
                failMessage.addClass('label label-important');
                failMessage.html(slot.fail_message);

                var file = shortenText(slot.name, 35);

                if (slot.status == 'Failed') {
                    file.append('&nbsp;'+failMessage);
                }

                var row = $('<tr>')
                row.append($('<td>').html(file).attr('title',slot.name));
                row.append($('<td>').html(slot.status));
                $('#downloads_table_body').append(row);
            });
        }
    });
}

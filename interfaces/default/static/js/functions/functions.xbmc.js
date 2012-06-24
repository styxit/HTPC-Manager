// films inladen

var lastMovieLoaded = 0;
var allMoviesLoaded = false;
var moviesLoading = false;
var movieRequest = null;
var movieLimit = 99999;

function loadMovies(options) {
    if ($('#movie-grid').attr('data-scroll-limit') !== 0) {
        movieLimit = parseInt($('#movie-grid').attr('data-scroll-limit'));
    }

    if (movieRequest != null) {
        movieRequest.abort();
        moviesLoading = false;
    }

    var sendData = {
        start: lastMovieLoaded,
        end: (lastMovieLoaded + movieLimit),
        search: '',
        sortorder: 'ascending',
        sortmethod: 'videotitle'
    };
    $.extend(sendData, options);

    if (allMoviesLoaded) {
        return true;
    }
    if (moviesLoading) {
        return true;
    }

    movieRequest = $.ajax({
        url: 'json/?which=xbmc&action=movies',
        type: 'get',
        data: sendData,
        beforeSend: function() {
            $('#movie-loader').show();
            moviesLoading = true;
        },
        dataType: 'json',
        success: function (data) {
            lastMovieLoaded += movieLimit;

            if (data == null) return false;

            if (data.limits.end == data.limits.total) {
                allMoviesLoaded = true;
            }

            $.each(data.movies, function (i, movie) {
                var moviePicture = $('<img>');
                moviePicture.css('height', '150px');
                moviePicture.css('width', '100px');
                moviePicture.attr('src', 'img/white5x5.png');
                moviePicture.attr('data-original', 'json/?which=xbmc&action=thumb&thumb=' + encodeURIComponent(movie.thumbnail) + '&w=100&h=150');
                moviePicture.addClass('lazy');

                var movieAnchor = $('<a>');
                movieAnchor.addClass('thumbnail');
                movieAnchor.attr('href', 'javascript:void(0);');
                movieAnchor.css('height', '150px');
                movieAnchor.css('width', '100px');
                movieAnchor.append(moviePicture);

                movieAnchor.click(function () {
                    xbmcShowMovie(movie);
                });

                var movieItem = $('<li>').attr('title', movie.title);
                movieItem.attr('id', movie.title);
                movieItem.append(movieAnchor);
                movieItem.append($('<h6>').addClass('movie-title').html(shortenText(movie.title, 12)));

                $('#movie-grid').append(movieItem);
                $('#movie-loader').hide();

                moviesLoading = false;
            });
        }
    });
}

function xbmcShowMovie(movie) {
    // Maak inhoud van modal
    var modalMoviePicture = $('<img>');
    modalMoviePicture.css('height', '300px');
    modalMoviePicture.css('width', '200px');
    modalMoviePicture.attr('src', 'json/?which=xbmc&action=thumb&thumb=' + encodeURIComponent(movie.thumbnail) + '&w=200&h=300');

    var modalMovieAnchor = $('<div>');
    modalMovieAnchor.addClass('thumbnail');
    modalMovieAnchor.append(modalMoviePicture);

    var modalMoviePoster = $('<td>');
    modalMoviePoster.css('height', '300px');
    modalMoviePoster.css('width', '200px');
    modalMoviePoster.append(modalMovieAnchor);

    var moviePlot = $('<p>');
    moviePlot.html(movie.plot);

    var movieStudio = $('<h6>');
    movieStudio.html(movie.studio);

    var movieGenre = $('<h6>');
    movieGenre.html(movie.genre);

    var movieRating = $('<div>');
    movieRating.raty({
        readOnly: true,
        start: (movie.rating / 2),
        number: 5
    });

    var modalMovieInfo = $('<td>');
    modalMovieInfo.append(moviePlot);
    modalMovieInfo.append(movieRating);
    modalMovieInfo.append(movieStudio);
    modalMovieInfo.append(movieGenre);

    var row = $('<tr>');
    row.append(modalMoviePoster);
    row.append(modalMovieInfo)

    var table = $('<table>');
    table.addClass('table table-modal');
    table.append(row);


    showModal(movie.title + ' (' + movie.year + ')',  table, {
        'Play' : function () {
            playItem(movie.file);
            hideModal();
        }
    })

    // Achtergrondje maken
    $('.modal-fanart').css({
        'background' : '#ffffff url(json/?which=xbmc&action=thumb&thumb=' + encodeURIComponent(movie.fanart) + '&w=675&h=400&o=15) top center no-repeat',
        'background-size' : '100%'
    });
    table.parent().addClass('trans');

}

// shows inladen
var showSteps = 99999;
var lastShowLoaded = 0;
var allShowsLoaded = false;
var showsLoading = false;
var showRequest = null;
function loadXbmcShows(options) {
    if ($('#movie-grid').attr('data-scroll-limit') !== 0) {
        showSteps = parseInt($('#movie-grid').attr('data-scroll-limit'));
    }

    if (showRequest != null) {
        showRequest.abort();
        showsLoading = false;
    }

    var sendData = {
        start: lastShowLoaded,
        end: (lastShowLoaded + showSteps),
        search: ''
    };
    $.extend(sendData, options);

    if (allShowsLoaded) {
        return true;
    }
    if (showsLoading) {
        return true;
    }

    showRequest = $.ajax({
        url: 'json/?which=xbmc&action=shows',
        type: 'get',
        dataType: 'json',
        data: sendData,
        beforeSend: function() {
            $('#show-loader').show();
            showsLoading = true;
        },
        success: function (data) {

            lastShowLoaded += showSteps;

            if (data == null) return false;

            if (data.limits.end == data.limits.total) {
                allShowsLoaded = true;
            }

            if (data == null) return false;
            $.each(data.tvshows, function (i, show) {

                var showPicture = $('<img>');
                showPicture.attr('src', 'img/white5x5.png');
                showPicture.addClass('lazy');
                if ($('#show-grid').hasClass('banners')) {
                    showPicture.attr('data-original', 'json/?which=xbmc&action=thumb&thumb=' + encodeURIComponent(show.thumbnail) + '&h=80&w=500');
                    showPicture.css('height', '90px');
                    showPicture.css('width', '500px');
                } else {
                    showPicture.attr('data-original', 'json/?which=xbmc&action=thumb&thumb=' + encodeURIComponent(show.thumbnail) + '&h=150&w=100');
                    showPicture.css('height', '150px');
                    showPicture.css('width', '100px');
                }

                var showAnchor = $('<a>');
                showAnchor.addClass('thumbnail');
                showAnchor.attr('href', 'javascript:void(0);');
                if ($('#show-grid').hasClass('banners')) {
                    showAnchor.css('height', '90px');
                    showAnchor.css('width', '500px');
                } else {
                    showAnchor.css('height', '150px');
                    showAnchor.css('width', '100px');
                }
                showAnchor.append(showPicture);
                showAnchor.click(function () {
                    loadXBMCShow(show);
                });

                var showItem = $('<li>');
                showItem.addClass('show-item');
                showItem.append(showAnchor);
                if ($('#show-grid').hasClass('banners')) {
                    showItem.append($('<h6>').addClass('show-title').html(show.title));
                } else {
                    showItem.append($('<h6>').addClass('show-title').html(shortenText(show.title, 12)));
                }

                $('#show-grid').append(showItem);

                $('#show-loader').hide();
                showsLoading = false;

            });
        }
    });
}

function xbmcShowEpisode(episode) {
    // Maak inhoud van modal
    var modalshowPicture = $('<img>');
    modalshowPicture.css('height', '125px');
    modalshowPicture.css('width', '200px');
    modalshowPicture.attr('src', 'json/?which=xbmc&action=thumb&thumb=' + encodeURIComponent(episode.thumbnail) + '&w=200&h=125');

    var modalshowAnchor = $('<div>');
    modalshowAnchor.addClass('thumbnail');
    modalshowAnchor.append(modalshowPicture);

    var modalshowPoster = $('<td>');
    modalshowPoster.css('height', '125px');
    modalshowPoster.css('width', '200px');
    modalshowPoster.append(modalshowAnchor);

    var modalPlot = $('<td>');
    modalPlot.html(episode.plot);

    var row = $('<tr>');
    row.append(modalshowPoster);
    row.append(modalPlot)

    var table = $('<table>');
    table.addClass('table table-modal');
    table.append(row);


    showModal(episode.label,  table, {
        'Play' : function () {
            playItem(episode.file);
            hideModal();
        }
    })

    // Achtergrondje maken
    $('.modal-fanart').css({
        'background' : '#ffffff url(json/?which=xbmc&action=thumb&thumb=' + encodeURIComponent(episode.fanart) + '&w=675&h=400&o=15) top center',
        'background-size' : '100%;'
    });
    table.parent().addClass('trans');
}

function loadXBMCShow(show) {
    $.ajax({
        url: 'json/?which=xbmc&action=getshow&item=' + show.tvshowid,
        type: 'get',
        dataType: 'json',
        success: function (data) {

            $('#show-title').html(show.title)

            var accordion = $('<div>').addClass('accordion').attr('id', 'show-accordion');

            // Even reverse, nieuwe bovenaan
            var seasonsArray = [];
            var seasonsCounter = 0;
            $.each(data.seasons, function(seasonNumber, episodes) {
                if (seasonsArray[seasonsCounter] == undefined) {
                    seasonsArray[seasonsCounter] = {};
                }
                seasonsArray[seasonsCounter].season = seasonNumber;
                seasonsArray[seasonsCounter].episodes = episodes;
                seasonsCounter ++;
            });
            seasonsArray = seasonsArray.reverse();

            $.each(seasonsArray, function(seasonCounter, season) {

                var episodesTable = $('<table>').addClass('accordion-inner');
                episodesTable.addClass('table');
                episodesTable.addClass('table-striped');

                // Even reverse, nieuwe bovenaan
                var episodeArray = [];
                var episodesCounter = 0;
                $.each(season.episodes, function (episodeid, episode) {
                    episodeArray[episodesCounter] = episode;
                    episodesCounter++;
                });
                episodeArray = episodeArray.reverse();

                $.each(episodeArray, function (episodeCounter, episode) {

                    var row = $('<tr>');

                    var episodeImage = $('<img>');
                    episodeImage.addClass('lazy');
                    episodeImage.attr('src', 'img/white5x5.png');
                    episodeImage.css('height', '50px');
                    episodeImage.css('width', '100px');
                    episodeImage.attr('data-original', 'json/?which=xbmc&action=thumb&thumb=' + encodeURIComponent(episode.thumbnail) + '&w=100&h=50');

                    var episodeThumb = $('<a>').addClass('thumbnail');
                    episodeThumb.append(episodeImage);
                    episodeThumb.css('height', '50px');
                    episodeThumb.css('width', '100px');

                    var playButton = $('<a>');
                    playButton.addClass('btn');
                    playButton.addClass('pull-right');
                    playButton.html('Play');
                    playButton.click(function() {
                        playItem(episode.file);
                    });

                    row.append($('<td>').html(episodeThumb).width(100));
                    row.append($('<td>').html('<h5>' + episode.label + '</h5>' + '<p>' + episode.plot + '</p>'));
                    row.append($('<td>').append(playButton));
                    episodesTable.append(row);
                });


                var accordionToggle = $('<span>').addClass('accordion-toggle').html('<h3>Season ' + season.season + '</h3>');
                accordionToggle.attr('data-toggle', 'collapse');
                accordionToggle.attr('data-parent', 'show-accordion');
                accordionToggle.attr('href', '#season-' + season.season);
                var accordionHeading = $('<div>').addClass('accordion-heading').append(accordionToggle);
                accordionHeading.css('cursor', 'pointer');
                var accordionBody = $('<div>').addClass('accordion-body collapse').append(episodesTable);
                if (seasonCounter == 0) {
                    accordionBody.addClass('in');
                }
                accordionBody.attr('id', 'season-' + season.season)
                var accordionGroup = $('<div>').addClass('accordion-group').append(accordionHeading);
                accordionGroup.append(accordionBody);
                accordion.append(accordionGroup);

            });

            $('#show-seasons').html('').append(accordion);

            $('#show-grid').fadeOut();
            $('#show-details').show();


        }
    });
}

function playItem(item) {
    $.ajax({
        url: 'json/?which=xbmc&action=play&item=' + item,
        type: 'get',
        dataType: 'json',
        success: function (data) {
            // nothing
        }
    });
}

var nowPlayingThumb = '';
function loadNowPlaying() {
    $.ajax({
        url: 'json/?which=xbmc&action=nowplaying',
        type: 'get',
        dataType: 'json',
        complete: function() {
            setTimeout(function () {
                loadNowPlaying();
            }, 1000);
        },
        success: function(data) {

            if (data == null) {
                $('#nowplaying').hide();
                return false;
            }

            if (!$('#nowplaying').is(':visible')) {
                $('#nowplaying').fadeIn();
            }

            // Onderstaande alleen als we wat anders spelen
            if (nowPlayingThumb != data.itemInfo.item.thumbnail) {
                var thumbnail = $('<img>');
                thumbnail.attr('alt', data.itemInfo.item.label);

                var thumbContainer = $('#nowplaying .thumbnail');

                if (data.itemInfo.item.type == 'episode') {
                    thumbnail.attr('src', 'json/?which=xbmc&action=thumb&thumb=' + encodeURIComponent(data.itemInfo.item.thumbnail) + '&w=150&h=75');
                    thumbnail.css('height', '75px');
                    thumbnail.css('width', '150px');
                    thumbContainer.css('height', '75px');
                    thumbContainer.css('width', '150px');
                }
                if (data.itemInfo.item.type == 'movie') {
                    thumbnail.attr('src', 'json/?which=xbmc&action=thumb&thumb=' + encodeURIComponent(data.itemInfo.item.thumbnail) + '&w=100&h=150');
                    thumbnail.css('height', '150px');
                    thumbnail.css('width', '100px');
                    thumbContainer.css('height', '150px');
                    thumbContainer.css('width', '100px');
                }

                thumbContainer.html(thumbnail);

                nowPlayingThumb = data.itemInfo.item.thumbnail;

                // Achtergrondje maken
                $('#nowplaying').css({
                    'background' : 'url(json/?which=xbmc&action=thumb&thumb=' + encodeURIComponent(data.itemInfo.item.fanart) + '&w=1150&h=640&o=10) top center',
                    'background-size' : '100%;',
                    'background-position' : '50% 20%',
                    'margin-bottom' : '10px'
                });
                $('#nowplaying-fanart').addClass('trans');

                // Line
                $('<hr />').insertAfter('#nowplaying');
            }

            // Play button
            var playPauseButton = $('[data-player-control=PlayPause]');
            var playPauseIcon = playPauseButton.find('i');
            playPauseIcon.removeClass();
            if (data.playerInfo.speed == 1) {
                playPauseIcon.addClass('icon-pause');
            } else {
                playPauseIcon.addClass('icon-play');
            }

            // Mute button
            var setMuteButton = $('[data-player-control=SetMute]')
            var setMuteIcon = setMuteButton.find('i');
            setMuteIcon.removeClass();
            if (data.app.muted) {
                setMuteIcon.addClass('icon-volume-up');
            } else {
                setMuteIcon.addClass('icon-volume-off');
            }

            var playingTime = pad(data.playerInfo.time.hours, 2) + ':' + pad(data.playerInfo.time.minutes, 2) + ':' + pad(data.playerInfo.time.seconds, 2);
            var totalTime = pad(data.playerInfo.totaltime.hours, 2) + ':' + pad(data.playerInfo.totaltime.minutes, 2) + ':' + pad(data.playerInfo.totaltime.seconds, 2);
            var itemTime = $('#player-item-time');
            itemTime.html(playingTime + ' / ' + totalTime);

            var itemTitel = $('#player-item-title')
            var playingTitle = '';
            if (data.itemInfo.item.type == 'episode') {
                playingTitle = data.itemInfo.item.showtitle + ' - ' + data.itemInfo.item.season + 'x' + data.itemInfo.item.episode + ' ' + data.itemInfo.item.label
            }
            if (data.itemInfo.item.type == 'movie') {
                playingTitle = data.itemInfo.item.label + ' (' + data.itemInfo.item.year + ')';
            }
            itemTitel.html(playingTitle);

            var progressBar = $('#player-progressbar').find('.bar');
            progressBar.css('width', data.playerInfo.percentage + '%');

            $('[data-player-control]').attr('disabled', false);
        }
    });
}

function sendNotification(text) {
    $.ajax({
        url: 'json/?which=xbmc&action=notify&text=' + text,
        type: 'get',
        dataType: 'html',
        success: function(data) {
            notifyInfo('XBMC', 'Notification \'' + text + '\' sent successfully');
        }
    });
}

function xbmcClean() {
    $.ajax({
        url: 'json/?which=xbmc&action=clean',
        type: 'get',
        dataType: 'json',
        success: function(data) {
            notifyInfo('XBMC', 'Library clean sent successfully');
        }
    });
}

function xbmcScan() {
    $.ajax({
        url: 'json/?which=xbmc&action=scan',
        type: 'get',
        dataType: 'json',
        success: function(data) {
            notifyInfo('XBMC', 'Library update sent successfully');
        }
    });
}

function filterShows(key) {
    $('.show-title').parent().show();
    $('.show-title').each(function (i, item) {
        if (!findInString(key, $(item).html())) {
            $(item).parent().hide();
        }
    });
}

function filterMovies(key) {
    $('.movie-title').parent().show();
    $('.movie-title').each(function (i, item) {
        if (!findInString(key, $(item).html())) {
            $(item).parent().hide();
        }
    });
}

function enablePlayerControls() {
    $('[data-player-control]').click(function () {

        var clickItem = $(this);
        var playerDo = clickItem.attr('data-player-control');

        // Laadscherm
        clickItem.attr('disabled', true);

        $.ajax({
            url: 'json/?which=xbmc&action=controlplayer&do=' + playerDo,
            type: 'get',
            dataType: 'json',
            success: function(data) {
                if (data == null) return;
            }
        });
    });
}
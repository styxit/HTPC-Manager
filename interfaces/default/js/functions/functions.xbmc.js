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

    if (allMoviesLoaded) return;
    if (moviesLoading) return;

    movieRequest = $.ajax({
        url: '/xbmc/GetMovies',
        type: 'get',
        data: sendData,
        beforeSend: function() {
            $('#movie-loader').show();
            moviesLoading = true;
        },
        dataType: 'json',
        success: function (data) {
            $('#movie-loader').hide();
            lastMovieLoaded += movieLimit;

            if (data == null) {;
                notify('Error','Cannot connect to XBMC','error');
                $('#xbmc-wake').show();
            }

            if (data.limits.end == data.limits.total) {
                allMoviesLoaded = true;
            }

            $.each(data.movies, function (i, movie) {
                var moviePicture = $('<img>');
                moviePicture.css('height', '150px');
                moviePicture.css('width', '100px');
                moviePicture.attr('src', '/xbmc/GetThumb?thumb='+encodeURIComponent(movie.thumbnail)+'&w=100&h=150');

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

                moviesLoading = false;
            });
        },
        error: function() {
            notify('Error','An error occurred','error');
        }
    });
}

function xbmcShowMovie(movie) {
    var modalMoviePicture = $('<img>');
    modalMoviePicture.attr('src', '/xbmc/GetThumb?thumb='+encodeURIComponent(movie.thumbnail)+'&w=200&h=300');

    var modalMovieAnchor = $('<div>');
    modalMovieAnchor.addClass('thumbnail pull-left');
    modalMovieAnchor.css('margin-right', '20px')
    modalMovieAnchor.append(modalMoviePicture);

    var movieStudio = $('<h6>').html(movie.studio);
    var movieGenre = $('<h6>').html(movie.genre);
    var moviePlot = $('<p>').html(movie.plot);

    var movieRating = $('<span>').raty({
        readOnly: true,
        score: (movie.rating / 2),
    });

    var modalMovieInfo = $('<div>');
    modalMovieInfo.append(modalMovieAnchor);
    modalMovieInfo.append(moviePlot);
    modalMovieInfo.append(movieGenre);
    modalMovieInfo.append(movieStudio);
    modalMovieInfo.append(movieRating);

    showModal(movie.title + ' (' + movie.year + ')',  modalMovieInfo, {
        'Play' : function () {
            playItem(movie.file);
            hideModal();
        }
    })

    $('.modal-fanart').css({
        'background' : '#ffffff url(/xbmc/GetThumb?thumb='+encodeURIComponent(movie.fanart)+'&w=675&h=400&o=15) top center no-repeat',
        'background-size' : '100%'
    });
}

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

    if (allShowsLoaded) return;
    if (showsLoading) return;

    showRequest = $.ajax({
        url: '/xbmc/GetShows',
        type: 'get',
        dataType: 'json',
        data: sendData,
        beforeSend: function() {
            $('#show-loader').show();
            showsLoading = true;
        },
        success: function (data) {
            lastShowLoaded += showSteps;

            if (data == null) return;

            if (data.limits.end == data.limits.total) {
                allShowsLoaded = true;
            }

            if (data == null) return;
            $.each(data.tvshows, function (i, show) {
                var showPicture = $('<img>');
                if ($('#show-grid').hasClass('banners')) {
                    showPicture.attr('src', '/xbmc/GetThumb?thumb=' + encodeURIComponent(show.thumbnail) + '&h=80&w=500');
                    showPicture.css('height', '90px');
                    showPicture.css('width', '500px');
                } else {
                    showPicture.attr('srcl', '/xbmc/?GetThumb?thumb=' + encodeURIComponent(show.thumbnail) + '&h=150&w=100');
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
    var modalshowPicture = $('<img>');
    modalshowPicture.attr('src', '/xbmc/GetThumb?thumb=' + encodeURIComponent(episode.thumbnail) + '&w=200&h=125');

    var modalshowAnchor = $('<div>');
    modalshowAnchor.addClass('thumbnail pull-left');
    modalshowAnchor.css('margin-right', '20px')
    modalshowAnchor.append(modalshowPicture);

    var modalPlot = $('<p>').html(episode.plot);

    var modalEpisodeInfo = $('<div>');
    modalEpisodeInfo.append(modalshowAnchor);
    modalEpisodeInfo.append(modalPlot);

    showModal(episode.label, modalEpisodeInfo, {
        'Play' : function () {
            playItem(episode.file);
            hideModal();
        }
    })

    $('.modal-fanart').css({
        'background' : '#ffffff url(/xbmc/GetThumb?thumb=' + encodeURIComponent(episode.fanart) + '&w=675&h=400&o=15) top center',
        'background-size' : '100%;'
    });
}

function loadXBMCShow(show) {
    $.ajax({
        url: '/xbmc/GetShow?tvshowid=' + show.tvshowid,
        type: 'get',
        dataType: 'json',
        beforeSend: function () {
            $('#show-seasons').empty();
            $('#show-grid').hide();
            $('#show-loader').show();
        },
        success: function (data) {
            $('#show-title').html(show.title)
            var accordion = $('<div>').addClass('accordion').attr('id', 'show-accordion');

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

            $.each(seasonsArray, function(seasonCounter, season) {
                var episodesTable = $('<table>').addClass('accordion-inner');
                episodesTable.addClass('table');
                episodesTable.addClass('table-striped');

                var episodeArray = [];
                var episodesCounter = 0;
                $.each(season.episodes, function (episodeid, episode) {
                    episodeArray[episodesCounter] = episode;
                    episodesCounter++;
                });

                $.each(episodeArray, function (episodeCounter, episode) {
                    var row = $('<tr>');

                    var episodeImage = $('<img>');
                    episodeImage.css('height', '50px');
                    episodeImage.css('width', '100px');
                    episodeImage.attr('src', '/xbmc/GetThumb?thumb=' + encodeURIComponent(episode.thumbnail) + '&w=100&h=50');

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
            $('#show-loader').hide();
            $('#show-details').show();
            $('#show-seasons').append(accordion);
        }
    });
}

var nowPlayingThumb = '';
function loadNowPlaying() {
    $.ajax({
        url: '/xbmc/NowPlaying',
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
                return;
            }

            if (!$('#nowplaying').is(':visible')) {
                $('#nowplaying').fadeIn();
            }

            if (nowPlayingThumb != data.itemInfo.item.thumbnail) {
                var thumbnail = $('<img>');
                thumbnail.attr('alt', data.itemInfo.item.label);

                var thumbContainer = $('#nowplaying .thumbnail');

                if (data.itemInfo.item.type == 'episode') {
                    thumbnail.attr('src', '/xbmc/GetThumb?thumb=' + encodeURIComponent(data.itemInfo.item.thumbnail) + '&w=150&h=75');
                    thumbnail.css('height', '75px');
                    thumbnail.css('width', '150px');
                    thumbContainer.css('height', '75px');
                    thumbContainer.css('width', '150px');
                }
                if (data.itemInfo.item.type == 'movie') {
                    thumbnail.attr('src', '/xbmc/GetThumb?thumb=' + encodeURIComponent(data.itemInfo.item.thumbnail) + '&w=100&h=150');
                    thumbnail.css('height', '150px');
                    thumbnail.css('width', '100px');
                    thumbContainer.css('height', '150px');
                    thumbContainer.css('width', '100px');
                }

                thumbContainer.html(thumbnail);

                nowPlayingThumb = data.itemInfo.item.thumbnail;

                $('#nowplaying').css({
                    'background' : 'url(/xbmc/GetThumb?thumb=' + encodeURIComponent(data.itemInfo.item.fanart) + '&w=1150&h=640&o=10) top center',
                    'background-size' : '100%;',
                    'background-position' : '50% 20%',
                    'margin-bottom' : '10px'
                });
                $('#nowplaying-fanart').addClass('trans');

                $('<hr />').insertAfter('#nowplaying');
            }

            var playPauseButton = $('[data-player-control=PlayPause]');
            var playPauseIcon = playPauseButton.find('i');
            playPauseIcon.removeClass();
            if (data.playerInfo.speed == 1) {
                playPauseIcon.addClass('icon-pause');
            } else {
                playPauseIcon.addClass('icon-play');
            }

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

function playItem(item) {
    $.get('/xbmc/PlayItem?item='+item);
}

function xbmcControl(action) {
    $.get('/xbmc/ControlPlayer?action='+action, function(data){
    });
}
function enablePlayerControls() {
    $('[data-player-control]').click(function () {
        var action = $(this).attr('data-player-control');
        $(this).attr('disabled', true);
        xbmcControl(action);
    });
}

function sendNotification(string) {
    $.post('/xbmc/Notify',{'text': string}, function(data) {
        notify('XBMC', 'Notification sent successfully', 'info');
    });
}

function xbmcClean(lib) {
    $.get('/xbmc/Clean?lib='+lib, function(data) {
        notify('XBMC', 'Library clean sent successfully', 'info');
    });
}

function xbmcScan(lib) {
    $.get('/xbmc/Scan?lib='+lib, function(data) {
        notify('XBMC', 'Library update sent successfully', 'info');
    });
}

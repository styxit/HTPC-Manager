function errorHandler() {
    $('.spinner').hide();
    $('#xbmc-wake').show();
    notify('Error','Error connecting to XBMC','error');
    moviesLoading = false;
}

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
        sortorder: 'ascending',
        sortmethod: 'title'
    };
    $.extend(sendData, options);
    if (allMoviesLoaded) return;
    if (moviesLoading) return;
    $('.spinner').show();
    moviesLoading = true;
    movieRequest = $.ajax({
        url: '/xbmc/GetMovies',
        type: 'get',
        data: sendData,
        dataType: 'json',
        success: function (data) {
            $('.spinner').hide();
            lastMovieLoaded += movieLimit;

            if (data == null) {
                errorHandler();
                return;
            }

            if (data.limits.end == data.limits.total) {
                allMoviesLoaded = true;
            }

            $.each(data.movies, function (i, movie) {
                var movieItem = $('<li>')
                movieItem.attr('title', movie.title);
                movieItem.attr('id', movie.title);

                var movieAnchor = $('<a>').attr('href', '#');
                movieAnchor.addClass('thumbnail');
                if (movie.thumbnail != '') {
                  var src = '/xbmc/GetThumb?w=100&h=150&thumb='+encodeURIComponent(movie.thumbnail);
                } else {
                  var src = '/js/libs/holder.js/100x150/text:No artwork';
                }
                movieAnchor.append($('<img>').attr('src', src));
                
                if (movie.playcount >= 1) {
                  movieAnchor.append($('<i>').attr('title', 'Watched').addClass('icon-white icon-ok'));
                }
                
                movieAnchor.click(function(e) {
                    e.preventDefault();
                    xbmcShowMovie(movie);
                });
                movieItem.append(movieAnchor);
                movieItem.append($('<h6>').addClass('movie-title').html(shortenText(movie.title, 12)));

                $('#movie-grid').append(movieItem);

            });
            moviesLoading = false;
            Holder.run();
        },
        error: function() {
            errorHandler();
        }
    });
}

function xbmcShowMovie(movie) {
    var modalMovieAnchor = $('<div>').addClass('thumbnail pull-left');
    modalMovieAnchor.append($('<img>').attr('src', '/xbmc/GetThumb?w=200&h=300&thumb='+encodeURIComponent(movie.thumbnail)));

    var modalMovieInfo = $('<div>').addClass('modal-movieinfo');
    if(movie.streamdetails) {
        var runtime = parseSec(movie.streamdetails.video[0].duration);
        modalMovieInfo.append($('<p>').html('<b>Runtime:</b> ' + runtime));
    }
    modalMovieInfo.append($('<p>').html('<b>Plot:</b> ' + movie.plot));
    if(movie.genre) {
        var genre = movie.genre.join(', ');
        modalMovieInfo.append($('<p>').html('<b>Genre:</b> ' + genre));
    }
    if(movie.studio[0]) {
        var studio = movie.studio.join(', ');
        modalMovieInfo.append($('<p>').html('<b>Studio:</b> ' + studio));
    }
    if(movie.rating) {
        var rating = $('<span>').raty({
            readOnly: true,
            score: (movie.rating / 2),
        })
        modalMovieInfo.append(rating);
    }

    modalBody = $('<div>');
    modalBody.append(modalMovieAnchor);
    modalBody.append(modalMovieInfo);

    var modalButtons = {
        'Play' : function() {
            playItem(movie.movieid, 'movie');
            hideModal();
        }
    }
    if (movie.imdbnumber) {
        $.extend(modalButtons,{
            'IMDb' : function() {
                window.open('http://www.imdb.com/title/'+movie.imdbnumber,'IMDb')
            }
        });
    }
    if (movie.trailer) {
        $.extend(modalButtons,{
            'Trailer' : function() {
                trailerid = movie.trailer.substr(movie.trailer.length-11);
                var youtube = $('<iframe>').attr('src','http://www.youtube.com/embed/'+trailerid+'?rel=0&autoplay=1');
                youtube.addClass('modal-youtube');
                $('#modal_dialog').find('.modal-body').html(youtube);
            }
        });
    }

    showModal(movie.title + ' ('+movie.year+')',  modalBody, modalButtons);
    $('.modal-fanart').css({
        'background' : '#ffffff url(/xbmc/GetThumb?w=675&h=400&o=10&thumb='+encodeURIComponent(movie.fanart)+') top center no-repeat',
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
    hidewatched = $('#hidewatched').hasClass('hidewatched')?1:0
    var sendData = {
        start: lastShowLoaded,
        end: (lastShowLoaded + showSteps),
        hidewatched: hidewatched,
    };
    $.extend(sendData, options);

    if (allShowsLoaded) return;
    if (showsLoading) return;

    showsLoading = true;
    $('.spinner').show();
    showRequest = $.ajax({
        url: '/xbmc/GetShows',
        type: 'get',
        dataType: 'json',
        data: sendData,
        success: function (data) {
            $('.spinner').hide();
            lastShowLoaded += showSteps;

            if (data == null) {
                errorHandler();
                return;
            }

            if (data.limits.end == data.limits.total) {
                allShowsLoaded = true;
            }

            $.each(data.tvshows, function (i, show) {
                var showItem = $('<li>').addClass('show-item');

                var showAnchor = $('<a>').attr('href', '#').click(function(e) {
                    e.preventDefault();
                    loadXBMCShow(show);
                });
                showAnchor.addClass('thumbnail');

                var showPicture = $('<img>');
                if ($('#show-grid').hasClass('banners')) {
                    showPicture.attr('src', '/xbmc/GetThumb?h=80&w=500&thumb='+encodeURIComponent(show.thumbnail));
                } else {
                    showPicture.attr('src', '/xbmc/GetThumb?&h=150&w=100&thumb='+encodeURIComponent(show.thumbnail));
                }
                showAnchor.append(showPicture);
                showItem.append(showAnchor);
                if ($('#show-grid').hasClass('banners')) {
                    showItem.append($('<h6>').addClass('show-title').html(show.title));
                } else {
                    showItem.append($('<h6>').addClass('show-title').html(shortenText(show.title, 12)));
                }

                $('#show-grid').append(showItem);
            });
            showsLoading = false;
        }
    });
}

function xbmcShowEpisode(episode) {
    var modalshowPicture = $('<img>');
    modalshowPicture.attr('src', '/xbmc/GetThumb?w=200&h=125&thumb='+encodeURIComponent(episode.thumbnail));

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
        'background' : '#ffffff url(/xbmc/GetThumb?w=675&h=400&o=10&thumb='+encodeURIComponent(episode.fanart)+') top center',
        'background-size' : '100%;'
    });
}

function loadXBMCShow(show) {
    hidewatched = $('#hidewatched').hasClass('hidewatched')?1:0
    $('.spinner').show();
    $('#show-grid').hide();
    $('#show-seasons').empty();
    $.ajax({
        url: '/xbmc/GetShow?tvshowid='+show.tvshowid+'&hidewatched='+hidewatched,
        type: 'get',
        dataType: 'json',
        success: function (data) {
            seasonCounter = 0;
            $.each(data.seasons, function (i, season) {
                var seasonItem = $('<li>');
                var seasonLink = $('<a>').attr('href','#season'+i).html('Season '+i);
                seasonLink.attr('data-toggle','collapse');
                seasonLink.addClass('season-header well');
                var backBtn = $('<a>').attr('href','#').html('Back').addClass('btn pull-right').click(function(e) {
                    $('#show-grid').show();
                    $('#show-seasons').hide();
                });
                seasonLink.prepend(backBtn);
                seasonItem.append(seasonLink);
                var episodeList = $('<ul>').attr('id','season'+i).addClass('thumbnails collapse');
                if (seasonCounter == 0) episodeList.addClass('in');
                seasonCounter++;
                $.each(season, function (i, episode) {
                    var episodeItem = $('<li>');
                    var episodeAnchor = $('<a>').attr('href', '#').addClass('thumbnail');
                    episodeAnchor.attr('title', episode.plot);
                    var src = '/xbmc/GetThumb?w=150&h=85&thumb='+encodeURIComponent(episode.thumbnail)
                    episodeAnchor.append($('<img>').attr('src', src));
                    episodeAnchor.click(function(e) {
                        e.preventDefault();
                        playItem(episode.episodeid, 'episode');
                    });
                    episodeItem.append(episodeAnchor);
                    episodeItem.append($('<h6>').addClass('show-title').html(shortenText(episode.label, 20)));
                    episodeList.append(episodeItem);
                });
                seasonItem.append(episodeList);
                $('#show-seasons').append(seasonItem);
            });
            $('.spinner').hide();
            $('#show-seasons').show();
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
            setTimeout('loadNowPlaying()', 5000);
        },
        success: function(data) {
            if (data == null) {
                $('#nowplaying').hide();
                return;
            }
            $('#nowplaying').show();

            if (nowPlayingThumb != data.itemInfo.item.thumbnail) {
                nowPlayingThumb = data.itemInfo.item.thumbnail;

                var thumbnail = $('<img>');
                thumbnail.attr('alt', data.itemInfo.item.label);
                if (data.itemInfo.item.type == 'episode') {
                    thumbnail.attr('src', '/xbmc/GetThumb?w=150&h=75&thumb='+encodeURIComponent(nowPlayingThumb));
                    thumbnail.css('height', '75px');
                    thumbnail.css('width', '150px');
                }
                if (data.itemInfo.item.type == 'movie') {
                    thumbnail.attr('src', '/xbmc/GetThumb?w=100&h=150&thumb='+encodeURIComponent(nowPlayingThumb));
                    thumbnail.css('height', '150px');
                    thumbnail.css('width', '100px');
                }
                $('#nowplaying .thumbnail').html(thumbnail);

                $('#nowplaying').css({
                    'background' : 'url(/xbmc/GetThumb?w=1150&h=640&o=10&thumb='+encodeURIComponent(data.itemInfo.item.fanart)+') top center',
                    'background-size' : '100%;',
                    'background-position' : '50% 20%',
                    'margin-bottom' : '10px'
                });
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
            var itemSubtitel = $('#player-item-subtitle')
            var playingTitle = '';
            var playingSubtitle = '';
            if (data.itemInfo.item.type == 'episode') {
                playingTitle = data.itemInfo.item.label;
                playingSubtitle = data.itemInfo.item.showtitle + ' ' + data.itemInfo.item.season + 'x' + data.itemInfo.item.episode;
            }
            if (data.itemInfo.item.type == 'movie') {
                playingTitle = data.itemInfo.item.label;
                playingSubtitle  = data.itemInfo.item.year;
            }
            itemTitel.html(playingTitle);
            itemSubtitel.html(playingSubtitle);

            $('#player-progressbar').click(function(e) {
                pos = ((e.pageX-this.offsetLeft)/$(this).width()*100).toFixed(2);
                $.get('/xbmc/ControlPlayer?action=Seek&percent='+pos);
            });

            var progressBar = $('#player-progressbar').find('.bar');
            progressBar.css('width', data.playerInfo.percentage + '%');

            var subtitles = $('#subtitles').empty();
            data.playerInfo.subtitles.push({'index':'off','name':'None'});
            var current = data.playerInfo.currentsubtitle.index;
            if (data.playerInfo.subtitleenabled==false || current==='') current = 'off';
            $.each(data.playerInfo.subtitles, function (i, item) {
                var link = $('<a>').attr('href','#').text(item.name).click(function(e) {
                    e.preventDefault();
                    $.get('/xbmc/Subtitles?subtitle='+item.index, function (data) {
                        notify('Subtitles','Change successful','info');
                    });
                });
                if (item.index==current) link.prepend($('<i>').addClass('icon-ok'));
                subtitles.append($('<li>').append(link));
            });
            var audio = $('#audio').empty();
            var current = data.playerInfo.currentaudiostream.index;
            $.each(data.playerInfo.audiostreams, function (i, item) {
                var link = $('<a>').attr('href','#').text(item.name).click(function(e) {
                    e.preventDefault();
                    $.get('/xbmc/Audio?audio='+item.index, function (data) {
                        notify('Audio','Change successful','info');
                    });
                });
                if (item.index==current) link.prepend($('<i>').addClass('icon-ok'));
                audio.append($('<li>').append(link));
            });

            $('[data-player-control]').attr('disabled', false);
        }
    });
}

function playItem(item, type) {
    type = typeof type !== 'undefined' ? '&type='+type : '';
    $.get('/xbmc/PlayItem?item='+item+type);
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

var searchString = '';
var hideWatched = 0;

var movieLoad = {
    last: 0,
    request: null,
    limit: 75,
    options: null,
}

$(document).ready(function() {
    hideWatched = $('#hidewatched').hasClass('active')?1:0;
    playerLoader = setInterval('loadNowPlaying()', 4000);
    $('.formsearch').submit(function(e) {
        e.preventDefault()
    });

    $(window).trigger('hashchange');

    $('.search').attr('placeholder', 'Filter movies')
    reloadTab();

    // Load data on tab display
    $('a[data-toggle="tab"]').click(function(e) {
        $('.search').val('');
        $('.search').attr('placeholder', 'Filter ' + $(this).text());
        searchString = '';
        movieLoad.last = 0;
        showLoad.last = 0;
        episodeLoad.last = 0;
        artistLoad.last = 0;
        albumLoad.last = 0;
        songsLoad.last = 0;
    }).on('shown', reloadTab);

     // Load more titles on scroll
    $(window).scroll(function() {
        if($(window).scrollTop() + $(window).height() >= $(document).height() - 10) {
            reloadTab();
        }
    });

    $(".search").on('keyup', function (e) {
        searchString = $(this).val();
        // reset so only load what we should
        movieLoad.last = 0;
        showLoad.last = 0;
        episodeLoad.last = 0;
        artistLoad.last = 0;
        albumLoad.last = 0;
        songsLoad.last = 0;
        reloadTab()
    });

    // Toggle whether to show already seen episodes
    $('#hidewatched').click(function(e) {
        e.preventDefault();
        hideWatched = $(this).toggleClass('active').hasClass('active')?1:0;
        $(this).text(hideWatched?' Show Watched':' Hide Watched');
        $(this).prepend('<i class="fa fa-eye"></i>');
        $.get(WEBDIR + 'settings?plex_hide_watched='+hideWatched);
        reloadTab();
    });

});

// Enable player controls
$(document).delegate('[data-player-control]', 'click', function () {
        var action = $(this).attr('data-player-control');
        var player = $(this).attr('data-player');
        $.get(WEBDIR + 'plex/ControlPlayer?player='+player+'&action='+action);
    });

function playItem(item, player) {
    type = typeof type !== 'undefined';
    d = {'item': item,
        'playerip': player.address,
        'machineid': player.machineIdentifier}
    $.get(WEBDIR + 'plex/PlayItem', d);
}

function loadMovies(options) {
    if (options.f.length) {
        $('#movie-grid').empty();
    }
    if (movieLoad.last == 0) {
        $('#movie-grid').empty();
    }
    var optionstr = JSON.stringify(options) + hideWatched;
    if (movieLoad.options != optionstr) {
        movieLoad.last = 0;
        $('#movie-grid').empty();
    }
    movieLoad.options = optionstr;

    var active = (movieLoad.request != null && movieLoad.request.readyState != 4);
    if (active || movieLoad.last == -1) return;

    var sendData = {
        start: movieLoad.last,
        end: (movieLoad.last + movieLoad.limit),
        hidewatched: hideWatched
    };

    $.extend(sendData, options);

    $('.spinner').show();
    movieLoad.request = $.ajax({
        url: WEBDIR + 'plex/GetMovies',
        type: 'get',
        data: sendData,
        dataType: 'json',
        success: function (data) {
            if (data === null) return errorHandler();

            if (data.limits.end == data.limits.total) {
                movieLoad.last = -1;
            } else {
                movieLoad.last += movieLoad.limit;
            }

            if (data.movies != undefined) {
                $.each(data.movies, function (i, movie) {
                    var movieItem = $('<li>').attr('title', movie.title);

                    var movieAnchor = $('<a>').attr('href', '#').attr('name', movie.title).click(function(e) {
                        e.preventDefault();
                        loadMovie(movie);
                    });

                    var src = 'holder.js/100x150/text:No artwork';
                    if (movie.thumbnail != undefined) {
                        src = WEBDIR + 'plex/GetThumb?w=225&h=338&thumb='+encodeURIComponent(movie.thumbnail);
                    }
                    movieAnchor.append($('<img>').attr('src', src).addClass('thumbnail'));

                    if (movie.playcount >= 1) {
                        movieAnchor.append($('<i>').attr('title', 'Watched').addClass('fa fa-inverse fa-check-circle watched'));
                    }

                    movieAnchor.append($('<h6>').addClass('title').html(shortenText(movie.title, 16)));

                    movieItem.append(movieAnchor);

                    $('#movie-grid').append(movieItem);
                });
            }
            Holder.run();
        },
        complete: function() {
            $('.spinner').hide();
        }
    });
}

function loadMovie(movie) {
    var poster = WEBDIR + 'plex/GetThumb?w=375&h=563&thumb='+encodeURIComponent(movie.thumbnail)
    var info = $('<div>').addClass('modal-movieinfo');
    if (movie.runtime) {
    info.append($('<p>').html('<b>Runtime:</b> ' + movie.runtime + ' min'));
    }
    if (movie.plot) {
    info.append($('<p>').html('<b>Plot:</b> ' + movie.plot));
    }
    if (movie.genre) {
        info.append($('<p>').html('<b>Genre:</b> ' + movie.genre));
    }
    if (movie.studio) {
        info.append($('<p>').html('<b>Studio:</b> ' + movie.studio));
    }
    if (movie.rating) {
        info.append($('<span>').raty({
            readOnly: true,
            path: null,
            score: (movie.rating / 2),
        }));
    }
    var buttons = {}

    showModal(movie.title + ' ('+movie.year+')', $('<div>').append(
        $('<img>').attr('src', poster).addClass('thumbnail movie-poster pull-left'),
        info
    ), buttons);

    $.get(WEBDIR + 'plex/GetPlayers?filter=playback', function(data) {
        $.each(data.players, function (i, player) {
        $('.modal-footer').prepend(
            $('<button>').html('<i class="fa fa-play fa-inverse fa-fw"></i>' + 'Play on ' + player.name).addClass('btn btn-primary').click(function() {
                playItem(movie.id, player);
                hideModal();
            })
        )
        })
        }, 'json');

    $('.modal-fanart').css({
        'background-image' : 'url('+WEBDIR+'plex/GetThumb?w=1013&h=600&o=10&thumb='+encodeURIComponent(movie.fanart)+')'
    });
}

function loadEpisode(episode) {
    var poster = WEBDIR + 'plex/GetThumb?w=375&h=563&thumb='+encodeURIComponent(episode.thumbnail)
    var info = $('<div>').addClass('modal-episodeinfo');
    if (episode.runtime) {
    info.append($('<p>').html('<b>Runtime:</b> ' + episode.runtime + ' min'));
    }
    if (episode.plot) {
    info.append($('<p>').html('<b>Plot:</b> ' + episode.plot));
    }
    if (episode.rating) {
        info.append($('<span>').raty({
            readOnly: true,
            path: null,
            score: (episode.rating / 2),
        }));
    }
    var buttons = {}

    showModal(episode.showtitle + ' ' +episode.label, $('<div>').append(
        $('<img>').attr('src', poster).addClass('thumbnail episode-poster pull-left'),
        info
    ), buttons);

    $.get(WEBDIR + 'plex/GetPlayers?filter=playback', function(data) {
        $.each(data.players, function (i, player) {
        $('.modal-footer').prepend(
            $('<button>').html('<i class="fa fa-play fa-inverse fa-fw"></i>' + 'Play on ' + player.name).addClass('btn btn-primary').click(function() {
                playItem(episode.id, player);
                hideModal();
            })
        )
        })
        }, 'json');
}

var showLoad = {
    last: 0,
    request: null,
    limit: 75,
    options: null
};
var currentShow = null;

function loadShows(options) {
    if (options.f.length){
        $('#show-grid').empty();
    }
    if (showLoad.last == 0) {
        $('#show-grid').empty();
    }
    var optionstr = JSON.stringify(options) + hideWatched;
    if (showLoad.options != optionstr) {
        showLoad.last = 0;
        $('#show-grid').empty();
    }
    showLoad.options = optionstr;

    var active = (showLoad.request!=null && showLoad.request.readyState!=4);
    if (active || showLoad.last == -1) return;

    var sendData = {
        start: showLoad.last,
        end: (showLoad.last + showLoad.limit),
        hidewatched: hideWatched
    };
    $.extend(sendData, options);

    $('.spinner').show();
    showLoad.request = $.ajax({
        url: WEBDIR + 'plex/GetShows',
        type: 'get',
        data: sendData,
        dataType: 'json',
        success: function (data) {
            if (data === null) return errorHandler();

            if (data.limits.end == data.limits.total) {
                showLoad.last = -1;
            } else {
                showLoad.last += showLoad.limit;
            }

            if (data.tvShows != undefined) {
                $.each(data.tvShows, function (i, show) {
                    var showItem = $('<li>').attr('title', show.title);

                    var showAnchor = $('<a>').attr('href', '#').click(function(e) {
                        e.preventDefault();
                        loadEpisodes({'tvshowid':show.id})
                    });

                    var src = 'holder.js/100x150/text:No artwork';
                    if (show.thumbnail != undefined) {
                        src = WEBDIR + 'plex/GetThumb?w=225&h=338&thumb='+encodeURIComponent(show.thumbnail);
                    }
                    showAnchor.append($('<img>').attr('src', src).addClass('thumbnail'));

                    if (show.playcount >= show.itemcount) {
                        showAnchor.append($('<i>').attr('title', 'Watched').addClass('fa fa-inverse fa-check-circle watched'));
                    }

                    showAnchor.append($('<h6>').addClass('title').html(shortenText(show.title, 17)));

                    showItem.append(showAnchor);

                    $('#show-grid').append(showItem);
                });
            }
            Holder.run();
        },
        complete: function() {
            $('.spinner').hide();
        }
    });
}

var episodeLoad = {
    last: 0,
    request: null,
    limit: 75,
    options: null
}
var currentShow = null;
function loadEpisodes(options) {
    if (typeof(options.f) != "undefined" && options.f.length) {
        $('#episode-grid').empty();
    }
    if (episodeLoad.last == 0) {
        $('#episode-grid').empty();
    }
    currentShow = options.tvshowid;
    var optionstr = JSON.stringify(options) + hideWatched;
    if (episodeLoad.options != optionstr) {
        episodeLoad.last = 0;
        $('#episode-grid').empty();
    }
    episodeLoad.options = optionstr;

    var active = (episodeLoad.request!=null && episodeLoad.request.readyState!=4);
    if (active || episodeLoad.last == -1) return;

    var sendData = {
        start: episodeLoad.last,
        end: (episodeLoad.last + episodeLoad.limit),
        hidewatched: hideWatched
    }
    $.extend(sendData, options);

    $('.spinner').show();
    episodeLoad.request = $.ajax({
        url: WEBDIR + 'plex/GetEpisodes',
        type: 'get',
        data: sendData,
        dataType: 'json',
        success: function (data) {
            if (data==null || data.limits.total==0) return errorHandler();

            if (data.limits.end == data.limits.total) {
                episodeLoad.last = -1;
            } else {
                episodeLoad.last += episodeLoad.limit;
            }

            if (data.episodes != undefined) {
                $.each(data.episodes, function (i, episode) {
                    var episodeItem = $('<li>').attr('title', episode.plot);

                    var episodeAnchor = $('<a>').attr('href', '#').click(function(e) {
                        e.preventDefault();
                        loadEpisode(episode);
                    });

                    var src = 'holder.js/150x85/text:No artwork';
                    if (episode.thumbnail != '') {
                        src = WEBDIR + 'plex/GetThumb?w=375&h=210&thumb='+encodeURIComponent(episode.thumbnail);
                    }
                    episodeAnchor.append($('<img>').attr('src', src).addClass('thumbnail'));

                    if (episode.playcount >= 1) {
                        episodeAnchor.append($('<i>').attr('title', 'Watched').addClass('fa fa-inverse fa-check-circle watched_episode'));
                    }

                    episodeAnchor.append($('<h6>').addClass('title').html(shortenText(episode.label, 17)));

                    episodeItem.append(episodeAnchor);

                    $('#episode-grid').append(episodeItem);
                });
            }
            Holder.run();
        },
        complete: function() {
            $('.spinner').hide();
            $('a[href=#episodes]').tab('show');
        }
    });
    $('#episode-grid').slideDown()
}

var artistLoad = {
    last: 0,
    request: null,
    limit: 75,
    options: null
}
var currentArtist = null
function loadArtists(options) {
    if (typeof(options.f) != "undefined" && options.f.length) {
        $('#artist-grid').empty();
    }
    if (artistLoad.last == 0) {
        $('#artist-grid').empty();
    }
    var optionstr = JSON.stringify(options);
    if (artistLoad.options != optionstr) {
        artistLoad.last = 0;
        $('#artist-grid').empty();
    }
    artistLoad.options = optionstr;

    var active = (artistLoad.request!=null && artistLoad.request.readyState!=4);
    if (active || artistLoad.last == -1) return;

    var sendData = {
        start: artistLoad.last,
        end: (artistLoad.last + artistLoad.limit)
    }
    $.extend(sendData, options);

    $('.spinner').show();
    artistLoad.request = $.ajax({
        url: WEBDIR + 'plex/GetArtists',
        type: 'get',
        data: sendData,
        dataType: 'json',
        success: function (data) {
            if (data == null) return errorHandler();

            if (data.limits.end == data.limits.total) {
                artistLoad.last = -1;
            } else {
                artistLoad.last += artistLoad.limit;
            }

            if (data.artists != undefined) {
                $.each(data.artists, function (i, artist) {
                    $('#artist-grid').append($('<tr>').append(
                        $('<td>').append(
                            $('<a>').attr('href','#').addClass('artist-link').html(artist.title).click(function(e) {
                                e.preventDefault(e);
                                $(this).parent().append(loadAlbums({'artistid' : artist.id}));
                            })
                        )
                    ));
                });
            }
            Holder.run();
        },
        complete: function() {
            $('.spinner').hide();
        }
    });
}

var albumLoad = {
    last: 0,
    request: null,
    limit: 75,
    options: null,
    artist: null
}
function loadAlbums(options) {
    if (typeof(options.f) != "undefined" && options.f.length){
        $('#album-grid').empty();
    }
    if (albumLoad.last == 0) {
        $('#album-grid').empty();
    }
    var elem = $('#album-grid');
    if (options && options.artistid!=undefined) {
        $('.artist-albums:visible').slideUp(300, function() {
            $(this).remove();
        });
        if (options.artistid == loadAlbums.artist) {
            loadAlbums.artist = null;
            return;
        }
        loadAlbums.artist = options.artistid;
        var elem = $('<ul>').addClass('artist-albums thumbnails').hide()
    }

    var optionstr = JSON.stringify(options);
    if (albumLoad.options != optionstr) {
        albumLoad.last = 0;
        elem.empty();
    }
    albumLoad.options = optionstr;

    var active = (albumLoad.request!=null && albumLoad.request.readyState!=4);
    if (active || albumLoad.last == -1) return;

    var sendData = {
        start: albumLoad.last,
        end: (albumLoad.last + albumLoad.limit)
    }
    $.extend(sendData, options);

    $('.spinner').show();
    albumLoad.request = $.ajax({
        url: WEBDIR + 'plex/GetAlbums',
        type: 'get',
        data: sendData,
        dataType: 'json',
        success: function (data) {
            if (data == null) return errorHandler();

            if (data.limits.end == data.limits.total) {
                albumLoad.last = -1;
            } else {
                albumLoad.last += albumLoad.limit;
            }

            if (data.albums != undefined) {
                $.each(data.albums, function (i, album) {
                    var albumItem = $('<li>').hover(function() {
                        $(this).children('div').fadeToggle()
                    });

                    var src = 'holder.js/150x150/text:No artwork';
                    if (album.thumbnail != '') {
                        src = WEBDIR + 'plex/GetThumb?w=300&h=300&thumb='+encodeURIComponent(album.thumbnail);
                    }
                    albumItem.append($('<img>').attr('src', src).addClass('thumbnail'));

                    var albumCaption = $('<div>').addClass('grid-caption hide').click(function(e) {
                        e.preventDefault();
                        loadSongs({'albumid': album.id});
                        }).
                        append(
                            $('<a>').attr('href', '#').append(
                                $('<h6>').html(album.title),
                                $('<h6>').html(album.artist).addClass('artist')
                        )

                    )
                    albumItem.append(albumCaption);
                    elem.append(albumItem);
                });
            }
            Holder.run();
            elem.slideDown();
        },
        complete: function() {
            $('.spinner').hide();
        }
    });
    return elem;
}

var songsLoad = {
    last: 0,
    request: null,
    limit: 75,
    options: {},
    albumid: ''
}

var currentAlbum = null
function loadSongs(options) {
    currentAlbum = options.albumid;
    // clear old results if it was a search
    if (options.f) {
        currentAlbum = null
        $('#songs-grid tbody').empty();
    }


    var optionstr = JSON.stringify(options)
    if (songsLoad.options != optionstr) {
         songsLoad.last = 0;
         $('#songs-grid tbody').empty();
     }
     if (songsLoad.last == 0) {
        $('#songs-grid tbody').empty();
     }
     songsLoad.options = optionstr;

    var active = (songsLoad.request!=null && songsLoad.request.readyState!=4)
    if (active || songsLoad.last == -1) return

    var sendData = {
        start: songsLoad.last,
        end: (songsLoad.last + songsLoad.limit),
        albumid: (options && options.albumid ? '' : songsLoad.albumid)
    }
    $.extend(sendData, options)

    $('.spinner').show();
    songsLoad.request = $.ajax({
        url: WEBDIR + 'plex/GetSongs',
        type: 'get',
        data: sendData,
        dataType: 'json',
        success: function (data) {
            if (data==null || data.limits.total==0) return;

            if (data.limits.end == data.limits.total) {
                songsLoad.last = -1;
            } else {
                songsLoad.last += songsLoad.limit;
            }
            if (data.songs != undefined) {
                $.each(data.songs, function (i, song) {
                    var row = $('<tr>');
                    row.append(
                        $('<td>').append(

                            $('<a>').attr('href','#').text(' ' + song.label).click(function(e) {
                                e.preventDefault();
                            })
                        ),
                        $('<td>').append(
                            $('<a>').attr('href','#').text(song.artist).click(function(e) {
                                e.preventDefault();
                            })
                        ),
                        $('<td>').append(
                            $('<a>').attr('href','#').text(song.album).click(function(e) {
                                e.preventDefault();
                            })
                        ),
                        $('<td>').append(parseSec(song.duration))
                    )
                    $('#songs-grid tbody').append(row);
                });
            }
        },
        complete: function() {
            $('a[href=#songs]').tab('show');
            $('.spinner').hide();
        }
    });
}


var nowPlayingId = false
function loadNowPlaying() {
    $.ajax({
        url: WEBDIR + 'plex/NowPlaying',
        type: 'get',
        dataType: 'json',
        success: function(data) {

            if (data.playing_items.length == 0) {
                $('#nowplaying').hide();
                $('a[href=#playlist]').parent().hide();
                return;
            }
            if (data.playing_items.length !== 0) {
                $('#nowplaying').html('');
                $.each(data.playing_items, function (i, item) {
                var playingTitle = '';
                var playingSubtitle = '';
                var username = $('<span>').addClass('pull-right muted nowplayinguser').text(item.user + '@' + item.player);
                var nowPlayingThumb = encodeURIComponent(item.thumbnail);
                var thumbnail = $('<img>').addClass("img-polaroid img-rounded").attr('alt', item.label);
                if (nowPlayingThumb == '') {
                    thumbnail.attr('src', 'holder.js/140x140/text:No artwork');
                    thumbnail.attr('width', '140').attr('height', '140');
                    Holder.run();
                } else {
                    switch(item.type) {
                        case 'episode':
                            thumbnail.attr('src', WEBDIR + 'plex/GetThumb?w=525&h=300&thumb='+nowPlayingThumb);
                            thumbnail.attr('width', '150').attr('height', '75');
                            break;
                        case 'movie':
                            thumbnail.attr('src', WEBDIR + 'plex/GetThumb?w=225&h=338&thumb='+nowPlayingThumb);
                            thumbnail.attr('width', '100').attr('height', '150');
                            break;
                        default:
                            thumbnail.attr('src', WEBDIR + 'plex/GetThumb?w=300&h=300&thumb='+nowPlayingThumb);
                            thumbnail.attr('width', '150').attr('height', '150');
                    }
                }
                if (item.type == 'episode') {
                    playingTitle = item.show;
                    playingSubtitle = item.title + ' ' +
                    item.season + 'x' +
                    item.episode;
                }
                else if (item.type == 'movie') {
                    playingTitle = item.title;
                    playingSubtitle  = item.year;
                } else {
                    playingTitle = item.title;
                }


                var thumb = $('<div>').addClass("span2 hidden-phone thumb").append(thumbnail);
                var info = $('<div>').addClass("span9");
                info.append(username);
                info.append('<h2><span id="player-item-title">' + playingTitle +'</span>&nbsp;<small id="player-item-subtitle" class="muted">' + playingSubtitle + '</small></h2>');
                info.append('<h2><small id="player-item-time">' + parseSec(item.viewOffset/1000) + ' / ' + parseSec(item.duration/1000) + '</small></h2>');
                info.append($('<div id="player-progressbar"/>').addClass("progress").append($('<div>').addClass("bar active").css('width', (item.viewOffset / item.duration)*100 + '%')));
                if (item.protocolCapabilities.indexOf('playback') != -1) {
                    var btn_toolbar = $('<div id="nowplaying_control"/>').addClass("btn-toolbar");
                    var btn_group = $('<div>').addClass("btn-group");
                    btn_group.append($('<button>').addClass("btn btn-small").attr('data-player-control', 'skipPrevious').attr('data-player', item.address).append('<i class="fa fa-fast-backward"></i>'));
                    btn_group.append($('<button>').addClass("btn btn-small").attr('data-player-control', 'stepBack').attr('data-player', item.address).append('<i class="fa fa-backward"></i>'));
                    btn_group.append($('<button>').addClass("btn btn-small").attr('data-player-control', 'stop').attr('data-player', item.address).append('<i class="fa fa-stop"></i>'));
                    if (item.state == 'playing') {
                        btn_group.append($('<button>').addClass("btn btn-small").attr('data-player-control', 'pause').attr('data-player', item.address).append('<i class="fa fa-pause"></i>'));
                    } else {
                        btn_group.append($('<button>').addClass("btn btn-small").attr('data-player-control', 'play').attr('data-player', item.address).append('<i class="fa fa-play"></i>'));
                    }
                    btn_group.append($('<button>').addClass("btn btn-small").attr('data-player-control', 'stepForward').attr('data-player', item.address).append('<i class="fa fa-forward"></i>'));
                    btn_group.append($('<button>').addClass("btn btn-small").attr('data-player-control', 'skipNext').attr('data-player', item.address).append('<i class="fa fa-fast-forward"></i>'));

                    btn_toolbar.append(btn_group);
                    info.append(btn_toolbar);

                }

                var row = $('<div>').addClass("row").append(thumb, info);

                $('#nowplaying').append(row);
                });
                $('#nowplaying').slideDown();
            }
        }
    });
}



function reloadTab() {
    var options = {'f': searchString};

    if ($('#movies').is(':visible')) {
        loadMovies(options);
    } else if ($('#shows').is(':visible')) {
        loadShows(options);
    } else if ($('#episodes').is(':visible')) {
        options = $.extend(options, {'tvshowid': currentShow});
        loadEpisodes(options);
    } else if ($('#artists').is(':visible')) {
        loadArtists(options);
    } else if ($('#albums').is(':visible')) {
        loadAlbums(options);
    } else if ($('#songs').is(':visible')) {
        options = $.extend(options, {'albumid': currentAlbum});
        loadSongs(options);
    }
}

function hideWatched() {

}

function errorHandler() {
    $('.spinner').hide();
    notify('Error','Error connecting to Plex','error');
    moviesLoading = false;
    return false;
}

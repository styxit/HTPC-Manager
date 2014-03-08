var searchString = '';
var hideWatched = 0;
var player = '';

var movieLoad = {
    last: 0,
    request: null,
    limit: 50,
    options: null
}

$(document).ready(function() {
    hideWatched = $('#hidewatched').hasClass('active')?1:0;
    playerLoader = setInterval('loadNowPlaying()', 2000);

    // Load data on tab display
    $('a[data-toggle=\'tab\']').click(function(e) {
        $('#search').val('');
        searchString = '';
    }).on('shown', reloadTab);
    $(window).trigger('hashchange')

     // Load more titles on scroll
    $(window).scroll(function() {
        if($(window).scrollTop() + $(window).height() >= $(document).height() - 10) {
            reloadTab();
        }
    });

    // Enable player controls
    $('[data-player-control]').click(function () {
        var action = $(this).attr('data-player-control');
        $.get(WEBDIR + 'plex/ControlPlayer?player='+player+'&action='+action);
    });

    // Toggle wether to show already seen episodes
    $('#hidewatched').click(function(e) {
        e.preventDefault();
        hideWatched = $(this).toggleClass('active').hasClass('active')?1:0;
        $(this).text(hideWatched?' Show Watched':' Hide Watched');
        $(this).prepend('<i class="icon-eye-open"></i>');
        $.get(WEBDIR + 'settings?plex_hide_watched='+hideWatched);
        reloadTab();
    });

});

function loadMovies(options) {
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

            movieLoad.last += movieLoad.limit;

            if (data.limits.end == data.limits.total) {
                movieLoad.last = -1;
            } else {
                movieLoad.last += movieLoad.limit;
            }

            if (data.movies != undefined) {
                $.each(data.movies, function (i, movie) {
                    var movieItem = $('<li>').attr('title', movie.title);

                    var movieAnchor = $('<a>').attr('href', '#').click(function(e) {
                        e.preventDefault();
                        loadMovie(movie);
                    });

                    var src = 'holder.js/100x150/text:No artwork';
                    if (movie.thumbnail != undefined) {
                        src = WEBDIR + 'plex/GetThumb?w=100&h=150&thumb='+encodeURIComponent(movie.thumbnail);
                    }
                    movieAnchor.append($('<img>').attr('src', src).addClass('thumbnail'));

                    if (movie.playcount >= 1) {
                        movieAnchor.append($('<i>').attr('title', 'Watched').addClass('icon-white icon-ok-sign watched'));
                    }

                    movieAnchor.append($('<h6>').addClass('title').html(shortenText(movie.title, 12)));

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
    var poster = WEBDIR + 'plex/GetThumb?w=200&h=300&thumb='+encodeURIComponent(movie.thumbnail)
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
            path: WEBDIR + 'img',
            score: (movie.rating / 2),
        }));
    }
    var buttons = {

    }
    showModal(movie.title + ' ('+movie.year+')', $('<div>').append(
        $('<img>').attr('src', poster).addClass('thumbnail movie-poster pull-left'),
        info
    ), buttons);
    $('.modal-fanart').css({
        'background-image' : 'url('+WEBDIR+'plex/GetThumb?w=675&h=400&o=10&thumb='+encodeURIComponent(movie.fanart)+')'
    });
}


var showLoad = {
    last: 0,
    request: null,
    limit: 50,
    options: null
};
var currentShow = null;

function loadShows(options) {
    console.log("Loading shows");
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
                        loadEpisodes({'tvshowid':show.tvshowid})
                    });

                    var src = 'holder.js/100x150/text:No artwork';
                    if (show.thumbnail != undefined) {
                        src = WEBDIR + 'plex/GetThumb?w=100&h=150&thumb='+encodeURIComponent(show.thumbnail);
                    }
                    showAnchor.append($('<img>').attr('src', src).addClass('thumbnail'));

                    if (show.playcount >= show.itemcount) {
                        showAnchor.append($('<i>').attr('title', 'Watched').addClass('icon-white icon-ok-sign watched'));
                    }

                    showAnchor.append($('<h6>').addClass('title').html(shortenText(show.title, 11)));

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
    limit: 50,
    options: null
}
var currentShow = null;
function loadEpisodes(options) {
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
                        playItem(episode.episodeid, 'episode');
                    });

                    var src = 'holder.js/150x85/text:No artwork';
                    if (episode.thumbnail != '') {
                        src = WEBDIR + 'plex/GetThumb?w=150&h=85&thumb='+encodeURIComponent(episode.thumbnail);
                    }
                    episodeAnchor.append($('<img>').attr('src', src).addClass('thumbnail'));

                    if (episode.playcount >= 1) {
                        episodeAnchor.append($('<i>').attr('title', 'Watched').addClass('icon-white icon-ok-sign watched'));
                    }

                    episodeAnchor.append($('<h6>').addClass('title').html(shortenText(episode.label, 18)));

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
    limit: 50,
    options: null
}
function loadArtists(options) {
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
                            $('<a>').attr('href','#').attr('title', 'Play all').html('<i class="icon-play">').click(function(e) {
                                e.preventDefault();
                                playItem(artist.artistid, 'artist');
                            }),
                            $('<a>').attr('href','#').attr('title', 'Enqueue all').html('<i class="icon-plus">').click(function(e) {
                                e.preventDefault();
                                queueItem(artist.artistid, 'artist');
                            })
                        ),
                        $('<td>').append(
                            $('<a>').attr('href','#').addClass('artist-link').html(artist.title).click(function(e) {
                                e.preventDefault(e);
                                $(this).parent().append(loadAlbums({'artistid' : artist.artistid}));
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
    limit: 50,
    options: null,
    artist: null
}
function loadAlbums(options) {
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
                        src = WEBDIR + 'plex/GetThumb?w=150&h=150&thumb='+encodeURIComponent(album.thumbnail);
                    }
                    albumItem.append($('<img>').attr('src', src).addClass('thumbnail'));

                    var albumCaption = $('<div>').addClass('grid-caption hide').append(
                        $('<a>').attr('href', '#').append(
                                $('<h6>').html(album.title),
                                $('<h6>').html(album.artist).addClass('artist')
                            ).click(function(e) {
                                e.preventDefault();
                                loadSongs({'albumid': album.albumid, 'search': album.title});
                            }),
                        $('<div>').addClass('grid-control').append(
                            $('<a>').attr('href', '#').append(
                                $('<img>').attr('src',WEBDIR + 'img/play.png').attr('title','Play')
                            ).click(function(e) {
                                e.preventDefault();
                                playItem(album.albumid, 'album');
                            }),
                            $('<a>').attr('href', '#').append(
                                $('<img>').attr('src',WEBDIR + 'img/add.png').attr('title','Queue')
                            ).click(function(e) {
                                e.preventDefault();
                                queueItem(album.albumid, 'album');
                                notify('Added', 'Album has been added to the playlist.', 'info');
                            })
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
    limit: 50,
    options: {},
    filter: ''
}
function loadSongs(options) {
    searchString = $('#search').val()
    if (options != undefined || searchString != songsLoad.filter) {
        songsLoad.last = 0
        $('#songs-grid tbody').empty()
        if (options != undefined) {
            songsLoad.options = options
            if (options.search) {
                $("#search").val(options.search);
                songsLoad.filter = options.search
            }
        } else {
            songsLoad.options = {}
            songsLoad.filter = searchString
        }
    }

    var active = (songsLoad.request!=null && songsLoad.request.readyState!=4)
    if (active || songsLoad.last == -1) return

    var sendData = {
        start: songsLoad.last,
        end: (songsLoad.last + songsLoad.limit),
        filter: (options && options.search ? '' : songsLoad.filter)
    }
    $.extend(sendData, songsLoad.options)

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
                            $('<a>').attr('href','#').append($('<i>').addClass('icon-plus')).click(function(e) {
                                e.preventDefault();
                                queueItem(song.songid, 'song')
                            }),
                            $('<a>').attr('href','#').text(' ' + song.label).click(function(e) {
                                e.preventDefault();
                                playItem(song.songid, 'song')
                            })
                        ),
                        $('<td>').append(
                            $('<a>').attr('href','#').text(song.artist).click(function(e) {
                                e.preventDefault();
                                loadSongs({'artistid': song.artistid[0], 'search': song.artist})
                            })
                        ),
                        $('<td>').append(
                            $('<a>').attr('href','#').text(song.album).click(function(e) {
                                e.preventDefault();
                                loadSongs({'albumid': song.albumid, 'search': song.album})
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
                $.each(data.playing_items, function (i, item) {
                var nowPlayingThumb = encodeURIComponent(item.thumbnail);
                var thumbnail = $('#nowplaying .thumb img').attr('alt', item.label);
                if (nowPlayingThumb == '') {
                    thumbnail.attr('src', 'holder.js/140x140/text:No artwork');
                    thumbnail.attr('width', '140').attr('height', '140');
                    Holder.run();
                } else {
                    switch(item.type) {
                        case 'episode':
                            thumbnail.attr('src', WEBDIR + 'plex/GetThumb?w=150&h=75&thumb='+nowPlayingThumb);
                            thumbnail.attr('width', '150').attr('height', '75');
                            break;
                        case 'movie':
                            thumbnail.attr('src', WEBDIR + 'plex/GetThumb?w=100&h=150&thumb='+nowPlayingThumb);
                            thumbnail.attr('width', '100').attr('height', '150');
                            break;
                        default:
                            thumbnail.attr('src', WEBDIR + 'plex/GetThumb?w=140&h=140&thumb='+nowPlayingThumb);
                            thumbnail.attr('width', '140').attr('height', '140');
                    }
                }
                    //console.log(item)
                    var itemTime = $('#nowplaying #player-item-time').html(parseSec(item.viewOffset/1000) + ' / ' + parseSec(item.duration/1000));
                    var itemTitel = $('#nowplaying #player-item-title')
                    var itemSubtitel = $('#nowplaying #player-item-subtitle')
                    var playingTitle = '';
                    var playingSubtitle = '';
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
            itemTitel.html(playingTitle);
            itemSubtitel.html(playingSubtitle);
            player = item.address;
            
            var progressBar = $('#nowplaying #player-progressbar .bar');
            progressBar.css('width', (item.viewOffset / item.duration)*100 + '%');
            if (item.protocolCapabilities.indexOf('playback') == -1) {
                $('#nowplaying_control').hide(); }
        });
                 $('#nowplaying').slideDown();
    }
}
});
}



function reloadTab() {
    var options = {};

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
        loadSongs();
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
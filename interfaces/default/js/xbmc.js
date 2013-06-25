var searchString = '';
$(document).ready(function() {
    loadNowPlaying();

    // Load data on tab display
    $('a[data-toggle="tab"]').on('shown', reloadTab);
    toggleTab();

    // Catch keyboard event and send to XBMC
    $(document).keydown(function(e) {
        if (!$('input').is(":focus")) {
            arrow = {8: 'Back', 27: 'Back', 13: 'Select', 37: 'Left', 38: 'Up', 39: 'Right', 40: 'Down',
                     88: 'Stop', 32: 'PlayPause'};
            command = arrow[e.which];
            if (command) {
                $.get(WEBDIR + 'xbmc/ControlPlayer?action='+command);
                e.preventDefault();
            }
        }
    });

    // Load serverlist and send command on change.
    var servers = $('#servers').change(function() {
         $.get(WEBDIR + 'xbmc/Servers?server='+$(this).val(), function(data) {
            notify('XBMC','Server change '+data,'info');
         });
    });
    $.get(WEBDIR + 'xbmc/Servers', function(data) {
        if (data==null) return;
        $.each(data.servers, function(i, item) {
            server = $('<option>').text(item.name).val(item.id);
            if (item.id == data.current) server.attr('selected','selected');
            servers.append(server);
        });
    }, 'json');

    // Enable player controls
    $('[data-player-control]').click(function () {
        var action = $(this).attr('data-player-control');
        $.get(WEBDIR + 'xbmc/ControlPlayer?action='+action);
    });

    // Toggle wether to show already seen episodes
    $('#hidewatched').click(function(e) {
        e.preventDefault();
        $(this).toggleClass('active');
        var hideWatched = $(this).hasClass('active')?1:0;
        $(this).text(hideWatched?'Show Watched':'Hide Watched')
        $.get(WEBDIR + 'settings?xbmc_hide_watched='+hideWatched);
        reloadTab();
    });

    // Send notification to XBMC
    $('#xbmc-notify').click(function() {
        msg = prompt("Message");
        if (msg) {
            $.post(WEBDIR + 'xbmc/Notify',{'text': msg}, function(data) {
                notify('XBMC', 'Notification sent successfully', 'info');
            });
        }
    });

    // Show subtitle selector if current has a subtitle track
    var subtitles = $('#subtitles').change(function() {
        $.get(WEBDIR + 'xbmc/Subtitles?subtitle='+$(this).val(), function (data) {
            notify('Subtitles','Change successful','info');
        });
    });
    // Show audio selector if current has multiple subtitles tracks
    var audio = $('#audio').change(function() {
        $.get(WEBDIR + 'xbmc/Audio?audio='+$(this).val(), function (data) {
            notify('Audio','Change successful','info');
        });
    });

    // Filter on searchfield changes
    $("#search").keyup(function (e) {
        if ($(this).val() == searchString) return;
        searchString = $(this).val();
        reloadTab();
    });

    // Load more titles on scroll
    $(window).scroll(function() {
        var scroll = $(window).scrollTop() + $(window).height() >= $(document).height() - 10;
        if ($('#movies').is(':visible') && !allMoviesLoaded && !moviesLoading && scroll) {
            loadMovies();
        } else if ($('#shows').is(':visible') && !allShowsLoaded && !showsLoading && scroll) {
            loadXbmcShows();
        } else if ($('#music').is(':visible') && !allArtistsLoaded && !artistsLoading && scroll) {
            loadArtists();
        }
    });
});

var lastMovieLoaded = 0;
var allMoviesLoaded = false;
var moviesLoading = false;
var movieRequest = null;
var movieLimit = 50;
function loadMovies(options) {
    if ($('#movie-grid').attr('data-scroll-limit') !== 0) {
        movieLimit = parseInt($('#movie-grid').attr('data-scroll-limit'));
    }
    if (movieRequest != null) {
        movieRequest.abort();
        moviesLoading = false;
    }
    if (options) {
        lastMovieLoaded = 0;
        allMoviesLoaded = false;
        $('#movie-grid').html('');
    }
    hidewatched = $('#hidewatched').hasClass('active')?1:0
    var sendData = {
        start: lastMovieLoaded,
        end: (lastMovieLoaded + movieLimit),
        hidewatched: hidewatched
    };
    $.extend(sendData, options);
    if (allMoviesLoaded) return;
    if (moviesLoading) return;
    $('.spinner').show();
    moviesLoading = true;
    movieRequest = $.ajax({
        url: WEBDIR + 'xbmc/GetMovies',
        type: 'get',
        data: sendData,
        dataType: 'json',
        success: function (data) {
            $('.spinner').hide();
            lastMovieLoaded += movieLimit;

            if (data == null) return errorHandler();

            if (data.limits.end == data.limits.total) {
                allMoviesLoaded = true;
            }

            if (data.movies != undefined) {
                $.each(data.movies, function (i, movie) {
                    var movieItem = $('<li>')
                    movieItem.attr('title', movie.title);
                    movieItem.attr('id', movie.title);

                    var movieAnchor = $('<a>').attr('href', '#');
                    movieAnchor.addClass('thumbnail');
                    if (movie.thumbnail != '') {
                      var src = WEBDIR + 'xbmc/GetThumb?w=100&h=150&thumb='+encodeURIComponent(movie.thumbnail);
                    } else {
                      var src = 'holder.js/100x150/text:No artwork';
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
            }
            moviesLoading = false;
            Holder.run();
        },
        error: function() {
            errorHandler();
        }
    });
}

function xbmcShowMovie(movie) {
    var modalMoviePoster = $('<img>').attr('src', WEBDIR + 'xbmc/GetThumb?w=200&h=300&thumb='+encodeURIComponent(movie.thumbnail));
    modalMoviePoster.addClass('movie-poster')

    var modalMovieAnchor = $('<div>').addClass('thumbnail pull-left');
    modalMovieAnchor.append(modalMoviePoster);

    var modalMovieInfo = $('<div>').addClass('modal-movieinfo');
    if(movie.streamdetails && movie.streamdetails.video[0]) {
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
            path: WEBDIR+'img',
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
        'background' : '#ffffff url(' + WEBDIR + 'xbmc/GetThumb?w=675&h=400&o=10&thumb='+encodeURIComponent(movie.fanart)+') top center no-repeat',
        'background-size' : '100%'
    });
}

var showSteps = 50;
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

    if (options) {
        lastShowLoaded = 0;
        allShowsLoaded = false;
        $('#show-grid').html('');
    }

    hidewatched = $('#hidewatched').hasClass('active')?1:0

    var sendData = {
        start: lastShowLoaded,
        end: (lastShowLoaded + showSteps),
        hidewatched: hidewatched
    };
    $.extend(sendData, options);

    if (allShowsLoaded) return;
    if (showsLoading) return;

    showsLoading = true;
    $('.spinner').show();
    showRequest = $.ajax({
        url: WEBDIR + 'xbmc/GetShows',
        type: 'get',
        dataType: 'json',
        data: sendData,
        success: function (data) {
            $('.spinner').hide();
            lastShowLoaded += showSteps;

            if (data == null) return errorHandler();

            if (data.limits.end == data.limits.total) {
                allShowsLoaded = true;
            }
            if (data.tvshows != undefined) {
                $.each(data.tvshows, function (i, show) {
                    var showItem = $('<li>').addClass('show-item').attr('title', show.title);

                    var showAnchor = $('<a>').attr('href', '#').attr('title',show.plot).click(function(e) {
                        e.preventDefault();
                        loadXBMCShow(show);
                    });
                    showAnchor.addClass('thumbnail');

                    var showPicture = $('<img>');
                    if ($('#show-grid').hasClass('banners')) {
                        if (show.thumbnail != '') {
                          var src = WEBDIR + 'xbmc/GetThumb?w=500&h=90&thumb='+encodeURIComponent(show.thumbnail);
                        } else {
                          var src = 'holder.js/500x90/text:No artwork';
                        }
                    } else {
                        if (show.thumbnail != '') {
                          var src = WEBDIR + 'xbmc/GetThumb?w=100&h=150&thumb='+encodeURIComponent(show.thumbnail);
                        } else {
                          var src = 'holder.js/100x150/text:No artwork';
                        }
                    }
                    showPicture.attr('src', src);
                    showAnchor.append(showPicture);
                    showItem.append(showAnchor);
                    if ($('#show-grid').hasClass('banners')) {
                        showItem.append($('<h6>').addClass('show-title').html(show.title));
                    } else {
                        showItem.append($('<h6>').addClass('show-title').html(shortenText(show.title, 12)));
                    }

                    $('#show-grid').append(showItem);
                });
            }
            showsLoading = false;
            Holder.run();
        }
    });
}

function xbmcShowEpisode(episode) {
    var modalshowPicture = $('<img>');
    modalshowPicture.attr('src', WEBDIR + 'xbmc/GetThumb?w=200&h=125&thumb='+encodeURIComponent(episode.thumbnail));

    var modalshowAnchor = $('<div>');
    modalshowAnchor.addClass('thumbnail pull-left');
    modalshowAnchor.css('margin-right', '20px')
    modalshowAnchor.append(modalshowPicture);

    var modalHeader = episode.showtitle + ': ' + episode.label

    var modalPlot = $('<p>').html(episode.plot);

    var modalEpisodeInfo = $('<div>');
    modalEpisodeInfo.append(modalshowAnchor);
    modalEpisodeInfo.append(modalPlot);

    showModal(modalHeader, modalEpisodeInfo, {
        'Play' : function () {
            playItem(episode.file);
            hideModal();
        }
    })

    $('.modal-fanart').css({
        'background' : '#ffffff url(' + WEBDIR + 'xbmc/GetThumb?w=675&h=400&o=10&thumb='+encodeURIComponent(episode.fanart)+') top center',
        'background-size' : '100%;'
    });
}

var currentShow = ''
function loadXBMCShow(show) {
    hidewatched = $('#hidewatched').hasClass('active')?1:0
    $('.spinner').show();
    $('#show-grid').hide();
    $('#show-seasons').empty();
    $.ajax({
        url: WEBDIR + 'xbmc/GetShow?tvshowid='+show.tvshowid+'&hidewatched='+hidewatched,
        type: 'get',
        dataType: 'json',
        success: function (data) {
            if (data == null || data.limits.total == 0) {
                $('#show-grid').show();
                $('#show-seasons').hide();
                reloadTab();
                return;
            };
            currentShow = show;
            var seasons = 0;
            $.each(data.episodes, function (i, episode) {
                if ($('#season' + episode.season).length == 0){
                    var seasonItem = $('<li>');
                    var seasonLink = $('<a>').attr('href','#season' + episode.season).html('Season ' + episode.season);
                    seasonLink.attr('data-toggle','collapse');
                    seasonLink.addClass('season-header well');
                    seasonItem.prepend($('<a>').attr('href','#').html('Back').addClass('btn pull-right').click(function(e) {
                        e.preventDefault();
                        $('#show-grid').show();
                        $('#show-seasons').hide();
                        reloadTab();
                    }));
                    seasonItem.append(seasonLink);
                    var seasonList = $('<ul>').attr('id','season' + episode.season).addClass('thumbnails')
                    if (seasons > 0) seasonList.addClass('collapse')
                    $('#show-seasons').append(seasonItem.append(seasonList));
                    seasons++;
                }
                var episodeItem = $('<li>');
                var episodeThumb = WEBDIR + 'xbmc/GetThumb?w=150&h=85&thumb='+encodeURIComponent(episode.thumbnail)
                var episodeLink = $('<a>').attr('href', '#').attr('title', episode.plot).addClass('thumbnail').click(function(e) {
                    e.preventDefault();
                    playItem(episode.episodeid, 'episode');
                }).append($('<img>').attr('src', episodeThumb));
                episodeItem.append(episodeLink);
                episodeItem.append($('<h6>').addClass('show-title').html(shortenText(episode.label, 20)));
                
                $('#season' + episode.season).append(episodeItem);
            });
            $('.spinner').hide();
            $('#show-seasons').show();
        }
    });
}

var currentArtist = ''
function xbmcLoadAlbums(artistid, elem){
    // Hide all albums
    $('#artist-grid .artist-albums').slideUp(300);

    // If currently clicked artist had albums showing; do nothing (hide albums only)
    if (currentArtist == artistid) {
        currentArtist = '';
        return;
    }

    $.ajax({
        url: WEBDIR + 'xbmc/GetAlbums/' + artistid,
        type: 'get',
        dataType: 'json',
        success: function(albums){
            // If artist has already been loaded just show
            if (elem.hasClass('albums-loaded')) {
                albumContainer.slideDown();
                return;
            }

            // container, holding albums
            var albumContainer = $('<ul>').addClass('artist-albums thumbnails').hide();

            // Loop albums
            $.each(albums.albums, function (i, album) {
                var link = $('<a>').attr('href', '#').attr('title', album.label).addClass('thumbnail').click(function(e) {
                    e.preventDefault();
                    playItem(album.albumid, 'album');
                    $('a[href=#playlist]').tab('show');
                });

                if (album.thumbnail) {
                    link.append($('<img>').attr('src', WEBDIR + 'xbmc/GetThumb?w=150&h=150&thumb='+encodeURIComponent(album.thumbnail)).addClass('albumart'));
                } else {
                    link.append($('<img>').attr('src', 'holder.js/150x150/text:'+album.label).attr('title', album.label));
                }
                link.append($('<h6>').addClass('album-title').html(shortenText(album.label, 21)));

                albumContainer.append($('<li>').append(link));
            });
            elem.append(albumContainer.addClass('albums-loaded'));
            albumContainer.slideDown();
            currentArtist = artistid;

            Holder.run();
        }
    });
}

var artistSteps = 20;
var lastArtistLoaded = 0;
var allArtistsLoaded = false;
var artistsLoading = false;
var artistRequest = null;
function loadArtists(options) {
    if ($('#artist-grid').attr('data-scroll-limit') !== 0) {
       artistSteps = parseInt($('#artist-grid').attr('data-scroll-limit'));
    }

    if (artistRequest != null) {
        artistRequest.abort();
        artistsLoading = false;
    }

    if (options) {
        lastArtistLoaded = 0;
        allArtistsLoaded = false;
        $('#artist-grid').html('');
    }

    var sendData = {
        start: lastArtistLoaded,
        end: (lastArtistLoaded + artistSteps),
    };
    $.extend(sendData, options);

    if (allArtistsLoaded) return;
    if (artistsLoading) return;

    artistsLoading = true;

    $('.spinner').show();
    artistRequest = $.ajax({
        url: WEBDIR + 'xbmc/GetArtists',
        type: 'get',
        data: sendData,
        dataType: 'json',
        success: function (data) {
            $('.spinner').hide();
            lastArtistLoaded += artistSteps;

            if (data == null) return errorHandler();

            if (data.limits.end == data.limits.total) {
                allArtistsLoaded = true;
            }

            if (data.artists != undefined) {
                $.each(data.artists, function (i, artist) {
                    $('#artist-grid').append($('<tr>').append(
                        $('<td>').append($('<a>').attr('href','#').attr('title', 'Play all songs for this artist').html('<i class="icon-play-circle">').click(function(e) {
                            e.preventDefault();
                            playItem(artist.artistid, 'artist');
                            $('a[href=#playlist]').tab('show');
                        })),
                        $('<td>').append($('<a>').attr('href','#').html(artist.label).click(function(e) {
                            e.preventDefault(e);
                            xbmcLoadAlbums(artist.artistid, $(this).parent());
                        }))
                    ));
                });
            }
            artistsLoading = false;
        },error: function() {
            errorHandler();
        }
    });
}

function loadChannels(){
    $.ajax({
        url: WEBDIR + 'xbmc/GetChannels',
        type: 'get',
        dataType: 'json',
        success: function(channels){
            var list = $('#pvr-grid');

            $.each(channels.channels, function (i, channel) {
                var link = $('<a>').attr('href', '#').attr('title', channel.label).addClass('thumbnail').click(function(e) {
                    e.preventDefault();
                });

                if (channel.thumbnail) {
                    link.append($('<img>').attr('src', WEBDIR + 'xbmc/GetThumb?w=75&h=75&thumb='+encodeURIComponent(channel.thumbnail)).addClass('channellogo'));
                } else {
                    link.append($('<img>').attr('src', 'holder.js/75x75/text:'+channel.label).attr('title', channel.label));
                }
                link.append($('<h6>').html(shortenText(channel.label, 21)));

                list.append($('<li>').append(link));
            });

            Holder.run();
        }
    });
}

var nowPlayingId = ''
var nowPlayingThumb = 'empty-image';
function loadNowPlaying() {
    $.ajax({
        url: WEBDIR + 'xbmc/NowPlaying',
        type: 'get',
        dataType: 'json',
        complete: function() {
            setTimeout('loadNowPlaying()', 1000);
        },
        success: function(data) {
            if (data == null) {
                // Hide how playing and playlist link
                $('#nowplaying').hide();
                $('a[href=#playlist]').parent().hide();
                $('#playlist-table tbody').html('');
                return;
            }
            $('#nowplaying').show();
            if (nowPlayingThumb != data.itemInfo.item.thumbnail) {
                nowPlayingThumb = data.itemInfo.item.thumbnail;

                var thumbnail = $('#nowplaying .thumb img');
                thumbnail.attr('alt', data.itemInfo.item.label);
                 thumbnail.removeAttr('style width height');
                if (nowPlayingThumb == '') {
                  thumbnail.attr('src', 'holder.js/140x140/text:No+artwork');
                  thumbnail.attr('width', '140').attr('height', '140');
                } else {
                  if (data.itemInfo.item.type == 'episode') {
                      thumbnail.attr('src', WEBDIR + 'xbmc/GetThumb?w=150&h=75&thumb='+encodeURIComponent(nowPlayingThumb));
                      thumbnail.attr('width', '150').attr('height', '75');
                  }
                  else if (data.itemInfo.item.type == 'movie') {
                      thumbnail.attr('src', WEBDIR + 'xbmc/GetThumb?w=100&h=150&thumb='+encodeURIComponent(nowPlayingThumb));
                      thumbnail.attr('width', '100').attr('height', '150');
                  }
                  else if (data.itemInfo.item.type == 'song') {
                      thumbnail.attr('src', WEBDIR + 'xbmc/GetThumb?w=180&h=180&thumb='+encodeURIComponent(nowPlayingThumb));
                      thumbnail.attr('width', '180').attr('height', '180');
                  }
                  else  {
                      thumbnail.attr('src', WEBDIR + 'xbmc/GetThumb?w=140&h=140&thumb='+encodeURIComponent(nowPlayingThumb));
                      thumbnail.attr('width', '140').attr('height', '140');
                  }
                }
                if (data.itemInfo.item.fanart) {
                    var nowPlayingBackground = WEBDIR + 'xbmc/GetThumb?w=1150&h=640&o=10&thumb='+encodeURIComponent(data.itemInfo.item.fanart);
                    $('#nowplaying').css({
                        'background' : 'url('+nowPlayingBackground+') no-repeat',
                        'background-size' : '100%;',
                        'background-position' : '50% 20%',
                        'margin-bottom' : '10px'
                    });
                }
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
                setMuteIcon.addClass('icon-volume-off');
            } else {
                setMuteIcon.addClass('icon-volume-up');
            }

            var playingTime = pad(data.playerInfo.time.hours, 2) + ':' + pad(data.playerInfo.time.minutes, 2) + ':' + pad(data.playerInfo.time.seconds, 2);
            var totalTime = pad(data.playerInfo.totaltime.hours, 2) + ':' + pad(data.playerInfo.totaltime.minutes, 2) + ':' + pad(data.playerInfo.totaltime.seconds, 2);
            var itemTime = $('#nowplaying #player-item-time');
            itemTime.html(playingTime + ' / ' + totalTime);

            var itemTitel = $('#nowplaying #player-item-title')
            var itemSubtitel = $('#nowplaying #player-item-subtitle')
            var playingTitle = '';
            var playingSubtitle = '';
            if (data.itemInfo.item.type == 'episode') {
                playingTitle = data.itemInfo.item.label;
                playingSubtitle = data.itemInfo.item.showtitle + ' ' + data.itemInfo.item.season + 'x' + data.itemInfo.item.episode;
            }
            else if (data.itemInfo.item.type == 'movie') {
                playingTitle = data.itemInfo.item.label;
                playingSubtitle  = data.itemInfo.item.year;
            }
            else if (data.itemInfo.item.type == 'song') {
                playingTitle = data.itemInfo.item.title;
                playingSubtitle  = data.itemInfo.item.artist[0] + ' (' + data.itemInfo.item.album + ')';
            } else {
                playingTitle = data.itemInfo.item.label;
            }
            itemTitel.html(playingTitle);
            itemSubtitel.html(playingSubtitle);

            $('#nowplaying #player-progressbar').click(function(e) {
                pos = ((e.pageX-this.offsetLeft)/$(this).width()*100).toFixed(2);
                $.get(WEBDIR + 'xbmc/ControlPlayer?action=Seek&percent='+pos);
            });

            var progressBar = $('#nowplaying #player-progressbar').find('.bar');
            progressBar.css('width', data.playerInfo.percentage + '%');

            var select = $('#audio').html('')
            select.parent().hide();
            if (data.playerInfo.audiostreams > 1) {
                var current = data.playerInfo.currentaudiostream.index;
                $.each(data.playerInfo.audiostreams, function (i, item) {
                    var option = $('<option>').html(item.name).val(item.index);
                    if (item.index==current) option.attr('selected','selected');
                    select.append(option);
                });
                select.parent().show();
            }
            var select = $('#subtitles').html('')
            select.parent().hide();
            if (data.playerInfo.subtitles && data.playerInfo.subtitles.length > 0) {
                data.playerInfo.subtitles.unshift({'index':'off','name':'None'});
                var current = data.playerInfo.currentsubtitle.index;
                if (data.playerInfo.subtitleenabled==false || current==='') current = 'off';
                $.each(data.playerInfo.subtitles, function (i, item) {
                    var name = item.name;
                    if (item.language && item.name != item.language) name += ' [' + item.language + ']'
                    var option = $('<option>').html(name).val(item.index);
                    if (item.index==current) option.attr('selected','selected');
                    select.append(option);
                });
                select.parent().show();
            }

            $('[data-player-control]').attr('disabled', false);

            //update playlist
            nowPlayingId = data.itemInfo.item.id;
            loadPlaylist(data.itemInfo.item.type=='song'?'audio':'video');
        }
    });
}

function loadPlaylist(type){
    $.ajax({
        url: WEBDIR + 'xbmc/Playlist/' + type,
        type: 'get',
        dataType: 'json',
        success: function(data) {
            $('a[href=#playlist]').parent().show();
            var playlist = $('#playlist-table tbody').html('');

            if (data.items == undefined || data.limits.total == 0) {
                playlist.html('<tr><td colspan="4">Playlist is empty</td></tr>');
                return;
            }

            $.each(data.items, function(i, item){
                var listItem = $('<tr>').attr('title',item.title).click(function(e) {
                    e.preventDefault();
                    playlistJump(i);
                });

                if (item.id == nowPlayingId) {
                    listItem.addClass('info active');
                }

                if (item.type == 'song') {
                    listItem.append(
                        $('<td>').html(shortenText(item.title,90)),
                        $('<td>').html(item.artist[0]),
                        $('<td>').html(item.album),
                        $('<td>').html(parseSec(item.duration))
                    );
                } else {
                    var label = item.label + ' (' + item.year + ')';
                    if (item.episode != -1) {
                        label = item.showtitle + ': ' + 
                                item.season + 'x' + item.episode + '. ' +
                                item.label
                    }
                    listItem.append(
                        $('<td>').html(label).attr('colspan','3'),
                        $('<td>').html(parseSec(item.runtime))
                    );
                }
                playlist.append(listItem);
            });
        }
    });
}

function playItem(item, type) {
    type = typeof type !== 'undefined' ? '&type='+type : '';
    $.get(WEBDIR + 'xbmc/PlayItem?item='+item+type);
}

function playlistJump(position) {
    $.get(WEBDIR + 'xbmc/ControlPlayer/JumpItem/'+position);
}

function errorHandler() {
    $('.spinner').hide();
    notify('Error','Error connecting to XBMC','error');
    moviesLoading = false;
    return false;
}

function reloadTab() {
    if ($('#movies').is(':visible')) {
        loadMovies({'filter': searchString});
    } else if ($('#shows').is(':visible')) {
        if ($('#show-seasons').is(':visible')) {
            loadXBMCShow(currentShow);
        } else {
            loadXbmcShows({'filter': searchString});
        }
    } else if ($('#music').is(':visible')) {
        loadArtists({'filter': searchString});
    } else if ($('#pvr').is(':visible')) {
        loadChannels();
    }
}

$(document).ready(function() {
    enablePlayerControls();
    loadMovies();
    loadXbmcShows();
    loadPlaylist('audio');
    loadArtists();
    loadNowPlaying();

    $(document).keydown(function(e) {
        if (!$('input').is(":focus")) {
            arrow = {8: 'Back', 27: 'Back', 13: 'Select', 37: 'Left', 38: 'Up', 39: 'Right', 40: 'Down',
                     88: 'Stop', 32: 'PlayPause'};
            command = arrow[e.which];
            if (command) {
                e.preventDefault();
                $.get(WEBDIR + 'xbmc/ControlPlayer?action='+command);
            }
        }
    });

    $.get(WEBDIR + 'xbmc/Servers', function(data) {
        if (data==null) return;
        var servers = $('<select>').change(function() {
             $.get(WEBDIR + 'xbmc/Servers?server='+$(this).val(), function(data) {
                notify('XBMC','Server change '+data,'info');
             });
        });
        $.each(data.servers, function(i, item) {
            var server = $('<option>').text(item.name).val(item.id);
            servers.append(server);
        });
        servers.val(data.current);
        $('#servers').append(servers);
    }, 'json');

    $('#hidewatched').click(function() {
        $(this).toggleClass('hidewatched');
        $('#show-seasons').hide();
        $('#show-grid').empty();
        allShowsLoaded = false;
        loadXbmcShows();
        $('#show-grid').show();
    });
    $('#xbmc-notify').click(function() {
        msg = prompt("Message");
        if (msg) sendNotification(msg);
    });
    $('#xbmc-restart').click(function() {
        var answer = confirm("Reboot xbmc system?");
        if (answer) {
          $.get(WEBDIR + 'xbmc/System?action=Reboot', function(data){
            notify('Reboot','Rebooting...','warning');
          });
        }
    });
    $('#xbmc-shutdown').click(function() {
        var answer = confirm("Shutdown xbmc system?");
        if (answer) {
          $.get(WEBDIR + 'xbmc/System?action=Suspend', function(data){
            notify('Shutdown','Shutting down...','warning');
          });
        }
    });
    $('.clean-video-lib').click(function(e) {
        e.preventDefault();
        xbmcClean('video');
    });
    $('.scan-video-lib').click(function(e) {
        e.preventDefault();
        xbmcScan('video');
    });
    $('.clean-audio-lib').click(function(e) {
        e.preventDefault();
        xbmcClean('audio');
    });
    $('.scan-audio-lib').click(function(e) {
        e.preventDefault();
        xbmcScan('audio');
    });

    // Audio search artist
    $('#xbmc-filter-artists').keyup(function(){
        loadArtists({
            'filter': $(this).val()
        });
    });

    var subtitles = $('#subtitles').change(function() {
        $.get(WEBDIR + 'xbmc/Subtitles?subtitle='+$(this).val(), function (data) {
            notify('Subtitles','Change successful','info');
        });
    });
    var audio = $('#audio').change(function() {
        $.get(WEBDIR + 'xbmc/Audio?audio='+$(this).val(), function (data) {
            notify('Audio','Change successful','info');
        });
    });

    $(window).scroll(function() {
        if(!allMoviesLoaded && !moviesLoading && $(window).scrollTop() + $(window).height() >= $(document).height() - 10) {
            if ($('#movies').is(':visible')) {
                loadMovies({
                    sortorder: $('.active-sortorder').attr('data-sortorder'),
                    sortmethod: $('.active-sortmethod').attr('data-sortmethod')
                });
            }
            if ($('#shows').is(':visible')) {
                loadXbmcShows();
            }
        }
    });
    $('[data-sortmethod]').click(function() {
        $('#movie-grid').html('');
        lastMovieLoaded = 0;
        allMoviesLoaded = false;
        var clickItem = $(this);
        $('.active-sortmethod i').remove();
        $('.active-sortmethod').removeClass('active-sortmethod');
        clickItem.addClass('active-sortmethod').prepend($('<i>').addClass('icon-ok'));
        loadMovies({
            sortorder: $('.active-sortorder').attr('data-sortorder'),
            sortmethod: $('.active-sortmethod').attr('data-sortmethod')
        });
    });
    $('[data-sortorder]').click(function() {
        $('#movie-grid').html('');
        lastMovieLoaded = 0;
        allMoviesLoaded = false;
        var clickItem = $(this);
        $('.active-sortorder i').remove();
        $('.active-sortorder').removeClass('active-sortorder');
        clickItem.addClass('active-sortorder').prepend($('<i>').addClass('icon-ok'));
        loadMovies({
            sortorder: $('.active-sortorder').attr('data-sortorder'),
            sortmethod: $('.active-sortmethod').attr('data-sortmethod')
        });
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

                    var showAnchor = $('<a>').attr('href', '#').click(function(e) {
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

function loadXBMCShow(show) {
    hidewatched = $('#hidewatched').hasClass('hidewatched')?1:0
    $('.spinner').show();
    $('#show-grid').hide();
    $('#show-seasons').empty();
    $.ajax({
        url: WEBDIR + 'xbmc/GetShow?tvshowid='+show.tvshowid+'&hidewatched='+hidewatched,
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
                    var src = WEBDIR + 'xbmc/GetThumb?w=150&h=85&thumb='+encodeURIComponent(episode.thumbnail)
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

function xbmcLoadAlbums(artistid, elem){
    // Check if current artist-albums are already showing
    var isLoaded = elem.hasClass('artist-albums-loaded');

    // Hide all albums
    var openArtists = $('#artist-grid .artist-albums');
    openArtists.slideUp(300, function() {
        $(this).remove();
    });
    elem.removeClass('artist-albums-loaded');

    // If currently clicked artist had albums showing; do nothing (hide albums only)
    if (isLoaded == true) return;

    $.ajax({
        url: WEBDIR + 'xbmc/GetAlbums/' + artistid,
        type: 'get',
        dataType: 'json',
        success: function(albums){
            // container, holding albums
            var albumContainer = $('<ul>').addClass('artist-albums thumbnails').hide();

            // Loop albums
            $.each(albums.albums, function (i, album) {
                var li = $('<li>').attr('title', album.label);
                var link = $('<a>').attr('href', '#').addClass('thumbnail').click(function(){
                    playItem(album.albumid, 'album');
                });

                if (album.thumbnail) {
                    link.append($('<img>').attr('src', WEBDIR + 'xbmc/GetThumb?w=150&h=150&thumb='+encodeURIComponent(album.thumbnail)).addClass('albumart'));
                } else {
                    link.append($('<img>').attr('src', 'holder.js/150x150/text:'+album.label).attr('title', album.label));
                }
                link.append($('<h6>').addClass('album-title').html(shortenText(album.label, 21)));

                albumContainer.append(li.append(link));
            });
            elem.addClass('artist-albums-loaded').append(albumContainer);
            albumContainer.slideDown();

            Holder.run();
        }
    });
}

function loadArtists(options) {
    var sendData = {
        start: 0,
        end: 25,
        sortorder: 'ascending',
        sortmethod: 'artist',
        filter: ''
    };
    $.extend(sendData, options);

    $('.spinner').show();
    artistRequest = $.ajax({
        url: WEBDIR + 'xbmc/GetArtists',
        type: 'get',
        data: sendData,
        dataType: 'json',
        success: function (data) {
            $('.spinner').hide();

            if (data == null) return errorHandler();

            if (data.artists != undefined) {
                $('#artist-grid').html('');
                $.each(data.artists, function (i, artist) {
                    $('#artist-grid').append($('<tr>').append(
                        $('<td>').append($('<a>').attr('href','#').attr('title', 'Play all songs for this artist').html('<i class="icon-play-circle">').click(function(e) {
                            e.preventDefault();
                            playItem(artist.artistid, 'artist');
                            notify('OK', artist.label + ' playing now.', 'success');
                        })),
                        $('<td>').append($('<a>').attr('href','#').html(artist.label).click(function(e) {
                            e.preventDefault(e);
                            xbmcLoadAlbums(artist.artistid, $(this).parent());
                        }))
                    ));
                });
            }
            paginateArtists(data.limits)
        },error: function() {
            errorHandler();
        }
    });
}

function paginateArtists(limit){
    current = limit.start/25
    $('#artistPager').pagination(limit.total,{
        current_page: current,
        num_edge_entries:1,
        items_per_page:25,
        num_display_entries:4,
        ellipse_text:'<a href="#">...</a>',
        callback:function(page,component){
            loadArtists({start: (page*25), end: (page*25+25), filter: $('#xbmc-filter-artists').val()});
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
                $('#nowplaying').hide();
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
            var playlist = $('#playlist-table tbody').html('');

            if (data.items == undefined || data.limits.total == 0) {
                playlist.html('<tr><td colspan="4">Playlist is empty</td></tr>');
                return;
            }

            $.each(data.items, function(i, item){
                var listItem = $('<tr>').click(function(e) {
                    e.preventDefault();
                    playlistJump(i);
                });

                if (item.id == nowPlayingId) {
                    listItem.addClass('info active');
                }

                if (item.type == 'song') {
                    listItem.append(
                        $('<td>').html(item.title),
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

function enablePlayerControls() {
    $('[data-player-control]').click(function () {
        var action = $(this).attr('data-player-control');
        $.get(WEBDIR + 'xbmc/ControlPlayer?action='+action);
    });
}

function sendNotification(string) {
    $.post(WEBDIR + 'xbmc/Notify',{'text': string}, function(data) {
        notify('XBMC', 'Notification sent successfully', 'info');
    });
}

function xbmcClean(lib) {
    $.get(WEBDIR + 'xbmc/Clean?lib='+lib, function(data) {
        notify('XBMC', 'Library clean sent successfully', 'info');
    });
}

function xbmcScan(lib) {
    $.get(WEBDIR + 'xbmc/Scan?lib='+lib, function(data) {
        notify('XBMC', 'Library update sent successfully', 'info');
    });
}

function errorHandler() {
    $('.spinner').hide();
    notify('Error','Error connecting to XBMC','error');
    moviesLoading = false;
    return false;
}

function loadMovies() {
    $.ajax({
        url: 'json/?which=xbmc&action=movies',
        type: 'get',
        dataType: 'json',
        success: function (data) {

            if (data == null) return false;
            $.each(data.movies, function (i, movie) {

                var moviePicture = $('<img>');
                moviePicture.css('height', '150px');
                moviePicture.css('width', '100px');
                moviePicture.attr('src', 'json/?which=xbmc&action=thumb&thumb=' + encodeURIComponent(movie.thumbnail) + '&w=100&h=150');

                var movieAnchor = $('<a>');
                movieAnchor.addClass('thumbnail');
                movieAnchor.attr('href', 'javascript:void(0);');
                movieAnchor.append(moviePicture);

                movieAnchor.click(function () {

                    // Maak inhoud van modal
                    var modalMoviePicture = moviePicture.clone();

                    var modalMovieAnchor = $('<div>');
                    modalMovieAnchor.addClass('thumbnail');
                    modalMovieAnchor.append(modalMoviePicture);

                    var modalMoviePoster = $('<td>');
                    modalMoviePoster.append(modalMovieAnchor);
                    modalMoviePoster.css('width', '110px');

                    var modalPlot = $('<td>');
                    modalPlot.html(movie.plot + '<h6><br />' + movie.studio + '</h6>');

                    var row = $('<tr>');
                    row.append(modalMoviePoster);
                    row.append(modalPlot)

                    var table = $('<table>');
                    table.addClass('table table-bordered');
                    table.append(row);


                    showModal(movieAnchor, movie.title + ' (' + movie.year + ')',  table, {
                        'Play' : function () {
                            playItem(movie.file);
                            hideModal();
                        }
                    })

                    // Achtergrondje maken
                    table.parent().css({
                        'background' : 'url(json/?which=xbmc&action=thumb&thumb=' + encodeURIComponent(movie.fanart) + '&w=600&h=400&o=10) top center',
                        'background-size' : '100%;'
                    });
                });

                var movieItem = $('<li>');
                movieItem.append(movieAnchor);

                $('#movie-grid').append(movieItem);
            });
        }
    });
}

function loadXbmcShows() {
    $.ajax({
        url: 'json/?which=xbmc&action=shows',
        type: 'get',
        dataType: 'json',
        success: function (data) {
            if (data == null) return false;
            $.each(data.tvshows, function (i, show) {

                var showPicture = $('<img>');
                if ($('#show-grid').hasClass('banners')) {
                    showPicture.attr('src', 'json/?which=xbmc&action=thumb&thumb=' + encodeURIComponent(show.thumbnail) + '&h=80&w=500');
                    showPicture.css('height', '90px');
                    showPicture.css('width', '500px');
                } else {
                    showPicture.attr('src', 'json/?which=xbmc&action=thumb&thumb=' + encodeURIComponent(show.thumbnail) + '&h=150&w=100');
                    showPicture.css('height', '150px');
                    showPicture.css('width', '100px');
                }

                var showAnchor = $('<a>');
                showAnchor.addClass('thumbnail');
                showAnchor.attr('href', 'javascript:void(0);');
                showAnchor.append(showPicture);
                showAnchor.click(function () {
                    loadXBMCShow(show);
                });

                var showItem = $('<li>');
                showItem.append(showAnchor);

                $('#show-grid').append(showItem);

            });
        }
    });
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
                //episodeArray = episodeArray.reverse();

                $.each(episodeArray, function (episodeCounter, episode) {
                    var row = $('<tr>');

                    var episodeImage = $('<img>');
                    episodeImage.css('height', '50px');
                    episodeImage.css('width', '100px');
                    episodeImage.attr('src', 'json/?which=xbmc&action=thumb&thumb=' + encodeURIComponent(episode.thumbnail) + '&w=100&h=50');

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
                    row.append($('<td>').html('<h5>Episode: ' + episode.episode + ' - ' + episode.label + '</h5>' + '<p>' + episode.plot + '</p>'));
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

            $('#show-grid').slideUp(function () {
                $('#show-details').slideDown();
            });


        }
    });
}

function playItem(item) {
    $.ajax({
        url: 'json/?which=xbmc&action=play&item=' + item,
        type: 'get',
        dataType: 'json'
    });
}

var nowPlayingThumb = '';
function loadNowPlaying() {

    $.ajax({
        url: 'json/?which=xbmc&action=nowplaying',
        type: 'get',
        dataType: 'json',
        complete: function() {
            loadNowPlaying();
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

                if (data.itemInfo.item.type == 'episode') {
                    thumbnail.attr('src', 'json/?which=xbmc&action=thumb&thumb=' + encodeURIComponent(data.itemInfo.item.thumbnail) + '&w=150&h=75');
                    thumbnail.css('height', '75px');
                    thumbnail.css('width', '150px');
                }
                if (data.itemInfo.item.type == 'movie') {
                    thumbnail.attr('src', 'json/?which=xbmc&action=thumb&thumb=' + encodeURIComponent(data.itemInfo.item.thumbnail) + '&w=100&h=150');
                    thumbnail.css('height', '150px');
                    thumbnail.css('width', '100px');
                }

                var thumbContainer = $('#nowplaying .thumbnail');
                thumbContainer.html(thumbnail);

                nowPlayingThumb = data.itemInfo.item.thumbnail;

                $('#nowplaying').css({
                    'background' : 'url(json/?which=xbmc&action=thumb&thumb=' + encodeURIComponent(data.itemInfo.item.fanart) + '&w=1150&h=640&o=10) top center',
                    'background-size' : '100%;'
                });
            }

            // Play knop
            var playPauseButton = $('[data-player-control=PlayPause]');
            var playPauseIcon = playPauseButton.find('i');
            playPauseIcon.removeClass();
            if (data.playerInfo.speed == 1) {
                playPauseIcon.addClass('icon-pause');
            } else {
                playPauseIcon.addClass('icon-play');
            }

            // Mute knop
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
            progressBar.tooltip({'title' : Math.round(data.playerInfo.percentage) + '%'});

            $('[data-player-control]').attr('disabled', false);
        }
    });
}

function sendNotification(text) {
    $.ajax({
        url: 'json/?which=xbmc&action=notify&text=' + text,
        type: 'get',
        dataType: 'json',
        success: function(data) {
            console.log(data);
        }
    });
}

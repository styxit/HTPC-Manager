$(document).ready(function () {
    moment().format();
    var qlty = [];
    $.when(profile()).done(function(qltyresult) {
        qlty = qltyresult;
        var movieid = $('h1.page-title').attr('data-movieid');
        var idz = $('h1.page-title').attr('data-id');
        loadmovieData(idz);
    });
});

/*
 All the ids need to get fixed some time
 its just confusing. I dont think tvdbid is used from anything

 */

function loadmovieData(movieId) {
    $.ajax({
        url: WEBDIR + 'radarr/Movie/' + movieId,
        type: 'get',
        dataType: 'json',
        success: function (movie) {
            if (!movie) {
                notify('Error', 'Movie not found.', 'error');
                return;
            }
            var qname = "Unknown";
            //Convert id to a Quality name
            $.each(qlty, function (i, q) {
                if (movie.qualityProfileId === q.id) {
                    qname = q.name;
                }
            });

            var inCinemas;
            // If there is a airdate format it, else leave set N/A
            if (movie.inCinemas) {
                inCinemas = moment(movie.inCinemas).calendar();
            } else {
                inCinemas = 'N/A';
            }
            if (movie.images.length > 0) {
                $.each(movie.images, function (i, cover) {
                    if (cover.coverType === "banner") {
                        // set the url to the banner so the modal can access it
                        $('h1.page-title').attr('data-bannerurl', cover.url);
                        // Fetch the banner
                        $('#banner').css('background-image', 'url(' + WEBDIR + 'radarr/GetBanner?url=MediaCover/' + movie.id + '/banner.jpg)');
                    }
                });
            }

            $('.radarr_want_quality').append(radarrStatusLabel(qname));
            $('.radarr_moviename').text(movie.title);
            $('.radarr_status').append(radarrStatusLabel(movie.status));
            $('.radarr_studio').text(movie.studio);
            $('.radarr_location').text(movie.path);
            $('.radarr_downloaded').append(movie.downloaded ? radarrStatusLabel(movie.movieFile.quality.quality.name) : radarrStatusLabel('Missing'));
            $('.radarr_overview').text(movie.overview);
            $('.radarr_imdb').text(movie.ratings.value);
            $('.radarr_runtime').text(movie.runtime + ' minutes');
            $('.radarr_genres').text(movie.genres.join(' '));
            $('.radarr_aka').text(movie.alternativeTitles.join(', ').replace(/,\s*$/, ""));


            $('#radarr_trailer').attr('src', "https://www.youtube.com/embed/" + movie.youTubeTrailerId);

            $('.radarr_incinemas').text(inCinemas);

            var menu = $('.movie-options-menu');
            $('.rescan-files')
                .attr('data-desc', 'Refresh Movie')
                .attr('data-method', 'RefreshMovie')
                .attr('data-param', 'movieId')
                .attr('data-id', movie.id)
                .attr('data-name', movie.title);

            $('.full-update')
                .attr('data-desc', 'Rescan Movie')
                .attr('data-method', 'RescanMovie')
                .attr('data-param', 'movieId')
                .attr('data-id', movie.id)
                .attr('data-name', movie.title);

            $('.search_all_ep_in_movie')
                .attr('data-desc', 'Search for movie')
                .attr('data-method', 'MoviesSearch')
                .attr('data-param', 'movieIds')
                .attr('data-id', movie.id)
                .attr('data-name', movie.title);

            /* // todo?
             $('.edit_movie').click(function (evt) {
             evt.preventDefault();
             loadmovie2(movie);
             });
             */

            $('.delete_movie').click(function (e) {
                e.preventDefault();
                delete_movie(movie);
            });

            //renderSeasonTabs(tvdbId, movie.id, movie);

        },
        error: function () {
            notify('Error', 'Error while loading movie.', 'error');
        }
    });
}

function radarrStatusIcon(iconText, white) {
    var text = [
        'Downloaded',
        'Missing',
        'continuing',
        'Snatched',
        'Unaired',
        'Archived',
        'Skipped',
        'ended'];
    var icons = [
        'fa fa-download',
        'fa fa-exclamation-triangle',
        'fa fa-play',
        'fa fa-cloud-download',
        'fa fa-clock-o',
        'fa fa-archive',
        'fa fa-fast-forward',
        'fa fa-stop'];

    if (text.indexOf(iconText) != -1) {
        var icon = $('<i>').addClass(icons[text.indexOf(iconText)]);
        if (white === true) {
            icon.addClass('fa-inverse');
        }
        return icon;
    }
    return '';
}

function radarrStatusLabel(text) {
    var statusOK = ['continuing', 'Downloaded', 'Any'];
    var statusInfo = ['Snatched', 'HD', 'HD - All', 'HD-720p', 'HD-1080p', 'HDTV-720p', 'HDTV-1080p', 'WEBDL-720p', 'WEBDL-1080p'];
    var statusError = ['ended', 'Missing'];
    var statusWarning = ['Skipped', 'SD', 'SD - All', 'SDTV', 'DVD'];
    var statusNormal = ['Bluray', 'Bluray-720p', 'Bluray-1080p'];
    var label = $('<span>').addClass('label').text(text);

    if (statusOK.indexOf(text) != -1) {
        label.addClass('label-success');
    } else if (statusInfo.indexOf(text) != -1) {
        label.addClass('label-info');
    } else if (statusError.indexOf(text) != -1) {
        label.addClass('label-important');
    } else if (statusWarning.indexOf(text) != -1) {
        label.addClass('label-warning');
    } else if (statusNormal.indexOf(text) != -1) {
        label;
    }

    var icon = radarrStatusIcon(text, true);
    if (icon !== '') {
        label.prepend(' ').prepend(icon);
    }
    return label;
}

// Grabs the quality profile
function profile(qualityProfileId) {
    var done = jQuery.Deferred();
    $.get(WEBDIR + 'radarr/Profile', function (result) {
        qlty = result;
        done.resolve(qlty);
    });
    return done;
}

// Not in use atm
function getbanner(bannerurl) {
    data = {
        url: bannerurl
    };
    $.get(WEBDIR + 'radarr/GetBanner', data, function (result) {
        $('#banner').css('background-image', 'url(' + result + ')');
    });
}


$(document).on('click', '.dostuff', function () {
    var method = $(this).attr('data-method');
    var name = $(this).attr('data-name');
    params = {
        method: $(this).attr('data-method'),
        par: $(this).attr('data-param'),
        id: $(this).attr('data-id'),
        name: $(this).attr('data-name')
    };
    $.getJSON(WEBDIR + "radarr/Command", params, function (result) {
        if (result.state) {
            notify(method, name, 'success');
        } else {
            notify(method, name, 'error');
        }

    });
});

function delete_movie(v) {
    data = {
        "id": v.id,
        "title": v.title
    };
    if (confirm('Are you sure you want to delete ' + v.title + ' ?')) {
        $.getJSON(WEBDIR + 'radarr/Delete_movie/', data, function (response) {
            if (response == '{}') {
                status = 'success';

            } else {
                status = 'error';
            }
            notify('Deleted', v.title + 'from radarr', status);
        });
    }
}

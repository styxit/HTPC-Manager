$(document).ready(function () {
    moment().format();
   // var qlty = profile();
    var movieid = $('h1.page-title').attr('data-movieid');
    var idz = $('h1.page-title').attr('data-id');
    var qqq = find_d_q(movieid)
    loadmovieData(movieid, idz);
});

/*
All the ids need to get fixed some time
its just confusing. I dont think tvdbid is used from anything

*/

function loadmovieData(movieId, tmdbId) {
    $.ajax({
        url: WEBDIR + 'radarr/Movie/' + movieId + '/' + tmdbId,
        type: 'get',
        dataType: 'json',
        success: function (movie) {
            if (!movie) {
                notify('Error', 'Movie not found.', 'error');
                return;
            }
            // Convert id to a Quality name
            // $.each(qlty, function (i, q) {
            //     if (movie.qualityProfileId == q.id) {
            //         qname = q.name;
            //     }
            // });
            console.log(movie);
            var qname = movie.qualityProfileId;
            var movieid = $('h1.page-title').attr('data-tvdbid');
            // If there is a airdate format it, else leave set N/A
            if (movie.nextAiring) {
                nextair = moment(movie.nextAiring).calendar();
            } else {
                nextair = 'N/A';
            }
            var at = (typeof (movie.airTime) == "undefined") ? 'TBA' : movie.airTime;
            if (movie.images.length > 0) {
                $.each(movie.images, function (i, cover) {
                    if (cover.coverType === "banner") {
                        // set the url to the banner so the modal can access it
                        $('h1.page-title').attr('data-bannerurl', cover.url);
                        // Fetch the banner
                        $('#banner').css('background-image', 'url(' + cover.url + ')');
                    }
                });
            }

            $('.radarr_want_quality').append(radarrStatusLabel(qname));
            $('.radarr_moviename').text(movie.title);
            $('.radarr_status').append(radarrStatusLabel(movie.status));
            $('.radarr_studio').text(movie.studio);
            $('.radarr_location').text(movie.path);
            $('.radarr_airs').text(at);
            $('.radarr_next_air').text(nextair);

            var menu = $('.movie-options-menu');
            $('.rescan-files')
                .attr('data-desc', 'Refresh Series')
                .attr('data-method', 'RefreshSeries')
                .attr('data-param', 'seriesId')
                .attr('data-id', movie.id)
                .attr('data-name', movie.title);

            $('.full-update')
                .attr('data-desc', 'Rescan Series')
                .attr('data-method', 'RescanSeries')
                .attr('data-param', 'seriesId')
                .attr('data-id', movie.id)
                .attr('data-name', movie.title);

            $('.search_all_ep_in_movie')
                .attr('data-desc', 'Search for all episodes')
                .attr('data-method', 'SeriesSearch')
                .attr('data-param', 'seriesId')
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

// movieid= tvdbid, id=radarrid
function renderSeasonTabs(movieid, id, movie) {
    list = $('#season-list');
    list.html('');

    $.each(movie.seasons, function (index, seasonNr) {
        var label = seasonNr.seasonNumber;
        // Specials are marked as season 0
        if (label === 0) {
            label = 'Specials';
        }
        var pill = $('<li>').append(
        $('<a>')
            .text(label)
            .attr('href', '#' + seasonNr.seasonNumber)
            .attr('data-season', seasonNr.seasonNumber)
            .attr('data-tvdbid', id)
            .attr('data-movieid', movieid));


        list.append(pill);
    });

    list.find('a').on('click', function () {
        var sn = $(this).attr('data-season');
        var sid = $(this).attr('data-id');
        rendseason(sid, id, sn);
    });

    if (movie.status == 'continuing') {
        // Activate latest season
        list.find('li:last-child a').trigger('click').parent().addClass('active');

    } else {
        if (movie.seasons[0].seasonNumber !== 0) {
            // if the are not specials trigger season 1
            list.find('li:first-child a').trigger('click').parent().addClass('active');
        } else {
            // Specials exist, pick season 1
            list.find('li:nth-of-type(2) a').trigger('click').parent().addClass('active');
        }
    }
}

function movieEpisodeInfo(episodeid, value) {
    var ep = value;
    $.getJSON(WEBDIR + "radarr/Episodeqly/" + episodeid + "/", function (pResult) {
        var sid = $('h1.page-title').attr('data-movieid');
        var strHTML = $("<table>").attr("class", "episodeinfo")
            .append($("<tr>")
            .append($("<td>").html("<b>Name</b>"))
            .append($("<td>").text(ep.title)))
            .append($("<tr>")
            .append($("<td>").html("<b>Summary</b>"))
            .append($("<td>").text(ep.overview)));

        if (ep.hasFile) {
            strHTML.append($("<tr>")
                .append($("<td>").html("<b>Air date</b>"))
                .append($("<td>").text(moment(ep.airDateUtc).calendar())))
                .append($("<tr>")
                .append($("<td>").html("<b>Quality</b>"))
                .append($("<td>").html(radarrStatusLabel(qname))))
                .append($("<tr>")
                .append($("<td>").html("<b>File size</b>"))
                .append($("<td>").text(bytesToSize(pResult.size, 2))))
                .append($("<tr>")
                .append($("<td>").html("<b>Location</b>"))
                .append($("<td>").text(pResult.path)));
        }

        movieModal($('<img>').attr('src', WEBDIR + 'radarr/GetBanner?url=MediaCover/' + sid + '/banner.jpg').addClass('img-rounded'),
        strHTML, []);
    });
}

//Graps info about all the files in the movie.
function find_d_q(id) {
    $.getJSON(WEBDIR + 'radarr/Episodesqly/' + id, function (result) {
        qqq = result;
    });
}

function rendseason(sID, id, seasonnumber) {
    $.getJSON(WEBDIR + 'radarr/Episodes/' + id, function (result) {
        var seasonContent = $('#season-content');
        // Clear table contents before inserting new row
        seasonContent.html('');

        // Loop through data
        $.each(result, function (index, value) {
            if (value.seasonNumber == seasonnumber) {
                if (value.hasFile) {
                    hasfile = 'Downloaded';
                } else {
                    hasfile = 'Missing';
                }

                var img = makeIcon('fa fa-search', 'Search for ' + value.title);
                var row = $('<tr>');
                var search_link = $('<a>').addClass('btn btn-mini dostuff')
                    .attr('data-method', 'episodeSearch')
                    .attr('data-param', 'episodeIds')
                    .attr('data-id', value.id)
                    .attr('data-name', value.title)
                    .append(img);

                row.append(
                $('<td>').text(value.episodeNumber),
                $('<td>').append($("<a>").text(value.title).click(function (pEvent) {
                    pEvent.preventDefault();
                    movieEpisodeInfo(value.episodeFileId, value);
                })),
                $('<td>').text(value.airDate),
                $('<td>').html(radarrStatusLabel(hasfile)),
                $('<td>').html(radarrStatusLabel(qname)),
                $('<td>').append(search_link));
                seasonContent.append(row);

                $.each(qqq, function (i, q) {
                    if (value.hasFile && value.episodeFileId === q.id) {
                        $('.quality').text(q.quality.quality.name);
                    }
                });

            }

        }); // end loop

        // Trigger tableSort update
        seasonContent.parent().trigger("update");
        seasonContent.parent().trigger("sorton", [
            [
                [0, 1]
            ]
        ]);
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
    $.get(WEBDIR + 'radarr/Profile', function (result) {
        qlty = result;
    });

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

function SeriesSearch(seriesid) {
    $.getJSON(WEBDIR + 'radarr/?name=SeriesSearch&seriesId=' + seriesid);
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

$(document).ready(function () {
    moment().format();
    var qlty = [];
    $.when(profile()).done(function(qltyresult) {
        var showid = $('h1.page-title').attr('data-showid');
        var idz = $('h1.page-title').attr('data-id');
        var qqq = find_d_q(showid)
        loadShowData(showid, idz);
    });
});

/*
All the ids need to get fixed some time
its just confusing. I dont think tvdbid is used from anything

*/

function loadShowData(seriesId, tvdbId) {
    $.ajax({
        url: WEBDIR + 'sonarr/Show/' + seriesId + '/' + tvdbId,
        type: 'get',
        dataType: 'json',
        success: function (tvshow) {
            if (!tvshow) {
                notify('Error', 'Show not found.', 'error');
                return;
            }
            // Convert id to a Quality name
            $.each(qlty, function (i, q) {
                if (tvshow.qualityProfileId == q.id) {
                    qname = q.name;
                }
            });

            var showid = $('h1.page-title').attr('data-tvdbid');
            // If there is a airdate format it, else leave set N/A
            if (tvshow.nextAiring) {
                nextair = moment(tvshow.nextAiring).calendar();
            } else {
                nextair = 'N/A';
            }
            var at = (typeof (tvshow.airTime) == "undefined") ? 'TBA' : tvshow.airTime;
            if (tvshow.images.length > 0) {
                $.each(tvshow.images, function (i, cover) {
                    if (cover.coverType === "banner") {
                        // set the url to the banner so the modal can access it
                        $('h1.page-title').attr('data-bannerurl', cover.url);
                        // Fetch the banner
                        $('#banner').css('background-image', 'url(' + WEBDIR + 'sonarr/GetBanner?url=MediaCover/' + tvshow.id + '/banner.jpg)');
                    }
                });
            }

            $('.sonarr_want_quality').append(sonarrStatusLabel(qname));
            $('.sonarr_showname').text(tvshow.title);
            $('.sonarr_status').append(sonarrStatusLabel(tvshow.status));
            $('.sonarr_network').text(tvshow.network);
            $('.sonarr_location').text(tvshow.path);
            $('.sonarr_airs').text(at);
            $('.sonarr_next_air').text(nextair);

            var menu = $('.show-options-menu');
            $('.rescan-files')
                .attr('data-desc', 'Refresh Series')
                .attr('data-method', 'RefreshSeries')
                .attr('data-param', 'seriesId')
                .attr('data-id', tvshow.id)
                .attr('data-name', tvshow.title)

            $('.full-update')
                .attr('data-desc', 'Rescan Series')
                .attr('data-method', 'RescanSeries')
                .attr('data-param', 'seriesId')
                .attr('data-id', tvshow.id)
                .attr('data-name', tvshow.title);

            $('.search_all_ep_in_show')
                .attr('data-desc', 'Search for all episodes')
                .attr('data-method', 'SeriesSearch')
                .attr('data-param', 'seriesId')
                .attr('data-id', tvshow.id)
                .attr('data-name', tvshow.title);

            /* // todo?
                $('.edit_show').click(function (evt) {
                    evt.preventDefault();
                    loadShow2(tvshow);
                });
                */

            $('.delete_show').click(function (e) {
                e.preventDefault();
                delete_show(tvshow);
            });

            renderSeasonTabs(tvdbId, tvshow.id, tvshow);

        },
        error: function () {
            notify('Error', 'Error while loading show.', 'error');
        }
    });
}

// showid= tvdbid, id=sonarrid
function renderSeasonTabs(showid, id, tvshow) {
    list = $('#season-list');
    list.html('');

    $.each(tvshow.seasons, function (index, seasonNr) {
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
            .attr('data-showid', showid));


        list.append(pill);
    });

    list.find('a').on('click', function () {
        var sn = $(this).attr('data-season');
        var sid = $(this).attr('data-id');
        rendseason(sid, id, sn);
    });

    if (tvshow.status == 'continuing') {
        // Activate latest season
        list.find('li:last-child a').trigger('click').parent().addClass('active');

    } else {
        if (tvshow.seasons[0].seasonNumber !== 0) {
            // if the are not specials trigger season 1
            list.find('li:first-child a').trigger('click').parent().addClass('active');
        } else {
            // Specials exist, pick season 1
            list.find('li:nth-of-type(2) a').trigger('click').parent().addClass('active');
        }
    }
}

function showEpisodeInfo(episodeid, value) {
    var ep = value;
    $.getJSON(WEBDIR + "sonarr/Episodeqly/" + episodeid + "/", function (pResult) {
        var sid = $('h1.page-title').attr('data-showid');
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
                .append($("<td>").html(sonarrStatusLabel(qname))))
                .append($("<tr>")
                .append($("<td>").html("<b>File size</b>"))
                .append($("<td>").text(bytesToSize(pResult.size, 2))))
                .append($("<tr>")
                .append($("<td>").html("<b>Location</b>"))
                .append($("<td>").text(pResult.path)));
        }

        showModal($('<img>').attr('src', WEBDIR + 'sonarr/GetBanner?url=MediaCover/' + sid + '/banner.jpg').addClass('img-rounded'),
        strHTML, []);
    });
}

//Graps info about all the files in the show.
function find_d_q(id) {
    $.getJSON(WEBDIR + 'sonarr/Episodesqly/' + id, function (result) {
        qqq = result;
    });
}

function rendseason(sID, id, seasonnumber) {
    $.getJSON(WEBDIR + 'sonarr/Episodes/' + id, function (result) {
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
                    showEpisodeInfo(value.episodeFileId, value);
                })),
                $('<td>').text(value.airDate),
                $('<td>').html(sonarrStatusLabel(hasfile)),
                $('<td>').html(sonarrStatusLabel(qname)),
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

function sonarrStatusIcon(iconText, white) {
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

function sonarrStatusLabel(text) {
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

    var icon = sonarrStatusIcon(text, true);
    if (icon !== '') {
        label.prepend(' ').prepend(icon);
    }
    return label;
}

// Grabs the quality profile
function profile(qualityProfileId) {
    var done = jQuery.Deferred();
    $.get(WEBDIR + 'sonarr/Profile', function (result) {
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
    $.get(WEBDIR + 'sonarr/GetBanner', data, function (result) {
        $('#banner').css('background-image', 'url(' + result + ')');
    });
}

function SeriesSearch(seriesid) {
    $.getJSON(WEBDIR + 'sonarr/?name=SeriesSearch&seriesId=' + seriesid);
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
    $.getJSON(WEBDIR + "sonarr/Command", params, function (result) {
        if (result.state) {
            notify(method, name, 'success');
        } else {
            notify(method, name, 'error');
        }

    });
});

function delete_show(v) {
    data = {
        "id": v.id,
        "title": v.title
    };
    if (confirm('Are you sure you want to delete ' + v.title + ' ?')) {
        $.getJSON(WEBDIR + 'sonarr/Delete_Show/', data, function (response) {
            if (response == '{}') {
                status = 'success';

            } else {
                status = 'error';
            }
            notify('Deleted', v.title + 'from sonarr', status);
        });
    }
}

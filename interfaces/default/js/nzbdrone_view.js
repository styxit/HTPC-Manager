$(document).ready(function () {
    moment().format();
    var qlty = profile();
    var showid = $('h1.page-title').attr('data-showid');
    var idz = $('h1.page-title').attr('data-id');
    var qqq = find_d_q(showid)
    loadShowData(showid, idz);
});

function loadShowData(seriesId, tvdbId) {
    $.ajax({
        url: WEBDIR + 'nzbdrone/Show/' + seriesId + '/' + tvdbId,
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

            // If the show is the one clicked on
            if (tvshow.tvdbId == tvdbId) {
                var showid = $('h1.page-title').attr('data-tvdbid');
                // If there is a airdate format it, else leave set N/A
                if (tvshow.nextAiring) {
                    nextair = moment(tvshow.nextAiring).calendar();
                } else {
                    nextair = 'N/A';
                }
                if (tvshow.images.length > 0) {
                    $.each(tvshow.images, function (i, cover) {
                        if (cover.coverType === "banner") {
                            // set the url to the banner so the modal can access it
                            $('h1.page-title').attr('data-bannerurl', cover.url);
                            // Fetch the banner
                            $('#banner').css('background-image', 'url(' + WEBDIR + 'nzbdrone/GetBanner/?url=' + cover.url + ')');
                        }
                    });
                }

                $('.nzbdrone_want_quality').text(qname);
                $('.nzbdrone_showname').text(tvshow.title);
                $('.nzbdrone_status').append(nzbdroneStatusLabel(tvshow.status));
                $('.nzbdrone_network').text(tvshow.network);
                $('.nzbdrone_location').text(tvshow.path);
                $('.nzbdrone_airs').text(tvshow.airTime);
                $('.nzbdrone_next_air').text(nextair);

                var menu = $('.show-options-menu');
                $('.rescan-files')
                    .attr('data-method', 'RefreshSeries')
                    .attr('data-param', 'seriesId')
                    .attr('data-id', tvshow.id)
                    .attr('data-name', tvshow.title)
                    .text('Refresh Series');

                $('.full-update')
                    .attr('data-desc', 'Rescan Serie')
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

                $('.edit_show').click(function (evt) {
                    evt.preventDefault();
                    loadShow2(tvshow);
                });

                $('.delete_show').click(function (e) {
                    e.preventDefault();
                    delete_show(tvshow);
                });

                renderSeasonTabs(tvdbId, tvshow.id, tvshow);
            }

        },
        error: function () {
            notify('Error', 'Error while loading show.', 'error');
        }
    });
}

// showid= tvdbid, id=nzbdroneid
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

    // Trigger latest season
    list.find('li:first-child a').trigger('click');
}

function showEpisodeInfo(episodeid, value) {
    var ep = value;
    $.getJSON(WEBDIR + "nzbdrone/Episodeqly/" + episodeid + "/", function (pResult) {
        bannerurl = $('h1.page-title').attr('data-bannerurl');
        var strHTML = $("<table>").attr("class", "episodeinfo")
            .append($("<tr>")
            .append($("<td>").html("<b>Name</b>"))
            .append($("<td>").text(ep.title)))
            .append($("<tr>")
            .append($("<td>").html("<b>Description</b>"))
            .append($("<td>").text(ep.overview)));

        if (ep.hasFile) {
            strHTML.append($("<tr>")
                .append($("<td>").html("<b>Air date</b>"))
                .append($("<td>").text(ep.airDateUtc)))
                .append($("<tr>")
                .append($("<td>").html("<b>Quality</b>"))
                .append($("<td>").text(pResult.quality.quality.name)))
                .append($("<tr>")
                .append($("<td>").html("<b>File size</b>"))
                .append($("<td>").text(bytesToSize(pResult.size, 2))))
                .append($("<tr>")
                .append($("<td>").html("<b>Location</b>"))
                .append($("<td>").text(pResult.path)));
        }

        showModal($('<img>').attr('src', WEBDIR + 'nzbdrone/GetBanner/?url=' + bannerurl).addClass('img-rounded'),
        strHTML, []);
    });
}

//Graps info about all the files in the show.
function find_d_q(id) {
    $.getJSON(WEBDIR + 'nzbdrone/Episodesqly/' + id, function (result) {
        qqq = result;
    });
}

function rendseason(sID, id, seasonnumber) {
    $.getJSON(WEBDIR + 'nzbdrone/Episodes/' + id, function (result) {
        $('#season-list li').removeClass('active');
        $(this).parent().addClass("active");
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

                var img = makeIcon('icon-search', 'Search for ' + value.title);
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
                $('<td>').html(nzbdroneStatusLabel(hasfile)),
                $('<td>').addClass('quality').text(''), // TODO when/if they change api
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

function nzbdroneStatusIcon(iconText, white) {
    var text = [
        'downloaded',
        'continuing',
        'snatched',
        'unaired',
        'archived',
        'skipped'];
    var icons = [
        'icon-download-alt',
        'icon-repeat',
        'icon-share-alt',
        'icon-time',
        'icon-lock',
        'icon-fast-forward'];

    if (text.indexOf(iconText) != -1) {
        var icon = $('<i>').addClass(icons[text.indexOf(iconText)]);
        if (white === true) {
            icon.addClass('icon-white');
        }
        return icon;
    }
    return '';
}

function nzbdroneStatusLabel(text) {
    var statusOK = ['continuing', 'downloaded', 'Downloaded', 'HD', 'HD-720p', 'HD-1080p', 'WEBDL-1080p'];
    var statusInfo = ['snatched', 'SD'];
    var statusError = ['ended'];
    var statusWarning = ['skipped'];
    var label = $('<span>').addClass('label').text(text);

    if (statusOK.indexOf(text) != -1) {
        label.addClass('label-success');
    } else if (statusInfo.indexOf(text) != -1) {
        label.addClass('label-info');
    } else if (statusError.indexOf(text) != -1) {
        label.addClass('label-important');
    } else if (statusWarning.indexOf(text) != -1) {
        label.addClass('label-warning');
    }

    var icon = nzbdroneStatusIcon(text, true);
    if (icon !== '') {
        label.prepend(' ').prepend(icon);
    }
    return label;
}

// Grabs the quality profile
function profile(qualityProfileId) {
    $.get(WEBDIR + 'nzbdrone/Profile', function (result) {
        qlty = result;
    });

}

// Not in use atm
function getbanner(bannerurl) {
    data = {
        url: bannerurl
    };
    $.get(WEBDIR + 'nzbdrone/GetBanner', data, function (result) {
        $('#banner').css('background-image', 'url(' + result + ')');
    });
}

function SeriesSearch(seriesid) {
    $.getJSON(WEBDIR + 'nzbdrone/?name=SeriesSearch&seriesId=' + seriesid);
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
    $.getJSON(WEBDIR + "nzbdrone/Command", params, function (result) {
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
        $.getJSON(WEBDIR + 'nzbdrone/Delete_Show/', data, function (response) {
            if (response == '{}') {
                status = 'success';

            } else {
                status = 'error';
            }
            notify('Deleted', v.title + 'from nzbdrone', status);
        });
    }
}
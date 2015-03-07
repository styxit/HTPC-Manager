$(document).ready(function() {
    var showid = $('h1.page-title').attr('data-showid');
    loadShowData(showid);
    $('#banner').css('background-image', 'url(' + WEBDIR + 'sickrage/GetBanner/' + showid + ')');
    $('.spinner').show();
});

function loadShowData(showid) {
    $.ajax({
        url: WEBDIR + 'sickrage/GetShow?indexerid=' + showid,
        type: 'get',
        dataType: 'json',
        success: function(data) {
            if (data.result != 'success') {
                notify('Error', 'Show not found.', 'error');
                return;
            }

            $('.sickrage_showname').text(data.data.show_name);
            $('.sickrage_status').append(sickrageStatusLabel(data.data.status));
            $('.sickrage_network').text(data.data.network);
            $('.sickrage_location').text(data.data.location);
            $('.sickrage_airs').text(data.data.airs);
            $('.sickrage_quality').append(sickrageStatusLabel(data.data.quality));
            if (data.next_ep_airdate !== '') {
                $('.sickrage_next_air').text(data.data.next_ep_airdate);
            }

            var menu = $('.show-options-menu');
            $('.rescan-files', menu).click(function(evt) {
                evt.preventDefault();
                rescanFiles(showid, data.data.show_name);
            });

            $('.full-update', menu).click(function(evt) {
                evt.preventDefault();
                forceFullUpdate(showid, data.data.show_name);
            });

            $('.edit-show', menu).click(function(evt) {
                loadShow(data.data);
                // Hack to set the correct quality in the select
                $("#qualitydropdown option:contains(" + data.data.quality + ")").attr(
                    'selected', 'selected');
            });

            $('.delete-show', menu).click(function(evt) {
                delete_show(data.data);
            });

            renderSeasonTabs(showid, data.data.season_list);
        },
        error: function() {
            notify('Error', 'Error while loading show.', 'error');
        },
        complete: function() {
            $('.spinner').hide();
        }
    });
}

function renderSeasonTabs(showid, seasons) {
    list = $('#season-list');
    list.html('');

    $.each(seasons, function(index, seasonNr) {
        var label = seasonNr;

        // Specials are marked as season 0
        if (label === 0) {
            label = 'Specials';
        }
        var pill = $('<li>').append(
            $('<a>')
            .text(label)
            .attr('href', '#' + seasonNr)
            .attr('data-season', seasonNr)
            .attr('data-showid', showid));

        list.append(pill);
    });
    list.find('a').on('click', renderSeason);

    // Trigger latest season
    list.find('li:first-child a').trigger('click');
}

function showEpisodeInfo(nShowID, nSeason, nEpisode) {
    $.getJSON(WEBDIR + "sickrage/GetEpisode/" + nShowID + "/" + nSeason + "/" + nEpisode, function(pResult) {
        var strHTML = $("<table>").attr("class", "episodeinfo")
            .append($("<tr>")
                .append($("<td>").html("<b>Name</b>"))
                .append($("<td>").text(pResult.data.name)))
            .append($("<tr>")
                .append($("<td>").html("<b>Description</b>"))
                .append($("<td>").text(pResult.data.description)));

        if (pResult.data.status == "Downloaded") {
            strHTML.append($("<tr>")
                    .append($("<td>").html("<b>Air date</b>"))
                    .append($("<td>").text(pResult.data.airdate)))
                .append($("<tr>")
                    .append($("<td>").html("<b>Quality</b>"))
                    .append($("<td>").text(pResult.data.quality)))
                .append($("<tr>")
                    .append($("<td>").html("<b>File size</b>"))
                    .append($("<td>").text(pResult.data.file_size_human)))
                .append($("<tr>")
                    .append($("<td>").html("<b>Location</b>"))
                    .append($("<td>").text(pResult.data.location)));
        }

        showModal(pResult.data.name, strHTML, []);
    });
}

function renderSeason() {
    $('#season-list li').removeClass('active');
    $(this).parent().addClass("active");

    showid = $(this).attr('data-showid');
    season = $(this).attr('data-season');

    $.ajax({
        url: WEBDIR + 'sickrage/GetSeason?indexerid=' + showid + '&season=' + season,
        type: 'get',
        dataType: 'json',
        success: function(data) {
            var seasonContent = $('#season-content');
            seasonContent.html(''); // Clear table contents before inserting new rows

            // If result is not 'succes' it must be a failure
            if (data.result != 'success') {
                notifyError('Error', 'This is not a valid season for this show');
                return;
            }

            // Loop through data
            $.each(data.data, function(index, value) {
                var row = $('<tr>');
                buttons = $('<div>').addClass('btn-group');

                var search_link = $('<a>').addClass('btn btn-mini').attr('title',
                    'Search new download').append($('<i>').addClass('icon-search')).on(
                    'click', function() {
                        searchEpisode(showid, season, index, value.name);
                    });

                var search_subs = $('<a>').addClass('btn btn-mini').attr('title',
                    'Search subtitle').append($('<i>').addClass('icon-comment')).on('click',
                    function() {
                        searchsub(showid, season, index, value.name);
                    });

                buttons.append(
                    search_link,
                    search_subs
                )

                var has_sub = ""
                    // value subtitles is a empty string if there isnt a sub, else subs language code "en" etc
                if (value.subtitles.length > 0) {
                    has_sub = makeIcon('icon-comment', value.subtitles);
                }

                row.append(
                    $('<td>').text(index),
                    $('<td>').append($("<a>").text(value.name).click(function(pEvent) {
                        pEvent.preventDefault();
                        showEpisodeInfo(showid, season, index);
                    })),
                    $('<td>').text(value.airdate),
                    $('<td>').append(sickrageStatusLabel(value.status)).append(has_sub),
                    $('<td>').append(sickrageStatusLabel(value.quality)),
                    $('<td>').append(buttons)

                );
                seasonContent.append(row);
            }); // end loop

            // Trigger tableSort update
            seasonContent.parent().trigger("update");
            seasonContent.parent().trigger("sorton", [
                [
                    [0, 0]
                ]
            ]);
        },
        error: function() {
            notify('Error', 'Error while loading season.', 'error');
        }
    });
}

function sickrageStatusLabel(text) {
    var statusOK = ['Continuing', 'Downloaded', 'HD', 'HD720p', 'HD1080p', 'HD TV', '720p WEB-DL', '1080p WEB-DL'];
    var statusInfo = ['Snatched'];
    var statusError = ['Ended'];
    var statusWarning = ['Skipped'];

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

    var icon = sickrageStatusIcon(text, true);
    if (icon !== '') {
        label.prepend(' ').prepend(icon);
    }
    return label;
}

function sickrageStatusIcon(iconText, white) {
    var text = [
        'Downloaded',
        'Continuing',
        'Snatched',
        'Unaired',
        'Archived',
        'Skipped'];
    var icons = [
        'icon-download-alt',
        'icon-repeat',
        'icon-share-alt',
        'icon-time',
        'icon-lock',
        'icon-fast-forward'];

    if (text.indexOf(iconText) != -1) {
        var icon = $('<i>').addClass(icons[text.indexOf(iconText)]);
        if (white == true) {
            icon.addClass('icon-white');
        }
        return icon;
    }
    return '';
}


// Not in use atm. Needs to a edit show to the api. and add more stuff from sb.show cmd.
function loadShow(data) {
    var table = $('<table>');
    table.addClass('table table-bordered table-striped table-condensed');

    row = $('<tr>');
    row.append('<th>Status</th><td>' + data.status + '</td>');
    table.append(row);

    row = $('<tr>');
    row.append('<th>Airs</th><td>' + data.airs + '</td>');
    table.append(row);

    row = $('<tr>');
    row.append('<th>Language</th><td>' + data.language + '</td>');
    table.append(row);

    row = $('<tr>');
    row.append('<th>Location</th><td>' + data.location + '</td>');
    table.append(row);

    row = $('<tr>');
    row.append('<th>Network</th><td>' + data.network + '</td>');
    table.append(row);

    // subtitle checkbox
    row = $('<tr>');
    row.append('<th>Subtitles</th>');
    sub_cb = $('<input class="modal_sub_cb"type="checkbox">')
    if (data.subtitles == 1) {
        sub_cb.prop("checked", true);

    }
    td = $('<td>').append(sub_cb)
    row.append(td);
    table.append(row);


    // Paused checkbox
    row = $('<tr>');
    row.append('<th>Paused</th>');
    paused_cb = $('<input class="modal_paused_cb" type="checkbox">')
    if (data.paused == 1) {
        paused_cb.prop("checked", true);
    }
    td = $('<td>').append(paused_cb)
    row.append(td);
    table.append(row);

    // anime
    row = $('<tr>');
    row.append('<th>Anime</th>');
    anime_cb = $('<input class="modal_anime_cb" type="checkbox">')
    if (data.anime == 1) {
        anime_cb.prop("checked", true);
    }
    td = $('<td>').append(anime_cb)
    row.append(td);
    table.append(row);

    // sports
    //sports
    row = $('<tr>');
    row.append('<th>Sports</th>');
    sports_cb = $('<input class="modal_sports_cb" type="checkbox">');
    if (data.sports == 1) {
        sports_cb.prop("checked", true);
    }
    td = $('<td>').append(sports_cb);
    row.append(td);
    table.append(row);

    // flatten_folders
    row = $('<tr>');
    row.append('<th>Flatten folders</th>');
    flatten_folders_cb = $('<input class="modal_flatten_folders_cb" type="checkbox">')
    if (data.flatten_folders == 1) {
        flatten_folders_cb.prop("checked", true);
    }
    td = $('<td>').append(flatten_folders_cb)
    row.append(td);
    table.append(row);

    // air-by-date
    row = $('<tr>');
    row.append('<th>Air-by-date</th>');
    air_by_date_cb = $('<input class="modal_flatten_folders_cb" type="checkbox">')
    if (data.air_by_date == 1) {
        air_by_date.prop("checked", true);
    }
    td = $('<td>').append(air_by_date_cb)
    row.append(td);
    table.append(row);


    // Quality select
    row = $('<tr>');
    row.append('<th>Quality</th>')
    select =
        '<select id="qualitydropdown"><option value="&amp;initial=sdtv|sddvd">SD</option> <option value="&amp;initial=hdtv|fullhdtv|hdwebdl|fullhdwebdl|hdbluray|fullhdbluray">HD</option> <option value="&amp;initial=hdtv|hdwebdl|hdbluray">HD720p</option> <option value="&amp;initial=fullhdtv|fullhdwebdl|fullhdbluray">HD1080p</option> <option value="&amp;initial=sdtv|sddvd|hdtv|fullhdtv|hdwebdl|fullhdwebdl|hdbluray|fullhdbluray|unknown">ANY</option></select>'
    row.append(select)
    table.append(row);


    modalContent = $('<div>');
    modalContent.append(
        $('<img>').attr('src', WEBDIR + 'sickrage/GetBanner/' + data.indexerid).addClass('img-rounded'),
        $('<br>'),
        table);

    var modalButtons = {
        'Show': function() {
            window.location = WEBDIR + 'sickrage/view/' + showid;
        }
    };

    showModal(data.show_name, modalContent, modalButtons);


}

function forceFullUpdate(indexerid, name) {
    var modalcontent = $('<div>');
    modalcontent.append($('<p>').html('Queueing &quot;' + name + ' &quot; for full TVDB information update..'));
    modalcontent.append($('<div>').html(
        '<div class="progress progress-striped active"><div class="bar" style="width: 100%;"></div></div>'));
    showModal('Queueing...', modalcontent, {});

    $.ajax({
        url: WEBDIR + 'sickrage/ForceFullUpdate?indexerid=' + indexerid,
        type: 'get',
        dataType: 'json',
        timeout: 15000,
        success: function(data) {
            // If result is not 'success' it must be a failure
            if (data.result != 'success') {
                notify('Error', data.message, 'error');
                return;
            } else {
                notify('OK', data.message, 'success');
                return;
            }
        },
        error: function(data) {
            notify('Error', 'Unable to queue tv show for full update.', 'error', 1);
        },
        complete: function(data) {
            hideModal();
        }
    });
}

// Replace this one, dont like it.
function rescanFiles(indexerid, name) {
    var modalcontent = $('<div>');
    modalcontent.append($('<p>').html('Queueing &quot;' + name + ' &quot; for files rescan..'));
    modalcontent.append($('<div>').html(
        '<div class="progress progress-striped active"><div class="bar" style="width: 100%;"></div></div>'));
    showModal('Queueing...', modalcontent, {});

    $.ajax({
        url: WEBDIR + 'sickrage/RescanFiles?indexerid=' + indexerid,
        type: 'get',
        dataType: 'json',
        timeout: 15000,
        success: function(data) {
            // If result is not 'success' it must be a failure
            if (data.result != 'success') {
                notify('Error', data.message, 'error');
                return;
            } else {
                notify('OK', data.message, 'success');
                return;
            }
        },
        error: function(data) {
            notify('Error', 'Unable to queue tv show for files rescan.', 'error', 1);
        },
        complete: function(data) {
            hideModal();
        }
    });
}

// Replace this one, dont like it
function searchEpisode(indexerid, season, episode, name) {
    var modalcontent = $('<div>');
    modalcontent.append($('<p>').html('Looking for episode &quot;' + name + '&quot;.'));
    modalcontent.append($('<div>').html(
        '<div class="progress progress-striped active"><div class="bar" style="width: 100%;"></div></div>'));
    showModal('Searching episode ' + season + 'x' + episode, modalcontent, {});

    $.ajax({
        url: WEBDIR + 'sickrage/SearchEpisodeDownload?indexerid=' + indexerid + '&season=' + season + '&episode=' +
            episode,
        type: 'get',
        dataType: 'json',
        timeout: 40000,
        success: function(data) {
            // If result is not 'succes' it must be a failure
            if (data.result != 'success') {
                notify('Error', data.message, 'error');
                return;
            } else {
                notify('OK', name + ' ' + season + 'x' + episode + ' found. ' + data.message, 'success');
                return;
            }
        },
        error: function(data) {
            notify('Error', 'Episode not found.', 'error', 1);
        },
        complete: function(data) {
            hideModal();
            // Trigger latest season
            $('#season-list li.active a').trigger('click');
        }
    });
}

function searchsub(indexerid, season, episode, name) {
    $.get(WEBDIR + 'sickrage/SearchSubtitle?indexerid=' + indexerid + '&season=' + season + '&episode=' + episode,
        function(data) {
            if (data.result != 'success') {
                notify('Error', data.message, 'error');
                return;
            } else {
                notify('OK', name + ' ' + season + 'x' + episode + ' found. ' + data.message, 'success');
                return;
            }
        }

    );

}

//TODO, needs to be added to sr api
function savesettings() {
    $.get(WEBDIR + 'sickrage/savesettings', function(data) {
            if (data.result != 'success') {
                notify('Error', data.message, 'error');
                return;
            } else {
                notify('OK', name + ' ' + season + 'x' + episode + ' found. ' + data.message, 'success');
                return;
            }
        }

    );

}

function deleteshow() {
    var name = $('.sickrage_showname')
    $.get(WEBDIR + 'sickrage/RemoveShow', function(data) {
            if (data.result != 'success') {
                notify('Error', data.message, 'error');
                return;
            } else {
                notify('OK', name + ' ' + season + 'x' + episode + ' found. ' + data.message, 'success');
                return;
            }
        }

    );

}

function delete_show(tvshow) {
    data = {
        "indexerid": tvshow.indexerid,
        "show_name": tvshow.show_name
    };
    if (confirm('Are you sure you want to delete ' + tvshow.show_name + ' ?')) {
        $.getJSON(WEBDIR + 'sickrage/RemoveShow/', data, function(response) {
            if (response.result != 'success') {
                notify('Error', response.message, 'error');
                return;
            } else {
                notify('OK', response.message, 'success');
                return;
            }
        });
        setTimeout(function() {
            window.location.href = WEBDIR + '/sickrage'
        }, 2500);
    }
}
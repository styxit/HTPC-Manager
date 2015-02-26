$(document).ready(function() {
    $.ajaxSetup({
        timeout: 1200000
    });
    $('.spinner').show();
    $(window).trigger('hashchange');
    loadNextAired();
    loadsickrageHistory(25);
    loadLogs();
    loadShows();
    showstats();


    $('#add_show_button').click(function() {
        $(this).attr('disabled', true);
        searchTvDb($('#add_show_name').val());
    });

    $('#add_tvdbid_button').click(function() {
        addShow($('#add_show_select').val(), $('#add_show_select').find('option:selected').attr(
            'data-indexer'));
    });

    $('#cancel_show_button').click(function() {
        cancelAddShow();
    });

    $('#postprocess').click(function(e) {
        e.preventDefault();
        Postprocess();
    });

});

function loadShows() {
    $.ajax({
        url: WEBDIR + 'sickrage/GetShowList',
        type: 'get',
        dataType: 'json',
        success: function(result) {
            $('.spinner').show();
            if (result.data.length === 0) {
                var row = $('<tr>')
                row.append($('<td>').html('No shows found'));
                $('#tvshows_table_body').append(row);
            }
            $.each(result.data, function(showname, tvshow) {
                var name = $('<a>').attr('href', WEBDIR + 'sickrage/view/' + tvshow.indexerid).text(
                    showname);
                var row = $('<tr>');
                row.append(
                    $('<td>').html(name),
                    $('<td>').html(sickrageStatusLabel(tvshow.status)),
                    $('<td>').html(tvshow.next_ep_airdate),
                    $('<td>').html(tvshow.network),
                    $('<td>').html(sickrageStatusLabel(tvshow.quality)));
                $('#tvshows_table_body').append(row);
            });
            $('#tvshows_table_body').parent().trigger('update');
            $('#tvshows_table_body').parent().trigger("sorton", [
                [
                    [0, 1]
                ]
            ]);
        },
        complete: function() {
            $('.spinner').hide();
        }
    });
}

//modal
function loadShow(indexerid) {
    $.ajax({
        url: WEBDIR + 'sickrage/GetShow?indexerid=' + indexerid,
        type: 'get',
        dataType: 'json',
        success: function(data) {
            data = data.data;

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
            row.append('<th>Quality</th><td>' + data.quality + '</td>');
            table.append(row);

            row = $('<tr>');
            row.append('<th>Network</th><td>' + data.network + '</td>');
            table.append(row);

            modalContent = $('<div>');
            modalContent.append(
                $('<img>').attr('src', WEBDIR + 'sickrage/GetBanner/' + indexerid).addClass(
                    'img-rounded'),
                $('<hr>'),
                table);

            var modalButtons = {
                'Show': function() {
                    window.location = WEBDIR + 'sickrage/view/' + indexerid;
                }
            };

            showModal(data.show_name, modalContent, modalButtons);
        }
    });
}


// TODO add i with popover with summary of the episode
// add add a new th with s03e04 examples in addition to the ep name.
function loadNextAired(options) {
    var defaults = {
        limit: 0
    };
    $.extend(defaults, options);

    $.ajax({
        url: WEBDIR + 'sickrage/GetNextAired',
        type: 'GET',
        dataType: 'json',
        success: function(result) {
            // If sickrage not configured, return false (Dashboard)
            if (result === null) return false;

            if (result.data.soon.length === 0 && result.data.later.length === 0 && result.data.today.length === 0 && result.data.missed.length === 0) {
                var row = $('<tr>');
                row.append($('<td>').html('No future/missing episodes found'));
                $('#nextaired_table_body').append(row);
                return false;
            }



            var soonaired = result.data.soon;
            var todayaired = result.data.today;
            var nextaired = todayaired.concat(soonaired);
            var lateraired = result.data.later;

            $.each(result.data.missed, function(i, tvshow) {

                var row = $('<tr class="error">');
                var name = $('<a>').attr('href', '#').html(tvshow.show_name).click(function(e) {
                    loadShow(tvshow.indexerid);
                });

                var img = makeIcon('icon-info-sign', tvshow.ep_plot);

                var search_subs = $('<a>').addClass('btn btn-mini').attr('title',
                    'Search subtitle').append($('<i>').addClass('icon-comment')).on('click',
                    function() {
                        searchsub(tvshow.indexerid, tvshow.season, tvshow.episode, tvshow.show_name + ' ' + tvshow.ep_name);
                });

                var search_link = $('<a>').addClass('btn btn-mini').attr('title',
                        'Search new download').append($('<i>').addClass('icon-search')).on(
                        'click', function() {
                            searchEpisode(tvshow.indexerid, tvshow.season, tvshow.episode, tvshow.show_name + ' ' + tvshow.ep_name);
                });

                buttons = $('<div>').addClass('btn-group');

                buttons.append(
                    search_link,
                    search_subs
                )

                row.append(
                    $('<td>').append(name),
                    $('<td>').html(tvshow.ep_name + '&nbsp').append(img),
                    $('<td>').html(tvshow.airdate),
                    $('<td>').html(buttons));

                $('#nextaired_table_body').append(row);
            });



            // Loop next airing episodes
            $.each(nextaired, function(i, tvshow) {

                var row = $('<tr>');
                var name = $('<a>').attr('href', '#').html(tvshow.show_name).click(function(e) {
                    loadShow(tvshow.indexerid);
                });

                var img = makeIcon('icon-info-sign', tvshow.ep_plot);

                var search_subs = $('<a>').addClass('btn btn-mini').attr('title',
                    'Search subtitle').append($('<i>').addClass('icon-comment')).on('click',
                    function() {
                        searchsub(tvshow.indexerid, tvshow.season, tvshow.episode, tvshow.show_name + ' ' + tvshow.ep_name);
                });

                var search_link = $('<a>').addClass('btn btn-mini').attr('title',
                        'Search new download').append($('<i>').addClass('icon-search')).on(
                        'click', function() {
                            searchEpisode(tvshow.indexerid, tvshow.season, tvshow.episode, tvshow.show_name + ' ' + tvshow.ep_name);
                });

                buttons = $('<div>').addClass('btn-group');

                buttons.append(
                    search_link,
                    search_subs
                )

                row.append(
                    $('<td>').append(name),
                    $('<td>').html(tvshow.ep_name + '&nbsp').append(img),
                    $('<td>').html(tvshow.airdate),
                    $('<td>').html(buttons));

                $('#nextaired_table_body').append(row);
            });

            // Loop later airing episodes
            $.each(lateraired, function(i, tvshow) {

                var row = $('<tr>');
                var name = $('<a>').attr('href', '#').html(tvshow.show_name).click(function(e) {
                    loadShow(tvshow.indexerid);
                });

                var img = makeIcon('icon-info-sign', tvshow.ep_plot);
                var search_subs = $('<a>').addClass('btn btn-mini').attr('title',
                    'Search subtitle').append($('<i>').addClass('icon-comment')).on('click',
                    function() {
                        searchsub(tvshow.indexerid, tvshow.season, tvshow.episode, tvshow.show_name + ' ' + tvshow.ep_name);
                });

                var search_link = $('<a>').addClass('btn btn-mini').attr('title',
                        'Search new download').append($('<i>').addClass('icon-search')).on(
                        'click', function() {
                            searchEpisode(tvshow.indexerid, tvshow.season, tvshow.episode, tvshow.show_name + ' ' + tvshow.ep_name);
                });

                buttons = $('<div>').addClass('btn-group');

                buttons.append(
                    search_link,
                    search_subs
                )

                row.append(
                    $('<td>').append(name),
                    $('<td>').html(tvshow.ep_name + '&nbsp').append(img),
                    $('<td>').html(tvshow.airdate),
                    $('<td>').html(buttons));

                $('#nextaired_table_body').append(row);
            });

            $('#nextaired_table_body').parent().trigger('update');
        }
    });
}

function loadsickrageHistory(limit) {
    $.ajax({
        url: WEBDIR + 'sickrage/GetHistory?limit=' + limit,
        type: 'GET',
        dataType: 'json',
        success: function(result) {
            if (result.data.length === 0) {
                var row = $('<tr>');
                row.append($('<td>').html('History is empty'));
                $('#history_table_body').append(row);
            }

            $.each(result.data, function(tvdbid, tvshow) {
                var row = $('<tr>');
                row.append(
                    $('<td>').html(tvshow.date),
                    $('<td>').append($('<a>').text(tvshow.show_name).attr('href', WEBDIR +
                        'sickrage/view/' + tvshow.indexerid)),
                    $('<td>').html(tvshow.season + 'x' + tvshow.episode),
                    $('<td>').append(sickrageStatusLabel(tvshow.status)),
                    $('<td>').html(tvshow.quality));

                $('#history_table_body').append(row);
            });
            $('#history_table_body').parent().trigger('update');
        }
    });
}

function loadLogs() {
    $.ajax({
        url: WEBDIR + 'sickrage/GetLogs',
        type: 'get',
        dataType: 'json',
        success: function(result) {
            if (result.data.length === 0) {
                var row = $('<tr>');
                row.append($('<td>').html('Log is empty'));
                $('#log_table_body').append(row);
            }
            $.each(result.data, function(i, logitem) {
                var row = $('<tr>');
                row.append($('<td>').html(logitem));
                $('#log_table_body').append(row);
            });
        }
    });
}

function searchTvDb(query) {
    $.ajax({
        url: WEBDIR + 'sickrage/SearchShow?query=' + query,
        type: 'get',
        success: function(tvshow) {
            if (tvshow.result != "success") {
                $('#add_show_button').attr('disabled', false);
                return;
            }
            $('#add_show_select').html('');
            $.each(tvshow.data.results, function(i, opt) {
                var indexername = (opt.tvdbid) ? 'TVDB' : 'TVRAGE';
                var indexerkwarg = (opt.tvdbid) ? 'tvdbid' : 'tvrageid';
                var option = $('<option>');
                if (opt.tvrageid) {
                    option.attr('value', opt.tvrageid).attr('data-indexer', indexerkwarg);
                } else {
                    option.attr('value', opt.tvdbid).attr('data-indexer', indexerkwarg);
                }

                option.html(opt.name + ' (' + opt.first_aired + ') ' + indexername);
                $('#add_show_select').append(option);
            });
            $('#add_show_name').hide();
            $('#cancel_show_button').show();
            $('#add_show_select').fadeIn();
            $('#add_show_button').attr('disabled', false).hide();
            $('#add_tvdbid_button').show();
        }
    });
}

function addShow(indexerid, indexername) {
    $.ajax({
        url: WEBDIR + 'sickrage/AddShow?' + indexername + '=' + indexerid,
        type: 'get',
        dataType: 'json',
        success: function(data) {
            notify('Add TV show', data.message, 'success');
            cancelAddShow();
        }
    });
}

function cancelAddShow() {
    $('#add_show_name').val('');
    $('#add_show_select').hide();
    $('#cancel_show_button').hide();
    $('#add_show_name').fadeIn();
    $('#add_tvdbid_button').hide();
    $('#add_show_button').show();
}

function sickrageStatusLabel(text) {
    var statusOK = ['Continuing', 'Downloaded', 'HD', 'HD720p', 'HD1080p'];
    var statusInfo = ['Snatched'];
    var statusError = ['Ended', 'SD'];
    var statusWarning = ['Skipped', 'Custom'];

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
        if (white === true) {
            icon.addClass('icon-white');
        }
        return icon;
    }
    return '';
}

function Postprocess() {
    var data = {};
    p = prompt('Write path to processfolder or leave blank for default path');
    if (p || p.length >= 0) {
        data.path = p;

        $.get(WEBDIR + 'sickrage/Postprocess', data, function(r) {
            state = (r.length) ? 'success' : 'error';
            // Stop the notify from firing on cancel
            if (p !== null) {
                path = (p.length === 0) ? 'Default folder' : p;
                notify('sickrage', 'Postprocess ' + path, state);
            }
        });

    }
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
        }
    });
}

function showstats() {
    $.ajax({
        url: WEBDIR + 'sickrage/ShowsStats',
        type: 'get',
        dataType: 'json',
        success: function (result) {
            if (result.result == 'success') {
                $('.sickrage_shows_total').text("Tvshows: " + result.data.shows_total);
                $('.sickrage_ep_downloaded').text("Downloaded episodes: " + result.data.ep_downloaded);
                $('.sickrage_ep_total').text("Total episodes: " + result.data.ep_total);
            }

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

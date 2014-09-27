$(document).ready(function () {
    moment().format();
    $(window).trigger('hashchange');
    var qlty = profile();
    loadShows();
    history();
    calendar();
    
    $('#add_show_button').click(function () {
        $(this).attr('disabled', true);
        searchTvDb($('#add_show_name').val());
    });

    $('#add_tvdbid_button').click(function () {
        addShow($('#add_show_select').val(), $('#add_show_quality').val());
    });

    $('#cancel_show_button').click(function () {
        cancelAddShow();
    });

    $('#scanfolder').click(function (e) {
        e.preventDefault();
        Scanfolder()
    });


});

function loadShows() {
    $.ajax({
        url: WEBDIR + 'nzbdrone/Series',
        type: 'get',
        dataType: 'json',
        success: function (result) {
            if (result.length === 0) {
                var row = $('<tr>');
                row.append($('<td>').html('No shows found'));
                $('#tvshows_table_body').append(row);
            }
            $.each(result, function (showname, tvshow) { // tvshow.tvdbId 
                var name = $('<a>').attr('href', WEBDIR + 'nzbdrone/View/' + tvshow.id + '/' + tvshow.tvdbId).text(tvshow.title);
                var row = $('<tr>');
                // Check the global var as nzbdrone dont have quality name only a id.
                $.each(qlty, function (i, q) {
                    if (tvshow.qualityProfileId == q.id) {
                        qname = q.name;
                    }
                });
                if (tvshow.nextAiring) {
                    nextair = moment(tvshow.nextAiring).calendar();
                } else {
                    nextair = 'N/A';
                }
                row.append(
                $('<td>').html(name),
                $('<td>').html(nzbdroneStatusLabel(tvshow.status)),
                $('<td>').html(nextair),
                $('<td>').html(tvshow.network),
                $('<td>').html(nzbdroneStatusLabel(qname)));
                $('#tvshows_table_body').append(row);
            });
            $('#tvshows_table_body').parent().trigger('update');
            $('#tvshows_table_body').parent().trigger("sorton", [
                [
                    [0, 0]
                ]
            ]);
        }
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
    var statusOK = ['continuing', 'downloaded', 'HD', 'HD-720p', 'HD-1080p', 'WEBDL-1080p'];
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

function profile(qualityProfileId) {
    $.get(WEBDIR + 'nzbdrone/Profile', function (result) {
        qlty = result
    });
}

function history() {
    $.getJSON(WEBDIR + 'nzbdrone/History', function (result) {
        $.each(result.records, function (i, log) {
            var row = $('<tr>');
            row.append(
            $('<td>').text(moment(log.date).calendar()),
            $('<td>').text(log.eventType),
            $('<td>').text(log.sourceTitle),
            //$('<td>').text(log.series.title), // Clean title
            $('<td>').text(log.episode.title),
            $('<td>').html(nzbdroneStatusLabel(log.series.status)),
            $('<td>').html(nzbdroneStatusLabel(log.quality.quality.name)));

            $('#history_table_body').append(row);
        });

        $('#history_table_body').parent().trigger("update");
    });
}

function calendar() {
    $.getJSON(WEBDIR + 'nzbdrone/Calendar', function (result) {
        $.each(result, function (i, cal) {
            var row = $('<tr>');
            var name = $('<a>').attr('href', '#').html(cal.series.title).click(function (e) {
                e.preventDefault();
                loadShow(cal.seriesId);
            });
            var img = makeIcon('icon-info-sign', cal.overview);
            row.append(
            $('<td>').append(name),
            $('<td>').html(cal.title + '&nbsp').append(img),
            $('<td>').text(moment(cal.airDateUtc).calendar()));
            $('#calendar_table_body').append(row);
        });

        $('#calendar_table_body').parent().trigger("update");
    });
}

function searchTvDb(query) {
    $.ajax({
        url: WEBDIR + 'nzbdrone/Lookup/' + encodeURIComponent(query),
        type: 'get',
        success: function (result) {
            if (result.length === 0) {
                $('#add_show_button').attr('disabled', false);
                $('#add_show_quality').attr('disabled', false);
                return;
            }
            $('#add_show_select').html('');
            $('#add_show_quality').html('');
            $.each(result, function (i, item) {
                var tvdbid = item.tvdbId;
                var showname = item.title;
                var year = item.year;
                var option = $('<option>');
                option.attr('data-info', $.makeArray(item));
                option.attr('value', tvdbid);
                option.html(showname + ' (' + year + ')');
                $('#add_show_select').append(option);
            });
            $.each(qlty, function (i, quality) {
                var option2 = $('<option>');
                option2.attr('value', quality.id);
                option2.html(quality.name);
                $('#add_show_quality').append(option2);
            });
            $('#add_show_name').hide();
            $('#cancel_show_button').show();
            $('#add_show_select').fadeIn();
            $('#add_show_button').attr('disabled', false).hide();
            $('#add_tvdbid_button').show();
            $('#add_show_quality').show();
        }
    });
}

function addShow(tvdbid, quality) {
    $.ajax({
        url: WEBDIR + 'nzbdrone/AddShow/' + tvdbid + '/' + quality,
        type: 'get',
        dataType: 'json',
        success: function (data) {
            $.each(data, function (i, res) {
                if (!res.errorMessage) {
                    notify('Add TV show', data.title, 'success');
                } else {
                    notify('Failed to add show', res.errorMessage, 'error');
                }
            });
            cancelAddShow();
        }
    });
}

function cancelAddShow() {
    $('#add_show_name').val('');
    $('#add_show_quality').val('');
    $('#add_show_select').hide();
    $('#cancel_show_button').hide();
    $('#add_show_name').fadeIn();
    $('#add_tvdbid_button').hide();
    $('#add_show_button').show();
    $('#add_show_quality').hide();
}


function loadShow(seriesID) {
    $.getJSON(WEBDIR + 'nzbdrone/Show/id=' + seriesID, function (tvshow) {
        var bannerurl;
        var table = $('<table>');
        table.addClass('table table-bordered table-striped table-condensed');

        row = $('<tr>');
        row.append('<th>Status</th><td>' + tvshow.status + '</td>');
        table.append(row);

        if (tvshow.nextAiring) {
            nextair = moment(tvshow.nextAiring).calendar();
        } else {
            nextair = 'N/A';
        }

        row = $('<tr>');
        row.append('<th>Airs</th><td>' + nextair + '</td>');
        table.append(row);

        row = $('<tr>');
        row.append('<th>Monitored</th><td>' + tvshow.monitored + '</td>');
        table.append(row);

        row = $('<tr>');
        row.append('<th>Location</th><td>' + tvshow.path + '</td>');
        table.append(row);

        $.each(qlty, function (i, q) {
            if (tvshow.qualityProfileId == q.id) {
                qname = q.name;
                row = $('<tr>');
                row.append('<th>Quality</th><td>' + q.name + '</td>');
                table.append(row);
            }
        });

        row = $('<tr>');
        row.append('<th>Network</th><td>' + tvshow.network + '</td>');
        table.append(row);

        if (tvshow.images.length > 0) {
            $.each(tvshow.images, function (i, cover) {
                if (cover.coverType === "banner") {
                    bannerurl = cover.url;
                }
            });
        }

        modalContent = $('<div>');
        modalContent.append(
        $('<img>').attr('src', WEBDIR + 'nzbdrone/GetBanner/?url=' + bannerurl).addClass('img-rounded'),
        $('<hr>'),
        table);

        // Disabled for now
        /*
        var modalButtons = {
            'Show': function () {
            data = {'id': tvshow.seriesID}
            window.location = WEBDIR + 'nzbdrone/View/' + tvshow.tvdbid + '/' + tvshow.seriesID ;
            }
        };
        */

        showModal(tvshow.title, modalContent, []);
    });

}

function Scanfolder() {
    var path = "Default folder";
    data = {
        "method": "DownloadedEpisodesScan"
    };
    p = prompt('Write path to processfolder or leave blank for default path');
    if (p !== null && p.length > 0) {
        data.par = "path";
        data.id = p;
        path = p;
    }

    $.getJSON(WEBDIR + 'nzbdrone/Command', data, function (r) {
        if (r.state) {
            state = 'success';
        } else {
            state = 'error';
        }

        // Stop the notify from firing on cancel
        if (p !== null) {
         notify('NzbDrone', 'Postprocess ' + path, state);   
        }
        
    });
}

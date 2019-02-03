$(document).ready(function () {
    $('.spinner').show();
    $(window).trigger('hashchange');
    getTorrents();
    get_speed_limit()
    setInterval(function () {
        getTorrents();
        get_speed_limit();
    }, 8000);

    $('#addurlform').submit(function (e) {
        e.preventDefault()
        var url = $('#torrenturl').val()
        if (url) addUrl(url)
    })

    $('#add_torrent_button').click(function() {
        var l = $('#add_torrent_url').val()
        if (l.length) {
            addUrl(l)
        }
    })

    $('#utorrent_speed_down').keyup(function(event){
        if(event.keyCode == 13){
            set_dl($('#utorrent_speed_down').val())
        }
    });

    $('#utorrent_speed_up').keyup(function(event){
        if(event.keyCode == 13){
            set_ul($('#utorrent_speed_up').val())
        }
    });

    // Torrent button ajax load
    $(document.body).off('click', '#torrents .torrent-action a');
    $(document.body).on('click', '#torrents .torrent-action a', function (event) {
        event.preventDefault();

        // set spinner inside button
        $(this).html('<i class="fa fa-spinner fa-pulse"></i>');
        // do ajax request
        $.ajax({
            url: $(this).attr('href'),
            success: function (response) {
                // Refresh torrent list after successfull request with a tiny delay
                if (response.result == 'success') {
                    window.setTimeout(getTorrents, 500);
                }
            }
        });
    });
});


function addUrl(url) {
    $.ajax(
        {
            'url': WEBDIR + 'utorrent/add_url/?url=' + encodeURI(url),
            'success': function (response) {

                if (response.result == 200) {
                    $('#add_torrent_url').val('')
                    notify('Success', '<strong>Success</strong> Torrent added !', 'success', 5);
                }
                else {
                    notify('Error', '<strong>Error</strong> Could not add torrent (see logs)', 'error', 5);
                }
            }
        }
    )
}

function getTorrents() {
    $.ajax({
        'url': WEBDIR + 'utorrent/torrents',
        'success': function (response) {
            $('#torrents').html('');
            $('#error_message').text("");
            if (response.result == 200) {
                var dl_speed_sum = up_speed_sum = 0;
                $.each(response.torrents, function (index, torrent) {
                    tr = $('<tr>');

                    dl_speed_sum += torrent.dl_speed;
                    up_speed_sum += torrent.up_speed;

                    var progressText = $('<span>');
                    progressText.text((torrent.percentage_done / 10) + ' %');

                    var progressBar = $('<div>');
                    progressBar.addClass('bar').addClass('progress-success');

                    var prog
                    if (torrent.percentage_done > 0) {
                        prog = (torrent.percentage_done / 10.)
                    } else {
                        prog = 0

                    }
                    progressBar.css('width',  prog + '%');

                    var progress = $('<div>');
                    progress.addClass('progress');
                    if (torrent.percentage_done >= 1000) {
                        progress.addClass('progress-success');
                        progressBar.removeClass('progress-success');
                    }

                    progress.append(progressBar);
                    progress.append(progressText);

                    // Round to 2 decimals
                    ratio = Math.round(torrent.ratio / 10) / 100;

                    // Button group
                    buttons = $('<div>').addClass('btn-group');

                    // Action button (pause or resume)
                    actionButton = generateTorrentActionButton(torrent);
                    buttons.append(actionButton);

                    // Remove button
                    removeButton = $('<a>').
                        addClass('btn btn-mini').
                        html('<i class="fa fa-trash-o fa-lg"></i>').
                        attr('href', WEBDIR + 'utorrent/remove/' + torrent.id).
                        attr('title', 'Remove torrent');
                    buttons.append(removeButton);

                    // Delete Button button
                    removeDataButton = $('<a>').
                        addClass('btn btn-mini').
                        html('<i class="fa fa-trash"></i>').
                        attr('href', WEBDIR + 'utorrent/remove_data/' + torrent.id).
                        attr('title', 'Remove torrent including data');
                    buttons.append(removeDataButton);

                    tr.append(
                        $('<td>').html(torrent.name
                            + '<br><small><i class="fa fa-long-arrow-down"></i> ' + getReadableFileSizeString(torrent.dl_speed)
                            + '/s <i class="fa fa-long-arrow-up"></i> ' + getReadableFileSizeString(torrent.up_speed) + '/s</small>'
                        ),
                        $('<td>').text(humanFileSize(torrent.size, 2, true)),
                        $('<td>').text(ratio),
                        $('<td>').text(getReadableTime(torrent.eta)),
                        $('<td>').text(getStatusInfo(torrent)),
                        $('<td>').addClass('span3').html(progress),
                        $('<td>').addClass('torrent-action').append(buttons)
                    );
                    $('#torrents').append(tr);
                });
                $('#queue_download').text(getReadableFileSizeString(dl_speed_sum) + '/s');
                $('#queue_upload').text(getReadableFileSizeString(up_speed_sum) + '/s');
                $('.spinner').hide();
                $('#torrents').trigger('update');
            }
            else if (response.result == 500) {
                $('#error_message').text("Impossible to connect to uTorrent. Maybe the remote port changed ?");
                $('.spinner').hide();
            }
        }
    });
}

function generateTorrentActionButton(torrent) {
    button = $('<a>').addClass('btn btn-mini');
    // Resume button if torrent is paused
    var status = getStatusInfo(torrent).toLowerCase();
    var icon = cmd = title = "";

    if (status == "paused" || status == "finished" || status == "stopped") {
        icon = "fa fa-play";
        title = "Resume torrent";
        cmd = "start";
    } else { // Pause button
        icon = "fa fa-pause";
        title = "Pause torrent";
        cmd = "stop";
    }

    // Set icon, command and title to button
    button.html('<i class="' + icon + '"></i>');
    button.attr('href', WEBDIR + 'utorrent/' + cmd + '/' + torrent.id);
    button.attr('title', title);
    return button;
}

function getStatusInfo(torrent) {
    var status = eval(torrent.status);
    if (status.indexOf(32) > 0) {
        return "Paused";
    } else {
        if (status.indexOf(1) > 0) {
            return (torrent.percentage_done == 1000) ? "Seeding" : "Downloading";
        } else {
            if (status.indexOf(16) > 0) {
                return "Error";
            } else {
                if (status.indexOf(64) > 0) {
                    return "Queued";
                } else {
                    if (torrent.percentage_done == 1000) {
                        return "Finished";
                    } else {
                        return "Stopped";
                    }
                }
            }
        }
    }
}


function set_dl(speed) {
    $.get(WEBDIR + 'utorrent/set_downspeed/' + speed, function () {
        if (speed === 0) {
            notify('uTorrent', 'Removed download speed limit', 'info');
        } else {
            notify('uTorrent', 'Changed download speed to ' + speed + ' kB/s', 'info');
        }

    });
}

function set_ul(speed) {
    $.get(WEBDIR + 'utorrent/set_upspeed/' + speed, function () {
        if (speed === 0) {
            notify('uTorrent', 'Removed upload speed limit', 'info');
        } else {
            notify('uTorrent', 'Changed upload speed to ' + speed + ' kB/s', 'info');
        }

    });
}

function get_speed_limit() {
    $.ajax({
        'url': WEBDIR + 'utorrent/get_speed_limit',
            'dataType': 'json',
            'success': function (response) {
                $('#utorrent_speed_down').attr("placeholder", response.dl + ' kB/s');
                $('#utorrent_speed_up').attr("placeholder", response.ul + ' kB/s');
            }
        }
    );
}

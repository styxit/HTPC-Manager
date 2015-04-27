$(document).ready(function () {
    $('.spinner').show();
    getTorrents();
    setAddTorrentModal();
    setInterval(function () {
        getTorrents();
    }, 4000);

    $('#addurlform').submit(function (e) {
        e.preventDefault()
        var url = $('#torrenturl').val()
        if (url) addUrl(url)
    })

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

function setAddTorrentModal(){
    $('#btnaddtorrent').click(function (e) {
        e.preventDefault();

        var modalButtons = {
            'Add': function () {
                $.ajax(
                    {
                        'url' : WEBDIR +'utorrent/add_url/?url=' + encodeURI($('#inputTorrentUrl').val()),
                        'success' : function(response){
                            if (response.result == 200)
                            {
                                notify('Info', 'Torrent added', 'success', 5);
                            }
                            else
                            {
                                notify('Error', 'Problem adding torrent', 'error', 5);
                            }
                            hideModal();
                        }
                    }
                )
            }
        }
        // Create the content

        var content = '<form id="addTorrentForm"><input id="inputTorrentUrl" type="url" placeholder="Enter the URL" /></form>'
        showModal("Add a torrent", content, modalButtons);
    })
}

function addUrl(url) {
    $.ajax(
        {
            'url': WEBDIR + 'utorrent/add_url/?url=' + encodeURI(url),
            'success': function (response) {

                if (response.result == 200) {
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

                    var progressBar = $('<div>');
                    progressBar.addClass('bar');
                    progressBar.css('width', (torrent.percentage_done / 10.) + '%');

                    var progress = $('<div>');
                    progress.addClass('progress');
                    if (torrent.percentage_done >= 1) {
                        progress.addClass('progress-success');
                    }
                    progress.append(progressBar);

                    // Round to 2 decimals
                    ratio = Math.round(torrent.ratio * 100) / 100;

                    // Button group
                    buttons = $('<div>').addClass('btn-group');

                    // Action button (pause or resume)
                    actionButton = generateTorrentActionButton(torrent);
                    buttons.append(actionButton);

                    // Remove button
                    removeButton = $('<a>').
                        addClass('btn btn-mini').
                        html('<i class="fa fa-remove"></i>').
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

/**
 * Converts bytes to readable filesize in kb, MB, GB etc.
 */
function getReadableFileSizeString(fileSizeInBytes) {
    var i = -1;
    var byteUnits = [' kB', ' MB', ' GB', ' TB', 'PB'];
    do {
        fileSizeInBytes = fileSizeInBytes / 1024;
        i++;
    } while (fileSizeInBytes > 1024);
    return Math.round(fileSizeInBytes, 0.1).toFixed(1) + byteUnits[i];
};

/**
 * Converts seconds to readable time.
 */
function getReadableTime(timeInSeconds) {
    if (timeInSeconds < 1) {
        return '0:00:00';
    }

    var days = parseInt(timeInSeconds / 86400) % 7;
    var hours = parseInt(timeInSeconds / 3600) % 24;
    var minutes = parseInt(timeInSeconds / 60) % 60;
    var seconds = parseInt(timeInSeconds % 60);

    // Add leading 0 and : to seconds
    seconds = ':' + (seconds < 10 ? "0" + seconds : seconds);

    if (days < 1) {
        days = '';
    } else {
        days = days + 'd ';
        // remove seconds if the eta is 1 day or more
        seconds = '';
    }
    return days + hours + ":" + (minutes < 10 ? "0" + minutes : minutes) + seconds;
};


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
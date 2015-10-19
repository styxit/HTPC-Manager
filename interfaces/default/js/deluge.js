// Last time we checked, was there a problem connecting to deluge?
var delugeConnectionError = true;
$(document).ready(function() {
    $('.spinner').show();
    $(window).trigger('hashchange');
    login();

    $('#add_torrent_url').keyup(function(event) {
        if (event.keyCode == 13) {
            addUrl();
        }
    });

    $('#add_torrent_button').click(function() {
        addUrl()
    });

    $('#deluge_speed_down').keyup(function(event) {
        if (event.keyCode == 13) {
            set_dl($('#deluge_speed_down').val())
        }
    });

    $('#deluge_speed_up').keyup(function(event) {
        if (event.keyCode == 13) {
            set_ul($('#deluge_speed_up').val())
        }
    });

    $('#deluge_pp_button').click(function() {
        var action = $('#delugetitle').attr('data-action')
        if (action) $.get(WEBDIR + 'deluge/do_all/' + action);
        getStatus();
    });

    // Torrent button ajax load
    $(document.body).off('click', '.ajax-btn');
    $(document.body).on('click', '.ajax-btn', function(event) {
        event.preventDefault();
        // set spinner inside button
        $(this).html('<i class="fa fa-spinner fa-pulse"></i>');
        // do ajax request
        $.ajax({
            url: $(this).attr('href'),
            success: function(response) {
                // Refresh torrent list after successfull request with a tiny delay
                if (response.result == 'success') {
                    window.setTimeout(refreshUi, 500);
                }
            }
        });
    });
});

function refreshUi() {
    if (!delugeConnectionError) {
        getTorrents();
        getStatus();
    }
}

function login() {
    $.ajax({
        url: WEBDIR + 'deluge/connected',
        async: false,
        success: function(response) {
            if (!response.result) {
                return loginServer()
            } else {
                delugeConnectionError = false;
                refreshUi();
                get_speed_limit();
                setInterval(function() {
                    refreshUi();
                }, 4000);
            }
        }
    });
}

function loginServer() {
    $.ajax({
        url: WEBDIR + 'deluge/get_hosts',
        async: false,
        success: function(response) {
            setConnectToServer(response.result);
        }
    });
}

function getTorrents() {
    $.ajax({
        url: WEBDIR + 'deluge/queue',
        success: function(response) {
            if (response && response.result) {
                $('#torrent-queue').html('');
                // Empty queue
                if (response.result.length === 0) {
                    $('#torrent-queue').html('<tr><td colspan="5">Queue is empty</td></tr>');
                }
                for (var key in response.result) {
                    torrent = response.result[key]
                    tr = $('<tr>');
                    var progress_percent = Math.round(torrent.progress * 100) / 100;
                    var progressText = $('<div>');
                    progressText.addClass('text-center');
                    progressText.text(progress_percent + '%');
                    var progressBar = $('<div>');
                    progressBar.addClass('bar');
                    progressBar.css('width', (progress_percent) + '%');
                    var progress = $('<div>');
                    progress.addClass('progress');
                    if (torrent.is_finished) {
                        progress.addClass('progress-success');
                    }
                    progress.append(progressBar);
                    progress.append(progressText);
                    // Round to 2 decimals
                    ratio = torrent.ratio == -1 ? '∞' : Math.round(torrent.ratio * 100) / 100;
                    eta = torrent.eta == '0:00:00' ? '∞' : torrent.eta;
                    // Button group
                    buttons = $('<div>').addClass('btn-group');
                    // Action button (pause or resume)
                    actionButton = generateTorrentActionButton(torrent);
                    buttons.append(actionButton);
                    // Remove button
                    removeButton = $('<a>').
                    addClass('btn btn-mini').
                    html('<i class="fa fa-trash-o fa-lg"></i>').
                    attr('title', 'Remove torrent').
                    attr('data-torrent-id', torrent.hash).
                    click(function() {
                        setRemoveTorrentModal($(this).attr('data-torrent-id'));
                    });
                    buttons.append(removeButton);
                    tr.append($('<td>').text(torrent.name), $('<td>').text(getReadableFileSizeString(
                        torrent.download_payload_rate) + '/s'), $('<td>').text(
                        getReadableFileSizeString(torrent.upload_payload_rate) + '/s'), $(
                        '<td>').text(getReadableFileSizeString(torrent.total_size)), $('<td>').text(
                        ratio), $('<td>').text(getReadableTime(torrent.eta)), $('<td>').text(
                        torrent.state), $('<td>').addClass('span3').html(progress), $('<td>').addClass(
                        'torrent-action').append(buttons));
                    $('#torrent-queue').append(tr);
                }
                $('.spinner').hide();
                $('#torrent-queue').parent().trigger('update');
            }
        }
    });
}

function generateTorrentActionButton(torrent) {
    button = $('<a>').addClass('btn btn-mini ajax-btn');
    // Resume button if torrent is paused
    if (torrent.state == 'Paused') {
        button.html('<i class="fa fa-play"></i>');
        button.attr('href', WEBDIR + 'deluge/start/' + torrent.hash);
        button.attr('title', 'Resume torrent');
    } else { // Pause button
        button.html('<i class="fa fa-pause"></i>');
        button.attr('href', WEBDIR + 'deluge/stop/' + torrent.hash);
        button.attr('title', 'Pause torrent');
    }
    return button;
}

function setConnectToServer(servers) {
    var content =
        '<form id="serversForm"><p>Please Select a server below and click connect:</p><table  style="background-color:#E8E8E8">';
    for (var server in servers) {
        content += '<th style="cursor: pointer;">';
        content += '<td style="width:10%;text-align:left;"><input type="radio" name="serverId" data-port=' +
            servers[server][2] + ' value="' + servers[server][0] + '" style="margin:0;"></td>';
        content += '<td style="width:20%;text-align:left;">' + servers[server][3] + '</td>';
        content += '<td style="width:70%;text-align:left;">' + servers[server][1] + ':' + servers[server][2] +
            '</td>';
        content += '</th>'
    }
    content += '</<table></form>';
    var modalButtons = {
        'Connect': function() {
            $.ajax({
                'url': WEBDIR + 'deluge/connect/' + $('input[name=serverId]:checked',
                    '#serversForm').val(),
                'success': function(response) {
                    if (response && !response.error) {
                        notify('Info', 'Successfully logged in', 'success', 5);
                        getStatus()
                        getTorrents()
                    } else {
                        notify('Error', 'Problem login in: ' + response.error, 'error', 5);
                    }
                    hideModal();
                }
            })
        },
        'Stop daemon': function() {
            $.ajax({
                'url': WEBDIR + 'deluge/daemon/stop/' + $('input[name=serverId]:checked',
                    '#serversForm').attr('data-port'),
                'success': function(response) {
                    if (response && !response.error) {
                        notify('Info', 'Successfully stopped daemon', 'success', 5);
                    } else {
                        notify('Error', 'Problem stopping daemon ' + response.error, 'error', 5);
                    }
                }
            })
        },
        'Start daemon': function() {
            $.ajax({
                'url': WEBDIR + 'deluge/daemon/start/' + $('input[name=serverId]:checked',
                    '#serversForm').attr('data-port'),
                'success': function(response) {
                    if (response && !response.error) {
                        notify('Info', 'Successfully started daemon', 'success', 5);
                    } else {
                        notify('Error', 'Problem starting daemon: ' + response.error, 'error',
                            5);
                    }
                }
            });
        },
    };
    showModal('Server Connection', content, modalButtons);
}

function setRemoveTorrentModal(torrentId) {
        var modalButtons = {
                'Remove With Data': function() {
                    $.ajax({
                        'url': WEBDIR + 'deluge/remove/' + torrentId + '/1',
                        'success': function(response) {
                            if (response) {
                                notify('Info', 'Torrent removed', 'success', 5);
                            } else {
                                notify('Error', 'Problem removing torrent', 'error', 5);
                            }
                            hideModal();
                        }
                    });
                },
                'Remove Torrent': function() {
                    $.ajax({
                        'url': WEBDIR + 'deluge/remove/' + torrentId + '/0',
                        'success': function(response) {
                            if (response) {
                                notify('Info', 'Torrent removed', 'success', 5);
                                refreshUi();
                            } else {
                                notify('Error', 'Problem removing torrent', 'error', 5);
                            }
                            hideModal();
                        }
                    })
                },
            }
            // Create the content
        showModal('Remove Torrent', 'Are you sure you wish to remove the torrent (s)?', modalButtons);
    }
    /**
     * Get General deluge stats
     */

function getStatus() {
        $.ajax({
            url: WEBDIR + 'deluge/status',
            success: function(response) {
                if (response != null) {
                    var uploadSpeed = getReadableFileSizeString(response.result.stats.upload_rate);
                    var downloadSpeed = getReadableFileSizeString(response.result.stats.download_rate);
                    $('#queue_upload').text(uploadSpeed + '/s');
                    $('#queue_download').text(downloadSpeed + '/s');

                    var down = (response.result.stats.max_download_speed != -1) ? response.result.stats.max_download: 0
                    var up = (response.result.stats.max_upload_speed != -1) ? response.result.stats.max_upload : 0
                    $('#deluge_speed_down').attr("placeholder", down + ' KiB/s');
                    $('#deluge_speed_up').attr("placeholder", up + ' KiB/s');

                    if (response.result.filters.state.All === response.result.filters.state.Paused) {
                        $('#delugetitle').attr('data-action', 'resume')
                        $('#deluge_pp_icon').addClass('fa-play').removeClass('fa-pause')
                    } else {
                        $('#deluge_pp_icon').addClass('fa-pause').removeClass('fa-play')
                        $('#delugetitle').attr('data-action', 'pause')
                    }
                }
                // Deluge api not responding, show message if the last know state was OK
                if (response == null && delugeConnectionError == false) {
                    delugeConnectionError = true;
                    notify('Error', 'Could not connect to Deluge', 'error');
                }
            }
        });
    }


 /*Converts seconds to readable time.*/
function getReadableTime(timeInSeconds) {
    if (timeInSeconds < 1) {
        return '00:00:00';
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
}

function set_dl(speed) {
    $.get(WEBDIR + 'deluge/set_dlspeed/' + speed, function() {
        if (speed === 0) {
            notify('Deluge', 'Removed download speed limit', 'info');
        } else {
            notify('Deluge', 'Changed download speed to ' + speed + ' kB/s', 'info');
        }
    });
}

function set_ul(speed) {
    $.get(WEBDIR + 'deluge/set_ulspeed/' + speed, function() {
        if (speed === 0) {
            notify('Deluge', 'Removed upload speed limit', 'info');
        } else {
            notify('Deluge', 'Changed upload speed to ' + speed + ' kB/s', 'info');
        }
    });
}

function get_speed_limit() {
    $.ajax({
        'url': WEBDIR + 'deluge/get_speed',
        'dataType': 'json',
        'success': function(response) {
            if (response != null) {
                var down = (response.result.max_download_speed != -1) ? response.result.max_download_speed :
                    0
                var up = (response.result.max_upload_speed != -1) ? response.result.max_upload_speed :
                    0
                $('#deluge_speed_down').attr("placeholder", down + ' KiB/s');
                $('#deluge_speed_up').attr("placeholder", up + ' KiB/s');
            }
        }
    });
}

function addUrl() {
    if ($("#add_torrent_url").val().length === 0 && $("#deluge_add_local_torrent").val().length === 0) {
        return;
    }
    if ($("#deluge_add_local_torrent").val().length > 1) {
        var i, file, reader, metainfo;
        var fileInput = $('input#deluge_add_local_torrent');
        jQuery.each(fileInput[0].files, function(i, file) {
            var reader = new FileReader();
            reader.onload = function(e) {
                var contents = e.target.result;
                var key = "base64,";
                var index = contents.indexOf(key);
                if (index > -1) {
                    metainfo = contents.substring(index + key.length);
                }
                var f = $('input#deluge_add_local_torrent').val().replace(/.*(\/|\\)/, '');
                var d = {
                    'torrent': metainfo,
                    'filename': f
                };
                $.ajax({
                    url: WEBDIR + 'deluge/addtorrent',
                    type: 'POST',
                    data: d,
                    success: function(result) {
                        var suc = (!result.error) ? 'Success' : 'Error';
                        notify(suc + ' sending ' + f.replace('.torrent', ''));
                    }
                });
            };
            reader.readAsDataURL(file);
        });
    } else if ($("#add_torrent_url").val().length > 1) {
        $.post(WEBDIR + "deluge/to_client", {
            'link': $("#add_torrent_url").val(),
            'filename': ''
        });
    }
    $('#add_torrent_file').val('');
    $("#add_torrent_url").val('');
}

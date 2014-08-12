
$("#qbt_rp_icon").click(function () {
    if ($("#qbt_rp_icon").hasClass("icon-play")) {
        $.get(WEBDIR+'qbittorrent/command/resumeall');
        notify('Resume', 'all torrents', 'info');
        $('#qbt_rp_icon').removeClass("icon-play").addClass("icon-pause");
        get_torrents();
    } else {
        $.get(WEBDIR + 'qbittorrent/command/pauseall');
        notify('Pause', 'all torrents', 'info');
        $('#qbt_rp_icon').removeClass("icon-pause").addClass("icon-play");
        get_torrets();
    }
});


function get_torrents() {
    $.ajax({
        'url': WEBDIR + 'qbittorrent/fetch',
            'dataType': 'json',
            'success': function (response) {
            $('#torrents-queue').html("");
            $('#error_message').text("");
            var pausestatus = ["error", "pausedUP", "pausedDL", "checkingUP"];
            var numberofloop = 0;
            var times_in = 0;

            $.each(response, function (index, torrent) {
                tr = $('<tr>');
                numberofloop += 1;

                if (jQuery.inArray(torrent.state, pausestatus) !== -1) {
                    times_in += 1;
                }


                var progressBar = $('<div>');
                progressBar.addClass('bar');
                progressBar.css('width', (torrent.progress * 100) + '%');
                progressBar.text(torrent.size);

                var progress = $('<div>');
                progress.addClass('progress');
                if (torrent.percentage_done >= 1) {
                    progress.addClass('progress-success');
                }
                progress.append(progressBar);

                // Button group
                buttons = $('<div>').addClass('btn-group');


                // Action button (pause or resume)
                actionButton = generateTorrentActionButton(torrent);
                buttons.append(actionButton);

                // Remove button
                removeButton = $('<a class="qbt_removetorrent" data-action="delete" data-hash="" data-name="">').
                addClass('btn btn-mini').
                html('<i class="icon-remove"></i>').
                attr('data-hash', torrent.hash).
                attr('data-name', torrent.name).
                attr('title', 'Remove torrent');
                buttons.append(removeButton);

                tr.append(

                $('<td>').addClass('qbt_name').html(torrent.name + '<br><small><i class="icon-long-arrow-down"></i> ' + torrent.dlspeed + '<i class="icon-long-arrow-up"></i> ' + torrent.upspeed + '</small>'),
                $('<td>').text(torrent.num_seeds),
                $('<td>').text(torrent.num_leechs),
                $('<td>').addClass('qbt_ratio').text(torrent.ratio),
                $('<td>').addClass('qbit_eta').text(torrent.eta),
                $('<td>').addClass('qbt_state').text(torrent.state),
                $('<td>').addClass('span3 qbit_progress').html(progress),
                $('<td>').addClass('torrent-action').append(buttons));
                $('#torrents-queue').append(tr);
            });
            if (times_in === numberofloop) {
                $("#qbt_rp_icon").removeClass("icon-pause").addClass("icon-play");
            } else {
                $("#qbt_rp_icon").removeClass("icon-play").addClass("icon-pause");
            }
            $('.spinner').hide();

        }
    });
}

function get_speed() {
    $.ajax({
        'url': WEBDIR + 'qbittorrent/get_speed',
            'dataType': 'json',
            'success': function (response) {
            $('#qbittorrent_speed_down').text(response.qbittorrent_speed_down);
            $('#qbittorrent_speed_up').text(response.qbittorrent_speed_up);
            $('#qbittorrent_total_stats').text("Totals: Download: " + response.qbittorrent_total_dl + " Upload: " + response.qbittorrent_total_ul);
            }
        });
}

function generateTorrentActionButton(torrent) {
    button = $('<a>').addClass('btn btn-mini qbt_rp');
    // Resume button if torrent is paused
    var status = torrent.state;
    var icon = cmd = title = "";

    if (status == "pausedUP" || status == "pausedDL" || status == "error" || status == "checkingUP") {
        icon = "icon-play";
        title = "Resume torrent";
        cmd = "resume";
    } else {
        icon = "icon-pause";
        title = "Pause torrent";
        cmd = "pause";
    }

    // Set icon, command and title to button
    button.html('<i class="' + icon + '"></i>');
    button.attr('title', title);
    button.attr('data-hash', torrent.hash);
    button.attr('data-name', torrent.name);
    button.attr('data-action', cmd);
    return button;
}

// delete torrent
$(document).on('click', '.qbt_removetorrent', function () {
    var action = $(this).attr('data-action');
    var name = $(this).attr('data-name');
    $.get(WEBDIR + 'qbittorrent/command/' + $(this).attr('data-action') + '/' + $(this).attr('data-hash') + '/' + $(this).attr('data-name') + '/', function(result) {
        notify(action, name, 'info');
    });
});

// resume/pause all torrents
$(document).on('click', '.qbt_rp', function () {
    if ($(this).children("i").hasClass("icon-play")) {
        ($(this).children("i").removeClass("icon-play").addClass("icon-pause"));
    } else {
        ($(this).children("i").removeClass("icon-pause").addClass("icon-play"));
    }
    var action = $(this).attr('data-action');
    var name = $(this).attr('data-name')
    $.get(WEBDIR + 'qbittorrent/command/' + $(this).attr('data-action') + '/' + $(this).attr('data-hash') + '/' + $(this).attr('data-name') + '/', function() {
        notify(action + ' torrent', name, 'info');
    });

});

//sets speed up and down
$(document).on('focusout', '.container .content #ss input', function () {
    if ($(this).val() === undefined || ($(this).val().length === 0)) return; 
    if ($(this).attr('data-action') === 'setGlobalDlLimit') {
        var title = 'Set download speed';
    } else {
        var title = 'Set upload speed';
    }
    speed = $(this).val();
    $.get(WEBDIR + 'qbittorrent/set_speedlimit/' + $(this).attr('data-action') + '/' + $(this).val() + '/', function() {
    notify(title, speed + ' KiB/s', 'info');
    });
});

//Fetches global upload and download limit and sets it as a placeholder
function get_global_limit() {
    $.ajax({
        'url': WEBDIR + 'qbittorrent/get_global_limit',
            'dataType': 'json',
            'success': function (response) {
            $('#qbittorrent_set_speeddown').attr("placeholder", response.dl_limit + ' KiB/s');
            $('#qbittorrent_set_speedup').attr("placeholder", response.ul_limit + ' KiB/s');
            }
        });
}

// Loads the moduleinfo
$(document).ready(function () {
    $('.spinner').show();
    get_torrents();
    get_speed();
    get_global_limit();
    setInterval(function () {
        get_torrents();
        get_speed();
        get_global_limit();
    }, 5000);
});
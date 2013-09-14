
$("#qbt_rp_icon").click(function () {
    if ($("#qbt_rp_icon").hasClass("icon-play")) {
        $.get(WEBDIR+'qbittorrent/command/resumeall');
        $('#qbt_rp_icon').removeClass("icon-play").addClass("icon-pause");
    } else {
        $.get(WEBDIR + 'qbittorrent/command/pauseall');
        $('#qbt_rp_icon').removeClass("icon-pause").addClass("icon-play");
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
            $.each(response, function (index, torrent) {
                $('#qbittorrent_speed_down').text(torrent.qbittorrent_speed_down);
                $('#qbittorrent_speed_up').text(torrent.qbittorrent_speed_up);
            });
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
    $.get(WEBDIR + 'qbittorrent/command/' + $(this).attr('data-action') + '/' + $(this).attr('data-hash') + '/' + $(this).attr('data-name') + '/', function() {

    });

});

// resume/pause all torrents
$(document).on('click', '.qbt_rp', function () {
    if ($(this).children("i").hasClass("icon-play")) {
        ($(this).children("i").removeClass("icon-play").addClass("icon-pause"));
    } else {
        ($(this).children("i").removeClass("icon-pause").addClass("icon-play"));
    }
    $.get(WEBDIR + 'qbittorrent/command/' + $(this).attr('data-action') + '/' + $(this).attr('data-hash') + '/' + $(this).attr('data-name') + '/', function() {
    
    });

});

//sets speed up and down
$(document).on('focusout', '.container .content #ss input', function () {
    $.get(WEBDIR + 'qbittorrent/set_speedlimit/' + $(this).data('action') + '/' + $(this).val() + '/', function() {
    
    });

});


// Loads the moduleinfo
$(document).ready(function () {
    $('.spinner').show();
    get_torrents();
    get_speed();
    setInterval(function () {
        get_torrents();
        get_speed();
    }, 5000);
});
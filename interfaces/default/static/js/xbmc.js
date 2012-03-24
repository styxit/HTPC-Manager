var loadingNowPlaying = false;
$(document).ready(function () {

    // Wat nu afgespeeld wordt
    loadNowPlaying();
    setInterval(function() {
        if (!loadingNowPlaying) {
            loadNowPlaying();
        }
    }, 2000);

    // films inladen
    loadMovies();
    loadXbmcShows();

    // Button setten
    $('#back-to-shows').click(function () {
        $('#show-details').slideUp(function () {
            $('#show-grid').slideDown();
        });
    });

    // Knoppen van de player
    $('[data-player-control]').click(function () {

        var clickItem = $(this);
        var playerDo = clickItem.attr('data-player-control');

        // Laadscherm
        clickItem.attr('disabled', true);

        $.ajax({
            url: 'json/?which=xbmc&action=controlplayer&do=' + playerDo,
            type: 'get',
            dataType: 'json',
            success: function(data) {
                if (data == null) return;
                loadNowPlaying();
            }
        });
    });

    // Notificatie versturen
    $('#send_notification_button').click(function () {
        sendNotification($('#send_notification_text').val());
    });

});

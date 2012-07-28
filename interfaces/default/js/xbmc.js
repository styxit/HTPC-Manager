$(document).ready(function () {
    enablePlayerControls();
    loadMovies();
    loadXbmcShows();
    loadNowPlaying();

    $(window).scroll(function() {
        if($(window).scrollTop() + $(window).height() >= $(document).height() - 10) {

            if ($('#movies').is(':visible')) {
                loadMovies({
                    sortorder: $('.active-sortorder').attr('data-sortorder'),
                    sortmethod: $('.active-sortmethod').attr('data-sortmethod')
                });
            }
            if ($('#shows').is(':visible')) {
                loadXbmcShows();
            }
        }
    });

    $('.search-query').keyup(function () {
        if ($('#shows').is(':visible')) {
            filterShows($(this).val());
        }
        if ($('#movies').is(':visible')) {
            filterMovies($(this).val());
        }
    });

    // Sorting
    $('[data-sortmethod]').click(function () {
        $('#movie-grid').html('');
        lastMovieLoaded = 0;
        allMoviesLoaded = false;
        var clickItem = $(this);
        $('.active-sortmethod i').remove();
        $('.active-sortmethod').removeClass('active-sortmethod');
        clickItem.addClass('active-sortmethod').prepend($('<i>').addClass('icon-ok'));
        loadMovies({
            sortorder: $('.active-sortorder').attr('data-sortorder'),
            sortmethod: $('.active-sortmethod').attr('data-sortmethod')
        });
    });
    $('[data-sortorder]').click(function () {
        $('#movie-grid').html('');
        lastMovieLoaded = 0;
        allMoviesLoaded = false;
        var clickItem = $(this);
        $('.active-sortorder i').remove();
        $('.active-sortorder').removeClass('active-sortorder');
        clickItem.addClass('active-sortorder').prepend($('<i>').addClass('icon-ok'));
        loadMovies({
            sortorder: $('.active-sortorder').attr('data-sortorder'),
            sortmethod: $('.active-sortmethod').attr('data-sortmethod')
        });
    });

    // Button setten
    $('#back-to-shows').click(function () {
        $('#show-details').fadeOut();
        $('#show-grid').show();
    });

    // Notificatie versturen
    $('#send_notification_button').click(function () {
        sendNotification($('#send_notification_text').val());
    });

    $('#btn-clean-lib').click(function () {
        xbmcClean();
    });

    $('#btn-scan-lib').click(function () {
        xbmcScan();
    });

});
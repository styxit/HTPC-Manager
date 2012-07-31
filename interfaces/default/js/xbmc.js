 $(document).ready(function() {
    enablePlayerControls();
    loadMovies();
    loadXbmcShows();
    loadNowPlaying();

    $('#xbmc-shutdown').click(function () {
        $.get('/xbmc/System?do=Suspend', function(data){
            notify('Shutdown','Shutting down...','warning');
        });
    });
    $('#xbmc-restart').click(function () {
        $.get('/xbmc/System?do=Reboot', function(data){
            notify('Reboot','Rebooting...','warning');
        });
    });
    $('#xbmc-wake').click(function () {
        $.get('/xbmc/System?do=Wake', function(data){
            notify('Wake','Sending WakeOnLan packet...','warning');
        });
    });

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

    $('#back-to-shows').click(function () {
        $('#show-details').hide();
        $('#show-grid').show();
    });
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

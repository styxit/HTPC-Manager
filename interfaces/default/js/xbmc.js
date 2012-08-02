$(document).ready(function() {
    enablePlayerControls();
    loadMovies();
    loadXbmcShows();
    loadNowPlaying();

    $.get('/xbmc/getservers', function (data) {
        if (data==null) return;
        var servers = $('<select>').change(function() {
             $.get('/xbmc/setserver?server='+$(this).val(), function (data) {
                notify('XBMC','Server change '+data,'info');
                $('#movie-grid').empty();
                allMoviesLoaded = false;
                loadMovies();
                $('#show-grid').empty();
                allShowsLoaded = false;
                loadXbmcShows();
             });
        });
        $.each(data.servers, function (i, item) {
            var server = $('<option>').text(item).val(item);
            servers.append(server);
        });
        servers.val(data.current);
        $('#servers').append(servers);
    }, 'json');

    $('#xbmc-notify').click(function () {
        msg = prompt("Message");
        if (msg) sendNotification(msg);
    });
    $('#xbmc-restart').click(function () {
        $.get('/xbmc/System?do=Reboot', function(data){
            notify('Reboot','Rebooting...','warning');
        });
    });
    $('#xbmc-shutdown').click(function () {
        $.get('/xbmc/System?do=Suspend', function(data){
            notify('Shutdown','Shutting down...','warning');
        });
    });
    $('#xbmc-wake').click(function () {
        $.get('/xbmc/System?do=Wake', function(data){
            notify('Wake','Sending WakeOnLan packet...','warning');
        });
    });
    $('#back-to-shows').click(function () {
        $('#show-details').hide();
        $('#show-grid').show();
    });
    $('#btn-clean-video-lib').click(function () {
        xbmcClean('video');
    });
    $('#btn-scan-video-lib').click(function () {
        xbmcScan('video');
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
});

$(document).ready(function() {
    enablePlayerControls();
    loadMovies();
    loadArtists();
    loadXbmcShows();
    loadNowPlaying();

    $.get(WEBDIR + 'xbmc/Servers', function(data) {
        if (data==null) return;
        var servers = $('<select>').change(function() {
             $.get(WEBDIR + 'xbmc/Servers?server='+$(this).val(), function(data) {
                notify('XBMC','Server change '+data,'info');
             });
        });
        $.each(data.servers, function(i, item) {
            var server = $('<option>').text(item.name).val(item.id);
            servers.append(server);
        });
        servers.val(data.current);
        $('#servers').append(servers);
    }, 'json');

    $(document).keydown(function(e) {
      if (!$('input').is(":focus")) {
        arrow = {8: 'Back', 27: 'Back', 13: 'Select', 37: 'Left', 38: 'Up', 39: 'Right', 40: 'Down',
                 88: 'Stop', 32: 'PlayPause'};
        command = arrow[e.which];
        if (command) {
            e.preventDefault();
            xbmcControl(command);
        }
      }
    });

    $(document).on("click", "#artist-grid a.load-albums", function(event){
      xbmcLoadAlbums($(this).attr('data-artistid'));
    });

    $(document).on("click", "#artist-grid a.play-artist", function(event){
      xbmcPlayArtist($(this).attr('data-artistid'));
    });

    $('#hidewatched').click(function() {
        $(this).toggleClass('hidewatched');
        $('#show-seasons').hide();
        $('#show-grid').empty();
        allShowsLoaded = false;
        loadXbmcShows();
        $('#show-grid').show();
    });
    $('#xbmc-notify').click(function() {
        msg = prompt("Message");
        if (msg) sendNotification(msg);
    });
    $('#xbmc-restart').click(function() {
        var answer = confirm("Reboot xbmc system?");
        if (answer) {
          $.get(WEBDIR + 'xbmc/System?action=Reboot', function(data){
            notify('Reboot','Rebooting...','warning');
          });
        }
    });
    $('#xbmc-shutdown').click(function() {
        var answer = confirm("Shutdown xbmc system?");
        if (answer) {
          $.get(WEBDIR + 'xbmc/System?action=Suspend', function(data){
            notify('Shutdown','Shutting down...','warning');
          });
        }
    });
    $('#xbmc-wake').click(function() {
        $.get(WEBDIR + 'xbmc/Wake', function(data){
            notify('Wake','Sending WakeOnLan packet...','warning');
        });
    });
    $('.clean-video-lib').click(function(e) {
        e.preventDefault();
        xbmcClean('video');
    });
    $('.scan-video-lib').click(function(e) {
        e.preventDefault();
        xbmcScan('video');
    });
    $('.clean-audio-lib').click(function(e) {
        e.preventDefault();
        xbmcClean('audio');
    });
    $('.scan-audio-lib').click(function(e) {
        e.preventDefault();
        xbmcScan('audio');
    });

    // Audio search artist
    $('#xbmc-filter-artists').keyup(function(){
        loadArtists({
            'filter': $(this).val()
        });
    });

    $(window).scroll(function() {
        if(!allMoviesLoaded && !moviesLoading && $(window).scrollTop() + $(window).height() >= $(document).height() - 10) {
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
    $('[data-sortmethod]').click(function() {
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
    $('[data-sortorder]').click(function() {
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

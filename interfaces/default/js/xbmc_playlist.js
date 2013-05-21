$(document).ready(function() {
    enablePlayerControls();
    loadNowPlaying();
    playlist('audio');

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
    
    $(document.body).on('click', 'ol#playlist li span a.playnow', function(event){
        event.preventDefault();
        var index = $("ol#playlist li").index($(this).parent().parent());
        playlistJump(index);
    });

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
});

function sendCommand(player, command) {
    command = encodeURIComponent(command); 
    $.ajax({
	url: '/json/?which=squeezebox&action=control&player='+player+'&command='+command,
	type: 'get',
	dataType: 'json',
	success: function(data) {
	    if (data == null) return;
            refreshPlayer(player);
	}
    });
}

var refresh;
var currentPlayer;
var nowPlayingThumb;
function refreshPlayer(player) {
    if (player == undefined) player = currentPlayer;
    $.ajax({
        url: '/json/?which=squeezebox&action=getplayer&player='+player,
        type: 'get',
        dataType: 'json',
        success: function (item) {
            if (item == null) return false;
            current = item.playlist[item.playlist_cur_index]

            if (player != currentPlayer) {
                clearInterval(refresh)
                currentPlayer = player;
                refresh = setInterval("refreshPlayer()", 1000)
            }
            if (nowPlayingThumb != current.title) {
                nowPlayingThumb = current.title;
                var thumbnail = $('<img>');
                thumbnail.attr('alt', current.title);
                thumbnail.attr('src', '/json/?which=squeezebox&action=getcover&player='+player);
                thumbnail.css('height', '140px');
                thumbnail.css('width', '140px');
                var thumbContainer = $('#nowplaying .thumbnail');
                thumbContainer.html(thumbnail);
            }
            $('#volume').text(item['mixer volume']);
            $('#player-item-title').text(current.artist + ': ' + current.title);
            $('#player-item-time').text(item.time + ' / ' + item.duration);
            $('#player-progressbar').children().width(item.percentage + '%');
            var playPauseButton = $('[data-player-control=PlayPause]');
            var playPauseIcon = playPauseButton.find('i');
            if (item.mode=='play') {
                playPauseIcon.removeClass().addClass('icon-pause');
            } else {
                playPauseIcon.removeClass().addClass('icon-play');
            }
            $('#playlist_table').html('');
            $.each(item.playlist, function (t, track) {
                var row = $('<tr>')
                title = $('<a>').attr('href','#').text(track.title).click(function() {
                    sendCommand(player, 'playlist jump '+t);
                    return false;
                });
                row.append($('<td>').append(title));
                row.append($('<td>').text(track.artist));
                row.append($('<td>').text(track.album));
                row.append($('<td>').text(track.duration).addClass('right'));
                $('#playlist_table').append(row);
            });
        }
    });
}

function togglePlayer(player) {
    refreshPlayer(player);
    if (!$('#nowplaying').is(':visible')) {
	$('#nowplaying').fadeIn();
    }
    var volUpButton = $('[data-player-control=VolUp]');
    volUpButton.click(function(){
	sendCommand(player, 'mixer volume +5')
    });
    var volDownButton = $('[data-player-control=VolDown]');
    volDownButton.click(function(){
	sendCommand(player, 'mixer volume -5')
    });
    var powerButton = $('[data-player-control=Power]');
    powerButton.click(function(){
	sendCommand(player, 'power 0')
    });
    var playPauseButton = $('[data-player-control=PlayPause]');
    playPauseButton.click(function(){
	 sendCommand(player, 'pause')
    });
    var leftButton = $('[data-player-control=MoveLeft]');
    leftButton.click(function(){
	sendCommand(player, 'playlist jump -1')
    });
    var rightButton = $('[data-player-control=MoveRight]');
    rightButton.click(function(){
	sendCommand(player, 'playlist jump +1')
    });
    var shuffleButton = $('[data-player-control=Shuffle]');
    shuffleButton.click(function(){
	sendCommand(player, 'playlist shuffle')
    });
    var repeatButton = $('[data-player-control=Repeat]');
    repeatButton.click(function(){
	sendCommand(player, 'playlist repeat')
    });
}

function getPlayers() {
    $.ajax({
        url: '/json/?which=squeezebox&action=getplayers',
        type: 'get',
        dataType: 'json',
        success: function (data) {
            if (data == null) return false;

            $('#players').html('');
            $.each(data, function (i, item) {
                var player = $('<option>').text(item.name).val(item.id);
                $('#players').append(player);
            });
        },
        complete: function () {
            player = $('#players').val()
            togglePlayer(player);
        }
    });
}

$(document).ready(function () {
    $('#players').change(function() {
        togglePlayer($(this).val());
    });
    getPlayers();
});

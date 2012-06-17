var refresh, currentPlayer, nowPlayingThumb;
var songTable;
var artist_id = {}
var album_id = {}

function parseSec(sec) {
    if (sec==undefined) sec=0;
    min = pad(Math.floor(sec / 60), 2);
    sec = pad(Math.floor(sec % 60), 2);
    return min + ':' + sec;
}

function sendCommand(player, command) {
    command = encodeURIComponent(command); 
    $.ajax({
	url: '/json/?which=squeezebox&action=control&player='+player+'&command='+command,
	type: 'get',
	dataType: 'json',
        complete: function() {
            refreshPlayer(player);
        }
    });
}

function refreshPlayer(player) {
    if (player == undefined) player = currentPlayer;
    $.ajax({
        url: '/json/?which=squeezebox&action=getplayer&player='+player,
        type: 'get',
        dataType: 'json',
        success: function (item) {
            if (item == null) return false;
            if(item.playlist=='') {
                nowPlaying = "Playlist empty"
            } else {
                current = item.playlist[item.playlist_cur_index]
                nowPlaying = current.artist + ': ' + current.title;
            }
            if (player != currentPlayer) {
                clearInterval(refresh)
                currentPlayer = player;
                refresh = setInterval("refreshPlayer()", 1000)
            }
            if (nowPlayingThumb != nowPlaying) {
                nowPlayingThumb = nowPlaying;
                var thumbnail = $('<img>');
                thumbnail.attr('src', '/json/?which=squeezebox&action=getcover&player='+player);
                thumbnail.css('height', '140px');
                thumbnail.css('width', '140px');
                var thumbContainer = $('#nowplaying .thumbnail');
                thumbContainer.html(thumbnail);
            }
            $('#volume').text(item['mixer volume']);
            $('#player-item-title').text(nowPlaying);
            $('#player-item-time').text(parseSec(item.time) + ' / ' + parseSec(item.duration));
            $('#player-progressbar').children().width((item.time / item.duration * 100) + '%');
            var playPauseIcon = $('[data-player-control=PlayPause]').find('i');
            var icon = (item.mode=='play')?'icon-pause':'icon-play';
            playPauseIcon.removeClass().addClass(icon);
            var powerIcon = $('[data-player-control=Power]');
            powerIcon.toggleClass('active',(item.power=='1'));
            $('#playlist_table').html('');
            $.each(item.playlist, function (t, track) {
                var row = $('<tr>')
                var title = $('<a>').attr('href','#').text(track.title).click(function() {
                    sendCommand(player, 'playlist jump '+t);
                    return false;
                });
                row.append($('<td>').append(title));
                var artist = $('<a>').attr('href','#').text(track.artist).click(function() {
                    $('[href=#artists]').trigger('click');
                    getArtist(artist_id[track.artist]);
                    return false;
                });
                row.append($('<td>').append(artist));
                var album = $('<a>').attr('href','#').text(track.album).click(function() {
                    $('[href=#albums]').trigger('click');
                    getAlbum(album_id[track.album]);
                    return false;
                });
                row.append($('<td>').append(album));
                row.append($('<td>').append(parseSec(track.duration)).addClass('right'));
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
    volUpButton.unbind("click").click(function(){
	sendCommand(player, 'mixer volume +5')
    });
    var volDownButton = $('[data-player-control=VolDown]');
    volDownButton.unbind("click").click(function(){
	sendCommand(player, 'mixer volume -5')
    });
    var powerButton = $('[data-player-control=Power]');
    powerButton.unbind("click").click(function(){
	sendCommand(player, 'power')
    });
    var playPauseButton = $('[data-player-control=PlayPause]');
    playPauseButton.unbind("click").click(function(){
	 sendCommand(player, 'pause')
    });
    var leftButton = $('[data-player-control=MoveLeft]');
    leftButton.unbind("click").click(function(){
	sendCommand(player, 'playlist jump -1')
    });
    var rightButton = $('[data-player-control=MoveRight]');
    rightButton.unbind("click").click(function(){
	sendCommand(player, 'playlist jump +1')
    });
    var shuffleButton = $('[data-player-control=Shuffle]');
    shuffleButton.unbind("click").click(function(){
	sendCommand(player, 'playlist shuffle')
    });
    var repeatButton = $('[data-player-control=Repeat]');
    repeatButton.unbind("click").click(function(){
	sendCommand(player, 'playlist repeat')
    });
    var savePlaylistButton = $('[data-player-control=SavePlaylist]');
    savePlaylistButton.unbind("click").click(function(){
        name = prompt("Save as:","");
	sendCommand(player, 'playlist save '+name)
    });
    var clearPlaylistButton = $('[data-player-control=ClearPlaylist]');
    clearPlaylistButton.unbind("click").click(function(){
	sendCommand(player, 'playlist clear')
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
                var player = $('<option>').text(item.name).val(item.playerid);
                $('#players').append(player);
            });
        },
        complete: function () {
            player = $('#players').val()
            togglePlayer(player);
        }
    });
}

function getArtists() {
    $.ajax({
        url: '/json/?which=squeezebox&action=getartists',
        type: 'get',
        dataType: 'json',
        success: function (data) {
            if (data == null) return false;

            $('#artists').html($('<ul>'));
            $.each(data.artists, function (i, item) {
                artist_id[item.artist] = item.id
                var artist = $('<li>').addClass('btn').css('width','195px').css('margin','6px').text(item.artist).click(function() {
                    getArtist(item.id);
                });
                $('#artists').append(artist);
            });
        }
    });
}

function getArtist(artist){
    $.ajax({
        url: '/json/?which=squeezebox&action=getartist&artist='+artist,
        type: 'get',
        dataType: 'json',
        success: function (data) {
            if (data == null) return false;
            var buttons = $('<div>').addClass('btn-group pull-right');
            buttons.append($('<a>').attr('href','#').text('Play Now').addClass('btn').click());
            buttons.append($('<a>').attr('href','#').text('Add to playlist').addClass('btn').click());

            $('#artists').html($('<a>').attr('href','#').text('Back').addClass('btn').click(function() {
                getArtists();
            }));
            $('#artists').append(buttons)
            var artistSongTable = songTable.clone()
            $(artistSongTable).find('tbody').attr('id','artistSongTable');
            $('#artists').append(artistSongTable);
            $.each(data, function (i, item) {
                var row = $('<tr>')
                var title = $('<a>').attr('href','#').text(item.title).click(function() {
                    alert(item.id)
                    sendCommand(currentPlayer, 'playlist play '+item.id);
                    return false;
                });
                row.append($('<td>').append(title));
                var artist = $('<a>').attr('href','#').text(item.artist).click(function() {
                    return false;
                });
                row.append($('<td>').append(artist));
                var album = $('<a>').attr('href','#').text(item.album).click(function() {
                    $('[href=#albums]').trigger('click');
                    getAlbum(album_id[item.album]);
                    return false;
                });
                row.append($('<td>').append(album));
                row.append($('<td>').text(parseSec(item.duration)).addClass('right'));
                $('#artistSongTable').append(row);
            });
        }
    });
}

function getAlbums() {
    $.ajax({
        url: '/json/?which=squeezebox&action=getalbums',
        type: 'get',
        dataType: 'json',
        success: function (data) {
            if (data == null) return false;

            $('#albums').html($('<ul>'));
            $.each(data.albums, function (i, item) {
                album_id[item.album] = item.id
                var album = $('<li>').addClass('btn').css('width','195px').css('margin','6px').text(item.album).click(function() {
                    getAlbum(item.id);
                });
                $('#albums').append(album);
            });
        }
    });
}

function getAlbum(album){
    $.ajax({
        url: '/json/?which=squeezebox&action=getalbum&album='+album,
        type: 'get',
        dataType: 'json',
        success: function (data) {
            if (data == null) return false;
            var buttons = $('<div>').addClass('btn-group pull-right');
            buttons.append($('<a>').attr('href','#').text('Play Now').addClass('btn').click());
            buttons.append($('<a>').attr('href','#').text('Add to playlist').addClass('btn').click());

            $('#albums').html($('<a>').attr('href','#').text('Back').addClass('btn').click(function() {
                getAlbums();
            }));
            $('#albums').append(buttons)
            var albumSongTable = songTable.clone()
            $(albumSongTable).find('tbody').attr('id','albumSongTable');
            $('#albums').append(albumSongTable);
            $.each(data, function (i, item) {
                var row = $('<tr>')
                var title = $('<a>').attr('href','#').text(item.title).click(function() {
                    return false;
                });
                row.append($('<td>').append(title));
                var artist = $('<a>').attr('href','#').text(item.artist).click(function() {
                    $('[href=#artists]').trigger('click');
                    getArtist(artist_id[item.artist]);
                    return false;
                });
                row.append($('<td>').append(artist));
                var album = $('<a>').attr('href','#').text(item.album).click(function() {
                    return false;
                });
                row.append($('<td>').append(album));
                row.append($('<td>').text(parseSec(item.duration)).addClass('right'));
                $('#albumSongTable').append(row);
            });
        }
    });
}

function getPlaylists() {
    $.ajax({
        url: '/json/?which=squeezebox&action=getplaylists',
        type: 'get',
        dataType: 'json',
        success: function (data) {
            if (data == null) return false;

            $('#playlists').html($('<ul>'));
            $.each(data.playlists, function (i, item) {
                var playlist = $('<li>').addClass('btn').css('width','195px').css('margin','6px').text(item.playlist).click(function() {
                    sendCommand('','');
                });
                $('#playlists').append(playlist);
            });
        }
    });
}

$(document).ready(function () {
    songTable = $('#playlist_table').parent().clone();
    $('#players').change(function() {
        togglePlayer($(this).val());
    });
    getPlayers();
    getArtists();
    getAlbums();
    getPlaylists();
});

var currentPlayer, nowPlayingThumb;
var artist_id = {}
var album_id = {}

$(document).ready(function () {
    $('#players').change(function() {
        togglePlayer($(this).val());
    });
    getPlayers();
    getArtists();
    getAlbums();
    // Hide stations since its unfinished
    //getStationGroups();
    $('[href=#stations]').remove();
    getPlaylists();
    setInterval("refreshPlayer()", 1000)
});

function sendCommand(player, command) {
    $.ajax({
        url: '/json/squeezebox/?action=control',
        type: 'get',
        dataType: 'json',
        data: {
            'player': player,
            'command': encodeURIComponent(command)
        },	
        complete: function() {
            refreshPlayer(player);
        }
    });
}

function getPlayers() {
    $.ajax({
        url: '/json/squeezebox/?action=getplayers',
        type: 'get',
        dataType: 'json',
        success: function (data) {
            if (data == null) return false;

            $('#players').html('');
            $.each(data.result.players_loop, function (i, item) {
                var player = $('<option>').text(item.name).val(item.playerid);
                $('#players').append(player);
            });
        },
        complete: function () {
            togglePlayer($('#players').val());
        }
    });
}

function togglePlayer(player) {
    currentPlayer = player;
    refreshPlayer(player);
    if (!$('#nowplaying').is(':visible')) {
        $('#nowplaying').fadeIn();
    }
    $('[data-player-control=VolUp]').unbind("click").click(function() {
        sendCommand(player, 'mixer volume +2.5')
    });
    $('[data-player-control=VolDown]').unbind("click").click(function() {
        sendCommand(player, 'mixer volume -2.5')
    });
    $('[data-player-control=Power]').unbind("click").click(function() {
        sendCommand(player, 'power')
    });
    $('[data-player-control=PlayPause]').unbind("click").click(function(){
        sendCommand(player, 'pause') 
    });
    $('[data-player-control=MoveLeft]').unbind("click").click(function() {
        sendCommand(player, 'playlist jump -1')
    });
    $('[data-player-control=MoveRight]').unbind("click").click(function() {
        sendCommand(player, 'playlist jump +1')
    });
    $('[data-player-control=Shuffle]').unbind("click").click(function() {
        sendCommand(player, 'playlist shuffle')
    });
    $('[data-player-control=Repeat]').unbind("click").click(function() {
        sendCommand(player, 'playlist repeat')
    });
    $('[data-player-control=SavePlaylist]').unbind("click").click(function() {
        name = prompt("Save as:","");
        sendCommand(player, 'playlist save '+name)
    });
    $('[data-player-control=ClearPlaylist]').unbind("click").click(function() {
        sendCommand(player, 'playlist clear')
    });
}

function refreshPlayer(player) {
    if (player == undefined) player = currentPlayer;
    $.ajax({
        url: '/json/squeezebox/?action=getplayer&player='+player,
        type: 'get',
        dataType: 'json',
        success: function (item) {
            if (item == null) return false;
            item = item.result;
            if(item.playlist_loop==undefined) {
                nowPlaying = "Playlist empty"
                item.playlist_loop = []
            } else {
                current = item.playlist_loop[item.playlist_cur_index]
                if (current.artist) {
                    nowPlaying = current.artist + ': ' + current.title;
                } else {
                    nowPlaying = current.title;
                }
            }
            if (nowPlayingThumb != nowPlaying) {
                nowPlayingThumb = nowPlaying;
                var thumbnail = $('<img>');
                thumbnail.attr('src', '/json/squeezebox/?action=getcover&player='+player);
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
            $.each(item.playlist_loop, function (t, track) {
                if (track.album == undefined) track.album = '';
                var row = $('<tr>')
                var remove = $('<a>').attr('href','#').click(function() {
                    sendCommand(player, 'playlist delete '+t);
                    return false;
                }).append($('<i>').addClass('icon-remove'));
                row.append($('<td>').append(remove));
                var title = $('<a>').attr('href','#').text(track.title).click(function() {
                    sendCommand(player, 'playlist jump '+t);
                    return false;
                });
                row.append($('<td>').append(title));
                var artist = $('<a>').attr('href','#').text(track.artist).click(function() {
                    getSongs('artist_id:'+artist_id[track.artist]);
                    return false;
                });
                row.append($('<td>').append(artist));
                var album = $('<a>').attr('href','#').text(track.album).click(function() {
                    getSongs('album_id:'+album_id[track.album]);
                    return false;
                });
                row.append($('<td>').append(album));
                row.append($('<td>').append(parseSec(track.duration)).addClass('right'));
                $('#playlist_table').append(row);
            });
        }
    });
}

function getArtists() {
    $.ajax({
        url: '/json/squeezebox/?action=getartists',
        type: 'get',
        dataType: 'json',
        success: function (data) {
            if (data == null) return false;

            var list = $('<ul>').addClass('nav nav-list')
            $.each(data.result.artists_loop, function (i, item) {
                artist_id[item.artist] = item.id;
                var link = $('<a>').attr('href','#').append(item.artist).click(function(e) {
                	e.preventDefault();
                	var albumlist = $('<div>');
                	$(this).append(albumlist).unbind().click(function(e) {
                		e.preventDefault();
                		albumlist.toggleClass('hide');
                	})
                	getAlbums(albumlist, item.id);
                });
                list.append($('<li>').append(link));
            });
            $('#artists').html(list);
        }
    });
}

function getAlbums(e, artist) {
    if (e==undefined) e = $('#albums');
    filter = (artist==undefined) ? '' : '&artist='+artist
    $.ajax({
        url: '/json/squeezebox/?action=getalbums'+filter,
        type: 'get',
        dataType: 'json',
        success: function (data) {
            if (data == null) return false;

            var list = $('<ul>')
            if (artist) {
            	var link = $('<a>').attr('href','#').text('All albums').click(function() {
                    getSongs('artist_id:'+artist);
                });
                list.append($('<li>').append(link));
            } else {
            	list.addClass('nav nav-list')
            }
            $.each(data.result.albums_loop, function (i, item) {
                album_id[item.album] = item.id;
                var link = $('<a>').attr('href','#').text(item.album).click(function() {
                    getSongs('album_id:'+item.id);
                });
                list.append($('<li>').append(link));
            });
            e.html(list);
        }
    });
}

function getSongs(filter){
    $.ajax({
        url: '/json/squeezebox/?action=getsongs',
        type: 'get',
        dataType: 'json',
        data: { 'filter': filter },
        success: function (data) {
            if (data == null) return false;

            $('[data-player-control=PlayNow]').unbind("click").click(function(){
                sendCommand(currentPlayer, 'playlistcontrol cmd:load ' + filter);
            });
            $('[data-player-control=AddPlaylist]').unbind("click").click(function(){
                sendCommand(currentPlayer, 'playlistcontrol cmd:add ' + filter);
            });
            $('#song_table').html('')
            $.each(data.result.titles_loop, function (i, item) {
                var row = $('<tr>')
                var title = $('<a>').attr('href','#').text(item.title).click(function() {
                    sendCommand(currentPlayer, 'playlistcontrol cmd:add track_id:'+item.id);
                    return false;
                });
                row.append($('<td>').append(title));
                var artist = $('<a>').attr('href','#').text(item.artist).click(function() {
                    getSongs('artist_id:'+artist_id[item.artist]);
                    return false;
                });
                row.append($('<td>').append(artist));
                var album = $('<a>').attr('href','#').text(item.album).click(function() {
                	getSongs('album_id:'+album_id[item.album]);
                    return false;
                });
                row.append($('<td>').append(album));
                row.append($('<td>').text(parseSec(item.duration)).addClass('right'));
                $('#song_table').append(row);
            });
        },
        complete: function() {
            $('[href=#songs]').trigger('click');
        }
    });
}

function getStationGroups() {
    $.ajax({
        url: '/json/squeezebox/?action=getstationgroups',
        type: 'get',
        dataType: 'json',
        success: function (data) {
            if (data == null) return false;

            var list = $('<ul>').addClass('nav nav-list')
            $.each(data.result.radioss_loop, function (i, item) {
                var link = $('<a>').attr('href','#').text(item.name).click(function(e) {
                	e.preventDefault();
                	var stationlist = $('<div>');
                	$(this).append(stationlist).unbind().click(function(e) {
                		e.preventDefault();
                		stationlist.toggleClass('hide');
                	})
                	getStations(stationlist, item.cmd);
                });
                list.append($('<li>').append(link));
            });
            $('#stations').html(list);
        }
    });
}

function getStations(e, group) {
    $.ajax({
        url: '/json/squeezebox/?action=getstations',
        type: 'get',
        dataType: 'json',
        data: {
        	'group': group,
        	'player': currentPlayer
        },
        success: function (data) {
            if (data == null) return false;

            var list = $('<ul>')
            $.each(data.result.loop_loop, function (i, item) {
                album_id[item.album] = item.id;
                var link = $('<a>').attr('href','#').text(item.name).click(function() {
                   sendCommand(currentPlayer, 'playlistcontrol cmd:add track_id:'+item.id);
                });
                list.append($('<li>').append(link));
            });
            e.html(list);
        }
    });
}

function getPlaylists() {
    $.ajax({
        url: '/json/squeezebox/?action=getplaylists',
        type: 'get',
        dataType: 'json',
        success: function (data) {
            if (data == null) return false;

            var list = $('<ul>').addClass('nav nav-list')
            $.each(data.result.playlists_loop, function (i, item) {
                var link = $('<a>').attr('href','#').text(item.playlist).click(function() {
                    sendCommand(currentPlayer, 'playlistcontrol cmd:load playlist_id:'+item.id)
                });
                list.append($('<li>').append(link));
            });
            $('#playlists').html(list);
        }
    });
}
var currentPlayer, nowPlayingThumb;
var artist_id = {}
var album_id = {}

$(document).ready(function () {
    $(window).trigger('hashchange')
    $('#players').change(function() {
        currentPlayer = $(this).val();
        $.cookie('squeezebox', currentPlayer);
        refreshPlayer();
        setInterval("refreshPlayer()", 1000)
    });
    $('[data-player-control=VolUp]').click(function() {
        sendCommand('mixer volume +2.5')
    });
    $('[data-player-control=VolDown]').click(function() {
        sendCommand('mixer volume -2.5')
    });
    $('[data-player-control=Power]').click(function() {
        sendCommand('power')
    });
    $('[data-player-control=PlayPause]').click(function(){
        sendCommand('pause')
    });
    $('[data-player-control=MoveLeft]').click(function() {
        sendCommand('playlist jump -1')
    });
    $('[data-player-control=MoveRight]').click(function() {
        sendCommand('playlist jump +1')
    });
    $('[data-player-control=Shuffle]').click(function() {
        sendCommand('playlist shuffle')
    });
    $('[data-player-control=Repeat]').click(function() {
        sendCommand('playlist repeat')
    });
    $('[data-player-control=SavePlaylist]').click(function() {
        name = prompt("Save as:","");
        sendCommand('playlist save '+name)
        getPlaylists();
    });
    $('[data-player-control=ClearPlaylist]').click(function() {
        sendCommand('playlist clear')
    });
    getPlayers();
    getArtists();
    getAlbums();
    getStationGroups();
    getPlaylists();
});

function sendCommand(command) {
    $.get(WEBDIR + 'squeezebox/PlayerControl',{
        'player': currentPlayer,
        'command': encodeURIComponent(command)
    }, function() {
        refreshPlayer();
    });
}

function getPlayers() {
    $.get(WEBDIR + 'squeezebox/GetPlayers', function (data) {
        if (data == null) return;
        $('#players').html('');
        $.each(data.result.players_loop, function (i, item) {
            var player = $('<option>').text(item.name).val(item.playerid);
            $('#players').append(player);
        });
        $('#players').val($.cookie('squeezebox')).trigger('change');
    }, 'json');
}

function refreshPlayer() {
    if (currentPlayer == null) return;
    $('#nowplaying').removeClass('hide');
    $.get(WEBDIR + 'squeezebox/GetPlayer?player='+currentPlayer, function (player) {
        if (player == null) return;
        player = player.result;
        if (player.playlist_loop==undefined) {
            nowPlaying = "Playlist empty"
            player.playlist_loop = []
        } else {
            current = player.playlist_loop[player.playlist_cur_index]
            if (current.artist) {
                nowPlaying = current.artist + ': ' + current.title;
            } else {
                nowPlaying = current.title;
            }
        }
        if (nowPlayingThumb != nowPlaying) {
            nowPlayingThumb = nowPlaying;
            var thumbnail = $('<img>');
            thumbnail.attr('src', WEBDIR + 'squeezebox/GetCover?player='+currentPlayer);
            $('#nowplaying .thumbnail').html(thumbnail);
        }
        $('#volume').text(player['mixer volume']);
        $('#player-item-title').text(nowPlaying);
        $('#player-item-time').text(parseSec(player.time) + ' / ' + parseSec(player.duration));
        $('#player-progressbar').children().width((player.time / player.duration * 100) + '%');
        var playPauseIcon = $('[data-player-control=PlayPause]').find('i');
        var icon = (player.mode=='play')?'icon-pause':'icon-play';
        playPauseIcon.removeClass().addClass(icon);
        var powerIcon = $('[data-player-control=Power]');
        powerIcon.toggleClass('active',(player.power=='1'));
        $('#playlist_table').html('');
        $.each(player.playlist_loop, function (t, track) {
            if (track.album == undefined) track.album = '';
            var row = $('<tr>')
            var current = $('<td>').append(title);
            var play = $('<a>').attr('href','#').click(function(e) {
                e.preventDefault();
                sendCommand('playlist jump '+t);
            }).append($('<i>').addClass('icon-play'));
            current.append(play);
            var remove = $('<a>').attr('href','#').click(function(e) {
                e.preventDefault();
                sendCommand('playlist delete '+t);
            }).append($('<i>').addClass('icon-remove'));
            current.append(remove);
            var title = $('<a>').attr('href','#').text(track.title).click(function(e) {
                e.preventDefault();
                sendCommand('playlist jump '+t);
            });
            current.append(title);
            row.append(current);
            var artist = $('<a>').attr('href','#').text(track.artist).click(function(e) {
                e.preventDefault();
                getSongs('artist_id:'+artist_id[track.artist]);
            });
            row.append($('<td>').append(artist));
            var album = $('<a>').attr('href','#').text(track.album).click(function(e) {
                e.preventDefault();
                getSongs('album_id:'+album_id[track.album]);
            });
            row.append($('<td>').append(album));
            row.append($('<td>').append(parseSec(track.duration)).addClass('right'));
            $('#playlist_table').append(row);
        });
    }, 'json');
}

function getArtists() {
    $.get(WEBDIR + 'squeezebox/GetArtists', function (data) {
        if (data == null) return false;
        var list = $('<ul>').addClass('artist-list filter');
        $.each(data.result.artists_loop, function (i, item) {
            listitem = $('<li>');
            artist_id[item.artist] = item.id;
            var control = $('<div>').addClass('control');
            var playIcon = $('<i>').addClass('icon-play');
            var play = $('<a>').attr('href','#').html(playIcon).click(function(e) {
                e.preventDefault();
                sendCommand('playlistcontrol cmd:load artist_id:'+item.id);
            });
            var addIcon = $('<i>').addClass('icon-plus');
            var add = $('<a>').attr('href','#').html(addIcon).click(function(e) {
                e.preventDefault();
                sendCommand('playlistcontrol cmd:add artist_id:'+item.id);
            });
            control.append(play);
            control.append(add);
            var artist = $('<a>').attr('href','#').text(item.artist).click(function(e) {
                e.preventDefault();
                getAlbums($(this), item.id);
            });
            listitem.append(control);
            listitem.append(artist);
            list.append(listitem);
        });
        $('#artists').html(list);
    }, 'json');
}

function getAlbums(link, artist) {
    container = (link==undefined) ? $('#albums') : link.parent();
    filter = (artist==undefined) ? '' : '?artist='+artist
    $.get(WEBDIR + 'squeezebox/GetAlbums'+filter, function (data) {
        if (data == null) return;
        var list = $('<ul>')
        if (!artist) {
            list.addClass('album-list filter');
        }
        $.each(data.result.albums_loop, function (i, item) {
            listitem = $('<li>');
            album_id[item.album] = item.id;
            var control = $('<div>').addClass('control');
            var playIcon = $('<i>').addClass('icon-play');
            var play = $('<a>').attr('href','#').html(playIcon).click(function(e) {
                e.preventDefault();
                sendCommand('playlistcontrol cmd:load album_id:'+item.id);
            });
            var addIcon = $('<i>').addClass('icon-plus');
            var add = $('<a>').attr('href','#').html(addIcon).click(function(e) {
                e.preventDefault();
                sendCommand('playlistcontrol cmd:add album_id:'+item.id);
            });
            control.append(play);
            control.append(add);
            var album = $('<a>').attr('href','#').text(item.album).click(function(e) {
                e.preventDefault();
                getSongs('album_id:'+item.id);
                if (!album) list.addClass('hide');
            });
            listitem.append(control);
            listitem.append(album);
            list.append(listitem);
        });
        container.append(list);
        if (artist) {
            link.unbind('click').click(function(e) {
                e.preventDefault();
                list.toggleClass('hide');
            });
        }
    }, 'json');
}

function getSongs(filter){
    $.get(WEBDIR + 'squeezebox/GetSongs?filter='+filter, function (data) {
        if (data == null) return;
        $('[data-player-control=PlayNow]').unbind('click').click(function(){
            sendCommand('playlistcontrol cmd:load ' + filter);
        });
        $('[data-player-control=AddPlaylist]').unbind('click').click(function(){
            sendCommand('playlistcontrol cmd:add ' + filter);
        });
        $('#song_table').empty();
        $.each(data.result.titles_loop, function (i, item) {
            var row = $('<tr>')
            var title = $('<a>').attr('href','#').text(item.title).click(function(e) {
                e.preventDefault();
                sendCommand('playlistcontrol cmd:add track_id:'+item.id);
            });
            row.append($('<td>').append(title));
            var artist = $('<a>').attr('href','#').text(item.artist).click(function(e) {
                e.preventDefault();
                getSongs('artist_id:'+artist_id[item.artist]);
            });
            row.append($('<td>').append(artist));
            var album = $('<a>').attr('href','#').text(item.album).click(function(e) {
                e.preventDefault();
                getSongs('album_id:'+album_id[item.album]);
            });
            row.append($('<td>').append(album));
            row.append($('<td>').text(parseSec(item.duration)).addClass('right'));
            $('#song_table').append(row);
        });
        $('[href=#songs]').trigger('click');
    }, 'json');
}

function getStationGroups() {
    $.get(WEBDIR + 'squeezebox/GetStationGroups', function (data) {
        if (data == null) return;
        var list = $('<ul>').addClass('nav nav-list')
        $.each(data.result.radioss_loop, function (i, item) {
            if (item.type!='xmlbrowser') return;
            var link = $('<a>').attr('href','#').text(item.name).click(function(e) {
                e.preventDefault();
                getStationGroup($(this), item.cmd, '');
            });
            list.append($('<li>').append(link));
        });
        $('#stations').html(list);
    }, 'json');
}

function getStationGroup(link, group, filter) {
    $.ajax({
        url: WEBDIR + 'squeezebox/GetStationGroup',
        type: 'get',
        dataType: 'json',
        data: {
            'group': group,
            'player': currentPlayer,
            'filter': filter
        },
        success: function (data) {
            if (data == null) return false;
            var list = $('<ul>')
            $.each(data.result.loop_loop, function (i, item) {
                if(item.hasitems==1 || item.isaudio==1) {
                    var link = $('<a>').attr('href','#').text(item.name).click(function(e) {
                        e.preventDefault();
                        if (item.hasitems==1) {
                            getStationGroup(link, group, 'item_id:'+item.id);
                        } else {
                            if (item.isaudio==1) {
                                sendCommand(group+' playlist load item_id:'+item.id);
                            } else {
                                notify('Error','Not implementet','error');
                            }
                        }
                    });
                    list.append($('<li>').append(link));
                } else {
                    notify('Error','Not implementet','error');
                }
            });
            link.parent().append(list);
            link.unbind().click(function(e) {
                e.preventDefault();
                list.toggleClass('hide');
            });
        }
    });
}

function getPlaylists() {
    $.get(WEBDIR + 'squeezebox/GetPlaylists', function (data) {
        if (data == null) return
        if (data.result.count == 0) {
            $('#playlists').html('You have no playlists');
            return;
        }
        var list = $('<ul>').addClass('nav nav-list')
        $.each(data.result.playlists_loop, function (i, item) {
            var link = $('<a>').attr('href','#').text(item.playlist).click(function(e) {
                e.preventDefault();
                sendCommand('playlistcontrol cmd:load playlist_id:'+item.id)
            });
            list.append($('<li>').append(link));
        });
        $('#playlists').html(list);
    }, 'json');
}

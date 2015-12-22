$(document).ready(function () {
    $(window).trigger('hashchange');
    loadArtists();
    loadWanteds();
    loadUpcoming();
    loadHistory();

    var searchAction = function () {
            var query = $('#add_artist_name').val();
            if (query) {
                $('#add_artist_button').attr('disabled', true);
                searchForArtist(query, $('#add_artist_album').find('option:selected').val());
            }
        };

    $('#add_artist_name').keyup(function(event){
        if(event.keyCode == 13){
            searchAction();
        }
    });

    $('#add_artist_button').click(searchAction);

    $('#add_artist_button').click(function () {
        $(this).attr('disabled', true);
        searchForArtist($('#add_artist_name').val(), $('#add_artist_album').find('option:selected').val());
    });

    $('#add_artistid_button').click(function () {
        addArtist($('#add_artist_select').val(), $('#add_artist_album').find('option:selected').val(), $('#add_artist_select').find('option:selected').text())

    });

    $('#cancel_artist_button').click(function () {
        cancelAddArtist();
    });

    $('.headphones_forceprocess').click(function(e) {
        e.preventDefault();
        Postprocess();
    })
    
});

function beginRefreshArtist(artistId) {
    var $div = $('div').html('Refreshing artist');
    var $buttons = {
        'Refresh': function () {
            beginRefreshArtist(artistId);
        }
    }

    showModal('Refresh artist?', $div, $buttons);
}

function refreshArtist(artistId) {

    $.ajax({
        url: WEBDIR + 'headphones/RefreshArtist',
        type: 'post',
        data: {'artistId': artistId},
        dataType: 'json',
        success: function (result) {

        },
        error: function (req) {
            console.log('error refreshing artist');
        }
    })
}

function searchForArtist(name, type) {
    $.ajax({
        url: WEBDIR + 'headphones/SearchForArtist',
        type: 'get',
        data: {'name': name,
                'searchtype': type},
        dataType: 'json',
        timeout: 40000,
        success: function (result) {
            if (!result || result.length === 0) {
                $('#add_artist_button').attr('disabled', false);
                return;
            }
            // remove any old search
            $('#add_artist_select').html('');

            if (type == 'artistId') {
                $.each(result, function (index, item) {
                    var option = $('<option>')
                    .attr('value', item.id)
                    .html(item.uniquename);

                    $('#add_artist_select').append(option);
                });

            } else {
                $.each(result, function (index, item) {
                    var tt;
                    if (item.date.length) {
                        // release date should be (yyyy) or empty string
                        tt = ' (' + item.date.substring(0,4) + ') '
                    } else {
                        tt = '  '
                    }
                    // item.uniquename == Artist name
                    if (item.uniquename === 'None') {
                        // to remove None..
                        item.uniquename = ''
                    }
                    var option = $('<option>')
                        .attr('value', item.albumid)
                        .html(item.title + tt + item.uniquename);

                    $('#add_artist_select').append(option);
                });
            }
            $('#add_artist_name').hide();
            $('#cancel_artist_button').show();
            $('#add_artist_select').fadeIn();
            $('#add_artist_button').attr('disabled', false).hide();
            $('#add_artistid_button').show();
        }
    })
}

function addArtist(id, searchtype, name) {
    // val can be artistId or albumId
    var stype = (searchtype === 'artistId') ? 'Artist' : 'Album';
    $.ajax({
        url: WEBDIR + 'headphones/AddArtist',
        data: {'id': id,
               'searchtype': searchtype},
        type: 'get',
        dataType: 'json',
        success: function (data) {
            $('#add_artist_name').val('');
            notify('Add ' + stype, 'Successfully added  '+ stype + ' ' + name, 'success');
            cancelAddArtist();
        }
    })
}

function cancelAddArtist() {
    $('#add_artist_select').hide();
    $('#cancel_artist_button').hide();
    $('#add_artist_name').fadeIn();
    $('#add_artistid_button').hide();
    $('#add_artist_button').show();
}

function loadArtists() {
    $.ajax({
        url: WEBDIR + 'headphones/GetArtistList',
        type: 'get',
        dataType: 'json',
        success: function (result) {
            if (result.length == 0) {
                var row = $('<tr>')
                row.append($('<td>').attr('colspan', '5').html('No artists found'));
                $('#artists_table_body').append(row);
            } else {
                $.each(result, function (index, artist) {
                    var image = $('<img>').addClass('img-polaroid img-rounded artistimgtab')
                    var name = $('<a>')
                        .attr('href',WEBDIR + 'headphones/viewArtist/' + artist.ArtistID)
                        .text(artist.ArtistName);
                    var albumname = $('<a>')
                        .attr('href',WEBDIR + 'headphones/viewAlbum/' + artist.AlbumID)
                        .text(artist.LatestAlbum);
                    var row = $('<tr>')

                    var isError = artist.ArtistName.indexOf('Fetch failed') != -1;
                    if (isError) {
                        artist.Status = 'Error';
                    }

                    var $statusRow = $('<td>')
                        .html(headphonesStatusLabel(artist.Status));

                    if (isError) {
                        $statusRow.click(function () {
                            beginRefreshArtist(artist.ArtistID);
                        });
                    }

                    if (artist.ThumbURL) {
                        image.attr('src', WEBDIR + 'headphones/GetThumb?thumb=' + artist.ThumbURL)

                    } else {
                        image.attr('src', '../img/no-cover-artist.png').css({'width' : '64px' , 'height' : '64px'}) //TODO

                    }

                    var div = $('<div>').addClass("artistthumbdiv").append(image)
                    row.append(
                        $('<td>').append(div),
                        $('<td>').html(name),
                        $('<td>').html(albumname),
                        $('<td>').append(artist.ReleaseDate),
                        $statusRow
                    );
                    $('#artists_table_body').append(row);
                });
                $('#artists_table_body').parent().trigger('update');
                $('#artists_table_body').parent().trigger("sorton",[[[0,0]]]);
            }
        }
    });
}

function loadWanteds() {
    // Clear it incase off reload
    $('#wanted_table_body').empty();
    $.ajax({
        url: WEBDIR + 'headphones/GetWantedList',
        type: 'get',
        dataType: 'json',
        success: function (result) {
            if (result.length == 0) {
                var row = $('<tr>')
                row.append($('<td>').attr('colspan', '5').html('No wanted albums found'));
                $('#wanted_table_body').append(row);
            } else {
                $.each(result, function (index, wanted) {
                    var row = $('<tr>');
                    var image = $('<img>').addClass('img-polaroid img-rounded')
                    if (wanted.ThumbURL) {
                        image.attr('src', WEBDIR + 'headphones/GetThumb?w=150&h=150&thumb=' + encodeURIComponent(wanted.ThumbURL))

                    } else {
                        image.attr('src', '../img/no-cover-artist.png').css({'width' : '75px' , 'height' : '75px'})
                    }

                    var remove = $('<a class="btn btn-mini btn-cancel" title="Set skipped"><i class="fa fa-step-forward"></i></a></td>').click(function () {
                                $.ajax({
                                    url: WEBDIR + 'headphones/UnqueueAlbum',
                                    data: {'albumId': wanted.AlbumID},
                                    type: 'get',
                                    complete: function (result) {
                                        loadWanteds()
                                        notify('Skipped', wanted.ArtistName + ' - ' + wanted.AlbumTitle, 'success');
                                    }
                                })
                            })
                    var force = $('<a class="btn btn-mini" title="Force search"><i class="fa fa-search"></i></a></td>').click(function () {
                                $.ajax({
                                    url: WEBDIR + 'headphones/QueueAlbum',
                                    data: {'albumId': wanted.AlbumID},
                                    type: 'get',
                                    complete: function (result) {
                                    	loadWanteds()
                                        notify('Force search for', wanted.ArtistName + ' - ' + wanted.AlbumTitle, 'success');
                                    }
                                })
                            })

                    var div = $('<div>').addClass('btn-group').append(force, remove);
                    row.append(
                        $('<td>').append(
                            $('<a>')
                                .addClass('headphones_wanted_artistname')
                                .attr('href', WEBDIR + 'headphones/viewArtist/' + wanted.ArtistID)
                                .text(wanted.ArtistName)),
                        $('<td>').append(
                            $('<a>')
                                .addClass('headphones_wanted_artistalbum')
                                .attr('href', WEBDIR + 'headphones/viewAlbum/' + wanted.AlbumID)
                                .text(wanted.AlbumTitle)),
                        $('<td>').text(wanted.ReleaseDate),
                        $('<td>').text(wanted.Type),
                        $('<td>').append(headphonesStatusLabel(wanted.Status)),
                        $('<td>').append(div)

                    );
                    $('#wanted_table_body').append(row);
                });
                $('#wanted_table_body').parent().trigger('update');
                // Sort on release date, latest releases on top
                $('#wanted_table_body').parent().trigger("sorton",[[[2,1]]]);
            }
        }
    })
}

function loadUpcoming() {
    // Clear it incase off reload
    $('#upcoming_table_body').empty();
    $.ajax({
        url: WEBDIR + 'headphones/GetUpcomingList',
        type: 'get',
        dataType: 'json',
        success: function (result) {
            if (result.length == 0) {
                var row = $('<tr>')
                row.append($('<td>').attr('colspan', '5').html('No upcoming albums found'));
                $('#upcoming_table_body').append(row);
            } else {
                $.each(result, function (index, upcoming) {
                    var row = $('<tr>');
                    var image = $('<img>').addClass('img-polaroid img-rounded')
                    if (upcoming.ThumbURL) {
                        image.attr('src', WEBDIR + 'headphones/GetThumb?w=150&h=150&thumb=' + encodeURIComponent(upcoming.ThumbURL))

                    } else {
                        image.attr('src', '../img/no-cover-artist.png').css({'width' : '75px' , 'height' : '75px'})
                    }

                    var remove = $('<a class="btn btn-mini btn-cancel" title="Set skipped"><i class="fa fa-step-forward"></i></a></td>').click(function () {
                                $.ajax({
                                    url: WEBDIR + 'headphones/UnqueueAlbum',
                                    data: {'albumId': upcoming.AlbumID},
                                    type: 'get',
                                    complete: function (result) {
                                        loadUpcoming()
                                        notify('Skipped', upcoming.ArtistName + ' - ' + upcoming.AlbumTitle, 'success');
                                    }
                                })
                            })
                    var search = $('<a class="btn btn-mini" title="Set wanted and search"><i class="fa fa-heart"></i></a></td>').click(function () {
                                $.ajax({
                                    url: WEBDIR + 'headphones/QueueAlbum',
                                    data: {'albumId': upcoming.AlbumID},
                                    type: 'get',
                                    complete: function (result) {
                                    	loadUpcoming()
                                        notify('Set wanted and search for', upcoming.ArtistName + ' - ' + upcoming.AlbumTitle, 'success');
                                    }
                                })
                            })
                    var force = $('<a class="btn btn-mini" title="Force search"><i class="fa fa-search"></i></a></td>').click(function () {
                                $.ajax({
                                    url: WEBDIR + 'headphones/QueueAlbum',
                                    data: {'albumId': upcoming.AlbumID},
                                    type: 'get',
                                    complete: function (result) {
                                    	loadUpcoming()
                                        notify('Force search for', upcoming.ArtistName + ' - ' + upcoming.AlbumTitle, 'success');
                                    }
                                })
                            })
                        
			if (upcoming.Status == 'Wanted') {
			var div = $('<div>').addClass('btn-group').append(force, remove);
			} else if (upcoming.Status == 'Skipped') {
			var div = $('<div>').addClass('btn-group').append(search, force);
			} else {
			var div = $('<div>').addClass('btn-group').append(search, force, remove);
			}
			
                    	row.append(
                        $('<td>').append(
                            $('<a>')
                                .addClass('headphones_upcoming_artistname')
                                .attr('href', WEBDIR + 'headphones/viewArtist/' + upcoming.ArtistID)
                                .text(upcoming.ArtistName)),
                        $('<td>').append(
                            $('<a>')
                                .addClass('headphones_upcoming_artistalbum')
                                .attr('href', WEBDIR + 'headphones/viewAlbum/' + upcoming.AlbumID)
                                .text(upcoming.AlbumTitle)),
                        $('<td>').text(upcoming.ReleaseDate),
		                $('<td>').text(upcoming.Type),
                        $('<td>').append(headphonesStatusLabel(upcoming.Status)),
                        $('<td>').append(div)

                    );
                    $('#upcoming_table_body').append(row);
                });
                $('#upcoming_table_body').parent().trigger('update');
                // Sort on release date, show albums with closest releasedate to now first
                $('#upcoming_table_body').parent().trigger("sorton",[[[2,0]]]);
            }
        }
    })
}

function loadHistory() {
    $.ajax({
        url: WEBDIR + 'headphones/GetHistoryList',
        type: 'get',
        dataType: 'json',
        success: function(result) {
            if (result.length == 0) {
                var row = $('<tr>')
                row.append($('<td>').attr('colspan', '5').html('History is empty'));
                $('#history_table_body').append(row);
            }
            $.each(result, function(i, item) {
                var row = $('<tr>');
                var retry = $('<a class="btn btn-mini" title="Try new download, if available"><i class="fa fa-repeat"></i></a></td>').click(function () {
                            $.ajax({
                                url: WEBDIR + 'headphones/QueueAlbum',
                                data: {
				'albumId': item.AlbumID,
				'new': 'True'
				},
                                type: 'get',
                                complete: function (result) {
                                    notify('Try new download, if available', 'success');
                                }
                            })
                        })
		if (item.Status == 'Snatched') {
		var div = $('<div>').addClass('btn-group').append(retry);
		} else if (item.Status == 'Unprocessed') {
		var div = $('<div>').addClass('btn-group').append(retry);
		} else {
		var div = ''
		}
                row.append(
                    $('<td>').html(item.DateAdded),
                    $('<td>').html(item.Title),
                    $('<td>').html(headphonesStatusLabel(item.Status)),
                    $('<td>').append(div)
                );
                $('#history_table_body').append(row);
            });
        }
    });
}

function headphonesStatusLabel(text) {
    var statusOK = ['Active', 'Downloaded', 'Processed'];
    var statusInfo = ['Wanted'];
    var statusError = ['Paused', 'Unprocessed'];
    var statusWarning = ['Snatched'];

    var label = $('<span>').addClass('label').text(text);

    if (statusOK.indexOf(text) != -1) {
        label.addClass('label-success');
    } else if (statusInfo.indexOf(text) != -1) {
        label.addClass('label-info');
    } else if (statusError.indexOf(text) != -1) {
        label.addClass('label-important');
    } else if (statusWarning.indexOf(text) != -1) {
        label.addClass('label-warning');
    }

    var icon = headphonesStatusIcon(text, true);
    if (icon !== '') {
        label.prepend(' ').prepend(icon);
    }
    return label;
}


var headphonesStatusMap = {
    'Active': 'fa fa-repeat',
    'Error': 'fa fa-bell',
    'Paused': 'fa fa-pause',
    'Snatched': 'fa fa-share-alt',
    'Skipped': 'fa fa-fast-forward',
    'Wanted': 'fa fa-heart',
    'Processed': 'fa fa-check',
    'Unprocessed': 'fa fa-exclamation'
}
function headphonesStatusIcon(iconText, white){
    var iconClass = headphonesStatusMap[iconText];

    if (typeof iconClass == 'undefined') {
        return;
    }

    var icon = $('<i>').addClass(iconClass);

    if (white == true) {
        icon.addClass('fa- fa-inverse');
    }
    return icon;
}

function Postprocess() {
    var data = {};
    p = prompt('Write path to processfolder or leave blank for default path');
    if (p || p.length >= 0) {
        data.dir = p;

        $.get(WEBDIR + 'headphones/ForceProcess', data, function(r) {
            state = (r.length) ? 'success' : 'error';
            // Stop the notify from firing on cancel
            if (p !== null) {
                path = (p.length === 0) ? 'Default folder' : p;
                notify('Headphones', 'Postprocess ' + path, state);
            }
        });

    }
}

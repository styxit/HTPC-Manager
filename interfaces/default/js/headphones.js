$(document).ready(function () {
    $(window).trigger('hashchange');
    loadArtists();
    loadWanteds();
    loadHistory();

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

    $('#album-tracks .btn-search').click(function () {
        var $parentRow = $(this).parents('tr')
        var albumId = $parentRow.attr('data-albumid');
        var name = $(this).parents('tr').find('.artist').text();
        searchForAlbum(albumId, name);
    })
});

function searchForAlbum(albumId, name) {
    var modalcontent = $('<div>');
    modalcontent.append($('<p>').html('Looking for album &quot;'+ name +'&quot;.'));
    modalcontent.append($('<div>').html('<div class="progress progress-striped active"><div class="bar" style="width: 100%;"></div></div>'));
    showModal('Searching for album "'+ name + '"', modalcontent, {});

    $.ajax({
        url: WEBDIR + 'headphones/QueueAlbum?albumId=' + albumId,
        type: 'get',
        dataType: 'json',
        timeout: 40000,
        success: function (data) {
            // If result is not 'succes' it must be a failure
            if (data.result != 'success') {
                notify('Error', data.message, 'error');
            } else {
                notify('OK', name+ ' ' + season + 'x'+episode+' found. ' + data.message, 'success');
            }
        },
        error: function (data) {
            notify('Error', 'Episode not found.', 'error', 1);
        },
        complete: function (data) {
            hideModal();
        }
    });
}

function beginRefreshArtist(artistId) {
    var $div = $('div').html('hello world');
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
                    console.log("artist")
                    console.log(item)
                    var option = $('<option>')
                    .attr('value', item.id)
                    .html(item.uniquename);

                    $('#add_artist_select').append(option);
                });

            } else {
                $.each(result, function (index, item) {
                    console.log("album")
                    console.log(item)
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
                    var t = item.title + ' (' + item.date + ')'
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
            console.log(data)
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
                row.append($('<td>').html('No artists found'));
                $('#artists_table_body').append(row);
            } else {
                $.each(result, function (index, artist) {
                    var image = $('<img>').addClass('img-polaroid img-rounded')
                    console.log("loadArtists")
                    console.log(artist)
                    var name = $('<a>')
                        .attr('href',WEBDIR + 'headphones/viewArtist/' + artist.ArtistID)
                        .text(artist.ArtistName);
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
                        image.attr('src', WEBDIR + 'headphones/GetThumb/?w=75&h=75&thumb=' + encodeURIComponent(artist.ThumbURL))

                    } else {
                        image.attr('src', '../img/no-cover-artist.png').css({'width' : '75px' , 'height' : '75px'}) //TODO

                    }

                    div = $('<div>').append(image)
                    row.append(
                        $('<td>').append(div),
                        $('<td>').html(name),
                        $('<td>').append(artist.LatestAlbum),
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
    $.ajax({
        url: WEBDIR + 'headphones/GetWantedList',
        type: 'get',
        dataType: 'json',
        success: function (result) {
            if (result.length == 0) {
                var row = $('<tr>')
                row.append($('<td>').html('No wanted albums found'));
                $('#wanted_table_body').append(row);
            } else {
                $.each(result, function (index, wanted) {
                    var row = $('<tr>');
                    var image = $('<img>').addClass('img-polaroid img-rounded')
                    if (wanted.ThumbURL) {
                        image.attr('src', WEBDIR + 'headphones/GetThumb/?w=75&h=75&thumb=' + encodeURIComponent(wanted.ThumbURL))

                    } else {
                        image.attr('src', '../img/no-cover-artist.png').css({'width' : '75px' , 'height' : '75px'}) //TODO

                    }

                    div = $('<div>').append(image)
                    row.append(
                        $('<td>').append(div),
                        $('<td>').append($('<a>')
                            .attr('href', WEBDIR + 'headphones/viewArtist/' + wanted.ArtistID)
                            .text(wanted.ArtistName)),
                        $('<td>').append($('<a>')
                            .attr('href', WEBDIR + 'headphones/viewAlbum/' + wanted.AlbumID)
                            .text(wanted.AlbumTitle)),
                        $('<td>').text(wanted.ReleaseDate),
                        $('<td>').append(headphonesStatusLabel(wanted.Status)),
                        $('<td><a class="btn btn-mini btn-cancel"><i class="icon-remove-circle"></i></a></td>')
                            .click(function () {
                                $.ajax({
                                    url: WEBDIR + 'headphones/UnqueueAlbum',
                                    data: {'albumId': wanted.AlbumID},
                                    type: 'get',
                                    dataType: 'json',
                                    complete: function (result) {
                                        $(this).parents('tr').remove();
                                    }
                                })
                            })
                    );
                    $('#wanted_table_body').append(row);
                });
                $('#wanteds_table_body').parent().trigger('update');
                $('#wanteds_table_body').parent().trigger("sorton",[[[0,0]]]);
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
            console.log(result)
            if (result.length === 0) {
                var row = $('<tr>')
                row.append($('<td>').html('History is empty'));
                $('#history_table_body').append(row);
            }
            $.each(result, function(i, item) {
                console.log(item)
                var row = $('<tr>');
                row.append(
                    $('<td>').html(item.DateAdded),
                    $('<td>').html(item.Title),
                    $('<td>').html(headphonesStatusLabel(item.Status))
                );
                $('#history_table_body').append(row);
            });
        }
    });
}

function loadHistory() {
    $.ajax({
        url: WEBDIR + 'headphones/GetHistoryList',
        type: 'get',
        dataType: 'json',
        success: function(result) {
            console.log(result)
            if (result.length === 0) {
                var row = $('<tr>')
                row.append($('<td>').html('History is empty'));
                $('#history_table_body').append(row);
            }
            $.each(result, function(i, item) {
                console.log(item)
                var row = $('<tr>');
                row.append(
                    $('<td>').html(item.DateAdded),
                    $('<td>').html(item.Title),
                    $('<td>').html(headphonesStatusLabel(item.Status))
                );
                $('#history_table_body').append(row);
            });
        }
    });
}

function headphonesStatusLabel(text) {
    var statusOK = ['Active', 'Downloaded', 'Processed'];
    var statusInfo = ["Wanted"];
    var statusError = ['Paused', 'Unprocessed'];
    var statusWarning = ['Skipped', 'Custom', 'Snatched'];

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
    'Active': 'icon-repeat',
    'Error': 'icon-bell',
    'Paused': 'icon-pause',
    'Snatched': 'icon-share-alt',
    'Skipped': 'icon-fast-forward'
}
function headphonesStatusIcon(iconText, white){
    var iconClass = headphonesStatusMap[iconText];

    if (typeof iconClass == 'undefined') {
        return;
    }

    var icon = $('<i>').addClass(iconClass);

    if (white == true) {
        icon.addClass('icon-white');
    }
    return icon;
}
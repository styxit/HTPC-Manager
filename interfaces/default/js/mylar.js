$(document).ready(function () {
    $(window).trigger('hashchange');
    loadcomics();
    loadWanteds();
    loadHistory();

    var searchforcomicaction = function () {
        var query = $('#add_comic_name').val()
        if (query) {
            $('#add_comic_button').attr('disabled', true);
            searchForcomic(query, $('#add_comic_album').find('option:selected').val());
        }
    }
    $('#add_comic_name').keyup(function(event){
        if ($('#add_comic_name').val().length >= 1) {
            $('#cancel_comic_button').show()
        } else {
            $('#cancel_comic_button').hide()
        }

        if(event.keyCode == 13) {
            searchforcomicaction();
        }
    });

    $('#add_comic_button').click(searchforcomicaction);

    $('#add_comicid_button').click(function () {
        addcomic($('#add_comic_select').val(), $('#add_comic_select').find('option:selected').text())

    });

    $('#cancel_comic_button').click(function () {
        cancelAddcomic();
    });

    $('.mylar_forceprocess').click(function(e) {
        e.preventDefault();
        Postprocess();
    });

});


function beginRefreshcomic(comicId) {
    var $div = $('div').html('Refreshing comic');
    var $buttons = {
        'Refresh': function () {
            beginRefreshcomic(comicId);
        }
    }

    showModal('Refresh comic?', $div, $buttons);
}

function refreshcomic(comicId) {
    $.ajax({
        url: WEBDIR + 'mylar/Refreshcomic',
        type: 'post',
        data: {'comicId': comicId},
        dataType: 'json',
        success: function (result) {

        },
        error: function (req) {
            console.log('error refreshing comic');
        }
    })
}

function searchForcomic(name) {
    $.ajax({
        url: WEBDIR + 'mylar/SearchForComic',
        type: 'get',
        data: {'name': name},
        dataType: 'json',
        timeout: 60000,
        success: function (result) {
            if (!result || result.length === 0) {
                $('#add_comic_button').attr('disabled', false);
                return;
            }
            // remove any old search
            $('#add_comic_select').html('');

            $.each(result, function (index, item) {
                var option = $('<option>')
                .attr('value', item.comicid)
                .html(item.name);

                $('#add_comic_select').append(option);
            });

            $('#add_comic_name').hide();
            $('#cancel_comic_button').show();
            $('#add_comic_select').fadeIn();
            $('#add_comic_button').attr('disabled', false).hide();
            $('#add_comicid_button').show();
        }
    })
}

function addcomic(id, name) {
    $.ajax({
        url: WEBDIR + 'mylar/AddComic',
        data: {'id': id,
               'name': name},
        type: 'get',
        dataType: 'json',
        success: function (data) {
            $('#add_comic_name').val('');
            notify('Add Comic', 'Successfully added ' + name, 'success');
            cancelAddcomic();
        }
    })
}

function cancelAddcomic() {
    $('#add_comic_name').val("")
    $('#add_comic_select').hide();
    $('#cancel_comic_button').hide();
    $('#add_comic_name').fadeIn();
    $('#add_comicid_button').hide();
    $('#add_comic_button').show();
}

function loadcomics() {
    $.ajax({
        url: WEBDIR + 'mylar/getserieslist',
        type: 'get',
        dataType: 'json',
        success: function (result) {
            if (result.length == 0) {
                var row = $('<tr>')
                row.append($('<td>').html('No comics found').attr('colspan', '6'));
                $('#comics_table_body').append(row);
            } else {
                $.each(result, function (index, comic) {
                    var image = $('<img>').addClass('img-polaroid img-rounded comicimgtab')
                    var name = $('<a>')
                        .attr('href',WEBDIR + 'mylar/viewcomic/' + comic.ComicID)
                        .text(comic.ComicName);
                    var row = $('<tr>')

                    var isError = comic.ComicName.indexOf('Fetch failed') != -1;
                    if (isError) {
                        comic.Status = 'Error';
                    }

                    var $statusRow = $('<td>')
                        .html(mylarStatusLabel(comic.Status));

                    if (isError) {
                        $statusRow.click(function () {
                            beginRefreshcomic(comic.ComicID);
                        });
                    }

                    if (comic.ComicImageURL) {
                        // ComicImage
                        image.attr('src', WEBDIR + 'mylar/GetThumb?thumb=' + comic.ComicImageURL).css({'width' : '64px' , 'height' : '64px'})

                    } else {
                        image.attr('src', '../img/no-cover-comic.png').css({'width' : '64px' , 'height' : '64px'}) //TODO

                    }

                    var have_issues;
                    if (String(comic.Have) && String(comic.Total)) {
                        have_issues = comic.Have + '/' + comic.Total

                    } else {
                        have_issues = 'N/A'
                    }

                    var div = $('<div>').addClass("comicthumbdiv").append(image)
                    row.append(
                        $('<td>').append(div),
                        $('<td>').html(name),
                        $('<td>').text(comic.ComicYear),
                        $('<td>').append(comic.LatestIssue),
                        $('<td>').append(comic.LatestDate),
                        $('<td>').text(have_issues),
                        $statusRow
                    );
                    $('#comics_table_body').append(row);
                });
                $('#comics_table_body').parent().trigger('update');
                $('#comics_table_body').parent().trigger("sorton",[[[0,0]]]);
            }
        }
    });
}

function loadWanteds() {
    $('#wanted_table_body').empty();
    $.ajax({
        url: WEBDIR + 'mylar/GetWantedList',
        type: 'get',
        dataType: 'json',
        success: function (result) {

            if (result.length == 0) {
                var row = $('<tr>')
                row.append($('<td>').attr('colspan', '5').html('No wanted issues found'));
                $('#wanted_table_body').append(row);
            } else {
                $.each(result, function (index, wanted) {
                    console.log(wanted)
                    var row = $('<tr>');
                    var image = $('<img>').addClass('img-polaroid img-rounded')
                    if (wanted.ThumbURL) {
                        image.attr('src', WEBDIR + 'mylar/GetThumb?w=150&h=150&thumb=' + encodeURIComponent(wanted.ThumbURL))

                    } else {
                        image.attr('src', '../img/no-cover-comic.png').css({'width' : '75px' , 'height' : '75px'})

                    }

                    var remove = $('<a class="btn btn-mini btn-cancel" title="Set Skipped"><i class="fa fa-step-forward"></i></a></td>').click(function () {
                                $.ajax({
                                    url: WEBDIR + 'mylar/UnqueueIssue',
                                    data: {'issueid': wanted.IssueID},
                                    type: 'get',
                                    complete: function (result) {
                                        loadWanteds()
                                        notify('Set Skipped', wanted.ComicName + ' - ' + wanted.IssueName);
                                    }
                                })
                            })
                    var search = $('<a class="btn btn-mini" title="Set wanted"><i class="fa fa-heart"></i></a></td>').click(function () {
                                $.ajax({
                                    url: WEBDIR + 'mylar/QueueIssue',
                                    data: {'issueid': wanted.IssueID},
                                    type: 'get',
                                    complete: function (result) {
                                        notify('Set wanted', wanted.ComicName + ' - ' + wanted.IssueName);
                                    }
                                })
                            })
                    var force = $('<a class="btn btn-mini" title="Force Check"><i class="fa fa-search"></i></a></td>').click(function () {
                                $.ajax({
                                    url: WEBDIR + 'mylar/QueueIssue',
                                    data: {'issueid': wanted.IssueID, 'new': true},
                                    type: 'get',
                                    complete: function (result) {
                                        notify('Force Check', wanted.ComicName + ' - ' + wanted.IssueName);
                                    }
                                })
                            })


                    var div = $('<div>').addClass('btn-group').append(search, force, remove);
                    row.append(
                        $('<td>').append(
                            $('<a>')
                                .addClass('mylar_wanted_comicname')
                                .attr('href', WEBDIR + 'mylar/viewcomic/' + wanted.ComicID)
                                .text(wanted.ComicName)),
                        $('<td>').text(wanted.IssueName),
                        $('<td>').text(wanted.Issue_Number),
                        $('<td>').text(wanted.ReleaseDate),
                        $('<td>').append(mylarStatusLabel(wanted.Status)),
                        $('<td>').append(div)


                    );
                    $('#wanted_table_body').append(row);
                });
                $('#wanteds_table_body').parent().trigger('update');
                $('#wanteds_table_body').parent().trigger("sorton",[[[0,0]]]);
            }
        }
    })
}

// unqueueissue?IssueID=468047&ComicID=73098

function loadHistory() {
    $.ajax({
        url: WEBDIR + 'mylar/GetHistoryList',
        type: 'get',
        dataType: 'json',
        success: function(result) {
            if (result.length === 0) {
                var row = $('<tr>')
                row.append($('<td>').attr('colspan', '3').html('History is empty'));
                $('#history_table_body').append(row);
            }
            $.each(result, function(i, item) {
                var row = $('<tr>');
                row.append(
                    $('<td>').html(item.DateAdded),
                    $('<td>').html(item.ComicName),
                    $('<td>').html(mylarStatusLabel(item.Status))
                );
                $('#history_table_body').append(row);
            });
        }
    });
}

function mylarStatusLabel(text) {
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

    var icon = mylarStatusIcon(text, true);
    if (icon !== '') {
        label.prepend(' ').prepend(icon);
    }
    return label;
}

var mylarStatusMap = {
    'Downloaded': 'fa fa-download',
    'Active': 'fa fa-rotate-right',
    'Error': 'fa fa-bell-o',
    'Paused': 'fa fa-pause',
    'Snatched': 'fa fa-share-alt',
    'Skipped': 'fa fa-fast-forward',
    'Wanted': 'fa fa-heart',
    'Processed': 'fa fa-check',
    'Unprocessed': 'fa fa-exclamation-circle'
}

function mylarStatusIcon(iconText, white){
    var iconClass = mylarStatusMap[iconText];

    if (typeof iconClass == 'undefined') {
        return;
    }

    var icon = $('<i>').addClass(iconClass);

    if (white == true) {
        icon.addClass('icon-white');
    }
    return icon;
}

function Postprocess() {
    var data = {};
    p = prompt('Write path to processfolder or leave blank for default path');
    if (p || p.length >= 0) {
        data.dir_ = p;

        $.get(WEBDIR + 'mylar/ForceProcess', data, function(r) {
            state = (r.length) ? 'success' : 'error';
            // Stop the notify from firing on cancel
            if (p !== null) {
                path = (p.length === 0) ? 'Default folder' : p;
                notify('mylar', 'Postprocess ' + path, state);
            }
        });

    }
}


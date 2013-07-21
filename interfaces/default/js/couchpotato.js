var profiles = $('<select>');
$(document).ready(function() {
    $(window).trigger('hashchange')
    getMovieList()
    getNotificationList()
    getHistory()
    $('#searchform').submit(function(e) {
        e.preventDefault();
        var search = $('#search_movie_name').val();
        if (search) searchMovie(search);
    });
    $.get(WEBDIR + 'couchpotato/GetProfiles', function(data) {
        if (data == null) return
        $.each(data.list, function(i, item) {
            if (!item.hide) profiles.append($('<option>').val(item.id).text(item.label));
        });
    });
});

function getMovieList() {
    var wanted = $('#wanted-grid').empty();
    $('.spinner').show();
    $.getJSON(WEBDIR + 'couchpotato/GetMovieList', function (result) {
        $('.spinner').hide();
        if (result == null || result.total == 0) {
            wanted.append($('<li>').html('No wanted movies found'))
            return
        }
        $.each(result.movies, function(i, movie) {
            var link = $('<a>').attr('href', '#').click(function(e) {
                e.preventDefault();
                showMovie(movie);
            });
            var src = WEBDIR + 'couchpotato/GetImage?w=100&h=150&url=' + movie.library.info.images.poster[0]
            link.append($('<img>').attr('src', src).addClass('thumbnail'));
            var title = shortenText(movie.library.info.original_title, 12);
            link.append($('<h6>').addClass('movie-title').html(title));
            wanted.append($('<li>').attr('id', movie.id).append(link));
        });
    });
}
function showMovie(movie) {
    if (movie.library) {
        var info = movie.library.info
        var plot = movie.library.plot
        var year = movie.library.year
    } else {
        var info = movie
        var plot = movie.plot
        var year = movie.year
    };
    var src = 'holder.js/154x231/text:No artwork';
    if (info.images.poster) {
        src = WEBDIR + 'couchpotato/GetImage?w=154&h=231&url=' + info.images.poster[0]
    }
    var modalImg = $('<img>').attr('src', src).addClass('thumbnail pull-left');

    var modalInfo = $('<div>').addClass('modal-movieinfo');
    if (info.runtime) {
        modalInfo.append($('<p>').html('<b>Runtime:</b> ' + parseSec(info.runtime)));
    }
    modalInfo.append($('<p>').html('<b>Plot:</b> ' + plot));
    if (info.directors) {
        modalInfo.append($('<p>').html('<b>Director:</b> ' + info.directors));
    }
    if (info.genres) {
        modalInfo.append($('<p>').html('<b>Genre:</b> ' + info.genres));
    }
    if (info.rating && info.rating.imdb) {
        var rating = $('<div>').raty({
            readOnly: true,
            path: WEBDIR+'img',
            score: (info.rating.imdb[0] / 2),
        })
        modalInfo.append(rating);
    }

    profiles.unbind()
    var title = info.original_title
    if (movie.library) {
        profiles.change(function() {
            editMovie(movie.id, $(this).val());
        }).val(movie.profile_id)
        var modalButtons = {
            'Delete' : function() {
                deleteMovie(movie.id, title);
                hideModal();
            },
            'Refresh' : function() {
                refreshMovie(movie.id, title);
                hideModal();
            }
        }
    } else {
        var modalButtons = {
            'Add' : function() {
                addMovie(movie.imdb, profiles.val(), title);
                hideModal();
            }
        }
    }
    if (info.imdb) {
        $.extend(modalButtons,{
            'IMDb' : function() {
                window.open('http://www.imdb.com/title/'+info.imdb,'IMDb')
            }
        });
    }
    modalInfo.append(profiles)
    var modalBody = $('<div>').append(modalImg, modalInfo)
    showModal(title + ' ('+year+')',  modalBody, modalButtons);
}
function addMovie(movieid, profile, title) {
    $.getJSON(WEBDIR + 'couchpotato/AddMovie', {
        movieid: movieid,
        profile: profile,
        title: encodeURIComponent(title)
    }, function (result) {
        notify('CouchPotato', title + ' successfully added!', 'info');
        setTimeout(function() {
            getMovieList()
            $('a[href=#wanted]').tab('show')
        }, 500);
    });
}
function editMovie(id, profile) {
    $.getJSON(WEBDIR + 'couchpotato/EditMovie', {
        id: id,
        profile: profile
    }, function (result) {
        if (result.success) {
            notify('CouchPotato', 'Profile changed', 'info');
            getMovieList();
        } else {
            notify('CouchPotato', 'An error occured.', 'error');
        }
    });
}
function deleteMovie(id, name) {
    $.getJSON(WEBDIR + 'couchpotato/DeleteMovie', {id: id}, function (result) {
        if (result.success) {
            $('#' + id).fadeOut();
            notify('CouchPotato', name + ' successfully deleted!', 'info');
        } else {
            notify('CouchPotato', 'An error occured.', 'error');
        }
    });
}
function refreshMovie(id, name) {
    $.getJSON(WEBDIR + 'couchpotato/RefreshMovie', {id: id}, function (result) {
        if (result.success) {
            notify('CouchPotato', 'Refreshing: ' + name, 'info');
        } else {
            notify('CouchPotato', 'An error occured.', 'error');
        }
    });
}
function searchMovie(q) {
    var grid = $('#result-grid').empty()
    $('a[href=#result]').tab('show')
    $('#searchspinner').show()
    $.getJSON(WEBDIR + 'couchpotato/SearchMovie', {
        q: encodeURIComponent(q)
    }, function (result) {
        $('.spinner').hide();
        $.each(result.movies, function(i, movie) {
            var link = $('<a>').attr('href', '#').click(function(e) {
                e.preventDefault();
                showMovie(movie);
            });
            var src = 'holder.js/100x150/text:No artwork';
            if (movie.images.poster[0]) {
                src = WEBDIR + 'couchpotato/GetImage?w=100&h=150&url=' + movie.images.poster[0]
            }
            link.append($('<img>').attr('src', src).addClass('thumbnail'));
            var title = shortenText(movie.original_title, 12);
            link.append($('<h6>').addClass('movie-title').html(title));
            grid.append($('<li>').attr('id', movie.id).append(link));
        })
        Holder.run();
    })
}
function getNotificationList() {
    $.getJSON(WEBDIR + 'couchpotato/GetNotificationList', function (result) {
        if (result == null) return;
        $.each(result.notifications, function(i, item) {
            if (!item.read) notify('Notifications', item.message, 'info');
        });
    });
}
function getHistory() {
    $.getJSON(WEBDIR + 'couchpotato/GetNotificationList', function (result) {
        if (result == null) return;
        $.each(result.notifications, function(i, item) {
            $('#history-grid').prepend(
                $('<tr>').append(
                    $('<td>').text(parseDate(item.added)),
                    $('<td>').text(item.message)
                )
            )
        });
    });
}
var profiles;

$(document).ready(function() {
    getNotificationList();
    getMovieList();
    getHistory();
    $('#searchform').submit(function(e) {
        e.preventDefault();
        var search = $('#search_movie_name').val();
        if (search) searchMovie(search);
    });
    $('#searchform button').click(function(e) {
        e.stopPropagation();
    });
    $('#search_movie_name').popover({
        placement: 'bottom',
        trigger: 'manual',
        content: '<div class="spinner" id="searchspinner"></div><ul id="search-movie-list"></ul>'
    });
    $('html').click(function(){
        $('#search_movie_name').popover('hide');
    });
    $.get(WEBDIR + 'couchpotato/GetProfiles', function(data) {
        profiles = data;
    });
});

function getMovieList() {
    $('#wanted-grid').children().remove();
    $('.spinner').show();
    $.ajax({
        url: WEBDIR + 'couchpotato/GetMovieList',
        type: 'get',
        dataType: 'json',
        success: function (result) {
            $('.spinner').hide();
            if (result == null) result.total = 0;
            if (result.total == 0) {
                var row = $('<li>').html('No wanted movies found');
                $('#wanted-grid').append(row);
                return false;
            }

            $.each(result.movies, function(i, movie) {
                movieItem = $('<li>').attr('id', movie.id);

                var movieAnchor = $('<a>').attr('href', '#');
                movieAnchor.addClass('thumbnail');
                movieAnchor.append($('<img>').attr('src', WEBDIR + 'couchpotato/GetImage?url='+movie.library.info.images.poster[0]));
                movieAnchor.click(function(e) {
                    e.preventDefault();
                    showMovie(movie);
                });
                movieItem.append(movieAnchor);

                var movieTitle = shortenText(movie.library.info.original_title, 12);
                movieItem.append($('<h6>').addClass('movie-title').html(movieTitle));

                $('#wanted-grid').append(movieItem);
            });
        }
    });
}
function showMovie(movie) {
    var movieTitle = movie.library.info.original_title
    var modalMovieAnchor = $('<div>').addClass('thumbnail pull-left');
    modalMovieAnchor.append($('<img>').attr('src', movie.library.info.images.poster[0]));

    var modalMovieInfo = $('<div>').addClass('modal-movieinfo');
    if (movie.library.info.runtime) {
        modalMovieInfo.append($('<p>').html('<b>Runtime:</b> ' + parseSec(movie.library.info.runtime)));
    }
    modalMovieInfo.append($('<p>').html('<b>Plot:</b> ' + movie.library.plot));
    if (movie.library.info.directors) {
        modalMovieInfo.append($('<p>').html('<b>Director:</b> ' + movie.library.info.directors));
    }
    if (movie.library.info.genres) {
        modalMovieInfo.append($('<p>').html('<b>Genre:</b> ' + movie.library.info.genres));
    }
    if (movie.library.info.rating.imdb) {
        var rating = $('<div>').raty({
            readOnly: true,
            path: WEBDIR+'img',
            score: (movie.library.info.rating.imdb[0] / 2),
        })
        modalMovieInfo.append(rating);
    }

    var modalProfile = $('<p>').html('');
    var profileSelect = $('<select>').change(function() {
        editMovie(movie.id, $(this).val());
    });
    $.each(profiles.list, function(i, item) {
        if (!item.hide) {
            var option = $('<option>').val(item.id).text(item.label);
            if (item.label == movie.profile.label) option.attr('selected','selected');
            profileSelect.append(option);
        }
    });
    modalProfile.append(profileSelect);
    modalMovieInfo.append(modalProfile);

    modalBody = $('<div>');
    modalBody.append(modalMovieAnchor);
    modalBody.append(modalMovieInfo);

    var modalButtons = {
        'Delete' : function() {
            deleteMovie(movie.id, movieTitle);
            hideModal();
        },
        'Refresh' : function() {
            refreshMovie(movie.id, movieTitle);
            hideModal();
        }
    }
    if (movie.library.info.imdb) {
        $.extend(modalButtons,{
            'IMDb' : function() {
                window.open('http://www.imdb.com/title/'+movie.library.info.imdb,'IMDb')
            }
        });
    }

    showModal(movieTitle + ' ('+movie.library.year+')',  modalBody, modalButtons);
}

function editMovie(id, profile) {
    $.ajax({
        url: WEBDIR + 'couchpotato/EditMovie',
        data: {id: id, profile: profile},
        type: 'get',
        dataType: 'json',
        success: function (result) {
            if (result.success) {
                notify('CouchPotato', 'Profile changed', 'info');
            }
        }
    });
}

function deleteMovie(id, name) {
    $.ajax({
        url: WEBDIR + 'couchpotato/DeleteMovie',
        data: {id: id},
        type: 'get',
        dataType: 'json',
        success: function (result) {
            if (result.success) {
                $('#' + id).fadeOut();
                notify('CouchPotato', name + ' successfully deleted!', 'info');
            }
        }
    });
}

function refreshMovie(id, name) {
    $.ajax({
        url: WEBDIR + 'couchpotato/RefreshMovie',
        data: {id: id},
        type: 'get',
        dataType: 'json',
        success: function (result) {
            if (result.success) {
                notify('CouchPotato', name + ' successfully refreshed!', 'info');
            }
        }
    });
}

function searchMovie(q) {
    $('#search_movie_name').popover('show')
    $('#search-movie-list').click(function(e) {
        e.stopPropagation();
    });
    $('#searchspinner').show();
    $.ajax({
        url: WEBDIR + 'couchpotato/SearchMovie',
        data: {q: encodeURIComponent(q)},
        type: 'get',
        dataType: 'json',
        success: function (result) {
            $('.spinner').hide();
            $.each(result.movies, function(i, item) {
                var row = $('<li>').click(function(e) {
                    e.stopPropagation();
                    selectProfile(item)
                });

                var movieThumb = $('<div>').addClass('thumbnail');
                movieThumb.append($('<img>').attr('src', item.images.poster[0]));
                row.append(movieThumb);

                var movieInfo = $('<div>').addClass('movie-info');
                movieInfo.append($('<h3>').text(item.original_title + ' ('+item.year+')'));
                movieInfo.append($('<p>').html(shortenText(item.plot, 200)));
                row.append(movieInfo);

                $('#search-movie-list').append(row);
            });
        }
    });
}

function selectProfile(movie) {
    var form = $('<form>').addClass('form-inline').submit(function(e) {
        e.preventDefault();
        var profile = $('#profile').val();
        var title = $('#title').val();
        addMovie(profile, movie.imdb, title);
    });
    var titleSelect = $('<select>').attr('id','title');
    $.each(movie.titles, function(i, item) {
        titleSelect.append($('<option>').text(item));
    });
    form.append(titleSelect);
    var profileSelect = $('<select>').attr('id','profile');
    $.each(profiles.list, function(i, item) {
        if (!item.hide) {
            var option = $('<option>').val(item.id).text(item.label);
            profileSelect.append(option);
        }
    });
    form.append(profileSelect);
    form.append($('<button>').attr('type','submit').addClass('btn btn-success').text('Add'));
    $('#search-movie-list').html(form);
}

function addMovie(profile, id, title) {
    $('#search_movie_name').popover('hide');
    $.ajax({
        url: WEBDIR + 'couchpotato/AddMovie',
        data: {
            profile_id : profile,
            identifier : id,
            title: encodeURIComponent(title)
        },
        type: 'get',
        dataType: 'json',
        success: function (result) {
            notify('CouchPotato', title + ' successfully added!', 'info');
            setTimeout(getMovieList, 1000);
        },
    });
}

function getNotificationList() {
    $.ajax({
        url: WEBDIR + 'couchpotato/GetNotificationList',
        type: 'get',
        dataType: 'json',
        success: function (result) {
            if (result == null) return;
            $.each(result.notifications, function(i, item) {
                if (!item.read) {
                    notify('Notifications', item.message, 'info');
                }
            });
        }
    });
}

function getHistory() {
    $.ajax({
        url: WEBDIR + 'couchpotato/GetNotificationList',
        type: 'get',
        dataType: 'json',
        success: function (result) {
            if (result == null) return;
            $.each(result.notifications, function(i, item) {
                date = parseDate(item.added);
                var row = $('<tr>');
                row.append($('<td>').text(date));
                row.append($('<td>').text(item.message));
                $('#history-grid').prepend(row);
            });
        }
    });
}

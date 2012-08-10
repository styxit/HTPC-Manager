$(document).ready(function() {
    getMovieList();
    getNotificationList();
    $('#search_movie_name').keydown(function(e){
        if(e.which == 13){
            searchMovie($('#search_movie_name').val());
        }
    }).focus();
    $('#search_movie_button').click(function() {
        searchMovie($('#search_movie_name').val());
    });
    $('#search_movie_name').popover({
        placement: 'bottom',
        title: 'Search result',
        trigger: 'focus',
        content: '<div class="gif-loader" id="movie-loader"><img src="/img/loader.gif" alt="loader" /></div><table class="table"><tbody id="search-movie-list"></tbody></table>'
    });
});

function getMovieList() {
    $('.tooltip').remove();
    $('#movies_table_body').children().remove();
    $.ajax({
        url: '/couchpotato/GetMovieList',
        type: 'get',
        dataType: 'json',
        success: function (result) {
            if (result == null) {
                var row = $('<tr>')
                row.append($('<td>').html('No wanted movies found').attr('colspan', '5'));
                $('#movies_table_body').append(row);
                return false;
            }

            $.each(result.movies, function(i, item) {
                var movieImage = $('<img>');
                movieImage.css('height', '150px');
                movieImage.css('width', '100px');
                movieImage.attr('src', item.library.info.images.poster[0]);

                var movieThumb = $('<a>').addClass('thumbnail');
                movieThumb.append(movieImage);
                movieThumb.css('height', '150px');
                movieThumb.css('width', '100px');

                var movieTitle = item.library.info.original_title;

                var row = $('<tr>');
                row.attr('id', item.id);
                row.append($('<td>').append(movieThumb));
                var movieHtml = '<h3>' + movieTitle + ' (' + item.library.year + ')</h3>';
                movieHtml += item.library.plot + '<br />';

                var info = $('<td>');
                row.append(info.html(movieHtml));

                /* Ignore profiles for now
                $.each(item.profile.types, function(i, item) {
                    var profile = $('<span>');
                    profile.addClass('label');
                    profile.html(item.id);
                    info.append(profile);
                    info.append(' ');
                });
                */

                var editIcon = makeIcon('icon-pencil', 'Edit');
                var refreshIcon = makeIcon('icon-refresh', 'Refresh');
                refreshIcon.click(function() {
                   refreshMovie(item.id, movieTitle);
                });
                var removeIcon = makeIcon('icon-remove', 'Remove');
                removeIcon.click(function() {
                    deleteMovie(item.id, movieTitle);
                });

                //row.append($('<td>').append(editIcon));
                row.append($('<td>').append(refreshIcon));
                row.append($('<td>').append(removeIcon));

                $('#movies_table_body').append(row);
            });
        }
    });
}

function deleteMovie(id, name) {
    $('.tooltip').remove();
    $.ajax({
        url: '/couchpotato/DeleteMovie',
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
        url: '/couchpotato/RefreshMovie',
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
    $('.tooltip').remove();
    $.ajax({
        url: '/couchpotato/SearchMovie',
        data: {q: encodeURIComponent(q)},
        type: 'get',
        dataType: 'json',
        beforeSend: function () {
            $('#search_movie_name').popover('show');
            $('#movie-loader').show();
        },
        success: function (result) {
            $.each(result.movies, function(i, item) {
                $('#movie-loader').hide();

                var movieImage = $('<img>');
                movieImage.css('height', '100px');
                movieImage.css('width', '75px');
                movieImage.attr('src', item.images.poster[0]);

                var movieThumb = $('<a>').addClass('thumbnail');
                movieThumb.append(movieImage);
                movieThumb.css('height', '100px');
                movieThumb.css('width', '75px');

                var row = $('<tr>');
                row.attr('data-imdb', item.imdb);
                row.append($('<td>').append(movieThumb));

                var movieHtml = '<h3>' + item.original_title + ' <small>' + item.year + '</small></h3>';
                movieHtml += shortenText(item.plot, 200);
                row.append($('<td>').append(movieHtml));

                var addIcon = makeIcon('icon-plus', 'Add');
                addIcon.click(function() {
                    addMovie(12, item.imdb, item.original_title);
                });
                row.append($('<td>').append(addIcon));
                $('#search-movie-list').append(row);
            });
        }
    });
}

function addMovie(profile, id, title) {
    $('.tooltip').remove();
    var loader = $('#movie-loader').show();
    $('[data-imdb=' + id + ']').children().remove();
    var row = $('<td>').attr('colspan', 3).append(loader);
    $('[data-imdb=' + id + ']').append(row);
    $.ajax({
        url: '/couchpotato/AddMovie',
        data: {
            profile_id : profile,
            identifier : id,
            title: encodeURIComponent(title)
        },
        type: 'get',
        dataType: 'json',
        success: function (result) {
            notify('CouchPotato', title + ' successfully added!', 'info');
            $('#search_movie_name').popover('hide');
            setTimeout(getMovieList, 1000);
        },
    });
}

function getNotificationList() {
    $.ajax({
        url: '/couchpotato/GetNotificationList',
        type: 'get',
        dataType: 'json',
        success: function (result) {
            console.log(result);
        }
    });
}

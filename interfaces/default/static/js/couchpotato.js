$(document).ready(function() {
    getMovieList();
    getNotificationList();
    $('#search_movie_button').click(function() {
        searchMovie($('#search_movie_name').val());
    });
    $('#search_movie_name').popover({
        placement: 'bottom',
        title: 'Search result',
        trigger: 'manual',
        content: '<div class="gif-loader" id="movie-loader"><img src="img/loader.gif" alt="loader" /></div><table class="table"><tbody id="search-movie-list"></tbody></table>'
    });
});

function getMovieList() {
    $('.tooltip').remove();
    $('#movies_table_body').children().remove();

    $.ajax({
        url: 'json/?which=couchpotato&action=movielist',
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

				/*
				 * List accepted profiles. Removed for now.
                $.each(item.profile.types, function(i, item) {
                    var profile = $('<span>');
                    profile.addClass('label');
                    profile.html(item.id);
                    info.append(profile);
                    info.append('&nbsp;');
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
        url: '/json/?which=couchpotato&action=moviedelete',
        data: {
            id: id
        },
        type: 'get',
        dataType: 'json',
        success: function (result) {
            if (result.success) {
                $('#' + id).fadeOut();
                notifyInfo('CouchPotato', name + ' successfully deleted!');
            }
        }
    });
}

function refreshMovie(id, name) {
    $.ajax({
        url: '/json/?which=couchpotato&action=movierefresh',
        data: {
            id: id
        },
        type: 'get',
        dataType: 'json',
        success: function (result) {
            if (result.success) {
                notifyInfo('CouchPotato', name + ' successfully refreshed!');
            }
        }
    });
}

function searchMovie(q) {
    $('.tooltip').remove();
    $.ajax({
        url: '/json/?which=couchpotato&action=moviesearch',
        data: {
            q: encodeURIComponent(q)
        },
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

                var close = $('<span>&times;test</span>');
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
        url: '/json/?which=couchpotato&action=movieadd',
        data: {
            profile_id : profile,
            identifier : id,
            title: encodeURIComponent(title)
        },
        type: 'get',
        dataType: 'json',
        success: function (result) {
            notifyInfo('CouchPotato', title + ' successfully added!');
            getMovieList();
        },
        complete: function() {
        	$('#search_movie_name').popover('hide');
        }
    });
}

function getNotificationList() {
    $.ajax({
        url: '/json/?which=couchpotato&action=notificationlist',
        type: 'get',
        dataType: 'json',
        success: function (result) {
            console.log(result);
        }
    });
}
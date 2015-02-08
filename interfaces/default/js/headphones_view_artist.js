$(document).ready(function () {
    $(window).trigger('hashchange');
    var albumid = $('h1.page-title').attr('data-albumid');
    var artistimg = $('h1.page-title').attr('data-artistimg');
    //$('#banner').css('background-image', 'url(' + WEBDIR + 'headphones/GetThumb/?url=' + artistimg + ')'); // encodeURIComponent should resize img?
    $('#album-tracks .btn-search').click(function () {
        var $parentRow = $(this).parents('tr')
        var albumId = $parentRow.attr('data-albumid');
        var name = $(this).parents('tr').find('.artist').text();
        searchForAlbum(albumId, name);
    })
    $('#album-tracks .unque-album-hp').click(function () {
        var $parentRow = $(this).parents('tr')
        var albumId = $parentRow.attr('data-albumid');
        var name = $(this).parents('tr').find('.artist').text();
        unquealbum(albumId, name);

    })
    if(artistimg == "None") {
        $('.artist_img').attr('src', WEBDIR + 'img/no-cover-art.png')
     } else {
        $('.artist_img').attr('src', WEBDIR + 'headphones/GetThumb/?url=' + encodeURIComponent(artistimg))
        //$('.album_img').attr('src', WEBDIR + 'headphones/GetThumb/?url=' + albumimg)
     }


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
            notify('OK', 'Found ' + name + ' album', 'success');
        },
        error: function (data) {
            notify('Error', 'Episode not found.', 'error', 1);
        },
        complete: function (data) {
            hideModal();
            // Hate the reload but content is rendered from mako
            location.reload()
        }
    });
}

function unquealbum(albumid, name) {
    $.ajax({
        url: WEBDIR + 'headphones/UnqueueAlbum',
        data: {
            'albumId': albumid
        },
        type: 'get',
        success: function (result) {
            if (result === "OK") {
                notify('OK', 'Unqued ' + name + ' album', 'success');
                location.reload();

            } else {
                notify('Error', 'Unqued ' + name + ' album', 'error', 1);
            }
        }

    });
}
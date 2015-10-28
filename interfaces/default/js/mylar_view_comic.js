$(document).ready(function () {
    $(window).trigger('hashchange');
    var comicimg = $('h1.page-title').attr('data-comicimg');
    $('#comic-issues .btn-search').click(function () {
        var $parentRow = $(this).parents('tr')
        var issueid = $parentRow.attr('data-issueid');
        var name = $(this).parents('tr').find('.comic').text();
        searchForIssue(issueid, name);
    })
    $('#comic-issues .unque-issue-mylar').click(function () {
        var $parentRow = $(this).parents('tr')
        var issueid = $parentRow.attr('data-issueid');
        var name = $(this).parents('tr').find('.comic').text();
        unqueissue(issueid, name);

    })

    if(comicimg == "None") {
        $('.comic_img').attr('src', WEBDIR + 'img/no-cover-art.png')
     } else {
        $('.comic_img').attr('src', WEBDIR + 'mylar/GetThumb?url=' + encodeURIComponent(comicimg))
     }


});

function searchForIssue(Id, name) {
    var modalcontent = $('<div>');
    modalcontent.append($('<p>').html('Looking for Issue &quot;'+ name +'&quot;.'));
    modalcontent.append($('<div>').html('<div class="progress progress-striped active"><div class="bar" style="width: 100%;"></div></div>'));
    showModal('Searching for Issue "'+ name + '"', modalcontent, {});

    $.ajax({
        url: WEBDIR + 'mylar/QueueIssue?issueid=' + Id,
        type: 'get',
        dataType: 'json',
        timeout: 600000,
        success: function (data) {
            notify('OK', 'Found ' + name + ' issue', 'success');
        },
        error: function (data) {
            notify('Error', 'Issue not found.', 'error', 1);
        },
        complete: function (data) {
            hideModal();
            // Hate the reload but content is rendered from mako
            location.reload()
        }
    });
}

function unqueissue(id, name) {
    $.ajax({
        url: WEBDIR + 'mylar/UnqueueIssue',
        data: {
            'issueid': id,
            'name': name
        },
        type: 'get',
        success: function (result) {
            if (result === "OK") {
                notify('OK', 'Unqued ' + name + ' issue', 'success');
                location.reload();

            } else {
                notify('Error', 'Unqued ' + name + ' issue', 'error', 1);
            }
        }

    });
}

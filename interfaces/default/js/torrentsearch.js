
$(document).ready(function () {
    $('.torrent_search_table').tablesorter();
    // Disables nzb search if torrent search page is open
    if ($('.formsearch').length) {
        $('.formsearch').addClass('disabled');
    } else {
        //pass
    }

    $('.formsearch').submit(function (e) {
        e.preventDefault();
        query = $(e.target).find('.search').val();
        if (query === undefined) return;
        search(query);
    });
});

// Sends torrent to the client on click
$(document).on('click', '.dlt', function (e) {
    e.preventDefault();
    var torrent_name = $(this).attr('data-name');
    var client = $(this).attr('data-client'); //
    var path = $(this).attr('data-path');
    var par = {'cmd':$(this).attr('data-cmd'), 'hash':$(this).attr('data-hash'), 'name':$(this).attr('data-name')};
    $.get(WEBDIR + path, par, function(response) {
        notify(torrent_name, 'Sent to ' + client, 'success');
    });
});


function search(query) {
    if (query.length === 0) return;
    $('.spinner').show();
    $('#torrent_search_results').empty();
    $('#error_msg').empty();

    $.getJSON(WEBDIR + "torrentsearch/search/" + query, function (response) {

        // Stops the function from running if the search dont get any hits
        if (response.results === "0") {
            $('#error_msg').text('Didnt find any torrents with the query ' + query);
            $('#error_msg').css({"font-weight": "bold"});
            $('.spinner').hide();
            return;
        }

        $.each(response, function (index, torrent) {
            tr = $('<tr>');

            tr.append(
            $('<td>').addClass('torrentsearch_releasename').text(torrent.ReleaseName),
            $('<td>').addClass('torrentsearch_seeders').text(torrent.Seeders),
            $('<td>').addClass('torrentsearch_leechers').text(torrent.Leechers),
            $('<td>').addClass('torrentsearch_size').text(bytesToSize(torrent.Size, 2)),
            $('<td>').addClass('torrentsearch_source').text(torrent.Source),
            $('<td>').addClass('torrentsearch_resolution').text(torrent.Resolution),
            $('<td>').addClass('torrentsearch_container').text(torrent.Container),
            $('<td>').addClass('torrentsearch_codec').text(torrent.Codec),
            $('<td>').addClass('torrentsearch_snatched').text(torrent.Snatched),
            $('<td>').append(atc(torrent)));

            $('#torrent_search_results').append(tr);
            $('.spinner').hide();

        });
    // Leting sort plugin know that there was a ajax call
    $('.torrent_search_table').trigger('update');
    //Sort on seeds and snatches descending
    $('table').trigger("sorton", [[[1,1],[8,1]]]);

    });
}


// Get active torrent clients
function atc(torrent) {
    var b = $('<div>').addClass('btn-group');
    $.getJSON(WEBDIR + "torrentsearch/getclients", function (response) {
        // Used to check if there is any active clients
        var n = 0;
        $.each(response, function (i, client) {
            if (client.active === 1) {
                var button = $('<a>').addClass('btn btn-mini dlt').
                attr('data-client', client.title).
                attr('data-path', client.path).
                attr('data-cmd', client.cmd).
                attr('data-name', torrent.ReleaseName). // not correct
                attr('data-hash', torrent.DownloadURL).
                attr('href', "#");
                // If there any active clients add 1 to n
                n += 1;
                // Makes icon and pop title
                var img = makeIcon("icon-download-alt", client.title);
                button.append(img);
                b.append(button);
            }
        });
        // Checks if there is any active clients, if it isnt add a error message.
        if (n === 0) { // remove || 1 if needed was to test
            b.append('No active clients').removeClass('btn-group');
            return b;
        } 
        else if (n === 1) {
            b.removeClass('btn-group');
        }

    });
    return b;
}
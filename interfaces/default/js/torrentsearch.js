
$(document).ready(function () {
    var clients
    get_clients()
    $(window).trigger('hashchange')

    // Disables nzb search if torrent search page is open
    if ($('.formsearch').length) {
        $('.formsearch').addClass('disabled');
    }
    $('.search').attr('placeholder', "Filter torrents")

    var TorrentSearch = function (e) {
        e.preventDefault();
        var query = $('#tsinput').val();
        var provider = $('#formindexer').val();
        if (query) {
            search(query, provider);
        }
    };

    $('#tsinput').keyup(function(event){
        if(event.keyCode == 13){
            TorrentSearch
        }
    });

    $('#search_torrent_button').click(TorrentSearch);
});

// Sends torrent to the client on click
$(document).on('click', '.dlt', function (e) {
    e.preventDefault();
    var torrent_name = $(this).attr('data-name');
    var client = $(this).attr('data-client'); //
    var path = $(this).attr('data-path');
    var par = {'cmd':$(this).attr('data-cmd'), 'link':$(this).attr('data-hash'), 'torrentname':$(this).attr('data-name')};
    $.get(WEBDIR + path, par, function(response) {
        notify(torrent_name, 'Sent to ' + client, 'success');
    });
});


// Based on btn for now, should use a generic one..
function search(query, provider) {
    if (query.length === 0) return;
    $('.spinner').show();
    $('#torrent_search_results').empty();
    $('#error_msg').empty();

    $.getJSON(WEBDIR + "torrentsearch/search?query=" + query +  '&provider=' + provider,function (response) {

        // Stops the function from running if the search doesn't get any hits
        if (!response.length) {
            $('#error_msg').html('Didnt find any torrents with the query <code>' + query + '</code>');
            $('.spinner').hide();
            return;
        }

        $.each(response, function (index, torrent) {
            tr = $('<tr>');
            link = $('<a target="_blank">').attr('href', torrent.BrowseURL).text(torrent.ReleaseName)

            tr.append(
            $('<td>').append($('<i>').addClass('rg rg-provider rg-' + torrent.Provider + '-c')), // provider icon
            $('<td>').append(link),
            $('<td>').addClass('torrentsearch_seeders').text(torrent.Seeders),
            $('<td>').addClass('torrentsearch_leechers').text(torrent.Leechers),
            $('<td>').addClass('torrentsearch_size">').text(humanFileSize(torrent.Size, 2)),
            $('<td>').addClass('hidden-phone torrentsearch_source').text(torrent.Source),
            $('<td>').addClass('hidden-phone torrentsearch_resolution').text(torrent.Resolution),
            $('<td>').addClass('hidden-phone torrentsearch_container').text(torrent.Container),
            $('<td>').addClass('hidden-phone torrentsearch_codec').text(torrent.Codec),
            $('<td>').addClass('hidden-phone torrentsearch_snatched').text(torrent.Snatched),
            $('<td>').append(atc(torrent)));
            $('#torrent_search_results').append(tr);


        });
    // Letting sort plugin know that there was a ajax call
    $('.spinner').hide();
    byteSizeOrdering()
    $('.torrent_search_table').trigger('update');
    // sort on seeds 0 based 0 1 2


    });
}

function atc(torrent) {
    var b = $('<div>').addClass('btn-group');
        // Used to check if there are any active clients
        var n = 0;
        $.each(clients, function (i, client) {
            if (client.active === 1) {
                var button = $('<a>').addClass('btn btn-mini dlt rg-client').
                attr('data-client', client.title).
                attr('data-path', client.path).
                attr('data-cmd', client.cmd).
                attr('data-name', torrent.ReleaseName). // not correct
                attr('data-hash', torrent.DownloadURL).
                attr('href', "#");
                // If there are any active clients add 1 to n
                n += 1;
                // Makes icon and pop title
                var img = makeIcon("rg rg-" + client.title.toLowerCase() + "-c", client.title);
                button.append(img);
                b.append(button);
            }
        });
        // Checks if there are any active clients, if there isn't add an error message.
        if (n === 0) { // remove || 1 if needed was to test
            b.append('No active clients').removeClass('btn-group');
            return b;
        }
        else if (n === 1) {
            b.removeClass('btn-group');
        }

    return b;
}

function get_clients() {
    $.getJSON(WEBDIR + "torrentsearch/getclients", function (response) {
        clients = response
    });
}


$(document).ready(function () {
    if ($('.formsearch').length) {
        alert('we found formsearch');
        //$('.formsearch').attr('action', '/torrentsearch/');
        $('.formsearch').addClass('disabled');
    } else {
        //alert('we didnt not find formsearch');
    }

    $('#search').val("test");
    $('form.disabled').submit(function (e) {
        alert('Fired');
        e.preventDefault();
    });
});


$(document).on('click', '.TorrentToQbt', function (e) {
    e.preventDefault();
    var torrent_name = $(this).attr('data-name');
    $.get(WEBDIR + 'qbittorrent/command/' + $(this).attr('data-action') + '/' + $(this).attr('data-hash') + '/' + $(this).attr('data-name') + '/', function() {
        notify(torrent_name, 'Sent to qBittorrent', 'success');
    });
});

/*
$(document).on('click', '#search', function () {
    query = $(this).val();
    qq = typeof(query);
    alert(qq);
    if (query === undefined) return;
    search(query);
});
*/




function search(query) {
    alert('running search')
    if (query.length === 0) return;
    $('.spinner').show();
    $('#torrent_search_results').empty();
    $('#error_msg').empty();
    //remove the /?query if needed was to test form.
    $.getJSON(WEBDIR + "torrentsearch/search/" + query, function (response) {
        //alert(response.results);
        /*
        if (response.results === 0) {
            alert(response.results);
            $('#error_msg').text('Didnt find any torrents with that name');
            return;
        }
        */
        // Stops the function from running if the search dont get any hits
        if (response.results === "0") {
            $('#error_msg').text('Didnt find any torrents with the query' +q);
            $('#error_msg').css({"font-weight": "bold"});
            $('.spinner').hide();
            return;
        }

        $.each(response, function (index, torrent) {
            tr = $('<tr>');
            var buttons = '';
            
            //btn group
            //buttons = $('<div>').addClass('btn-group');
            //download_clientbutton = gen_buttons(torrent);
            //buttons.append(download_clientbutton);
            //lol
            //http://localhost:8086/qbittorrent/command?cmd=download&hash=http://torcache.net/torrent/D926540C7129877DFDC6D1A33AD0338872F349B8.torrent
            /*
            $('a.ajax-link').click(function (e) {
                    e.preventDefault();
                    var link = $(this);
                    $.getJSON(link.attr('href'), function () {
                    notify('', 'Sent to qBittorrent', 'success');
                    });
                });
            */
            
            var itemlink = $('<a class="TorrentToQbt" data-action="download" data-name="" data-hash="">').
            //attr('href', WEBDIR + 'qbittorrent/command?cmd=download&hash=' + torrent.DownloadURL + '/' + torrent.ReleaseName).
            attr('data-hash', torrent.DownloadURL).
            attr('data-name', torrent.ReleaseName).
            attr('title', 'Send to qBittorrent');

            var toqbtIcon = $('<i>');
            toqbtIcon.addClass('icon-download-alt');
            toqbtIcon.css('cursor', 'pointer');
            itemlink.append(toqbtIcon);
            
            tr.append(

            $('<td>').addClass('qbt_name').text(torrent.ReleaseName),
            $('<td>').addClass('qbt_ratio').text(torrent.Seeders),
            $('<td>').addClass('qbit_eta').text(torrent.Leechers),
            $('<td>').addClass('qbt_state').text(bytesToSize(torrent.Size, 2)),
            $('<td>').addClass('qbt_state').text(torrent.Source),
            $('<td>').addClass('qbt_state').text(torrent.Resolution),
            $('<td>').addClass('qbt_state').text(torrent.Container),
            $('<td>').addClass('qbt_state').text(torrent.Codec),
            $('<td>').addClass('qbt_state').text(torrent.Snatched),

            $('<td>').append(itemlink));//.addClass('qbit_progress').text('test')); // test
            //$('<td>').addClass('torrent-action').append(download_clientbutton));
            //DownloadURL
            $('#torrent_search_results').append(tr);
            $('.spinner').hide();
            //alert(response.results);

        });
    });
}

/*
$( '#hellow').click(function() {
  //alert( "Handler for .click() called." );
    alert("click");
    gen_buttons('torrent');
});
*/

// test for buttons
/*
function gen_buttons(torrent) {
$.get('torrentsearch/getclients'), function (data) {
    alert data;
    var btn = $('<div>').addClass('btn-group');
    $.each(data, function(k, v) {
        if (v === 1) {
            alert(k);
            if(k === 'qbittorrent') {
                //upload torrent command
                u = WEBDIR + '/qbittorrent/command/urls/' + torrent.DownloadURL;
                var clientname = k
                alert(u);
            }
            else if (k === 'deluge') {
                //
            }
              else if (k === 'utorrent') {
                //
            }
              else if (k === 'transmission') {
                //
            }
            downloadbtn = $('<a class="download_torrent">').addClass('btn btn-mini');
            downloadbtn.html('<i class="icon-download-alt"></i>');
            downloadbtn.attr('title', clientname);
            downloadbtn.attr('href', u);
            btn.append(downloadbtn);
            alert(btn);
            return btn

        }
});
}
}
*/
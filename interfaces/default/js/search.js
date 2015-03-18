function getCategories() {
    $.ajax({
        url: WEBDIR + 'search/getcategories',
        type: 'get',
        dataType: 'json',
        success: function (data) {
            if (data == null) return false;

            var select = $('#catid').html('');
            select.append($('<option>').html('Everything').attr('value',''));
            $.each(data.category, function (c, cat) {
                var option = $('<option>').html(cat["@attributes"]["name"]);
                option.attr('value',cat["@attributes"]["id"])
                select.append(option)
                $.each(cat.subcat, function (s, sub) {
                    if (sub["@attributes"] == undefined) sub = cat.subcat;
                    var name = cat["@attributes"]["name"]+'-'+sub["@attributes"]["name"]
                    var option = $('<option>').html('&nbsp;&nbsp;'+name);
                    option.attr('value',sub["@attributes"]["id"])
                    select.append(option)
                });
            });
        }
    });
}

function search(query, catid) {
    if (query==undefined) return;
    $.ajax({
        url: WEBDIR + 'search/search?q='+query+'&cat='+catid,
        type: 'get',
        dataType: 'json',
        beforeSend: function () {
            $('#results_table_body').empty();
            $('.spinner').show();
        },
        success: function (data) {
            var stop = 0;
            $('.spinner').hide();
            if (data === null) return;
            $.each(data, function (i, item) {
                if (item.description == undefined) {
                    item = data;
                    stop = 1;
                }
                var attributes = []
                $.each(item.attr, function(a, attr) {
                    var name = attr['@attributes']['name'];
                    var value = attr['@attributes']['value'];
                    attributes[name] = value.replace(/\|/g,', ');
                });
                item.attr = attributes;

                var row = $('<tr>');
                var itemlink = $('<a>').attr('href','#').text(item.description).click(function(){
                    showDetails(item);
                    return false;
                });
                row.append($('<td>').append(itemlink));
                var cat = $('<a>').attr('href','#').text(item.category).click(function(){
                    $('#catid option:contains("'+item.category+'")').attr('selected', 'selected');
                    $('#searchform').submit();
                    return false;
                });

                var usenetdate;
                if (item.attr['usenetdate']) {
                    var age = moment(item.attr['usenetdate']).format("YYYY-MM-DD")
                    var temp = moment().diff(age, 'days')
                    usenetdate = temp + ' d'

                } else {
                    usenetdate = 'N/A'
                }
                row.append($('<td>').append(cat));
                row.append($('<td>').addClass('right').html(usenetdate));
                row.append($('<td>').addClass('right').html(bytesToSize(item.attr['size'], 2)));

                // Make a group of nzbclient buttons
                row.append($('<td>').append(anc(item)));

                $('#results_table_body').append(row);
                if (stop) return false;
            });
        }
    });
}

function get_clients() {
    $.getJSON(WEBDIR + "search/getclients", function (response) {
        clients = response
        return clients
    });
}

function anc(nzb) {
    var b = $('<div>').addClass('btn-group clearfix');
    // Used to check if there is any active clients
    var n = 0;
    $.each(clients, function (i, client) {
        if (client.active === 1) {
            // If there any active clients add 1 to n
            n += 1;
            var button = $('<img>').addClass("btn btn-mini").attr('src', client.icon).
            attr('title', "Send to " + client.client).
            css("cursor", "pointer").click(function () {
                sendToclient(nzb, client);
            });

            b.append(button);
        }
    });

    // Manuel download button
    var browserdl = $('<button>').addClass("btn btn-mini").attr('title', 'Download NZB to browser')
        .css({
        "cursor": "pointer",
        "height": "18px"
    }).click(function () {
        downloadFile(nzb.link);
    }).append($('<i>').addClass('icon-download-alt'));

    b.append(browserdl);

    return b;
}

function showDetails(data) {
    var modalTitle = data.description;
    if (data.attr['imdbtitle']) {
        modalTitle = data.attr['imdbtitle'];
        if (data.attr['imdbyear'])  modalTitle += ' (' + data.attr['imdbyear'] + ')';
    } else if (data.attr['artist'] && data.attr['album']) {
        modalTitle = data.attr['artist'] + ' - ' + data.attr['album'];
    }

    var modalImage = '';
    if (data.attr["coverurl"]) {
        var url = WEBDIR + 'search/thumb?url='+data.attr['coverurl']+'&w=200&h=300&category=';
        var modalImage = $('<div>').addClass('thumbnail pull-left');
        modalImage.append($('<img>').attr('src', url));
    } else if (data.attr["rageid"]) {
        var url = WEBDIR + 'search/thumb?url=rageid'+data.attr['rageid']+'&w=200&h=300&category='+ data.category;
        var modalImage = $('<div>').addClass('thumbnail pull-left');
        modalImage.append($('<img>').attr('src', url));
    }

    var modalInfo = $('<div>').addClass('modal-movieinfo');
    if(data.attr['imdbtagline']) {
        modalInfo.append($('<p>').html(data.attr['imdbtagline']));
    }
    if(data.attr['genre']) {
        modalInfo.append($('<p>').html('<b>Genre:</b> ' + data.attr['genre']));
    }
    /*
    if(data.attr['imdbdirector']) {
        modalInfo.append($('<p>').html('<b>Director:</b> ' + data.attr['imdbdirector']));
    }
    if(data.attr['imdbactors']) {
        modalInfo.append($('<p>').html('<b>Actors:</b> ' + data.attr['imdbactors']));
    }
    */
    var posted;
    if (data.attr['usenetdate']) {
        posted = moment(data.attr['usenetdate']).fromNow()
    } else {
        posted = 'N/A'
    }
    modalInfo.append($('<p>').html('<b>Posted:</b> ' +  posted));
    modalInfo.append($('<p>').html('<b>Size:</b> ' + bytesToSize(data.attr['size'])));
    modalInfo.append($('<p>').html('<b>Grabs:</b> ' + data.attr['grabs']));
    modalInfo.append($('<p>').html('<b>Files:</b> ' + data.attr['files']));

    if (data.attr['password']) {
        var password = data.attr['password'];
        if (password == 0) {
        password = 'No';
    }
        else {
        password = 'Yes';
    }
     modalInfo.append($('<p>').html('<b>Password:</b> ' + password));
    }


    if(data.attr['imdbscore']) {
        var rating = $('<span>').raty({
            readOnly: true,
            score: (data.attr['imdbscore'] / 2),
        })
        modalInfo.append(rating);
    }
    if(data.attr['label']) {
        modalInfo.append($('<p>').html('<b>Label:</b> ' + data.attr['label']));
    }
    if(data.attr['tracks']) {
        modalInfo.append($('<p>').html('<b>Tracks:</b> ' + data.attr['tracks']));
    }

    var modalBody = $('<div>');
    modalBody.append(modalImage);
    modalBody.append(modalInfo);

    var modalButtons = {}
    $.each(clients, function(i, v){
        if (v.active === 1 && v.client === "nzbget") {
            $.extend(modalButtons,{
            'NZBget' : function() {
                sendToGet(data)
                hideModal();
                }
            });

        }
        if (v.active === 1 && v.client === "sabnzbd") {
            $.extend(modalButtons,{
            'SABnzbd' : function() {
                sendToSab(data)
                hideModal();
                }
            });

        }

    })

    // manual download to the browser
    $.extend(modalButtons,{
            'Download NZB' : function() {
                downloadFile(data.link);
            }
    });

    if (data.attr['imdb']) {
        var link = 'http://www.imdb.com/title/tt' + data.attr['imdb'] + '/';
        $.extend(modalButtons,{
            'IMDb' : function() {
                window.open(link,'IMDb')
            }
        });
    }
    if (data.attr['rageid']) {
        var link = 'http://www.tvrage.com/shows/id-' + data.attr['rageid'];
        $.extend(modalButtons,{
            'TVRage' : function() {
                window.open(link,'TVRage')
            }
        });
    }

    if (data.attr['backdropurl']) {
        var url = WEBDIR + 'search/thumb?url='+data.attr['backdropurl']+'&w=675&h=400&o=20';
        $('.modal-fanart').css({
            'background' : '#ffffff url('+url+') top center no-repeat',
            'background-size' : '100%'
        });
    }
    showModal(modalTitle, modalBody, modalButtons);
}

function sendToSab(item) {
    return $.ajax({
        url: WEBDIR + 'sabnzbd/AddNzbFromUrl',
        type: 'post',
        dataType: 'json',
        data: {nzb_url: item.link},
        success: function (result) {
            notify('', 'Sent ' + item.description+ ' to SabNZBd', 'info');
        }
    });
}

function sendToGet(item) {
    return $.ajax({
        url: WEBDIR + 'nzbget/AddNzbFromUrl',
        type: 'post',
        dataType: 'json',
        data: {nzb_url: item.link},
        success: function (result) {
            notify('', 'Sent ' + item.description+ ' to NzbGet', 'info');
        }
    });
}

function sendToclient(item, client) {
    return $.ajax({
        url: WEBDIR + client.client + '/AddNzbFromUrl',
        type: 'post',
        dataType: 'json',
        data: {nzb_url: item.link},
        success: function (result) {
            notify('', 'Sent ' + item.description+ ' to ' + client.client, 'info');
        }
    });
}


$(document).ready(function () {
    var clients = get_clients()
    $('#searchform').submit(function() {
        search($('#query').val(), $('#catid').val());
        return false;
    });
    if ($('#query').val()) $('#searchform').submit();

    getCategories();
});

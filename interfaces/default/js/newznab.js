function getCategories() {
    $.ajax({
        url: WEBDIR + 'newznab/getcategories',
        type: 'get',
        dataType: 'json',
        success: function (data) {
            if (data == null) return false;

            var select = $('#catid').html('');
            select.append($('<option>').html('Everything').attr('value', ''));
            $.each(data.category, function (c, cat) {
                var option = $('<option>').html(cat["@name"]);
                option.attr('value', cat["@id"])
                select.append(option)
                $.each(cat.subcat, function (s, sub) {
                    if (sub['@name'] == undefined) sub = cat.subcat
                    var name = cat["@name"] + ' > ' + sub["@name"]
                    var option = $('<option>').html('&nbsp;&nbsp;' + name);
                    option.attr('value', sub["@id"])
                    select.append(option)
                });
            });
        }
    });
}


function search(query, catid, indexer) {
    if (query == undefined) return;
    $('.spinner').show()
    $.ajax({
        url: WEBDIR + 'newznab/search?q=' + query + '&cat=' + catid + '&indexer=' + indexer,
        type: 'get',
        timeout: 60000,
        dataType: 'json',
        beforeSend: function () {
            $('#results_table_body').empty();
            $('.spinner').show();
        },
        success: function (d) {
            var stop = 0;
            $('.spinner').hide();
            if (d === null) return;
            //list of dicts
            $.each(d, function (i, data) {
                $.each(data, function (i, indexer) {
                    var indexername;
                    // if there are not indexer.item this acts as python continue
                    if (indexer.item == undefined) return true;
                    if (indexer.title && indexer.title.length) {
                        indexername = indexer.title.replace('api.', '')

                    } else if (indexer.link){
                        indexername = indexer.link.replace('https://', '')
                                                  .replace('http://', '')
                                                  .replace('/', '')
                                                  .replace('/api', '')
                                                  .replace('api.', '')
                    } else {
                        indexername = indexer.description;
                    }


                    $.each(indexer.item, function (i, item) {
                        var attributes = []
                        $.each(item['newznab:attr'], function (a, attr) {
                            var name = attr['name'];
                            var value = attr['value'];
                            attributes[name] = value.replace(/\|/g, ', ');

                        });
                        item.attr = attributes;

			// First, assign download client category based on each individual usenet indexer
                        var clean_category = item.category.split(' > ')[0].toLowerCase().trim()
			// Second, try to match with the newznab default to make it uniform across all indexers
			// Maincategories
			// 1 = console
			// 2 = movies
			// 3 = audio
			// 4 = pc
			// 5 = tv
			// 6 = xxx
			// 7 = other
			var main_category = item.attr['category'].split("0",1)
			if(main_category == 1) {
			    clean_category = "console"
			}
			else if(main_category == 2) {
			    clean_category = "movies"
			}
			else if(main_category == 3) {
			    clean_category = "audio"
			}
			else if(main_category == 4) {
			    clean_category = "pc"
			}
			else if(main_category == 5) {
			    clean_category = "tv"
			}
			else if(main_category == 6) {
			    clean_category = "xxx"
			}
			else if(main_category == 7) {
			    clean_category = "other"
			}
			// Subcategories
			// 7020 = ebook
			// 7030 = comics
			if(item.attr['category'] == 7020) {
			    clean_category = "ebook"
			}
			else if(item.attr['category'] == 7030) {
			    clean_category = "comics"
			}

                        var row = $('<tr>').attr('data-category', clean_category);
                        var itemlink = $('<a>').attr('href', '#').text(item.title).click(function () {
                            showDetails(item, clean_category);
                            return false;
                        });


                        row.append($('<td>').append(indexername));
                        row.append($('<td>').append(itemlink));
                        var cat = $('<a>').attr('href', '#').text(item.category).click(function () {
                            $('#catid option:contains("' + item.category + '")').attr('selected', 'selected');
                            $('#searchform').submit();
                            return false;
                        });

                        var usenetdate;
                        if (item.pubDate) {
                            usenetdate = item.pubDate;
                            var age = moment(usenetdate).format("YYYY-MM-DD");
                            var temp = moment().diff(age, 'days');
                            usenetdate = temp + ' d';
                        } else if (item.attr['usenetdate']) {
                            usenetdate = item.attr['usenetdate'];
                            var age = moment(usenetdate).format("YYYY-MM-DD");
                            var temp = moment().diff(age, 'days');
                            usenetdate = temp + ' d';
                        } else {
                            usenetdate = 'N/A';
                        }

                        row.append($('<td>').append(cat));
                        row.append($('<td>').addClass('right').html(usenetdate));
                        row.append($('<td>').addClass('right').html(bytesToSize(item.attr['size'], 2)));

                        // Make a group of nzbclient buttons
                        row.append($('<td>').append(anc(item, clean_category)));

                        $('#results_table_body').append(row);

                    });
                });
            });

            $('.spinner').hide();
            // update tablesorter, sort on age
            $('#results_table_body').parent().trigger('update')

            .trigger("sorton", [
                [
                    [3, 0]
                ]
            ]);

        }

    });


}

function get_clients() {
    $.getJSON(WEBDIR + "newznab/getclients", function (response) {
        clients = response
        return clients
    });
}

function anc(nzb, clean_category) {
    var b = $('<div>').addClass('btn-group clearfix');
    // Used to check if there are any active clients
    var n = 0;
    $.each(clients, function (i, client) {
        if (client.active === 1) {
            // If any active clients add 1 to n
            n += 1;
            var button = $('<button>').addClass("btn btn-mini rg-client").attr('title', 'Send to ' + client.client)
                .css({
                "cursor": "pointer",
                "height": "24px"
            }).click(function () {
                sendToclient(nzb, client, clean_category);
            }).append($('<i>').addClass('rg rg-lg rg-' + client.client.toLowerCase()));

            b.append(button);

        }
    });

    // Manual download button
    var browserdl = $('<button>').addClass("btn btn-mini rg-client").attr('title', 'Download NZB to browser')
        .css({
        "cursor": "pointer",
        "height": "24px"
    }).click(function () {
        downloadFile(nzb.link);
    }).append($('<i>').addClass('fa fa-download rg-lg rg-client'));

    b.append(browserdl);

    return b;
}

function showDetails(data, category) {
    // grab some stuff from tha api
    var modalTitle = data.title;
    if (data.attr['imdbtitle']) {
        modalTitle = data.attr['imdbtitle'];
        if (data.attr['imdbyear']) modalTitle += ' (' + data.attr['imdbyear'] + ')';
    } else if (data.attr['artist'] && data.attr['album']) {
        modalTitle = data.attr['artist'] + ' - ' + data.attr['album'];
    }

    var modalImage = '';
    if (data.attr["coverurl"]) {
        var url = WEBDIR + 'newznab/thumb?url=' + data.attr['coverurl'] + '&w=200&h=300&category=';
        var modalImage = $('<div>').addClass('thumbnail pull-left');
        modalImage.append($('<img>').attr('src', url));
    } else if (data.attr["tvdbid"]) {
        var url = WEBDIR + 'newznab/thumb?url=tvdbid' + data.attr['tvdbid'] +'&thetvdb='+ data.attr['tvdbid']+ '&w=200&h=300&category=' + data.category;
        var modalImage = $('<div>').addClass('thumbnail pull-left');
        modalImage.append($('<img>').attr('src', url));
    } else if (data.attr["rageid"]) {
        var url = WEBDIR + 'newznab/thumb?url=rageid' + data.attr['rageid']  +'&tvrage='+ data.attr['rageid'] + '&w=200&h=300&category=' + data.category;
        var modalImage = $('<div>').addClass('thumbnail pull-left');
        modalImage.append($('<img>').attr('src', url));
        // check for 0000000 because of 6box.me
    } else if (data.attr["imdb"] && data.attr["imdb"] != 0000000) {
        var url = WEBDIR + 'newznab/thumb?url=imdb' + data.attr['imdb'] + '&imdb='+ data.attr['imdb']+ '&w=200&h=300&category=' + data.category;
        var modalImage = $('<div>').addClass('thumbnail pull-left');
        modalImage.append($('<img>').attr('src', url));

    }

    var modalInfo = $('<div>').addClass('modal-movieinfo');

    if (data.attr['imdbtagline']) {
        modalInfo.append($('<p>').html(data.attr['imdbtagline']));
    }
    if (data.attr['genre']) {
        modalInfo.append($('<p>').html('<b>Genre:</b> ' + data.attr['genre']));
    }
    //
    if (data.attr['imdbdirector']) {
        modalInfo.append($('<p>').html('<b>Director:</b> ' + data.attr['imdbdirector']));
    }
    if (data.attr['imdbactors']) {
        modalInfo.append($('<p>').html('<b>Actors:</b> ' + data.attr['imdbactors']));
    }

    var posted;
    if (data.attr['usenetdate']) {
        posted = moment(data.attr['usenetdate']).fromNow()
    } else {
        posted = 'N/A'
    }
    modalInfo.append($('<p>').html('<b>Posted:</b> ' + posted));
    modalInfo.append($('<p>').html('<b>Poster:</b> ' + data.attr['poster']));
    modalInfo.append($('<p>').html('<b>Size:</b> ' + bytesToSize(data.attr['size'])));
    modalInfo.append($('<p>').html('<b>Grabs:</b> ' + data.attr['grabs']));
    if (data.attr['files']) {
        modalInfo.append($('<p>').html('<b>Files:</b> ' + data.attr['files']));
    }

    if (data.attr['password']) {
        var password = data.attr['password'];
        if (password == 0) {
            password = 'No';
        } else {
            password = 'Yes';
        }
        modalInfo.append($('<p>').html('<b>Password:</b> ' + password));
    }


    if (data.attr['imdbscore']) {
        var rating = $('<span>').raty({
            readOnly: true,
            path: null,
            score: (data.attr['imdbscore'] / 2),
        })
        modalInfo.append(rating);
    }
    if (data.attr['label']) {
        modalInfo.append($('<p>').html('<b>Label:</b> ' + data.attr['label']));
    }
    if (data.attr['tracks']) {
        modalInfo.append($('<p>').html('<b>Tracks:</b> ' + data.attr['tracks']));
    }

    var modalBody = $('<div>');
    modalBody.append(modalImage);
    modalBody.append(modalInfo);

    var modalButtons = {}
    $.each(clients, function (i, v) {
        if (v.active === 1 && v.client === "NZBGet") {
            $.extend(modalButtons, {
                'NZBget': function () {
                    sendToGet(data, category)
                    hideModal();
                }
            });

        }
        if (v.active === 1 && v.client === "SABnzbd") {
            $.extend(modalButtons, {
                'SABnzbd': function () {
                    sendToSab(data, category)
                    hideModal();
                }
            });

        }

    })

    // manual download to the browser
    $.extend(modalButtons, {
        'Download NZB': function () {
            downloadFile(data.link);
        }
    });

    if (data.attr['imdb']) {
        var link = 'http://www.imdb.com/title/tt' + data.attr['imdb'] + '/';
        $.extend(modalButtons, {
            'IMDb': function () {
                window.open(link, 'IMDb')
            }
        });
    }

    if (data.attr['backdropurl']) {
        var url = WEBDIR + 'newznab/thumb?url=' + data.attr['backdropurl'] + '&w=675&h=400&o=20';
        $('.modal-fanart').css({
            'background': '#ffffff url(' + url + ') top center no-repeat',
                'background-size': '100%'
        });
    }
    showModal(modalTitle, modalBody, modalButtons);
}

function sendToSab(item, category) {
    return $.ajax({
        url: WEBDIR + 'sabnzbd/AddNzbFromUrl',
        type: 'post',
        dataType: 'json',
        data: {
            nzb_url: item.link,
            nzb_name: item.title,
            nzb_category: category

        },
        success: function (result) {
            notify('', 'Sent ' + item.description + ' to SabNZBd', 'info');
        }
    });
}

function sendToGet(item, category) {
    return $.ajax({
        url: WEBDIR + 'nzbget/AddNzbFromUrl',
        type: 'post',
        dataType: 'json',
        data: {
            nzb_url: item.link,
            nzb_name: item.title,
            nzb_category: category
        },
        success: function (result) {
            notify('', 'Sent ' + item.description + ' to NzbGet', 'info');
        }
    });
}

function sendToclient(item, client, category) {
    return $.ajax({
        url: WEBDIR + client.client.toLowerCase() + '/AddNzbFromUrl',
        type: 'post',
        dataType: 'json',
        data: {
            nzb_url: item.link,
            nzb_name: item.title,
            nzb_category: category
        },
        success: function (result) {
            state = (result) ? 'success' : 'error';
            notify('', 'Sent ' + item.title + ' to ' + client.client, state);
        }
    });
}

function getindexer(id) {
    $.get(WEBDIR + 'newznab/getindexer', function (data) {
        if (data == null) return;
        var indexers = $('#formindexer').empty().append($('<option>').text('All').val('all'));
        $.each(data.indexers, function (i, item) {
            var indexer = $('<option>').text(item.name).val(item.name);
            if (item.name == 'all') indexer.attr('selected', 'selected');
            indexers.append(indexer);
        });
    }, 'json');
}

$(document).ready(function () {
    $(window).trigger('hashchange');
    var clients = get_clients()
    $('#searchform').submit(function () {
        search($('#query').val(), $('#catid').val(), $('#formindexer').val());
        return false;
    });
    // for navbar search, defaults to all
    if ($('#query').val()) $('#searchform').submit();

    getCategories();
    getindexer();


});

$(document).ready(function () {
    moment().format();
    var qlty = profile()
    var showid = $('h1.page-title').attr('data-showid');
    var idz = $('h1.page-title').attr('data-id');
    loadShowData(showid, idz);
});

function loadShowData(showid, idz) {
    $.ajax({
        url: WEBDIR + 'nzbdrone/Show/' + showid + '/' + idz,
        type: 'get',
        dataType: 'json',
        success: function (tvshow) {
            if (!tvshow) {
                notify('Error', 'Show not found.', 'error');
                return;
            }
              // If the show is the one clicked on
                if (tvshow.tvdbId == showid) {
                  $('h1.page-title').attr('data-tvdbid')
                  // If there is a airdate format it, else leave it blank
                    if (tvshow.nextAiring) {
                        nextair = moment(tvshow.nextAiring).calendar();
                    } else {
                        nextair = 'NA';
                    }
                    if (tvshow.images.length > 0) {
                      $.each(tvshow.images, function(i, cover) {
                        if (cover.coverType === "banner") {
                          console.log(cover.url);
                          // Fetch the banner
                          $('#banner').css('background-image', 'url(' + WEBDIR + 'nzbdrone/GetBanner/?url=' + cover.url + ')');
                        }
                      })
                    }
                 
                    $('.nzbdrone_showname').text(tvshow.title);
                    $('.nzbdrone_status').append(nzbdroneStatusLabel(tvshow.status));
                    $('.nzbdrone_network').text(tvshow.network);
                    $('.nzbdrone_location').text(tvshow.path);
                    $('.nzbdrone_airs').text(tvshow.airTime);
                    $('.nzbdrone_next_air').text(nextair);
                

                    var menu = $('.show-options-menu');
                    $('.rescan-files')
                    .attr('data-method', 'RefreshSeries')
                    .attr('data-param', 'seriesId')
                    .attr('data-id', tvshow.id)
                    .attr('data-name', tvshow.title)
                    .text('Refresh Series');
                    
                    
                    $('.full-update')
                    .attr('data-desc', 'Rescan Serie')
                    .attr('data-method', 'RescanSeries')
                    .attr('data-param', 'seriesId')
                    .attr('data-id', tvshow.id)
                    .attr('data-name', tvshow.title)
                    
                    $('.search_all_ep_in_show')
                    .attr('data-desc', 'Search for all episodes')
                    .attr('data-method', 'SeriesSearch')
                    .attr('data-param', 'seriesId')
                    .attr('data-id', tvshow.id)
                    .attr('data-name', tvshow.title)

                    $('.edit_show').click(function (evt) {
                        evt.preventDefault();
                        loadShow2(tvshow);
                    });

                    $('.delete_show').click(function (e){
                      e.preventDefault();
                      delete_show(tvshow);
                    });

                    renderSeasonTabs(showid, tvshow.id, tvshow)

                }
         
    },
    error: function () {
        notify('Error', 'Error while loading show.', 'error');
    }
    });
}

// showid= tvdbid, id=nzbdroneid
function renderSeasonTabs(showid, id, tvshow) {
    console.log('tvshow');
    console.log(tvshow);
    list = $('#season-list');
    list.html('');

    $.each(tvshow.seasons, function (index, seasonNr) {
        var label = seasonNr.seasonNumber;

        // Specials are marked as season 0
        if (label === 0) {
            label = 'Specials';
        }
        var pill = $('<li>').append(
        $('<a>')
            .text(label)
            .attr('href', '#' + seasonNr.seasonNumber)
            .attr('data-season', seasonNr.seasonNumber)
            .attr('data-tvdbid', id)
            .attr('data-showid', showid));

        list.append(pill);
    });

    list.find('a').on('click', function () {
        var sn = $(this).attr('data-season'); // test
        var sid = $(this).attr('data-id');
        rendseason(sid, id, sn);
    });

    // Trigger latest season
    list.find('li:first-child a').trigger('click');
}

function showEpisodeInfo(episodeid, value) {
  var ep = value
	$.getJSON(WEBDIR + "nzbdrone/Episodeqly/" + episodeid + "/", function(pResult) {
    console.log('dipshit')
    console.log(episodeid);
    console.log(pResult);
    console.log(ep);
		var strHTML = $("<table>").attr("class", "episodeinfo")
			.append($("<tr>")
				.append($("<td>").html("<b>Name</b>"))
				.append($("<td>").text(ep.title)))
			.append($("<tr>")
				.append($("<td>").html("<b>Description</b>"))
				.append($("<td>").text(ep.overview)));
				
				if (ep.hasFile) {
					strHTML.append($("<tr>")
						.append($("<td>").html("<b>Air date</b>"))
						.append($("<td>").text(ep.airDateUtc)))
					.append($("<tr>")
						.append($("<td>").html("<b>Quality</b>"))
						.append($("<td>").text(pResult.quality.quality.name)))						
					.append($("<tr>")
						.append($("<td>").html("<b>File size</b>"))
						.append($("<td>").text(bytesToSize(pResult.size, 2))))
					.append($("<tr>")
						.append($("<td>").html("<b>Location</b>"))
						.append($("<td>").text(pResult.path)));
				}
	
		showModal(pResult.title, strHTML, []);
	});
}

var qltyfiles;

function find_d_q(id) {
    $.getJSON(WEBDIR + 'nzbdrone/Episodesqly/' + id, function (result) {
        qltyfiles = result;
    });

}

function rendseason(sID, id, seasonnumber) {
    //var qqq = find_d_q(id); //TODO
    $.getJSON(WEBDIR + 'nzbdrone/Episodes/' + id, function (result) {
        $('#season-list li').removeClass('active');
        $(this).parent().addClass("active");
        var seasonContent = $('#season-content');
        // Clear table contents before inserting new row
        seasonContent.html('');
        
        // Loop through data
        $.each(result, function (index, value) {
          console.log('dick')
          console.log(value)
            if (value.seasonNumber == seasonnumber) {
                if (value.hasFile) {
                    hasfile = 'Downloaded';
                } else {
                    hasfile = '';
                }

                var row = $('<tr>');
                var search_link = $('<a>').addClass('btn btn-mini dostuff')
                .attr('data-method', 'episodeSearch')
                .attr('data-param', 'episodeIds')
                .attr('title', 'Search new download').attr('data-id', value.id)
                .attr('data-name', value.title)
                .append($('<i>').addClass('icon-search'));

                // Not in use atm // TODO the the api is updated
                /*
                  $.each(qqq, function (i, q) {
                    console.log(q);
                    if (value.seasonNumber == q.seasonNumber) {
                      $('.quality').text(q.quality.quality.name);
                    } else {
                      $('.quality').text('NA');
                    }
                  }); // getfile quality
                 */ 
                
                row.append(
                $('<td>').text(value.episodeNumber),
                $('<td>').append($("<a>").text(value.title).click(function (pEvent) {
                    pEvent.preventDefault();
                    showEpisodeInfo(value.episodeFileId, value);
                })),
                $('<td>').text(value.airDate),
                $('<td>').html(nzbdroneStatusLabel(hasfile)),
                //$('<td>').addClass('quality').text(''), // TODO when/if they change api
                $('<td>').append(search_link));
                seasonContent.append(row);
            }

        }); // end loop

        // Trigger tableSort update
        seasonContent.parent().trigger("update");
        seasonContent.parent().trigger("sorton", [
            [
                [0, 1]
            ]
        ]);
    });
}

function nzbdroneStatusIcon(iconText, white){
  var text =[
    'downloaded',
    'continuing',
    'snatched',
    'unaired',
    'archived',
    'skipped'
  ];
  var icons = [
    'icon-download-alt',
    'icon-repeat',
    'icon-share-alt',
    'icon-time',
    'icon-lock',
    'icon-fast-forward'
  ];

  if (text.indexOf(iconText) != -1) {
    var icon = $('<i>').addClass(icons[text.indexOf(iconText)]);
    if (white == true) {
      icon.addClass('icon-white');
    }
    return icon;
  }
  return '';
}

function nzbdroneStatusLabel(text){
  var statusOK = ['continuing', 'downloaded', 'Downloaded', 'HD', 'HD-720p', 'HD-1080p', 'WEBDL-1080p'];
  var statusInfo = ['snatched', 'SD'];
  var statusError = ['ended'];
  var statusWarning = ['skipped'];
  var label = $('<span>').addClass('label').text(text);

  if (statusOK.indexOf(text) != -1) {
    label.addClass('label-success');
  }
  else if (statusInfo.indexOf(text) != -1) {
    label.addClass('label-info');
  }
  else if (statusError.indexOf(text) != -1) {
    label.addClass('label-important');
  }
  else if (statusWarning.indexOf(text) != -1) {
    label.addClass('label-warning');
  }

  var icon = nzbdroneStatusIcon(text, true);
  if (icon != '') {
    label.prepend(' ').prepend(icon);
  }
  return label;
}

// Grabs the quality profile
function profile(qualityProfileId) {
    $.get(WEBDIR + 'nzbdrone/Profile', function(result) {
      qlty = result
    });

}

// Not in use atm
function getbanner(bannerurl) {
  data = {
    url: bannerurl
  }
  $.get(WEBDIR + 'nzbdrone/GetBanner', data, function(result){
    $('#banner').css('background-image', 'url(' + result + ')');
  })
}

function SeriesSearch(seriesid) {
  $.getJSON(WEBDIR + 'nzbdrone/?name=SeriesSearch&seriesId='+ seriesid)
}

$(document).on('click', '.dostuff', function () {
    var method = $(this).attr('data-method');
    var name = $(this).attr('data-name')
    params = {
        method: $(this).attr('data-method'),
        par: $(this).attr('data-param'),
        id: $(this).attr('data-id'),
        name: $(this).attr('data-name')
    };
    $.getJSON(WEBDIR + "nzbdrone/Command", params, function (result) {
        if (result.state) {
          notify(method, name, 'success')
        } else {
          notify(method, name, 'error')
        }

    });
});


function loadShow(tvshow) {
    console.log('modalinfo');
    console.log(tvshow);
    var bannerurl;

    var table = $('<table>');
    table.addClass('table table-bordered table-striped table-condensed');

    row = $('<tr>');
    row.append('<th>Status</th><td>' + tvshow.status + '</td>');
    table.append(row);

    if (tvshow.nextAiring) {
        nextair = moment(tvshow.nextAiring).calendar();
    } else {
        nextair = 'N/A';
    }

    row = $('<tr>');
    row.append('<th>Airs</th><td>' + nextair + '</td>');
    table.append(row);

    row = $('<tr>');
    row.append('<th>Monitored</th><td>' + tvshow.monitored + '</td>');
    table.append(row);

    row = $('<tr>');
    row.append('<th>Location</th><td>' + tvshow.path + '</td>');
    table.append(row);

    $.each(qlty, function (i, q) {
        if (tvshow.qualityProfileId == q.id) {
            qname = q.name;
            row = $('<tr>');
            row.append('<th>Quality</th><td>' + q.name + '</td>');
            table.append(row);
        }
    });

    row = $('<tr>');
    row.append('<th>Network</th><td>' + tvshow.network + '</td>');
    table.append(row);

    if (tvshow.images.length > 0) {
        $.each(tvshow.images, function (i, cover) {
            if (cover.coverType === "banner") {
                bannerurl = cover.url;
            }
        });
    }

    modalContent = $('<div>');
    modalContent.append(
    $('<img>').attr('src', WEBDIR + 'nzbdrone/GetBanner/?url=' + bannerurl).addClass('img-rounded'),
    $('<hr>'),
    table);

    var modalButtons = {
        'Show': function () {
            window.location = WEBDIR + 'nzbdrone/View/' + tvdbid;
        }
    };

    showModal(tvshow.title, modalContent, modalButtons);

}

function delete_show(v) {
    data = {"id": v.id,
            "title": v.title
          };
    if (confirm('Are you sure you want to delete ' + v.title + ' ?')) {
        $.getJSON(WEBDIR + 'nzbdrone/Delete_Show/', data, function (response) {
          if (response == '{}') {
            status = 'success';

          } else {
            status = 'error';
          }
            notify('Deleted', v.title + 'from nzbdrone', status);
        });
    }
}
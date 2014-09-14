$(document).ready(function () {
    moment().format();
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
                    //console.log(tvshow.images.coverType);
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
                    $('.rescan-files')//.addClass('dostuff')
                    //$('.rescan-files dostuff', menu)
                    .attr('data-method', 'RefreshSeries')
                    .attr('data-param', 'seriesId')
                    .attr('data-id', tvshow.id)
                    .attr('data-name', tvshow.title)
                    .text('Refresh Series');
                    //.click(function (evt) {
                        //evt.preventDefault();
                        //rescanFiles(tvshow.id, tvshow.title);
                    //});
                    
                    $('.full-update')
                    //$('.full-update', menu)
                    .attr('data-desc', 'Rescan Serie')
                    .attr('data-method', 'RescanSeries')
                    .attr('data-param', 'seriesId')
                    .attr('data-id', tvshow.id)
                    //.attr('title', 'Search new download').attr('data-id', value.id)
                    .attr('data-name', tvshow.title)
                    //.click(function (evt) {
                    //    evt.preventDefault();
                    //    forceFullUpdate(tvshow.id, tvshow.title);
                    //});

                    //renderSeasonTabs(showid, tvshow.id, tvshow.seasons) // org
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
    //list.find('a').on('click', rendseason(sid ,sn));

    // Trigger latest season
    list.find('li:first-child a').trigger('click');
}

function showEpisodeInfo(episodeid, value) {
  var ep = value
	$.getJSON(WEBDIR + "nzbdrone/Episodeqly/" + episodeid + "/", function(pResult) {
    console.log('dipshit')
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
						.append($("<td>").text(pResult.airDateUtc)))
					.append($("<tr>")
						.append($("<td>").html("<b>Quality</b>"))
						.append($("<td>").text(pResult.quality.quality.name)))						
					.append($("<tr>")
						.append($("<td>").html("<b>File size</b>"))
						.append($("<td>").text(pResult.size)))
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

    var qqq = find_d_q(id);
    console.log(qqq);
    // Used to get quality of ep in a season to global var to reduce calls // Not in use atm
    $.getJSON(WEBDIR + 'nzbdrone/Episodes/' + id, function (result) {
      console.log(result);
        //if (result.seasonNumber == seasonnumber) {
        $('#season-list li').removeClass('active');
        $(this).parent().addClass("active");

        var seasonContent = $('#season-content');
        // Clear table contents before inserting new row
        seasonContent.html('');
        

        // Loop through data
        $.each(result, function (index, value) {
            // check if the seasonnumber are correct so it validates the correct season
            console.log('value')
            console.log(value);
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
                .append($('<i>').addClass('icon-search')).on('click', function () {
                    //searchEpisode(value.id);
                });
                console.log('something');
                console.log(value);
                // Not in use atm // TODO 
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
                    showEpisodeInfo(value.id, value);
                })),
                $('<td>').text(value.airDate),
                $('<td>').html(nzbdroneStatusLabel(hasfile)), // is the file is downloaded or not
                $('<td>').addClass('quality').text(''), //needs to use episodefile=SeriesId=1337 ? // not in use atm
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

function forceFullUpdate(tvdbid, name) {
  var modalcontent = $('<div>');
  modalcontent.append($('<p>').html('Queueing &quot;' + name +' &quot; for full TVDB information update..'));
  modalcontent.append($('<div>').html('<div class="progress progress-striped active"><div class="bar" style="width: 100%;"></div></div>'));
  showModal('Queueing...', modalcontent, {});

  $.ajax({
    url: WEBDIR + 'sickbeard/ForceFullUpdate?tvdbid=' + tvdbid,
    type: 'get',
    dataType: 'json',
    timeout: 15000,
    success: function (data) {
      // If result is not 'succes' it must be a failure
      if (data.result != 'success') {
        notify('Error', data.message, 'error');
        return;
      } else {
        notify('OK', data.message, 'success');
        return;
      }
    },
    error: function (data) {
      notify('Error', 'Unable to queue tv show for full update.', 'error', 1);
    },
    complete: function (data) {
      hideModal();
    }
  });
}

function rescanFiles(tvdbid, name) {
  var modalcontent = $('<div>');
  modalcontent.append($('<p>').html('Queueing &quot;' + name +' &quot; for files rescan..'));
  modalcontent.append($('<div>').html('<div class="progress progress-striped active"><div class="bar" style="width: 100%;"></div></div>'));
  showModal('Queueing...', modalcontent, {});

  $.ajax({
    url: WEBDIR + 'sickbeard/RescanFiles?tvdbid=' + tvdbid,
    type: 'get',
    dataType: 'json',
    timeout: 15000,
    success: function (data) {
      // If result is not 'succes' it must be a failure
      if (data.result != 'success') {
        notify('Error', data.message, 'error');
        return;
      } else {
        notify('OK', data.message, 'success');
        return;
      }
    },
    error: function (data) {
      notify('Error', 'Unable to queue tv show for files rescan.', 'error', 1);
    },
    complete: function (data) {
      hideModal();
    }
  });
}

function searchEpisode(episodeid) {
  var season = ''
  var episode= ''
  var modalcontent = $('<div>');
  modalcontent.append($('<p>').html('Looking for episode &quot;'+ name +'&quot;.'));
  modalcontent.append($('<div>').html('<div class="progress progress-striped active"><div class="bar" style="width: 100%;"></div></div>'));
  showModal('Searching episode '+season + 'x'+episode, modalcontent, {});

  $.ajax({
    url: WEBDIR + 'nzbdrone/Command?name=' + 'episodeSearch' +'&' +'episodeIds='+ episodeid,
    type: 'get',
    dataType: 'json',
    timeout: 40000,
    success: function (data) {
      console.log(data)
      // If result is not 'succes' it must be a failure
      if (data.result != 'success') {
        notify('Error', data.message, 'error');
        return;
      } else {
        notify('OK', name+ ' ' + season + 'x'+episode+' found. ' + data.message, 'success');
        return;
      }
    },
    error: function (data) {
      notify('Error', 'Episode not found.', 'error', 1);
    },
    complete: function (data) {
      hideModal();
      // Trigger latest season
      $('#season-list li.active a').trigger('click');
    }
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
  //console.log(text);

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

function getbanner(bannerurl) {
  data = {
    url: bannerurl
  }
  $.get(WEBDIR + 'nzbdrone/GetBanner', data, function(result){
    console.log('getbanner');
    $('#banner').css('background-image', 'url(' + result + ')');

  })
}

/*
$(document).on('click', '#season-list a', function () {
    id = $(this).attr('data-id');
    seasonid = $(this).attr('data-season')
    //rendseason(id, seasonid);
    //alert('click');
});
*/

function SeriesSearch(seriesid) {
  $.getJSON(WEBDIR + 'nzbdrone/?name=SeriesSearch&seriesId='+ seriesid)
}

$(document).on('click', '.dostuff', function () {
    var method = $(this).attr('data-method');
    params = {
        method: $(this).attr('data-method'),
        par: $(this).attr('data-param'),
        id: $(this).attr('data-id'),
        name: $(this).attr('data-name')
    };
    $.getJSON(WEBDIR + "nzbdrone/Command", params, function (result) {

    });
});
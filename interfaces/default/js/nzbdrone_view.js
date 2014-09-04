$(document).ready(function () {
    moment().format();
    var showid = $('h1.page-title').attr('data-showid');
    //alert('showid');
    //alert(showid);
    loadShowData(showid);
    //$('#banner').css('background-image', 'url(' + WEBDIR + 'sickbeard/GetBanner/' + showid + ')');
});

function loadShowData(showid) {
    $.ajax({
        url: WEBDIR + 'nzbdrone/Series',
        type: 'get',
        dataType: 'json',
        success: function (result) {
            if (!result) {
                notify('Error', 'Show not found.', 'error');
                return;
            }
            // Nzbdrone dont have a query from one show and what settings it has.
            $.each(result, function (showname, tvshow) {
              // If the show is the one clicked on
                if (tvshow.tvdbId == showid) {
                  $('h1.page-title').attr('data-tvdbid')
                  // If there is a airdate format it, else leave it blank
                    if (tvshow.nextAiring) {
                        //alert(tvshow.nextAiring);
                        nextair = moment(tvshow.nextAiring).calendar();
                    } else {
                        nextair = '';
                    }
                    // checks this tvshow has a banner and call cache image function
                    if (tvshow.images.coverTyes === 'banner') {
                      // placeholder
                    }
                    $('.nzbdrone_showname').text(tvshow.title);
                    $('.nzbdrone_status').append(nzbdroneStatusLabel(tvshow.status));
                    $('.nzbdrone_network').text(tvshow.network);
                    $('.nzbdrone_location').text(tvshow.path);
                    $('.nzbdrone_airs').text(tvshow.airTime);
                    $('.nzbdrone_next_air').text(nextair);
                

                    var menu = $('.show-options-menu');
                    $('.rescan-files', menu).click(function (evt) {
                        evt.preventDefault();
                        //rescanFiles(showid, data.show_name);
                    });

                    $('.full-update', menu).click(function (evt) {
                        evt.preventDefault();
                        //forceFullUpdate(showid, data.show_name);
                    });

                    //renderSeasonTabs(showid, tvshow.id, tvshow.seasons) // org
                    renderSeasonTabs(showid, tvshow.id, tvshow)

                }
            });
         
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

function showEpisodeInfo(nShowID, nSeason, nEpisode) {
	$.getJSON(WEBDIR + "sickbeard/GetEpisode/" + nShowID + "/" + nSeason + "/" + nEpisode, function(pResult) {
		var strHTML = $("<table>").attr("class", "episodeinfo")
			.append($("<tr>")
				.append($("<td>").html("<b>Name</b>"))
				.append($("<td>").text(pResult.data.name)))
			.append($("<tr>")
				.append($("<td>").html("<b>Description</b>"))
				.append($("<td>").text(pResult.data.description)));
				
				if (pResult.data.status == "Downloaded") {
					strHTML.append($("<tr>")
						.append($("<td>").html("<b>Air date</b>"))
						.append($("<td>").text(pResult.data.airdate)))
					.append($("<tr>")
						.append($("<td>").html("<b>Quality</b>"))
						.append($("<td>").text(pResult.data.quality)))						
					.append($("<tr>")
						.append($("<td>").html("<b>File size</b>"))
						.append($("<td>").text(pResult.data.file_size_human)))
					.append($("<tr>")
						.append($("<td>").html("<b>Location</b>"))
						.append($("<td>").text(pResult.data.location)));
				}
	
		showModal(pResult.data.name, strHTML, []);
	});
}

var qltyfiles;

function find_d_q(id) {
    $.getJSON(WEBDIR + 'nzbdrone/Episodesqly/' + id, function (result) {
        qltyfiles = result;
    });

}

function rendseason(sID, id, seasonnumber) {
    // Used to get quality of ep in a season to global var to reduce calls // Not in use atm
    //find_d_q(id)
    $.getJSON(WEBDIR + 'nzbdrone/Episodes/' + id, function (result) {
        //if (result.seasonNumber == seasonnumber) {
        $('#season-list li').removeClass('active');
        $(this).parent().addClass("active");

        var seasonContent = $('#season-content');
        // Clear table contents before inserting new row
        seasonContent.html('');

        // Loop through data
        $.each(result, function (index, value) {
            // check if the seasonnumber are correct so it validates the correct season
            if (value.seasonNumber == seasonnumber) {
                console.log(value);
                if (value.hasFile) {
                    hasfile = 'Downloaded';
                } else {
                    hasfile = '';
                }
                console.log(hasfile);

                var row = $('<tr>');

                var search_link = $('<a>').addClass('btn btn-mini').attr('title', 'Search new download').append($('<i>').addClass('icon-search')).on('click', function () {
                    //searchEpisode(showid, season, index, value.name);
                });
                // Not in use atm // TODO
                /*
                $.each(qltyfiles, function (i, q) {
                    //console.log('q')
                  //console.log(q)

                  if (value.seasonNumber == q.seasonNumber) {
                    console.log('sumthing')
                    console.log(value.seasonNumber, q.seasonNumber)
                    //alert('sumthing');
                    $('.quality').text(q.quality.quality.name);

                  } else {
                    $('.quality').text('NA');
                  }

                }) // end quality loop
                */
                row.append(
                $('<td>').text(value.episodeNumber),
                $('<td>').append($("<a>").text(value.title).click(function (pEvent) {
                    pEvent.preventDefault();
                    //showEpisodeInfo(showid, season, index);
                })),
                $('<td>').text(value.airDate),
                $('<td>').html(nzbdroneStatusLabel(hasfile)), // is the file is downloaded or not
                //$('<td>').addClass('quality').text(''), //needs to use episodefile=SeriesId=1337 ? // not in use atm
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

function searchEpisode(tvdbid, season, episode, name) {
  var modalcontent = $('<div>');
  modalcontent.append($('<p>').html('Looking for episode &quot;'+ name +'&quot;.'));
  modalcontent.append($('<div>').html('<div class="progress progress-striped active"><div class="bar" style="width: 100%;"></div></div>'));
  showModal('Searching episode '+season + 'x'+episode, modalcontent, {});

  $.ajax({
    url: WEBDIR + 'sickbeard/SearchEpisodeDownload?tvdbid=' + tvdbid +'&season=' + season +'&episode='+episode,
    type: 'get',
    dataType: 'json',
    timeout: 40000,
    success: function (data) {
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
  //console.log('label')
  //console.log(label)
  return label;
}

// Grabs the quality profile
function profile(qualityProfileId) {
    $.get(WEBDIR + 'nzbdrone/Profile', function(result) {
      qlty = result
    });

}

/*
$(document).on('click', '#season-list a', function () {
    id = $(this).attr('data-id');
    seasonid = $(this).attr('data-season')
    //rendseason(id, seasonid);
    //alert('click');
});
*/
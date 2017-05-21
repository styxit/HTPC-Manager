$(document).ready(function() {
  moment().format();
  $(window).trigger('hashchange');
  var qlty = [];
   $.when(profile()).done(function(qltyresult) {
       var folders = rootfolder();
       qlty = qltyresult;
       loadShows();
       history();
       cal();
       $('a[data-toggle="tab"]').click(function (e) {
       }).on('shown', cal)

       var addShowAction = function () {
           var query = $('#add_show_name').val();
           if (query) {
               $('#add_show_button').attr('disabled', true);
               searchTvDb(query);
           }
       };
       $('#add_show_name').keyup(function (event) {
           if (event.keyCode == 13) {
               addShowAction();
           }
       });
       $('#add_show_button').click(addShowAction);

       $('#add_tvdbid_button').click(function () {
           addShow($('#add_show_select').val(),
               $('#add_show_quality').val(),
               $('#add_show_monitor').val(),
               $('#add_show_type').val(),
               $('#add_show_folder').val(),
               $('#add_show_seasonfolder').val(),
               $('#add_show_specials').val()
           );
       });

       $('#cancel_show_button').click(function () {
           cancelAddShow();
       });

       $('#scanfolder').click(function (e) {
           e.preventDefault();
           Scanfolder()
       });
   });
});

function loadShows() {
  $('.spinner').show();
  $.ajax({
    url: WEBDIR + 'sonarr/Series',
    type: 'get',
    dataType: 'json',
    success: function(result) {
      $('#tvshows_table_body').empty();
      if (result.length === 0) {
        var row = $('<tr>');
        row.append($('<td>').attr('colspan', '5').html('No shows found'));
        $('#tvshows_table_body').append(row);
      }
      $.each(result, function(showname, tvshow) { // tvshow.tvdbId
        var name = $('<a>').attr('href', WEBDIR + 'sonarr/View/' + tvshow.id + '/' + tvshow.tvdbId).text(tvshow.title);
        var row = $('<tr>');
        // Check the global var as sonarr dont have quality name only a id.
        $.each(qlty, function(i, q) {
          if (tvshow.qualityProfileId == q.id) {
            qname = q.name;
          }
        });
        if (tvshow.nextAiring) {
          nextair = moment(tvshow.nextAiring).calendar();
        } else {
          nextair = '';
        }

        if (typeof(tvshow.episodeFileCount) == "undefined") {
          tvshow.episodeFileCount = 0
        }


        if (typeof(tvshow.episodeCount) == "undefined") {
          tvshow.episodeCount = 0
        }

        // Start progressbar
        var calc = (tvshow.episodeFileCount * 100 / tvshow.episodeCount)
        if (calc == 0) {
          calc = 100
        }
        var progress = $('<div>').addClass("progress")
        var progressbar = $('<div>').addClass("bar bar-success").css("width", calc + '%')
        if (tvshow.episodeCount > tvshow.episodeFileCount) {
          progressbar.removeClass("bar-success").addClass("bar-warning")
        }
        // For if no eps are aired
        if (tvshow.episodeCount === 0) {
          progressbar.removeClass("bar-success").addClass("bar-danger").css("width", 100 + '%')
        }
        var progresstext = $('<span>').text(tvshow.episodeFileCount + '/' + tvshow.episodeCount)
        progress.append(progressbar, progresstext);
        // end progressbar

        row.append(
          $('<td>').html(name),
          $('<td>').html(sonarrStatusLabel(tvshow.status)),
          $('<td>').html(nextair),
          $('<td>').html(progress),

          $('<td>').html(tvshow.network),
          $('<td>').html(sonarrStatusLabel(qname)));
        $('#tvshows_table_body').append(row);
      });
      $('#tvshows_table_body').parent().trigger('update');
      $('#tvshows_table_body').parent().trigger("sorton", [
        [
          [0, 0]
        ]
      ]);
      $('.spinner').hide();
    }
  });
}

function sonarrStatusIcon(iconText, white) {
  var text = [
    'Downloaded',
    'Missing',
    'continuing',
    'Snatched',
    'Unaired',
    'Archived',
    'Skipped',
    'ended'
  ];
  var icons = [
    'fa fa-download &nbsp',
    'fa fa-exclamation-triangle &nbsp',
    'fa fa-play &nbsp',
    'fa fa-cloud-download &nbsp',
    'fa fa-clock-o &nbsp',
    'fa fa-archive &nbsp',
    'fa fa-fast-forward &nbsp',
    'fa fa-stop &nbsp'
  ];

  if (text.indexOf(iconText) != -1) {
    var icon = $('<i>').addClass(icons[text.indexOf(iconText)]);
    if (white === true) {
      icon.addClass('fa-inverse');
    }
    return icon;
  }
  return '';
}

function sonarrStatusLabel(text) {
  var statusOK = ['continuing', 'Downloaded', 'Any'];
  var statusInfo = ['Snatched', 'HD', 'HD - All', 'HD-720p', 'HD-1080p', 'HDTV-720p', 'HDTV-1080p', 'WEBDL-720p', 'WEBDL-1080p', ];
  var statusError = ['ended'];
  var statusWarning = ['Skipped', 'SD', 'SD - All', 'SDTV', 'DVD'];
  var statusNormal = ['Bluray', 'Bluray-720p', 'Bluray-1080p']

  var label = $('<span>').addClass('label').text(text);

  if (statusOK.indexOf(text) != -1) {
    label.addClass('label-success');
  } else if (statusInfo.indexOf(text) != -1) {
    label.addClass('label-info');
  } else if (statusError.indexOf(text) != -1) {
    label.addClass('label-important');
  } else if (statusWarning.indexOf(text) != -1) {
    label.addClass('label-warning');
  } else if (statusNormal.indexOf(text) != -1) {
    label;
  }

  var icon = sonarrStatusIcon(text, true);
  if (icon !== '') {
    label.prepend(' ').prepend(icon);
  }
  return label;
}

function profile(qualityProfileId) {
    var done = jQuery.Deferred();
    $.get(WEBDIR + 'sonarr/Profile', function (result) {
        qlty = result;
        done.resolve(qlty);
    });
    return done;
}

function rootfolder() {
  $.get(WEBDIR + 'sonarr/Rootfolder', function(result) {
    folders = result;
    return folders
  });
}

function history() {
  $.getJSON(WEBDIR + 'sonarr/History', function(result) {
    $.each(result.records, function(i, log) {
      var row = $('<tr>');
      row.append(
        $('<td>').text(moment(log.date).calendar()),
        $('<td>').text(log.eventType),
        $('<td>').text(log.sourceTitle),
        //$('<td>').text(log.series.title), // Clean title
        $('<td>').text(log.episode.title),
        $('<td>').html(sonarrStatusLabel(log.series.status)),
        $('<td>').html(sonarrStatusLabel(log.quality.quality.name)));

      $('#history_table_body').append(row);
    });

    $('#history_table_body').parent().trigger("update");
  });
}

function calendar() {
  $.getJSON(WEBDIR + 'sonarr/Calendar', function(result) {
    $.each(result, function(i, cal) {
      var row = $('<tr>');
      var name = $('<a>').attr('href', '#').html(cal.series.title).click(function(e) {
        e.preventDefault();
        loadShow(cal.seriesId);
      });
      var img = makeIcon('fa fa-info-circle', cal.overview);
      row.append(
        $('<td>').append(name),
        $('<td>').text('S' + pad(cal.seasonNumber, 2) + 'E' + pad(cal.episodeNumber, 2)),
        $('<td>').html(cal.title + '&nbsp').append(img),
        $('<td>').text(moment(cal.airDateUtc).calendar()));
      $('#calendar_table_body').append(row);
    });

    $('#calendar_table_body').parent().trigger("update");
  });
}

function searchTvDb(query) {
  $.ajax({
    url: WEBDIR + 'sonarr/Lookup/' + encodeURIComponent(query),
    type: 'get',
    error: function() {
      $('#add_show_button').attr('disabled', false);
    },
    success: function(result) {
      if (result.length === 0) {
        $('#add_show_button').attr('disabled', false);
        $('#add_show_quality').attr('disabled', false);
        $('#add_show_folder').attr('disabled', false);
        return;
      }
      $('#add_show_select').html('');
      $('#add_show_quality').html('');
      $('#add_show_folder').html('');
      $.each(result, function(i, item) {
        var tvdbid = item.tvdbId;
        var showname = item.title;
        var year = item.year;
        var option = $('<option>');
        option.attr('data-info', $.makeArray(item));
        option.attr('value', tvdbid);
        option.html(showname + ' (' + year + ')');
        $('#add_show_select').append(option);
      });
      $.each(qlty, function(i, quality) {
        var option2 = $('<option>');
        option2.attr('value', quality.id);
        option2.html(quality.name);
        $('#add_show_quality').append(option2);
      });
      $.each(folders, function(i, folder) {
        var option2 = $('<option>');
        option2.attr('value', folder);
        option2.html(folder);
        $('#add_show_folder').append(option2);
      });
      $('#add_show_name').hide();
      $('#cancel_show_button').show();
      $('#add_show_select').fadeIn();
      $('#add_show_button').attr('disabled', false).hide();
      $('#add_tvdbid_button').show();
      $('#add_show_monitor').fadeIn().show();
      $('#add_show_type').fadeIn().show();
      $('#add_show_quality').fadeIn().show();
      $('#add_show_folder').fadeIn().show();
      $('.sonarr_checkboxs').show();
    }
  });
}

function addShow(tvdbid, quality, monitor, seriestype, rootfolder, seasonfolder, specials) {
  var data = {
    rootfolder: rootfolder,
    seasonfolder: seasonfolder,
    monitor: monitor,
    seriestype: seriestype,
    specials: specials
  };

  $.ajax({
    url: WEBDIR + 'sonarr/AddShow/' + tvdbid + '/' + quality,
    data: data,
    type: 'get',
    dataType: 'json',
    success: function(data) {
      if (data.title) {
        notify('Add TV show ' + data.title + '', '', 'success');
        loadShows();
      } else {
        notify('Failed to add show ', data[0].errorMessage, 'error');
        cancelAddShow();
      }
    }
  });
}

function cancelAddShow() {
  $('#add_show_name').val('');
  $('#add_show_quality').val('');
  $('#add_show_folder').val('');
  $('#add_show_select').hide();
  $('#cancel_show_button').hide();
  $('#add_show_name').fadeIn();
  $('#add_tvdbid_button').hide();
  $('#add_show_button').show();
  $('#add_show_quality').hide();
  $('#add_show_monitor').hide();
  $('#add_show_type').hide();
  $('#add_show_folder').hide();
  $('.sonarr_checkboxs').hide();
}


function loadShow(seriesID) {
  $.getJSON(WEBDIR + 'sonarr/Show/id=' + seriesID, function(tvshow) {
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

    $.each(qlty, function(i, q) {
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

    row = $('<tr>');
    row.append('<th>Summary</th><td>' + tvshow.overview + '</td>');
    table.append(row);

    if (tvshow.images.length > 0) {
      $.each(tvshow.images, function(i, cover) {
        if (cover.coverType === "banner") {
          bannerurl = cover.url;
        }
      });
    }

    modalContent = $('<div>');
    modalContent.append(

      $('<img>').attr('src', WEBDIR + 'sonarr/GetBanner/?url=MediaCover/' + tvshow.id + '/banner.jpg').addClass('img-rounded'),
      $('<hr>'),
      table);

    // Disabled for now

    var modalButtons = {
      'Show': function() {
        data = {
          'id': tvshow.seriesID
        }
        window.location = WEBDIR + 'sonarr/View/' + tvshow.id + '/' + tvshow.tvdbId;
      }
    };


    showModal(tvshow.title, modalContent, modalButtons);
  });

}

function cal() {
  $('#cal').fullCalendar({
    editable: false,
    handleWindowResize: true,
    weekends: true,
    allDayDefault: false,
    defaultView: 'basicWeek',
    header: {
      left: 'prev,next today',
      center: 'title',
      right: 'month,agendaWeek,agendaDay'
    },
    firstDay: '1',
    columnFormat: 'ddd D/M',
    displayEventTime: true,
    timeFormat: 'hh:mm',
    timezone: 'local',
    height: 'auto',

    events: {
      url: 'Calendar',
      type: 'GET',
    },
    eventRender: function(event, element, view) {
      if (event.all.hasFile) {
        element.addClass('calendar_has_file');
      } else {
        element.addClass('calendar_missing_file');
      }

      element.click(function(e) {
        if (event.all.hasFile) {
          //calendarmodal TODO
        } else {
          loadShow(event.all.series.id)
        }
      });

    }

  });
  $('#cal').fullCalendar('render')
}

function calendarmodal(s) {
  // TODO
}

function Scanfolder() {
  data = {
    "method": "DownloadedEpisodesScan"
  };
  p = prompt('Write path to processfolder or leave blank for default path');
  if (p || p.length >= 0) {
    data.par = "path";
    data.id = p;

    $.getJSON(WEBDIR + 'sonarr/Command', data, function(r) {
      state = (r.state) ? 'success' : 'error';
      // Stop the notify from firing on cancel
      if (p !== null) {
        path = (p.length === 0) ? 'Default folder' : p;
        notify('sonarr', 'Postprocess ' + path, state);
      }
    });
  }
}

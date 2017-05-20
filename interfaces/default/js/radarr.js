$(document).ready(function() {
  moment().format();
  $(window).trigger('hashchange');
  qlty = [];
  $.when(profile()).done(function(qltyresult) {
    qlty = qltyresult;
    var folders = rootfolder();
    loadMovies();
    history();
    cal();
    $('a[data-toggle="tab"]').click(function (e) {
    }).on('shown', cal);

    var AddMovieAction = function () {
        var query = $('#add_show_name').val();
        if (query) {
            $('#add_show_button').attr('disabled', true);
            searchTMDb(query);
        }
    };
    $('#add_show_name').keyup(function (event) {
        if (event.keyCode == 13) {
            AddMovieAction();
        }
    });
    $('#add_show_button').click(AddMovieAction);

    $('#add_tvdbid_button').click(function () {
        addMovie($('#add_show_select').val(),
            $('#add_show_quality').val(),
            $('#add_show_folder').val(),
            $('#add_show_monitor').val() == 'true'
        );
    });

    $('#cancel_show_button').click(function () {
        cancelAddMovie();
    });

    $('#scanfolder').click(function (e) {
        e.preventDefault();
        Scanfolder()
    });
});

});

function loadMovies() {
  $('.spinner').show();
  $.ajax({
    url: WEBDIR + 'radarr/Movies',
    type: 'get',
    dataType: 'json',
    success: function(result) {
      $('#tvshows_table_body').empty();
      if (result.length === 0) {
        var row = $('<tr>');
        row.append($('<td>').attr('colspan', '5').html('No shows found'));
        $('#tvshows_table_body').append(row);
      }
      $.each(result, function(showname, movie) { // tvshow.tvdbId
        var name = $('<a>').attr('href', WEBDIR + 'radarr/View/' + movie.id + '/' + movie.tmdbId).text(movie.title);
        var row = $('<tr>');
        // Check the global var as radarr dont have quality name only a id.
        $.each(qlty, function(i, q) {
          if (movie.qualityProfileId == q.id) {
            qname = q.name;
          }
        });

        row.append(
          $('<td>').html(name),
          $('<td>').html(radarrStatusLabel(movie.status)),
          $('<td>').html(moment(movie.inCinemas).calendar()),
          $('<td>').html(movie.studio),
            $('<td>').append(movie.downloaded ? radarrStatusLabel(movie.movieFile.quality.quality.name) : radarrStatusLabel('Missing')),
          $('<td>').html(radarrStatusLabel(qname)));
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

function radarrStatusIcon(iconText, white) {
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

function radarrStatusLabel(text) {
  var statusOK = ['released', 'Downloaded', 'Any'];
  var statusInfo = ['Snatched', 'HD', 'HD - All', 'HD-720p', 'HD-1080p', 'HDTV-720p', 'HDTV-1080p', 'WEBDL-720p', 'WEBDL-1080p', ];
  var statusError = ['ended', 'Missing'];
  var statusWarning = ['Skipped', 'SD', 'SD - All', 'SDTV', 'DVD'];
  var statusNormal = ['Bluray', 'Bluray-720p', 'Bluray-1080p'];

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

  var icon = radarrStatusIcon(text, true);
  if (icon !== '') {
    label.prepend(' ').prepend(icon);
  }
  return label;
}

function profile(qualityProfileId) {
    var done = jQuery.Deferred();
    $.get(WEBDIR + 'radarr/Profile', function (result) {
        qlty = result;
        done.resolve(qlty);
    });
    return done;
}

function rootfolder() {
  $.get(WEBDIR + 'radarr/Rootfolder', function(result) {
    folders = result;
    return folders
  });
}

function history() {
  $.getJSON(WEBDIR + 'radarr/History', function(result) {
    $.each(result.records, function(i, log) {
      var row = $('<tr>');
      row.append(
        $('<td>').text(moment(log.date).calendar()),
        $('<td>').text(log.eventType),
        $('<td>').text(log.sourceTitle),
        //$('<td>').text(log.series.title), // Clean title
        $('<td>').text(log.title),
        $('<td>').html(radarrStatusLabel(log.status)),
        $('<td>').html(radarrStatusLabel(log.quality.quality.name)));

      $('#history_table_body').append(row);
    });

    $('#history_table_body').parent().trigger("update");
  });
}

function calendar() {
  $.getJSON(WEBDIR + 'radarr/Calendar', function(result) {
    $.each(result, function(i, cal) {
      var row = $('<tr>');
      var name = $('<a>').attr('href', '#').html(cal.series.title).click(function(e) {
        e.preventDefault();
        loadMovie(cal.id);
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

function searchTMDb(query) {
  $.ajax({
    url: WEBDIR + 'radarr/Lookup/' + encodeURIComponent(query),
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
        var tmdbId = item.tmdbId;
        var movie = item.title;
        var year = item.year;
        var option = $('<option>');
        option.attr('data-info', $.makeArray(item));
        option.attr('value', tmdbId);
        option.html(movie + ' (' + year + ')');
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
      $('.radarr_checkboxs').show();
    }
  });
}

function addMovie(tmdbid, quality, rootfolder, monitored) {
  var data = {
    rootfolder: rootfolder,
    monitored: monitored
  };

  $.ajax({
    url: WEBDIR + 'radarr/AddMovie/' + tmdbid + '/' + quality,
    data: data,
    type: 'get',
    dataType: 'json',
    success: function(data) {
      if (data.title) {
        notify('Adding movie ' + data.title + '', '', 'successful');
        loadMovies();
      } else {
        notify('Failed to add movie ', data[0].errorMessage, 'error');
        cancelAddMovie();
      }
    }
  });
}

function cancelAddMovie() {
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
  $('.radarr_checkboxs').hide();
}


function loadMovie(movieID) {
  $.getJSON(WEBDIR + 'radarr/Movie/%d' + movieID, function(movie) {
    var bannerurl;
    var table = $('<table>');
    table.addClass('table table-bordered table-striped table-condensed');

    row = $('<tr>');
    row.append('<th>Status</th><td>' + movie.status + '</td>');
    table.append(row);

    if (movie.inCinemas) {
      ReleaseDate = moment(movie.inCinemas).calendar();
    } else {
      releaseDate = 'N/A';
    }

    row = $('<tr>');
    row.append('<th>In Cinemas</th><td>' + releaseDate + '</td>');
    table.append(row);

    row = $('<tr>');
    row.append('<th>Monitored</th><td>' + movie.monitored + '</td>');
    table.append(row);

    row = $('<tr>');
    row.append('<th>Location</th><td>' + movie.path + '</td>');
    table.append(row);

    $.each(qlty, function(i, q) {
      if (movie.qualityProfileId == q.id) {
        qname = q.name;
        row = $('<tr>');
        row.append('<th>Quality</th><td>' + q.name + '</td>');
        table.append(row);
      }
    });

    row = $('<tr>');
    row.append('<th>Studio</th><td>' + movie.studio + '</td>');
    table.append(row);

    row = $('<tr>');
    row.append('<th>Summary</th><td>' + movie.overview + '</td>');
    table.append(row);

    if (movie.images.length > 0) {
      $.each(movie.images, function(i, cover) {
        if (cover.coverType === "banner") {
          bannerurl = cover.url;
        }
      });
    }

    modalContent = $('<div>');
    modalContent.append(

      $('<img>').attr('src', WEBDIR + 'radarr/GetBanner/?url=MediaCover/' + movie.id + '/banner.jpg').addClass('img-rounded'),
      $('<hr>'),
      table);

    // Disabled for now

    var modalButtons = {
      'Show': function() {
        data = {
          'id': movie.id
        };
        window.location = WEBDIR + 'radarr/View/' + movie.id + '/' + movie.tmdbId;
      }
    };


    showModal(movie.title, modalContent, modalButtons);
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
          loadMovie(event.all.id);
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
    "method": "DownloadedMoviesScan"
  };
  p = prompt('Write path to processfolder or leave blank for default path');
  if (p || p.length >= 0) {
    data.par = "path";
    data.id = p;

    $.getJSON(WEBDIR + 'radarr/Command', data, function(r) {
      state = (r.state) ? 'success' : 'error';
      // Stop the notify from firing on cancel
      if (p !== null) {
        path = (p.length === 0) ? 'Default folder' : p;
        notify('radarr', 'Postprocess ' + path, state);
      }
    });
  }
}

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
    
    loadAlerts();
    setInterval(function(){ loadAlerts(); }, 30000);
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
          $('<td>').html(radarrStatusLabel(qname)),
          $('<td>').html(radarrActions(movie.id)));
        $('#tvshows_table_body').append(row);
        if (!movie.monitored) {
          $('#mon'+movie.id).removeClass("fa-bookmark").addClass("fa-bookmark-o");
          $('#mon'+movie.id).attr("title","Unmonitored\nClick to toggle");
        }
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

function radarrActions(id) {
	var btns = $('<div>');
	btns.append( $('<li class="fa fa-search fa-fw fa-lg" id="q'+id+'">')
    .attr("title","Force Search").css("cursor","pointer").click(function(){
      $.when(ForceSearch(id)).done(function(){
        // Nothing to do
      }); //done
    }) //click
  );
  btns.append( $('<li class="fa fa-bookmark fa-lg" id="mon'+id+'">')
    .attr("title","Monitored\nClick to toggle").css("cursor","pointer").click(function(){
      $.when(ToggleMonitor(id)).done(function(bMon){
        $('#mon'+id).removeClass("fa-spinner").removeClass("fa-pulse");
        if (bMon) {
          $('#mon'+id).attr("title","Monitored\nClick to toggle")
            .removeClass("fa-bookmark-o").addClass("fa-bookmark");
        } else {
          $('#mon'+id).attr("title","Unmonitored\nClick to toggle")
            .removeClass("fa-bookmark").addClass("fa-bookmark-o");
        }
      }); //done
    }) //click
  );
	btns.append( $('<li class="fa fa-trash-o fa-fw fa-lg" id="del'+id+'">')
    .attr("title","Delete movie\n(keeps existing files/folders)").css("cursor","pointer").click(function(){
      $.when(DeleteContent(id)).done(function(result){
        if (result) { loadMovies(); }
      }); //done
    }) //click
  );
	return btns;
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

function ForceSearch(id) {
  $('#q'+id).removeClass().addClass("fa fa-spinner fa-pulse fa-fw fa-lg");
  data = {
    "method": "MoviesSearch",
    "par": "movieIds",
    "id": id
  };
  var done = jQuery.Deferred();
  $.getJSON(WEBDIR + 'radarr/Command', data, function(r) {
    //We don't get back the actual result of the job, just whether the API call was successful or not
    //Return after a brief pause if the API call was ok
    if (r.state) {
      notify('radarr', 'Search started', 'success');
      done.resolve(true);
      setTimeout(function(){
        $('#q'+id).removeClass().addClass("fa fa-search fa-fw fa-lg");
      },500);
    } else {
      done.fail(false);
      notify('radarr', 'Search not started, check logs', 'error');
      $('#q'+id).removeClass().addClass("fa fa-search fa-fw fa-lg");
    }
  });
  return done;
}

function ToggleMonitor(id) {
  var iWidth = $('#mon'+id).css("width"); // hack to stop element reflow whilst
  $('#mon'+id).css("width",iWidth);       // avoiding extra whitespace of fa-fw icons
  $('#mon'+id).addClass("fa-spinner fa-pulse")
  data = {
    "id": id
  };
  var done = jQuery.Deferred();
  $.get(WEBDIR + 'radarr/ToggleMonitor', data, function (r) {
    done.resolve(r.monitored);
  });
  return done;
}

function DeleteContent(id) {
  $('#del'+id).removeClass().addClass("fa fa-spinner fa-pulse fa-fw");
  data = {
    "id": id
  };
  var done = jQuery.Deferred();
  $.get(WEBDIR + 'radarr/DeleteContent', data, function (r) {
    if (r.message) {
      done.fail(false);
      $('#del'+id).removeClass().addClass("fa fa-trash-o fa-fw");
      notify('radarr',r.message,'error');
    } else {
      done.resolve(true);
      notify('radarr','Deleted','info');
    }
  });
  return done;
}

function loadAlerts() {
  var alerts = 0;
  $.ajax({
    url: WEBDIR + 'radarr/Alerts',
    type: 'get',
    dataType: 'json',
    success: function(result) {
      $('#alerts_table_body').empty();
      $('#alerts_tab').empty();
      var error_alert = false;
      var warning_alert = false;
      var info_alert = false;
      $.each(result, function(alertix, alertitem) {
        alerts++;
        var alerticon = $('<li class="fa">');
        if (alertitem.type.toLowerCase() == "error") {
          error_alert = true;
          alerticon.addClass("fa-exclamation-triangle text-error");
        } else if (alertitem.type.toLowerCase() == "warning") {
          warning_alert = true;
          alerticon.addClass("fa-exclamation-circle text-warning");
        } else if (alertitem.type.toLowerCase() == "information") {
          info_alert = true;
          alerticon.addClass("fa-info-circle");
        } else {
          error_alert = true;
          alerticon.addClass("fa-question-circle");
          alerticon.append(' '+alertitem.type);
        }
        
        if (alertitem.wikiUrl.length > 0) {
          var alertmsg = $('<a>').attr('href', alertitem.wikiUrl).attr('target', "_blank").text(alertitem.message + ' ').append($('<li class="fa fa-fw fa-external-link">'));
        } else {
          var alertmsg = $('<span>').text(alertitem.message);
        }
        var row = $('<tr>');
        row.append(
          $('<td>').css("text-align","center").append(alerticon),
          $('<td colspan="2">').html(alertmsg)
        );
        $('#alerts_table_body').append(row);
      });

      // Repeat for Queue items that have issues
      $.ajax({
        url: WEBDIR + 'radarr/Queue',
        type: 'get',
        dataType: 'json',
        success: function(queue) {
          $.each(queue, function(queueix, queueitem) {
            if (queueitem.status.toLowerCase() != "pending") {
              var alerticon = $('<li class="fa">');
              if (queueitem.trackedDownloadStatus.toLowerCase() == "error") {
                error_alert = true;
                alerticon.addClass("fa-exclamation-triangle text-error");
              } else if (queueitem.trackedDownloadStatus.toLowerCase() == "warning") {
                warning_alert = true;
                alerticon.addClass("fa-exclamation-circle text-warning");
              } else if (queueitem.trackedDownloadStatus.toLowerCase() == "ok") {
                info_alert = true;
                alerticon.addClass("fa-info-circle");
              } else {
                error_alert = true;
                alerticon.addClass("fa-question-circle");
                alerticon.append(' '+queueitem.trackedDownloadStatus);
              }
              var alertmsg = ""
              $.each(queueitem.statusMessages, function(msgix, msg) {
                if (msgix > 0) { alertmsg += "<br />"; }
                alertmsg += msg.messages;
              });

              var row = $('<tr>');
              row.append(
                $('<td>').css("text-align","center").append(alerticon),
                $('<td>').html(queueitem.movie.title),
                $('<td>').html(alertmsg)
              );
              if (!info_alert) { //add the row unless it's an OK state
                alerts++;
                $('#alerts_table_body').append(row);
              }
            }
          });
          
          if (alerts == 0) {
            var row = $('<tr>');
            row.append($('<td>').css("text-align","center").append($('<li class="fa fa-question-circle">')));
            row.append($('<td colspan="2">').html('No current alerts'));
            $('#alerts_table_body').append(row);
            $('#alerts_tab').append(" &nbsp; ");
            $('#alerts_li').addClass("disabled");
          } else {
            if (error_alert) {
              $('#alerts_tab').append( $('<li class="fa fa-exclamation-triangle fa-lg text-error">') );
            } else if (warning_alert) {
              $('#alerts_tab').append( $('<li class="fa fa-exclamation-circle fa-lg text-warning">') );
            } else if (info_alert) {
              $('#alerts_tab').append( $('<li class="fa fa-info-circle fa-lg">') );
            } else {
              $('#alerts_tab').append( $('<li class="fa fa-question-circle fa-lg">') );
            }
            $('#alerts_tab').append(" " + alerts).addClass("nav");
            $('#alerts_li').removeClass("disabled");
          }
        }
      });
    }
  });
}

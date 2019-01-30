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
 
       loadAlerts();
       setInterval(function(){ loadAlerts(); }, 30000);
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
          $('<td>').html(sonarrStatusLabel(qname)),
          $('<td>').html(sonarrActions(tvshow.id,(tvshow.seasons.length-1)))
        );
        $('#tvshows_table_body').append(row);
        if (!tvshow.monitored) {
          $('#mon'+tvshow.id).removeClass("fa-bookmark").addClass("fa-bookmark-o");
          $('#mon'+tvshow.id).attr("title","Series: Unmonitored\nClick to toggle");
          $('#monssnb'+tvshow.id).addClass("disabled");
        }
        if (!tvshow.seasons[(tvshow.seasons.length-1)].monitored) {
          $('#monssnb'+tvshow.id).attr("title","Latest Season: Unmonitored\nClick to toggle");
          $('#monssnt'+tvshow.id).removeClass("fa-bookmark").addClass("fa-bookmark-o");
          $('#monssnl'+tvshow.id).removeClass("fa-inverse");
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

function sonarrActions(id,ssn) {
	var btns = $('<div>').css("display","inline-block");
	btns.append( $('<li class="fa fa-search fa-fw fa-lg" id="q'+id+'">')
    .attr("title","Latest Season:\nSearch missing episodes").css("cursor","pointer").click(function(){
      $.when(ForceSearch(id,ssn)).done(function(){
        // Nothing to do
      }); //done
    }) //click
  );
  btns.append( $('<li class="fa fa-bookmark fa-lg" id="mon'+id+'">')
    .attr("title","Series: Monitored\nClick to toggle").css("cursor","pointer").click(function(){
      $.when(ToggleMonitor(id)).done(function(bMon){
        $('#mon'+id).removeClass("fa-spinner").removeClass("fa-pulse");
        if (bMon) {
          $('#mon'+id).attr("title","Series: Monitored\nClick to toggle")
            .removeClass("fa-bookmark-o").addClass("fa-bookmark");
          $('#monssnb'+id).removeClass("disabled");
        } else {
          $('#mon'+id).attr("title","Series: Unmonitored\nClick to toggle")
            .removeClass("fa-bookmark").addClass("fa-bookmark-o");
          $('#monssnb'+id).addClass("disabled");
        }
      }); //done
    }) //click
  );
  btns.append( $('<span class="fa-stack fa-lg icon-sonarr" id="monssnb'+id+'" style="width: 16px; height: 14px; margin-left: 5px; margin-right: 5px;">')
    .append( $('<i class="fa fa-stack-1x fa-bookmark" id="monssnt'+id+'" style="top: -13px;">') )
    .append( $('<i class="fa fa-stack-1x fa-inverse" id="monssnl'+id+'" style="mix-blend-mode: difference; top: -14px;">').html('<sup style="font-size: 55%;">#</sup>') )
    .attr("title","Latest Season: Monitored\nClick to toggle").css("cursor","pointer")
      .click(function(){if ($(this).hasClass("disabled")) return;
        $.when(ToggleMonitorSeason(id,ssn)).done(function(bMonSsn){
          $('#monssnt'+id).removeClass("fa-spinner").removeClass("fa-pulse");
          if (bMonSsn) {
            $('#monssnt'+id).attr("title","Latest Season: Monitored\nClick to toggle")
              .removeClass("fa-bookmark-o").addClass("fa-bookmark");
            $('#monssnl'+id).addClass("fa-inverse");
          } else {
            $('#monssnt'+id).attr("title","Latest Season: Unmonitored\nClick to toggle")
              .removeClass("fa-bookmark").addClass("fa-bookmark-o");
            $('#monssnl'+id).removeClass("fa-inverse");
          }
        }); //done
    }) //click
  );
	btns.append( $('<li class="fa fa-trash-o fa-lg" id="del'+id+'">')
    .attr("title","Delete Series\n(keeps existing files/folders)").css("cursor","pointer").click(function(){
      $.when(DeleteContent(id)).done(function(result){
        if (result) { loadShows(); }
      }); //done
    }) //click
  );
  return btns;
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

function ForceSearch(id,ssn) {
  $('#q'+id).addClass("fa-spinner fa-pulse");
  data = {
    "method": "SeasonSearch",
    "par": "seriesId",
    "id": id,
    "sNum": ssn
  };
  var done = jQuery.Deferred();
  $.getJSON(WEBDIR + 'sonarr/Command', data, function(r) {
    //We don't get back the actual result of the job, just whether the API call was successful or not
    setTimeout(function(){
      //Return after a brief pause to make it look like we did something :)
      $('#q'+id).removeClass("fa-spinner").removeClass("fa-pulse").addClass("fa-search");
    },500);
    if (r.state) {
      notify('sonarr', 'Search started', 'success');
      done.resolve(true);
    } else {
      notify('sonarr', 'Search not started, check logs', 'error');
      done.fail(false);
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
  $.get(WEBDIR + 'sonarr/ToggleMonitor', data, function (r) {
    done.resolve(r.monitored);
  });
  return done;
}

function ToggleMonitorSeason(id,ssn) {
  $('#monssnt'+id).addClass("fa-spinner fa-pulse")
  data = {
    "id": id,
    "sn": ssn
  };
  var done = jQuery.Deferred();
  $.get(WEBDIR + 'sonarr/ToggleMonitorSeason', data, function (r) {
    done.resolve(r.seasons[ssn].monitored);
  });
  return done;
}

function DeleteContent(id) {
  $('#del'+id).removeClass().addClass("fa fa-spinner fa-pulse fa-fw");
  data = {
    "id": id
  };
  var done = jQuery.Deferred();
  $.get(WEBDIR + 'sonarr/DeleteContent', data, function (r) {
    if (r.message) {
      done.fail(false);
      $('#del'+id).removeClass().addClass("fa fa-trash-o fa-fw");
      notify('sonarr',r.message,'error');
    } else {
      done.resolve(true);
      notify('sonarr','Deleted','info');
    }
  });
  return done;
}

function loadAlerts() {
  var alerts = 0;
  $.ajax({
    url: WEBDIR + 'sonarr/Alerts',
    type: 'get',
    dataType: 'json',
    success: function(result) {
      $('#alerts_table_body').empty();
      $('#alerts_tab').empty(); // try to hide the nav tab if no alert
      var error_alert = false;
      var warning_alert = false;
      var info_alert = false;
      $.each(result, function(alertix, alertitem) {
        alerts++;
        var alerticon = $('<li class="fa">');
        if (alertitem.type == "error") {
          error_alert = true;
          alerticon.addClass("fa-exclamation-triangle text-error");
        } else if (alertitem.type == "warning") {
          warning_alert = true;
          alerticon.addClass("fa-exclamation-circle text-warning");
        } else if (alertitem.type == "information") {
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
          $('<td>').html(alertmsg)
        );
        $('#alerts_table_body').append(row);
      });
        
      // Repeat for Queue items that have issues
      $.ajax({
        url: WEBDIR + 'sonarr/Queue',
        type: 'get',
        dataType: 'json',
        success: function(queue) {
          $.each(queue, function(queueix, queueitem) {
            var alerticon = $('<li class="fa">');
            if (queueitem.status.toLowerCase() == "delayed") {
              info_alert = true;
              alerticon.addClass("fa-info-circle");
            } else if (queueitem.trackedDownloadStatus.toLowerCase() == "error") {
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
            var alertmsg = queueitem.status + " "
            $.each(queueitem.statusMessages, function(msgix, msg) {
              if (msgix > 0) { alertmsg += "<br />"; }
              alertmsg += msg.messages;
            });

            var row = $('<tr>');
            row.append(
              $('<td>').css("text-align","center").append(alerticon),
              $('<td>').html(queueitem.series.title +
                " " + queueitem.episode.seasonNumber +
                "x" + queueitem.episode.episodeNumber),
              $('<td>').html(alertmsg)
            );
            if (!info_alert) { //add the row unless it's an OK state
              alerts++;
              $('#alerts_table_body').append(row);
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

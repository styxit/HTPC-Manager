var row_n = 0;
var stats_dash_message_enabled = false;

function dash_radarr_calendar() {

  if (!$('#dash_radarr_calendar').length) return
  $('#dash_radarr_cal').fullCalendar({
    editable: false,
    handleWindowResize: true,
    weekends: true,
    allDayDefault: false,
    defaultView: 'basicDay',
    header: {
      left: 'prev,next today',
      center: 'title',
      right: 'month, basicWeek, basicDay'
    },
    firstDay: '1',
    columnFormat: 'ddd D/M',
    displayEventTime: true,
    timeFormat: 'hh:mm',
    timezone: 'local',
    height: 'auto',

    events: {
      url: WEBDIR + 'radarr/Calendar',
      type: 'GET',
    },
    eventRender: function(event, element) {
      var title = event.title;
      element.text(title);
      if (event.all.hasFile) {
        element.addClass('calendar_has_file');
      } else {
        element.addClass('calendar_missing_file');
      }
      // add modal here?
    }

  });
  $('#dash_radarr_cal').fullCalendar('render')
}

function dash_sonarr_calendar() {

  if (!$('#dash_sonarr_calendar').length) return
  $('#dash_sonarr_cal').fullCalendar({
    editable: false,
    handleWindowResize: true,
    weekends: true,
    allDayDefault: false,
    defaultView: 'basicDay',
    header: {
      left: 'prev,next today',
      center: 'title',
      right: 'month, basicWeek, basicDay'
    },
    firstDay: '1',
    columnFormat: 'ddd D/M',
    displayEventTime: true,
    timeFormat: 'hh:mm',
    timezone: 'local',
    height: 'auto',

    events: {
      url: WEBDIR + 'sonarr/Calendar',
      type: 'GET',
    },
    eventRender: function(event, element) {
      var title = event.title + ' S' + pad(event.all.seasonNumber, 2) + 'E' + pad(event.all.episodeNumber, 2) + ' ' + event.all.title
      element.text(title)
      if (event.all.hasFile) {
        element.addClass('calendar_has_file');
      } else {
        element.addClass('calendar_missing_file');
      }
      // add modal here?
    }

  });
  $('#dash_sonarr_cal').fullCalendar('render')
}

function loadUpcomingAlbumsList() {
  if (!$('#upcomingalbumslist_table_body').length) return
  $.getJSON(WEBDIR + 'headphones/GetUpcomingList', function(data) {
    if (data == null) {
      dasherror('dash_upcoming_albums_list', 'No upcoming albums found')

      return
    }
    $.each(data, function(i, albums) {
      if (i >= 5) return
      $('#upcomingalbumslist_table_body').append(
        $('<tr>').append(
          $('<td>').html(albums.ArtistName),
          $('<td>').html(albums.AlbumTitle),
          $('<td>').append($('<div class="pull-right">').html(albums.ReleaseDate))
        )
      )
    })
  })
}

function loadWantedAlbumsList() {
  if (!$('#wantedalbumslist_table_body').length) return
  $.getJSON(WEBDIR + 'headphones/GetWantedList', function(data) {
    if (data == null) {
      dasherror('dash_wanted_albums_list', 'No wanted albums found')

      return
    }
    $.each(data, function(i, albums) {
      if (i >= 5) return
      $('#wantedalbumslist_table_body').append(
        $('<tr>').append(
          $('<td>').html(albums.ArtistName),
          $('<td>').html(albums.AlbumTitle),
          $('<td>').append($('<div class="pull-right">').html(albums.ReleaseDate))
        )
      )
    })
  })
}

function loadWantedAlbums() {
  if (!$('#headphones-carousel').length) return
  $.get(WEBDIR + 'headphones/GetWantedList', function(data) {
    if (data == null) {
      dasherror('dash_wanted_albums', 'No data returned from headphones')
      return
    }

    if (data && !data.length) { // not sure if this is correct, dont have hp to test with.
      dasherror('dash_wanted_albums', 'No wanted albums')
      return
    }
    $.each(data, function(i, albums) {
      var src;
      var itemDiv = $('<div>').addClass('item carousel-item')

      if (i === 0) itemDiv.addClass('active')

      var tt;
      if (albums.ReleaseDate != null) {
        // release date should be (yyyy) or empty string
        tt = ' (' + albums.ReleaseDate.substring(0, 4) + ') '
      } else {
        tt = '  '
      }
      if (albums.ArtistName === 'None' || albums.ArtistName == null) {
        // to remove None..
        albums.ArtistName = ''
      }
      if (albums.ArtworkURL === null) {
        src = WEBDIR + 'img/no-cover-art.png'
      } else {
        src = WEBDIR + 'headphones/GetThumb?h=240&w=430&thumb=' + albums.ArtworkURL
      }

      itemDiv.attr('style', 'background-image: url("' + src + '")')

      itemDiv.append($('<div>').addClass('carousel-caption').click(function() {
        location.href = WEBDIR + 'headphones/#wanted'
      }).append(
        $('<h4>').html(albums.AlbumTitle + tt)
      ))
      $('#headphones-carousel .carousel-inner').append(itemDiv)


    })
    $('#headphones-carousel').show()
  })
}

function loadRecentMovies() {
  if (!$('#movie-carousel').length) return
  $.getJSON(WEBDIR + 'kodi/GetRecentMovies', function(data) {
    if (data === null || data.movies === null) return
    $.each(data.movies, function(i, movie) {
      var itemDiv = $('<div>').addClass('item carousel-item')

      if (i === 0) itemDiv.addClass('active')

      var src = WEBDIR + 'kodi/GetThumb?h=240&w=430&thumb=' + encodeURIComponent(movie.fanart)
      itemDiv.attr('style', 'background-image: url("' + src + '")')

      itemDiv.append($('<div>').addClass('carousel-caption').click(function() {
        location.href = WEBDIR + 'kodi/#movies'
      }).hover(function() {
        var text = $(this).children('p').stop().slideToggle()
      }).append(
        $('<h4>').html(movie.title + ' (' + movie.year + ')'),
        $('<p>').html(
          '<b>Runtime</b>: ' + parseSec(movie.runtime) + '<br />' +
          '<b>Genre</b>: ' + movie.genre.join(', ') + '<br />' +
          movie.plot
        ).hide()
      ))
      $('#movie-carousel .carousel-inner').append(itemDiv)
    })
    $('#movie-carousel').show()
  })
}

function loadRecentMoviesList() {
  if (!$('#latestmovieslist_table_body').length) return
  $.getJSON(WEBDIR + 'kodi/GetRecentMovies', function(result) {
    if (result.movies[0] == null) {
      dasherror('dash_rec_movies_list', 'No movies :(')

      return
    }
    // add plot?
    $.each(result.movies, function(i, item) {
       var year = (item.year && item.year != '0') ? item.year: '';
      $('#latestmovieslist_table_body').append(
        $('<tr>').append(
          $('<td>').html(item.title),
          $('<td>').append($('<div class="pull-right">').html(year))
        )
      )
    })
  })
}

function loadRecentTVshows() {
  if (!$('#tvshow-carousel').length) return
  $.getJSON(WEBDIR + 'kodi/GetRecentShows', function(data) {
    if (data === null) return
    $.each(data.episodes, function(i, episode) {
      var itemDiv = $('<div>').addClass('item carousel-item')

      if (i == 0) itemDiv.addClass('active')

      var imgp;
      if (episode.thumbnail) {
        imgp = episode.thumbnail;
      } else {
        imgp = episode.fanart
      }

      var src = WEBDIR + "kodi/GetThumb?h=240&w=430&thumb=" + encodeURIComponent(imgp)
      itemDiv.attr('style', 'background-image: url("' + src + '")')

      itemDiv.append($('<div>').addClass('carousel-caption').click(function() {
        location.href = 'kodi/#shows'
      }).hover(function() {
        var text = $(this).children('p').stop().slideToggle()
      }).append(
        $('<h4>').html(episode.showtitle + ': ' + episode.label),
        $('<p>').html(
          '<b>Runtime</b>: ' + parseSec(episode.runtime) + '<br />' + episode.plot
        ).hide()
      ))
      $('#tvshow-carousel .carousel-inner').append(itemDiv)
    })
    $('#tvshow-carousel').show()
  })
}

function loadRecentTVshowsList() {
  if (!$('#latesttvlist_table_body').length) return
  $.getJSON(WEBDIR + 'kodi/GetRecentShows', function(result) {
    if (result.episodes[0] == null) {
      dasherror('dash_rec_tv_list', 'No latest tv shows found :(')
      return
    }
    $.each(result.episodes, function(i, item) {
      $('#latesttvlist_table_body').append(
        $('<tr>').append(
          $('<td>').html(item.showtitle),
          $('<td>').html('S' + pad(item.season, 2) + 'E' + pad(item.episode, 2)),
          $('<td>').text(item.title)
        )
      )
    })
  })
}

function loadRecentAlbumsOld() {
  if (!$('#albums-content').length) return
  $.getJSON(WEBDIR + 'kodi/GetRecentAlbums/4', function(data) {
    if (data === null || data.limits.total === 0) return
    $.each(data.albums, function(i, album) {
      var imageSrc = WEBDIR + 'js/libs/holder.js/45x45/text:No cover'
      if (album.thumbnail != '') {
        imageSrc = WEBDIR + 'kodi/GetThumb?h=45&w=45&thumb=' + encodeURIComponent(album.thumbnail)
      }

      var label = album.label
      if (album.year != '0') label += ' (' + album.year + ')'

      $('#albums-content').append(
        $('<li>').addClass('media').append(
          $('<img>').addClass('media-object pull-left img-rounded').attr('src', imageSrc),
          $('<div>').addClass('media-body').append(
            $('<h5>').addClass('media-heading').html(label),
            $('<p>').text(album.artist[0])
          )
        ).click(function(e) {
          location.href = 'kodi/#albums'
        })
      )
    })
    Holder.run()
    $('#albums-content').parent().show()
  })
}

function loadRecentAlbums() {
  if (!$('#music-carousel').length) return
  $.getJSON(WEBDIR + 'kodi/GetRecentAlbums/5', function(data) {
    if (data === null || data.limits.total === 0) return
    $.each(data.albums, function(i, album) {
      var itemDiv = $('<div>').addClass('item carousel-item stretchedbg')

      if (i === 0) itemDiv.addClass('active')
      var src = WEBDIR + 'kodi/GetThumb?h=480&w=480&thumb=' + encodeURIComponent(album.thumbnail)
      itemDiv.attr('style', 'background-image: url("' + src + '")')

      itemDiv.append($('<div>').addClass('carousel-caption').click(function() {
          location.href = WEBDIR + 'kodi/#music'
        }).hover(function() {
          var text = $(this).children('p').stop().slideToggle()
        })

        .append(
          $('<h4>').html(album.label + ' (' + album.year + ')'),
          $('<p>').html(
            '<b>Artist</b>: ' + album.artist[0] + '<br />'
          ).hide()
        )
      )
      $('#music-carousel .carousel-inner').append(itemDiv)
    })
    $('#music-carousel').show()
  })
}

function loadRecentMoviesPlex() {
  if (!$('#movie-carousel-plex').length) return
  $.getJSON(WEBDIR + 'plex/GetRecentMovies', function(data) {
    if (data === null) return
    $.each(data.movies, function(i, movie) {
      var itemDiv = $('<div>').addClass('item carousel-item')

      if (i === 0) itemDiv.addClass('active')

      var src = WEBDIR + 'plex/GetThumb?h=240&w=430&thumb=' + encodeURIComponent(movie.fanart)
      itemDiv.attr('style', 'background-image: url("' + src + '")')

      itemDiv.append($('<div>').addClass('carousel-caption').click(function() {
        location.href = WEBDIR + 'plex/#movies'
      }).hover(function() {
        var text = $(this).children('p').stop().slideToggle()
      }).append(
        $('<h4>').html(movie.title + ' (' + movie.year + ')'),
        $('<p>').html(
          '<b>Runtime</b>: ' + parseSec(movie.runtime) + '<br />' +
          '<b>Genre</b>: ' + movie.genre.join(', ') + '<br />' +
          movie.plot
        ).hide()
      ))
      $('#movie-carousel-plex .carousel-inner').append(itemDiv)
    })
    $('#movie-carousel-plex').show()
  })
}

function loadRecentTVshowsPlex() {
  if (!$('#tvshow-carousel-plex').length) return
  $.getJSON(WEBDIR + 'plex/GetRecentShows', function(data) {
    if (data === null) return
    $.each(data.episodes, function(i, episode) {
      var itemDiv = $('<div>').addClass('item carousel-item')

      if (i == 0) itemDiv.addClass('active')

      var src = WEBDIR + "plex/GetThumb?h=240&w=430&thumb=" + encodeURIComponent(episode.fanart)
      itemDiv.attr('style', 'background-image: url("' + src + '")')

      itemDiv.append($('<div>').addClass('carousel-caption').click(function() {
        location.href = 'plex/#shows'
      }).hover(function() {
        var text = $(this).children('p').stop().slideToggle()
      }).append(
        $('<h4>').html(episode.showtitle + ': ' + episode.label),
        $('<p>').html(
          '<b>Runtime</b>: ' + parseSec(episode.runtime) + '<br />' + episode.plot
        ).hide()
      ))
      $('#tvshow-carousel-plex .carousel-inner').append(itemDiv)
    })
    $('#tvshow-carousel-plex').show()
  })
}

function loadRecentAlbumsPlex() {
  if (!$('#albums-content-plex').length) return
  $.getJSON(WEBDIR + 'plex/GetRecentAlbums', function(data) {
    if (data === null) return
    $.each(data.albums, function(i, album) {
      var imageSrc = WEBDIR + 'js/libs/holder.js/45x45/text:No cover'
      if (album.thumbnail != '') {
        imageSrc = WEBDIR + 'plex/GetThumb?h=45&w=45&thumb=' + encodeURIComponent(album.thumbnail)
      }

      var label = album.title
      if (album.year != '0' && typeof album.year !== 'undefined') {
        label += ' (' + album.year + ')'
      }

      $('#albums-content-plex').append(
        $('<li>').addClass('media').append(
          $('<img>').addClass('media-object pull-left img-rounded').attr('src', imageSrc),
          $('<div>').addClass('media-body').append(
            $('<h5>').addClass('media-heading').html(label),
            $('<p>').text(album.artist)
          )
        ).click(function(e) {
          location.href = 'plex/#albums'
        })
      )
    })
    Holder.run()
    $('#albums-content-plex').parent().show()
  })
}

function loadDownloadHistory() {
  if (!$('#downloads_table_body').length) return
  $.getJSON(WEBDIR + 'sabnzbd/GetHistory?limit=5', function(data) {
    $.each(data.history.slots, function(i, slot) {
      var status = $('<i>').addClass('fa fa-check')
      if (slot.status == 'Failed') {
        status.removeClass().addClass('fa fa-times').attr('title', slot.fail_message)
      }
      $('#downloads_table_body').append(
        $('<tr>').append(
          $('<td>').html(slot.name).attr('title', slot.name),
          $('<td>').html(status)
        )
      )
    })
  })
}

function loadNZBGetDownloadHistory() {
  if (!$('#nzbgetdownloads_table_body').length) return;
  $.getJSON(WEBDIR + 'nzbget/GetHistory', function(data) {
    if (!data.length) {
      $('#nzbgetdownloads_table_body').append(
        $('<tr>').append($('<td>').html('History is empty')));
      return;
    }
    $.each(data, function(i, slot) {
      var status = $('<i>').addClass('fa fa-check');
      if (slot.ParStatus == 'FAILURE') {
        status.removeClass().addClass('fa fa-times').attr('title', slot.fail_message);
      }
      // Limit the results to 5
      if (i >= 5) return;
      $('#nzbgetdownloads_table_body').append(
        $('<tr>').append(
          $('<td>').html(slot.Name).attr('title', slot.Name),
          $('<td>').html(status)));
    });
  });
}

function loadWantedMovies() {
  if (!$('#wantedmovies_table_body').length) return
  $.getJSON(WEBDIR + 'couchpotato/GetMovieList/active/5', function(result) {
    if (result.movies[0] == null) {
      dasherror('dash_couchpotato', 'No wanted movies found')
      return
    }
    $.each(result.movies, function(i, item) {
      $('#wantedmovies_table_body').append(
        $('<tr>').append(
          $('<td>').html(item.info.original_title),
          $('<td>').append($('<div class="pull-right">').html(item.info.year))
        )
      )
    })
  })
}

function loadNextAired(options) {
  if (!$('#nextaired_sickbeard_table_body').length) return
  $.getJSON(WEBDIR + 'sickbeard/GetNextAired', function(result) {
    if (result === null || result.data.soon.length === 0) {
      dasherror('dash_sickbeard', 'No future episodes found')
      return
    }
    var soonaired = result.data.soon
    var todayaired = result.data.today
    var nextaired = todayaired.concat(soonaired)
    $.each(nextaired, function(i, tvshow) {
      if (i >= 5) return
      var name = $('<a>').attr('href', 'sickbeard/view/' + tvshow.tvdbid).html(tvshow.show_name)
      $('#nextaired_sickbeard_table_body').append(
        $('<tr>').append(
          $('<td>').append(name),
          $('<td>').html(tvshow.ep_name),
          $('<td>').append($('<div class="pull-right">').html(tvshow.airdate))
        )
      )
    })
  })
}

function loadRadarrCalendar(options) {
  if (!$('#dash_radarr_table_body').length) return
  start_refresh('radarr', 'loadRadarrCalendar');
  $.getJSON(WEBDIR + 'radarr/oldCalendar', function(result) {
    $.each(result, function(i, cal) {
      if (i >= 5) return
      var name = $('<a>').attr('href', 'radarr/View/' + cal.id + '/' + cal.tmdbId).html(cal.title + ' (' + cal.year + ') ');
      var number;
      var row = $('<tr>')
      var img = makeIcon('fa fa-info-circle', cal.overview);
      row.append(
        $('<td>').append(name).append(img),
        $('<td>').append($('<div class="pull-right">').text(moment(cal.inCinemas).fromNow()))
      )
      $('#dash_radarr_table_body').append(row);
    });

  }).always(function() {
    end_refresh('radarr');
  });
  var alerts = 0;
  $.ajax({
    url: WEBDIR + 'radarr/Alerts',
    type: 'get',
    dataType: 'json',
    success: function(result) {
      $.each(result, function(alertix, alertitem) {
        alerts++;
      });
    }
  }).always(function(){
      // Repeat for Queue items that have issues
      $.ajax({
        url: WEBDIR + 'radarr/Queue',
        type: 'get',
        dataType: 'json',
        success: function(queue) {
          $.each(queue, function(queueix, queueitem) {
            if (queueitem.status.toLowerCase() != "pending") {
              if (queueitem.trackedDownloadStatus.toLowerCase() == "ok") {
                info_alert = true;
              } else {
                info_alert = false;
              }
              if (!info_alert) { //add the row unless it's an OK state
                alerts++;
              }
            }
          });
          
        if (alerts) {
          $('#dash_radarr_message').html(
            $('<a href="radarr/#alerts">').append(
              $('<i class="fa fa-warning fa-fw text-warning">') )
              .append(alerts) );
        } else {
          $('#dash_radarr_message').empty()
        }
      }
    });
  }); //always
}

function loadsonarrCalendar(options) {
  if (!$('#dash_sonarr_table_body').length) return
  start_refresh('sonarr', 'loadsonarrCalendar');
  $.getJSON(WEBDIR + 'sonarr/oldCalendar', function(result) {
    j = 0;
    $.each(result, function(i, cal) {
      if (i >= 5) return
      var name = $('<a>').attr('href', 'sonarr/View/' + cal.seriesId + '/' + cal.series.tvdbId + '#' + cal.seasonNumber).html(cal.series.title)
      var number
      var row = $('<tr>')
      var img = makeIcon('fa fa-info-circle', cal.overview);
      row.append(
        $('<td>').append(name),
        $('<td>').html('S' + pad(cal.seasonNumber, 2) + 'E' + pad(cal.episodeNumber, 2) + '&nbsp').append(img),
        $('<td>').append($('<div class="pull-right">').text(moment(cal.airDateUtc).fromNow()))
      )
      $('#dash_sonarr_table_body').append(row);
      j++;
    });
    if (j === 0) {
      row = $('<tr>');
      row.append($('<td>').attr("colspan", 2).append('<div class="text-center"><small>No future episodes in Sonarr calendar</small></div>'))
      $('#dash_sonarr_table_body').append(row);
      return false;
    }

  }).always(function() {
    end_refresh('sonarr');
  });

  alerts = 0;
  $.ajax({
    url: WEBDIR + 'sonarr/Alerts',
    type: 'get',
    dataType: 'json',
    success: function(result) {
      $.each(result, function(alertix, alertitem) {
        alerts++;
      });
    }
  }).always(function() {
    // Repeat for Queue items that have issues
    $.ajax({
      url: WEBDIR + 'sonarr/Queue',
      type: 'get',
      dataType: 'json',
      success: function(queue) {
        $.each(queue, function(queueix, queueitem) {
          if (queueitem.status.toLowerCase() == "delayed") {
            info_alert = true;
          }
          if (queueitem.trackedDownloadStatus.toLowerCase() == "ok") {
            info_alert = true;
          }
          if (!info_alert) { //add the row unless it's an OK state
            alerts++;
          }
        });

        if (alerts) {
          $('#dash_sonarr_message').html(
            $('<a href="sonarr/#alerts">').append(
              $('<i class="fa fa-warning fa-fw text-warning">') )
              .append(alerts) );
        } else {
          $('#dash_sonarr_message').empty()
        }
      }
    });
  }); //always
}

function loadNextAiredSickrage(options) {
  if (!$('#nextaired_sickrage_table_body').length) return
  $.getJSON(WEBDIR + 'sickrage/GetNextAired', function(result) {
    if (result === null) {
      dasherror('dash_sickrage', "Can't reach Sickrage")

      return false
    };
    if (result.data.soon.length === 0 && result.data.later.length === 0 && result.data.today.length === 0 && result.data.missed.length === 0) {
      dasherror('dash_sickrage', "No future/missing episodes found")
      return false
    }
    var missed = result.data.missed;
    var all = missed.concat(result.data.today, result.data.soon, result.data.later)
    $.each(all, function(i, tvshow) {
      if ($('table #nextaired_sickrage_table_body >tr').length >= 5) return false;
      var name = $('<a>').attr('href', 'sickrage/view/' + tvshow.tvdbid).html(tvshow.show_name)
      $('#nextaired_sickrage_table_body').append(
        $('<tr>').append(
          $('<td>').append(name),
          $('<td>').html(tvshow.ep_name),
          $('<td>').append($('<div class="pull-right">').html(tvshow.airdate))
        )
      )

    })
  })
}

function loadOmbiMovieRequests(options) {
  if (!$('#ombi_movies_table_body').length) return
  $.getJSON(WEBDIR + 'ombi/dashboard?t=movies', function(result) {
    if (result === null) {
      dasherror('dash_ombi_movies', "Ombi didn\'t return anything.. Is it still talking to us?")
      return false
    }
    if (result.total == 0) {
      var row = $('<tr>')
      row.append($('<td>').attr("colspan", 2)
        .append('<div class="text-center"><small>No outstanding requests</small></div>'))
      $('#ombi_movies_table_body').append(row);
      return true
    }
    $.each(result.collection, function(i, show) {
      if (i >= 5) return true
      var name = $('<span>').html(' ' + show.title);
      if (!(show.releaseDate == null || show.releaseDate == "")) {
        name.append(' (' + show.releaseDate.substr(0,4) + ') ');
      }
      var img = makeIcon('fa fa-info-circle', show.overview);
      var row = $('<tr>')
      row.append(
        $('<td class="span3">').append(img).append(name),
        $('<td class="span1">').text(show.status)
      );
      $('#ombi_movies_table_body').append(row);
    });
    return true;
  });
}

function loadOmbiTVRequests(options) {
  if (!$('#ombi_tv_table_body').length) return
  $.getJSON(WEBDIR + 'ombi/dashboard?t=tvlite', function(result) {
    if (result === null) {
      dasherror('dash_ombi_tv', "Ombi didn\'t return anything.. Is it still talking to us?")
      return false
    }
    if (result.collection === null) { // result.total seems to always be 0, use collection instead
      var row = $('<tr>')
      row.append($('<td>')
        .append('<div class="text-center"><small>No outstanding requests</small></div>'))
      $('#ombi_tv_table_body').append(row);
      return true
    }
    $.each(result.collection, function(i, show) {
      if (i >= 5) return true
      var name = $('<span>').html(' ' + show.title);
      if (!(show.releaseDate == null || show.releaseDate == "")) {
        name.append(' (' + show.releaseDate.substr(0,4) + ') ');
      }
      var img = makeIcon('fa fa-info-circle', show.overview);
      var row = $('<tr>')
      row.append(
        $('<td class="span3">').append(img).append(name),
        $('<td class="span1">').text(show.status)
      );
      $('#ombi_tv_table_body').append(row);
    });
    return true;
  });
}

function loadOmbiMusicRequests(options) {
  if (!$('#ombi_music_table_body').length) return
  $.getJSON(WEBDIR + 'ombi/dashboard?t=music', function(result) {
    if (result === null) {
      dasherror('dash_ombi_music', "Ombi didn\'t return anything.. Is it still talking to us?")
      return false
    }
    if (result === null) { // result.total seems to always be 0
      var row = $('<tr>')
      row.append($('<td>')
        .append('<div class="text-center"><small>No outstanding requests</small></div>'))
      $('#ombi_music_table_body').append(row);
      return true
    }
    $.each(result.collection, function(i, album) {
      if (i >= 5) return true
      var name = $('<span>').html(' ' + album.title);
      if (!(album.year == null || album.year == "")) {
        name.append(' (' + album.year + ') ');
      }
      // var number;
      var img = makeIcon('fa fa-info-circle', show.overview);
      var row = $('<tr>')
      row.append(
        $('<td>').append($('<div">').text(album.artist)),
        $('<td class="span2">').append(img).append(name)
      )
      $('#ombi_music_table_body').append(row);
    });
    return true;
  });
}

function dasherror(i, msg) {
  // expects id like #dash_wanted_albums
  var h = $('#' + i).find('h3')
  $('#' + i).html('')
  var t = "<table class='table table-striped'><tr><td>" + msg + "</td></tr></table>"
  $('#' + i).append(h, t)
}

function loadsysinfo(options) {
  start_refresh('sysinfo', 'loadsysinfo');
  // delay function by a few ms else cpu usage displays high due to other things refreshing
  setTimeout( function(){ $.getJSON(WEBDIR + 'stats/sysinfodash', function(result) {
    $('#dash_sysinfo_table_body').append(
      $('<tr>').append(
        $('<td>').html('CPU'),
        $('<td>').addClass('span4').html("<div class=progress><div class=bar style=width:" + result.cpu.user.toFixed(1) + "%><span class=sr-only>User: " + result.cpu.user.toFixed(1) + "%</span></div><div class='bar bar-warning' style=width:" + result.cpu.system.toFixed(1) + "%><span class=sr-only>System: " + result.cpu.system.toFixed(1) + "%</span></div><div class='bar bar-success' style=width:" + (100 - (result.cpu.user + result.cpu.system)).toFixed(1) + "%><span class=sr-only>Idle: " + result.cpu.idle.toFixed(1) + "%</span></div></div>")
      ),
      $('<tr>').append(
        $('<td>').html('MEM'),
        $('<td>').addClass('span4').html("<div class=progress><div class=bar style=width:" + result.virtual.percent + "%><span class=sr-only>Used: " + getReadableFileSizeString((result.virtual.total - result.virtual.available)) + "</span></div><div class='bar bar-success' style=width:" + (100 - result.virtual.percent) + "% ><span class=sr-only>Free: " + getReadableFileSizeString(result.virtual.available) + "</span></div>")
      ),

      $('<tr>').append(
        $('<td>').text('IP'),
        $('<td class="ip">').append(
          $('<div>').append(
            $('<div class="pull-left">').html(result.localip),
            $('<div class="pull-right">').html(result.externalip)
          )
        )
      ),

      $('<tr>').append(
        $('<td>').text('Network'),
        $('<td>').append(
          $('<div>').append(
            $('<div class="pull-left">').html('<i class="fa fa-arrow-down"></i> ' + getReadableFileSizeString(result.network.bytes_recv)),
            $('<div class="pull-right">').html('<i class="fa fa-arrow-up"></i> ' + getReadableFileSizeString(result.network.bytes_sent))
          )
        )
      )

      // add one more with current user and login?
    );
		
    if (stats_dash_message_enabled) {
      $('#dash_sysinfo_message').html("@ " + moment().format('HH:mm:ss'));
    }

  }).always(function() {
    end_refresh('sysinfo');
  });
  }, 50);
}

function loaddiskinfo() {
  start_refresh('disks', 'loaddiskinfo')
  $.ajax({
    'url': WEBDIR + 'stats/disk_usage',
    'dataType': 'json',
    'complete': function() {
      end_refresh('disks')
    },
    'success': function(response) {
      $.each(response, function(i, disk) {
        var row = $('<tr>');
        var lazy_solution = (disk.percent >= 90) ? 'progress-danger' : '';
        var progress = "<div class='progress " + lazy_solution + " hddprog'><div class=bar style=width:" + disk.percent + "%><span class=sr-only>" + getReadableFileSizeStringHDD(disk.used) + "</span></div><div class='bar bar-success' style=width:" + (100 - disk.percent) + "% ><span class=sr-only>" + getReadableFileSizeStringHDD(disk.free) + "</span></div>";

        row.append(
          $('<td>').addClass('stats_disk_mountpoint').text(disk.mountpoint),
          $('<td>').addClass('stats_disk_progress span4').html(progress),
          $('<td>').addClass('stats_disk_percent').text(disk.percent + '%')
        );
        $('#dash_disks_table_body').append(row);
      });
    }
  })
}

function loadsmartinfo() {
  start_refresh('smart', 'loadsmartinfo')
  $.ajax({
    'url': WEBDIR + 'stats/smart_info',
    'dataType': 'json',
    'complete': function() {
      end_refresh('smart')
    },
    'success': function(response) {
      if (response == null || response.length == 0 || jQuery.isEmptyObject(response)) {
        var row = $('<tr>');
        row.append($('<td>').text("S.M.A.R.T not correctly configured."));
        $('#dash_smart_table_body').append(row);
      } else {
        byteSizeOrdering()
        $.each(response, function(i, drives) {
          var row = $('<tr>');
          row.append(
            $('<td>').text(drives.name),
            $('<td>').addClass('span4').text(drives.model),
            $('<td>').text(drives.temperature + String.fromCharCode(176)),
            $('<td>').text(drives.assessment));
          $('#dash_smart_table_body').append(row);
        });
      }
    }
  });
}

// For hdd. Converts bytes to filesize in kb,mb,gb
function getReadableFileSizeStringHDD(fileSizeInBytes) {
  var i = -1;
  var byteUnits = [' kB', ' MB', ' GB', ' TB', 'PB'];
  do {
    fileSizeInBytes = fileSizeInBytes / 1000;
    i++;
  } while (fileSizeInBytes > 1000);
  return fileSizeInBytes.toFixed(1) + byteUnits[i];
};

//
function bytestospeed(bytes) {
  var i = -1;
  var byteUnits = [' Kb', ' Mb', ' Gb', ' Tb', ' Pb'];
  do {
    bytes = bytes / 1024;
    i++;
  } while (bytes > 1024);
  return bytes.toFixed(2) + byteUnits[i] + '\\s';
}

function loadqbit() {
  if (!$('#dash_qbit_table_body').length) return
  start_refresh('qbit', 'loadqbit')
  $.ajax({
    'url': WEBDIR + 'qbittorrent/fetch',
    'dataType': 'json',
    'complete': function() {
      end_refresh('qbit')
    },
    'success': function(response) {
      var numberofloop = 0;
      var downloads = {};
      var i = 0;
      $.each(response, function(index, torrent) {
        if (torrent.state != "uploading") {
          downloads[i] = torrent;
          i = i + 1;
        }
      });
      if (i > 0) {
        var max = i;
        if (i > 5) {
          var max = 4;
        }
        $.each(downloads, function(index, torrent) {
          tr = $('<tr>');
          numberofloop += 1;
          if (numberofloop <= max) {
            tr.append(
              $('<td>').addClass('qbt_name span4').text(torrent.name),
              $('<td>').addClass('qbit_eta').append('<div class="pull-right">' + torrent.eta + '</div>'));
            $('#dash_qbit_table_body').append(tr);
          } else {

            tr.append($('<td>').addClass('').attr("colspan", 2).append('<div class="text-center"><small>' + (i - max) + ' more torrents</small></div>'))
            $('#dash_qbit_table_body').append(tr);
            return false;
          }
        });
      } else {
        tr = $('<tr>');
        tr.append($('<td>').attr("colspan", 2).append('<div class="text-center"><small>No active downloads</small></div>'))
        $('#dash_qbit_table_body').append(tr);
      }
    }
  });
}

function loaduTorrent() {
  if (!$('#dash_uTorrent_table_body').length) return
  start_refresh('uTorrent', 'loaduTorrent')
  $.ajax({
    'url': WEBDIR + 'utorrent/torrents',
    'complete': function() {
      end_refresh('uTorrent')
    },
    'success': function(response) {
      if (response.result == 200) {
        var numberofloop = 0;
        var downloads = {};
        var i = 0;
        $.each(response.torrents, function(index, torrent) {
          if (torrent.percentage_done != 1000) { // skip if 100%, see only downloading and queued torrents
            downloads[i] = torrent;
            i = i + 1;
          }
        });
      }
      else if (response.result == 500) {
        $('#error_message').text("Impossible to connect to uTorrent. Maybe the remote port changed ?");
        return false;
      }
      if (i > 0) {
        var max = i;
        if (i > 5) {
          var max = 4;
        }
        $.each(downloads, function(index, torrent) {
          var tr = $('<tr>');
          numberofloop += 1;
          if (numberofloop <= max) {
            tr.append(
              $('<td>').addClass('span2').text(torrent.name),
              $('<td>').addClass('span1').append('<div class="pull-right">' + ((torrent.percentage_done == 1000) ? "-" : "") + getReadableTime(torrent.eta) + '</div>'));
            $('#dash_uTorrent_table_body').append(tr);
          } else {

            tr.append($('<td>').addClass('').attr("colspan", 2).append('<div class="text-center"><small><a href="utorrent/">+' + (i - max) + ' more torrents</a></small></div>'))
            $('#dash_uTorrent_table_body').append(tr);
            return false;
          }
        });
      } else {
        var tr = $('<tr>');
        tr.append($('<td>').attr("colspan", 2).append('<div class="text-center"><small>No active uTorrent downloads</small></div>'))
        $('#dash_uTorrent_table_body').append(tr);
        return false;
      }
    }
  });
}

function start_refresh(module, fn) {
  if ($('#dash_' + module).children('h3:first-child').has('.refresh-btns').length == 0) {
    $('#dash_' + module).children('h3:first-child')
      .append( $('<div class="pull-right">')
        .append('<span id="dash_' + module + '_message" style="font-size: 13px;">')
        .append('&nbsp;<span class="refresh-btns">' +
        '<i id="' + module + '-refresh"  style="font-size:0.7em" class="btn fa fa-refresh fa-fw" title="Refresh" onclick="' + fn + '();"></i>' +
        '<i class="fa fa-spinner fa-pulse fa-fw" style="font-size:0.7em" id="' + module + '-spinner"></i></span>')
      );
  }
  $('#' + module + '-refresh').hide();
  $('#dash_' + module + '_table_body').html("");
  $('#' + module + '-spinner').show();
}

function end_refresh(module) {
  $('#' + module + '-refresh').show();
  $('#' + module + '-spinner').hide();
}

function enable_module(module, dest, fn) {
  jQuery("#" + module).detach().appendTo("#" + dest);
  if (fn in window) {
    window[fn]();
  }
}

function new_row() {
  row_n++;
  var newrow = $('<div>').addClass('row-fluid dash-row').attr('id', 'dash-row-' + row_n);
  $("#dash-content").append(newrow);
}

function enable_sortable() {
  $(".dash-row").sortable({
    connectWith: '.dash-row',
    helper: "clone",
    //receive: This event is triggered when a
    //connected sortable list has received an item from another list.
    receive: function(event, ui) {
      // so if > 3
      if ($(this).children().length > 3) {
        $(ui.sender).sortable('cancel');
      }
    }

  }).disableSelection();
}

$('.dash-edit').click(function() {
  $("#editButtons").show();
  $(".dash-row").addClass("dash-row-edit");
  $(".dash-module").addClass("dash-module-edit");
  enable_sortable()
});

$('#dash-addRow').click(function() {
  row_n++;
  var newrow = $('<div>').addClass('row-fluid dash-row dash-row-edit').attr('id', 'dash-row-' + row_n);
  $("#dash-content").append(newrow);
  enable_sortable()
});

$('#dash-cancel').click(function() {
  location.href = WEBDIR;
});

$('#dash-save').click(function() {
  $("#editButtons").hide();
  $(".dash-row").removeClass('dash-row-edit')
  $(".dash-module").removeClass("dash-module-edit");
  $(".dash-row").sortable('disable');
  $('.dash-row:empty').remove();
  window.location.hash = '#';
  var sorted = "";
  $(".dash-row").each(function(index) {
    sorted += $(this).sortable("toArray") + ";";
  });
  $.get(WEBDIR + "save_dash", 'dash_order=' + encodeURIComponent(sorted), function(data) {
    notify('Dashboard', data, 'info');
  })
  $(".dash-row").sortable('destroy');
});

$(document).ready(function() {
  if (Object.keys(modules).length == 0) {
    jQuery("#notConfigured").detach().appendTo("#dash-content"); //display setup msg if no modules enabled
  } else {
    var modules_per_row = 0;
    //Fetch any page display settings
    $.getJSON(WEBDIR + "stats/return_settings", function (return_settings) {
      if (return_settings.stats_dash_message_enabled == true) {
        stats_dash_message_enabled = true;
      }
    });
    if (dash_order != '0' && dash_order != 'False') { // create modules if dash_order is set
      rows_to_build = dash_order.split(";");
      for (i = 0; i < rows_to_build.length; i++) { //loop rows
        new_row();
        modules_per_row = 0;
        modules_to_build = rows_to_build[i].split(',')
        for (x = 0; x < modules_to_build.length; x++) { //loop modules
          if (modules_to_build[x] in modules) {
            enable_module(modules_to_build[x], "dash-row-" + row_n, modules[modules_to_build[x]])
            delete modules[modules_to_build[x]]; //delete module from modules object so it will not be re-created on next loop
            modules_per_row++;
          }
        }
      }
    }
    for (module in modules) { // create aditional modules not in dash_order
      if (modules_per_row == 0) {
        new_row();
      }
      modules_per_row++;
      enable_module(module, "dash-row-" + row_n, modules[module])
      if (modules_per_row > 2) {
        modules_per_row = 0;
      }
    }
    $('.dash-row:empty').remove();
    jQuery("#editButtons").detach().prependTo("#dash-content"); //show edit buttons

    if (window.location.hash.indexOf('edit') == 1) {
      $('.dash-edit').click();
    }
  }
})

if ( dash_refresh_interval > 0 ) {
  setInterval(function () {
    loaduTorrent();
    loadqbit();
    loaddiskinfo();
    loadsmartinfo();
    loadsonarrCalendar();
    loadRadarrCalendar();
    loadsysinfo();
  }, 1000 * dash_refresh_interval ) // timer uses miliseconds
}


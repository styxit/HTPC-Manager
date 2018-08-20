$(document).ready(function () {
  // moment().format();
  // alert('break');
  $(window).trigger('hashchange');

  // $(myimg1).attr('src', 'https://www.themoviedb.org/favicon.ico').css({'width':'22px','padding-right':'5px','border-radius':'5px 5px 5px 5px'});
  // $(myimg1).wrap('<a href="https://www.themoviedb.org/movie/" target="_blank"></a>');
  // $(myimg1).css({'border-width':'1px','height':'22px','width':'22px','padding-right':'5px','border-radius':'5px 5px 5px 5px'});
  // $(myimg2).attr('src', 'https://www.imdb.com/favicon.ico').css({'width':'22px','padding-right':'5px','border-radius':'5px'});
  // $(myimg2).wrap('<a href="https://www.imdb.com/title/" target="_blank"></a>');

  loadFunctionMenu();
  loadMRequests();
  loadMSearch('popular', 'suggest');
  // notify('ombi', 'menu.ready', 'debug');

  // $('a[data-toggle="tab"]').click(function (e) {
  // }).on('shown', displaylog_tab);

  var SearchMovieAction = function () {
    var query = $('#search_movie_name').val();
    if (query) {
      // $('#search_movie_button').attr('disabled', true);
      loadMSearch(query, 'search');
    }
  };
  $('#search_movie_name').keyup(function (event) {
    if (event.keyCode == 13) {
      SearchMovieAction();
    }
  });
  $('#search_movie_button').click(SearchMovieAction);

  $('#search_popular_button').click(function () {
    loadMSearch('popular', 'suggest');
  });

  $('#search_upcoming_button').click(function () {
    loadMSearch('upcoming', 'suggest');
  });

  $('#search_toprated_button').click(function () {
    loadMSearch('toprated', 'suggest');
  });

  $('#search_nowplaying_button').click(function () {
    loadMSearch('nowplaying', 'suggest');
  });

  $('#sync_plex_part').click(function () {
    syncContent('plex', 'part');
  });

  $('#sync_plex_full').click(function () {
    syncContent('plex', 'full');
  });

  $('#sync_emby_full').click(function () {
    syncContent('emby', 'full');
  });
});

function loadMRequests() {
  $('.spinner').show();
  $.ajax({
    url: WEBDIR + 'ombi/movie_requests',
    type: 'get',
    dataType: 'json',
    success: function (result) {
      $('#mrequests_table_body').empty();
      if (result == 'False') {
        var row = $('<tr>');
        row.append($('<td>').attr('colspan', '6').html('No movies found'));
        $('#mrequests_table_body').append(row);
      }
      var i = 0;
      // notify('ombi', 'Image ' + name, 'debug');
      $.each(result, function (showname, movie) {

        // var lnk_tmdb_$i = $('<a target="_blank">').attr('href','https://www.themoviedb.org/movie/'+movie.theMovieDbId).text(' TMDb ');
        // $(lnk_tmdb_$i).css({'background-color':'black', 'color':'mediumseagreen', 'font-family':'fantasy', 'font-weight':'normal'});
        // var lnk_imdb_$i = $('<a target="_blank">').attr('href','https://www.imdb.com/title/'+movie.imdbId).text(' IMDb ');
        // $(lnk_imdb_$i).css({'color':'black', 'background-color':'gold', 'font-family':'fantasy', 'font-weight':'normal'});
        var name = $('<a>').attr('href', 'https://www.themoviedb.org/movie/'+movie.theMovieDbId).text(movie.title).attr('target','_blank');
        var row = $('<tr>');
        row.append(
          // $('<td nowrap>').html(movie.title+'&nbsp;').append($(lnk_imdb_$i)),
          $('<td nowrap>').html(name),
          $('<td>').html( movie.digitalRelease ? 'Digital' : movie.status),
          $('<td>').html( (movie.digitalRelease ? movie.digitalReleaseDate : movie.releaseDate).substr(0,10) ) );
        // if (movie.available) { row.append( $('<td>').append($('<i>').addClass('fas fa-cloud-download-alt')).append(' Available') )}
          // else if (movie.approved) { row.append($('<td>').append($('<i>').addClass('fa fa-check')).append(' Approved'))}
            // else { row.append($('<td>').append($('<i>').addClass('fa fa-question')).append(' Pending ').append($('<i>').addClass('fa fa-check-circle')).append($('<i>').addClass('fa fa-minus-circle')))}
        if (movie.available) { row.append( $('<td>').append('Available') ); }
          else if (movie.approved) { row.append($('<td>').append('Approved')); }
            else { row.append($('<td>').append('Pending')
              .append('&nbsp;').append( ( $('<i>').addClass('fa fa-plus-square fa-slightlybigger').css({'color':'green'}) )
                .attr('title','Appprove request').click( function(){ombi_approve("movie",movie.id);} ) )
              .append('&nbsp;').append( $('<i>').addClass('fa fa-ban fa-slightlybigger').css({'color':'salmon'})
                .attr('title','Deny request').click( function(){ombi_deny("movie",movie.id);} ) )
              .append('&nbsp;').append( $('<i>').addClass('fa fa-trash fa-slightlybigger').css({'color':'red'})
                .attr('title','Remove request').click( function(){ombi_delete("movie",movie.id);} ) )
              );
            }
        // Todo: Add button for marking Available/Unavailable
        row.append(
          $('<td>').html(movie.requestedUser.alias),
          $('<td>').html( movie.requestedDate.substr(0,16).replace('T',' ') )
        );
        $('#mrequests_table_body').append(row);
        i+=1;
      });
      $('#mrequests_table_body').parent().trigger('update');
      $('#mrequests_table_body').parent().trigger("sorton", [
        [
          [0, 0]
        ]
      ]);
      $('.spinner').hide();
    },
    error: function (result) {
      notify('Ombi', 'Could not connect to Ombi, check your settings' + result, 'error');
    }
  });
}

function loadMSearch(hint='popular', lookup='suggest') {
  var url = WEBDIR + 'ombi/get_searchresult?t=movie&q='+hint+'&l='+lookup
  // alert(url)
  $('.spinner').show();
  $.ajax({
    url: url,
    type: 'get',
    dataType: 'json',
    success: function (result) {
      $('#msearch_table_body').empty();
      if (result == 'False' || result.length == 0) {
        var row = $('<tr>');
        row.append($('<td>').attr('colspan', '4').html('No movies found'));
        $('#msearch_table_body').append(row);
      }
      var i = 0;
      $.each(result, function (showname, movie) {
        // $.getJSON(WEBDIR + 'ombi/get_extrainfo?t=movie&q='+movie.theMovieDbId+'&k=digitalReleaseDate', function(digitalReleaseDate) {
        var row = $('<tr>');
        if (movie.releaseDate == null) {
          var name = $('<a>').attr('href', 'https://www.themoviedb.org/movie/'+movie.theMovieDbId)
            .text(movie.title).attr('target','_blank');
          row.append($('<td>').html(name));
          row.append($('<td nowrap>'));
        } else {
          var name = $('<a>').attr('href', 'https://www.themoviedb.org/movie/'+movie.theMovieDbId)
            .text(movie.title+' ('+movie.releaseDate.substr(0,4)+')').attr('target','_blank');
          row.append($('<td>').html(name));
          row.append($('<td nowrap>').append( ( $('<i>').addClass('fa fa-film fa-slightlybigger')))
            .append('&nbsp;').append( movie.releaseDate.substr(0,10)).attr('title','Theatre release'));
        }
        if (movie.available && movie.quality) {
          row.append( $('<td>').append('Available ').append( $('<span>')
            .html(movie.quality).addClass('label label-success label-ombi-quality')));
        }
        else if (movie.available) { row.append( $('<td>').append('Available') ); }
        else if (movie.approved) { row.append($('<td>').append('Processing')); }
        else if (movie.requested && !(movie.approved)) { row.append($('<td>').append('Pending Approval')); }
        else { 
          row.append($('<td>').append( ( $('<button class="btn btn-ombi btn-request" type="button">)')
            .append('Request ').append($('<i>').addClass('fa fa-plus-square fa-fw fa-slightlybigger'))
              .click( function(){ombi_mrequest(movie.theMovieDbId, hint, lookup);} ) ) ) );
        }
        row.append($('<td>').append( ( $('<button class="btn btn-ombi btn-similar" type="button">)')
          .append('Similar ').append($('<i>').addClass('fa fa-eye fa-fw fa-slightlybigger'))
            .click( function(){loadMSearch(movie.theMovieDbId);} ) ) ) );
        $('#msearch_table_body').append(row);
        i+=1;
      });
      $('#msearch_table_body').parent().trigger('update');
      $('#msearch_table_body').parent().trigger("sorton", [
        [
          [1, 1]
        ]
      ]);
      $('.spinner').hide();
    },
    error: function (result) {
      $('.spinner').hide();
      notify('Ombi', 'Could not connect to Ombi, check your settings' + result, 'error');
    }
  });
}

function get_extrainfo_key(ctype,cid,key) {
  $.getJSON(WEBDIR + 'ombi/get_extrainfo?t='+ctype+'&q='+cid+'&k='+key, function(result) {
    // alert(key + ' is ' + result);
    return result;
  });
}

function loadFunctionMenu() {
  $('.fmenu_plex').hide();
  $('.fmenu_emby').hide();
  $.ajax({
    url: WEBDIR + 'ombi/get_plex_enabled',
    type: 'get',
    dataType: 'text',
    success: function(result) {
      if (result == 'True') {
        $('.fmenu_plex').show();
      }
    }
  });
  $.ajax({
    url: WEBDIR + 'ombi/get_emby_enabled',
    type: 'get',
    dataType: 'text',
    success: function(result) {
      if (result == 'True') {
        $('.fmenu_emby').show();
      }
    }
  });
}

function ombi_approve(ctype, id) {
  notify('ombi', 'Approve ' + ctype + ' request id ' + id, 'success');
  return true;
}

function ombi_deny(ctype, id) {
  notify('ombi', 'Deny ' + ctype + ' request id ' + id, 'warning');
  return true;
}

function ombi_delete(ctype, id) {
  notify('ombi', 'Delete ' + ctype + ' request id ' + id, 'error');
  return true;
}

function ombi_mrequest(id, h, l) {
  var url = WEBDIR + 'ombi/ombi_request_movie?id='+id;
  alert(url);
  $.ajax({
    url: url,
    data: id,
    type: 'get',
    dataType: 'json',
    success: function(result) {
      if (result != 'False') {
        notify('Request success ', result.message, 'success');
        loadMRequests(h,l);
      } else {
        notify('Failed to request movie ', 'Check logs for details', 'error');
      }
      return true;
    },
    error: function(data){
      notify('Failed to request movie ', 'Bad web engine call: ' + data.status + ' ' + data.statusText, 'error');
      return false;
    }
  });
}

function syncContent(source, mode) {
  $.ajax({
    url: WEBDIR + 'ombi/content_sync?source=' + source + '&mode=' + mode,
    type: 'post',
    dataType: 'text',
    success: function(result) {
      if (result != 'True') {
        notify('Ombi', 'Sync for ' + source + ' returned ' + result, 'error');
      } else {
        notify('Ombi', 'Sync for ' + source + ' initiated', 'success');
      }
    }
  });
}


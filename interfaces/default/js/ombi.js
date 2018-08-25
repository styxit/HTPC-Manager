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

        var row = $('<tr>');
        var summary = $('<i ombi-tip>').addClass('fa fa-info-circle').attr('title',movie.overview);
        if (movie.releaseDate == null) {
          var name = $('<a>').attr('href', 'https://www.themoviedb.org/movie/'+movie.theMovieDbId)
            .text(movie.title).attr('target','_blank');
          row.append($('<td>').html(name));
          row.append($('<td>'));
        } else {
          var name = $('<a>').attr('href', 'https://www.themoviedb.org/movie/'+movie.theMovieDbId)
            .text(movie.title+' ('+movie.releaseDate.substr(0,4)+')').attr('target','_blank');
          row.append($('<td>').append(summary).append('&nbsp;').append(name));
          row.append($('<td>').append( movie.digitalRelease ? 'Digital' : movie.status).append('<br />')
            .append( (movie.digitalRelease ? movie.digitalReleaseDate : movie.releaseDate).substr(0,10)));
        }
        var div_$i = ($('<div id="#mreq_menu_'+movie.theMovieDbId+'" class="span2 ombi_actions">'));
        if (movie.available) {
          div_$i.append( ( $('<button class="btn btn-ombi btn-danger" type="button">)').attr('title','Remove request')
            .append($('<i>').addClass('fa fa-minus fa-fw fa-slightlybigger')).append(' Remove &nbsp;')
            .click( function(){ombi_remove("movie",movie.id);} ) ) )
            .append('<br />')
            .append( ( $('<button class="btn btn-ombi btn-blue btn-ombiblue" type="button">)').attr('title','Mark Unavailable')
            .append($('<i>').addClass('fa fa-minus fa-fw fa-slightlybigger')).append(' Mark Unavailable &nbsp;')
            .click( function(){ombi_mark_unavailable("movie",movie.id);} ) ) );
          row.append( $('<td>').append($('<button class="btn btn-ombi btn-warning" type="button">)')
            .append( $('<i>').addClass('fa fa-list-ul fa-slightlybigger').attr('title','Request actions menu') )
              .click( function(){toggle_menu(div_$i);}) )
            .append(' Available').append( div_$i.attr('hidden',true) )
          );
        }
        else if (movie.approved) {
          div_$i.append( ( $('<button class="btn btn-ombi btn-danger" type="button">)').attr('title','Remove request')
            .append($('<i>').addClass('fa fa-minus fa-fw fa-slightlybigger')).append(' Remove &nbsp;')
            .click( function(){ombi_remove("movie",movie.id);} ) ) )
            .append('<br />')
            .append( ( $('<button class="btn btn-ombi btn-success" type="button">)').attr('title','Mark Available')
            .append($('<i>').addClass('fa fa-plus-square fa-fw fa-slightlybigger')).append(' Mark Available &nbsp;')
            .click( function(){ombi_mark_available("movie",movie.id);} ) ) );
          row.append( $('<td>').append($('<button class="btn btn-ombi btn-warning" type="button">)')
            .append( $('<i>').addClass('fa fa-list-ul fa-slightlybigger').attr('title','Request actions menu') )
              .click(function(){toggle_menu(div_$i);}) )
            .append(' Approved').append( div_$i.attr('hidden',true) )
          );
        }
        else {
          div_$i.append( ( $('<button class="btn btn-ombi btn-success" type="button">)').attr('title','Appprove request')
            .append($('<i>').addClass('fa fa-plus-square fa-fw fa-slightlybigger')).append(' Approve &nbsp;')
            .click( function(){ombi_approve("movie",movie.id);} ) ) )
            .append('<br />')
            .append( ( $('<button class="btn btn-ombi btn-danger" type="button">)').attr('title','Deny request')
            .append($('<i>').addClass('fa fa-times fa-fw fa-slightlybigger')).append(' Deny &nbsp;')
            .click( function(){ombi_deny("movie",movie.id);} ) ) )
            .append('<br />')
            .append( ( $('<button class="btn btn-ombi btn-danger" type="button">)').attr('title','Remove request')
            .append($('<i>').addClass('fa fa-minus fa-fw fa-slightlybigger')).append(' Remove &nbsp;')
            .click( function(){ombi_remove("movie",movie.id);} ) ) )
            .append('<br />')
            .append( ( $('<button class="btn btn-ombi btn-success" type="button">)').attr('title','Mark Available')
            .append($('<i>').addClass('fa fa-plus-square fa-fw fa-slightlybigger')).append(' Mark Available &nbsp;')
            .click( function(){ombi_mark_available("movie",movie.id);} ) ) );
          row.append( $('<td>').append($('<button class="btn btn-ombi btn-warning" type="button">)')
            .append( $('<i>').addClass('fa fa-list-ul fa-slightlybigger').attr('title','Request actions menu'))
              .click(function(){toggle_menu(div_$i);}) )
            .append(' Pending').append('<br />').append( div_$i.attr('hidden',true) )
          );
        }
        row.append(
          $('<td>').html(movie.requestedUser.alias).append('<br />')
          .append( movie.requestedDate.substr(0,16).replace('T',' ') )
        );
        $('#mrequests_table_body').append(row);
        i+=1;
      });
      $('#mrequests_table_body').parent().trigger('update');
      $('#mrequests_table_body').parent().trigger("sorton", [
        [
          [5, 1]
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
        var summary = $('<i ombi-tip>').addClass('fa fa-info-circle').attr('title',movie.overview);
        if (movie.releaseDate == null) {
          var name = $('<a>').attr('href', 'https://www.themoviedb.org/movie/'+movie.theMovieDbId)
            .text(movie.title).attr('target','_blank');
          row.append($('<td>').html(name));
          row.append($('<td>'));
        } else {
          var name = $('<a>').attr('href', 'https://www.themoviedb.org/movie/'+movie.theMovieDbId)
            .text(movie.title+' ('+movie.releaseDate.substr(0,4)+')').attr('target','_blank');
          row.append($('<td>').append(summary).append('&nbsp;').append(name));
          row.append($('<td>').append( ( $('<i>').addClass('fa fa-film fa-slightlybigger')))
            .append('&nbsp;').append('<nobr>'+movie.releaseDate.substr(0,10)+'<nobr>').attr('title','Theatre release'));
        }
        if (movie.available && movie.quality) {
          row.append( $('<td>').append('Available ').append( $('<span>')
            .html(movie.quality).addClass('label label-success label-ombi-quality')));
        }
        else if (movie.available) { row.append( $('<td>').append('Available') ); }
        else if (movie.approved) { row.append($('<td>').append('Processing')); }
        else if (movie.requested && !(movie.approved)) { row.append($('<td>').append('Pending Approval')); }
        else { 
          row.append($('<td>').append( ( $('<button class="btn btn-ombi btn-warning" type="button">)')
            .append($('<i>').addClass('fa fa-plus-square fa-fw fa-slightlybigger"')).append(' Request &nbsp;')
            .click( function(){ombi_mrequest(movie.theMovieDbId, hint, lookup);} ) ) ) );
        }
        row.append($('<td>').append( ( $('<button class="btn btn-ombi btn-blue btn-ombiblue" type="button">)')
          .append($('<i>').addClass('fa fa-eye fa-fw fa-slightlybigger')).append(' Similar &nbsp;')
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

function toggle_menu(div_id) {
  if (div_id.is(":hidden")) {
    $('.ombi_actions').hide();
    div_id.slideToggle("fast");
  } else {
    div_id.slideToggle("fast");
  }
}

function ombi_approve(ctype, id) {
  notify('ombi', 'Approve ' + ctype + ' request id ' + id, 'success');
  return true;
}

function ombi_deny(ctype, id) {
  notify('ombi', 'Deny ' + ctype + ' request id ' + id, 'info');
  return true;
}

function ombi_remove(ctype, id) {
  notify('ombi', 'Delete ' + ctype + ' request id ' + id, 'info');
  return true;
}

function ombi_mark_available(ctype, id) {
  notify('ombi', 'Mark available ' + ctype + ' request id ' + id, 'success');
  return true;
}

function ombi_mark_unavailable(ctype, id) {
  notify('ombi', 'Mark unavailable ' + ctype + ' request id ' + id, 'info');
  return true;
}

function ombi_mrequest(id, h, l) {
  var url = WEBDIR + 'ombi/request_movie?id='+id;
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


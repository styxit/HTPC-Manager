$(document).ready(function () {
  // moment().format();
  $(window).trigger('hashchange');

  // Todo: convert to use deferred() so that we only request an auth token once.
  loadFunctionMenu();
  loadMRequests();
  loadMSearch('popular', 'suggest');

  // Todo: Use below example to delay load of tabs
  // $('a[data-toggle="tab"]').click(function (e) {
  // }).on('shown', displaylog_tab);

  var searchMovieAction = function () {
    var query = $('#search_movie_name').val();
    if (query) {
      loadMSearch(query, 'search');
    }
  };
  $('#search_movie_button').click(searchMovieAction);
  $('#search_movie_name').keyup(function (event) {
    if (event.keyCode == 13) {
      searchMovieAction();
    }
  });

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
});

function loadMRequests(mreq_col=3, mreq_ord=1) {
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
      $.each(result, function (showname, movie) {
        var row = $('<tr>');
        var summaryicon = makeIcon('fa fa-info-circle fa-fw', movie.overview);
          var name = $('<a>').attr('href', 'https://www.themoviedb.org/movie/'+movie.theMovieDbId)
            .text(movie.title+' ('+movie.releaseDate.substr(0,4)+')').attr('target','_blank');
          row.append($('<td>').append(summaryicon).append('&nbsp;').append(name));
          row.append($('<td nowrap>').append( (movie.digitalRelease ? movie.digitalReleaseDate : movie.releaseDate).substr(0,10))
            .append('<br />').append( movie.digitalRelease ? 'Digital' : movie.status.replace('Post Production','Post Prod'))
            );
        var div_$i = ($('<div id="#mreq_menu_'+movie.theMovieDbId+'" class="span2 ombi-actions">'));
        if (movie.available) {
          div_$i.append( ( $('<button class="btn btn-ombi btn-danger" type="button">)').attr('title','Remove request')
            .append($('<i>').addClass('fa fa-minus fa-fw fa-slightlybigger')).append(' Remove &nbsp;')
            .click( function(){ombi_remove("movie",movie.id,loadMRequests,mreq_col,mreq_ord);} ) ) )
            .append('<br />')
            .append( ( $('<button class="btn btn-ombi btn-blue btn-ombiblue" type="button">)').attr('title','Mark Unavailable')
            .append($('<i>').addClass('fa fa-minus fa-fw fa-slightlybigger')).append(' Mark Unavailable &nbsp;')
            .click( function(){ombi_mark_unavailable("movie",movie.id,loadMRequests,mreq_col,mreq_ord);} ) ) );
          row.append( $('<td>').append($('<button class="btn btn-ombi btn-success" type="button">)').attr('title','Request actions menu')
              .click( function(){toggle_menu(div_$i);})
            .append(' Available ').append($('<i>').addClass('fa fa-chevron-down'))).append( div_$i.attr('hidden',true) )
          );
        }
        else if (movie.approved) {
          div_$i.append( ( $('<button class="btn btn-ombi btn-danger" type="button">)').attr('title','Remove request')
            .append($('<i>').addClass('fa fa-minus fa-fw fa-slightlybigger')).append(' Remove &nbsp;')
            .click( function(){ombi_remove("movie",movie.id,loadMRequests,mreq_col,mreq_ord);} ) ) )
            .append('<br />')
            .append( ( $('<button class="btn btn-ombi btn-success" type="button">)').attr('title','Mark Available')
            .append($('<i>').addClass('fa fa-plus-square fa-fw fa-slightlybigger')).append(' Mark Available &nbsp;')
            .click( function(){ombi_mark_available("movie",movie.id,loadMRequests,mreq_col,mreq_ord);} ) ) );
          row.append( $('<td nowrap>').append($('<button class="btn btn-ombi btn-ombiblue" type="button">)').attr('title','Request actions menu')
              .click(function(){toggle_menu(div_$i);})
            .append(' Processing ').append($('<i>').addClass('fa fa-chevron-down'))).append( div_$i.attr('hidden',true) )
          );
        }
        else if (movie.denied) {
          div_$i.append( ( $('<button class="btn btn-ombi btn-success" type="button">)').attr('title','Appprove request')
            .append($('<i>').addClass('fa fa-plus-square fa-fw fa-slightlybigger')).append(' Approve &nbsp;')
            .click( function(){ombi_approve("movie",movie.id,loadMRequests,mreq_col,mreq_ord);} ) ) )
            .append('<br />')
            .append( ( $('<button class="btn btn-ombi btn-danger" type="button">)').attr('title','Remove request')
            .append($('<i>').addClass('fa fa-minus fa-fw fa-slightlybigger')).append(' Remove &nbsp;')
            .click( function(){ombi_remove("movie",movie.id,loadMRequests,mreq_col,mreq_ord);} ) ) )
            .append('<br />')
            .append( ( $('<button class="btn btn-ombi btn-success" type="button">)').attr('title','Mark Available')
            .append($('<i>').addClass('fa fa-plus-square fa-fw fa-slightlybigger')).append(' Mark Available &nbsp;')
            .click( function(){ombi_mark_available("movie",movie.id,loadMRequests,mreq_col,mreq_ord);} ) ) );
          row.append( $('<td>').append($('<button class="btn btn-ombi btn-danger" type="button">)').attr('title','Request actions menu')
              .click(function(){toggle_menu(div_$i);})
            .append(' Denied ').append($('<i>').addClass('fa fa-chevron-down'))).append( div_$i.attr('hidden',true) )
          );
        }
        else { // "Requested"
          div_$i.append( ( $('<button class="btn btn-ombi btn-success" type="button">)').attr('title','Appprove request')
            .append($('<i>').addClass('fa fa-plus-square fa-fw fa-slightlybigger')).append(' Approve &nbsp;')
            .click( function(){ombi_approve("movie",movie.id,loadMRequests,mreq_col,mreq_ord);} ) ) )
            .append('<br />')
            .append( ( $('<button class="btn btn-ombi btn-danger" type="button">)').attr('title','Deny request')
            .append($('<i>').addClass('fa fa-times fa-fw fa-slightlybigger')).append(' Deny &nbsp;')
            .click( function(){ombi_deny("movie",movie.id,loadMRequests,mreq_col,mreq_ord);} ) ) )
            .append('<br />')
            .append( ( $('<button class="btn btn-ombi btn-danger" type="button">)').attr('title','Remove request')
            .append($('<i>').addClass('fa fa-minus fa-fw fa-slightlybigger')).append(' Remove &nbsp;')
            .click( function(){ombi_remove("movie",movie.id,loadMRequests,mreq_col,mreq_ord);} ) ) )
            .append('<br />')
            .append( ( $('<button class="btn btn-ombi btn-success" type="button">)').attr('title','Mark Available')
            .append($('<i>').addClass('fa fa-plus-square fa-fw fa-slightlybigger')).append(' Mark Available &nbsp;')
            .click( function(){ombi_mark_available("movie",movie.id,loadMRequests,mreq_col,mreq_ord);} ) ) );
          row.append( $('<td>').append($('<button class="btn btn-ombi btn-warning" type="button">)').attr('title','Request actions menu')
              .click(function(){toggle_menu(div_$i);})
            .append(' Pending ').append($('<i>').addClass('fa fa-chevron-down'))).append( div_$i.attr('hidden',true) )
          );
        }
        row.append(
          $('<td>').append( '<nobr>'+movie.requestedDate.substr(0,10)+'</nobr>' )
          .append('<br />').append(movie.requestedUser.alias)
        );
        $('#mrequests_table_body').append(row);
        i+=1;
      });
      $('#mrequests_table_body').parent().trigger('update');
      $('#mrequests_table_body').parent().on('sortEnd', function(event) {
          var s = '' + event.target.config.sortList + ''; // Had trouble typecasting this!
          var sp = s.split(",");
          mreq_col = sp[0];
          mreq_ord = sp[1];
      });
      $('#mrequests_table_body').parent().trigger("sorton", [
        [
          [mreq_col, mreq_ord]
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
        var summaryicon = makeIcon('fa fa-info-circle fa-fw', movie.overview);
        if (movie.releaseDate == null) {
          var name = $('<a>').attr('href', 'https://www.themoviedb.org/movie/'+movie.theMovieDbId)
            .text(movie.title).attr('target','_blank');
          row.append($('<td>').append(summaryicon).append('&nbsp;').append(name));
          row.append($('<td>'));
        } else {
          var name = $('<a>').attr('href', 'https://www.themoviedb.org/movie/'+movie.theMovieDbId)
            .text(movie.title+' ('+movie.releaseDate.substr(0,4)+')').attr('target','_blank');
          row.append($('<td>').append(summaryicon).append('&nbsp;').append(name));
          row.append($('<td nowrap>').append(movie.releaseDate.substr(0,10)));
        }
        if (movie.available && movie.quality) {
          row.append( $('<td>').append('Available ').append( $('<span>')
            .html(movie.quality).addClass('label label-success label-ombi-quality')));
        }
        else if (movie.available) { row.append( $('<td nowrap>').append('Available') ); }
        else if (movie.approved) { row.append($('<td>').append('Processing Request')); }
        else if (movie.requested && !(movie.approved)) { row.append($('<td>').append('Pending Approval')); }
        else { 
          row.append($('<td nowrap>').append( ( $('<button class="btn btn-ombi btn-warning" type="button">)')
            .append($('<i>').addClass('fa fa-plus-square fa-fw fa-slightlybigger"')).append(' Request &nbsp;')
            .attr('title','Request '+movie.title).click( function(){ombi_mrequest(movie.theMovieDbId, hint, lookup);} ) ) ) );
        }
        row.append($('<td nowrap>').append( ( $('<button class="btn btn-ombi btn-blue btn-ombiblue" type="button">)')
          .append($('<i>').addClass('fa fa-eye fa-slightlybigger')).append(' Similar')
          .attr('title','Look for movies similar to '+movie.title).click( function(){loadMSearch(movie.theMovieDbId);} ) ) ) );
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
  // $('.fmenu_plex').hide();
  // $('.fmenu_emby').hide();
  $.ajax({
    url: WEBDIR + 'ombi/get_plex_enabled',
    type: 'get',
    dataType: 'text',
    success: function(result) {
      if (result == 'True') {
        // $('.fmenu_plex').show();
        $('#sync_plex_part').click(function () {
          syncContent('plex', 'part');
        });
        $('#sync_plex_full').click(function () {
          syncContent('plex', 'full');
        });
      } else {
        $('.fmenu_plex').addClass('ombi-menu-disabled');
      }
    }
  });
  $.ajax({
    url: WEBDIR + 'ombi/get_emby_enabled',
    type: 'get',
    dataType: 'text',
    success: function(result) {
      if (result == 'True') {
        // $('.fmenu_emby').show();
        $('#sync_emby_full').click(function () {
          syncContent('emby', 'full');
        });
      } else {
        $('.fmenu_emby').addClass('ombi-menu-disabled');
      }
    }
  });
}

function toggle_menu(div_id) {
  // Collapses any open menus when opening another
  if (div_id.is(":hidden")) {
    $('.ombi-actions').hide();
    div_id.slideToggle("fast");
  } else {
    div_id.slideToggle("fast");
  }
}

function ombi_approve(ctype, id, fn, col, ord) {
  // Actions the menu action, and then reloads the tab while
  // retaining existing table sort order.
  if (ctype == 'movie') {
    ombi_maction(id, 'approve').done(function(res) {
      notify('Ombi', 'Approved', 'success'); // Approve action doesn't return a message.
      fn(col,ord);
      return;
    });
  }
}

function ombi_mark_available(ctype, id, fn, col, ord) {
  if (ctype == 'movie') {
    ombi_maction(id, 'available').done(function(res) {
      notify('Ombi', res, 'success');
      fn(col,ord);
      return;
    });
  }
}

function ombi_mark_unavailable(ctype, id, fn, col, ord) {
  if (ctype == 'movie') {
    ombi_maction(id, 'unavailable').done(function(res) {
      notify('Ombi', res, 'success');
      fn(col,ord);
      return;
    });
  }
}

function ombi_deny(ctype, id, fn, col, ord) {
  if (ctype == 'movie') {
    ombi_maction(id, 'deny').done(function(res) {
      notify('Ombi', res, 'info');
      fn(col,ord);
      return;
    });
  }
}

function ombi_remove(ctype, id, fn, col, ord) {
  if (ctype == 'movie') {
    ombi_mdelete(id, 'remove').done(function(res) {
      notify('Ombi', res, 'info');
      fn(col,ord);
      return;
    });
  }
}

function ombi_mrequest(id, h, l) {
  var u = WEBDIR + 'ombi/request_movie?id='+id;
  $.ajax({
    url: u,
    data: id,
    type: 'get',
    dataType: 'json',
    success: function(result) {
      if (!result.isError) {
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

function ombi_maction(id, action) {
  var u = WEBDIR + 'ombi/do_maction?id=' + id + '&action=' + action;
  // alert(u)
  var dfrd = $.Deferred();
  $.ajax({
    url: u,
    type: 'post',
    dataType: 'json',
    success: function(result) {
      if (result.isError) {
        dfrd.reject(false);
        notify('Ombi', 'API call failed for "' + id + ':' + action + '" returned: ' + result.errorMessage, 'error');
      } else {
        dfrd.resolve(result.message);
      }
    },
    error: function(data){
      notify('Failed to do ' + action , 'Bad web engine call: ' + data.status + ' ' + data.statusText, 'error');
      dfrd.reject(false);
    }
  });
  return dfrd.promise();
}

function ombi_mdelete(id, action) {
  // Delete is handled differently by the Ombi API, as there's no response message
  // and it seems to be text not json due to DELETE verb. Not 100% sure on that last point :) .
  var u = WEBDIR + 'ombi/do_maction?id=' + id + '&action=' + action;
  var dfrd = $.Deferred();
  $.ajax({
    url: u,
    type: 'post',
    dataType: 'text',
    success: function(result) {
      dfrd.resolve('Deleted successfully');
    },
    error: function(result){
      notify('Failed to do delete ', 'Bad web engine call: ' + result.status + ' ' + result.statusText, 'error');
      dfrd.reject('An error occured, check the logs');
    }
  });
  return dfrd.promise();
}


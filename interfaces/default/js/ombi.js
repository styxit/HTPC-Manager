/*jshint esversion: 6 */

$(document).ready(function () {
  // moment().format();
  $(window).trigger('hashchange');
  
  // Todo: convert to use deferred() so that we only request an auth token once.
  loadFunctionMenu();

  switch (decodeURIComponent(location.hash.substr(0))) {
    // Using hash values from URI strings is Bad(tm). It's a potential security
    // flaw and a wide-open vector for attempts.  We can't stop people trying to
    // inject things via the hash but we shouldn't act on them.  Never take the
    // raw value and do something with it, always use some sort of substr, case,
    // if-then that will break the javascript or requires specific values only.
    case "#mrequests_tab":
      loadMRequests();
      break;
    case "#msearch_tab":
      loadMSearch('popular', 'suggest');
      break;
    case "#tvrequests_tab":
      loadTVRequests2();
      break;
    case "#tvsearch_tab":
      loadTVSearch('popular', 'suggest');
      break;
    case "": // don't use case/default; see security disclaimer above.
      loadMRequests(); // load content for default tab
      break;
  }

// Action triggers for buttons etc
  
  // Tab contents to load when clicked rather than on page load
  $('a[href="#mrequests_tab"]').on('show.bs.tab', function (e) { loadMRequests(); });
  $('a[href="#msearch_tab"]').on('show.bs.tab', function (e) { loadMSearch('popular', 'suggest'); });
  $('a[href="#tvrequests_tab"]').on('show.bs.tab', function (e) { loadTVRequests2(); });
  $('a[href="#tvsearch_tab"]').on('show.bs.tab', function (e) { loadTVSearch('popular', 'suggest'); });

  $( document ).on( 'keydown', function ( e ) {
      if ( e.keyCode === 27 ) { // ESC
          close_menu();
      }
  });

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

  var searchTVAction = function () {
    var query = $('#search_tvshow_name').val();
    if (query) {
      loadTVSearch(query, 'search');
    }
  };
  $('#search_tvshow_button').click(searchTVAction);
  $('#search_tvshow_name').keyup(function (event) {
    if (event.keyCode == 13) {
      searchTVAction();
    }
  });

  $('#search_tvpopular_button').click(function () {
    loadTVSearch('popular', 'suggest');
  });

  $('#search_trending_button').click(function () {
    loadTVSearch('trending', 'suggest');
  });

  $('#search_mostwatched_button').click(function () {
    loadTVSearch('mostwatched', 'suggest');
  });

  $('#search_anticipated_button').click(function () {
    loadTVSearch('anticipated', 'suggest');
  });
});

// These functions allow quick access to the theme colors seeing as
// I can't figure out how to build many of my components with boostrap
// and have to build the color schemes myself.
// Functions with alert() in them aren't used yet.
function get_themePrimary() { alert('get_themePrimary'); return $(".navbar-inner").css("color"); }
function get_themePrimaryBG() { return $(".navbar-inner").css("background-color"); }
function get_themeActiveBG() { return shadeRGBColor(get_themePrimaryBG(),-0.5); }
function get_themeLinkColor() { alert('get_themeLinkColor'); return $(".dropdown-menu>li>a").css("color"); }
function get_themeBgColor() { return $("body").css("background-color"); }
function get_themeTextColor() { alert('get_themeTextColor'); return $("body").css("color"); }

function shadeRGBColor(color, percent) {
  // Props to: https://stackoverflow.com/questions/5560248
    var f=color.split(","),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=parseInt(f[0].slice(4)),G=parseInt(f[1]),B=parseInt(f[2]);
    return "rgb("+(Math.round((t-R)*p)+R)+","+(Math.round((t-G)*p)+G)+","+(Math.round((t-B)*p)+B)+")";
}

function doShowScroll(childReq, id) {
  $('.'+childReq).show();
  $('#'+id).get(0).scrollIntoView();
}

function loadMRequests(mreq_col=1, mreq_ord=1 ) {
  $('.spinner').show();
  $.ajax({
    url: WEBDIR + 'ombi/movie_requests',
    type: 'get',
    dataType: 'json',
    success: function (result) {
      $('#mrequests_table_body').empty();
      if (result == 'False') {
        var row = $('<tr>');
        row.append($('<td>').attr('colspan', '4').html('No movies found'));
        $('#mrequests_table_body').append(row);
        $('.spinner').hide();
        return false;
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
          row.append( $('<td nowrap>').append($('<button class="btn btn-ombi btn-success" type="button">)').attr('title','Request actions menu')
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
          row.append( $('<td nowrap>').append($('<button class="btn btn-ombi btn-warning" type="button">)').attr('title','Request actions menu')
              .click(function(){toggle_menu(div_$i);})
            .append(' Pending ').append($('<i>').addClass('fa fa-chevron-down'))).append( div_$i.attr('hidden',true) )
          );
        }
        row.append(
          $('<td>').append( '<nobr>'+movie.requestedDate.substr(0,10)+'</nobr>' )
          .append('<br />').append(movie.requestedUser.userAlias)
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
  var url = WEBDIR + 'ombi/get_searchresult?t=movie&q='+hint+'&l='+lookup;
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
        $('.spinner').hide();
        return false;
      }
      var i = 0;
      $.each(result, function (showname, movie) {
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

function loadTVRequests2(initial='') {
  $('.spinner').show();
  if (initial) {
    alert('Open overlay for request '+initial);
  }
  var url = WEBDIR + 'ombi/tv_requests';
  $.ajax({
    url: url,
    type: 'get',
    dataType: 'json',
    success: function (result) {
      $('#tvrequests2_table_body').empty();
      if (result == 'False' || result.length == 0) {
        var row = $('<tr>');
        row.append($('<td>').attr('colspan', '3').html('No TV shows found'));
        $('#tvrequests2_table_body').append(row);
        $('.spinner').hide();
        return false;
      }
      $('#tv_req_overlay').empty();
      $('#tv_req_overlay').css('background-color',get_themeBgColor()).css('border-color',get_themeActiveBG())
        .append( $('<button class="btn btn-small btn-ombi-close" name="close">')
          .attr('title','Esc to close').append( $('<li class="fa fa-times fa-fw fa-slightlybigger">') )
          .click( function(){ $('.ombi-tvshow-request').hide(); toggle_req_div($('#tv_req_overlay')); })
        );
      $.each(result, function (showix, show) {
        var showId = show.id;
        var summaryicon = makeIcon('fa fa-info-circle fa-fw', show.overview);
        if (show.releaseDate == null || show.releaseDate == "") {
          var name = show.title;
        } else {
          var name = show.title+' ('+show.releaseDate.substr(0,4)+')';
        }

        var req_show$showId = $('<div class="ombi-tvshow-request">')
          .attr('id','req_show'+showId);

        tv_req_form(req_show$showId, show);
          
        var row = $('<tr>');
        row.append($('<td>').append(summaryicon).append('&nbsp;')
          .append($('<a>').attr('href', 'https://www.imdb.com/title/'+show.imdbId)
            .text(name).attr('target','_blank')));
        row.append( $('<td>').append(show.status) );
        if (show.releaseDate == null || show.releaseDate == "") {
          row.append($('<td>').append('<!-- No date -->'));
        } else {
          row.append($('<td nowrap>').append(show.releaseDate.substr(0,10)));
        }
        row.append( $('<td nowrap>').addClass('ombi-btn-td')
          .append( $('<button class="btn btn-ombi btn-success" type="button">)')
            .append( $('<li>').addClass('fa fa-chevron-down fa-fw fa-slightlybigger"'))
            .append(' View').attr('title','View Request details for '+show.title)
            .click( function(){
              open_tv_req_panel(req_show$showId,show);
            } )
          )
        );

        $('#tvrequests2_table_body').append(row);
        $('#tv_req_overlay').append(req_show$showId);

      }); // each show

      $('.spinner').hide("slow");
      $('#tvrequests2_table_body').parent().trigger('update');
      $('#tvrequests2_table_body').parent().trigger("sorton", [
        [
          [2, 1]
        ]
      ]);
    },
    error: function (result) {
      $('.spinner').hide();
      notify('Ombi', 'Could not connect to Ombi, check your settings' + result, 'error');
    }
  });
}

function loadTVSearch(hint='popular', lookup='suggest') {
  $('.spinner').show();
  var url = WEBDIR + 'ombi/get_searchresult?t=tv&q='+hint+'&l='+lookup;
  $.ajax({
    url: url,
    type: 'get',
    dataType: 'json',
    success: function (result) {
      $('#tvsearch_table_body').empty();
      if (result == 'False' || result.length == 0) {
        var row = $('<tr>');
        row.append($('<td>').attr('colspan', '3').html('No TV shows found'));
        $('#tvsearch_table_body').append(row);
        $('.spinner').hide();
        return false;
      }
      $('#tv_newreq_overlay').empty();
      $('#tv_newreq_overlay').css('background-color',get_themeBgColor()).css('border-color',get_themeActiveBG())
        .append( $('<button class="btn btn-small btn-ombi-close" name="close">')
          .attr('title','Esc to close').append( $('<li class="fa fa-times fa-fw fa-slightlybigger">') )
          .click( function(){ $('.ombi-tvshow-request').hide(); toggle_req_div($('#tv_newreq_overlay')); })
        );
      $.each(result, function (showix, show) {
        var showId = show.id;
        var reqStatusAvail = get_extrainfo_key('tv',showId,'fullyAvailable');
        var summaryicon = makeIcon('fa fa-info-circle fa-fw', show.overview);
        if (show.firstAired == null || show.firstAired == "") {
          var name = show.title;
        } else {
          var name = show.title+' ('+show.firstAired.substr(0,4)+')';
        }

        var req_show$showId = $('<div class="ombi-tvshow-request">')
          .attr('id','req_show'+showId);

        tv_newreq_form(req_show$showId, show);
          
        var row = $('<tr>');
        row.append($('<td>').append(summaryicon).append('&nbsp;')
          .append($('<a>').attr('href', 'https://www.imdb.com/title/'+show.imdbId)
            .text(name).attr('target','_blank')));
        row.append( $('<td>').append(show.status) );
        if (show.firstAired == null || show.firstAired == "") {
          row.append($('<td>').append('<!-- No date -->'));
        } else {
          row.append($('<td nowrap>').append(show.firstAired.substr(0,10)));
        }
        var reqStatus = $('<td nowrap id="reqStatus'+showId+'">');
        reqStatus.addClass('ombi-btn-td');
        reqStatus.append( $('<button class="btn btn-ombi btn-warning" type="button">)')
          .append($('<li>').addClass('fa fa-plus fa-fw fa-slightlybigger"'))
          .append(' Request').attr('title','Request '+show.title)
        );
        row.append(reqStatus);
        reqKey = 'false'
        reqStatusAvail.done(function(reqKey) {
          if (reqKey == 'true') {
            reqStatus.empty();
            reqStatus.append('&nbsp;').append($('<li>')
              .addClass('fa fa-check fa-fw fa-slightlybigger"')).append('Available');
          } else {
            reqStatus.click( function(){
              open_tv_newreq_panel(req_show$showId,show);
            } )
          }
        });

        $('#tvsearch_table_body').append(row);
        $('#tv_newreq_overlay').append(req_show$showId);

      }); // each show

      $('.spinner').hide("slow");
      $('#tvsearch_table_body').parent().trigger('update');
    },
    error: function (result) {
      $('.spinner').hide();
      notify('Ombi', 'Could not connect to Ombi, check your settings' + result, 'error');
    }
  });
}

function tv_req_form(showDiv, reqInfo) {
  var dfrd = $.Deferred();

  var showId = reqInfo.tvDbId;
  if (reqInfo.releaseDate == null || reqInfo.releaseDate == "") { var name = reqInfo.title; }
    else { var name = reqInfo.title+' ('+reqInfo.releaseDate.substr(0,4)+')'; }

  showDiv.append( $('<h2>').append( $('<a>').append('<b>'+name+'</b>')
    .attr('href', 'https://www.imdb.com/title/'+reqInfo.imdbId).attr('target','_blank')
  ))
  .append(' &nbsp; <b>Show Status</b>: '+reqInfo.status)
  .append('<br /> &nbsp; <b>Release Date</b>: '+reqInfo.releaseDate.substr(0,10));

  var detailDfrd$showId = get_tv_details('request',reqInfo.id);
  detailDfrd$showId.done(function(detail) {
    
    var childReqAccordian = $('<div id="accordianTVReq'+showId+'">').addClass("accordion");

    $.each(detail.childRequests, function (childix, childReq) {
      var childReqFolds = $('<div class="accordion-group">');

      var childReqId = 'C'+childReq.id;
      var childReqTabs = $('<div class="accordion-heading">').css('margin-bottom','5px');
      var childReqContent = $('<div class="accordion-body collapse childReqTabs childReqTab'+showId+'" id="childReqTabContent'+childReqId+'">');

      var seasonReqTabs = $('<ul class="nav nav-tabs seasonReqTabUl">').css('margin-bottom','5px');
      var seasonContent = $('<div class="tab-content seasonReqTabContent" id="seasonReqTabContent'+showId+'">');
  
      $.each(childReq.seasonRequests, function (seasonix, season) {
        var seasonNum = 'S'+(('0'+season.seasonNumber).slice(-2));
        var seasonId = showId+'_'+seasonNum;
        
        var seasonReqTable = $('<tbody>');
        $.each(season.episodes, function (episodeix, episode) {
          var epNum = 'E'+(('0'+episode.episodeNumber).slice(-2));
          var epId = seasonId+'_'+epNum;
          var episodeStatus = 'Pending Approval';
          if (episode.approved) { episodeStatus = 'Processing Request'; }
          if (episode.available) { episodeStatus = 'Available'; }
          if (childReq.denied) { episodeStatus = 'Denied'; } // Episodes aren't individually marked as denied
          seasonReqTable.append( $('<tr>')
            .append( $('<td>').append(epNum))
            .append( $('<td>').append(episode.title))
            .append( $('<td>').append(episode.airDate.substr(0,10)))
            .append( $('<td id="eStatus_'+epId+'">').append(episodeStatus))
          );
        }); // each episode

        seasonReqTabs.append( $('<li class="seasonReqTabLi'+showId+' seasonReqTabLi'+childReqId+'">').append( $('<a data-toggle="tab">')
          .append(seasonNum)
          .click(function(){$('.seasonReqTab'+showId)
            .removeClass('active');$('#'+seasonId).addClass('active');})
          )
        );
        seasonContent.append( $('<div id="'+seasonId+'" class="tab-pane seasonTabs seasonReqTab'+showId+' seasonReqTab'+childReqId+'">')
          .append( $('<table class="table table-striped" style="margin-bottom: 0px;">')
            .append( $('<thead>')
              .append( $('<th>').append('#') )
              .append( $('<th>').append('Title') )
              .append( $('<th>').append('Aired') )
              .append( $('<th>').append('Status') )
            )
          .append(seasonReqTable)
          )
        );
      }); // each seasonreq

      var childReqStatus = $('<span id="cRStatus_'+childReqId+'">').html('Pending Approval');
      if (childReq.approved) { childReqStatus.html('Processing Request'); }
      if (childReq.available) { childReqStatus.html('Available'); }
      if (childReq.denied) { childReqStatus.html('Denied'); }
      
      var avBtnLabel = 'Available';
      var avBtnIcon = 'check';
      var avBtnType = 'success';
      if (childReq.available) {
        avBtnLabel = 'Unavailable';
        avBtnIcon = 'minus';
        avBtnType = 'ombiblue';
      }

      childReqTabs.append( $('<table width="100%">')
        .append( $('<tr>')
          .append( $('<td width="50%">')
            .append( $('<a class="accordion-toggle" data-toggle="collapse" data-parent="#accordianTVReq'+showId+'">')
              .append('<b>Request from:</b> '+childReq.requestedUser.userAlias+'<br />')
              .append('<b>Request state:</b> ').append(childReqStatus).append('<br />')
              .append(' &nbsp; ').append( $('<li id="childReqTabIcon'+childReqId+'" class="fa fa-chevron-down childReqTabIcon'+showId+'">') )
              .append(' Expand for details')
              .click(function(){
                $('.childReqTabIcon'+showId).removeClass('fa-chevron-up').addClass('fa-chevron-down');
                if ( $('#childReqTabContent'+childReqId).hasClass('in') ) {
                  $('.childReqTab'+showId).removeClass('in');
                } else {
                  $('.childReqTab'+showId).removeClass('in');
                  $('#childReqTabContent'+childReqId).addClass('in');
                  $('#childReqTabIcon'+childReqId).removeClass('fa-chevron-down').addClass('fa-chevron-up');
                  $('.seasonReqTabLi'+childReqId).first().addClass("active");
                  $('.seasonReqTab'+childReqId).first().addClass("active");
                }              
              })
            ) // <a>
          ) // <td>
          .append( $('<td width="50%" style="padding-top: 4px; text-align: right;">')
            .append( $('<div>')
              .append( $('<button id="cRBtnA_'+childReqId+'" class="btn btn-ombi btn-success">').css('margin-bottom','4px')
                .addClass(function(){if(!childReq.canApprove){return 'disabled';}})
                .prop('disabled',function(){return (!childReq.canApprove);})
                .append( $('<li class="fa fa-check">') ).append(' Approve')
                .click(function(){ombi_approve('tv', childReq.id, call_refresh_tv_req_form, reqInfo.id);}))
              .append( $('<button id="cRBtnB_'+childReqId+'" class="btn btn-ombi btn-'+avBtnType+'">').css('margin-bottom','4px')
                .append( $('<li class="fa fa-'+avBtnIcon+'">') ).append(' Mark '+avBtnLabel)
                .click( function(){ if (childReq.available) { ombi_mark_unavailable('tv', childReq.id, call_refresh_tv_req_form, reqInfo.id); }
                      else { ombi_mark_available('tv', childReq.id, call_refresh_tv_req_form, reqInfo.id); }}))
            ) // <div><btns>
            .append( $('<div>')
              .append( $('<button id="cRBtnC_'+childReqId+'" class="btn btn-ombi btn-danger">').css('margin-bottom','4px')
                .addClass(function(){if(childReq.denied){return 'disabled';}})
                .prop('disabled',function(){return (childReq.denied);})
                .append( $('<li class="fa fa-times">') ).append(' Deny')
                .click(function(){ombi_deny('tv', childReq.id, call_refresh_tv_req_form, reqInfo.id);}))
              .append( $('<button id="cRBtnD_'+childReqId+'" class="btn btn-ombi btn-danger">').css('margin-bottom','4px')
                .append( $('<li class="fa fa-times">') ).append(' Remove')
                .click(function(){ombi_remove('tv', childReq.id, close_menu);}))
            ) // <div><btns>
          ) // <td>
        ) // <tr>
      );

      childReqContent.append(
        $('<div class="accordion-inner">')
          .append(seasonReqTabs)
          .append(seasonContent)
      );
      
      childReqFolds.append(
        childReqTabs,
        childReqContent
      );
      
      childReqAccordian.append(childReqFolds);
      
    }); // each childreq

    showDiv.append(childReqAccordian);

    dfrd.resolve();
  }); // detailDfrd$showId.done function(detail)
  return dfrd.promise();
}

function tv_newreq_form(showDiv, showInfo) {
  var dfrd = $.Deferred();
  var sList = '';

  var showId = showInfo.id;
  if (showInfo.firstAired == null || showInfo.firstAired == "") { var name = showInfo.title; }
    else { var name = showInfo.title+' ('+showInfo.firstAired.substr(0,4)+')'; }

  showDiv.append( $('<h2>').append( $('<a>').append(name)
    .attr('href', 'https://www.imdb.com/title/'+showInfo.imdbId).attr('target','_blank')
  ));
  
  showDiv.append( $('<table width="100%">').append( $('<tr>').append( $('<td>')
    .append( $('<div class="btn-toolbar">').css('float','right')
    .append( $('<div class="btn-group">')
      .append( $('<button class="btn btn-warning btn-group-ombi">').css('margin-bottom','4px').append('<li class="fa fa-plus fa-fw"></li>All Seasons')
        .click(function(){ombi_tvrequest(showId,sList,'requestAll');}))
      .append( $('<button class="btn btn-warning btn-group-ombi">').css('margin-bottom','4px').append('<li class="fa fa-plus fa-fw"></li>First Season')
        .click(function(){ombi_tvrequest(showId,sList,'firstSeason');}))
      .append( $('<button class="btn btn-warning btn-group-ombi">').css('margin-bottom','4px').append('<li class="fa fa-plus fa-fw"></li>Last Season')
        .click(function(){ombi_tvrequest(showId,sList,'latestSeason');}))
    ).append( $('<button class="btn btn-warning btn-ombi">').css('margin-bottom','4px').css('margin-left','8px')
      .append('<li class="fa fa-plus fa-fw"></li> Selected')
        .click(function(){ombi_tvrequest(showId,sList,get_checks('cBox'+showId));}))
    )
  )));

  var seasonTabs = $('<ul class="nav nav-tabs">').css('margin-bottom','5px');
  var seasonContent = $('<div class="tab-content seasonTabContent" id="seasonTabContent'+showId+'">');

  var detailDfrd$showId = get_tv_details('search',showInfo.id);
  detailDfrd$showId.done(function(detail) {
    $.each(detail.seasonRequests, function (seasonix, season) {
      var seasonNum = 'S'+(('0'+season.seasonNumber).slice(-2));
      var seasonId = showId+'_'+seasonNum;
      if (Boolean(sList)) { sList += ','+season.seasonNumber; }
        else { sList = season.seasonNumber; }
      
      var seasonTable = $('<tbody>');
      $.each(season.episodes, function (episodeix, episode) {
        var epNum = 'E'+(('0'+episode.episodeNumber).slice(-2));
        var epId = seasonId+'_'+epNum;
        var episodeStatus = 'Not Requested';
        if (episode.requested) { episodeStatus = 'Pending Approval'; }
        if (episode.approved) { episodeStatus = 'Processing Request'; }
        if (episode.available) { episodeStatus = 'Available'; }
        if (episodeStatus != 'Not Requested') { var chkClass = 'disabled'; }
          else { var chkClass = 'cBox'+showId+' cBox'+seasonId; }
        seasonTable.append( $('<tr>')
          .append( $('<td>').append(epNum))
          .append( $('<td>').append(episode.title))
          .append( $('<td>').append(episode.airDate.substr(0,10)))
          .append( $('<td id="eStatus_'+epId+'">').append(episodeStatus))
          .append( $('<td>').append( $('<input type="checkbox" class="'+chkClass+'" id="eChk_'+epId+'" value="'+season.seasonNumber+'-'+episode.episodeNumber+'">')
            .prop("disabled", function(){ return (episodeStatus != 'Not Requested');} )))
        );
      }); // each episode

      seasonTabs.append( $('<li class="seasonTabLi'+showId+'">').append( $('<a data-toggle="tab">')
        .append(seasonNum)
        .click(function(){$('.seasonTab'+showId)
          .removeClass('active');$('#'+seasonId).addClass('active');})
        )
      );
      seasonContent.append( $('<div id="'+seasonId+'" class="tab-pane seasonTabs seasonTab'+showId+'">')
        .append( $('<table class="table table-striped" style="margin-bottom: 0px;">')
          .append( $('<thead>')
            .append( $('<th>').append('#') )
            .append( $('<th>').append('Title') )
            .append( $('<th>').append('Aired') )
            .append( $('<th>').append('Status') )
            .append( $('<th>').append( $('<input type="checkbox" id="m_cBox'+seasonId+'" class="m_cBox'+showId+'" value="masterCheck'+seasonId+'">')
        .css('margin','2px 0 0 0').click(function(){toggle_checks('cBox'+seasonId);}))
        ) )
        .append(seasonTable)
        )
      );

    }); // each season

  }); // detailDfrd$showId.done function(detail)
  
  showDiv.append( $('<div>').append(seasonTabs) );
  showDiv.append(seasonContent);
  
  return dfrd.promise();
}

function call_refresh_tv_req_form(id) {
  $('.spinner').show();
  var refreshDfrd$id = get_tv_details('request',id);
  refreshDfrd$id
    .done(function(detail) {refresh_tv_req_form(detail); });
}

function call_refresh_tv_newreq_form(id) {
  $('.spinner').show();
  var refreshDfrd$id = get_tv_details('search',id);
  refreshDfrd$id
    .done(function(detail) {refresh_tv_newreq_form(detail); });
}

function refresh_tv_req_form(detail) {
  var showId = detail.tvDbId;
    $.each(detail.childRequests, function (childix, childReq) {
      var childReqId = 'C'+childReq.id;
      $.each(childReq.seasonRequests, function (seasonix, season) {
        var seasonNum = 'S'+(('0'+season.seasonNumber).slice(-2));
        var seasonId = showId+'_'+seasonNum;
        $.each(season.episodes, function (episodeix, episode) {
          var epNum = 'E'+(('0'+episode.episodeNumber).slice(-2));
          var epId = seasonId+'_'+epNum;
          var episodeStatus = 'Pending Approval';
          if (episode.approved) { episodeStatus = 'Processing Request'; }
          if (episode.available) { episodeStatus = 'Available'; }
          if (childReq.denied) { episodeStatus = 'Denied'; } // Episodes aren't individually marked as denied
          $('#eStatus_'+epId).html(episodeStatus);
        }); // each episode
      }); // each seasonreq

      var childReqStatus = 'Pending Approval';
      if (childReq.approved) { childReqStatus = 'Processing Request'; }
      if (childReq.available) { childReqStatus = 'Available'; }
      if (childReq.denied) { childReqStatus = 'Denied'; }
      $('#cRStatus_'+childReqId).html(childReqStatus);
      
      var avBtnLabel = 'Available';
      var avBtnIcon = 'check';
      var avBtnType = 'success';
      if (childReq.available) {
        avBtnLabel = 'Unavailable';
        avBtnIcon = 'minus';
        avBtnType = 'ombiblue';
      }
      
      // Update 'Available' button
      if(childReq.canApprove){
        $('#cRBtnA_'+childReqId).removeClass('disabled');
        $('#cRBtnA_'+childReqId).prop('disabled',false);
      } else {
        $('#cRBtnA_'+childReqId).addClass('disabled');
        $('#cRBtnA_'+childReqId).prop('disabled',true);
      }
      
      // Remove attributes and recreate 'Mark Un/Available' button
      $('#cRBtnB_'+childReqId).removeClass('btn-ombiblue');
      $('#cRBtnB_'+childReqId).removeClass('btn-success');
      $('#cRBtnB_'+childReqId).off('click');
      $('#cRBtnB_'+childReqId).empty();
      $('#cRBtnB_'+childReqId).addClass('btn-'+avBtnType)
        .append( $('<li class="fa fa-'+avBtnIcon+'">') ).append(' Mark '+avBtnLabel)
        .click( function(){ if (childReq.available) { ombi_mark_unavailable('tv', childReq.id, call_refresh_tv_req_form, detail.id); }
          else { ombi_mark_available('tv', childReq.id, call_refresh_tv_req_form, detail.id); }});
      
      // Update 'Deny' button
      if(childReq.denied){
        $('#cRBtnC_'+childReqId).addClass('disabled');
        $('#cRBtnC_'+childReqId).prop('disabled',true);
      } else {
        $('#cRBtnC_'+childReqId).removeClass('disabled');
        $('#cRBtnC_'+childReqId).prop('disabled',false);
      }

    }); // each childreq
  $('.spinner').hide();
}

function refresh_tv_newreq_form(detail) {
  $.each(detail.seasonRequests, function (seasonix, season) {
    var seasonNum = 'S'+(('0'+season.seasonNumber).slice(-2));
    var seasonId = detail.id+'_'+seasonNum;
    $.each(season.episodes, function (episodeix, episode) {
      var epNum = 'E'+(('0'+episode.episodeNumber).slice(-2));
      var epId = seasonId+'_'+epNum;
      var episodeStatus = 'Not Requested';
      if (episode.requested) { episodeStatus = 'Pending Approval'; }
      if (episode.approved) { episodeStatus = 'Processing Request'; }
      if (episode.available) { episodeStatus = 'Available'; }
      if (episodeStatus != 'Not Requested') { var chkClass = 'disabled'; }
        else { var chkClass = 'cBox'+detail.id+' cBox'+seasonId; }
      $('#eStatus_'+epId).html(episodeStatus);
      $('#eChk_'+epId).prop("disabled", function(){return (episodeStatus != 'Not Requested');})
        .removeClass().addClass(chkClass);
      if ( $('#eChk_'+epId).prop("disabled") ) { $('#eChk_'+epId).prop("checked", false); }
    }); // each episode
  }); // each season
  $('.spinner').hide();
}

function get_extrainfo_key(ctype,cid,key) {
// Async fetcher for discrete keys to help display main tab contents
  var dfrd = $.Deferred();
  $.ajax({
    url: WEBDIR + 'ombi/get_extrainfo?t='+ctype+'&q='+cid+'&k='+key,
    type: 'get',
    dataType: 'text',
    success: function(result) {
      dfrd.resolve(result);
    }
  });
  return dfrd.promise();
}

function get_tv_details(rtype, id) {
// Async fetcher for TV details
// rtype should be 'request' or 'search'
  if (rtype != 'request' && rtype != 'search') { return false; }
  var dfrd = $.Deferred();
  $.ajax({
    url: WEBDIR + 'ombi/get_tvdetails/?id='+id+'&l='+rtype,
    type: 'get',
    dataType: 'json',
    success: function(result) {
      // alert('ajax result: Status = '+result.status);
      if (result) { dfrd.resolve(result); }
        else { dfrd.reject('API call returned nothing'); }
    },
    error: function(){
      dfrd.reject('API call returned nothing');
    }
  });
  return dfrd.promise();
}

function loadFunctionMenu() {
  $.ajax({
    url: WEBDIR + 'ombi/get_plex_enabled',
    type: 'get',
    dataType: 'json',
    success: function(result) {
      if (result == 'True') {
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
    dataType: 'json',
    success: function(result) {
      if (result == 'True') {
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
    $('.ombi-tvrequest-detail').css('visibility','hidden');
    // $('.ombi-tvrequest-detail').hide();
    div_id.slideDown("fast");
  } else {
    div_id.slideUp("fast");
  }
}

function toggle_req_div(div_id) {
  // Using :visibility instead of :display to minimise
  // reflow of page when adding scroll bar after opening div.
  if (div_id.css('visibility') == 'hidden') {
    close_menu();
    div_id.css('visibility','visible');
  } else {
    // ('.ombi-tvrequest-detail').css('visibility','hidden');
    close_menu();
  }
}

function open_tv_newreq_panel(id,showInfo) {
  var thisShow = showInfo.id;
  $('#tv_newreq_overlay').show();
  id.show();
  $('.seasonTabLi'+thisShow).removeClass("active");
  $('.seasonTabLi'+thisShow).first().addClass("active");
  $('.seasonTab'+thisShow).removeClass("active");
  $('.seasonTab'+thisShow).first().addClass("active");
  $('.cBox'+thisShow).prop("checked",false);
  $('.m_cBox'+thisShow).prop("checked",false);
  if (id.hasClass('ombi-tvshow-request')) {
    $('.seasonTab'+thisShow)
      .css('max-height',
        ($('#tv_newreq_overlay').height() - $('#seasonTabContent'+thisShow).position().top)+'px');
  }
}

function open_tv_req_panel(id,showInfo) {
  var thisShow = showInfo.tvDbId;
  $('#tv_req_overlay').show();
  id.show();
  $('.seasonReqTabLi'+thisShow).removeClass("active");
  $('.seasonReqTabLi'+thisShow).first().addClass("active");
  $('.seasonReqTab'+thisShow).removeClass("active");
  $('.seasonReqTab'+thisShow).first().addClass("active");
  $('.childReqTab'+thisShow).removeClass("in");
  $('.childReqTabIcon'+thisShow).removeClass('fa-chevron-up').addClass('fa-chevron-down');
  if (id.hasClass('ombi-tvshow-request')) {
    $('#accordianTVReq'+thisShow)
      .css('max-height',
        ($('#tv_req_overlay').height() - $('#accordianTVReq'+thisShow).position().top)+'px');
  }
}

function close_menu() {
  // Collapses any open menus
  $('.tvChildReqRows').hide();
  $('.ombi-actions').hide();
  $('.ombi-tvrequest-detail').css('visibility','hidden');
  $('.ombi-tvshow-request').hide();
  $('#tv_newreq_overlay').hide();
  $('#tv_req_overlay').hide();
}

function toggle_checks(sId) {
  $('#m_'+sId).change(function(){
    $('.'+sId).prop("checked",$(this).is(":checked"));
  });
}

function get_checks(classId) {
  // classId should NOT include the prefix '.'
  return $('input[type="checkbox"].'+classId+':checked')
    .map(function() {return this.value}).get().join(',');
}

function ombi_approve(ctype, id, fn, p1=0, p2=0) {
  // Actions the menu action, and then reloads the tab while
  // retaining existing table sort order (movies).
  if (ctype == 'movie') {
    ombi_maction(id, 'approve').done(function(res) {
      notify('Ombi', 'Approved', 'success'); // Approve action doesn't return a message.
      fn(p1,p2);
      return;
    });
  } else if (ctype == 'tv') {
    ombi_tvaction(id, 'approve').done(function(res) {
      notify('Ombi', 'Approved', 'success');
      fn(p1);
      return;
    });
  } else {
    notify('Ombi', 'Content type "'+ctype+'" not handled', 'error');
  }
}

function ombi_mark_available(ctype, id, fn, p1=0, p2=0) {
  if (ctype == 'movie') {
    ombi_maction(id, 'available').done(function(res) {
      notify('Ombi', res, 'success');
      fn(p1,p2);
      return;
    });
  } else if (ctype == 'tv') {
    ombi_tvaction(id, 'available').done(function(res) {
      notify('Ombi', res, 'success');
      fn(p1);
      return;
    });
  } else {
    notify('Ombi', 'Content type "'+ctype+'" not handled', 'error');
  }
}

function ombi_mark_unavailable(ctype, id, fn, p1=0, p2=0) {
  if (ctype == 'movie') {
    ombi_maction(id, 'unavailable').done(function(res) {
      notify('Ombi', res, 'success');
      fn(p1,p2);
      return;
    });
  } else if (ctype == 'tv') {
    ombi_tvaction(id, 'unavailable').done(function(res) {
      notify('Ombi', res, 'success');
      fn(p1);
      return;
    });
  } else {
    notify('Ombi', 'Content type "'+ctype+'" not handled', 'error');
  }
}

function ombi_deny(ctype, id, fn, p1=0, p2=0) {
  if (ctype == 'movie') {
    ombi_maction(id, 'deny').done(function(res) {
      notify('Ombi', res, 'info');
      fn(p1,p2);
      return;
    });
  } else if (ctype == 'tv') {
    ombi_tvaction(id, 'deny').done(function(res) {
      notify('Ombi', 'Request has been marked as denied', 'info');
      fn(p1);
      return;
    });
  } else {
    notify('Ombi', 'Content type "'+ctype+'" not handled', 'error');
  }
}

function ombi_remove(ctype, id, fn, p1=0, p2=0) {
  if (ctype == 'movie') {
    ombi_delete(ctype, id, 'remove').done(function(res) {
      notify('Ombi', res, 'info');
      fn(p1,p2);
      return;
    });
  } else if (ctype == 'tv') {
    ombi_delete(ctype, id, 'remove').done(function(res) {
      notify('Ombi', res, 'info');
      fn();
      return;
    });
  } else {
    notify('Ombi', 'Content type "'+ctype+'" not handled', 'error');
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

function ombi_tvrequest(id, slist, spec='false') {
// Wrapper to call actual function via deferred() and deal with results
  if (spec == 'false' || spec == '') { // no keyword, or no checkboxes checked lol
    notify('Ombi','Did you forget to check some boxes? Nothing to do..','error');
    return false;
  }
  $('.spinner').show();
  do_ombi_tvrequest(id, slist, spec)
    .done(function(res) {
      call_refresh_tv_newreq_form(id);
      notify('Request success ', res, 'success');
      return true;
    })
    .fail(function(res) {
      if (res) { notify('Failed to process request ', res, 'error'); }
        else { notify('Failed to process request ', 'Check logs for details', 'error'); }
      return false;
    });
}

function do_ombi_tvrequest(id, slist, spec='false') {
  if ( $.inArray(spec, ["requestAll","firstSeason","latestSeason"]) == -1 ) { // -1 = not matched
    var data = '&id='+id+
      '&slist='+slist+
      '&spec=selected'+
      '&sel='+spec;
  } else {
    var data = '&id='+id+
      '&slist='+slist+
      '&spec='+spec+
      '&sel=0'; // make sure we don't process any rogue checkbox selections if
                // one of the quick-select buttons are clicked
  }
  var dfrd = $.Deferred();
  var u = WEBDIR + 'ombi/request_tv';
  $.ajax({
    url: u,
    data: data,
    type: 'post',
    dataType: 'json',
    success: function(result) {
      if (result.isError) {
        dfrd.reject(result.errorMessage);
      } else if (result == 'False') {
        dfrd.reject('API call failed');
      } else {
        if (result.message) { dfrd.resolve(result.message); }
          else { dfrd.resolve(''); }
      }
    },
    error: function(){
      dfrd.reject(false);
    }
  });
  return dfrd.promise();
}

function syncContent(source, mode) {
  $.ajax({
    url: WEBDIR + 'ombi/content_sync?source=' + source + '&mode=' + mode,
    type: 'post',
    dataType: 'json',
    success: function(result) {
      if (result != true) {
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

function ombi_tvaction(id, action) {
  var u = WEBDIR + 'ombi/do_tvaction?id=' + id + '&action=' + action;
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
      notify('Failed to do "'+action+'"' , 'Bad web engine call: ' + data.status + ' ' + data.statusText, 'error');
      dfrd.reject(false);
    }
  });
  return dfrd.promise();
}

function ombi_delete(ctype, id, action) {
  // Delete is handled differently by the Ombi API, as there's no response message
  // and it seems to be text not json due to DELETE verb. Not 100% sure on that last point :) .
  if (ctype == 'movie') { var u = WEBDIR + 'ombi/do_maction?id=' + id + '&action=' + action; }
  if (ctype == 'tv') { var u = WEBDIR + 'ombi/do_tvaction?id=' + id + '&action=' + action; }
  var dfrd = $.Deferred();
  $.ajax({
    url: u,
    type: 'post',
    dataType: 'text',
    success: function(result) {
      dfrd.resolve('Removed request successfully');
    },
    error: function(result){
      notify('Failed to remove request ', 'Bad web engine call: ' + result.status + ' ' + result.statusText, 'error');
      dfrd.reject('An error occured, check the logs');
    }
  });
  return dfrd.promise();
}


$(document).ready(function () {
    var showid = $('h1.page-title').attr('data-showid');
    loadShowData(showid);
    $('#banner').css('background-image', 'url(' + WEBDIR + 'sickbeard/GetBanner/' + showid + ')');
});

function loadShowData(showid){
  $.ajax({
    url: WEBDIR + 'sickbeard/GetShow?tvdbid=' + showid,
    type: 'get',
    dataType: 'json',
    success: function(data){
      if (data.result != 'success') {
        notify('Error', 'Show not found.', 'error');
        return;
      }
      data = data.data;
      $('.sickbeard_showname').text(data.show_name);
      $('.sickbeard_status').append(sickbeardStatusLabel(data.status));
      $('.sickbeard_network').text(data.network);
      $('.sickbeard_location').text(data.location);
      $('.sickbeard_airs').text(data.airs);
      if (data.next_ep_airdate != '') {
        $('.sickbeard_next_air').text(data.next_ep_airdate);
      }

      renderSeasonTabs(showid, data.season_list);
    },
    error: function(){
        notify('Error', 'Error while loading show.', 'error');
    }
  });
}

function renderSeasonTabs(showid, seasons){
  list = $('#season-list');
  list.html('');

  $.each(seasons, function(index, seasonNr){
    var label = seasonNr;

    // Specials are marked as season 0
    if (label == 0) {
      label = 'Specials';
    }
    var pill = $('<li>').append(
      $('<a>')
        .text(label)
        .attr('href', '#'+seasonNr)
        .attr('data-season', seasonNr)
        .attr('data-showid', showid)
    );

    list.append(pill);
  });
  list.find('a').on('click', renderSeason);

  // Trigger latest season
 list.find('li:first-child a').trigger('click');
}


function renderSeason(){
  $('#season-list li').removeClass('active');
  $(this).parent().addClass("active");

  showid = $(this).attr('data-showid');
  season = $(this).attr('data-season');

  $.ajax({
    url: WEBDIR + 'sickbeard/GetSeason?tvdbid=' + showid + '&season=' + season,
    type: 'get',
    dataType: 'json',
    success: function(data){
      var seasonContent = $('#season-content');
      seasonContent.html(''); // Clear table contents before inserting new rows

      // If result is not 'succes' it must be a failure
      if (data.result != 'success') {
        notifyError('Error', 'This is not a valid season for this show');
        return;
      }

      // Loop through data
      $.each(data.data, function(index, value){
        var row = $('<tr>');

        var search_link = $('<a>').addClass('btn btn-mini').attr('title', 'Search new download').append($('<i>').addClass('icon-search')).on('click', function(){
          searchEpisode(showid, season, index, value.name);
        });

        row.append(
          $('<td>').text(index),
          $('<td>').text(value.name),
          $('<td>').text(value.airdate),
          $('<td>').append(sickbeardStatusLabel(value.status)),
          $('<td>').text(value.quality),
          $('<td>').append(search_link)
        );
        seasonContent.append(row);
      }); // end loop

      // Trigger tableSort update
      seasonContent.parent().trigger("update");
      seasonContent.parent().trigger("sorton",[[[0,1]]]);
    },
    error: function(){
        notify('Error', 'Error while loading season.', 'error');
    }
  });
}

function sickbeardStatusLabel(text){
  var statusOK = ['Continuing', 'Downloaded', 'HD'];
  var statusInfo = ['Snatched', 'Unaired'];
  var statusError = ['Ended'];
  var statusWarning = ['Skipped'];

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

  var icon = sickbeardStatusIcon(text, true);
  if (icon != '') {
    label.prepend(' ').prepend(icon);
  }
  return label;
}

function sickbeardStatusIcon(iconText, white){
  var text =[
    'Downloaded',
    'Continuing',
    'Snatched',
    'Unaired',
    'Archived',
    'Skipped'
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

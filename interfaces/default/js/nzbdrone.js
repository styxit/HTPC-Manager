$(document).ready(function () {
    $(window).trigger('hashchange')
    loadShows();
    //loadNextAired();
    //loadSickbeardHistory(25);
    //loadLogs();

    $('#add_show_button').click(function () {
        $(this).attr('disabled', true);
        //searchTvDb($('#add_show_name').val())
    });

    $('#add_tvdbid_button').click(function () {
        addShow($('#add_show_select').val());
    });

    $('#cancel_show_button').click(function () {
        //cancelAddShow();
    });

});

function loadShows() {
    $.ajax({
        url: WEBDIR + 'nzbdrone/Series',
        type: 'get',
        dataType: 'json',
        success: function (result) {
            if (result.length == 0) {
                var row = $('<tr>')
                row.append($('<td>').html('No shows found'));
                $('#tvshows_table_body').append(row);
            }
            $.each(result, function (showname, tvshow) {
                console.log(result)
                var name = $('<a>').attr('href',WEBDIR + 'nzbdrone/Series/' + tvshow.tvdbid).text(tvshow.title);
                var row = $('<tr>')
                row.append(
                  $('<td>').html(name),
                  $('<td>').html(nzbdroneStatusLabel(tvshow.status)),
                  $('<td>').html(tvshow.next_ep_airdate),
                  $('<td>').html(tvshow.network),
                  $('<td>').html(nzbdroneStatusLabel(tvshow.qualityProfileId))
                );
                $('#tvshows_table_body').append(row);
            });
            $('#tvshows_table_body').parent().trigger('update');
            $('#tvshows_table_body').parent().trigger("sorton",[[[0,0]]]);
        }
    });
}

function nzbdroneStatusIcon(iconText, white){
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
function nzbdroneStatusLabel(text){
  var statusOK = ['Continuing', 'Downloaded', 'HD'];
  var statusInfo = ['Snatched'];
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

  var icon = nzbdroneStatusIcon(text, true);
  if (icon != '') {
    label.prepend(' ').prepend(icon);
  }
  return label;
}
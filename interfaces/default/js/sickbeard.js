$(document).ready(function () {
    $(window).trigger('hashchange')
    loadShows();
    loadNextAired();
    loadSickbeardHistory(25);
    loadLogs();

    $('#add_show_button').click(function () {
        $(this).attr('disabled', true);
        searchTvDb($('#add_show_name').val())
    });

    $('#add_tvdbid_button').click(function () {
        addShow($('#add_show_select').val());
    });

    $('#cancel_show_button').click(function () {
        cancelAddShow();
    });

});

function loadShows() {
    $.ajax({
        url: WEBDIR + 'sickbeard/GetShowList',
        type: 'get',
        dataType: 'json',
        success: function (result) {
            if (result.data.length == 0) {
                var row = $('<tr>')
                row.append($('<td>').html('No shows found'));
                $('#tvshows_table_body').append(row);
            }
            $.each(result.data, function (showname, tvshow) {
                var name = $('<a>').attr('href',WEBDIR + 'sickbeard/view/' + tvshow.tvdbid).text(showname);
                var row = $('<tr>')
                row.append(
                  $('<td>').html(name),
                  $('<td>').html(sickbeardStatusLabel(tvshow.status)),
                  $('<td>').html(tvshow.next_ep_airdate),
                  $('<td>').html(tvshow.network),
                  $('<td>').html(sickbeardStatusLabel(tvshow.quality))
                );
                $('#tvshows_table_body').append(row);
            });
            $('#tvshows_table_body').parent().trigger('update');
            $('#tvshows_table_body').parent().trigger("sorton",[[[0,0]]]);
        }
    });
}

function loadShow(tvdbid) {
    $.ajax({
        url: WEBDIR + 'sickbeard/GetShow?tvdbid=' + tvdbid,
        type: 'get',
        dataType: 'json',
        success: function (data) {
            data = data.data;

            var table = $('<table>');
            table.addClass('table table-bordered table-striped table-condensed');

            row = $('<tr>');
            row.append('<th>Status</th><td>' + data.status + '</td>');
            table.append(row);

            row = $('<tr>');
            row.append('<th>Airs</th><td>' + data.airs + '</td>');
            table.append(row);

            row = $('<tr>');
            row.append('<th>Language</th><td>' + data.language + '</td>');
            table.append(row);

            row = $('<tr>');
            row.append('<th>Location</th><td>' + data.location + '</td>');
            table.append(row);

            row = $('<tr>');
            row.append('<th>Quality</th><td>' + data.quality + '</td>');
            table.append(row);

            row = $('<tr>');
            row.append('<th>Network</th><td>' + data.network + '</td>');
            table.append(row);

            modalContent = $('<div>');
            modalContent.append(
              $('<img>').attr('src', WEBDIR + 'sickbeard/GetBanner/'+tvdbid).addClass('img-rounded'),
              $('<hr>'),
              table
             );

            var modalButtons = {
              'Show' : function() {
                window.location = WEBDIR + 'sickbeard/view/' + tvdbid;
              }
            }

            showModal(data.show_name, modalContent, modalButtons);
        }
    });
}

function loadNextAired(options) {
    var defaults = {
       limit : 0
    };
    $.extend(defaults, options);

    $.ajax({
        url: WEBDIR + 'sickbeard/GetNextAired',
        type: 'get',
        dataType: 'json',
        success: function (result) {
            // If sickbeard not configured, return false (Dashboard)
            if (result == null) return false;

            if (result.data.soon.length == 0) {
                var row = $('<tr>')
                row.append($('<td>').html('No future episodes found'));
                $('#nextaired_table_body').append(row);
                return false;
            }

            var soonaired = result.data.soon;
            var todayaired = result.data.today;
            var nextaired = todayaired.concat(soonaired);
            var lateraired = result.data.later;

            // Loop next airing episodes
            $.each(nextaired, function (i, tvshow) {
                if (defaults.limit != 0 && i == defaults.limit) {
                    return false;
                }
                var row = $('<tr>');
                var name = $('<a>').attr('href','#').html(tvshow.show_name).click(function(e){
                    loadShow(tvshow.tvdbid);
                });

                row.append(
                  $('<td>').append(name),
                  $('<td>').html(tvshow.ep_name),
                  $('<td>').html(tvshow.airdate)
                );

                $('#nextaired_table_body').append(row);
            });

            // Loop later airing episodes
            $.each(lateraired, function (i, tvshow) {
                if (defaults.limit != 0 && i == defaults.limit) {
                    return false;
                }
                var row = $('<tr>');
                var name = $('<a>').attr('href','#').html(tvshow.show_name).click(function(e){
                    loadShow(tvshow.tvdbid);
                });

                row.append(
                  $('<td>').append(name),
                  $('<td>').html(tvshow.ep_name),
                  $('<td>').html(tvshow.airdate)
                );

                $('#nextaired_table_body').append(row);
            });

            $('#nextaired_table_body').parent().trigger('update');
        }
    });
}

function loadSickbeardHistory(limit) {
    $.ajax({
        url: WEBDIR + 'sickbeard/GetHistory?limit=' + limit,
        type: 'get',
        dataType: 'json',
        success: function (result) {
            if (result.data.legth == 0) {
                var row = $('<tr>')
                row.append($('<td>').html('History is empty'));
                $('#history_table_body').append(row);
            }

            $.each(result.data, function (tvdbid, tvshow) {
                var row = $('<tr>');
                row.append(
                  $('<td>').html(tvshow.date),
                  $('<td>').append($('<a>').text(tvshow.show_name).attr('href', WEBDIR + 'sickbeard/view/'+tvshow.tvdbid)),
                  $('<td>').html(tvshow.season + 'x' + tvshow.episode),
                  $('<td>').append(sickbeardStatusLabel(tvshow.status)),
                  $('<td>').html(tvshow.quality)
                );

                $('#history_table_body').append(row);
            });
            $('#history_table_body').parent().trigger('update');
        }
    });
}

function loadLogs() {
    $.ajax({
        url: WEBDIR + 'sickbeard/GetLogs',
        type: 'get',
        dataType: 'json',
        success: function (result) {
            if (result.data.legth == 0) {
                var row = $('<tr>')
                row.append($('<td>').html('Log is empty'));
                $('#log_table_body').append(row);
            }
            $.each(result.data, function (i, logitem) {
                var row = $('<tr>');
                row.append($('<td>').html(logitem));
                $('#log_table_body').append(row);
            });
        }
    });
}

function searchTvDb(query) {
    $.ajax({
        url: WEBDIR + 'sickbeard/SearchShow?query=' + query,
        type: 'get',
        dataType: 'xml',
        success: function (result) {
            series = $(result).find('Series');
            if (series.length == 0) {
                $('#add_show_button').attr('disabled', false);
                return;
            }
            $('#add_show_select').html('');
            series.each(function() {
                var tvdbid = $(this).find('seriesid').text();
                var showname = $(this).find('SeriesName').text();
                var language = $(this).find('language').text();
                var option = $('<option>');
                option.attr('value', tvdbid);
                option.html(showname + ' (' + language + ')');
                $('#add_show_select').append(option);
            });
            $('#add_show_name').hide();
            $('#cancel_show_button').show();
            $('#add_show_select').fadeIn();
            $('#add_show_button').attr('disabled', false).hide();
            $('#add_tvdbid_button').show();
        }
    });
}

function addShow(tvdbid) {
    $.ajax({
        url: WEBDIR + 'sickbeard/AddShow?tvdbid=' + tvdbid,
        type: 'get',
        dataType: 'json',
        success: function (data) {
            notify('Add TV show',data.message,'success');
            cancelAddShow();
        }
    });
}

function cancelAddShow() {
    $('#add_show_name').val('');
    $('#add_show_select').hide();
    $('#cancel_show_button').hide();
    $('#add_show_name').fadeIn();
    $('#add_tvdbid_button').hide();
    $('#add_show_button').show();
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

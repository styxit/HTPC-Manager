function loadShows() {
    $.ajax({
        url: '/sickbeard/GetShowList',
        type: 'get',
        dataType: 'json',
        success: function (result) {
            if (result.data.legth == 0) {
                var row = $('<tr>')
                row.append($('<td>').html('No shows found'));
                $('#tvshows_table_body').append(row);
            }
            $.each(result.data, function (showname, tvshow) {
                var name = $('<a>').attr('href','#').html(showname).click(function(e){
                    loadShow(tvshow.tvdbid);
                });

                var row = $('<tr>')
                row.append($('<td>').html(name));
                row.append($('<td>').html(tvshow.status));
                row.append($('<td>').html(tvshow.next_ep_airdate));
                row.append($('<td>').html(tvshow.network));
                row.append($('<td>').html(tvshow.quality));

                $('#tvshows_table_body').append(row);
            });

            $('#tvshows_table_body').parent().trigger('update');
        }
    });
}


function loadShow(tvdbid) {
    $.ajax({
        url: '/sickbeard/GetShow?tvdbid=' + tvdbid,
        type: 'get',
        dataType: 'json',
        success: function (data) {
            data = data.data;

            var table = $('<table>');
            table.addClass('table table-bordered table-striped');

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

            showModal(data.show_name, table, {});
        }
    });
}

function loadNextAired(options) {
    var defaults = {
       limit : 0
    };
    $.extend(defaults, options);

    $.ajax({
        url: '/sickbeard/GetNextAired',
        type: 'get',
        dataType: 'json',
        success: function (result) {
            // If sickbeard not configured, return false (Dashboard)
            if (result == null) return false;

            if (result.data.soon.legth == 0) {
                var row = $('<tr>')
                row.append($('<td>').html('No future episodes found'));
                $('#nextaired_table_body').append(row);
                return false;
            }

            var soonaired = result.data.soon;
            var todayaired = result.data.today;
            var nextaired = todayaired.concat(soonaired);

            $.each(nextaired, function (i, tvshow) {
                if (defaults.limit != 0 && i == defaults.limit) {
                    return false;
                }
                var row = $('<tr>');
                episode = shortenText(tvshow.ep_name, 15);
                episodeLong = tvshow.season+'x'+tvshow.episode+' - '+tvshow.ep_name
                row.append($('<td>').html(tvshow.show_name));
                row.append($('<td>').html(episode).attr('title',episodeLong));
                row.append($('<td>').html(tvshow.airdate));

                $('#nextaired_table_body').append(row);
            });

            $('#nextaired_table_body').parent().trigger('update');
        }
    });
}

function loadSickbeardHistory(limit) {
    $.ajax({
        url: '/sickbeard/GetHistory?limit=' + limit,
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
                row.append($('<td>').html(tvshow.date));
                row.append($('<td>').html(tvshow.show_name));
                row.append($('<td>').html(tvshow.season + 'x' + tvshow.episode));
                row.append($('<td>').html(tvshow.status));
                row.append($('<td>').html(tvshow.quality));

                $('#history_table_body').append(row);
            });
            $('#history_table_body').parent().trigger('update');
        }
    });
}

function loadLogs() {
    $.ajax({
        url: '/sickbeard/GetLogs',
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
        url: '/sickbeard/SearchShow?query=' + query,
        type: 'get',
        dataType: 'xml',
        success: function (result) {
            series = $(result).find('Series');

            if (series.length == 0) {
                $('#add_show_button').attr('disabled', false)
                // TODO nog een error message tonen
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
        url: '/sickbeard/AddShow?tvdbid=' + tvdbid,
        type: 'get',
        dataType: 'json',
        success: function (data) {
            alert(data.message);
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

function loadShows() {
    $.ajax({
        url: '/json/?which=sickbeard&action=showlist',
        type: 'get',
        dataType: 'json',
        success: function (result) {

            if (result.data.legth == 0) {
                var row = $('<tr>')
                row.append($('<td>').html('No shows found'));
                $('#tvshows_table_body').append(row);
            }
            $.each(result.data, function (tvdbid, tvshow) {

                var infoIcon = $('<i>');
                infoIcon.addClass('icon-info-sign');
                infoIcon.css('cursor', 'pointer');
                infoIcon.click(function () {
                    loadShow(tvdbid);
                });

                var row = $('<tr>')
                row.append($('<td>').html(tvshow.show_name));
                row.append($('<td>').html(tvshow.status));
                row.append($('<td>').html(tvshow.next_ep_airdate));
                row.append($('<td>').html(tvshow.network));
                row.append($('<td>').html(tvshow.quality));
                row.append($('<td>').append(infoIcon));

                $('#tvshows_table_body').append(row);

            });

        }
    });
}

function loadShow(tvdbid) {
    $.ajax({
        url: '/json/?which=sickbeard&action=getshow&tvdbid=' + tvdbid,
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

            showModal(this, data.show_name, table, {});
        }
    });
}

function loadNextAired() {
    $.ajax({
        url: '/json/?which=sickbeard&action=nextaired',
        type: 'get',
        dataType: 'json',
        success: function (result) {

            if (result.data.soon.legth == 0) {
                var row = $('<tr>')
                row.append($('<td>').html('No future episodes found'));
                $('#nextaired_table_body').append(row);
            }

            $.each(result.data.soon, function (tvdbid, tvshow) {

                var row = $('<tr>');
                row.append($('<td>').html(tvshow.show_name));
                row.append($('<td>').html(tvshow.season + 'x' + tvshow.episode + ' - ' + tvshow.ep_name));
                row.append($('<td>').html(tvshow.airdate));

                $('#nextaired_table_body').append(row);

            });

        }
    });
}

function loadHistory(limit) {
    $.ajax({
        url: '/json/?which=sickbeard&action=history&limit=' + limit,
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

        }
    });
}

function loadLogs() {
    $.ajax({
        url: '/json/?which=sickbeard&action=logs',
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
        url: '/json/?which=sickbeard&action=searchtvdb&query=' + query,
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
        url: '/json/?which=sickbeard&action=addshow&tvdbid=' + tvdbid,
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


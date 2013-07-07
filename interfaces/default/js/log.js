$(document).ready(function () {
    $('#logsize, #loglevel').change(loadLog);
    $('#refreshlog, #deletelog').click(loadLog);
    loadLog();
});

function loadLog () {
    $.ajax({
        url: WEBDIR + 'log/getlog',
        data: {
            lines: $('#logsize').val(),
            level: $('#loglevel').val()
        },
        type: 'get',
        dataType: 'json',
        success: function (data) {
            $('#log-grid tbody').empty();
            if (data == null) return false;
            $.each(data, function (r, row) {
                var tr = $('<tr>')
                $.each(row, function (c, column) {
                    var td = $('<td>').text(column);
                    tr.append(td);
                });
                $('#log-grid tbody').append(tr);
            });
            $('#log-grid tbody').trigger('update')
        }
    });
}
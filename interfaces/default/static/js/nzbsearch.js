
function searchNzbs(query) {
    $.ajax({
        url: '/json/?which=nzbsearch&query=' + query,
        type: 'get',
        dataType: 'json',
        success: function (data) {

            if (data === null) {
                return;
            }

            $('#results_table_body').html('');

            $.each(data, function (i, item) {

                if (item.NZBNAME == undefined) {
                    return;
                }

                var row = $('<tr>');

                row.append($('<td>').html(item.NZBNAME));
                row.append($('<td>').html(item.CATEGORY));
                row.append($('<td>').html(item.HITS));
                row.append($('<td>').html(item.SIZE / 1024));

                var toSabIcon = $('<i>');
                toSabIcon.addClass('icon-download-alt');
                toSabIcon.css('cursor', 'pointer');
                toSabIcon.click(function() {
                    $.ajax({
                        url: '/json/?which=sabnzbd&action=addnzb',
                        type: 'post',
                        dataType: 'json',
                        data: {
                            nzb_url: 'http://nzbmatrix.com/nzb-download.php?id=' + item.NZBID + '&nozip=1'
                        },
                        success: function (result) {
                            console.log(result);
                        }
                    });
                });

                row.append($('<td>').append(toSabIcon));

                $('#results_table_body').append(row)

            });

        }
    });
}

$(document).ready(function () {
    $('#search_nzb_button').click(function () {
        searchNzbs($('#search_query').val());
    });
});
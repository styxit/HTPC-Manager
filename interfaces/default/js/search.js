function getCategories() {
    $.ajax({
        url: '/search/getNzbMatrixCategories',
        type: 'get',
        dataType: 'json',
        success: function (data) {
            if (data == null) return false;

            $('#catid').html('');
            $.each(data, function (i, item) {
                if (item.id != undefined) {
                    var option = $('<option>').html(item.name);
                    option.attr("value",item.id)
                    $('#catid').append(option)
                } else {
                    var optgroup = $('<optgroup>');
                    optgroup.attr('label', item.label);
                    $.each(item.value, function (i, item) {
                        var option = $('<option>').html(item.name);
                        option.attr("value",item.id)
                        optgroup.append(option)
                    });
                    $('#catid').append(optgroup)
                }
            });
        }
    });
}

function sendToSab(nzbid) {
    return $.ajax({
        url: '/sabnzbd/AddNzbFromUrl',
        type: 'post',
        dataType: 'json',
        data: {
            nzb_url: 'http://nzbmatrix.com/nzb-download.php?id=' + nzbid
        },
        success: function (result) {
            return true;
        }
    });
}

function getDetails(nzbid) {
    $.ajax({
        url: '/search/?nzbid='+nzbid,
        type: 'get',
        dataType: 'json',
        success: function (data) {
            if (data === null) return

            var modalTitle = data[0].NZBNAME

            var modalPoster = $('<img>');
            modalPoster.css('height', '150px');
            modalPoster.css('width', '100px');
            modalPoster.attr('src', data[0].IMAGE);

            var modalLeft = $('<td>');
            modalLeft.append(modalPoster);
            modalLeft.css('width', '100px');

            var modalMiddle = $('<td>');
            modalMiddle.append($('<h6>').text('Category'));
            modalMiddle.append($('<p>').text(data[0].CATEGORY));
            modalMiddle.append($('<h6>').text('Language'));
            modalMiddle.append($('<p>').text(data[0].LANGUAGE));
            modalMiddle.append($('<h6>').text('Size'));
            modalMiddle.append($('<p>').text(bytesToSize(data[0].SIZE)));
            modalMiddle.append($('<h6>').text('Hits'));
            modalMiddle.append($('<p>').text(data[0].HITS));
            modalMiddle.append($('<h6>').text('Comments'));
            modalMiddle.append($('<p>').text(data[0].COMMENTS));
            var modalRight = $('<td>');
            modalRight.append($('<h6>').text('Added to Usenet'));
            modalRight.append($('<p>').text(data[0].USENET_DATE));
            modalRight.append($('<h6>').text('Added to Index'));
            modalRight.append($('<p>').text(data[0].INDEX_DATE));
            modalRight.append($('<h6>').text('Parts'));
            modalRight.append($('<p>').text(data[0].PARTS));
            modalRight.append($('<h6>').text('Group'));
            modalRight.append($('<p>').text(data[0].GROUP));

            var row = $('<tr>');
            row.append(modalLeft);
            row.append(modalMiddle);
            row.append(modalRight);

            var modalTable = $('<table>');
            modalTable.addClass('table table-bordered');
            modalTable.append(row);

            showModal(modalTitle, modalTable, {
                'IMDb' : function () {
                    window.open(data[0].LINK,'IMDb')
                },
                'Download' : function () {
                    sendToSab(nzbid)
                    hideModal();
                }
            })
        }
    });
}

function searchNzbs(query, catid) {
    $.ajax({
        url: '/search/?query='+query+'&catid='+catid,
        type: 'get',
        dataType: 'json',
        beforeSend: function () {
            $('#results_table_body').empty();
            $('#show-loader').show();
        },
        success: function (data) {
            if (data === null) return
            $.each(data, function (i, item) {
                if (item.NZBNAME == undefined) return

                var row = $('<tr>');
                var itemlink = $('<a>').attr('href','#').text(item.NZBNAME).click(function(){
                    getDetails(item.NZBID);
                });
                row.append($('<td>').append(itemlink));
                var cat = item.CATEGORY.replace(' >',':')
                var catlink = $('<a>').attr('href','#').text(cat).click(function(){
                    $('#catid option:contains("'+cat+'")').attr('selected', 'selected');
                    searchNzbs($('#search_query').val(), $('#catid').val());
                });
                row.append($('<td>').append(catlink));
                row.append($('<td>').addClass('right').html(item.HITS));
                row.append($('<td>').addClass('right').html(bytesToSize(item.SIZE, 2)));

                var toSabIcon = $('<i>');
                toSabIcon.addClass('icon-download-alt');
                toSabIcon.css('cursor', 'pointer');
                toSabIcon.click(function() {
                    sendToSab(item.NZBID)
                });

                row.append($('<td>').append(toSabIcon));

                 $('#show-loader').hide();
                $('#results_table_body').append(row);
            });
        }
    });
}

$(document).ready(function () {
    if ($('#search_query').val()) {
        searchNzbs($('#search_query').val(), $('#catid').val());
    }
    $('#search_query').keydown(function(e){
        if(e.which == 13){
            searchNzbs($('#search_query').val(), $('#catid').val());
        }
    })
    $('#search_nzb_button').click(function () {
        searchNzbs($('#search_query').val(), $('#catid').val());
    });
    
    getCategories();
});

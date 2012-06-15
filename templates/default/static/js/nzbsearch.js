function convert_bytes(bytes, precision) {  
    var kilobyte = 1024;
    var megabyte = kilobyte * 1024;
    var gigabyte = megabyte * 1024;
    var terabyte = gigabyte * 1024;
   
    if (bytes >= terabyte) {
        return (bytes / terabyte).toFixed(precision) + ' TB';
    } else if (bytes >= gigabyte) {
        return (bytes / gigabyte).toFixed(precision) + ' GB';
    } else if (bytes >= megabyte) {
        return (bytes / megabyte).toFixed(precision) + ' MB';
    } else if (bytes >= kilobyte) {
        return (bytes / kilobyte).toFixed(precision) + ' KB';
    } else {
        return bytes + ' B';
    }
}

function getCategories(provider) {
    $.ajax({
        url: '/json/?which=nzbsearch&get_cat=' + provider,
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
        url: '/json/?which=sabnzbd&action=addnzb',
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
        url: '/json/?which=nzbsearch&nzbid='+nzbid,
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
            modalMiddle.append($('<p>').text(convert_bytes(data[0].SIZE)));
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

            //showModal(el, title, content, buttons)
            showModal(null, modalTitle, modalTable, {
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
        url: '/json/?which=nzbsearch&query='+query+'&catid='+catid,
        type: 'get',
        dataType: 'json',
        success: function (data) {
            if (data === null) return

            $('#results_table_body').html('');
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
                row.append($('<td>').addClass('right').html(convert_bytes(item.SIZE, 2)));

                var toSabIcon = $('<i>');
                toSabIcon.addClass('icon-download-alt');
                toSabIcon.css('cursor', 'pointer');
                toSabIcon.click(function() {
                    sendToSab(item.NZBID)
                });

                row.append($('<td>').append(toSabIcon));

                $('#results_table_body').append(row)

            });

        }
    });
}

$(document).ready(function () {
    $('#search_query').keydown(function(e){
        if(e.which == 13){
            searchNzbs($('#search_query').val(), $('#catid').val());
        }
    }).focus();
    $('#search_nzb_button').click(function () {
        searchNzbs($('#search_query').val(), $('#catid').val());
    });
    
    getCategories('nzbmatrix');
});

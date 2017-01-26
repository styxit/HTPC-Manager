$(document).ready(function () {

    getDashActivity();
    getLibraryStats();
    getHistoryTable();

});


//Start of all functions used to retrieve data from Internal API Endpoints which redirect to PlexPy Endpoints

//Applys the data table plugin to the get_history api call
function getHistoryTable() {
    $('#history_table').DataTable( {
        "ajax": {
            "url": WEBDIR + "plexpy/get_history",
             type: 'POST',
            data: function (d) {
            return {
                json_data: JSON.stringify(d),
                grouping: false,
                //reference_id: rowData['reference_id']
            };}
            },
            "destroy": true,
            "language": {
                "search": "Search: ",
                "lengthMenu": "Show _MENU_ entries per page",
                "info": "Showing _START_ to _END_ of _TOTAL_ history items",
                "infoEmpty": "Showing 0 to 0 of 0 entries",
                "infoFiltered": "<span class='hidden-md hidden-sm hidden-xs'>(filtered from _MAX_ total entries)</span>",
                "emptyTable": "No data in table",
                "loadingRecords": '<i class="fa fa-refresh fa-spin"></i> Loading items...</div>'
            },
            "pagingType": "full_numbers",
            "stateSave": true,
            "processing": false,
            "serverSide": true,
            "pageLength": 25,
            "order": [ 0, 'desc'],
            "columnDefs": [
                {
                    "targets": 0,
                    "data": "date",
                    "createdCell": function (td, cellData, rowData, row, col) {
                        $(td).html(moment(cellData, "X").format("YYYY-MM-DD"));
                    },
                    "width": "7%",
                    "searchable": "false"

                },
                {
                    "targets": 1,
                    "data": "friendly_name",
                    "width": "9%"
                },
                {
                    "targets": 2,
                    "data": "ip_address",
                    "width": "8%",
                    "className": "no-wrap"
                },
                {
                    "targets": 3,
                    "data":"platform",
                    "createdCell": function (td, cellData, rowData, row, col) {
                        if (cellData !== '') {
                            $(td).html(cellData);
                        }
                    },
                    "width": "10%",
                    "className": "no-wrap"
                },
                {
                    "targets": 4,
                    "data": "player",
                    "createdCell": function (td, cellData, rowData, row, col) {
                        if (cellData !== '') {
                            var transcode_dec = '';
                            if (rowData['transcode_decision'] === 'transcode') {
                                transcode_dec = '<i class="fa fa-server fa-fw"></i>';
                            } else if (rowData['transcode_decision'] === 'copy') {
                                transcode_dec = '<i class="fa fa-video-camera fa-fw"></i>';
                            } else if (rowData['transcode_decision'] === 'direct play') {
                                transcode_dec = '<i class="fa fa-play-circle fa-fw"></i>';
                            }
                            $(td).html('<div style="float: left;">' + transcode_dec + '&nbsp;' + cellData + '</div>');
                        }
                    },
                    "width": "12%",
                    "className": "no-wrap"
                },
                {
                    "targets": 5,
                    "data": "full_title",
                    "createdCell": function (td, cellData, rowData, row, col) {
                        if (cellData !== '') {
                            var parent_info = '';
                            var media_type = '';
                            var thumb_popover = '';
                            var source = (rowData['state'] === null) ? 'source=history&' : '';
                            if (rowData['media_type'] === 'movie') {
                                if (rowData['year']) {
                                    parent_info = ' (' + rowData['year'] + ')';
                                }
                                media_type = '<span class="media-type-tooltip" data-toggle="tooltip" title="Movie"><i class="fa fa-film fa-fw"></i></span>';
                                thumb_popover = '<span class="thumb-tooltip" data-toggle="popover" data-img="pms_image_proxy?img=' + rowData['thumb'] + '&width=300&height=450&fallback=poster" data-height="120" data-width="80">' + cellData + parent_info + '</span>'
                                $(td).html('<div class="history-title"><div style="float: left;">' + media_type + '&nbsp;' + thumb_popover + '</div></div>');
                            } else if (rowData['media_type'] === 'episode') {
                                if (rowData['parent_media_index'] && rowData['media_index']) {
                                    parent_info = ' (S' + rowData['parent_media_index'] + '&middot; E' + rowData['media_index'] + ')';
                                }
                                media_type = '<span class="media-type-tooltip" data-toggle="tooltip" title="Episode"><i class="fa fa-television fa-fw"></i></span>';
                                thumb_popover = '<span class="thumb-tooltip" data-toggle="popover" data-img="pms_image_proxy?img=' + rowData['thumb'] + '&width=300&height=450&fallback=poster" data-height="120" data-width="80">' + cellData + parent_info + '</span>'
                                $(td).html('<div class="history-title"><div style="float: left;" >' + media_type + '&nbsp;' + thumb_popover + '</div></div>');
                            } else if (rowData['media_type'] === 'track') {
                                if (rowData['parent_title']) {
                                    parent_info = ' (' + rowData['parent_title'] + ')';
                                }
                                media_type = '<span class="media-type-tooltip" data-toggle="tooltip" title="Track"><i class="fa fa-music fa-fw"></i></span>';
                                thumb_popover = '<span class="thumb-tooltip" data-toggle="popover" data-img="pms_image_proxy?img=' + rowData['thumb'] + '&width=300&height=300&fallback=cover" data-height="80" data-width="80">' + cellData + parent_info + '</span>'
                                $(td).html('<div class="history-title"><div style="float: left;">' + media_type + '&nbsp;' + thumb_popover + '</div></div>');
                            } else {
                                $(td).html(cellData);
                            }
                        }
                    },
                    "width": "33%",
                    "className": "datatable-wrap"
                },
                {
                    "targets": 6,
                    "data":"started",
                    "createdCell": function (td, cellData, rowData, row, col) {
                        if (cellData === null) {
                            $(td).html('n/a');
                        } else {
                            $(td).html(moment(cellData,"X").format("hh:mm A"));
                        }
                    },
                    "searchable": false,
                    "width": "5%",
                    "className": "no-wrap"
                },
                {
                    "targets": 7,
                    "data":"paused_counter",
                    "render": function (data, type, full) {
                        if (data !== null) {
                            return Math.round(moment.duration(data, 'seconds').as('minutes')) + ' mins';
                        } else {
                            return '0 mins';
                        }
                    },
                    "searchable": false,
                    "width": "5%",
                    "className": "no-wrap"
                },
                {
                    "targets": 8,
                    "data":"stopped",
                    "createdCell": function (td, cellData, rowData, row, col) {
                        if (cellData === null) {
                            $(td).html('n/a');
                        } else {
                            $(td).html(moment(cellData,"X").format("hh:mm A"));
                        }
                    },
                    "searchable": false,
                    "width": "5%",
                    "className": "no-wrap"
                },
                {
                    "targets": 9,
                    "data":"duration",
                    "render": function (data, type, full) {
                        if (data !== null) {
                            return Math.round(moment.duration(data, 'seconds').as('minutes')) + ' mins';
                        } else {
                            return data;
                        }
                    },
                    "searchable": false,
                    "width": "5%",
                    "className": "no-wrap"
                }
            ]

    } );
}
//Gets current playing activity and uses polling function to update over time.  Fills in the first tab
//TODO: Finish this function and make it use the defined pms server.
function getDashActivity() {
    $.ajax({
        type: 'GET',
        url: WEBDIR + "plexpy/get_activity",
        success: function (data) {
            if (data.stream_count == "0") {
                var Sessions = "(No Active Streams)";
                $('#sessions').html(Sessions);
            }
            else {
                $("#activity").html(null);
                var transcodes = 0;
                var directplay = 0;
                var directstream = 0;
                var items = "";

                $.each(data.sessions, function (index, value) {

                    if (value.media_type === "movie") {
                        var item_info = value.year;
                    }
                    if (value.media_type === "episode") {
                        var item_info = "S" + value.parent_media_index + " - E" + value.media_index;
                    }
                    var thumb = WEBDIR + 'plex/GetThumb?w=475&h=275&thumb='+encodeURIComponent(value.art);
                    var image = "<img src=\"" + thumb + "\"/>";


                    if ((index % 4) == 0) items += '<div class="row-fluid">';
                    items += "<div class='span3 p-lr-sm'><div class='top-title'>" + playState(value.state) + "<span>" + value.full_title + "</span></div>" +
                        "<div class='poster-image'>" + image +
                        "<div class='meta-overlay'><span>IP: " + value.ip_address + "<br/>ETC: "+moment().add(millisecondsToMinutes(value.duration - value.view_offset,1),'m').format("hh:mm A")+"</span><span class='pull-right'>" + millisecondsToMinutes(value.view_offset) + " / " + millisecondsToMinutes(value.duration) + "</span></div></div>" +
                        "<div class='progress'>" +
                        "<div class='bar' style='width:" + value.progress_percent + "%'>" +
                        "<span class='sr-only'>" + value.progress_percent + "%</span></div>" +
                        "<div class='bar bar-warning' style='width:" + (100 - value.progress_percent) + "%'>" +
                        "<span class='sr-only'></span></div>" +
                        "</div><div><span class='pull-left'>" + item_info + "</span><span class='pull-right'>" + value.user + "</span></div></div>";
                    if ((index % 4) == 3) items += '</div>';

                    $("#activity").html(items);

                    // if(i>0 && (i%4 == 0)){
                    //     $("#test").append("</div>");
                    // }
                    if (value.transcode_decision === "transcode") {
                        transcodes = transcodes + 1;
                    }
                    if (value.transcode_decision === "direct play") {
                        directplay = directplay + 1;
                    }
                    if (value.transcode_decision === "copy") {
                        directstream = directstream + 1;
                    }
                });


                var Sessions = "( " + data.stream_count + " Streams"
                if (transcodes > 0) {
                    Sessions += " | " + transcodes + " transcode(s)";
                }
                if (directplay > 0) {
                    Sessions += " | " + directplay + " direct play(s)";
                }
                if (directstream > 0) {
                    Sessions += " | " + directstream + " direct stream(s)";
                }
                Sessions += " )";

                $('#sessions').html(Sessions);

                $("div.poster-image").hover(
                    function () {
                        $(this).find(".meta-overlay").css('visibility', 'visible');
                    }, function () {
                        $(this).find(".meta-overlay").css('visibility', 'hidden');
                    });

            }
        },
        complete: setTimeout(function() {getDashActivity()}, 10000),
        timeout: 2000
    })
}
//Gets the Watch Stats and creates a set of BootStrap wells to house the data for viewing
function getLibraryStats() {
    $.ajax({
        type: 'GET',
        url: WEBDIR + "plexpy/get_home_stats",
        success: function (data) {
            $("#watchstats").html(null);
            var items = "";
            var itemTitle = "";
            var itemType = "";
            var itemCount = 0;
            var classApply = "";
            $.each(data, function (index, value) {
                if(index < 8)
                {
                    itemTitle = setTitle(value.stat_id);
                    itemType = setType(value.stat_type, value.stat_id);
                    switch(value.stat_id){
                        case "top_movies":
                            itemCount = value.rows[0].total_plays;
                            classApply = "stat-poster pull-left";
                            var thumb = WEBDIR + 'plex/GetThumb?w=85&h=125&thumb='+encodeURIComponent(value.rows[0].thumb);
                            var image = "<img src=\"" + thumb + "\"/>";
                            break;
                        case "popular_movies":
                            itemCount = value.rows[0].users_watched;
                            classApply = "stat-poster pull-left";
                            var thumb = WEBDIR + 'plex/GetThumb?w=85&h=125&thumb='+encodeURIComponent(value.rows[0].thumb);
                            var image = "<img src=\"" + thumb + "\"/>";
                            break;
                        case "top_tv":
                            itemCount = value.rows[0].total_plays;
                            classApply = "stat-poster pull-left";
                            var thumb = WEBDIR + 'plex/GetThumb?w=85&h=125&thumb='+encodeURIComponent(value.rows[0].grandparent_thumb);
                            var image = "<img src=\"" + thumb + "\"/>";
                            break;
                        case "popular_tv":
                            itemCount = value.rows[0].users_watched;
                            classApply = "stat-poster pull-left";
                            var thumb = WEBDIR + 'plex/GetThumb?w=85&h=125&thumb='+encodeURIComponent(value.rows[0].grandparent_thumb);
                            var image = "<img src=\"" + thumb + "\"/>";
                            break;
                        case "top_music":
                            itemCount = value.rows[0].total_plays;
                            classApply = "stat-cover pull-left";
                            var thumb = WEBDIR + 'plex/GetThumb?w=80&h=80&thumb='+encodeURIComponent(value.rows[0].grandparent_thumb);
                            var image = "<img src=\"" + thumb + "\"/>";
                            break;
                        case "popular_music":
                            itemCount = value.rows[0].users_watched;
                            classApply = "stat-cover pull-left";
                            var thumb = WEBDIR + 'plex/GetThumb?w=80&h=80&thumb='+encodeURIComponent(value.rows[0].grandparent_thumb);
                            var image = "<img src=\"" + thumb + "\"/>";
                            break;
                        case "last_watched":
                            itemCount = value.rows[0].friendly_name + "</br>" + moment(value.rows[0].last_watched).format("MM/DD/YYYY");
                            classApply = "stat-poster pull-left";
                            var thumb = WEBDIR + 'plex/GetThumb?w=85&h=125&thumb='+encodeURIComponent(value.rows[0].thumb);
                            var image = "<img src=\"" + thumb + "\"/>";
                            break;
                        case "top_users":
                            itemCount = value.rows[0].total_plays;
                            classApply = "stat-cover pull-left";
                            var image = "<img src=\"" + value.rows[0].user_thumb + "\"/>";
                            break;
                        case "top_platforms":
                            itemCount = value.rows[0].total_plays;
                            classApply = "stat-cover pull-left";
                            break;
                    }



                    if ((index % 4) == 0) items += '<div class="row-fluid">';
                    items += '<div class="span3 p-lr-sm well stat-holder">' +
                        '<div class="'+classApply+'">' + image +
                        '</div>' +
                        '<div class="stat-highlights">' +
                        '<h2>' + itemTitle + '</h2>' +
                        '<p>' + value.rows[0].title + value.rows[0].friendly_name +'</p>';
                            if(value.stat_id == "last_watched"){
                                items += itemCount
                            }
                            else{
                                items += '<h3 class="clear-fix">' + itemCount + '</h3> '
                            }
                         items += itemType +
                        '</div>' +
                        '</div>';
                    if ((index % 4) == 3) items += '</div>';
                }
            })
            $("#watchstats").html(items);

        },

        timeout: 2000
    })
}


//Miscellanous Helper functions some borrowed from the plexpy JS Code
function playState(state) {
    if (state === "playing") {
        return "<i class='fa fa-fw fa-play'></i>"
    }
    if (state === "paused") {
        return "<i class='fa fa-fw fa-pause'></i>"
    }
    if (state === "buffering") {
        return "<i class='fa fa-fw fa-spinner'></i>"
    }
    else {
        return "<i class='fa fa-fw fa-question'></i>"
    }
}
function millisecondsToMinutes(ms, roundToMinute) {
    if (ms > 0) {
        seconds = ms / 1000;
        minutes = seconds / 60;
        if (roundToMinute) {
            output = Math.round(minutes, 0)
        } else {
            minutesFloor = Math.floor(minutes);
            secondsReal = Math.round((seconds - (minutesFloor * 60)), 0);
            if (secondsReal < 10) {
                secondsReal = '0' + secondsReal;
            }
            output = minutesFloor + ':' + secondsReal;
        }
        return output;
    } else {
        if (roundToMinute) {
            return '0';
        } else {
            return '0:00';
        }
    }
}
function setTitle(itemTitle) {
    switch (itemTitle) {
        case "top_movies":
            return "Most Played Movie";
            break;
        case "popular_movies":
            return "Most Popular Movie";
            break;
        case "top_tv":
            return "Most Played TV";
            break;
        case "popular_tv":
            return "Most Popular TV";
            break;
        case "top_music":
            return "Most Played Music";
            break;
        case "popular_music":
            return "Most Popular Music";
            break;
        case "last_watched":
            return "Last Watched";
            break;
        case "top_users":
            return "Most Active User";
            break;
    }
}
function setType(itemType, itemTitle) {
    if (itemType == "total_plays") {
        return "plays";
    }
    if (itemType == null && itemTitle != "most_concurrent" && itemTitle != "last_watched") {
        return "users";
    }
    if (itemType == null && itemTitle == "last_watched"){
        return "";
    }
    else {
        return "streams";
    }
}

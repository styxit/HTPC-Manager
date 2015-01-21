// I feel like the entire thing is just one major fucking hack...

var usage_total = {
    "tx": 0,
    "rx": 0,
    "total": 0
}
var usage_last_month = {
    "tx": 0,
    "rx": 0,
    "total": 0
}
var usage_current_month = {
    "tx": 0,
    "rx": 0,
    "total": 0
}
$(function() {
    ajaxload()
    get_currentspeed()
    setInterval(function() {
        get_currentspeed()
    }, 10000);

});


function make_total(d) {
    usage_total.rx += parseInt(d.rx, 10);
    usage_total.tx += parseInt(d.tx, 10);
    usage_total.total += parseInt(d.rx + d.tx, 10);

}

function make_last_month(d) {
    usage_last_month.rx += parseInt(d.rx, 10);
    usage_last_month.tx += parseInt(d.tx, 10);
    usage_last_month.total += parseInt(d.tx + d.rx, 10);
}

function make_current_month(d) {
    usage_current_month.rx += parseInt(d.rx, 10);
    usage_current_month.tx += parseInt(d.tx, 10);
    usage_current_month.total += parseInt(d.tx + d.rx, 10);

}

function find_last_30_days() {
    var today = new Date();
    var year = today.getFullYear();
    var month = today.getMonth();
    var date = today.getDate();
    var daylist = [];
    for (var i = 0; i < 30; i++) {
        var day = new Date(year, month - 1, date + i);
        daylist.push(day.toLocaleDateString());
    }
    return daylist;
}

function find_last_12_months() {
    var today = new Date();

    var aMonth = today.getMonth();
    var months = [],
        i;
    var month = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    for (i = 0; i < 12; i++) {
        months.push(month[aMonth]);
        aMonth--;
        if (aMonth < 0) {
            aMonth = 11;
        }
    }

    return months.reverse();
}

function find_last_24_hours() {
    var today = new Date();

    var current_hour = today.getHours();
    var hours = [],
        i;
    var hour = ["00:00", "01:00", "02:00", "03:00", "04:00", "05:00", "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"];
    for (i = 0; i < 24; i++) {
        hours.push(hour[current_hour]);
        current_hour--;
        if (current_hour < 0) {
            current_hour = 23;
        }
    }

    return hours.reverse();
}

function makeArray(ary) {
    var d = {};
    var data = [];
    var dtx = [];
    var drx = [];
    var dt = [];

    $.each(ary, function(i, a) {
        //the xml is sorted in 0 based index where 0 is current day/month etc
        if (i == a["@id"]) {
            // all xml results are in kibi convert to gib
            var rx = parseInt(a.rx, 10) / 1024 / 1024;
            var tx = parseInt(a.tx, 10) / 1024 / 1024;
            dtx.push(tx);
            drx.push(rx);
            dt.push((rx + tx));
        }

    });

    d.dtx = dtx;
    d.drx = drx;
    d.dt = dt;

    return d;

}

// Grabs current speed
function get_currentspeed() {
    $.get(WEBDIR + 'vnstat/tr', function(data) {
        if (data.rx && data.tx) {
            $("#vnstat-rx").text(data.rx);
            $("#vnstat-tx").text(data.tx);

        } else {
            return;
        }

    });
}

// loads from db and makes html
// canvas has to exist for chart to be drawn, thats why its 2 calls..
function ajaxload() {
    $.ajax({
        url: WEBDIR + 'vnstat/dumpdb',
        async: false,
        success: function(data) {
            var t = $('.content');
            var interf = data["vnstat"]["interface"];
                // check if its a dict or list
            if (typeof(interf.id) !== 'undefined') {
                interf = [data["vnstat"]["interface"]];
            }

            var usage_all_interfaces;
            $.each(interf, function(ii, dd) {
                var date = new Date();
                    // Find current month
                var current_month = (date.getMonth() + 1);
                // find last month
                var last_month_ = date.setMonth(date.getMonth() - 1);
                var last_month = date.getMonth() + 1;
                    // wrap shitty month in array else it will fail
                var shitty_months = dd.traffic.months.month;
                if (typeof(dd.traffic.months.month["@id"]) !== 'undefined') {
                    shitty_months = [dd.traffic.months.month];
                }

                make_total(dd.traffic.total);
                $.each(shitty_months, function(iii, ddd) {
                    if (ddd.date.month == current_month) {
                        make_current_month(ddd);
                    } else if (ddd.date.month == last_month) {
                        make_last_month(ddd);
                    }

                });


                var p = $('<div>').addClass('row-fluid').attr('id', dd.id);
                // w h needs to hardcoded in canvas
                var m = $('<div>').addClass("span4").append($('<canvas width=400px; height=400px">').attr('id', 'month_' + dd.id));
                var d = $('<div>').addClass("span4").append($('<canvas width=400px; height=400px">').attr('id', 'day_' + dd.id));
                var h = $('<div>').addClass("span4").append($('<canvas width=400px; height=400px">').attr('id', 'hour_' + dd.id));

                p.append(m);
                p.append(d);
                p.append(h);
                t.append(p);

            });

            // make the fucking table
            r = $('<div>').addClass("row-fluid bwinfocontainer").html('<div class="bwinfo"><h4><span class="pull left">Bandwidth stats</span></h4><span class="pull-right bw_updated"></span></div>');
            r.append('<table class="table table-striped table-hover"> <thead> <tr> <th>Period</th> <th class="">Download</th> <th class="">Upload</th> <th class="">Total</th> </tr></thead> <tbody id="bw_table_body"></tbody></table>');
            t.append(r);


        }

    });

    var tr_this_month = $('<tr>').html('<td>This month</td><td>' + getReadableFileSizeString(usage_current_month.rx) + '</td><td>' + getReadableFileSizeString(usage_current_month.tx) + '</td><td>' + getReadableFileSizeString(usage_current_month.rx + usage_current_month.tx) + '</td>');
    var tr_last_month = $('<tr>').html('<td>Last month</td><td>' + getReadableFileSizeString(usage_last_month.rx) + '</td><td>' + getReadableFileSizeString(usage_last_month.tx) + '</td><td>' + getReadableFileSizeString(usage_last_month.rx + usage_last_month.tx) + '</td>');
    var tr_total = $('<tr>').html('<td>Total</td><td>' + getReadableFileSizeString(usage_total.rx) + '</td><td>' + getReadableFileSizeString(usage_total.tx) + '</td><td>' + getReadableFileSizeString(usage_total.rx + usage_total.tx) + '</td>');
    $('#bw_table_body').append(tr_this_month, tr_last_month, tr_total);

    loaddb();
}


function loaddb() {
    $.ajax({
        url: WEBDIR + 'vnstat/dumpdb',
        async: false,
        success: function(data) {
            var interf = data["vnstat"]["interface"];
            if (typeof(data.vnstat["interface"].id) !== 'undefined') {
                interf = [data["vnstat"]["interface"]];
            }

            $.each(interf, function(n, ainterf) {
                var z = ainterf;
                var interfaceid = z.id;
                var created = z.created.date;
                var date = moment(created.day + created.month + created.year, "DD.MM.YYYY").format('DD.MM.YYYY');

                var traffic = z.traffic;
                var months = traffic.months.month;
                var days = traffic.days.day;
                var hour = traffic.hours.hour;

                var twelve = makeArray(months);
                var dday = makeArray(days);
                var hour2 = makeArray(hour);

                makechart("month", interfaceid, twelve);
                makechart("day", interfaceid, dday);
                makechart("hour", interfaceid, hour2);


            });

        }
    });
}

function makechart(selector, interfaceid, d) {
    var l;
    if (selector == "day") {
        l = find_last_30_days();

    } else if (selector == "month") {
        l = find_last_12_months();

    } else if (selector == "hour") {
        l = find_last_24_hours();
    }

    var sel = selector + '_' + interfaceid;
    var ctx = $('#' + sel).get(0).getContext("2d");
    parentwidth = $('#' + sel).parent().width();
    parentheight = $('#' + sel).parent().height();

    var data = {
        labels: l,

        datasets: [
            {

                label: "Download",
                fillColor: "rgba(220,220,220,0.2)",
                strokeColor: "#56ff00", //"rgba(220,220,220,1)",
                pointColor: "#56ff00", //"rgba(220,220,220,1)",
                pointStrokeColor: "#fff",
                pointHighlightFill: "#fff",
                pointHighlightStroke: "rgba(220,220,220,1)",
                // reverse the data so its the same way as a the chart
                data: d.drx.reverse(),
                title: "Download",
         },
            {

                label: "Upload",
                fillColor: "rgba(151,187,205,0.2)",
                strokeColor: "#0038ff", //"rgba(151,187,205,1)",
                pointColor: "#0038ff", //"rgba(151,187,205,1)",
                pointStrokeColor: "#fff",
                pointHighlightFill: "#fff",
                pointHighlightStroke: "rgba(151,187,205,1)",
                data: d.dtx.reverse(),
                title: "Upload",
         },
            {
                label: "Total",
                fillColor: "rgba(151,187,205,0.2)", // red #FF0000
                strokeColor: "#EC7886", //rgba(151,187,205,1)",
                pointColor: "#EC7886", //"rgba(151,187,205,1)",
                pointStrokeColor: "#fff",
                pointHighlightFill: "#fff",
                pointHighlightStroke: "rgba(151,187,205,1)",
                data: d.dt.reverse(),
                title: "Total",
         }
     ]
    };
    // Would have been nice but to many datapoints
    //inGraphDataShow:true
    // annotateDisplay can cause problems, remove in that case.
    options = {
        showScale: true,
        inGraphDataShow: false,
        graphTitle: selector,
        legend: true,
        responsive: true,
        annotateDisplay: true,
        yAxisUnit: "GIB",
        yAxisUnitFontSize: 11,
        graphSubTitle: interfaceid,
        graphSubTitleFontSize: 10,
        graphSubTitleSpaceBefore: 0,
        graphSubTitleSpaceAfter: 2,
        //inGraphDataTmpl: "<%=v2.toFixed(2)%>",
        annotateLabel: "<%=(v1 == '' ? '' : v1) + (v1!='' && v2 !='' ? ' -  ' : '')+(v2 == '' ? '' : v2)+(v1!='' || v2 !='' ? ': ' : ' ') + v3.toFixed(2)%>",
    };
    new Chart(ctx).Line(data, options);
}

function getReadableFileSizeString(fileSizeInBytes) {
    var i = 0;
    var byteUnits = [' KB', ' MB', ' GB', ' TB', ' PB'];
    do {
        fileSizeInBytes = fileSizeInBytes / 1024;
        i++;
    } while (fileSizeInBytes > 1024);
    return fileSizeInBytes.toFixed(2) + byteUnits[i];
}
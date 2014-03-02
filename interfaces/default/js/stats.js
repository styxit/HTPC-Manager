
// For hdd. Converts bytes to filesize in kb,mb,gb
 function getReadableFileSizeStringHDD(fileSizeInBytes) {
    var i = -1;
    var byteUnits = [' kB', ' MB', ' GB', ' TB', 'PB'];
    do {
        fileSizeInBytes = fileSizeInBytes / 1000;
        i++;
    } while (fileSizeInBytes > 1000);
    return fileSizeInBytes.toFixed(1) + byteUnits[i];
};

// Converts bytes to filesize in kb,mb,gb
function getReadableFileSizeString(fileSizeInBytes) {
    var i = -1;
    var byteUnits = [' kB', ' MB', ' GB', ' TB', 'PB'];
    do {
        fileSizeInBytes = fileSizeInBytes / 1024;
        i++;
    } while (fileSizeInBytes > 1024);
    return fileSizeInBytes.toFixed(1) + byteUnits[i];
};

// Makes the harddisk lists
function get_diskinfo() {
    $.ajax({
        'url': WEBDIR + 'stats/disk_usage',
            'dataType': 'json' ,
            'success': function (response) {
            $('#disklist').html("");
            $('#error_message').text("");

            $.each(response, function (i, disk) {
                var row = $('<tr>');
                var progressBar = $('<div>');
                progressBar.addClass('bar');
                progressBar.css('width', (disk.percent) + '%');
                progressBar.text(getReadableFileSizeString(disk.used)); // added the text
                var progress = $('<div>');
                progress.addClass('progress');

                if (disk.percent >= 90) {
                    progress.addClass('progress-danger');
                }
                progress.append(progressBar);

                var progress2 = 	"<div class='progress hddprog'><div class=bar style=width:" + disk.percent + "%><span class=sr-only>"+ getReadableFileSizeStringHDD(disk.used) +"</span></div><div class='bar bar-success' style=width:" + (100 - disk.percent) + "% ><span class=sr-only>" + getReadableFileSizeStringHDD(disk.free) +"</span></div>";

                if (disk.percent >=85) {
                    //progress2.addClass('progress-danger'); // need to check, does not work
                }


                row.append(
                $('<td>').addClass('stats_disk_mountpoint').text(disk.mountpoint),
                $('<td>').addClass('stats_disk_device hidden-phone').text(disk.device),
                $('<td>').addClass('stats_disk_fstype hidden-phone').text(disk.fstype),
                $('<td>').addClass('stats_disk_free').text(getReadableFileSizeStringHDD(disk.free)),
                $('<td>').addClass('stats_disk_used').text(getReadableFileSizeStringHDD(disk.used)),
                $('<td>').addClass('stats_disk_total').text(getReadableFileSizeStringHDD(disk.total)),
                $('<td>').addClass('span3 stats_disk_progress').html(progress2),
                $('<td>').addClass('stats_disk_percent').text(disk.percent));
                $('#disklist').append(row);
		});
            $('.spinner').hide();
        }
    });
}


function uptime() {
    $.getJSON(WEBDIR + "stats/uptime", function (data) {
	    $(".r").text("Uptime: "+ data.uptime);
    });
}


function get_external_ip() {
    $.getJSON(WEBDIR + "stats/get_external_ip", function (response) {
        $(".txip").text(response.externalip);
    });
}


function get_local_ip() {
    $.getJSON(WEBDIR + "stats/get_local_ip", function (response) {
        $(".tlip").text(response.localip);
    });
}

// Not in use
function network_usage() {
    $.getJSON(WEBDIR + "stats/network_usage", function (response) {
	$(".nw").append("<div>Recv: "+ getReadableFileSizeString(response.bytes_recv) +"</div>");
	$(".nw").append("<div>Sent: "+ getReadableFileSizeString(response.bytes_sent) +"</div>");
	$(".nw").append("<div>Error in: "+ response.errin +"</div>");
	$(".nw").append("<div>Error out: "+ response.errout +"</div>");
	$(".nw").append("<div>Drop in: "+ response.dropin +"</div>");
	$(".nw").append("<div>Drop out: "+ response.dropout +"</div>");
    });
}

function network_usage_table() {
    $.getJSON(WEBDIR + "stats/network_usage", function (response) {
        $("#stat-sent").text(getReadableFileSizeString(response.bytes_sent));
        $("#stat-recv").text(getReadableFileSizeString(response.bytes_recv));
        $(".nw").html("<table class='table nwtable networktable'><tr><td>Network</td><td>In</td><td>Out</td</tr><tr><td>Drop</td><td>" + response.dropin + "</td><td>" + response.dropout + "</td></tr><tr><td>Error</td><td>" + response.errin + "</td><td>" + response.errout + "</td></tr><tr><td>IP</td><td class=tlip></td><td class=txip></td></tr></tbody></table>");
    });
}

function get_user() {
    $.getJSON(WEBDIR + "stats/get_user", function (response) {
	$(".l").text(response.name +" logged in " + response.started + " ago")
    });
}

function sys_info() {
    $.getJSON(WEBDIR + "stats/sys_info", function (response) {
        $(".c").html("<div>"+ response.system +' '+ response.release + ' ' + response.user + "</div>");
    });
}


function virtual_memory_bar() {
    $.getJSON(WEBDIR + "stats/virtual_memory", function (virtual) {
	$(".virmem").html("<div>Physical memory</div><div class=progress><div class=bar style=width:" + virtual.percent + "%><span class=sr-only>Used: "+ virtual.percent +"%</span></div><div class='bar bar-success' style=width:" + (100 - virtual.percent) + "%><span class=sr-only>Free: " + (100 - virtual.percent) +"%</span></div></div><div class=progress><div class=bar style=width:" + virtual.percent + "%><span class=sr-only>Used: "+ getReadableFileSizeString((virtual.total - virtual.available))+"</span></div><div class='bar bar-success' style=width:" + (100 - virtual.percent) + "% ><span class=sr-only>Free: " + getReadableFileSizeString(virtual.available) +"</span></div>");

    });
}

function virtual_memory_table() {
    $.getJSON(WEBDIR + "stats/virtual_memory", function (virtual) {
	$(".virmem").html("<table class='table nwtable'><tr><td class=span4>Physical Memory:</td><td class=span4>" + virtual.percent + "%</td></tr><tr><td>Total:</td><td>" + getReadableFileSizeString(virtual.total) + "</td></tr><tr><td>Used:</td><td>" + getReadableFileSizeString((virtual.total - virtual.available)) + "</td></tr><tr><td>Free:</td><td>" + getReadableFileSizeString(virtual.available) + "</td></tr></tbody></table>");
    });
}


function swap_memory_bar() {
    $.getJSON(WEBDIR + "stats/swap_memory", function (swap) {
        //alert(response.total);
	$(".swpmem").html("<div>Swap memory</div><div class=progress><div class=bar style=width:" + swap.percent + "%><span class=sr-only>Used: "+ swap.percent +"%</span></div><div class='bar bar-success' style=width:" + (100 - swap.percent) + "%><span class=sr-only>Free: " + (100 - swap.percent) +"%</span></div></div><div class=progress><div class=bar style=width:" + swap.percent + "%><span class=sr-only>Used: "+ getReadableFileSizeString(swap.used)+"</span></div><div class='bar bar-success' style=width:" + (100 - swap.percent) + "% ><span class=sr-only>Free: " + getReadableFileSizeString(swap.free) +"</span></div>");

    });
}

function swap_memory_table() {
    $.getJSON(WEBDIR + "stats/swap_memory", function (swap) {
        $(".swpmem").html("<table class='table nwtable'><tr><td class=span4>Swap Memory:</td><td class=span4>" +swap.percent +"%</td></tr><tr><td>Total:</td><td>"+getReadableFileSizeString(swap.total)+"</td></tr><tr><td>Used:</td><td>"+getReadableFileSizeString(swap.used)+"</td></tr><tr><td>Free:</td><td>"+getReadableFileSizeString(swap.free)+"</td></tr></tbody></table>");
    });
}


function cpu_percent_bar() {
    $.getJSON(WEBDIR + "stats/cpu_percent", function (cpu) {
        $(".cpu").html("<div>CPU</div><div class=progress><div class=bar style=width:" + (cpu.user + cpu.system).toFixed(1) + "%><span class=sr-only>Used: "+ (cpu.user + cpu.system).toFixed(1) +"%</span></div><div class='bar bar-success' style=width:" + (100 - (cpu.user + cpu.system)).toFixed(1) + "%><span class=sr-only>Idle: "+ cpu.idle.toFixed(1) +"%</span></div></div><div class=progress><div class=bar style=width:" + cpu.user.toFixed(1) + "%><span class=sr-only>User: "+ cpu.user.toFixed(1) +"%</span></div><div class='bar bar-warning' style=width:" + cpu.system.toFixed(1) + "%><span class=sr-only>System: "+ cpu.system.toFixed(1) +"%</span></div><div class='bar bar-success' style=width:" + (100 - (cpu.user + cpu.system)).toFixed(1) + "%><span class=sr-only>Idle: " + cpu.idle.toFixed(1) +"%</span></div></div>");
    });
}


function cpu_percent_table() {
    $.getJSON(WEBDIR + "stats/cpu_percent", function (cpu) {
        $(".cpu").html("<table class='table nwtable'><tr><td class=span4>CPU:</td><td class=span4>" + (100 - cpu.idle).toFixed(1) + "%</td></tr><tr><td>User:</td><td>" + cpu.user + "%</td></tr><tr><td>System:</td><td>" + cpu.system + "%</td></tr><tr><td>Idle:</td><td>" + cpu.idle + "%</td></tr></tbody></table>");
    });
}

function return_stats_settings() {
    $.getJSON(WEBDIR + "stats/return_settings", function (return_settings) {
        if (return_settings.stats_use_bars == 'true') {
            cpu_percent_bar();
            swap_memory_bar();
            virtual_memory_bar();
        } else if (return_settings.stats_use_bars == 'false') {
            cpu_percent_table();
            swap_memory_table();
            virtual_memory_table();

        } else {
            //pass
        }

    });
}


// Loads the moduleinfo
$(document).ready(function () {
    if (importPsutil) {
        $('.spinner').show();
        get_diskinfo();
        network_usage_table();
        return_stats_settings();
        uptime();
        get_user();
        sys_info();
        get_external_ip();
        get_local_ip();
    }
});

if (importPsutil) {
    setInterval(function () {
        get_diskinfo();
        network_usage_table();
        return_stats_settings();
        uptime();
        get_user();
        sys_info();
        get_external_ip(); // dont want to spam a external service.
        get_local_ip();
    }, 10000);
}

$(document).ready(function () {
    byteSizeOrdering()
    if (importPsutil) {
        reloadtab();
        network_usage_table();
        return_stats_settings();
        uptime();
        get_user();
        sys_info();
        get_external_ip();
        get_local_ip();

        $('#diskl').click(function () {
            get_diskinfo();
        });

        $('#procl').click(function () {
            processes();
        });

        $('.scriptli').click(function (e) {
            e.preventDefault();
            var script = $(this).attr('data-filename');
            var conf = confirm('Are your sure you want to execute ' + script)
            if (conf) {
                runscript(script);
            }
            // to stop the tab from exceute
            return false;
        });

    }

    if (importpySMART) {
        if ($('#smartl').hasClass('active')){
            smart();
        }
        $('#smartl').click(function (){
            smart();
        });
    }

    if (ohm) {
        getohm();

        $('#ohm').click(function () {
            getohm();
        });

    }
    $(window).trigger('hashchange');
});

if (importPsutil) {
    // Set timeintercal to refresh stats
    setInterval(function () {
        get_diskinfo();
        processes();
        network_usage_table();
        return_stats_settings();
        uptime();
        get_user();
        sys_info();
        get_external_ip();
        get_local_ip();
    }, 10000);
}

// Makes the harddisk lists
function get_diskinfo() {
    $.ajax({
        'url': WEBDIR + 'stats/disk_usage',
            'dataType': 'json' ,
            'success': function (response) {
                $('.disktspinner').show();

                $('#disklist').html("");
                $('#error_message').text("");

                $.each(response, function (i, disk) {
                    var row = $('<tr>');
                    var lazy_solution = (disk.percent >= 90) ? 'progress-danger' : '';
                    var progress = "<div class='progress " + lazy_solution + " hddprog'><div class=bar style=width:" + disk.percent + "%><span class=sr-only>"+ humanFileSize(disk.used, 2) +"</span></div><div class='bar bar-success' style=width:" + (100 - disk.percent) + "% ><span class=sr-only>" + getReadableFileSizeStringHDD(disk.free) +"</span></div>";

                    row.append(
                        $('<td>').addClass('stats_disk_mountpoint').text(disk.mountpoint),
                        $('<td>').addClass('stats_disk_device hidden-phone').text(disk.device),
                        $('<td>').addClass('stats_disk_fstype hidden-phone').text(disk.fstype),
                        $('<td>').addClass('stats_disk_free').text(humanFileSize(disk.free, 2)),
                        $('<td>').addClass('stats_disk_used').text(humanFileSize(disk.used, 2)),
                        $('<td>').addClass('stats_disk_total').text(humanFileSize(disk.total, 2)),
                        $('<td>').addClass('span3 stats_disk_progress').html(progress),
                        $('<td>').addClass('stats_disk_percent').text(disk.percent)
                    );

                    $('#disklist').append(row);
		        })
            },
            complete: function() {
                $('.disktspinner').hide();
                $('#disklist').parent().trigger('update');
            }
    });
}

//Makes the process table
function processes() {
    $.ajax({
        'url': WEBDIR + 'stats/processes',
        'dataType': 'json',
        'success': function (response) {
            $('.procspinner')
            $('#proclist').html("");
            $('#error_message').text("");

            $.each(response, function (i, proc) {
                var pmc
                var meminfo

                if (proc.memory_percent === "N/A" || proc.memory_percent == null) {
                    pmc = 'N/A'
                } else {
                    pmc = proc.memory_percent.toFixed(2) + '%'
                }

                if (proc.memory_info == 'N/A' || proc.memory_info == null) {
                    meminfo = 'N/A'
                } else {
                    meminfo = humanFileSize(proc.memory_info[0], 2)

                }
                var row = $('<tr>');
                row.append(
                    $('<td>').addClass('processes-name').text(proc.name),
                    $('<td>').addClass('processes-pid').text(proc.pid),
                    $('<td>').addClass('processes-status hidden-phone').text(proc.status),
                    $('<td>').addClass('processes-username hidden-phone').text(proc.username),
                    $('<td>').addClass('processes-memory-percent').text(pmc),
                    $('<td>').addClass('processes-memory-info').text(meminfo.toUpperCase()), // This not correct for kB but its for tablesoter
                    $('<td>').addClass('processes-runningtime').text(pad(proc.r_time, 8)),
                    $('<td>').addClass('processes-percent').text(proc.cpu_percent+ '%'),
                    $('<td>').append('<a href="#" class="btn btn-mini cmd" data-cmd="kill" data-name='+proc.name+' data-pid='+proc.pid+'><i class="fa fa-times"></i></a>')
                );
                $('#proclist').append(row);

            })
            $('.table-sortable').trigger("update");
        },
        complete: function() {
            $('.disktspinner').hide();
            $('#proclist').parent().trigger('update');
        }


    });
}

function uptime() {
    $.getJSON(WEBDIR + "stats/uptime", function (data) {
	    $("#uptime").text("Uptime: "+ pad(data.uptime, 8));
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

function network_usage_table() {
    $.getJSON(WEBDIR + "stats/network_usage", function (response) {
        $("#stat-sent").text(getReadableFileSizeString(response.bytes_sent));
        $("#stat-recv").text(getReadableFileSizeString(response.bytes_recv));
        $(".errin").text(response.errin)
        $(".errout").text(response.errout)
        $(".dropin").text(response.dropin)
        $(".dropout").text(response.dropout)
    });
}

function get_user() {
    $.getJSON(WEBDIR + "stats/get_user", function (response) {
        $("#system_user").text(response.name +" logged in " + pad(response.started, 8) + " ago")
    });
}

function sys_info() {
    $.getJSON(WEBDIR + "stats/sys_info", function (response) {
        $("#system_info").html("<div>"+ response.system +' '+ response.release + ' ' + response.user + "</div>");
    });
}

function virtual_memory_bar() {
    $.getJSON(WEBDIR + "stats/virtual_memory", function (virtual) {
	   $(".virmem").html("<div>Physical memory</div><div class=progress><div class=bar style=width:" + virtual.percent + "%><span class=sr-only>Used: "+ virtual.percent +"%</span></div><div class='bar bar-success' style=width:" + (100 - virtual.percent) + "%><span class=sr-only>Free: " + (100 - virtual.percent) +"%</span></div></div><div class=progress><div class=bar style=width:" + virtual.percent + "%><span class=sr-only>Used: "+ getReadableFileSizeString((virtual.total - virtual.available))+"</span></div><div class='bar bar-success' style=width:" + (100 - virtual.percent) + "% ><span class=sr-only>Free: " + getReadableFileSizeString(virtual.available) +"</span></div>");

    });
}

function virtual_memory_table() {
    $.getJSON(WEBDIR + "stats/virtual_memory", function (virtual) {
        $(".virmem").html("<table class='table nwtable'><tr><td class=span4>Physical Memory</td><td class=span4>" + virtual.percent + "%</td></tr><tr><td>Total</td><td>" + getReadableFileSizeString(virtual.total) + "</td></tr><tr><td>Used</td><td>" + getReadableFileSizeString((virtual.total - virtual.available)) + "</td></tr><tr><td>Free</td><td>" + getReadableFileSizeString(virtual.available) + "</td></tr></tbody></table>");
    });
}

function swap_memory_bar() {
    $.getJSON(WEBDIR + "stats/swap_memory", function (swap) {
        $(".swpmem").html("<div>Swap memory</div><div class=progress><div class=bar style=width:" + swap.percent + "%><span class=sr-only>Used: "+ swap.percent +"%</span></div><div class='bar bar-success' style=width:" + (100 - swap.percent) + "%><span class=sr-only>Free: " + (100 - swap.percent) +"%</span></div></div><div class=progress><div class=bar style=width:" + swap.percent + "%><span class=sr-only>Used: "+ getReadableFileSizeString(swap.used)+"</span></div><div class='bar bar-success' style=width:" + (100 - swap.percent) + "% ><span class=sr-only>Free: " + getReadableFileSizeString(swap.free) +"</span></div>");
    });
}

function swap_memory_table() {
    $.getJSON(WEBDIR + "stats/swap_memory", function (swap) {
        $(".swpmem").html("<table class='table nwtable'><tr><td class=span4>Swap Memory</td><td class=span4>" +swap.percent +"%</td></tr><tr><td>Total</td><td>"+getReadableFileSizeString(swap.total)+"</td></tr><tr><td>Used</td><td>"+getReadableFileSizeString(swap.used)+"</td></tr><tr><td>Free</td><td>"+getReadableFileSizeString(swap.free)+"</td></tr></tbody></table>");
    });
}

function cpu_percent_bar() {
    $.getJSON(WEBDIR + "stats/cpu_percent", function (cpu) {
        $(".cpu").html("<div class=text-center>CPU</div><div class=progress><div class=bar style=width:" + (cpu.user + cpu.system).toFixed(1) + "%><span class=sr-only>Used: "+ (cpu.user + cpu.system).toFixed(1) +"%</span></div><div class='bar bar-success' style=width:" + (100 - (cpu.user + cpu.system)).toFixed(1) + "%><span class=sr-only>Idle: "+ cpu.idle.toFixed(1) +"%</span></div></div><div class=progress><div class=bar style=width:" + cpu.user.toFixed(1) + "%><span class=sr-only>User: "+ cpu.user.toFixed(1) +"%</span></div><div class='bar bar-warning' style=width:" + cpu.system.toFixed(1) + "%><span class=sr-only>System: "+ cpu.system.toFixed(1) +"%</span></div><div class='bar bar-success' style=width:" + (100 - (cpu.user + cpu.system)).toFixed(1) + "%><span class=sr-only>Idle: " + cpu.idle.toFixed(1) +"%</span></div></div>");
    });
}

function cpu_percent_table() {
    $.getJSON(WEBDIR + "stats/cpu_percent", function (cpu) {
        $(".cpu").html("<table class='table nwtable'><tr><td class=span4>CPU</td><td class=span4>" + (100 - cpu.idle).toFixed(1) + "%</td></tr><tr><td>User</td><td>" + cpu.user + "%</td></tr><tr><td>System</td><td>" + cpu.system + "%</td></tr><tr><td>Idle</td><td>" + cpu.idle + "%</td></tr></tbody></table>");
    });
}

function getohm() {
    $.ajax({
        'url': WEBDIR + "stats/ohm",
        'success': function (data) {
            unpack(data);
        }

    }).done(function () {
        // make the three after unpack set the correct markup
        $('.ohm_three').treegrid();

    });
}


 function unpack(obj) {
    $('.ohm_three').empty()
     // for sensor
     var t = $('<tr>').addClass('treegrid-1');
     t.append($('<td>').text(obj.Text));
     t.append($('<td>').text(obj.Min));
     t.append($('<td>').text(obj.Value));
     t.append($('<td>').text(obj.Max));
     $('.ohm_three').append(t);

     if (obj.Children) {
         $.each(obj.Children, function(i, child) {
             // Add +1 since the sensor has to be done manually
             tr = $('<tr>').addClass('treegrid-' + (child.id + 1)).addClass('treegrid-parent-' + (obj.id + 1));
             tr.append($('<td>').text(child.Text));
             tr.append($('<td>').text(child.Min));
             tr.append($('<td>').text(child.Value));
             tr.append($('<td>').text(child.Max));
             $('.ohm_three').append(tr);
             if (child.Children) {
                 // use a new function cus the hack +1 hack
                 unpack2(child);
             }
         });
     }
 }

 function unpack2(obj) {
     if (obj.Children) {
         $.each(obj.Children, function(i, child) {
             var tr = $('<tr>');
             tr.addClass('treegrid-' + (child.id + 1)).addClass('treegrid-parent-' + (obj.id + 1));
             tr.append($('<td>').text(child.Text));
             tr.append($('<td>').text(child.Min));
             tr.append($('<td>').text(child.Value));
             tr.append($('<td>').text(child.Max));
             $('.ohm_three').append(tr);
             if (child.Children) {
                 unpack2(child);
             }
         });
     }
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

        }
    });
}

function smart() {
    $('.smart-spinner').show();
    $('#smartlist').html("");
    $.ajax({
        'url': WEBDIR + 'stats/smart_info',
            'dataType': 'json' ,
            'success': function (response) {
            $('#smartlist').html("");
            var row_id = 1
            var parent_id = row_id
            $.each(response, function (i, drives) {
                row = $('<tr>');
                row_id = row_id + 1
                row.addClass('treegrid-' + row_id);
                row.append(
                $('<td>').text(drives.name),
                $('<td>').text(drives.model),
                $('<td>').text(drives.serial),
                $('<td>').text(drives.firmware),
                $('<td>').text(drives.capacity),
                $('<td>').text(drives.interface),
                $('<td>').text(drives.temperature + String.fromCharCode(176)),
                $('<td>').text(drives.assessment));
                $('.smart_three').append(row);
                parent_id = row_id
                row_id = row_id + 1
                row = $('<tr>');
                row.addClass('treegrid-' + row_id).addClass('treegrid-parent-' + parent_id);
                row.append(
                $('<td>').text(""),
                $('<td>').attr('colspan',6).append(
                    $('<table>').addClass('table').addClass('table-condensed').addClass('smart_attributes').attr('id','attributes-' + drives.name.replace( /(:|\.|\[|\]|,)/g, "_")).attr('width','100%').append(
                      $('<thead>').append(
                        $('<tr>').append(
                            $('<th>').text("ID"),
                            $('<th>').text("Attribute Name"),
                            $('<th>').text("Cur"),
                            $('<th>').text("Wst"),
                            $('<th>').text("Thr"),
                            $('<th>').text("Raw"),
                            $('<th>').text("Flags"),
                            $('<th>').text("Type"),
                            $('<th>').text("Updated"),
                            $('<th>').text("When Failed")
                        )))),
                $('<td>').text(""));
                $('.smart_three').append(row);
                $.each(drives.attributes, function (x, attr) {
                    row = $('<tr>');
                    row.append(
                    $('<td>').text(attr.id),
                    $('<td>').text(attr.name),
                    $('<td>').text(attr.cur),
                    $('<td>').text(attr.wst),
                    $('<td>').text(attr.thr),
                    $('<td>').text(attr.raw),
                    $('<td>').text(attr.flags),
                    $('<td>').text(attr.type),
                    $('<td>').text(attr.updated),
                    $('<td>').text(attr.when_failed));
                    $('#attributes-' + drives.name.replace( /(:|\.|\[|\]|,)/g, "_")).append(row);
                    })
                $('.smart_three').treegrid({'initialState': 'collapsed'})
            });
            $('.smart-spinner').hide();
        }
    });
}

function reloadtab() {
    if ($('#diskt').is(':visible')) {
		get_diskinfo();
    } else if ($('#proc').is(':visible')) {
		processes();
    } else if ($('#ohm_').is(':visible')) {
        getohm();
    }
}

   //Used for kill and signal command
   $(document).on('click', '.cmd', function(e){
       e.preventDefault();
       var par = {'cmd':$(this).attr('data-cmd'), 'pid':$(this).attr('data-pid'), 'signal':$(this).attr('data-signal')};
       if (confirm('Are you sure you want to terminate '+ $(this).attr('data-name')+'?')) {
       $.getJSON(WEBDIR + "stats/command/", par, function (response) {
            $.pnotify({
                title: response.status,
                text: response.msg,
                type: response.status,
                addclass: "stack-bottomright",
                stack: {"dir1": "up", "dir2": "left", push: 'top'}
            });
            //Update info inside the tab
            processes();
       });
   }
   });

    function runscript(s){
        $.ajax({
                url: WEBDIR + 'stats/run_script/'+ s,
                type: 'get',
                success: function (data) {
                    if (data.exit_status) {
                        $('#script-info').html('Failed to run ' + s);
                        $('#script-result').html('<pre>' + data.result +'</pre>');
                    }
                    if (data.result) {
                        $('#script-result').html('<pre style=display:table;>' + data.result +'</pre>');
                        $('#script-info').html('<code>'+ s + ' took ' + data.runtime + ' sec</code>');

                    }

                }
        });
    }


    if (location.hash) {
        $('a[href='+location.hash+']').tab('show');
    } else {
        $('a[data-toggle="tab"]:first').tab('show')
    }


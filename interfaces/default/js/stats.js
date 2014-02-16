/**
 * Converts bytes to readable filesize in kb, MB, GB etc.
 */
 
 // For hdd.
 function getReadableFileSizeStringHDD(fileSizeInBytes) {
    var i = -1;
    var byteUnits = [' kB', ' MB', ' GB', ' TB', 'PB'];
    do {
        fileSizeInBytes = fileSizeInBytes / 1000;
        i++;
    } while (fileSizeInBytes > 1000);
    return fileSizeInBytes.toFixed(1) + byteUnits[i];
};
 

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
            $('#torrents-queue').html("");
            $('#error_message').text("");
		    
            $.each(response, function (i, disk) {
                var row = $('<tr>');
                var progressBar = $('<div>');
                progressBar.addClass('bar');
                progressBar.css('width', (disk.percent) + '%');
		progressBar.text(getReadableFileSizeString(disk.used)); // added the text
                var progress = $('<div>');
                progress.addClass('progress');
		//

		//
                if (disk.percent >= 90) {
                    progress.addClass('progress-danger');
                }
                progress.append(progressBar);
		//
		//
		var progress2 = 	"<div class='progress hddprog'><div class=bar style=width:" + disk.percent + "%><span class=sr-only>"+ getReadableFileSizeStringHDD(disk.used) +"</span></div><div class='bar bar-success' style=width:" + (100 - disk.percent) + "% ><span class=sr-only>" + getReadableFileSizeStringHDD(disk.free) +"</span></div>";
		
		if (disk.percent >=87) {
			//progress2.addClass('progress-danger'); // need to check, does not work
		}


                row.append(
                $('<td>').addClass('qbt_name').text(disk.mountpoint),
		$('<td>').addClass('qbt_ratio').text(getReadableFileSizeStringHDD(disk.free)),
		$('<td>').addClass('qbit_eta').text(getReadableFileSizeStringHDD(disk.used)),
		$('<td>').addClass('qbt_state').text(getReadableFileSizeStringHDD(disk.total)),
		$('<td>').addClass('span3 qbit_progress').html(progress2),
		$('<td>').addClass('qbt_state').text(disk.percent));
                $('#torrents-queue').append(row);
		});
            $('.spinner').hide();
        }
    });
}

function uptime() {
    $.getJSON(WEBDIR + "stats/uptime2", function (data) {
	    $(".r").text("Uptime: "+ data.uptime);
    });
}

function cpu_percent() {
    $.getJSON(WEBDIR + "stats/cpu_percent", function (cpu) {
	//alert(typeof(response.idle));
	var ccpu = (100 - cpu.idle).toFixed(1)
	var progressBar = $('<div>');
	progressBar.addClass('bar');
	progressBar.css('width', (ccpu) + '%');
	progressBar.text('CPU: ' + (ccpu) + ' %');
	var progress = $('<div>');
	progress.addClass('progress statsbar hide');
	//progress.append('<div class=span4><div class=lol progress statbar span4><div class=span4>')
	
	
	if (ccpu >= 90) {
		progress.addClass('progress-danger');
	}
	progress.append(progressBar); //
	$(".cpu").append(progress);
	$(".cpu").append("<div class=ff nonbar>CPU: " + (100 - cpu.idle).toFixed(1) + "%</div>");
	$(".cpu").append("<div>User: "+ cpu.user +"%</div>");
	$(".cpu").append("<div>System: "+ cpu.system +"%</div>");
	$(".cpu").append("<div>Idle: "+ cpu.idle +"%</div>");
	//$( ".cpu" ).append( progress, [ $("<div class=ff nonbar>CPU: " + (100 - cpu.idle).toFixed(1) + "%</div>"), $("<div>User: "+ cpu.user +"%</div>"), $("<div>System: "+ cpu.system +"%</div>"), $("<div>Idle: "+ cpu.idle +"%</div>") ] ); // test

    });
}

function get_external_ip() {
    $.getJSON(WEBDIR + "stats/get_external_ip", function (response) {
	//$(".externalip").append("External ip : "+ response.externalip);
	$(".txip").text(response.externalip);

    });
}


function get_local_ip() {
    $.getJSON(WEBDIR + "stats/get_local_ip", function (response) {
	//$(".localip").text("Local ip: "+ response.localip);
	$(".tlip").text(response.localip);

    });
}

function network_usage() {
    $.getJSON(WEBDIR + "stats/network_usage", function (response) {
	//alert(response);
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
        //alert(response);
	$("#stat-sent").text(getReadableFileSizeString(response.bytes_sent));
	$("#stat-recv").text(getReadableFileSizeString(response.bytes_recv));
        $(".nw").html("<table class='table-fluid nwtable'><tr><td class=span4>Network</td><td class=span4>In</td><td class=span4>Out</td</tr><tr><td>Drop</td><td>" + response.dropin + "</td><td>" + response.dropout + "</td></tr><tr><td>Error</td><td>" + response.errin + "</td><td>" + response.errout + "</td></tr><tr><td>IP</td><td class=tlip></td><td class=txip></td></tr></tbody></table>");
    });
}

function get_user() {
    $.getJSON(WEBDIR + "stats/get_user", function (response) {
	$(".l").text(response.name +" logged in " + response.started + " ago")
    });
}

function sys_info() {
    $.getJSON(WEBDIR + "stats/sys_info", function (response) {
	//alert(response);
	//Orginal$(".c").append("<div>"+ response.system +' '+ response.release + ' ' + response.user + "</div>");
	$(".c").html("<div>"+ response.system +' '+ response.release + ' ' + response.user + "</div>");
    });
}


function virtual_memory_nobar() {
    $.getJSON(WEBDIR + "stats/virtual_memory", function (virtual) {
        //alert(response);
	var progressBar = $('<div>');
	progressBar.addClass('bar');
	progressBar.css('width', (virtual.percent) + '%');
	progressBar.text('Memory: ' + virtual.percent + ' %');
	var progress = $('<div>');
	progress.addClass('progress');
	
	if (virtual.percent >= 90) {
		progress.addClass('progress-danger');
	}
	progress.append(progressBar);
	//$(".virmem").append(progress);
        $(".virmem").append("<div class=nonbar>Physical Memory: " + virtual.percent + "%</div>");
        $(".virmem").append("<div>Total: " + getReadableFileSizeString(virtual.total) + "</div>");
        $(".virmem").append("<div>Used: " + getReadableFileSizeString(virtual.used) + "</div>");
        $(".virmem").append("<div>Free: " + getReadableFileSizeString(virtual.available) + "</div>");
	
    });
}

function virtual_memory_bar() {
    $.getJSON(WEBDIR + "stats/virtual_memory", function (virtual) {
        //alert(response);
	var progressBar = $('<div>');
	progressBar.addClass('bar');
	progressBar.css('width', (virtual.percent) + '%');
	progressBar.text('Memory: ' + virtual.percent + ' %');
	var progress = $('<div>');
	progress.addClass('progress');
	
	if (virtual.percent >= 90) {
		progress.addClass('progress-danger');
	}
	progress.append(progressBar);
	//$(".virmem").append(progress);
	$(".virmem").append("<div>Physical memory</div>");
	$(".virmem").append("<div class=progress><div class=bar style=width:" + virtual.percent + "%><span class=sr-only>Used: "+ virtual.percent +"%</span></div><div class='bar bar-success' style=width:" + (100 - virtual.percent) + "% ><span class=sr-only>Free: " + (100 - virtual.percent) +"%</span></div>");
	$(".virmem").append("<div class=progress><div class=bar style=width:" + virtual.percent + "%><span class=sr-only>Used: "+ getReadableFileSizeString(virtual.used)+"</span></div><div class='bar bar-success' style=width:" + (100 - virtual.percent) + "% ><span class=sr-only>Free: " + getReadableFileSizeString(virtual.available) +"</span></div>");
	//$(".virmem").append("<div class=progress><div class=bar style=width:"+ virtual.percent +"%>"+getReadableFileSizeString(virtual.used) +"</div></div>");
        //$(".virmem").append("<div>Total: " + getReadableFileSizeString(virtual.total) + "</div>");
        //$(".virmem").append("<div>Used: " + getReadableFileSizeString(virtual.used) + "</div>");
        //$(".virmem").append("<div>Free: " + getReadableFileSizeString(virtual.available) + "</div>");
	
    });
}

function virtual_memory_bar2() {
    $.getJSON(WEBDIR + "stats/virtual_memory", function (virtual) {
	//$(".test2").replaceWith("<div>Physical memory</div><div class=progress><div class=bar style=width:" + virtual.percent + "%><span class=sr-only>Used: "+ virtual.percent +"%</span></div><div class='bar bar-success' style=width:" + (100 - virtual.percent) + "%><span class=sr-only>Free: " + (100 - virtual.percent) +"%</span></div></div><div class=progress><div class=bar style=width:" + virtual.percent + "%><span class=sr-only>Used: "+ getReadableFileSizeString(virtual.used)+"</span></div><div class='bar bar-success' style=width:" + (100 - virtual.percent) + "% ><span class=sr-only>Free: " + getReadableFileSizeString(virtual.free) +"</span></div>");	
	$(".virmem").html("<div>Physical memory</div><div class=progress><div class=bar style=width:" + virtual.percent + "%><span class=sr-only>Used: "+ virtual.percent +"%</span></div><div class='bar bar-success' style=width:" + (100 - virtual.percent) + "%><span class=sr-only>Free: " + (100 - virtual.percent) +"%</span></div></div><div class=progress><div class=bar style=width:" + virtual.percent + "%><span class=sr-only>Used: "+ getReadableFileSizeString(virtual.used)+"</span></div><div class='bar bar-success' style=width:" + (100 - virtual.percent) + "% ><span class=sr-only>Free: " + getReadableFileSizeString(virtual.free) +"</span></div>");	
	
    });
}

function virtual_memory_table() {
    $.getJSON(WEBDIR + "stats/virtual_memory", function (virtual) {
	//$(".test4").replaceWith("<table class='table nwtable'><tr><td class=span4>Physical Memory:</td><td class=span4>" + virtual.percent + "%</td></tr><tr><td>Total:</td><td>" + getReadableFileSizeString(virtual.total) + "</td></tr><tr><td>Used:</td><td>" + getReadableFileSizeString(virtual.used) + "</td></tr><tr><td>Free:</td><td>" + getReadableFileSizeString(virtual.free) + "</td></tr></tbody></table>");
	$(".virmem").html("<table class='table nwtable'><tr><td class=span4>Physical Memory:</td><td class=span4>" + virtual.percent + "%</td></tr><tr><td>Total:</td><td>" + getReadableFileSizeString(virtual.total) + "</td></tr><tr><td>Used:</td><td>" + getReadableFileSizeString(virtual.used) + "</td></tr><tr><td>Free:</td><td>" + getReadableFileSizeString(virtual.free) + "</td></tr></tbody></table>");
    });
}

function swap_memory_bar() {
    $.getJSON(WEBDIR + "stats/swap_memory", function (swap) {
        //alert(response.total);
	var progressBar = $('<div>');
	progressBar.addClass('bar');
	progressBar.css('width', (swap.percent) + '%');
	progressBar.text('Memory: ' + swap.percent + ' %');
	var progress = $('<div>');
	progress.addClass('progress');
	
	if (swap.percent >= 90) {
		progress.addClass('progress-danger');
	}
	//progress.append(progressBar);
	//$(".swpmem").append("<div>Swap memory</div>");
	//$(".swpmem").append("<div class=progress><div class=bar style=width:" + swap.percent + "%><span class=sr-only>Used: "+ swap.percent +"%</span></div><div class='bar bar-success' style=width:" + (100 - swap.percent) + "% ><span class=sr-only>Free: " + (100 - swap.percent) +"%</span></div>");
	//$(".swpmem").append("<div class=progress><div class=bar style=width:" + swap.percent + "%><span class=sr-only>Used: "+ getReadableFileSizeString(swap.used)+"</span></div><div class='bar bar-success' style=width:" + (100 - swap.percent) + "% ><span class=sr-only>Free: " + getReadableFileSizeString(swap.free) +"</span></div>");
	//$( "<p>Test</p>" ).appendTo( ".swpmem" );
	$(".swpmem").html("<div>Swap memory</div><div class=progress><div class=bar style=width:" + swap.percent + "%><span class=sr-only>Used: "+ swap.percent +"%</span></div><div class='bar bar-success' style=width:" + (100 - swap.percent) + "%><span class=sr-only>Free: " + (100 - swap.percent) +"%</span></div></div><div class=progress><div class=bar style=width:" + swap.percent + "%><span class=sr-only>Used: "+ getReadableFileSizeString(swap.used)+"</span></div><div class='bar bar-success' style=width:" + (100 - swap.percent) + "% ><span class=sr-only>Free: " + getReadableFileSizeString(swap.free) +"</span></div>");	
	//$(".swpmem").append(progress);
        //$(".swpmem").append("<div class=nonbar>Swap Memory: " + swap.percent + "%</div>");
        //$(".swpmem").append("<div>Total: " + getReadableFileSizeString(swap.total) + "</div>");
        //$(".swpmem").append("<div>Used: " + getReadableFileSizeString(swap.used) + "</div>");
        //$(".swpmem").append("<div>Free: " + getReadableFileSizeString(swap.free) + "</div>");
    });
}

function swap_memory_bar2() {
    $.getJSON(WEBDIR + "stats/swap_memory", function (swap) {
        //alert(response.total);
	$(".swpmem").html("<div>Swap memory</div><div class=progress><div class=bar style=width:" + swap.percent + "%><span class=sr-only>Used: "+ swap.percent +"%</span></div><div class='bar bar-success' style=width:" + (100 - swap.percent) + "%><span class=sr-only>Free: " + (100 - swap.percent) +"%</span></div></div><div class=progress><div class=bar style=width:" + swap.percent + "%><span class=sr-only>Used: "+ getReadableFileSizeString(swap.used)+"</span></div><div class='bar bar-success' style=width:" + (100 - swap.percent) + "% ><span class=sr-only>Free: " + getReadableFileSizeString(swap.free) +"</span></div>");	
	
    });
}

function swap_memory_nobar() {
    $.getJSON(WEBDIR + "stats/swap_memory", function (swap) {
        //alert(response.total);
	var progressBar = $('<div>');
	progressBar.addClass('bar');
	progressBar.css('width', (swap.percent) + '%');
	progressBar.text('Memory: ' + swap.percent + ' %');
	var progress = $('<div>');
	progress.addClass('progress');
	
	if (swap.percent >= 90) {
		progress.addClass('progress-danger');
	}
	progress.append(progressBar);
	//$(".swpmem").append(progress);
        $(".swpmem").append("<div class=nonbar>Swap Memory: " + swap.percent + "%</div>");
        $(".swpmem").append("<div>Total: " + getReadableFileSizeString(swap.total) + "</div>");
        $(".swpmem").append("<div>Used: " + getReadableFileSizeString(swap.used) + "</div>");
        $(".swpmem").append("<div>Free: " + getReadableFileSizeString(swap.free) + "</div>");
    });
}

function swap_memory_table() {
    $.getJSON(WEBDIR + "stats/swap_memory", function (swap) {
        //alert(response.total);
	var progressBar = $('<div>');
	progressBar.addClass('bar');
	progressBar.css('width', (swap.percent) + '%');
	progressBar.text('Memory: ' + swap.percent + ' %');
	var progress = $('<div>');
	progress.addClass('progress');
	
	if (swap.percent >= 90) {
		progress.addClass('progress-danger');
	}
	progress.append(progressBar);
	//$(".swpmem").append(progress);
	//var x =("<table class='table nwtable'><tr><td class=span4>Swap Memory:</td><td class=span4>" +swap.percent +"%</td></tr><tr><td>Total:</td><td>"+getReadableFileSizeString(swap.total)+"</td></tr><tr><td>Used:</td><td>"+getReadableFileSizeString(swap.used)+"</td></tr><tr><td>Free:</td><td>"+getReadableFileSizeString(swap.free)+"</td></tr></tbody></table>");
	//var xx =("<tr><td class=span4>Swap Memory:</td><td class=span4>" +swap.percent +"%</td></tr><tr><td>Total:</td><td>"+getReadableFileSizeString(swap.total)+"</td></tr><tr><td>Used:</td><td>"+getReadableFileSizeString(swap.used)+"</td></tr><tr><td>Free:</td><td>"+getReadableFileSizeString(swap.free)+"</td></tr></tbody></table>");

	//var yy = ("<table class='table nwtable'>")
	//yy.append(xx)
	//$(".swpmem").append(yy);
	$(".swpmem").html("<table class='table nwtable'><tr><td class=span4>Swap Memory:</td><td class=span4>" +swap.percent +"%</td></tr><tr><td>Total:</td><td>"+getReadableFileSizeString(swap.total)+"</td></tr><tr><td>Used:</td><td>"+getReadableFileSizeString(swap.used)+"</td></tr><tr><td>Free:</td><td>"+getReadableFileSizeString(swap.free)+"</td></tr></tbody></table>");

	//orginal $(".swpmem").append("<table class='table nwtable'><tr><td class=span4>Swap Memory:</td><td class=span4>" +swap.percent + "%</td></tr><tr><td>Total:</td><td>" + getReadableFileSizeString(swap.total) + "</td></tr><tr><td>Used:</td><td>" + getReadableFileSizeString(swap.used) + "</td></tr><tr><td>Free:</td><td>" + getReadableFileSizeString(swap.free) + "</td></tr></tbody></table>");

    });
}



function cpu_percent_bar() {
    $.getJSON(WEBDIR + "stats/cpu_percent", function (cpu) {
	//alert(typeof(response.idle));
	$(".cpu").append("<div class=hcpu>CPU</div>");
	$(".cpu").append("<div class='progress pcpu'><div class=bar style=width:" + (cpu.user + cpu.system).toFixed(1) + "%><span class=sr-only>Used: "+ (cpu.user + cpu.system).toFixed(1) +"%</span></div><div class='bar bar-success' style=width:" + (100 -(cpu.user + cpu.system)).toFixed(1) + "% ><span class=sr-only>Idle: " + cpu.idle +"%</span></div>");
	$(".cpu").append("<div class=progress><div class=bar style=width:" + cpu.user.toFixed(1) + "%><span class=sr-only>User: "+ cpu.user.toFixed(1) +"%</span></div><div class='bar bar-warning' style=width:" + cpu.system.toFixed(1) + "%><span class=sr-only>System: "+ cpu.system.toFixed(1) +"%</span></div><div class='bar bar-success' style=width:" + (100 - (cpu.user + cpu.system)).toFixed(1) + "% ><span class=sr-only>Idle: " + cpu.idle +"%</span></div>");
	if (cpu.idle <= 10) {
		$('.pcpu').addClass('progress-danger');
	}
	//$(".swpmem").html("<div>Swap memory</div><div class=progress><div class=bar style=width:" + swap.percent + "%><span class=sr-only>Used: "+ swap.percent +"%</span></div><div class='bar bar-success' style=width:" + (100 - swap.percent) + "%><span class=sr-only>Free: " + (100 - swap.percent) +"%</span></div></div><div class=progress><div class=bar style=width:" + swap.percent + "%><span class=sr-only>Used: "+ getReadableFileSizeString(swap.used)+"</span></div><div class='bar bar-success' style=width:" + (100 - swap.percent) + "% ><span class=sr-only>Free: " + getReadableFileSizeString(swap.free) +"</span></div>");	
	
	//$(".cpu").append("<div class=ff nonbar>CPU: " + (100 - cpu.idle).toFixed(1) + "%</div>");
	//$(".cpu").append("<div>User: "+ cpu.user +"%</div>");
	//$(".cpu").append("<div>System: "+ cpu.system +"%</div>");
	//$(".cpu").append("<div>Idle: "+ cpu.idle +"%</div>");

    });
}

function cpu_percent_bar2() {
    $.getJSON(WEBDIR + "stats/cpu_percent", function (cpu) {
	//alert(typeof(response.idle));
	//$(".cpu").append("<div class=hcpu>CPU</div>");
	//$(".cpu").append("<div class='progress pcpu'><div class=bar style=width:" + (cpu.user + cpu.system).toFixed(1) + "%><span class=sr-only>Used: "+ (cpu.user + cpu.system).toFixed(1) +"%</span></div><div class='bar bar-success' style=width:" + (100 -(cpu.user + cpu.system)).toFixed(1) + "% ><span class=sr-only>Idle: " + cpu.idle +"%</span></div>");
	//$(".cpu").append("<div class=progress><div class=bar style=width:" + cpu.user.toFixed(1) + "%><span class=sr-only>User: "+ cpu.user.toFixed(1) +"%</span></div><div class='bar bar-warning' style=width:" + cpu.system.toFixed(1) + "%><span class=sr-only>System: "+ cpu.system.toFixed(1) +"%</span></div><div class='bar bar-success' style=width:" + (100 - (cpu.user + cpu.system)).toFixed(1) + "% ><span class=sr-only>Idle: " + cpu.idle +"%</span></div>");
	if (cpu.idle <= 10) {
		//$('.pcpu').addClass('progress-danger');
	}
	// here
	$(".cpu").html("<div>CPU</div><div class=progress><div class=bar style=width:" + (cpu.user + cpu.system).toFixed(1) + "%><span class=sr-only>Used: "+ (cpu.user + cpu.system).toFixed(1) +"%</span></div><div class='bar bar-success' style=width:" + (100 - (cpu.user + cpu.system)).toFixed(1) + "%><span class=sr-only>Idle: "+ cpu.idle.toFixed(1) +"%</span></div></div><div class=progress><div class=bar style=width:" + cpu.user.toFixed(1) + "%><span class=sr-only>User: "+ cpu.user.toFixed(1) +"%</span></div><div class='bar bar-warning' style=width:" + cpu.system.toFixed(1) + "%><span class=sr-only>System: "+ cpu.system.toFixed(1) +"%</span></div><div class='bar bar-success' style=width:" + (100 - (cpu.user + cpu.system)).toFixed(1) + "%><span class=sr-only>Idle: " + cpu.idle.toFixed(1) +"%</span></div></div>");
	//$(".cpu").html("<div>Swap memory</div><div class=progress><div class=bar style=width: " + (cpu.user + cpu.system).toFixed(1) + "%><span class=sr-only>Used: "+ (cpu.user + cpu.system).toFixed(1) +"</span></div><div class='bar bar-success' style=width: " + (100 -(cpu.user + cpu.system)) + "%><span class=sr-only>Idle: "+ cpu.idle +"</span></div></div><div class=progress><div class=bar style=width: " + (cpu.user + cpu.system).toFixed(1) + "%><span class=sr-only>Used: "+ (cpu.user + cpu.system).toFixed(1) +"%</span></div><div class='bar bar-warning' style=width: " + cpu.system.toFixed(1) + "%><span class=sr-only>System: "+ cpu.system.toFixed(1) +"%</span></div><div class='bar bar-success' style=width: " + (100 - (cpu.user + cpu.system) + "%><span class=sr-only>Idle: " + cpu.idle +"%</span></div></div>");
	//$(".swpmem").html("<div>Swap memory</div><div class=progress><div class=bar style=width:" + swap.percent + "%><span class=sr-only>Used: "+ swap.percent +"%</span></div><div class='bar bar-success' style=width:" + (100 - swap.percent) + "%><span class=sr-only>Free: " + (100 - swap.percent) +"%</span></div></div><div class=progress><div class=bar style=width:" + swap.percent + "%><span class=sr-only>Used: "+ getReadableFileSizeString(swap.used)+"</span></div><div class='bar bar-success' style=width:" + (100 - swap.percent) + "% ><span class=sr-only>Free: " + getReadableFileSizeString(swap.free) +"</span></div>");	
	
	//$(".cpu").append("<div class=ff nonbar>CPU: " + (100 - cpu.idle).toFixed(1) + "%</div>");
	//$(".cpu").append("<div>User: "+ cpu.user +"%</div>");
	//$(".cpu").append("<div>System: "+ cpu.system +"%</div>");
	//$(".cpu").append("<div>Idle: "+ cpu.idle +"%</div>");

    });
}


function cpu_percent_nobar() {
    $.getJSON(WEBDIR + "stats/cpu_percent", function (cpu) {
	//alert(typeof(response.idle));
	var ccpu = (100 - cpu.idle).toFixed(1)
	var progressBar = $('<div>');
	progressBar.addClass('bar');
	progressBar.css('width', (ccpu) + '%');
	progressBar.text('CPU: ' + (ccpu) + ' %');
	var progress = $('<div>');
	progress.addClass('progress');	
	
	if (ccpu >= 90) {
		progress.addClass('progress-danger');
	}
	progress.append(progressBar); //
	//$(".cpu").append(progress); // Comment to make sure that the bar isnt added.
	$(".cpu").append("<div class=ff nonbar>CPU: " + (100 - cpu.idle).toFixed(1) + "%</div>");
	$(".cpu").append("<div>User: "+ cpu.user +"%</div>");
	$(".cpu").append("<div>System: "+ cpu.system +"%</div>");
	$(".cpu").append("<div>Idle: "+ cpu.idle +"%</div>");

    });
}

function cpu_percent_table() {
    $.getJSON(WEBDIR + "stats/cpu_percent", function (cpu) {
	$(".cpu").html("<table class='table nwtable'><tr><td class=span4>CPU:</td><td class=span4>" + (100 - cpu.idle).toFixed(1) + "%</td></tr><tr><td>User:</td><td>" + cpu.user + "%</td></tr><tr><td>System:</td><td>" + cpu.system + "%</td></tr><tr><td>Idle:</td><td>" + cpu.idle + "%</td></tr></tbody></table>");

    });
}

function return_settings3() {
    $.getJSON(WEBDIR + "stats/return_settings", function (return_settings) {
        if (return_settings.stats_use_bars == 'true') {
            cpu_percent_bar2();
	    swap_memory_bar2();
	    virtual_memory_bar2();
        } else if (return_settings.stats_use_bars == 'false') {
            //cpu_percent_nobar();
	    cpu_percent_table();
	    //swap_memory_nobar();
	    swap_memory_table();
	    //virtual_memory_nobar();
	    virtual_memory_table();
		
        } else {
            //pass 
        }



    });
}


// Loads the moduleinfo
$(document).ready(function () {
    $('.spinner').show();
    get_diskinfo();
    uptime();
    get_user();
    get_external_ip();
    get_local_ip();
    network_usage_table();
    sys_info();
    return_settings3();
});

setInterval(function () {
    get_diskinfo();
    uptime();
    get_user();
    get_external_ip(); // dont want to spam a external service.
    get_local_ip();
    network_usage_table();
    sys_info();
    return_settings3();
}, 8000);

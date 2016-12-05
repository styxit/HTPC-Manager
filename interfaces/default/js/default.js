$.ajaxSetup({timeout: 30000})

$(document).ready(function () {
	$("[type='checkbox']").bootstrapSwitch();
    // Handle other links check if it should open in
    // iframe or not
	$('.other-link-item').click(function (e) {
		e.preventDefault();
		window.open(url);
	});

    $('.useiframe').click(function (e) {
        e.preventDefault();
        window.open(url);
    });


    // use something like this? https://github.com/csnover/TraceKit

    window.onerror = function (message, file, line) {
        var e = {
                'message': message,
                'page': window.location.href,
                'file': file,
                'line': line
        };

            if (JSLOGCONSOLE == 0) {
                return false
            } else {
                $.post(WEBDIR + "log/logit", e, function (data) {
                });
            }
        };


    $('.other-link-item').mousedown(function(e){
        var url = $(this).find("a").attr("href")
        if (pybooltojsbool(ALLOWIFRAME) === true && e.which==1) { //if iframe is on and left click
			// open in iframe
            location.href = WEBDIR + 'iframe?link=' + encodeURIComponent(url)
        } else {
            // Open link in a new tab
            window.open(url);
        }
    });

    $('.useiframe').mousedown(function(e){
        var url = $(this).attr("href")
        if (pybooltojsbool(ALLOWIFRAME) === true && e.which==1) { //if iframe is on and left click
                // open in iframe
            location.href = WEBDIR + 'iframe?link=' + encodeURIComponent(url)
        } else {
            // Open link in a new tab
            window.open(url);
        }
    });

    tablesorterOptions = {
        //debug: true,
        //theme: 'bootstrap',
        headerTemplate: '{content} {icon}',
        ignoreCase: true,
        filter_ignoreCase: true,
        widgets : [ "filter", "zebra" ],
        //widgets : [ "uitheme", "filter", "zebra" ],
        widgetOptions : {
          filter_columnFilters: false,
          filter_hideFilters : true

        }
    };


    $.tablesorter.themes.bootstrap = {
      table        : 'table table-bordered table-striped',
      caption      : 'caption',
      // header class names
      header       : 'bootstrap-header', // give the header a gradient background (theme.bootstrap_2.css)
      sortNone     : '',
      sortAsc      : '',
      sortDesc     : '',
      active       : '', // applied when column is sorted
      hover        : '', // custom css required - a defined bootstrap style may not override other classes
      // icon class names
      icons        : '', // add "icon-white" to make them white; this icon class is added to the <i> in the header
      iconSortNone : 'fa fa-sort', // class name added to icon when column is not sorted
      iconSortAsc  : 'fa fa-chevron-up', // class name added to icon when column has ascending sort
      iconSortDesc : 'fa fa-chevron-down', // class name added to icon when column has descending sort
      filterRow    : '', // filter row class; use widgetOptions.filter_cssFilter for the input/select element
      footerRow    : '',
      footerCells  : '',
      even         : '', // even row zebra striping
      odd          : ''  // odd row zebra striping
    };

    $('.carousel').carousel()

    $(window).on('hashchange', function () {
        if (location.hash) {
            $('a[href=' + location.hash + ']').tab('show', filter_cb(location.hash));
        } else {
            if ($('a[data-toggle="tab"]').length > 0) {
                $('a[data-toggle="tab"]:first').tab('show', filter_cb());
            }
            // To enable tables that are not in a tab and exclude tabs
            if ($('a[data-toggle="tab"]').length === 0 && $('.table-sortable').length > 0) {
                // Allow search on everything in the table
                $('.search').attr('data-column', "all");
                $('.search').attr('placeholder', find_filter_name());
                // add def options
                $('.table-sortable').tablesorter(tablesorterOptions);
                // Enable search
                $.tablesorter.filter.bindSearch($('.table-sortable'), $('.search'), false);

            }

        }

    });


    function filter_cb(loc) {
        // call back for tabs, active tablesorter
        // there must be a better way..
        var t;
        // loc.hash == id
        if (!loc) {
            // lets try to find the first tab
             $t = $('.tab-pane.active').find('table')

        } else {
            $t = $(loc).find('table')
        }

        // piggyback on old class
        if ($t.hasClass('table-sortable')) {
            if ($t.length) {
                // Allow search on everything in the table
                $('.search').attr('data-column', "all")
                $('.search').attr('placeholder', find_filter_name())

                // add def options
                $t.tablesorter(tablesorterOptions);
                // Enable search
                $.tablesorter.filter.bindSearch( $t, $('.search'), false)
            }
        } else {
            // to set default place holder if that table isnt sortable
            //$('.search').attr('placeholder', 'Search')
        }
    }

    function find_filter_name() {
        // this will not fire unless a table is sortable
        var tname;

        // For modules with tabs
        if ($('ul.nav.nav-tabs').find('li.active a').text()) {
            tname = $('ul.nav.nav-tabs').find('li.active a').text()
        } else {
            // Modules with no tabs but h1 has a link
            if ($('.content h1.page-title a').text()) {
                tname = $('div.container-fluid > div.content > h1.page-title a').text()
            // Modules with no tabs and no link in h1
            } else {
                tname = $.trim($('div.container-fluid > div.content > h1.page-title').html())
            }
        }

        var name = (tname) ? 'Filter ' + tname : 'Search'

        return name

    }


    // Activates the tooltips
    $('.settingstooltip').tooltip({placement: 'right'})
    $('.settingstooltip-left').tooltip({placement: 'left'})
    $('.settingstooltip-top').tooltip({placement: 'top'})
    $('.settingstooltip-bottom').tooltip({placement: 'bottom'})

    $('a[data-toggle="tab"]').on('click', function(e) {
        var yScroll = $(window).scrollTop()
        location.hash = $(e.target).attr('href')
        $(window).scrollTop(yScroll)
    })
    $('form.disabled').submit(function(e) {
        e.preventDefault()
    })
    $('a.ajax-link').click(function (e) {
        e.preventDefault()
        var link = $(this)
        $.getJSON(link.attr('href'), function(data) {
            notify(link.text(), data, 'success')
        })
    });

    $('a.linkdisabled').click(function (e) {
        e.preventDefault();
    });

    // Set the correct images path for raty plugin
    $.fn.raty.defaults.path = null

    $('a.ajax-confirm').click(function (e) {
        e.preventDefault()
        var link = $(this)
        // to support tooltip
        var t = (link.attr('title') == '' || typeof(link.attr('title')) == 'undefined') ? link.attr('data-original-title') : link.attr('title');

        if (confirm(t + '?')) {
            $.getJSON(link.attr('href'), function(data){
                notify(t, data, 'info')
            })
        }
    })
    $('a.confirm').click(function (e) {
        return(confirm($(this).attr('title') + '?'))
    })

    $('.do_update').click(function (e) {
        e.preventDefault();
        $.post(WEBDIR + "update/", function (data) {
            if (data == 1) {
                showModal('Installing update', '<div class="progress progress-striped active"><div class="bar" style="width:100%"></div></div>', '');
            } else {
                notify('Update', 'An error occured while updating!', 'error');
            }
        });
    });

    $('.btn-check-update').click(function (e) {
        e.preventDefault()
        notify('Update','Checking for update.','info')

        $.ajax({
            dataType: "json",
            timeout: 10000,
            url: WEBDIR + 'update/',
            success: function(data) {
                if ($.isNumeric(data.versionsBehind) && data.versionsBehind == 0) {
                    notify('Update', 'Already running latest version.', 'success')
                } else if (data.updateNeeded) {
                    if (confirm('Your are '+data.versionsBehind+' versions behind. Update needed. Update to latest version?')) {
                        $.post(WEBDIR + 'update/', function (data) {
                            if (data == 1) {
                                showModal('Installing update', '<div class="progress progress-striped active"><div class="bar" style="width:100%"></div></div>','')
                            } else {
                                notify('Update', 'An error occured while updating!', 'error')
                            }
                        }, 'json').always(function() {
                            checkUpdate()
                        })
                    }
                } else {
                    notify('Update', 'Failed. Check errorlog.', 'error')
                }
            }
        });
    })

    $('#modal_dialog').on('hidden', function () {
        $('#modal_dialog .modal-body').empty()
        $('#modal_dialog .trans').removeClass('trans')
        $('#modal_dialog .modal-fanart').css('background', '#fff')
    })


    $('.btn-menuorder').click(function() {
        $('#nav-menu-others').hide();
        $('#menu-search').hide();
        $('#menu-editing').show();
        $('#nav-menu').addClass('nav-menu-edit');
        $('.nav-menu-item').addClass('nav-menu-item-edit');
        $('#nav-menu').sortable({ items: ".nav-menu-item"});
    });

    $('#menu-cancel').click(function() {
        location.reload();
    });

    $('#menu-save').click(function() {
        $('#menu-editing').hide();
        $('#nav-menu-others').show();
        $('#menu-search').show();
        $('#nav-menu').removeClass('nav-menu-edit');
        $('.nav-menu-item').removeClass('nav-menu-item-edit');
        $("#nav-menu").sortable('disable');
        $.get(WEBDIR + "save_menu", 'menu_order=' + encodeURIComponent($("#nav-menu").sortable("toArray")), function (data) {
            notify('Menu',data,'info');
        })
        $("#nav-menu").sortable('destroy');
    });

    //build the menu
    menu_ordered = ""
    if (menu_order != '0' && menu_order != 'False') {
        menus_to_build = menu_order.split(',')
        for (var x = 0; x < menus_to_build.length; x++) {
            if (menus_to_build[x] in menus){
                menu_ordered += menus[menus_to_build[x]];
                delete menus[menus_to_build[x]]
            }
        }
    }
    for (var menu_item in menus) {  //build aditional items not in menu_order
        menu_ordered += menus[menu_item];
    }
    $(".mobile-search").after(menu_ordered)

    // fiks?
    if (HIGHLIGHT_MENU == 1) {
        path = window.location.href.split("/").slice(0, - 1).pop()
	   $('#nav-'+path).addClass('active')
    }


})


function byteSizeOrdering() {
// "modified parser for stats module (filesizes)
jQuery.tablesorter.addParser(
    {
      id: 'filesize',
      is: function (s)
      {
        // disable auto select parser
        return false;
        //return s.match(new RegExp(/[0-9]+(\.[0-9]+)?\ (KB|B|GB|MB|TB)/i));
      },
      format: function (s)
      {
        var suf
        if (s == 'N/A') {
            suf = 'N/A'
        } else{
            suf = s.match(new RegExp(/(KB|B|GB|MB|TB)$/i))[1];
            var num = parseFloat(s.match(new RegExp(/^[0-9]+(\.[0-9]+)?/))[0]);
        }

        switch (suf)
        {
          case 'N/A':
            return 'N/A';
          case 'B':
            return num;
          case 'KB':
            return num * 1024;
          case 'MB':
            return num * 1024 * 1024;
          case 'GB':
            return num * 1024 * 1024 * 1024;
          case 'TB':
            return num * 1024 * 1024 * 1024 * 1024;
        }
      },
      type: 'string'
    });
}


function makeIcon(iconClass, title) {
    return $('<i>')
        .addClass(iconClass)
        .attr('title', title)
        .css('cursor', 'pointer')
        .tooltip({placement: 'right'})
}
function shortenText(string, length) {
    return string.substr(0,length)+(string.length>length?'&hellip;':'')
}
function pad(str, max) {
    if  (!str) return str
  return str.toString().length < max ? pad("0"+str, max) : str
}
function bytesToSize(bytes, precision) {
    var sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)))
    return (bytes / Math.pow(1024, i)).toFixed(precision) + ' ' + sizes[i]
}
function parseDate(sec) {
    var date = new Date(sec*1000)
    var year = pad(date.getFullYear(), 2)
    var month = pad((date.getMonth() + 1), 2)
    var day = pad(date.getDate(), 2)
    var hour = pad(date.getHours(), 2)
    var min = pad(date.getMinutes(), 2)
    return year+'-'+month+'-'+day+' '+hour+':'+min
}
function parseSec(sec) {
    if (sec==undefined) return '0.00'
    var h = Math.floor(sec / 3600)
    var m = Math.floor(sec % 3600 / 60)
    var s = pad(Math.floor(sec % 60), 2)
    return ((h>0) ? h+':'+pad(m, 2) : m) + ':' + s
}
function notify(title, text, type, time) {
    $.pnotify({
        title: title,
        text: text,
        type: type,
        history: false,
        sticker: false,
        closer_hover: false,
        addclass: "stack-bottomright",
        stack: {"dir1": "up", "dir2": "left", push: 'top'}
    })
}
function showModal(title, content, buttons) {
    $('#modal_dialog .modal-h3').html(title);
    $('#modal_dialog').attr('tabindex', '-1');
    $('#modal_dialog .modal-body').html(content);
    var footer = $('#modal_dialog .modal-footer').empty()
    $.each(buttons, function (name, action) {
        footer.append(
            $('<button>').html(name).addClass('btn btn-primary').click(function() {
                $(action)
            })
        )
    })

    footer.append(
        $('<button>').html('Close').addClass('btn').click(function() {
            $(hideModal)
        })
    )

    $('#modal_dialog').modal({
        show: true,
        backdrop: true,
        keyboard: true
    });
}
function hideModal() {
    $('#modal_dialog').modal('hide')
}
function checkUpdate() {
    $.getJSON(WEBDIR + 'update/status', function (data) {
        if (data != 0) {
            setTimeout(checkUpdate, 1000)
        } else {
            location.reload()
        }
    }).error(function() {
        setTimeout(checkUpdate, 1000)
    })
}

// Fix for dropdown menu on small devices. Credits https://github.com/twbs/bootstrap/issues/4550#issuecomment-21361314
$('.dropdown-toggle').click(function(e) {
  e.preventDefault();
  setTimeout($.proxy(function() {
    if ('ontouchstart' in document.documentElement) {
      $(this).siblings('.dropdown-backdrop').off().remove();
    }
  }, this), 0);
});

// Should more all helpers to this file
// Converts bytes to filesize in kb,mb,gb
function getReadableFileSizeString(fileSizeInBytes) {
    var i = -1;
    if (fileSizeInBytes < 1024) return fileSizeInBytes + ' b';
    var byteUnits = ['kB', 'MB', 'GB', 'TB','PB'];
    do {
        fileSizeInBytes = fileSizeInBytes / 1024;
        i++;
    } while (fileSizeInBytes > 1024);
    return fileSizeInBytes.toFixed(1) + byteUnits[i];
};


// For hdd. Converts bytes to filesize in kb,mb,gb
 function getReadableFileSizeStringHDD(fileSizeInBytes) {
    var i = -1;
    // is KB because of sorting..
    if (fileSizeInBytes < 1024) return fileSizeInBytes + ' b';
    var byteUnits = ['kB', 'MB', 'GB', 'TB', 'PB'];
    do {
        fileSizeInBytes = fileSizeInBytes / 1000;
        i++;
    } while (fileSizeInBytes > 1000);
    return fileSizeInBytes.toFixed(1) + byteUnits[i];
};

// should really clean up js helpers..
function humanFileSize(bytes, pre, si) {
  // Set default args
    var si = typeof si ===  'undefined' ? true:false;
    var pre = typeof pre ===  'undefined' ? 0:pre;

    var thresh = si ? 1000 : 1024;
    if (bytes == 'N/A') return bytes;

    /*
    if(Math.abs(bytes) < thresh) {
        return bytes.toFixed(pre) + ' B';
    }
    */
    var units = si
        ? ['kB','MB','GB','TB','PB','EB','ZB','YB']
        : ['KiB','MiB','GiB','TiB','PiB','EiB','ZiB','YiB'];
    var u = -1;
    do {
        bytes /= thresh;
        ++u;
    } while(Math.abs(bytes) >= thresh && u < units.length - 1);
    return bytes.toFixed(pre)+ ' ' +units[u];
}

/**
 * Converts seconds to readable time. used by deluge
 */
function getReadableTime(timeInSeconds) {
  if (timeInSeconds < 1) {
    return '00:00:00';
  }

  var days = parseInt( timeInSeconds / 86400 ) % 7;
  var hours = parseInt( timeInSeconds / 3600 ) % 24;
  var minutes = parseInt( timeInSeconds / 60 ) % 60;
  var seconds = parseInt(timeInSeconds % 60);

  // Add leading 0 and : to seconds
  seconds = ':'+ (seconds  < 10 ? "0" + seconds : seconds);

  if (days < 1) {
    days = '';
  } else {
    days = days + 'd ';
    // remove seconds if the eta is 1 day or more
    seconds = '';
  }
  return days + hours + ":" + (minutes < 10 ? "0" + minutes : minutes) + seconds;
};

function pybooltojsbool(s) {
    // Allow "0" as db is a string col
    if (s == "1") {
        return true
    } else if (s == 'True') {
        return true
    } else if (s == 'true') {
        return true
    } else if (s == 'False') {
        return false
    } else if (s == 'false') {
        return false
    } else if (s == 0) {
        return false
    }
}


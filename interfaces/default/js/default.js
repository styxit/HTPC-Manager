$.ajaxSetup({timeout: 30000})

$(document).ready(function () {
    path = window.location.pathname.split('/')
    $('#nav-'+path[1]).addClass('active')

    $('.carousel').carousel()
    $(".table-sortable").tablesorter()
    $('.tabs').tab()
    $(window).on('hashchange', function() {
        if (location.hash) {
            $('a[href='+location.hash+']').tab('show');
        } else {
            $('a[data-toggle="tab"]:first').tab('show')
        }
    })

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
    })

    // Set the correct images path for raty plugin
    $.fn.raty.defaults.path = WEBDIR + '/img'

    $('a.ajax-confirm').click(function (e) {
        e.preventDefault()
        var link = $(this)
        if (confirm(link.attr('title') + '?')) {
            $.getJSON(link.attr('href'), function(data){
                notify(link.attr('title'), data, 'info')
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
                    if (confirm('Your are '+data.versionsBehind+' versions behind. Update need. Update to latest version?')) {
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
})

function byteSizeOrdering() {
    jQuery.tablesorter.addParser(
    {
      id: 'filesize',
      is: function (s)
      {
        return s.match(new RegExp(/[0-9]+(\.[0-9]+)?\ (KB|B|GB|MB|TB)/i));
      },
      format: function (s)
      {
        var suf = s.match(new RegExp(/(KB|B|GB|MB|TB)$/i))[1];
        var num = parseFloat(s.match(new RegExp(/^[0-9]+(\.[0-9]+)?/))[0]);
        switch (suf)
        {
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
      type: 'numeric'
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

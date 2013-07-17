$.ajaxSetup({timeout: 3000});

$(document).ready(function () {
    path = window.location.pathname.split('/');
    $('#nav-'+path[1]).addClass('active');

    $('.carousel').carousel();
    $(".table-sortable").tablesorter();
    $('.tabs').tab();
    $(window).on('hashchange', toggleTab);
    $('a[data-toggle="tab"]').on('click', function(e) {
        var yScroll = $(window).scrollTop();
        location.hash = $(e.target).attr('href');;
        $(window).scrollTop(yScroll);
    });

    $('a.ajax-link').click(function (e) {
        e.preventDefault();
        var link = $(this);
        $.get(link.attr('href'), function(data) {
            notify(link.text(), data, 'success');
        }, 'json');
    });
    $('a.ajax-confirm').click(function (e) {
        e.preventDefault();
        var link = $(this);
        if (confirm(link.attr('title') + '?')) {
            $.get(link.attr('href'), function(data){
                notify(link.attr('title'), data, 'info');
            }, 'json');
        }
    });
    $('a.confirm').click(function (e) {
        return(confirm($(this).attr('title') + '?'));
    });

    $('#btn-check-update').click(function (e) {
        e.preventDefault();
        notify('Update','Checking for update.','info');
        $.getJSON(WEBDIR + 'update/', function (data) {
            if (data == 0) {
                notify('Update', 'Already running latest version.', 'success');
            } else if (data == null || !$.isNumeric(data[0]) || data[0] < 0) {
                console.log(data)
                notify('Update', 'Failed. Check errorlog.', 'error');
            } else {
                if (confirm('Your are '+data[0]+' versions behind. Update to latest version?')) {
                    showModal('Installing update', '<div class="progress progress-striped active"><div class="bar" style="width:100%"></div></div>','');
                    $.post(WEBDIR + 'update/', function (data) {
                        if (data == 1) {
                            notify('Update', 'Update in progress!', 'info');
                        } else {
                            notify('Update', 'An error occured while updating!', 'error')
                        }
                    }, 'json').always(function() {
                        setTimeout('checkUpdate', 1000);
                    });
                }
            }
        });
    });

    $('#modal_dialog').on('hidden', function () {
        $('#modal_dialog .trans').removeClass('trans');
        $('#modal_dialog .modal-fanart').css('background', '#ffffff');
    })
});

function toggleTab() {
    if (location.hash) {
        $('a[href='+location.hash+']').tab('show');
    } else {
        $('a[data-toggle="tab"]:first').tab('show')
    }
}

function makeIcon(iconClass, title) {
    var icon = $('<i>');
    icon.addClass(iconClass);
    icon.attr('title', title);
    icon.css('cursor', 'pointer');
    icon.tooltip({
        placement: 'right'
     });
    return icon;
}

function shortenText(string, length) {
    return string.substr(0,length)+(string.length>length?'&hellip;':'');
}

function pad(str, max) {
  return str.toString().length < max ? pad("0"+str, max) : str;
}
function bytesToSize(bytes, precision) {
    var sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return (bytes / Math.pow(1024, i)).toFixed(precision) + ' ' + sizes[i];
}
function parseDate(sec) {
    var date = new Date(sec*1000);
    var year = pad(date.getFullYear(), 2);
    var month = pad(date.getMonth(), 2);
    var day = pad(date.getDate(), 2);
    var hour = pad(date.getHours(), 2);
    var min = pad(date.getMinutes(), 2);
    return year+'-'+month+'-'+day+' '+hour+':'+min;
}
function parseSec(sec) {
    if (sec==undefined) return '0.00';
    var h = Math.floor(sec / 3600);
    var m = Math.floor(sec % 3600 / 60);
    var s = pad(Math.floor(sec % 60), 2);
    return ((h>0) ? h+':'+pad(m, 2) : m) + ':' + s;
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
    });
}

function showModal(title, content, buttons) {
    $('#modal_dialog').find('.modal-h3').html(title);
    $('#modal_dialog').find('.modal-body').html(content);
    var footer = $('#modal_dialog').find('.modal-footer').empty()

    $.each(buttons, function (name, action) {
        var button = $('<button>');
        button.html(name);
        button.addClass('btn btn-primary');
        button.click(function () {
            $(action);
        });
        footer.append(button)
    });

    var button = $('<button>');
    button.html('Close');
    button.addClass('btn');
    button.click(function () {
        hideModal()
    });
    footer.append(button)

    $('#modal_dialog').modal({
        show: true,
        backdrop: true
    });
}

function hideModal() {
    $('#modal_dialog').find('.modal-body').empty();
    $('#modal_dialog').modal('hide')
}

function checkUpdate() {
    $.getJSON(WEBDIR + 'update/status', function (data) {
        if (data != '0') {
            setTimeout('checkUpdate', 1000);
        } else {
            location.reload()
        }
    }).error(function() {
        setTimeout('checkUpdate', 1000);
    })
}

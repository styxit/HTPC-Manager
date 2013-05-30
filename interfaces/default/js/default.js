var scriptArray = [
    WEBDIR + 'js/libs/bootstrap.min.js',
    WEBDIR + 'js/libs/jquery.form.js',
    WEBDIR + 'js/libs/jquery.cookie.js',
    WEBDIR + 'js/libs/jquery.metadata.js',
    WEBDIR + 'js/libs/jquery.tablesorter.min.js',
    WEBDIR + 'js/libs/jquery.raty.min.js',
    WEBDIR + 'js/libs/jquery.pnotify.min.js',
    WEBDIR + 'js/libs/holder.js',
    WEBDIR + 'js/functions/functions.xbmc.js',
    WEBDIR + 'js/functions/functions.sickbeard.js',
    WEBDIR + 'js/functions/functions.sabnzbd.js'
];

$.each(scriptArray, function (i, url) {
    var script = $('<script>').attr('src', url);
    $('head').append(script);
});

$.ajaxSetup({timeout: 5000})

$(document).ready(function () {
    path = window.location.pathname.split('/');
    $('#nav-'+path[1]).addClass('active');

    $("#search").keyup(function (e) {
        var filter = $(this).val()
        $(".filter:visible:first li").each(function () {
            var shown = ($(this).text().toUpperCase().indexOf(filter.toUpperCase()) >= 0);
            $(this).toggle(shown);
        });
    }).keydown(function (e) {
        e.stopPropagation();
    });
    $('.carousel').carousel();
    $(".table-sortable").tablesorter();
    $('.tabs').tab();
    $('a[data-toggle="tab"]').on('shown', function(e) {
        var current_tab = $(e.target).attr('href');
        $.cookie('active_tab', current_tab);
        $(".search-query").val('').trigger('keyup');
    });
    active_tab = (location.hash) ? location.hash : $.cookie('active_tab');
    $('[href='+active_tab+']').trigger('click');

    $('#xbmc-player').tooltip({trigger : 'manual'});
    $('#xbmc-player').tooltip('show');

    $('#btn-check-update').click(function (e) {
        e.preventDefault();
        notify('Update','Checking for update.','info');
        $.get(WEBDIR + 'update/', function (update) {
            if (update.behind == 0) {
                notify('Update','Already running latest version.','success');
            } else if (update.behind < 0) {
                notify('Update','In app updating not supported. Git-command not found, or you are ahead of the master branch.','error');
            } else {
                if (confirm('Your are '+update.behind+' versions behind. Update to latest version?')) {
                    showModal('Installing update', '<div class="spinner"></div>','');
                    $.post(WEBDIR + 'update/', function (data) {
                        hideModal();
                        if (data.completed) {
                            notify('New version installed!','success');
                        } else {
                            notify('An error occured while updating','error')
                        }
                    }, 'json');
                } else {
                    notify('Update cancelled!','info');
                }
            }
        }, 'json');
    });
    $('#btn-restart').click(function (e) {
        e.preventDefault();
        if (confirm('Restart?')) {
            notify('Restart','Restart command sent...','success')
            $.get(WEBDIR + 'restart', function() {
                // On restart
            }, 'json');
        }
    });
    $('#btn-shutdown').click(function (e) {
        e.preventDefault();
        if (confirm('Shutdown?')) {
            notify('Shutdown','Shutdown command sent.','success')
            $.get(WEBDIR + 'shutdown', function() {
                // On shutdown confirmed
            }, 'json');
        }
    });

    $('#modal_dialog').on('hidden', function () {
        $('#modal_dialog .trans').removeClass('trans');
        $('#modal_dialog .modal-fanart').css('background', '#ffffff');
    })
});

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
var stack_bottomright = {"dir1": "up", "dir2": "left", push: 'top'};
function notify(title, text, type, time) {
    $.pnotify({
        title: title,
        text: text,
        type: type,
        history: false,
        sticker: false,
        closer_hover: false,
        addclass: "stack-bottomright",
        stack: stack_bottomright
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
    //button.attr('data-dismiss', 'modal');
    button.click(function () {
        hideModal()
    });
    footer.append(button)

    $('#modal_dialog').modal({
        show: true,
        backdrop: true
    });
}

function hideModal(){
    $('#modal_dialog').find('.modal-body').empty();
    $('#modal_dialog').modal('hide')
}

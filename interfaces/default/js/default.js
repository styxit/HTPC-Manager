var scriptArray = [
    '/js/libs/bootstrap.min.js',
    '/js/libs/jquery.form.js',
    '/js/libs/jquery.cookie.js',
    '/js/libs/jquery.metadata.js',
    '/js/libs/jquery.tablesorter.min.js',
    '/js/libs/jquery.raty.min.js',
    '/js/functions/functions.xbmc.js',
    '/js/functions/functions.sickbeard.js',
    '/js/functions/functions.sabnzbd.js'
];

$.each(scriptArray, function (i, url) {
    var script = $('<script>').attr('src', url);
    $('head').append(script);
});

$(document).ready(function () {
    path = window.location.pathname.split('/');
    $('#'+path[1]).addClass('active');

    $('.carousel').carousel();
    $(".table-sortable").tablesorter();
    $('.tabs').tab();
    $('a[data-toggle="tab"]').on('shown', function(e) {
        var current_tab = $(e.target).attr('href');
        $.cookie('active_tab', current_tab);
    });
    var last_active_tab = $.cookie('active_tab');
    $('[href=' + last_active_tab + ']').trigger('click');

    $('#xbmc-player').tooltip({trigger : 'manual'});
    $('#xbmc-player').tooltip('show');

    $('#btn-check-update').click(function (e) {
        e.preventDefault();
        notify('Update','Checking for update.','info');
        $.get('/system/checkupdate', function (update) {
            if (update.behind == 0) {
                notify('Update','Already running latest version.','success');
            } else {
                if (confirm('Your are '+update.behind+' versions behind. Update to latest version?')) {
                    showModal('Installing update', '<img src="/img/loader.gif" alt="loader" /> Please wait...','');
                    $.get('/system/update', function (data) {
                        hideModal();
                        if (data.update == 'success') {
                            notify('New version installed!','success');
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
            $.get('/system/restart', function() {
                // On restart
            }, 'json');
        }
    });
    $('#btn-shutdown').click(function (e) {
        e.preventDefault();
        if (confirm('Shutdown?')) {
            notify('Shutdown','Shutdown command sent.','success')
            $.get('/system/shutdown', function() {
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

function pad (str, max) {
  return str.toString().length < max ? pad("0"+str, max) : str;
}
function bytesToSize(bytes, precision) {
    var sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return (bytes / Math.pow(1024, i)).toFixed(precision) + ' ' + sizes[i];
}

function parseSec(sec) {
    if (sec==undefined) return '0.00';
    min = Math.floor(sec / 60);
    sec = pad(Math.floor(sec % 60), 2);
    return min + ':' + sec;
}

function notify(title, text, type, time) {
    if (time==undefined) time = 4000;
    $('#notify-user').removeClass().addClass('alert alert-'+type);
    $('#notify-user h4').html(title);
    $('#notify-user span').html(text);
    $('#notify-user').fadeIn(function () {
        setTimeout(function () {
            $('#notify-user').fadeOut();
        }, time);
    });
}

function showModal(title, content, buttons) {
    $('#modal_dialog').find('.modal-h3').html(title);
    $('#modal_dialog').find('.modal-body').html(content);
    var footer = $('#modal_dialog').find('.modal-footer').empty()

    $.each(buttons, function (name, action) {
        var button = $('<button>');
        button.html(name);
        button.addClass('btn');
        button.click(function () {
            $(action);
        });
        footer.append(button)
    });
 
    var button = $('<button>');
    button.html('Close');
    button.addClass('btn');
    button.attr('data-dismiss', 'modal');
    footer.append(button)

    $('#modal_dialog').modal({
        show: true,
        backdrop: true
    });
}

function hideModal(){
    $('#modal_dialog').modal('hide')
}

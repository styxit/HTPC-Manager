var scriptArray = [
    'js/bootstrap.min.js',
    'js/jquery/jquery.lazyload.min.js',
    'js/jquery/jquery.form.js',
    'js/jquery/jquery.cookie.js',
    'js/jquery/jquery.metadata.js',
    'js/jquery/jquery.tablesorter.min.js',
    'js/jquery/jquery.raty.min.js',
    'js/functions/functions.xbmc.js',
    'js/functions/functions.sickbeard.js',
    'js/functions/functions.sabnzbd.js'
];

$.each(scriptArray, function (i, url) {
    var script = $('<script>').attr('src', url);
    $('head').append(script);
});

// Lazyload
$(document).ajaxStop(function(){
    $('img.lazy').lazyload({
        effect: 'fadeIn'
    }).removeClass('lazy');
});

$(document).ready(function () {
    // trigger lazyload on tab click
    $('a[data-toggle="tab"]').on('shown', function (e) {
        $(window).trigger('scroll');
    })

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

    $('.carousel').carousel();

    // trigger lazyload on carousel click
    $('.carousel').on('slide', function (e) {
        $(window).trigger('scroll');
    })

    $('#btn-check-update').click(function () {
        $.ajax({
            url: 'json/checkupdate',
            type: 'get',
            dataType: 'json',
            beforeSend: function() {
                showModal('Looking for update', '<img src="img/loader.gif" alt="loader" /> Please wait...','');
            },
            success: function (update) {
                $('#modal_dialog').modal('hide')
                if (update.behind == 0) {
                    notify('Update','Already running latest version.','success');
                } else {
		    if (confirm('Your are '+update.behind+' versions behind. Update to latest version?')) {
			$.ajax({
			    url: 'json/update',
			    type: 'get',
			    dataType: 'json',
			    beforeSend: function() {
				showModal('Installing update', '<img src="img/loader.gif" alt="loader" /> Please wait...','');
			    },
			    success: function (data) {
                                $('#modal_dialog').modal('hide')
				if (data.update == 'success') {
				    notify('New version installed!','success');
				}
			    }
			});
		    } else {
			notify('Update cancelled!','info');
		    }
                }
            },
            complete: function (){
            	$('#modal_dialog').modal('hide')
            }
        });
    });
    $('#btn-restart').click(function () {
        if (confirm('Restart?')) {
            $.ajax({
                url: 'json/restart',
                type: 'get',
                dataType: 'json',
                beforeSend: function() {
                    notify('Restart command sent.','success')
                }
            });
        }
    });
    $('#btn-shutdown').click(function () {
        if (confirm('Shutdown?')) {
            $.ajax({
                url: 'json/shutdown',
                type: 'get',
                dataType: 'json',
                beforeSend: function() {
                    notify('Shutdown command sent.','success')
                }
            });
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

function shortenText(text, length) {
    if (text == null) return '';
    var shorten_text = text;
    if (text.length > length) {
        shorten_text = shorten_text.substr(0, length);
        shorten_text += '...';
    }
    return shorten_text;
}

function pad(number, length) {
    var str = '' + number;
    while (str.length < length) {
        str = '0' + str;
    }
    return str;
}

function bytesToSize(bytes, precision) {
    var sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes == 0) return '0';
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return (bytes / Math.pow(1024, i)).toFixed(precision) + ' ' + sizes[i];
}

function parseSec(sec) {
    if (sec==undefined) return 0;
    min = pad(Math.floor(sec / 60), 2);
    sec = pad(Math.floor(sec % 60), 2);
    return min + ':' + sec;
}

function notify(title, text, type) {
    $('#notify-user').removeClass().addClass('alert alert-'+type);
    $('#notify-user h4').html(title);
    $('#notify-user span').html(text);
    $('#notify-user').fadeIn(function () {
        setTimeout(function () {
            $('#notify-user').fadeOut();
        }, 4000);
    });
}

function showModal(title, content, buttons) {
    $('#modal_dialog').find('.modal-h3').html(title);
    $('#modal_dialog').find('.modal-body').html(content);
    $('#modal_dialog').find('.modal-footer').html('');

    var button = $('<a>');
    button.html('Close');
    button.attr('href', 'javascript:void(0);');
    button.addClass('btn');
    button.attr('data-dismiss', 'modal');
    $('#modal_dialog').find('.modal-footer').append(button)

    $.each(buttons, function (name, action) {
        var button = $('<a>');
        button.html(name);
        button.attr('href', '#');
        button.addClass('btn');
        button.click(function () {
            $(action);
        });
        $('#modal_dialog').find('.modal-footer').append(button)
    });
    
    $('#modal_dialog').modal({
        show: true,
        backdrop: true
    });
}

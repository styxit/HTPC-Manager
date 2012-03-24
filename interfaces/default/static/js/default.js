var scriptArray = [
    'js/jquery.form.js',
    'js/jquery.cookie.js',
    'js/bootstrap.min.js',
    'js/functions/functions.xbmc.js',
    'js/functions/functions.sickbeard.js',
    'js/functions/functions.sabnzbd.js'
];

//scripts inladen
$.each(scriptArray, function (i, scripturl) {
	var script = $('<script>');
	script.attr('src', scripturl);
	$('head').append(script);
});

$(document).ready(function () {

	// Tabs maken
    $('.tabs').tab();
    $('a[data-toggle="tab"]').on('shown', function(e) {
        var current_tab = $(e.target).attr('href');
        $.cookie('active_tab', current_tab);
    });
	// Actieve tab laden
	var last_active_tab = $.cookie('active_tab');
	$('[href=' + last_active_tab + ']').trigger('click');

    // Tooltip op de player
    $('#xbmc-player').tooltip({trigger : 'manual'});
    $('#xbmc-player').tooltip('show');

    // Carousel
    $('.carousel').carousel();

});

// Text inkorten
function shortenText(text, length) {
    var shorten_text = text;
    if (text.length > length) {
        shorten_text = shorten_text.substr(0, length);
        shorten_text += '...';
    }
    return shorten_text;
}

// Dialog weg
function hideModal() {
    $('#modal_dialog').modal('hide');
}

// tonen van een dailog
function showModal(el, title, content, buttons) {

    $(el).popover('hide')
    $('#modal_dialog').find('.modal-footer').html('');
    $('#modal_dialog').find('.modal-h3').html(title);
    $('#modal_dialog').find('.modal-body').html(content);

    // Sluiten knop
    var button = $('<a>');
    button.html('Close');
    button.attr('href', 'javascript:void(0);');
    button.addClass('btn');
    button.attr('data-dismiss', 'modal');
    $('#modal_dialog').find('.modal-footer').append(button)

    // Andere buttons toevoegen
    $.each(buttons, function (name, action) {
        var button = $('<a>');
        button.html(name);
        button.attr('href', 'javascript:void(0);');
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

// Icoontjes maken
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

// leading zeros
function pad(number, length) {
    var str = '' + number;
    while (str.length < length) {
        str = '0' + str;
    }
    return str;
}


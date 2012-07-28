$(document).ready(function () {

    // pauze / resume
    $('#nzb_pause_button').click(function () {
        var clickItem = $(this);
        clickItem.button('loading');
        $.ajax({
            url: '/json/sabnzbd/?action=' + queueToggleStatusAction,
            dataType: 'json',
            type: 'get'
        });
    });

    $('#add_nzb_button').click(function() {
        $('#add_nzb_form').submit();
    })

    // nzb toevoegen
    $('#add_nzb_form').ajaxForm({
        url: '/json/sabnzbd/?action=addnzb',
        type: 'post',
        dataType: 'json',
        success: function (result) {
            if (result.status != undefined && result.status) {
                $('[href=#active]').trigger('click');
                $('#nzb_url').val('');
                $('#nzb_category').val('');
            }
        }
    });

    // Categroeien inladen
    setCategories('#nzb_category', '*');

    // Speed zetten
    $('#nzb_set_speed').click(function() {

        var speed = ($('#nzb_get_speed').val());

        $.ajax({
            url: '/json/sabnzbd/?action=speed&value=' + speed,
            type: 'post',
            dataType: 'json'
        });
    });
    // nzb actief inladen en elke seconde refreshen
    loadQueue(1);
    setInterval(function() {
        loadQueue(0);
    }, 5000);

    // nzb historie inladen
    loadHistory();

    // Waarschuwingen inladen
    loadWarnings();
});

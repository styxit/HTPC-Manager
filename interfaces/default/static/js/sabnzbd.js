$(document).ready(function () {

    // pauze / resume
    $('#nzb_pause_button').click(function () {
        var clickItem = $(this);
        clickItem.button('loading');
        $.ajax({
            url: '/json/?which=sabnzbd&action=' + queueToggleStatusAction,
            dataType: 'json',
            type: 'get'
        });
    });

    // nzb toevoegen
    $('#add_nzb_form').ajaxForm({
        url: '/json/?which=sabnzbd&action=addnzb',
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
    $('#set_speed').keypress(function() {

        var speed = ($(this).val() * 10);

        $.ajax({
            url: '/json/?which=sabnzbd&action=speed&value=' + speed,
            type: 'post',
            dataType: 'json',
            success: function(data) {

            }
        });
    });
    // nzb actief inladen en elke seconde refreshen
    loadQueue();
    setInterval(function() {
        loadQueue();
    }, 5000);

    // nzb historie inladen
    loadHistory();

    // Waarschuwingen inladen
    loadWarnings();
});

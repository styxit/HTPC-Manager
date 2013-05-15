$(document).ready(function () {
    $('#nzb_pause_button').click(function () {
        var clickItem = $(this);
        clickItem.button('loading');
        $.ajax({
            url: WEBDIR + 'sabnzbd/TogglePause?mode='+queueToggleStatusAction,
            dataType: 'json',
            type: 'get'
        });
    });

    $('#add_nzb_button').click(function() {
        $('#add_nzb_form').submit();
    })

    $('#add_nzb_form').ajaxForm({
        url: WEBDIR + 'sabnzbd/AddNzbFromUrl',
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

    setCategories('#nzb_category', 'Default');

    $('#nzb_set_speed').click(function() {
        var speed = ($('#nzb_get_speed').val());
        $.ajax({
            url: WEBDIR + 'sabnzbd/SetSpeed?speed=' + speed,
            type: 'post',
            dataType: 'json'
        });
    });
    loadQueue(1);
    setInterval(function() {
        loadQueue(0);
    }, 5000);
    loadHistory();
    loadWarnings();
});

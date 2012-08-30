$(document).ready(function () {
    $('.btn-test').click(function(e) {
        e.preventDefault();
        var btn = $(this).button('loading');
        var action = btn.attr('data-target');
        var data = btn.parents('form:first').serialize();
        $.post(action, data, function(data) {
            btn.button('reset')
            if (data!=null) {
                btn.addClass('btn-success').append(' ').append($('<i>').addClass('icon-white icon-ok'));
            } else {
                btn.addClass('btn-danger').append(' ').append($('<i>').addClass('icon-white icon-exclamation-sign'));
            }
        });
    });
    $('input, radio, select, button').bind('change keydown', function(e) {
        $('.btn-test').button('reset').removeClass('btn-success btn-danger');
    });
    $('form').submit(function(e) {
        e.preventDefault();
        var action = $(this).attr('action')
        if (action === undefined) action='';
        var data = $(this).serialize();
        $(this).find("input:checkbox:not(:checked)").each(function(e){
            data+='&'+$(this).attr('name')+'=0';
        });
        $.post(action, data, function(data) {
            msg = data ? 'Save successful' : 'Save failed';
            notify('Settings', msg, 'info');
        });
    });
    $.get('/xbmc/Servers', function(data) {
        if (data==null) return;
        var servers = $('#xbmc_server_id').change(function() {
            var item = $(this);
            $.get('/xbmc/getserver?id='+item.val(), function(data) {
                if (data==null) return item.parents('form:first').get(0).reset();
                $('#xbmc_server_name').val(data.name);
                $('#xbmc_server_host').val(data.host);
                $('#xbmc_server_port').val(data.port);
                $('#xbmc_server_username').val(data.username);
                $('#xbmc_server_password').val(data.password);
            });
        });
        $.each(data.servers, function(i, item) {
            var server = $('<option>').text(item.name).val(item.id);
            servers.append(server);
        });
        var removeIcon = $('<i>').addClass('icon-remove');
        var removeBtn = $('<button>').addClass('btn').html(removeIcon).click(function(e){
            id = $('#xbmc_server_id').val()
            $.get('/xbmc/delserver?id='+id, function(data) {
                notify('Settings', 'Server deleted', 'info');
            });
        }).insertAfter(servers);
    }, 'json');
    $('input.enable-module').change(function() {
        var clickItem = $(this);
        var disabled = !clickItem.is(':checked');
        var moduleItems = clickItem.parents('fieldset:first').find('input, radio, select');
        moduleItems.attr('readonly', disabled);
        moduleItems.attr('disabled', disabled);
        clickItem.attr('disabled', false);
        clickItem.attr('readonly', false);
    });
});

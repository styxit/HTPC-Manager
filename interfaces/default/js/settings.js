$(document).ready(function () {
    $('.btn-test').click(function(e) {
        e.preventDefault();
        var btn = $(this).button('loading');
        var action = btn.attr('data-target');
        var data = btn.parents('form:first').serialize();
        $.post(action, data, function(data) {
            btn.button('reset');
            if (data['Network.MacAddress'] && data['Network.MacAddress'] != 'Busy') {
                $('#xbmc_server_mac:visible').val(data['Network.MacAddress']);
            }
            if (data!=null == 1) {
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
        console.log(data)
        $.post(action, data, function(data) {
            msg = data ? 'Save successful' : 'Save failed';
            notify('Settings', msg, 'info');
            if ($('#xbmc_server_id').is(":visible")) xbmc_update_servers($('#xbmc_server_id').val());
        });
    });
    $('input.enable-module').change(function() {
        var disabled = !$(this).is(':checked');
        $(this).parents('fieldset:first').find('input, radio, select').not(this)
            .attr('readonly', disabled)
            .attr('disabled', disabled);
    });
    $('input.enable-module').trigger('change')
    $('#xbmc_server_id').change(function() {
        var item = $(this);
        $.get(WEBDIR + 'xbmc/getserver?id='+item.val(), function(data) {
            if (data==null) {
                $("button:reset:visible").html('Clear').removeClass('btn-danger').unbind();
                return;
            }
            $('#xbmc_server_id').val(data.id);
            $('#xbmc_server_name').val(data.name);
            $('#xbmc_server_host').val(data.host);
            $('#xbmc_server_port').val(data.port);
            $('#xbmc_server_username').val(data.username);
            $('#xbmc_server_password').val(data.password);
            $('#xbmc_server_mac').val(data.mac);
            $("button:reset:visible").html('Delete').addClass('btn-danger').click(function(e) {
                e.preventDefault();
                var id = $('#xbmc_server_id').val()
                var name = $("#xbmc_server_id option:selected").text();
                if (!confirm('Delete ' + name)) return;
                $.get(WEBDIR + 'xbmc/delserver?id='+id, function(data) {
                    notify('Settings', 'Server deleted', 'info');
                    xbmc_update_servers(id);
                });
            });
        });
    });
    xbmc_update_servers(0);
});

function xbmc_update_servers(id) {
    $.get(WEBDIR + 'xbmc/Servers', function(data) {
        if (data==null) return;
        var servers = $('#xbmc_server_id').empty().append($('<option>').text('New').val(0));
        $.each(data.servers, function(i, item) {
            var option = $('<option>').text(item.name).val(item.id);
            if (id == item.id) option.attr('selected', 'selected');
            servers.append(option);
        });
    }, 'json');
}
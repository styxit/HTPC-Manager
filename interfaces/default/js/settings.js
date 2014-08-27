$(document).ready(function () {
    $('#other button.save').on('click', function (event) {
        event.preventDefault();

        data = [];
        $('#other table tbody tr').each(function (index) {
            tr = $(this);
            data.push({
                name: tr.find("input[name='name']").val(),
                url: tr.find("input[name='url']").val()
            });
        });

        // Save data
        $.ajax({
            method: 'POST',
            url: WEBDIR + 'settings/urls',
            data: JSON.stringify(data),
            success: function () {
                notify('Settings', 'Save successful', 'info');
            },
            error: function () {
                notify('Settings', 'Save failed', 'error');
            }
        });
    });

    $(document.body).off('click', '#other button.delete');
    $(document.body).on('click', '#other button.delete', function (event) {
        event.preventDefault();
        $(this).closest('tr').remove();
    });

    $('#other button.add').on('click', function (event) {
        event.preventDefault();
        $('#other table tbody').append(
        $('<tr>').append(
        $('<td>').html('<input type="text" value=""name="name">'),
        $('<td>').html('<input type="text" value=""name="url">'),
        $('<td>').html('<button class="btn btn-mini delete">Delete</button>')));
    });

    $(window).trigger('hashchange');
    $('.btn-test').click(function (e) {
        e.preventDefault();
        var btn = $(this).button('loading');
        var action = btn.attr('data-target');
        var data = btn.parents('form:first').serialize();
        $.post(action, data, function (data) {
            btn.button('reset');
            if ($('#couchpotato_name').is(":visible")) {
                if (data.success) {
                    $('#couchpotato_apikey').val(data.api_key);
                } else {
                    notify('Settings', 'Failed to get couchpotato apikey', 'error');
                    btn.addClass('btn-danger').append(' ').append($('<i>').addClass('icon-white icon-exclamation-sign'));
                }
            }
            if (data !== null) {
                btn.addClass('btn-success').append(' ').append($('<i>').addClass('icon-white icon-ok'));
                if (data['Network.MacAddress'] && data['Network.MacAddress'] != 'Busy') {
                    $('#xbmc_server_mac:visible').val(data['Network.MacAddress']);
                }
            } else {
                btn.addClass('btn-danger').append(' ').append($('<i>').addClass('icon-white icon-exclamation-sign'));
            }
        }).error(function () {
            btn.button('reset');
            btn.addClass('btn-danger').append(' ').append($('<i>').addClass('icon-white icon-exclamation-sign'));
        });
    });
    $('input, radio, select, button').bind('change input', function (e) {
        $('.btn-test').button('reset').removeClass('btn-success btn-danger');
    });
    $('form').submit(function (e) {
        e.preventDefault();
        var action = $(this).attr('action');
        if (action === undefined) action = '';
        var data = $(this).serialize();
        $(this).find("input:checkbox:not(:checked)").each(function (e) {
            data += '&' + $(this).attr('name') + '=0';
        });
        $.post(action, data, function (data) {
            msg = data ? 'Save successful' : 'Save failed';
            notify('Settings', msg, 'info');
            if ($('#xbmc_server_id').is(":visible")) {
                xbmc_update_servers(0);
                this.reset();
            }
            if ($('#users_user_id').is(":visible")) {
                users_update_user(0);
                this.reset();
            }
            if ($('#plex_name').is(":visible")) {
                $.post(WEBDIR + 'plex/myPlexSignin', '', function (data) {
                    if (data === null) return;
                    notify('myPlex', data, 'info');
                });
            }
        });
        window.location.reload(true);
    });
    $(":reset").click(function (e) {
        e.preventDefault();
        $(':input').not(':button, :submit, :reset, :hidden').removeAttr('checked').removeAttr('selected').not(':checkbox, :radio, select').val('');
    });
    $('input.enable-module').change(function () {
        var disabled = !$(this).is(':checked');
        $(this).parents('fieldset:first').find('input, radio, select').not(this)
            .attr('readonly', disabled).attr('disabled', disabled);
    });
    $('input.enable-module').trigger('change');
    $('#xbmc_server_id').change(function () {
        $('button:reset:visible').html('Clear').removeClass('btn-danger').unbind();
        var item = $(this);
        var id = item.val();
        if (id === 0) $('button:reset:visible').trigger('click');
        $.get(WEBDIR + 'xbmc/getserver?id=' + id, function (data) {
            if (data === null) return;
            $('#xbmc_server_name').val(data.name);
            $('#xbmc_server_host').val(data.host);
            $('#xbmc_server_port').val(data.port);
            $('#xbmc_server_username').val(data.username);
            $('#xbmc_server_password').val(data.password);
            $('#xbmc_server_mac').val(data.mac);
            $("button:reset:visible").html('Delete').addClass('btn-danger').click(function (e) {
                var name = item.find('option:selected').text();
                if (!confirm('Delete ' + name)) return;
                $.get(WEBDIR + 'xbmc/delserver?id=' + id, function (data) {
                    notify('Settings', 'Server deleted', 'info');
                    $(this).val(0);
                    item.find('option[value=' + id + ']').remove();
                    $('button:reset:visible').html('Clear').removeClass('btn-danger').unbind();
                });
            });
        });
    });
    xbmc_update_servers(0);
    $('input.enable-module').trigger('change');
    $('#users_user_id').change(function () {
        $('button:reset:visible').html('Clear').removeClass('btn-danger').unbind();
        var item = $(this);
        var id = item.val();
        if (id === 0) $('button:reset:visible').trigger('click');
        $.get(WEBDIR + 'users/getuser?id=' + id, function (data) {
            if (data === null) return;
            $('#users_user_username').val(data.username);
            $('#users_user_password').val(data.password);
            $('#users_user_role').val(data.role);
            $("button:reset:visible").html('Delete').addClass('btn-danger').click(function (e) {
                var name = item.find('option:selected').text();
                if (!confirm('Delete ' + name)) return;
                $.get(WEBDIR + 'users/deluser?id=' + id, function (data) {
                    notify('Settings', data.username + ' deleted', 'info');
                    $(this).val(0);
                    item.find('option[value=' + id + ']').remove();
                    $('button:reset:visible').html('Clear').removeClass('btn-danger').unbind();
                });
            });
        });
    });
    users_update_user(0);
    $('#gdm_plex_servers').change(function () {
        var item = $(this);
        var id = item.val();
        $.get(WEBDIR + 'plex/GetServers?id=' + id, function (data) {
            if (data === null) return;
            console.log(data.servers.serverName);
            $('#plex_name').val(data.servers.serverName);
            $('#plex_host').val(data.servers.ip);
            $('#plex_port').val(data.servers.port);
        });
    });
    gdm_plex_servers(0);
});

function xbmc_update_servers(id) {
    $.get(WEBDIR + 'xbmc/getserver', function (data) {
        if (data === null) return;
        var servers = $('#xbmc_server_id').empty().append($('<option>').text('New').val(0));
        $.each(data.servers, function (i, item) {
            var option = $('<option>').text(item.name).val(item.id);
            if (id == item.id) option.attr('selected', 'selected');
            servers.append(option);
        });
    }, 'json');
}

function gdm_plex_servers(id) {
    $.get(WEBDIR + 'plex/GetServers', function (data) {
        if (data === null) return;
        var servers = $('#gdm_plex_servers').empty().append($('<option>').text('Select').val(0));
        $.each(data.servers, function (i, item) {
            var option = $('<option>').text(item.serverName).val(item.uuid);
            if (id == item.id) option.attr('selected', 'selected');
            servers.append(option);
        });
    }, 'json');
}

function users_update_user(id) {
    $.get(WEBDIR + 'users/getuser', function (data) {
        if (data === null) return;
        var users = $('#users_user_id').empty().append($('<option>').text('New').val(0));
        $.each(data.users, function (i, item) {
            var option = $('<option>').text(item.name).val(item.id);
            if (id == item.id) option.attr('selected', 'selected');
            users.append(option);
        });
    }, 'json');
}
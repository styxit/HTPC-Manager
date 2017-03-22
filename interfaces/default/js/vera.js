// Document ready
$(document).ready(function () {
    $(window).trigger('hashchange')
    loadLights();
    
    // reload tab content on tab click
    $('#tab-lights').click(function() {
        loadLights();
    })
    // reload tab content on tab click
    $('#tab-plugs').click(function() {
        loadPlugs();
    })
    // reload tab content on tab click
    $('#tab-locks').click(function() {
        loadLocks();
    })
    // reload tab content on tab click
    $('#tab-therm').click(function() {
        loadTherm();
    })
    action = $('#action');
    action.find('button').click(function(){
        toggleStateAction;    
    });
    

});

function toggleStateAction(dtype,id,state) {
    $.ajax({
        url: WEBDIR + 'vera/ToggleStateAction?dtype=' + dtype + '&id=' + id + '&state=' + state,
        type: 'get',
        dataType: 'json',
        success: function (data) {
            loadLights(1);
            loadPlugs(1);
            loadLocks(1);
        }
    });
}

function loadLights() {
    $.ajax({
        url: WEBDIR + 'vera/GetDevices',
        type: 'get',
        dataType: 'json',
        success: function (data) {
            $('#lightslist').empty();
            if (data.status == false) {
                $('#notification_area').addClass('alert alert-error');
                $('#notification_area').html('<strong>Error</strong> Could not connect to Vera, go to <a href="' + WEBDIR + 'settings">settings</a>');
                return false;
            }
            $('#lightslist').html('');
            $.each(data.devices, function (i, device) {
                if(device.device_type.indexOf('DimmableLight') != -1) {                
                    $('button').click(function () {
                        var id = $(this).attr('data-deviceid');
                        var state = $(this).attr('data-state');
                        var dtype = $(this).attr('data-devicetype');
                        toggleStateAction(dtype,id,state);
                    })
                    
                    var buttons = $('<div id="action">').addClass('btn-group')
                    buttons.append($('<button id="on" type="button">').attr('data-devicetype','light').attr('data-deviceid',device.id).attr('data-state','100').addClass('btn btn-small').html('ON'));
                    buttons.append($('<button id="50" type="button">').attr('data-devicetype','light').attr('data-deviceid',device.id).attr('data-state','50').addClass('btn btn-small').html('50%'));
                    buttons.append($('<button id="off" type="button">').attr('data-devicetype','light').attr('data-deviceid',device.id).attr('data-state','0').addClass('btn btn-small').html('OFF'));
                    
                    $.each(data.rooms, function (i, room) {
                        if (room.id == device.room){
                            var roomname = room.name;
                            var row = $('<tr>')
                            var name = $('<td>').html(roomname);

                            row.append(name);
                            row.append($('<td>').append(device.name).append(' (').append(device.id).append(')'));
                            row.append($('<td>').append(buttons));

                            $('#lightslist').append(row);
                        }
                    });
                }
            });
            $('.spinner').hide();
        }
    });
}

function loadPlugs() {
    $.ajax({
        url: WEBDIR + 'vera/GetDevices',
        type: 'get',
        dataType: 'json',
        success: function (data) {
            $('#plugslist').empty();
            if (data.status == false) {
                $('#notification_area').addClass('alert alert-error');
                $('#notification_area').html('<strong>Error</strong> Could not connect to Vera, go to <a href="' + WEBDIR + 'settings">settings</a>');
                return false;
            }
            $('#plugslist').html('');
            $.each(data.devices, function (i, device) {
                if(device.device_type.search('BinaryLight') != -1) {
                    $('button').click(function () {
                        var id = $(this).attr('data-deviceid');
                        var state = $(this).attr('data-state')
                        var dtype = $(this).attr('data-devicetype')
                        toggleStateAction(dtype,id,state);
                    })
                    
                    var buttons = $('<div id="action">').addClass('btn-group')
                    buttons.append($('<button type="button">').attr('data-devicetype','plug').attr('data-deviceid',device.id).attr('data-state','1').addClass('btn btn-small').html('ON'));
                    buttons.append($('<button type="button">').attr('data-devicetype','plug').attr('data-deviceid',device.id).attr('data-state','0').addClass('btn btn-small').html('OFF'));

                    $.each(data.rooms, function (i, room) {
                        if (room.id == device.room){
                            var roomname = room.name;
                            var row = $('<tr>')
                            var name = $('<td>').html(roomname);

                            row.append(name);
                            row.append($('<td>').append(device.name).append(' (').append(device.id).append(')'));
                            row.append($('<td>').append(buttons));

                            $('#plugslist').append(row);
                        }
                    });
                }
            });
            $('.spinner').hide();
        }
    });
}
function loadLocks() {
    $.ajax({
        url: WEBDIR + 'vera/GetDevices',
        type: 'get',
        dataType: 'json',
        success: function (data) {
            $('#lockslist').empty();
            if (data.status == false) {
                $('#notification_area').addClass('alert alert-error');
                $('#notification_area').html('<strong>Error</strong> Could not connect to Vera, go to <a href="' + WEBDIR + 'settings">settings</a>');
                return false;
            }
            $('#lockslist').html('');
            $.each(data.devices, function (i, device) {
                if(device.device_type.search('DoorLock') != -1) {
                    $('button').click(function () {
                        var id = $(this).attr('data-deviceid');
                        var state = $(this).attr('data-state')
                        var dtype = $(this).attr('data-devicetype')
                        toggleStateAction(dtype,id,state);
                    })
                    
                    var buttons = $('<div id="action">').addClass('btn-group')
                    buttons.append($('<button type="button">').attr('data-devicetype','lock').attr('data-deviceid',device.id).attr('data-state','1').addClass('btn btn-small').html('LOCK'));
                    buttons.append($('<button type="button">').attr('data-devicetype','lock').attr('data-deviceid',device.id).attr('data-state','0').addClass('btn btn-small').html('UNLOCK'));

                    $.each(data.rooms, function (i, room) {
                        if (room.id == device.room){
                            var roomname = room.name;
                            var row = $('<tr>')
                            var name = $('<td>').html(roomname);

                            row.append(name);
                            row.append($('<td>').append(device.name).append(' (').append(device.id).append(')'));
                            row.append($('<td>').append(buttons));

                            $('#lockslist').append(row);
                        }
                    });
                }
            });
            $('.spinner').hide();
        }
    });
}
function loadTherm() {
    $.ajax({
        url: WEBDIR + 'vera/GetDevices',
        type: 'get',
        dataType: 'json',
        success: function (data) {
            $('#thermlist').empty();
            if (data.status == false) {
                $('#notification_area').addClass('alert alert-error');
                $('#notification_area').html('<strong>Error</strong> Could not connect to Vera, go to <a href="' + WEBDIR + 'settings">settings</a>');
                return false;
            }
            $('#thermlist').html('');
            $.each(data.devices, function (i, device) {
                if(device.device_type.search('HVAC_ZoneThermostat') != -1) {
                    var row = $('<tr>')
                    var name = $('<td>').html(device.name);

                    row.append(name);
                    row.append($('<td>').append(device.name).append(' (').append(device.id).append(')'));
                    row.append($('<td>').html('Therm'));
                    row.append($('<td>').append(device.room));

                    $('#thermlist').append(row);
                }
            });
            $('.spinner').hide();
        }
    });
}

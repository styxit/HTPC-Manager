$(document).ready(function () {
    $(window).trigger('hashchange')
    $('#nzb_pause_button').click(function () {
        var clickItem = $(this);
        clickItem.button('loading');
        var time = $('#sab_pause_for').val();
        $.ajax({
            url: WEBDIR + 'sabnzbd/TogglePause?mode='+queueToggleStatusAction + '&time=' + time,
            dataType: 'json',
            type: 'get'
        });
        $('#sab_pause_for').val('');
    });

    $('#sabnzbd_clear_history').click(function() {
        var modalButtons = {
            'Remove all': function() {
                $.ajax({
                    'url': WEBDIR + 'sabnzbd/DeleteHistory/all',
                    'success': function(response) {
                        if (response.status) {
                            notify('Info ', 'Removed all nzbs from history', 'success', 5);
                        } else {
                            notify('Error ', 'Failed to remove all nzbs from history ', 'error ', 5);
                        }
                        hideModal();
                    }
                });
            },
            'Remove failed ': function() {
                $.ajax({
                    'url': WEBDIR + 'sabnzbd/DeleteHistory/failed',
                    'success ': function(response) {
                        if (response.status) {
                            notify('Info ', 'Removed all failed nzbs from history ', 'success ', 5);
                        } else {
                            notify('Error ', 'Failed to remove all nzbs from history ' , 'error ', 5);
                        }
                    }
                });
            }
        };
        showModal('History', 'What history do you want to remove?', modalButtons);
    });

    $('#add_nzb_button').click(function (e) {
        // nzb_url, nzb_category
        var nzb_url = $('#nzb_url').val()
        var nzb_category = $('#nzb_category').val()
        if (!nzb_url && !nzb_category) return;
        $.ajax({
            url: WEBDIR + 'sabnzbd/AddNzbFromUrl',
            data: {'nzb_url': nzb_url , 'nzb_category': nzb_category},
            type: 'post',
            dataType: 'json',
            success: function (result) {
                if (result.status !== undefined && result.status) {
                    console.log(result.status)
                    $('[href=#active]').trigger('click');
                    $('#nzb_url').val('');
                    $('#nzb_category').val('');
                }
            }

        });
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
    // drag and drop to reorder q
    $("#active_table_body").sortable({
        stop: function (event, ui) {
            swap(ui.item.attr('data-nzo-id'), ui.item.index())
        }
    }).disableSelection();

    setInterval(function() {
        loadQueue(0);
    }, 5000);
    loadHistory();
    loadWarnings();


    // reload tab content on tab click
    $('#tab-history').click(function() {
        loadHistory();
    })
    $('#tab-warnings').click(function() {
        loadWarnings();
    })
});

function removeHistoryItem(id) {
    if (confirm('Are you sure?')) {
        $.ajax({
            url: WEBDIR + 'sabnzbd/DeleteHistory?id=' + id,
            type: 'get',
            dataType: 'json',
            success: function (data) {
                loadQueue(1);
                loadHistory();
            }
        });
    }
}

function retryHistoryItem(id) {
    if (confirm('Are you sure?')) {
        $.ajax({
            url: WEBDIR + 'sabnzbd/Retry?id=' + id,
            type: 'get',
            dataType: 'json',
            success: function (data) {
                loadQueue(1);
                loadHistory();
            }
        });
    }
}

function loadHistory() {
    $.ajax({
        url: WEBDIR + 'sabnzbd/GetHistory?limit=30',
        type: 'get',
        dataType: 'json',
        success: function (data) {
            $('#history_table_body').empty();
            if (data.status == false) {
                $('#notification_area').addClass('alert alert-error');
                $('#notification_area').html('<strong>Error</strong> Could not connect to SABnzbd, go to <a href="' + WEBDIR + 'settings">settings</a>');
                return false;
            }
            $('#history_table_body').html('');
            $.each(data.history.slots, function (i, slot) {
                var deleteImage = makeIcon('fa fa-trash-o fa-lg');
                deleteImage.click(function () {
                    removeHistoryItem(slot.nzo_id);
                });

                var retryImage = null;
                if (slot.status == 'Failed') {
                    var retryImage = makeIcon('fa fa-repeat', 'Retry');
                    retryImage.click(function () {
                        retryHistoryItem(slot.nzo_id);
                    });
                }

                var failMessage = $('<span>');
                failMessage.addClass('label');
                failMessage.addClass('label-important');
                failMessage.html(slot.fail_message);

                var row = $('<tr>')

                var name = $('<td>').html(slot.name);
                if (slot.category != '*') {
                    name.append('&nbsp;').append(sabnzbdStatusLabel(slot.category));
                }
                if (slot.status == 'Failed') {
                    $(name).append('&nbsp;').append(failMessage);
                }
                if (slot.script && slot.script_line.length) {
                    $(name).append('&nbsp;').append(makeIcon('fa fa-list-alt', slot.script_line))
                }

                // Use to make a info string regarding speed unpack
                var inf = ''

                for (i = 0; i < slot.stage_log.length; i++) {
                    if ($.inArray(slot.stage_log[i].name, ["Download", "Repair", "Unpack"]) !== -1) {
                        inf = inf.concat(slot.stage_log[i].actions[0] + '<br>')
                    }

                }

                var info = sabnzbdStatusLabel(slot.status).tooltip({'placement': 'right', 'title': inf, 'html': true})

                row.append($('<td>').append(parseDate(slot.completed)));
                row.append(name);
                row.append($('<td>').append(info));
                row.append($('<td>').html(slot.size));
                row.append($('<td>').append(deleteImage));
                row.append($('<td>').append(retryImage));

                $('#history_table_body').append(row);

            });
        }

    }).done(function() {
        $('.table-sortable').trigger('update');
    });

}

function removeQueueItem(id) {
    if (confirm('Are you sure?')) {
        $.ajax({
            url: WEBDIR + 'sabnzbd/DeleteNzb?id=' + id,
            type: 'get',
            dataType: 'json',
            success: function (data) {
                loadQueue(1);
                loadHistory();
            }
        });
    }
}

function changeCategory(id, cat) {
    $.ajax({
        url: WEBDIR + 'sabnzbd/ChangeCategory?id=' + id + '&cat=' + cat,
        type: 'get',
        dataType: 'json'
    });
}

function swap(v1, v2) {
    $.ajax({
        url: WEBDIR + 'sabnzbd/Swap?v1=' + v1 + '&v2=' + v2,
        type: 'get',
        dataType: 'json'
    });
}

var queueToggleStatusAction = '';

function loadQueue(once) {
    $.ajax({
        url: WEBDIR + 'sabnzbd/GetStatus',
        type: 'get',
        dataType: 'json',
        success: function (object) {
            if (object.status == false) {
                $('#notification_area').addClass('alert alert-error');
                $('#notification_area').html('<strong>Error</strong> Could not connect to SABnzbd, go to <a href="' + WEBDIR + 'settings">settings</a>');
                return false;
            }
            data = object.queue;
            if (once == 1) {
                $('#nzb_get_speed').val(data.speedlimit);
            }

            $('#nzb_pause_button').button('reset');
            if (data.status == 'Paused') {
                $('#nzb_pause_button').html('<i class="fa fa-play"></i> Resume');
                queueToggleStatusAction = 'resume';
            } else {
                $('#nzb_pause_button').html('<i class="fa fa-pause"></i> Pause')
                queueToggleStatusAction = 'pause';
            }

            var state = data.status.toLowerCase();
            var formattedState = state.charAt(0).toUpperCase() + state.slice(1);
            var pausetime = (data.pause_int != '0') ? ' ' + data.pause_int: ''

            $('#queue_state').html(formattedState + pausetime);
            $('#queue_speed').html(data.speed + 'B/Sec');

            $('#active_table_body').html('');

            if (data.slots.length == 0) {
                var row = $('<tr>')
                row.append($('<td>').html('Queue is empty').attr('colspan', 5));
                $('#active_table_body').append(row);
            }

            $.each(data.slots, function (i, job) {
                var progressBar = $('<div>');
                progressBar.addClass('bar');
                progressBar.css('width', job.percentage + '%');

                var  progress = $('<div>');
                progress.addClass('progress');
                progress.append(progressBar);

                var row = $('<tr>').attr('data-nzo-id', job.nzo_id)
                row.append($('<td>').html(job.filename));

                var categories = $('<select>');
                categories.addClass('span2');
                categories.change(function() {
                    changeCategory(job.nzo_id, $(this).val());
                });

                $.each(data.categories, function (i, cat) {
                    var option = $('<option>');
                    if (job.cat == cat) {
                        option.attr('selected', true);
                    }
                    option.attr('value', cat);
                    option.html(cat);
                    categories.append(option);
                });

                row.append($('<td>').html(categories));
                row.append($('<td>').html(progress));
                row.append($('<td>').html(job.timeleft + ' / ' + job.mbleft + 'MB').addClass('span3'));

                var deleteImage = $('<a>');
                deleteImage.attr('alt', 'Remove');
                deleteImage.addClass('close');
                deleteImage.attr('href', '#');
                deleteImage.append($('<i>').addClass('fa fa-times'))
                deleteImage.click(function () {
                    removeQueueItem(job.nzo_id);
                });

                row.append($('<td>').html(deleteImage));

                $('#active_table_body').append(row);
            });

            $('#active_table_body').parent().trigger('update');

            // Set diskspace
            freePercentDisk1 =  Math.ceil((data.diskspace1 / data.diskspacetotal1) * 100);
            usedPercentDisk1 = 100 - freePercentDisk1;
            usedGbDisk1 = (data.diskspacetotal1 - data.diskspace1) * 100;
            usedGbDisk1 = Math.round(usedGbDisk1) / 100;
            $('#sabnzbd-stats #diskspace1 .bar').css('width', usedPercentDisk1+'%').text(usedGbDisk1 + ' GB');

            $('#sabnzbd-stats #diskspace1 .diskspace-total').text('Total: '+ data.diskspacetotal1 + ' GB');
            $('#sabnzbd-stats #diskspace1 .diskspace-free').text('Free: '+ data.diskspace1 + ' GB');

            // If less then 10% is free, show red bar
            if (freePercentDisk1 < 10) {
                $('#sabnzbd-stats #diskspace1 .progress').addClass('progress-danger');
            }

            // Only show disk 2 if it is not the same as disk1
            if (data.diskspacetotal1 != data.diskspacetotal2 && data.diskspace1 != data.diskspace2) {
                freePercentDisk2 =  Math.ceil((data.diskspace2 / data.diskspacetotal2) * 100);
                usedPercentDisk2 = 100 - freePercentDisk2;
                usedGbDisk2 = (data.diskspacetotal2 - data.diskspace2) * 100;
                usedGbDisk2 = Math.round(usedGbDisk2) / 100;
                $('#sabnzbd-stats #diskspace2 .bar').css('width', usedPercentDisk2+'%').text(usedGbDisk2 + ' GB');

                $('#sabnzbd-stats #diskspace2 .diskspace-total').text('Total: '+ data.diskspacetotal2 + ' GB');
                $('#sabnzbd-stats #diskspace2 .diskspace-free').text('Free: '+ data.diskspace2 + ' GB');

                // If less then 10% is free, show red bar
                if (freePercentDisk2 < 10) {
                    $('#sabnzbd-stats #diskspace1 .progress').addClass('progress-danger');
                }
                $('#sabnzbd-stats #diskspace2').show();
            } else {
                $('#sabnzbd-stats #diskspace2').hide();
            }

        }
    });
}

function loadWarnings() {
    $.ajax({
        url: WEBDIR + 'sabnzbd/GetWarnings',
        type: 'get',
        dataType: 'json',
        success: function (data) {
            $('#warning_table_body').empty();
            if (data.warnings == 0) {
                var row = $('<tr>')
                row.append($('<td>').html('No warnings'));
                $('#warning_table_body').append(row);
            }
            $.each(data.warnings, function (i, warning) {
                var row = $('<tr>')
                row.append($('<td>').html(warning));
                $('#warning_table_body').append(row);
            });
        }
    });
}

function setCategories(selector, select) {
    $.ajax({
        url: WEBDIR + 'sabnzbd/GetCategories',
        type: 'post',
        dataType: 'json',
        success: function (data) {
            $.each(data.categories, function (i, cat) {
                var option = $('<option>');
                if (select == cat) {
                    option.attr('selected', true);
                }
                option.attr('value', cat);
                option.html(cat);
                $(selector).append(option);
            });
        }
    });
}


function sabnzbdStatusLabel(text){
  var statusOK = ['Completed'];
  var statusInfo = ['Extracting', 'Running'];
  var statusError = ['Failed'];
  var statusWarning = ['Verifying', 'Repairing'];

  var label = $('<span>').addClass('label').text(text);

  if (statusOK.indexOf(text) != -1) {
    label.addClass('label-success');
  }
  else if (statusInfo.indexOf(text) != -1) {
    label.addClass('label-info');
  }
  else if (statusError.indexOf(text) != -1) {
    label.addClass('label-important');
  }
  else if (statusWarning.indexOf(text) != -1) {
    label.addClass('label-warning');
  }

  var icon = sabnzbdStatusIcon(text, true);
  if (icon != '') {
    label.prepend(' ').prepend(icon);
  }
  return label;
}

function sabnzbdStatusIcon(iconText, white){
  var text =[
    'Completed',
    'Extracting',
    'Running',
    'Verifying',
    'Failed',
    'Repairing'
  ];
  var icons = [
    'fa fa-check',
    'fa fa-share',
    'fa fa-play-circle',
    'fa fa-exchange',
    'fa fa-times',
    'fa fa-wrench'
  ];

  if (text.indexOf(iconText) != -1) {
    var icon = $('<i>').addClass(icons[text.indexOf(iconText)]);
    if (white == true) {
      icon.addClass('fa-inverse');
    }
    return icon;
  }
  return '';
}

function historymodal() {

}

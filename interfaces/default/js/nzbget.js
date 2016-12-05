// Globally define download speed in bytes per second
var downloadSpeed = 0;
var category = []
$(document).ready(function () {
    $.get(WEBDIR + 'nzbget/GetCategorys', function(data) {
        if (data) {
            category = data;
            $.each(data, function (i, cat) {
                var option = $('<option>');
                option.attr('value', cat);
                option.html(cat);
                $('#nzb_category').append(option);

            });
        }
    });

    $(window).trigger('hashchange')
    if ($('.nav-tabs li.active a').attr('href') == "#warnings")
        loadWarnings();
    if ($('.nav-tabs li.active a').attr('href') == "#history")
        loadHistory();
    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
        if (e.target.text == 'Warnings')
            loadWarnings();
        else if (e.target.text == 'History')
            loadHistory();
    });

    $('#nzb_pause_button').click(function (e) {
        e.preventDefault();
        var clickItem = $(this);
        clickItem.button('loading');
        $.ajax({
            url: WEBDIR + 'nzbget/QueueAction/'+queueToggleStatusAction,
            dataType: 'json',
            type: 'get'
        });
    });

    $("#add_nzb_button").click(function (evt) {
        evt.preventDefault();

        var nzb_name = '';
        var nzb_category = $('#nzb_category').val();
        var nzb_url = $('#nzb_url').val();

        if ($("#nzb_url").val().length === 0 && $("#add_nzb_file").val().length === 0) {
            return;
        }

        if ($("#add_nzb_file").val().length > 1) {

            var i, file, reader, metainfo;
            var fileInput = $('input#add_nzb_file');
            jQuery.each(fileInput[0].files, function (i, file) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    var contents = e.target.result;
                    var key = "base64,";
                    var index = contents.indexOf(key);
                    if (index > -1) {
                        metainfo = contents.substring(index + key.length);

                    }
                    $.post(WEBDIR + "nzbget/AddNzbFromUrl", {
                        'f': metainfo,
                        'nzb_name': file.name,
                        'nzb_category': nzb_category
                    });

                };
                reader.readAsDataURL(file);
            });
        } else if ($("#nzb_url").val().length > 1) {
            $.post(WEBDIR + "nzbget/AddNzbFromUrl", {
                'nzb_url': nzb_url,
                'nzb_name': '',
                'nzb_category': nzb_category

            });

        }
        $('#add_nzb_file').val('');
        $("#nzb_url").val('');
        $('[href=#active]').trigger('click');

    });

    $('#nzb_force_scan').click(function(e) {
        e.preventDefault();
        $.ajax({
            url: WEBDIR + 'nzbget/ForceScan',
            type: 'post',
            dataType: 'json'
        });
    });

    $('#nzb_set_speed').click(function(e) {
        e.preventDefault();
        var speed = ($('#nzb_get_speed').val());
        $.ajax({
            url: WEBDIR + 'nzbget/SetSpeed?speed=' + speed,
            type: 'post',
            dataType: 'json'
        });
    });

    loadQueue(1);
    $("#active_table_body").sortable({
        start: function (event, ui) {
            nzbget_old_index = ui.item.index();
        },
        stop: function (event, ui) {
            var nzbget_new = ui.item.index();
            var nzbid = ui.item.attr('data-id')
            swap(nzbid, nzbget_old_index, nzbget_new)
        }


    }).disableSelection();

    getStatus(1);
    setInterval(function() {
        getStatus(0);
    }, 5000);


    setInterval(function() {
        loadQueue(0);
    }, 5000);

});

function loadHistory() {
    $.ajax({
        url: WEBDIR + 'nzbget/GetHistory',
        type: 'get',
        dataType: 'json',
        success: function (data) {
            if (data.ParStatus == false) {
                $('#notification_area').addClass('alert alert-error');
                $('#notification_area').html('<strong>Error</strong> Could not connect to NzbGET, go to <a href="' + WEBDIR + 'settings">settings</a>');
                return false;
            }
            $('#history_table_body').html('');
            $.each(data, function (i, slot) {

                var failMessage = $('<span>');
                failMessage.addClass('label');
                failMessage.addClass('label-important');
                failMessage.html(slot.MoveStatus);

                var row = $('<tr>')

                var name = $('<td>').html(slot.Name);
                if (slot.category != '*') {
                    name.append('&nbsp;').append(nzbgetStatusLabel(slot.Category));
                }
                if (slot.status == 'Failed') {
                    $(name).append('&nbsp;').append(failMessage);
                }

                buttons = $('<div>').addClass('btn-group pull-right');

                removeButton = $('<a class="nzbget_removenzbhistory nzb_action" data-action="" data-id="" data-name="">').
                addClass('btn btn-mini btn-danger').
                html('<i class="fa fa-trash-o fa-lg"></i>').
                attr('data-id', slot.NZBID).
                attr('data-action', 'hidehistory').
                attr('data-name', slot.Name).
                attr('title', 'Remove NZB');
                buttons.append(removeButton);

                row.append(name);
                row.append($('<td>').append(nzbgetStatusLabel(slot.MoveStatus)));
                row.append($('<td style="text-align:right;">').html(prettySize(slot.FileSizeMB*1048576)));
                row.append($('<td>').append(buttons));

                $('#history_table_body').append(row);
            });
        }
    });
}
function prettySize(bytes) {
    if (!bytes) {
        return '0 kb';
    }
    var units = ['bytes', 'kb', 'MB', 'GB', 'TB', 'PB'];
    var e = Math.floor( Math.log( bytes ) / Math.log( 1024 ) );
    var size = ( bytes / Math.pow( 1024, Math.floor( e ) ) ).toFixed( 2 );
    var unit = units[ e ];
    return size + ' ' + unit;
}

function getStatus(initial) {
     $.ajax({
        url: WEBDIR + 'nzbget/status',
        type: 'get',
        dataType: 'json',
        success: function(response){
            var status;
            // write download speed to global var
            downloadSpeed = response.DownloadRate;
            downloadLimit = prettySize(response.DownloadLimit) + '/s'
            //DownloadLimit
            $('#nzb_get_speed').attr('placeholder', downloadLimit)
            $('#nzb_pause_button').button('reset');
            if (response.ServerPaused) {
                // if server is paused
                status = 'Paused'
                queueToggleStatusAction = 'resume';
                $('#nzb_pause_button').html('<i class="fa fa-play"></i> Resume');
            } else {
                status = 'Running'
                $('#nzb_pause_button').html('<i class="fa fa-pause"></i> Pause')
                queueToggleStatusAction = 'pause';
            }

            $('#queue_speed').text(prettySize(response.DownloadRate) + '/s')
            $('#queue_state').text(status);
        }
    });
}

var queueToggleStatusAction = '';

function loadQueue(once) {
    $.ajax({
        url: WEBDIR + 'nzbget/queue',
        type: 'get',
        dataType: 'json',
        success: function (data) {
            $('#active_table_body').html('');
            if (data.length == 0) {
                var row = $('<tr>')
                row.append($('<td>').html('Queue is empty').attr('colspan', 5));
                $('#active_table_body').append(row);
            }
            $.each(data, function (i, job) {
                /*
                 * Concat filesizes.
                 * The file sizes consist of two 32bit ints that makeup a 64bit int.
                 * The Hi comes first, followed by the Low.
                 * Preceded with an empty string so the two values do not sum, but concat.
                 */
                totalSize = "" + job.FileSizeHi + job.FileSizeLo;
                remainingSize = "" + job.RemainingSizeHi + job.RemainingSizeLo;
                pausedSize = "" + job.PausedSizeHi + job.PausedSizeLo;
                queuedSize = "" + remainingSize - pausedSize;

                var percentage = (100 * (totalSize - queuedSize)) / totalSize;
                var progressBar = $('<div>');
                progressBar.addClass('bar');
                progressBar.css('width', percentage + '%');

                var  progress = $('<div>');
                progress.addClass('progress');
                if (percentage == 100) {
                    progress.addClass('progress-success');
                }
                progress.append(progressBar);

                var i_cat = $('<select>')
                    .addClass('span2');

                $.each(category, function (i, cat) {
                    var option = $('<option>');
                    if (job.Category == cat) {
                        option.attr('selected', true);
                    }
                    option.attr('value', cat);
                    option.html(cat);
                    i_cat.append(option);
                });

                i_cat.change(function() {
                    changeCategory(job.NZBID, $(this).val(), job.NZBNicename);
                });

                if (job.Category != '') {
                    categoryLabel = ' <span class="label" title="Category '+job.Category+'">' + job.Category + '</span>';
                } else {
                    categoryLabel = '';
                }
                var row = $('<tr>');
                row.attr('data-id', job.LastID)
                // Job status
                row.append($('<td>').append(nzbgetStatusLabel(job.Status)));

                row.append($('<td>').html(job.NZBName));

                row.append($('<td>').append(i_cat));

                row.append($('<td>').html(progress));

                if (job.Status == 'DOWNLOADING' && downloadSpeed) {
                    var min = Math.round((remainingSize / downloadSpeed) / 60);
                    var hours = Math.floor(min / 60);
                    min = min - (hours * 60);
                    var eta = hours > 0 ? hours + 'h ' + min + 'm' : min + 'm';
                    eta += ' / ';
                } else {
                    var eta = '';
                }
                // buttons
                buttons = $('<div>').addClass('btn-group pull-right');
                // Sets name and action based on job.Status
                actionButton = generateNzbActionButton(job)
                buttons.append(actionButton);

                deleteButton = $('<a class="nzbget_deleteenzb nzb_action" data-action="delete" data-id="" data-name="">').
                addClass('btn btn-mini btn-danger').
                html('<i class="fa fa-remove"></i>').
                attr('data-id', job.NZBID).
                attr('data-name', job.NZBName).
                attr('title', 'Delete NZB');
                buttons.append(deleteButton);

                row.append($('<td>').html(eta + prettySize(queuedSize)).addClass('span3'));
                row.append($('<td>').html(buttons));

                $('#active_table_body').append(row);
            });
        }
    });
}
function loadWarnings() {
    $.ajax({
        url: WEBDIR + 'nzbget/GetWarnings',
        type: 'get',
        dataType: 'json',
        success: function (data) {
            $('#warning_table_body').html('');
            if (!data) {
                var row = $('<tr>')
                row.append($('<td>').html('No warnings'));
                $('#warning_table_body').append(row);
            }

            $.each(data, function (i, warning) {
                var myDate = new Date( warning.Time *1000);
                var row = $('<tr>')
                row.prepend($('<td>').html('[' + myDate.toLocaleString() + '] ' + warning.Text));
                $('#warning_table_body').prepend(row);
            });
        }
    });
}
function nzbgetStatusLabel(text){
  var statusOK = ['SUCCESS', 'DOWNLOADING'];
  var statusInfo = ['Extracting', 'Running','Downloading'];
  var statusError = ['FAILURE'];
  var statusWarning = ['Verifying', 'Repairing', 'NONE'];

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

  var icon = nzbgetStatusIcon(text, true);
  if (icon != '') {
    label.prepend(' ').prepend(icon);
  }
  return label;
}


function changeCategory(nzbid, cat, nzbname) {
    $.ajax({
        url: WEBDIR + 'nzbget/ChangeCategory',
        data: {
            'nzbid': nzbid,
            'cat': cat,
            'nzbname': nzbname
        },
        type: 'get',
        dataType: 'json',
        success: function (response) {
            if (response) {
                notify('Change Category', nzbname + ' to ' + cat, 'success');
            } else {
                notify('Change Category', nzbname + ' to ' + cat, 'error');
            }

        }
    });
}

function swap(nzbid, oldpos, newpos) {
    $.ajax({
        url: WEBDIR + 'nzbget/Swap?nzbid=' + nzbid + '&oldpos=' + oldpos + '&newpos=' + newpos,
        type: 'get',
        dataType: 'json'
    });
}

function nzbgetStatusIcon(iconText, white){
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
    'fa fa-share-square-o',
    'fa fa-play-circle-o',
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

// this dumps the entire config, grab category server side?
function getconfig(selector, select) {
    $.ajax({
        url: WEBDIR + 'nzbget/GetConfig',
        type: 'get',
        dataType: 'json',
        success: function (data) {
            var defaultoption = $('<option>');
            defaultoption.attr('value', '');
            defaultoption.html('*');
            $(selector).append(defaultoption);
            $.each(data, function (i, cat) {
                var re = /(Category\d+\.Name)/;
                tname = cat.Name
                if (re.test(tname)) {

                    var option = $('<option>');
                    if (select == cat.Name) {
                        option.attr('selected', true);
                    }
                    option.attr('value', cat.Value);
                    option.html(cat.Value);
                    $(selector).append(option);

                }
            });
        }
    });
}

function generateNzbActionButton(nzb) {
    button = $('<a>').addClass('btn btn-mini nzb_action');
    // Resume button if nzb is paused
    var status = nzb.Status;
    var icon = cmd = title = "";

    if (status == "PAUSED") {
        icon = "fa fa-play";
        title = "Resume NZB";
        cmd = "resume";
    } else {
        icon = "fa fa-pause";
        title = "Pause NZB";
        cmd = "pause";
    }

    // Set icon, command and title to button
    button.html('<i class="' + icon + '"></i>');
    button.attr('title', title);
    button.attr('data-id', nzb.NZBID);
    button.attr('data-name', nzb.NZBName);
    button.attr('data-action', cmd);
    return button;
}

// really should make one call pr action to support future restriced user
$(document).on('click', '.nzb_action', function(){
    var a = $(this).data('action');
    var n = $(this).data('name');
    param = {'nzbid': $(this).data('id'),
             'action': $(this).data('action'),
             'name': $(this).data('name')
            };
    if (confirm('Are you sure you want to "'+ a + ' '+ n +'" to nzbget?')) {
        $.getJSON(WEBDIR + "nzbget/IndividualAction/",param, function (response) {
            if (response) {
                notify(a, n, 'success')
            } else {
                notify(a, n, 'error')
            }
        });
    }
});

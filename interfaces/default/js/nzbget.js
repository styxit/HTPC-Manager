// Globally define download speed in bytes per second
var downloadSpeed = 0;

$(document).ready(function () {
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

    $('#nzb_pause_button').click(function () {
            var clickItem = $(this);
            clickItem.button('loading');
            $.ajax({
                url: WEBDIR + 'nzbget/QueueAction/'+queueToggleStatusAction,
                dataType: 'json',
                type: 'get'
            });
        });

  $('#add_nzb_form').ajaxForm({
        url: WEBDIR + 'nzbget/AddNzbFromUrl',
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

    getconfig('#nzb_category', '*');

    $('#nzb_set_speed').click(function() {
        var speed = ($('#nzb_get_speed').val());
        $.ajax({
            url: WEBDIR + 'nzbget/SetSpeed?speed=' + speed,
            type: 'post',
            dataType: 'json'
        });
    });

    getStatus(1);
    setInterval(function() {
        getStatus(0);
    }, 5000);

    loadQueue(1);
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
                addClass('btn btn-mini').
                html('<i class="icon-remove"></i>').
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
                $('#nzb_pause_button').html('<i class="icon-play"></i> Resume'); 
            } else {
                status = 'Running'
                $('#nzb_pause_button').html('<i class="icon-pause"></i> Pause')
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
        success: function (object) {
            data = object;
            

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

                // determine status
                status = 'Queued';
                if (job.ActiveDownloads > 0) {
                    status = 'Downloading';
                } else if (pausedSize == remainingSize) {
                    status = 'Paused';
                }

                var percentage = (100 * (totalSize - queuedSize)) / totalSize;
                var progressBar = $('<div>');
                progressBar.addClass('bar');
                progressBar.css('width', percentage + '%');

                var  progress = $('<div>');
                progress.addClass('progress');
                if (status == 'Downloading') {
                    progress.addClass('progress-striped active');
                }
                progress.append(progressBar);

                if (job.Category != '') {
                    categoryLabel = ' <span class="label" title="Category '+job.Category+'">' + job.Category + '</span>';
                } else {
                    categoryLabel = '';
                }

                var row = $('<tr>');
                row.attr('data-id', job.LastID)
                // Job status
                row.append($('<td>').append(nzbgetStatusLabel(status)));

                // job name + category
                row.append($('<td>').html(job.NZBName + categoryLabel));

                row.append($('<td>').html(progress));

                if (status == 'Downloading' && downloadSpeed) {
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
                addClass('btn btn-mini').
                html('<i class="icon-remove"></i>').
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
  var statusOK = ['SUCCESS', 'Downloading'];
  var statusInfo = ['Extracting', 'Running'];
  var statusError = ['FAILURE'];
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

  var icon = nzbgetStatusIcon(text, true);
  if (icon != '') {
    label.prepend(' ').prepend(icon);
  }
  return label;
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
    'icon-ok',
    'icon-share',
    'icon-play-circle',
    'icon-exchange',
    'icon-remove',
    'icon-wrench'
  ];

  if (text.indexOf(iconText) != -1) {
    var icon = $('<i>').addClass(icons[text.indexOf(iconText)]);
    if (white == true) {
      icon.addClass('icon-white');
    }
    return icon;
  }
  return '';
}

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
        icon = "icon-play";
        title = "Resume NZB";
        cmd = "resume";
    } else {
        icon = "icon-pause";
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


$(document).on('click', '.nzb_action', function(){
    //var i = $('#cmdinput').val();
    //$(this).data('action')
    var a = $(this).data('action');
    var n = $(this).data('name');
    param = {'id': $(this).data('id'),
            'action': $(this).data('action'),
            'name': $(this).data('name')
        };
    if (confirm('Are you sure you want to "'+ a + ' '+ n +'" to nzbget?')) {
    $.getJSON(WEBDIR + "nzbget/IndividualAction/",param, function (response) {
         /*
         $.pnotify({
             title: 'Response',
             text: response.msg,
             type: 'success',
             width: '500px',
             min_height: '400px'
         });
        */

    });
}
});

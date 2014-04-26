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
            $.each(data.result, function (i, slot) {

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

                row.append(name);
                row.append($('<td>').append(nzbgetStatusLabel(slot.MoveStatus)));
                row.append($('<td style="text-align:right;">').html(prettySize(slot.FileSizeMB*1048576)));
                //row.append($('<td>').append(deleteImage));
                //row.append($('<td>').append(retryImage));

                $('#history_table_body').append(row);
            });
        }
    });
}
function prettySize(bytes) {
    var units = ['bytes', 'kb', 'MB', 'GB', 'TB', 'PB'];
    var e = Math.floor( Math.log( bytes ) / Math.log( 1024 ) );
    var size = ( bytes / Math.pow( 1024, Math.floor( e ) ) ).toFixed( 2 );
    var unit = units[ e ];
    return size + ' ' + unit;
}
function loadQueue(once) {
    $.ajax({
        url: WEBDIR + 'nzbget/GetStatus',
        type: 'get',
        dataType: 'json',
        success: function (object) {
            data = object.result;

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

                // determine status
                status = 'Queued';
                if (job.ActiveDownloads > 0) {
                    status = 'Downloading';
                } else if (pausedSize == remainingSize) {
                    status = 'Paused';
                }

                var percentage = (100 * (pausedSize - remainingSize)) / pausedSize;
                var progressBar = $('<div>');
                progressBar.addClass('bar');
                progressBar.css('width', percentage + '%');

                var  progress = $('<div>');
                progress.addClass('progress');
                progress.append(progressBar);

                if (job.Category != '') {
                    categoryLabel = ' <span class="label" title="Category '+job.Category+'">' + job.Category + '</span>';
                } else {
                    categoryLabel = '';
                }

                var row = $('<tr>');
                // Job status
                row.append($('<td>').append(nzbgetStatusLabel(status)));

                // job name + category
                row.append($('<td>').html(job.NZBName + categoryLabel));

                row.append($('<td>').html(progress));
                var min = job.MaxPostTime - job.MinPostTime;
                var hours = Math.floor(min / 60);
                var eta = hours > 0 ? hours + 'h ' + min + 'm' : min + 'm';
                row.append($('<td>').html(eta + ' / ' + job.RemainingSizeMB + ' MB').addClass('span3'));

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
            if (data.result == 0) {
                var row = $('<tr>')
                row.append($('<td>').html('No warnings'));
                $('#warning_table_body').append(row);
            }
            $.each(data.result, function (i, warning) {
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


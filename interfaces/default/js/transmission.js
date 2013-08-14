$(document).ready(function(){
  $('.spinner').show();
  getTorrents();
  getStatus();
  setInterval(function() {
     getTorrents();
     getStatus();
  }, 4000);
});

function getTorrents(){
  $.ajax({
    'url': WEBDIR + 'transmission/queue',
    'success': function(response){
      if (response.arguments && response.result == 'success') {
        $('#torrent-queue').html('');
        $.each(response.arguments.torrents, function(index, torrent){
          tr = $('<tr>');

          var progressBar = $('<div>');
          progressBar.addClass('bar');
          progressBar.css('width', (torrent.percentDone*100) + '%');

          var  progress = $('<div>');
          progress.addClass('progress');
          if (torrent.percentDone >= 1) {
            progress.addClass('progress-success');
          }
          progress.append(progressBar);

          // Round to 2 decimals
          ratio = Math.round(torrent.uploadRatio*100) / 100;

          tr.append(
            $('<td>').text(torrent.id),
            $('<td>').html(torrent.name
              +'<br><small><i class="icon-arrow-up"></i> ' + getReadableFileSizeString(torrent.rateUpload)
              +'/s <i class="icon-arrow-down"></i> ' + getReadableFileSizeString(torrent.rateDownload) + '/s</small>'
            ),
            $('<td>').text(ratio),
            $('<td>').text(getReadableTime(torrent.eta)),
            $('<td>').text(torrentStatus(torrent.status)),
            $('<td>').addClass('span3').html(progress)
          );
          $('#torrent-queue').append(tr);
        });
        $('.spinner').hide();
      }
    }
  });
}

/**
 * Get General transmission stats
 */
function getStatus(){
  $.ajax({
    'url': WEBDIR + 'transmission/stats',
    'success': function(response){
      if (response.arguments && response.result == 'success') {
        uploadSpeed = getReadableFileSizeString(response.arguments.uploadSpeed);
        downloadSpeed = getReadableFileSizeString(response.arguments.downloadSpeed);

       $('#queue_upload').text(uploadSpeed + '/s');
       $('#queue_download').text(downloadSpeed + '/s');
      }
    }
  });
}

/**
 * Converts bytes to readable filesize in kb, MB, GB etc.
 */
function getReadableFileSizeString(fileSizeInBytes) {
    var i = -1;
    var byteUnits = [' kB', ' MB', ' GB', ' TB', 'PB'];
    do {
        fileSizeInBytes = fileSizeInBytes / 1024;
        i++;
    } while (fileSizeInBytes > 1024);
    return Math.round(fileSizeInBytes, 0.1).toFixed(1) + byteUnits[i];
};

/**
 * Converts seconds to readable time.
 */
function getReadableTime(timeInSeconds) {
  if (timeInSeconds < 1) {
    return '0:00:00';
  }

  var days = parseInt( timeInSeconds / 86400 ) % 7;
  var hours = parseInt( timeInSeconds / 3600 ) % 24;
  var minutes = parseInt( timeInSeconds / 60 ) % 60;
  var seconds = parseInt(timeInSeconds % 60);

  if (days < 1) {
    days = '';
  } else {
    days = days + 'd ';
  }
  return days + hours + ":" + (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds  < 10 ? "0" + seconds : seconds);
};

/**
 * Get textual representation of torrent status
 *
 * Since torrent status is retured as integer by the Transmission API the number must be mapped to a string
 */
function torrentStatus(statusNr) {
  states = ['Paused', 'unkown 1', 'unknown 2', 'Queued', 'Downloading', 'unknown 5', 'Seeding']
  return states[statusNr]
}
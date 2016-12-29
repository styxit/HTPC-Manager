// Last time we checked, was there a problem connecting to transmission?
var transmissionConnectionError = false;

htpc = {
    transmission: {
    }
};

$(document).ready(function(){
  $('.spinner').show();
  getTorrents();
  getStatus();
  setInterval(function() {
     getTorrents();
     getStatus();
  }, 4000);

    // sort fields
    $(document.body).off('click', '#torrent-table .sort-fields a');
    $(document.body).on('click', '#torrent-table .sort-fields a', function(event) {
	event.preventDefault();
	var $this = $(this);
	var sort_on = $this.attr('data-sort-field');

	var $i = $this.children('i');
	if ($i.hasClass('icon-chevron-down')) {
	    $i.removeClass('icon-chevron-down');
	    $i.addClass('icon-chevron-up');
	    sort_on += ':asc';
	} else if ($i.hasClass('icon-chevron-up')) {
	    $i.removeClass('icon-chevron-up');
	    $i.addClass('icon-chevron-down');
	    sort_on += ':desc';
	} else {
	    $i.addClass('icon-chevron-down');
	    sort_on += ':desc';
	}

	$('#torrent-table .sort-fields a').each(function(x, a) {
	    var $a = $(a);
	    if ($a.attr('data-sort-field') != $this.attr('data-sort-field')) {
		var $i = $a.children('i');
		$i
		    .removeClass('icon-chevron-up')
		    .removeClass('icon-chevron-down');
	    }
	});

	getTorrents({sort_on: sort_on});
    });


  // Torrent button ajax load
  $(document.body).off('click', '#torrent-queue .torrent-action a');
  $(document.body).on('click', '#torrent-queue .torrent-action a', function(event) {
    event.preventDefault();

    // set spinner inside button
    $(this).html('<i class="icon-spinner icon-spin"></i>');

    // do ajax request
    $.ajax({
      url: $(this).attr('href'),
      success: function(response) {
        // Refresh torrent list after successfull request with a tiny delay
        if (response.result == 'success') {
          window.setTimeout(getTorrents, 500);
        }
      }
    });
  });

  /**
   * Start or stop all torrents
   */
  $('#transmission-stop-all , #transmission-resume-all').click(function(){
    action = $(this).data('action');
    $.ajax({
      url: WEBDIR + 'transmission/' + action,
      success: function(response) {
        // Refresh torrent list after successfull request with a tiny delay
        if (response.result == 'success') {
          window.setTimeout(getTorrents, 500);
        }
      }
    });
  });

	/**
		Add a torrent
	*/
	$("#add_torrent_button").click(function (pEvent) {
		pEvent.preventDefault();
		
		if ($("#add_torrent_filename").val().length == 0) {
			return;
		}
		
		$.post(WEBDIR + "transmission/Add", { filename: $("#add_torrent_filename").val() });
	});
});

function getTorrents(kwargs) {
  if (kwargs == null)
      kwargs = {};

  $.ajax({
    url: WEBDIR + 'transmission/queue',
    success: function(response){
      if (response != null && response.arguments && response.result == 'success') {
        $('#torrent-queue').html('');

        // Empty queue
        if (response.arguments.torrents.length == 0) {
          $('#torrent-queue').html('<tr><td colspan="5">Queue is empty</td></tr>');
        }

          var torrents = response.arguments.torrents;

	  var sort_on = kwargs.sort_on;
	  if (sort_on == null && htpc.transmission.last_sort_on != null)
	      sort_on = htpc.transmission.last_sort_on;

	  if (sort_on != null)
	      htpc.transmission.last_sort_on = sort_on;

	  if (sort_on) {
	      var split = sort_on.split(':');
	      if (split.length == 1)
		  split.push('desc');

	      var field = split[0];
	      var ordering = split[1];

	      torrents.sort(function(first, second) {
		  var x = first;
		  var y = second;
		  if (ordering == 'asc') {
		      x = second
		      y = first;
		  }

		  if (x[field] < y[field])
		      return -1;
		  if (x[field] > y[field])
		      return 1;
		  return 0;
	      });
	  }
	  
        $.each(torrents, function(index, torrent){
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

          // Button group
          buttons = $('<div>').addClass('btn-group');

          // Action button (pause or resume)
          actionButton = generateTorrentActionButton(torrent);
          buttons.append(actionButton);

          // Remove button
          removeButton = $('<a>').
            addClass('btn btn-mini').
            html('<i class="icon-remove"></i>').
            attr('href', WEBDIR + 'transmission/remove/' + torrent.id).
            attr('title', 'Remove torrent');
          buttons.append(removeButton);

          tr.append(
            $('<td>').html(torrent.name
              +'<br><small><i class="icon-long-arrow-down"></i> ' + getReadableFileSizeString(torrent.rateDownload)
              +'/s <i class="icon-long-arrow-up"></i> ' + getReadableFileSizeString(torrent.rateUpload) + '/s</small>'
            ),
            $('<td>').text(ratio),
            $('<td>').text(getReadableTime(torrent.eta)),
            $('<td>').text(torrentStatus(torrent.status)),
            $('<td>').addClass('span3').html(progress),
            $('<td>').addClass('torrent-action').append(buttons)
          );
          $('#torrent-queue').append(tr);
        });
        $('.spinner').hide();
      }
    }
  });
}

/**
 * Generate a start or stop button based on the torrent status
 */
function generateTorrentActionButton(torrent) {
  button = $('<a>').addClass('btn btn-mini');
  // Resume button if torrent is paused
  if (torrent.status == 0) {
    button.html('<i class="icon-play"></i>');
    button.attr('href', WEBDIR + 'transmission/start/' + torrent.id);
    button.attr('title', 'Resume torrent');
  } else { // Pause button
    button.html('<i class="icon-pause"></i>');
    button.attr('href', WEBDIR + 'transmission/stop/' + torrent.id);
    button.attr('title', 'Pause torrent');
  }

  return button;
}

/**
 * Get General transmission stats
 */
function getStatus(){
  $.ajax({
    url: WEBDIR + 'transmission/stats',
    success: function(response){
      if (response != null && response.arguments && response.result == 'success') {
        uploadSpeed = getReadableFileSizeString(response.arguments.uploadSpeed);
        downloadSpeed = getReadableFileSizeString(response.arguments.downloadSpeed);

       $('#queue_upload').text(uploadSpeed + '/s');
       $('#queue_download').text(downloadSpeed + '/s');
      }

      // Transmission api not responding, show message if the last know state was OK
      if (response == null && transmissionConnectionError == false) {
        transmissionConnectionError = true;
        notify('Error', 'Could not connect to Transmission', 'error');
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

  // Add leading 0 and : to seconds
  seconds = ':'+ (seconds  < 10 ? "0" + seconds : seconds);

  if (days < 1) {
    days = '';
  } else {
    days = days + 'd ';
    // remove seconds if the eta is 1 day or more
    seconds = '';
  }
  return days + hours + ":" + (minutes < 10 ? "0" + minutes : minutes) + seconds;
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

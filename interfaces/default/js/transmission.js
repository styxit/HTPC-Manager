// Last time we checked, was there a problem connecting to transmission?
var transmissionConnectionError = false;

$(document).ready(function(){
  $('.spinner').show();
  $(window).trigger('hashchange');
  getTorrents();
  getStatus();
  session();
  setInterval(function() {
     getTorrents();
     getStatus();
     session();
  }, 4000);

  // Torrent button ajax load
  $(document.body).off('click', '#torrent-queue .torrent-action a');
  $(document.body).on('click', '#torrent-queue .torrent-action a', function(event) {
    event.preventDefault();

    // set spinner inside button
    $(this).html('<i class="fa fa-spinner fa-pulse"></i>');

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

  $("#add_torrent_button").click(function (evt) {
      evt.preventDefault();

      if ($("#add_torrent_url").val().length === 0 && $("#add_torrent_file").val().length === 0) {
          return;
      }

      if ($("#add_torrent_file").val().length > 1) {

          var i, file, reader, metainfo;
          var fileInput = $('input#add_torrent_file');
          jQuery.each(fileInput[0].files, function (i, file) {
              var reader = new FileReader();
              reader.onload = function (e) {
                  var contents = e.target.result;
                  var key = "base64,";
                  var index = contents.indexOf(key);
                  if (index > -1) {
                      metainfo = contents.substring(index + key.length);

                  }
                  $.post(WEBDIR + "transmission/Add", {
                      'metainfo': metainfo
                  });

              };
              reader.readAsDataURL(file);
          });
      } else if ($("#add_torrent_url").val().length > 1) {
          $.post(WEBDIR + "transmission/Add", {
              'filename': $("#add_torrent_url").val()
          });

      }
      $('#add_torrent_file').val('');
      $("#add_torrent_url").val('');


  });


});


function getTorrents(){
  $.ajax({
    url: WEBDIR + 'transmission/queue',
    success: function(response){
      if (response != null && response.arguments && response.result == 'success') {
        $('#torrent-queue').html('');

        // Empty queue
        if (response.arguments.torrents.length == 0) {
          $('#torrent-queue').html('<tr><td colspan="5">Queue is empty</td></tr>');
        }

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

          // Button group
          buttons = $('<div>').addClass('btn-group');

          // Action button (pause or resume)
          actionButton = generateTorrentActionButton(torrent);
          buttons.append(actionButton);

          // Remove button
          removeButton = $('<a>').
            addClass('btn btn-mini').
            html('<i class="fa fa-trash-o fa-lg"></i>').
            attr('href', WEBDIR + 'transmission/remove/' + torrent.id).
            attr('title', 'Remove torrent');
          buttons.append(removeButton);

          tr.append(
            $('<td>').html(torrent.name
              +'<br><small><i class="fa fa-long-arrow-down"></i> ' + getReadableFileSizeString(torrent.rateDownload)
              +'/s <i class="fa fa-long-arrow-up"></i> ' + getReadableFileSizeString(torrent.rateUpload) + '/s</small>'
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
        $('#torrent-queue').parent().trigger('update');
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
    button.html('<i class="fa fa-play"></i>');
    button.attr('href', WEBDIR + 'transmission/start/' + torrent.id);
    button.attr('title', 'Resume torrent');
  } else { // Pause button
    button.html('<i class="fa fa-pause"></i>');
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
 * Get textual representation of torrent status
 *
 * Since torrent status is retured as integer by the Transmission API the number must be mapped to a string
 */
function torrentStatus(statusNr) {
  states = ['Paused', 'unkown 1', 'unknown 2', 'Queued', 'Downloading', 'unknown 5', 'Seeding']
  return states[statusNr]
}

function session() {
    $.ajax({
        url: WEBDIR + 'transmission/session',
        success: function (response) {
            if(response["arguments"]["speed-limit-down-enabled"])
                $('#transmission_speed_down').attr('placeholder', response["arguments"]["speed-limit-down"]);
            else
                $('#transmission_speed_down').attr('placeholder', 0);
            if(response["arguments"]["speed-limit-up"])
                $('#transmission_speed_up').attr('placeholder', response["arguments"]["speed-limit-up"]);
            else
                $('#transmission_speed_up').attr('placeholder', 0);
        }

    });
}

$(document).on('focusout', '#transmission_speed_down', function () {
    if ($(this).val() === undefined || ($(this).val().length === 0)) return;
    speed = $(this).val();
    $.get(WEBDIR + 'transmission/set_downspeed/' + $(this).val(), function () {
        if (speed == 0) {
            notify('Transmission', 'Removed speed limit', 'info');
        } else {
            notify('Transmission', 'changed to ' + speed + ' kB/s', 'info');
        }

    });
});

$(document).on('focusout', '#transmission_speed_up', function () {
    if ($(this).val() === undefined || ($(this).val().length === 0)) return;
    speed = $(this).val();
    $.get(WEBDIR + 'transmission/set_upspeed/' + $(this).val(), function () {
        if (speed == 0) {
            notify('Transmission', 'Removed speed limit', 'info');
        } else {
            notify('Transmission', 'Changed to ' + speed + ' kB/s', 'info');
        }

    });
});

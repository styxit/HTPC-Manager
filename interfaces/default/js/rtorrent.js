$(document).ready(function() {
  $('.spinner').show();
  $(window).trigger('hashchange');

  $('#rtorrent_speed_down').keyup(function(event) {
      if (event.keyCode == 13) {
        set_dl($('#rtorrent_speed_down').val())
      }
  });

  $('#rtorrent_speed_up').keyup(function(event) {
      if (event.keyCode == 13) {
        set_ul($('#rtorrent_speed_up').val())
      }
  });

  refreshUi();
  setInterval(function() {
    refreshUi();
  }, 4000);

  // Torrent button ajax load
  $(document.body).off('click', '.torrent-action a');
  $(document.body).on('click', '.torrent-action a', function(event) {
      event.preventDefault();
      // set spinner inside button
      $(this).html('<i class="fa fa-spinner fa-pulse"></i>');
      // do ajax request
      $.ajax({
          url: $(this).attr('href'),
          success: function(response) {
              // Refresh torrent list after successfull request with a tiny delay
              if (response.result == 'success') {
                  window.setTimeout(refreshUi, 250);
              }
          }
      });
  });

  $("#add_torrent_button").click(function(event) {
    event.preventDefault();

    if ($("#add_torrent_url").val().length === 0 && $("#rtorrent_add_local_torrent").val().length === 0) {
      return;
    }

    if ($("#rtorrent_add_local_torrent").val().length > 1) {
      var i, file, reader, metainfo;
      var fileInput = $('input#rtorrent_add_local_torrent');
      jQuery.each(fileInput[0].files, function (i, file) {
          var reader = new FileReader();
          var self = this;
          self.name = file.name.replace(/.*(\/|\\)/, '');

          reader.onload = function (e) {
              var contents = e.target.result;
              var key = "base64,";
              var index = contents.indexOf(key);
              if (index > -1) {
                  metainfo = contents.substring(index + key.length);
              }

              $.post(WEBDIR + "rtorrent/add", {
                'metainfo': metainfo,
                'filename': self.name
              }, function(result) {
                var suc = (!result.error) ? 'Success' : 'Error';
                notify('rTorrent', suc + ' sending ' + self.name.replace('.torrent', ''), 'info');
              });
          };
          reader.readAsDataURL(file);
      });
    } else if ($("#add_torrent_url").val().length > 1) {
      var url = $("#add_torrent_url").val();
      $.post(WEBDIR + "rtorrent/add", {
        'filename': url
      }, function(result) {
        var suc = (!result.error) ? 'Success' : 'Error';
        notify('rTorrent', suc + ' sending ' + url, 'info');
      });
    }

    $("#add_torrent_url").val('');
    $("#rtorrent_add_local_torrent").val('');
  });
});

function refreshUi() {
  getTorrents();
  getStatus();
}

function getStatus() {
  $.ajax({
    url: WEBDIR + 'rtorrent/stats',
    success: function(response) {
      if (response !== null) {
        var uploadSpeed = getReadableFileSizeString(response.result.stats.upload_rate);
        var downloadSpeed = getReadableFileSizeString(response.result.stats.download_rate);
        $('#queue_upload').text(uploadSpeed + '/s');
        $('#queue_download').text(downloadSpeed + '/s');

        var down = (response.result.stats.max_download_speed != -1) ? response.result.stats.max_download_speed : 0
        var up = (response.result.stats.max_upload_speed != -1) ? response.result.stats.max_upload_speed : 0
        $('#rtorrent_speed_down').attr("placeholder", down + ' KiB/s');
        $('#rtorrent_speed_up').attr("placeholder", up + ' KiB/s');
      }
    }
  });
}

function generateTorrentActionButton(torrent) {
  button = $('<a>').addClass('btn btn-mini');
  // Resume button if torrent is paused
  if (torrent.state == 'Paused') {
    button.html('<i class="fa fa-play"></i>');
    button.attr('href', WEBDIR + 'rtorrent/start/' + torrent.hash);
    button.attr('title', 'Resume torrent');
  } else { // Pause button
    button.html('<i class="fa fa-pause"></i>');
    button.attr('href', WEBDIR + 'rtorrent/stop/' + torrent.hash);
    button.attr('title', 'Pause torrent');
  }
  return button;
}

function getTorrents() {
  $.ajax({
    url: WEBDIR + 'rtorrent/queue',
    success: function(response) {
      if (response && response.result) {
        $('#torrent-queue').html('');
        // Empty queue
        if (response.result.length === 0) {
          $('#torrent-queue').html('<tr><td colspan="5">Queue is empty</td></tr>');
        }

        for (var key in response.result) {
          torrent = response.result[key];

          tr = $('<tr>');
          var progress_percent = Math.round((torrent.progress) * 10) / 10;

          var progressText = $('<div>');
          progressText.addClass('text-center');
          progressText.text(progress_percent + '%');
          var progressBar = $('<div>');
          progressBar.addClass('bar');
          progressBar.css('width', (progress_percent) + '%');
          var progress = $('<div>');
          progress.addClass('progress');
          if (torrent.is_finished) {
            progress.addClass('progress-success');
          }
          progress.append(progressBar);
          progress.append(progressText);

          // Round to 2 decimals
          eta = torrent.eta == '-1' ? '∞' : torrent.eta;
          // Button group
          buttons = $('<div>').addClass('btn-group');
          // Action button (pause or resume)
          actionButton = generateTorrentActionButton(torrent);
          buttons.append(actionButton);
          // Remove button
          removeButton = $('<a>').
          addClass('btn btn-mini').
          html('<i class="fa fa-trash-o fa-lg"></i>').
          attr('title', 'Remove torrent').
          attr('href', WEBDIR + 'rtorrent/remove/' + torrent.hash);

          buttons.append(removeButton);

          tr.append(
            $('<td>').text(torrent.name),
            $('<td>').text(getReadableFileSizeString(torrent.download_payload_rate) + '/s'),
            $('<td>').text(getReadableFileSizeString(torrent.upload_payload_rate) + '/s'),
            $('<td>').text(getReadableFileSizeString(torrent.total_size)),
            $('<td>').text((torrent.ratio / 1000).toFixed(3)),
            $('<td>').text(eta),
            $('<td>').text(torrent.state),
            $('<td>').addClass('span3').html(progress),
            $('<td>').addClass('torrent-action').append(buttons)
          );


          $('#torrent-queue').append(tr);
        }

        $('.spinner').hide();
        $('#torrent-queue').parent().trigger('update');
      }
    }
  });
}

function set_dl(speed) {
    $.get(WEBDIR + 'rtorrent/set_downspeed/' + speed, function() {
        if (speed === "0") {
            notify('rTorrent', 'Removed download speed limit', 'info');
        } else {
            notify('rTorrent', 'Changed download speed to ' + speed + ' kB/s', 'info');
        }
    });
}

function set_ul(speed) {
    $.get(WEBDIR + 'rtorrent/set_upspeed/' + speed, function() {
        if (speed === "0") {
            notify('rTorrent', 'Removed upload speed limit', 'info');
        } else {
            notify('rTorrent', 'Changed upload speed to ' + speed + ' kB/s', 'info');
        }
    });
}

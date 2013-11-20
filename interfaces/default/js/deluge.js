// Last time we checked, was there a problem connecting to deluge?
var delugeConnectionError = true;

$(document).ready(function(){
  $('.spinner').show();
  login();
  // Torrent button ajax load
  $(document.body).off('click', '.ajax-btn');
  $(document.body).on('click', '.ajax-btn', function(event) {
    event.preventDefault();

    // set spinner inside button
    $(this).html('<i class="icon-spinner icon-spin"></i>');

    // do ajax request
    $.ajax({
      url: $(this).attr('href'),
      success: function(response) {
        // Refresh torrent list after successfull request with a tiny delay
        if (response.result == 'success') {
          window.setTimeout(refreshUi, 500);
        }
      }
    });
  });
});

function refreshUi(){
    if(!delugeConnectionError){
        getTorrents();
        getStatus();
    }
}

function login(){
  $.ajax({
    url: WEBDIR + 'deluge/connected',
    async: false,
    success: function(response){
      if (!response.result) {
         return loginServer()
      }else{
        delugeConnectionError = false;
        refreshUi();
        setInterval(function() {
            refreshUi();
        }, 4000);
      }
    }
  });
}

function loginServer(){
  $.ajax({
    url: WEBDIR + 'deluge/get_hosts',
    async: false,
    success: function(response){
        setConnectToServer(response.result);
    }
  });
}

function getTorrents(){
  $.ajax({
    url: WEBDIR + 'deluge/queue',
    success: function(response){
      if (response && response.result) {
        $('#torrent-queue').html('');

        // Empty queue
        if (response.result.length == 0) {
          $('#torrent-queue').html('<tr><td colspan="5">Queue is empty</td></tr>');
        }

        for(key in response.result){
          torrent = response.result[key]
          tr = $('<tr>');
          
          var progress_precent = Math.round(torrent.progress*100) / 100;
          
          var progressText = $('<div>');
          progressText.addClass('text-center');
          progressText.text(progress_precent + '%');
          
          var progressBar = $('<div>');
          progressBar.addClass('bar');
          progressBar.css('width', (progress_precent) + '%');
          
          var  progress = $('<div>');
          progress.addClass('progress');
          if (torrent.is_finished) {
            progress.addClass('progress-success');
          }
          progress.append(progressBar);
          progress.append(progressText);

          // Round to 2 decimals
          ratio = torrent.ratio == -1 ? '∞' : Math.round(torrent.ratio*100) / 100;
          
          eta = torrent.eta == '0:00:00' ?'∞' : torrent.eta;
          // Button group
          buttons = $('<div>').addClass('btn-group');

          // Action button (pause or resume)
          actionButton = generateTorrentActionButton(torrent);
          buttons.append(actionButton);

          // Remove button
          removeButton = $('<a>').
            addClass('btn btn-mini').
            html('<i class="icon-remove"></i>').
            attr('title', 'Remove torrent').
            click(function(){
                setRemoveTorrentModal(torrent.hash);
            });
          buttons.append(removeButton);

          tr.append(
            $('<td>').html(torrent.name
              +'<br><small><i class="icon-long-arrow-down"></i> ' + getReadableFileSizeString(torrent.download_payload_rate)
              +'/s <i class="icon-long-arrow-up"></i> ' + getReadableFileSizeString(torrent.upload_payload_rate) + '/s</small>'
            ),
            $('<td>').text(getReadableFileSizeString(torrent.total_size)),
            $('<td>').text(ratio),
            $('<td>').text(getReadableTime(torrent.eta)),
            $('<td>').text(torrent.state),
            $('<td>').addClass('span3').html(progress),
            $('<td>').addClass('torrent-action').append(buttons)
          );
          $('#torrent-queue').append(tr);
        }
        $('.spinner').hide();
      }
    }
  });
}

function generateTorrentActionButton(torrent) {
  button = $('<a>').addClass('btn btn-mini ajax-btn');
  // Resume button if torrent is paused
  if (torrent.state == 'Paused') {
    button.html('<i class="icon-play"></i>');
    button.attr('href', WEBDIR + 'deluge/start/' + torrent.hash);
    button.attr('title', 'Resume torrent');
  } else { // Pause button
    button.html('<i class="icon-pause"></i>');
    button.attr('href', WEBDIR + 'deluge/stop/' + torrent.hash);
    button.attr('title', 'Pause torrent');
  }

  return button;
}

function setConnectToServer(servers){
    var content = '<form id="serversForm"><p>Please Select a server below and click connect:</p><table  style="background-color:#E8E8E8">';
    for (server in servers){
        content += '<th style="cursor: pointer;">';
        content +='<td style="width:10%;text-align:left;"><input type="radio" name="serverId" value="'+servers[server][0]+'" style="margin:0;"></td>';
        content +='<td style="width:20%;text-align:left;">' +servers[server][3]+ '</td>';
        content +='<td style="width:70%;text-align:left;">' +servers[server][1]+':'+servers[server][2]+'</td>';
        content +='</th>'
    }
    content +='</<table></form>';
    var modalButtons = {
        'Connect': function () {
            $.ajax(
                {
                    'url' : WEBDIR +'deluge/connect/' +$('input[name=serverId]:checked', '#serversForm').val(),
                    'success' : function(response){
                        if (response && !response.error)
                        {
                            notify('Info', 'Successfully logged in', 'success', 5);
                            refreshUi();
                        }
                        else
                        {
                            notify('Error', 'Problem login in: ' + response.error, 'error', 5);
                        }
                        hideModal();
                    }
                }
            )
        },
    }
    showModal('Remove Torrent', content,modalButtons);
}

function setRemoveTorrentModal(torrentId){
    var modalButtons = {
        'Remove With Data': function () {
            $.ajax(
                {
                    'url' : WEBDIR +'deluge/remove/' +torrentId+ '/1',
                    'success' : function(response){
                        if (response)
                        {
                            notify('Info', 'Torrent removed', 'success', 5);
                        }
                        else
                        {
                            notify('Error', 'Problem removing torrent', 'error', 5);
                        }
                        hideModal();
                    }
                }
            )
        },
        'Remove Torrent': function () {
            $.ajax(
                {
                    'url' : WEBDIR +'deluge/remove/' +torrentId+'/0',
                    'success' : function(response){
                        if (response)
                        {
                            notify('Info', 'Torrent removed', 'success', 5);
                            refreshUi();
                        }
                        else
                        {
                            notify('Error', 'Problem removing torrent', 'error', 5);
                        }
                        hideModal();
                    }
                }
            )
        },
    }
    // Create the content
    showModal('Remove Torrent', 'Are you sure you wish to remove the torrent (s)?', modalButtons);
}

/**
 * Get General deluge stats
 */
function getStatus(){
  $.ajax({
    url: WEBDIR + 'deluge/stats',
    success: function(response){
      if (response != null ) {
        uploadSpeed = getReadableFileSizeString(response.result.payload_upload_rate);
        downloadSpeed = getReadableFileSizeString(response.result.payload_download_rate);

       $('#queue_upload').text(uploadSpeed + '/s');
       $('#queue_download').text(downloadSpeed + '/s');
      }

      // Deluge api not responding, show message if the last know state was OK
      if (response == null && delugeConnectionError == false) {
        delugeConnectionError = true;
        notify('Error', 'Could not connect to Deluge', 'error');
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

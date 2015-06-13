$(document).ready(function(){
	$('.spinner').show();
	getAMuleData();
	
	//button ajax load
	$(document.body).off('click', '#amule-queue .amule-action a');
	$(document.body).on('click', '#amule-queue .amule-action a', function(event) {
		event.preventDefault();
		var control = true;
		
		if($(this).hasClass('confirm')){		
			control = confirm("Are you sure?");
		}
		
		if(control){
			// set spinner inside button
			$(this).html('<i class="icon-spinner icon-spin"></i>');

			// do ajax request
			$.ajax({
			  url: $(this).attr('href'),
			  success: function(response) {
				window.setTimeout(getAMuleData, 500);
			  }
			});
		}
	});
	
	$("#add_ed2k_button").click(function (pEvent) {
		pEvent.preventDefault();
		
		if ($("#add_ed2k_link").val().length == 0) {
			return;
		}
		
		$("#add_ed2k_button").prop('disabled', true);
		$.ajax({
		  type: "POST",
		  url: WEBDIR + "amule/add",
		  data: { ed2klink: $("#add_ed2k_link").val() },
		  success: function(response){
			$("#add_ed2k_link").val("");
			window.setTimeout(getAMuleData, 500);
			$("#add_ed2k_button").prop('disabled', false);
		  }
		});
	});
	
	setInterval(function() {
     getAMuleData();
  }, 4000);
});
function getAMuleData(){
	$.ajax({
    url: WEBDIR + 'amule/load',
    success: function(response){
      if (response != null && response.result == 'success') {
        $('#amule-queue').html('');
		$('#amule-upload').html('');
		
		var queueSpeed = 0;
		var uploadSpeed = 0;

        // Empty queue
        if (response.downloads.length == 0) {
          $('#amule-queue').html('<tr><td colspan="9">Queue is empty</td></tr>');
        }
		
		response.downloads.sort(dynamicSort("-progress"));

        $.each(response.downloads, function(index, download){
          tr = $('<tr>');
		  
		  var progressBar = $('<div>');
          progressBar.addClass('bar');
          progressBar.css('width', (download.progress) + '%');
		  
		  var progressPercent = $('<span>');
          progressPercent.addClass('percent');
          progressPercent.append((download.progress) + '%');

		  progressBar.append(progressPercent);
		  
          var  progress = $('<div>');
          progress.addClass('progress');
          if (download.progress >= 100) {
            progress.addClass('progress-success');
          }
          progress.append(progressBar);
		 
		  
		  // Button group
          buttons = $('<div>').addClass('btn-group');

          // Action button (pause or resume)
          actionButton = generateAmuleActionButton(download);
          buttons.append(actionButton);

          // Remove button
          removeButton = $('<a>').
            addClass('btn btn-mini').
			addClass('confirm').
            html('<i class="icon-remove"></i>').
            attr('href', WEBDIR + 'amule/remove/' + download.hash).
            attr('title', 'Remove file');
          buttons.append(removeButton);

          tr.append(
            $('<td>').text(download.short_name),
			$('<td>').text(getReadableFileSizeString(download.size)),
			$('<td>').text(getReadableFileSizeString(download.size_done)),
            $('<td>').text(getReadableFileSizeString(download.speed)+"/s"),
			$('<td>').text(getReadableTime((download.size-download.size_done)/download.speed)),
            $('<td>').addClass('span3').html(progress),
            $('<td>').addClass("hidden-phone").text(getReadableStatus(download)),
			$('<td>').addClass("hidden-phone").text(getReadablePriority(download)),
			$('<td>').addClass('amule-action').append(buttons)
          );
          $('#amule-queue').append(tr);
		  
		  queueSpeed+=parseInt(download.speed);
        });
		
		
		// Empty upload
        if (response.uploads.length == 0) {
          $('#amule-upload').html('<tr><td colspan="5">Upload is empty</td></tr>');
        }

        $.each(response.uploads, function(index, upload){
          tr = $('<tr>');

          tr.append(
            $('<td>').text(upload.short_name),
			$('<td>').text(upload.username),
			$('<td>').text(getReadableFileSizeString(upload.up)),
			$('<td>').text(getReadableFileSizeString(upload.down)),
            $('<td>').text(getReadableFileSizeString(upload.speed)+"/s")
          );
          $('#amule-upload').append(tr);
		  
		  uploadSpeed+=parseInt(upload.speed);
        });
		
		$('#queue_speed').html(getReadableFileSizeString(queueSpeed)+"/s");
		$('#upload_speed').html(getReadableFileSizeString(uploadSpeed)+"/s");
      }
    }
  });
  $('.spinner').hide();
}
function generateAmuleActionButton(download) {
  button = $('<a>').addClass('btn btn-mini');
  // Resume button if file is paused
  if (download.status == 7) {
    button.html('<i class="icon-play"></i>');
    button.attr('href', WEBDIR + 'amule/start/' + download.hash);
    button.attr('title', 'Resume file');
  } else { // Pause button
    button.html('<i class="icon-pause"></i>');
    button.attr('href', WEBDIR + 'amule/stop/' + download.hash);
    button.attr('title', 'Pause file');
  }

  return button;
}

function getReadableFileSizeString(fileSizeInBytes) {
    var i = -1;
    var byteUnits = [' kB', ' MB', ' GB', ' TB', 'PB'];
    do {
        fileSizeInBytes = fileSizeInBytes / 1024;
        i++;
    } while (fileSizeInBytes > 1024);
    return fileSizeInBytes.toFixed(2) + byteUnits[i];
};

function getReadableTime(timeInSeconds) {
  if(timeInSeconds == Infinity){
	return 'Infinity';
  }
  
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

function getReadableStatus(download)
{
	if ( download.status == 7 ) {
		return "Paused";
	} else if ( download.src_count_xfer > 0 ) {
		return "Downloading";
	} else {
		return "Waiting";
	}
}

function getReadablePriority(download)
{
	var priority;
	
	var prionames = {0 : "Low", 1 : "Normal", 2 : "High",
	3 : "Very high", 4 : "Very low", 5 : "Auto", 6 : "Release"};
	priority = prionames[download.prio];
	if ( download.prio_auto == 1) {
		priority = priority + "(auto)";
	}
	return priority;
}

function dynamicSort(property) {
    var sortOrder = 1;
    if(property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function (a,b) {
        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result * sortOrder;
    }
}
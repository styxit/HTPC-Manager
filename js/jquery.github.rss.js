$(document).ready(function(){
  rss = 'https://github.com/styxit/Htpc-Manager/commits/master.atom';
  // Use google api service to convert rss feed to json
  url = document.location.protocol + '//ajax.googleapis.com/ajax/services/feed/load?v=1.0&q='+ rss + '&num=7';

  $.ajax({
    url: url,
    dataType: 'jsonp',
    success: function(jsonpData){
      var feed = jsonpData.responseData.feed.entries;

      $('#github-commit-list').html('');
      $.each(feed, function(index, commit){

        item = $('<li>');
        item.append(
          $('<i>').addClass('icon-li icon-github-sign'),
          $('<a>').attr('href', commit['link']).text(commit['title'])
        );

        $('#github-commit-list').append(item);
      });
    }
  });
})
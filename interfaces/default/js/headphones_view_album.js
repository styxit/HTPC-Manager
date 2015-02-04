$(document).ready(function() {
	 var albumid = $('h1.page-title').attr('data-albumid');
	 var albumimg= $('h1.page-title').attr('data-albumimg');
	 // sort tracks desc
	 $('.tracks-table').trigger("sorton",[[[0,0]]]);
	 // Grab image from cache. if not download then serve from cache.
    //$('#banner').css('background-image', 'url(' + WEBDIR + 'headphones/GetThumb/?url=' + albumimg + ')');
})


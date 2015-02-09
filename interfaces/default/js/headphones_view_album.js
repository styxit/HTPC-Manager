$(document).ready(function() {
	 var albumid = $('h1.page-title').attr('data-albumid');
	 var albumimg= $('h1.page-title').attr('data-albumimg');
	 // Checking if the image is missing
	 if(albumimg == "None") {
	 	$('.album_img').attr('src', WEBDIR + 'img/no-cover-art.png')
	 } else {
	 	$('.album_img').attr('src', WEBDIR + 'headphones/GetThumb/?url=' + albumimg)
	 }
	 // sort tracks desc
	 $('.tracks-table').trigger("sorton",[[[0,0]]]);

})


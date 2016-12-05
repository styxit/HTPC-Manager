$(window).resize(function(e) {fixiframe();});
$(document).ready(function() {fixiframe();});

function fixiframe() {
     $('#webpage').height($(window).height() - $('.navbar').height()); 
}

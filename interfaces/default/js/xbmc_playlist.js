$(document).ready(function() {
    // FIX - Temporary fix 
    $.getScript(WEBDIR + "js/xbmc.js", function() {
        playlist('audio');
    });
});

$(document).ready(function () {
    loadShows();
    loadNextAired();
    loadSickbeardHistory(25);
    loadLogs();

    $('#add_show_button').click(function () {
        $(this).attr('disabled', true);
        searchTvDb($('#add_show_name').val())
    });

    $('#add_tvdbid_button').click(function () {
        addShow($('#add_show_select').val());
    });

    $('#cancel_show_button').click(function () {
        cancelAddShow();
    });

});

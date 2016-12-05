    $('[data-player-control]').click(function () {
        var action = $(this).attr('data-player-control');
        $.get(WEBDIR + 'samsungtv/sendkey?action='+action);
    });

    $(document).on('click', '.send', function() {
        var action = $('#msg').val();
        $.get(WEBDIR + 'samsungtv/sendkey?action='+action);
    });
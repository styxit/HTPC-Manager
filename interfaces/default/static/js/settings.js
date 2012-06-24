$(document).ready(function () {
    $('.enable-module input').each(function () {
        var clickItem = $(this);
        var moduleItems = clickItem.parents('fieldset:first').find('input, radio, select');
        if (clickItem.is(':checked')) {
            moduleItems.attr('readonly', false);
            moduleItems.attr('disabled', false);
        } else {
            moduleItems.attr('readonly', true);
            moduleItems.attr('disabled', true);
        }
        clickItem.attr('disabled', false);
        clickItem.attr('readonly', false);
        clickItem.click(function () {
            var item = $(this);
            var items = item.parents('fieldset:first').find('input, radio, select');
            console.log(items);
            if (item.is(':checked')) {
                items.attr('readonly', false);
                items.attr('disabled', false);
            } else {
                items.attr('readonly', true);
                items.attr('disabled', true);
            }
            item.attr('disabled', false);
            item.attr('readonly', false);
        });
    });
});

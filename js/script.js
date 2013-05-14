$(document).ready(function() {
  $(window).bind("load", function() {
    var urlHash = window.location.href.split("#")[1];
    $('html,body').animate({scrollTop:$('#anchor-'+urlHash).offset().top}, 1100);
  });

  $('#headerCarousel').carousel({
    interval: false
  });

  // Fancybox setup
  $('a.js-fancybox').fancybox();
});
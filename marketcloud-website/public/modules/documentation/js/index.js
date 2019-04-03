
var Documentation = window.Documentation || {};

function bindReferenceIndexEvents() {
  $("nav>ul#api-reference-index>li>a").click(function(e) {
    e.preventDefault();
    $(e.target).parent().toggleClass('active');
  })

  $("nav>ul#api-reference-index>li> ul > li > a").click(function(e) {

    $("nav>ul#api-reference-index>li> ul > li.active").toggleClass('active')
    $(e.target).parent().toggleClass('active');

  })


  $(".documentation-index-handle").on("click touch", function() {
    $("#mobile-index").show();
  })

  $("#hideMobileIndex, #close-mobile-index").on("click touch", function() {
    $("#mobile-index").hide();
  })

  $("#mobile-index a[href]").on("click touch", function() {
    $("#mobile-index").hide();
  })
}

Documentation.bindReferenceIndexEvents = bindReferenceIndexEvents;
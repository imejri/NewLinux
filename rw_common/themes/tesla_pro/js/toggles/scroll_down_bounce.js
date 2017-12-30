elixir.scrollDownButtonAnimation = {};
elixir.scrollDownButtonAnimation = (function() {
    var jQuery = elixir.jQuery;
    var $ = jQuery;
	var $elixir = jQuery.noConflict();

	function scrollDownButtonAnimationFunction() {
		$('#scroll_down_button').addClass('tesla_pro_animated').addClass('tesla_pro_bounce').addClass('infinite');

		$(window).scroll(function() {
		  $('#scroll_down_button').removeClass('tesla_pro_bounce').removeClass('infinite').removeClass('tesla_pro_animated');
		});
	}
	
	$(document).ready(function() {
		scrollDownButtonAnimationFunction();
	});	
	
})(elixir.scrollDownButtonAnimation);
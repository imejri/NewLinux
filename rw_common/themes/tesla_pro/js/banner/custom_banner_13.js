elixir.customBannerBackground = {};
elixir.customBannerBackground = (function() {
    var jQuery = elixir.jQuery;
    var $ = jQuery;
	var $elixir = jQuery.noConflict();

	function customBannerBackgroundFunction() {
		$('header').addClass('banner13');
	}
	
	$(document).ready(function() {
		customBannerBackgroundFunction();
	});	
	
})(elixir.customBannerBackground);
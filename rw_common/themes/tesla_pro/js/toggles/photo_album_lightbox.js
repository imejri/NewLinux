elixir.photoAlbumLightbox = {};
elixir.photoAlbumLightbox = (function() {
    var jQuery = elixir.jQuery;
    var $ = jQuery;
	var $elixir = jQuery.noConflict();

	function photoAlbumLightboxFunction() {
    //
    // Handles lightbox for Photo Album page
    //
		$('.thumbnail-frame').each(function(){
			var thumbnailCaption = $('.thumbnail-caption', this).text();
			$('a',this).attr({
				'href' : $('a img',this).attr('src').replace(/thumb/i,'full'),
				'title' : thumbnailCaption,
			});
		});

		$('.thumbnail-frame').magnificPopup({
		  delegate: 'a', // child items selector, by clicking on it popup will open
		  type: 'image',
		  titleSrc: 'title',
		  gallery:{
		    enabled: true,
	      navigateByImgClick: false,
				preload: [0,2]
		  },

		  closeOnContentClick: true,

		  mainClass: 'mfp-with-zoom', // this class is for CSS animation below

		  zoom: {
		    enabled: true, // By default it's false, so don't forget to enable it

		    duration: 300, // duration of the effect, in milliseconds
		    easing: 'ease-in-out', // CSS transition easing function 

		    // The "opener" function should return the element from which popup will be zoomed in
		    // and to which popup will be scaled down
		    // By defailt it looks for an image tag:
		    opener: function(openerElement) {
		      // openerElement is the element on which popup was initialized, in this case its <a> tag
		      // you don't need to add "opener" option if this code matches your needs, it's defailt one.
		      return openerElement.is('img') ? openerElement : openerElement.find('img');
		    }
		  }

		});

        //
        // Hanldes caption spacing when image captions are turned on for thumbnails.
        //
		if ($('.thumbnail-wrap .thumbnail-caption').length > 0) {
			$('.thumbnail-wrap').css({'margin-bottom' : '80px'});
		}
	}
	
	$(document).ready(function() {
		photoAlbumLightboxFunction();
	});	
	
})(elixir.photoAlbumLightbox);

/*global define:false require:false */
(function (name, context, definition) {
	if (typeof module != 'undefined' && module.exports) module.exports = definition();
	else if (typeof define == 'function' && define.amd) define(definition);
	else context[name] = definition();
})('jquery-scrollto', this, function(){
	// Prepare
	var jQuery, $, ScrollTo;
	jQuery = $ = window.jQuery || require('jquery');

	// Fix scrolling animations on html/body on safari
	$.propHooks.scrollTop = $.propHooks.scrollLeft = {
		get: function(elem,prop) {
			var result = null;
			if ( elem.tagName === 'HTML' || elem.tagName === 'BODY' ) {
				if ( prop === 'scrollLeft' ) {
					result = window.scrollX;
				} else if ( prop === 'scrollTop' ) {
					result = window.scrollY;
				}
			}
			if ( result == null ) {
				result = elem[prop];
			}
			return result;
		}
	};
	$.Tween.propHooks.scrollTop = $.Tween.propHooks.scrollLeft = {
		get: function(tween) {
			return $.propHooks.scrollTop.get(tween.elem, tween.prop);
		},
		set: function(tween) {
			// Our safari fix
			if ( tween.elem.tagName === 'HTML' || tween.elem.tagName === 'BODY' ) {
				// Defaults
				tween.options.bodyScrollLeft = (tween.options.bodyScrollLeft || window.scrollX);
				tween.options.bodyScrollTop = (tween.options.bodyScrollTop || window.scrollY);

				// Apply
				if ( tween.prop === 'scrollLeft' ) {
					tween.options.bodyScrollLeft = Math.round(tween.now);
				}
				else if ( tween.prop === 'scrollTop' ) {
					tween.options.bodyScrollTop = Math.round(tween.now);
				}

				// Apply
				window.scrollTo(tween.options.bodyScrollLeft, tween.options.bodyScrollTop);
			}
			// jQuery's IE8 Fix
			else if ( tween.elem.nodeType && tween.elem.parentNode ) {
				tween.elem[ tween.prop ] = tween.now;
			}
		}
	};

	// jQuery ScrollTo
	ScrollTo = {
		// Configuration
		config: {
			duration: 400,
			easing: 'swing',
			callback: undefined,
			durationMode: 'each',
			offsetTop: 0,
			offsetLeft: 0
		},

		// Set Configuration
		configure: function(options){
			// Apply Options to Config
			$.extend(ScrollTo.config, options||{});

			// Chain
			return this;
		},

		// Perform the Scroll Animation for the Collections
		// We use $inline here, so we can determine the actual offset start for each overflow:scroll item
		// Each collection is for each overflow:scroll item
		scroll: function(collections, config){
			// Prepare
			var collection, $container, container, $target, $inline, position, containerTagName,
				containerScrollTop, containerScrollLeft,
				containerScrollTopEnd, containerScrollLeftEnd,
				startOffsetTop, targetOffsetTop, targetOffsetTopAdjusted,
				startOffsetLeft, targetOffsetLeft, targetOffsetLeftAdjusted,
				scrollOptions,
				callback;

			// Determine the Scroll
			collection = collections.pop();
			$container = collection.$container;
			$target = collection.$target;
			containerTagName = $container.prop('tagName');

			// Prepare the Inline Element of the Container
			$inline = $('<span/>').css({
				'position': 'absolute',
				'top': '0px',
				'left': '0px'
			});
			position = $container.css('position');

			// Insert the Inline Element of the Container
			$container.css({position:'relative'});
			$inline.appendTo($container);

			// Determine the top offset
			startOffsetTop = $inline.offset().top;
			targetOffsetTop = $target.offset().top;
			targetOffsetTopAdjusted = targetOffsetTop - startOffsetTop - parseInt(config.offsetTop,10);

			// Determine the left offset
			startOffsetLeft = $inline.offset().left;
			targetOffsetLeft = $target.offset().left;
			targetOffsetLeftAdjusted = targetOffsetLeft - startOffsetLeft - parseInt(config.offsetLeft,10);

			// Determine current scroll positions
			containerScrollTop = $container.prop('scrollTop');
			containerScrollLeft = $container.prop('scrollLeft');

			// Reset the Inline Element of the Container
			$inline.remove();
			$container.css({position:position});

			// Prepare the scroll options
			scrollOptions = {};

			// Prepare the callback
			callback = function(event){
				// Check
				if ( collections.length === 0 ) {
					// Callback
					if ( typeof config.callback === 'function' ) {
						config.callback();
					}
				}
				else {
					// Recurse
					ScrollTo.scroll(collections,config);
				}
				// Return true
				return true;
			};

			// Handle if we only want to scroll if we are outside the viewport
			if ( config.onlyIfOutside ) {
				// Determine current scroll positions
				containerScrollTopEnd = containerScrollTop + $container.height();
				containerScrollLeftEnd = containerScrollLeft + $container.width();

				// Check if we are in the range of the visible area of the container
				if ( containerScrollTop < targetOffsetTopAdjusted && targetOffsetTopAdjusted < containerScrollTopEnd ) {
					targetOffsetTopAdjusted = containerScrollTop;
				}
				if ( containerScrollLeft < targetOffsetLeftAdjusted && targetOffsetLeftAdjusted < containerScrollLeftEnd ) {
					targetOffsetLeftAdjusted = containerScrollLeft;
				}
			}

			// Determine the scroll options
			if ( targetOffsetTopAdjusted !== containerScrollTop ) {
				scrollOptions.scrollTop = targetOffsetTopAdjusted;
			}
			if ( targetOffsetLeftAdjusted !== containerScrollLeft ) {
				scrollOptions.scrollLeft = targetOffsetLeftAdjusted;
			}

			// Check to see if the scroll is necessary
			if ( $container.prop('scrollHeight') === $container.width() ) {
				delete scrollOptions.scrollTop;
			}
			if ( $container.prop('scrollWidth') === $container.width() ) {
				delete scrollOptions.scrollLeft;
			}

			// Perform the scroll
			if ( scrollOptions.scrollTop != null || scrollOptions.scrollLeft != null ) {
				$container.animate(scrollOptions, {
					duration: config.duration,
					easing: config.easing,
					complete: callback
				});
			}
			else {
				callback();
			}

			// Return true
			return true;
		},

		// ScrollTo the Element using the Options
		fn: function(options){
			// Prepare
			var collections, config, $container, container;
			collections = [];

			// Prepare
			var	$target = $(this);
			if ( $target.length === 0 ) {
				// Chain
				return this;
			}

			// Handle Options
			config = $.extend({},ScrollTo.config,options);

			// Fetch
			$container = $target.parent();
			container = $container.get(0);

			// Cycle through the containers
			while ( ($container.length === 1) && (container !== document.body) && (container !== document) ) {
				// Check Container for scroll differences
				var containerScrollTop, containerScrollLeft;
				containerScrollTop = $container.css('overflow-y') !== 'visible' && container.scrollHeight !== container.clientHeight;
				containerScrollLeft =  $container.css('overflow-x') !== 'visible' && container.scrollWidth !== container.clientWidth;
				if ( containerScrollTop || containerScrollLeft ) {
					// Push the Collection
					collections.push({
						'$container': $container,
						'$target': $target
					});
					// Update the Target
					$target = $container;
				}
				// Update the Container
				$container = $container.parent();
				container = $container.get(0);
			}

			// Add the final collection
			collections.push({
				'$container': $('html'),
				// document.body doesn't work in firefox, html works for all
				// internet explorer starts at the beggining
				'$target': $target
			});

			// Adjust the Config
			if ( config.durationMode === 'all' ) {
				config.duration /= collections.length;
			}

			// Handle
			ScrollTo.scroll(collections,config);

			// Chain
			return this;
		}
	};

	// Apply our extensions to jQuery
	$.ScrollTo = $.ScrollTo || ScrollTo;
	$.fn.ScrollTo = $.fn.ScrollTo || ScrollTo.fn;

	// Export
	return ScrollTo;
});



	//
	// Skrollr
	//

	/*!
	 * skrollr core
	 *
	 * Alexander Prinzhorn - https://github.com/Prinzhorn/skrollr
	 *
	 * Free to use under terms of MIT license
	 */
	(function(window, document, undefined) {
		'use strict';

		/*
		 * Global api.
		 */
		var skrollr = {
			get: function() {
				return _instance;
			},
			//Main entry point.
			init: function(options) {
				return _instance || new Skrollr(options);
			},
			VERSION: '0.6.22'
		};

		//Minify optimization.
		var hasProp = Object.prototype.hasOwnProperty;
		var Math = window.Math;
		var getStyle = window.getComputedStyle;

		//They will be filled when skrollr gets initialized.
		var documentElement;
		var body;

		var EVENT_TOUCHSTART = 'touchstart';
		var EVENT_TOUCHMOVE = 'touchmove';
		var EVENT_TOUCHCANCEL = 'touchcancel';
		var EVENT_TOUCHEND = 'touchend';

		var SKROLLABLE_CLASS = 'skrollable';
		var SKROLLABLE_BEFORE_CLASS = SKROLLABLE_CLASS + '-before';
		var SKROLLABLE_BETWEEN_CLASS = SKROLLABLE_CLASS + '-between';
		var SKROLLABLE_AFTER_CLASS = SKROLLABLE_CLASS + '-after';

		var SKROLLR_CLASS = 'skrollr';
		var NO_SKROLLR_CLASS = 'no-' + SKROLLR_CLASS;
		var SKROLLR_DESKTOP_CLASS = SKROLLR_CLASS + '-desktop';
		var SKROLLR_MOBILE_CLASS = SKROLLR_CLASS + '-mobile';

		var DEFAULT_EASING = 'linear';
		var DEFAULT_DURATION = 1000;//ms
		var DEFAULT_MOBILE_DECELERATION = 0.004;//pixel/ms²

		var DEFAULT_SMOOTH_SCROLLING_DURATION = 200;//ms

		var ANCHOR_START = 'start';
		var ANCHOR_END = 'end';
		var ANCHOR_CENTER = 'center';
		var ANCHOR_BOTTOM = 'bottom';

		//The property which will be added to the DOM element to hold the ID of the skrollable.
		var SKROLLABLE_ID_DOM_PROPERTY = '___skrollable_id';

		var rxTouchIgnoreTags = /^(?:input|textarea|button|select)$/i;

		var rxTrim = /^\s+|\s+$/g;

		//Find all data-attributes. data-[_constant]-[offset]-[anchor]-[anchor].
		var rxKeyframeAttribute = /^data(?:-(_\w+))?(?:-?(-?\d*\.?\d+p?))?(?:-?(start|end|top|center|bottom))?(?:-?(top|center|bottom))?$/;

		var rxPropValue = /\s*(@?[\w\-\[\]]+)\s*:\s*(.+?)\s*(?:;|$)/gi;

		//Easing function names follow the property in square brackets.
		var rxPropEasing = /^([a-z\-]+)\[(\w+)\]$/;

		var rxCamelCase = /-([a-z0-9_])/g;
		var rxCamelCaseFn = function(str, letter) {
			return letter.toUpperCase();
		};

		//Numeric values with optional sign.
		var rxNumericValue = /[\-+]?[\d]*\.?[\d]+/g;

		//Used to replace occurences of {?} with a number.
		var rxInterpolateString = /\{\?\}/g;

		//Finds rgb(a) colors, which don't use the percentage notation.
		var rxRGBAIntegerColor = /rgba?\(\s*-?\d+\s*,\s*-?\d+\s*,\s*-?\d+/g;

		//Finds all gradients.
		var rxGradient = /[a-z\-]+-gradient/g;

		//Vendor prefix. Will be set once skrollr gets initialized.
		var theCSSPrefix = '';
		var theDashedCSSPrefix = '';

		//Will be called once (when skrollr gets initialized).
		var detectCSSPrefix = function() {
			//Only relevant prefixes. May be extended.
			//Could be dangerous if there will ever be a CSS property which actually starts with "ms". Don't hope so.
			var rxPrefixes = /^(?:O|Moz|webkit|ms)|(?:-(?:o|moz|webkit|ms)-)/;

			//Detect prefix for current browser by finding the first property using a prefix.
			if(!getStyle) {
				return;
			}

			var style = getStyle(body, null);

			for(var k in style) {
				//We check the key and if the key is a number, we check the value as well, because safari's getComputedStyle returns some weird array-like thingy.
				theCSSPrefix = (k.match(rxPrefixes) || (+k == k && style[k].match(rxPrefixes)));

				if(theCSSPrefix) {
					break;
				}
			}

			//Did we even detect a prefix?
			if(!theCSSPrefix) {
				theCSSPrefix = theDashedCSSPrefix = '';

				return;
			}

			theCSSPrefix = theCSSPrefix[0];

			//We could have detected either a dashed prefix or this camelCaseish-inconsistent stuff.
			if(theCSSPrefix.slice(0,1) === '-') {
				theDashedCSSPrefix = theCSSPrefix;

				//There's no logic behind these. Need a look up.
				theCSSPrefix = ({
					'-webkit-': 'webkit',
					'-moz-': 'Moz',
					'-ms-': 'ms',
					'-o-': 'O'
				})[theCSSPrefix];
			} else {
				theDashedCSSPrefix = '-' + theCSSPrefix.toLowerCase() + '-';
			}
		};

		var polyfillRAF = function() {
			var requestAnimFrame = window.requestAnimationFrame || window[theCSSPrefix.toLowerCase() + 'RequestAnimationFrame'];

			var lastTime = _now();

			if(_isMobile || !requestAnimFrame) {
				requestAnimFrame = function(callback) {
					//How long did it take to render?
					var deltaTime = _now() - lastTime;
					var delay = Math.max(0, 1000 / 60 - deltaTime);

					return window.setTimeout(function() {
						lastTime = _now();
						callback();
					}, delay);
				};
			}

			return requestAnimFrame;
		};

		var polyfillCAF = function() {
			var cancelAnimFrame = window.cancelAnimationFrame || window[theCSSPrefix.toLowerCase() + 'CancelAnimationFrame'];

			if(_isMobile || !cancelAnimFrame) {
				cancelAnimFrame = function(timeout) {
					return window.clearTimeout(timeout);
				};
			}

			return cancelAnimFrame;
		};

		//Built-in easing functions.
		var easings = {
			begin: function() {
				return 0;
			},
			end: function() {
				return 1;
			},
			linear: function(p) {
				return p;
			},
			quadratic: function(p) {
				return p * p;
			},
			cubic: function(p) {
				return p * p * p;
			},
			swing: function(p) {
				return (-Math.cos(p * Math.PI) / 2) + 0.5;
			},
			sqrt: function(p) {
				return Math.sqrt(p);
			},
			outCubic: function(p) {
				return (Math.pow((p - 1), 3) + 1);
			},
			//see https://www.desmos.com/calculator/tbr20s8vd2 for how I did this
			bounce: function(p) {
				var a;

				if(p <= 0.5083) {
					a = 3;
				} else if(p <= 0.8489) {
					a = 9;
				} else if(p <= 0.96208) {
					a = 27;
				} else if(p <= 0.99981) {
					a = 91;
				} else {
					return 1;
				}

				return 1 - Math.abs(3 * Math.cos(p * a * 1.028) / a);
			}
		};

		/**
		 * Constructor.
		 */
		function Skrollr(options) {
			documentElement = document.documentElement;
			body = document.body;

			detectCSSPrefix();

			_instance = this;

			options = options || {};

			_constants = options.constants || {};

			//We allow defining custom easings or overwrite existing.
			if(options.easing) {
				for(var e in options.easing) {
					easings[e] = options.easing[e];
				}
			}

			_edgeStrategy = options.edgeStrategy || 'set';

			_listeners = {
				//Function to be called right before rendering.
				beforerender: options.beforerender,

				//Function to be called right after finishing rendering.
				render: options.render,

				//Function to be called whenever an element with the `data-emit-events` attribute passes a keyframe.
				keyframe: options.keyframe
			};

			//forceHeight is true by default
			_forceHeight = options.forceHeight !== false;

			if(_forceHeight) {
				_scale = options.scale || 1;
			}

			_mobileDeceleration = options.mobileDeceleration || DEFAULT_MOBILE_DECELERATION;

			_smoothScrollingEnabled = options.smoothScrolling !== false;
			_smoothScrollingDuration = options.smoothScrollingDuration || DEFAULT_SMOOTH_SCROLLING_DURATION;

			//Dummy object. Will be overwritten in the _render method when smooth scrolling is calculated.
			_smoothScrolling = {
				targetTop: _instance.getScrollTop()
			};

			//A custom check function may be passed.
			_isMobile = ((options.mobileCheck || function() {
				return (/Android|iPhone|iPad|iPod|BlackBerry/i).test(navigator.userAgent || navigator.vendor || window.opera);
			})());

			if(_isMobile) {
				_skrollrBody = document.getElementById('skrollr-body');

				//Detect 3d transform if there's a skrollr-body (only needed for #skrollr-body).
				if(_skrollrBody) {
					_detect3DTransforms();
				}

				_initMobile();
				_updateClass(documentElement, [SKROLLR_CLASS, SKROLLR_MOBILE_CLASS], [NO_SKROLLR_CLASS]);
			} else {
				_updateClass(documentElement, [SKROLLR_CLASS, SKROLLR_DESKTOP_CLASS], [NO_SKROLLR_CLASS]);
			}

			//Triggers parsing of elements and a first reflow.
			_instance.refresh();

			_addEvent(window, 'resize orientationchange', function() {
				var width = documentElement.clientWidth;
				var height = documentElement.clientHeight;

				//Only reflow if the size actually changed (#271).
				if(height !== _lastViewportHeight || width !== _lastViewportWidth) {
					_lastViewportHeight = height;
					_lastViewportWidth = width;

					_requestReflow = true;
				}
			});

			var requestAnimFrame = polyfillRAF();

			//Let's go.
			(function animloop(){
				_render();
				_animFrame = requestAnimFrame(animloop);
			}());

			return _instance;
		}

		/**
		 * (Re)parses some or all elements.
		 */
		Skrollr.prototype.refresh = function(elements) {
			var elementIndex;
			var elementsLength;
			var ignoreID = false;

			//Completely reparse anything without argument.
			if(elements === undefined) {
				//Ignore that some elements may already have a skrollable ID.
				ignoreID = true;

				_skrollables = [];
				_skrollableIdCounter = 0;

				elements = document.getElementsByTagName('*');
			} else if(elements.length === undefined) {
				//We also accept a single element as parameter.
				elements = [elements];
			}

			elementIndex = 0;
			elementsLength = elements.length;

			for(; elementIndex < elementsLength; elementIndex++) {
				var el = elements[elementIndex];
				var anchorTarget = el;
				var keyFrames = [];

				//If this particular element should be smooth scrolled.
				var smoothScrollThis = _smoothScrollingEnabled;

				//The edge strategy for this particular element.
				var edgeStrategy = _edgeStrategy;

				//If this particular element should emit keyframe events.
				var emitEvents = false;

				//If we're reseting the counter, remove any old element ids that may be hanging around.
				if(ignoreID && SKROLLABLE_ID_DOM_PROPERTY in el) {
					delete el[SKROLLABLE_ID_DOM_PROPERTY];
				}

				if(!el.attributes) {
					continue;
				}

				//Iterate over all attributes and search for key frame attributes.
				var attributeIndex = 0;
				var attributesLength = el.attributes.length;

				for (; attributeIndex < attributesLength; attributeIndex++) {
					var attr = el.attributes[attributeIndex];

					if(attr.name === 'data-anchor-target') {
						anchorTarget = document.querySelector(attr.value);

						if(anchorTarget === null) {
							throw 'Unable to find anchor target "' + attr.value + '"';
						}

						continue;
					}

					//Global smooth scrolling can be overridden by the element attribute.
					if(attr.name === 'data-smooth-scrolling') {
						smoothScrollThis = attr.value !== 'off';

						continue;
					}

					//Global edge strategy can be overridden by the element attribute.
					if(attr.name === 'data-edge-strategy') {
						edgeStrategy = attr.value;

						continue;
					}

					//Is this element tagged with the `data-emit-events` attribute?
					if(attr.name === 'data-emit-events') {
						emitEvents = true;

						continue;
					}

					var match = attr.name.match(rxKeyframeAttribute);

					if(match === null) {
						continue;
					}

					var kf = {
						props: attr.value,
						//Point back to the element as well.
						element: el,
						//The name of the event which this keyframe will fire, if emitEvents is
						eventType: attr.name.replace(rxCamelCase, rxCamelCaseFn)
					};

					keyFrames.push(kf);

					var constant = match[1];

					if(constant) {
						//Strip the underscore prefix.
						kf.constant = constant.substr(1);
					}

					//Get the key frame offset.
					var offset = match[2];

					//Is it a percentage offset?
					if(/p$/.test(offset)) {
						kf.isPercentage = true;
						kf.offset = (offset.slice(0, -1) | 0) / 100;
					} else {
						kf.offset = (offset | 0);
					}

					var anchor1 = match[3];

					//If second anchor is not set, the first will be taken for both.
					var anchor2 = match[4] || anchor1;

					//"absolute" (or "classic") mode, where numbers mean absolute scroll offset.
					if(!anchor1 || anchor1 === ANCHOR_START || anchor1 === ANCHOR_END) {
						kf.mode = 'absolute';

						//data-end needs to be calculated after all key frames are known.
						if(anchor1 === ANCHOR_END) {
							kf.isEnd = true;
						} else if(!kf.isPercentage) {
							//For data-start we can already set the key frame w/o calculations.
							//#59: "scale" options should only affect absolute mode.
							kf.offset = kf.offset * _scale;
						}
					}
					//"relative" mode, where numbers are relative to anchors.
					else {
						kf.mode = 'relative';
						kf.anchors = [anchor1, anchor2];
					}
				}

				//Does this element have key frames?
				if(!keyFrames.length) {
					continue;
				}

				//Will hold the original style and class attributes before we controlled the element (see #80).
				var styleAttr, classAttr;

				var id;

				if(!ignoreID && SKROLLABLE_ID_DOM_PROPERTY in el) {
					//We already have this element under control. Grab the corresponding skrollable id.
					id = el[SKROLLABLE_ID_DOM_PROPERTY];
					styleAttr = _skrollables[id].styleAttr;
					classAttr = _skrollables[id].classAttr;
				} else {
					//It's an unknown element. Asign it a new skrollable id.
					id = (el[SKROLLABLE_ID_DOM_PROPERTY] = _skrollableIdCounter++);
					styleAttr = el.style.cssText;
					classAttr = _getClass(el);
				}

				_skrollables[id] = {
					element: el,
					styleAttr: styleAttr,
					classAttr: classAttr,
					anchorTarget: anchorTarget,
					keyFrames: keyFrames,
					smoothScrolling: smoothScrollThis,
					edgeStrategy: edgeStrategy,
					emitEvents: emitEvents,
					lastFrameIndex: -1
				};

				_updateClass(el, [SKROLLABLE_CLASS], []);
			}

			//Reflow for the first time.
			_reflow();

			//Now that we got all key frame numbers right, actually parse the properties.
			elementIndex = 0;
			elementsLength = elements.length;

			for(; elementIndex < elementsLength; elementIndex++) {
				var sk = _skrollables[elements[elementIndex][SKROLLABLE_ID_DOM_PROPERTY]];

				if(sk === undefined) {
					continue;
				}

				//Parse the property string to objects
				_parseProps(sk);

				//Fill key frames with missing properties from left and right
				_fillProps(sk);
			}

			return _instance;
		};

		/**
		 * Transform "relative" mode to "absolute" mode.
		 * That is, calculate anchor position and offset of element.
		 */
		Skrollr.prototype.relativeToAbsolute = function(element, viewportAnchor, elementAnchor) {
			var viewportHeight = documentElement.clientHeight;
			var box = element.getBoundingClientRect();
			var absolute = box.top;

			//#100: IE doesn't supply "height" with getBoundingClientRect.
			var boxHeight = box.bottom - box.top;

			if(viewportAnchor === ANCHOR_BOTTOM) {
				absolute -= viewportHeight;
			} else if(viewportAnchor === ANCHOR_CENTER) {
				absolute -= viewportHeight / 2;
			}

			if(elementAnchor === ANCHOR_BOTTOM) {
				absolute += boxHeight;
			} else if(elementAnchor === ANCHOR_CENTER) {
				absolute += boxHeight / 2;
			}

			//Compensate scrolling since getBoundingClientRect is relative to viewport.
			absolute += _instance.getScrollTop();

			return (absolute + 0.5) | 0;
		};

		/**
		 * Animates scroll top to new position.
		 */
		Skrollr.prototype.animateTo = function(top, options) {
			options = options || {};

			var now = _now();
			var scrollTop = _instance.getScrollTop();

			//Setting this to a new value will automatically cause the current animation to stop, if any.
			_scrollAnimation = {
				startTop: scrollTop,
				topDiff: top - scrollTop,
				targetTop: top,
				duration: options.duration || DEFAULT_DURATION,
				startTime: now,
				endTime: now + (options.duration || DEFAULT_DURATION),
				easing: easings[options.easing || DEFAULT_EASING],
				done: options.done
			};

			//Don't queue the animation if there's nothing to animate.
			if(!_scrollAnimation.topDiff) {
				if(_scrollAnimation.done) {
					_scrollAnimation.done.call(_instance, false);
				}

				_scrollAnimation = undefined;
			}

			return _instance;
		};

		/**
		 * Stops animateTo animation.
		 */
		Skrollr.prototype.stopAnimateTo = function() {
			if(_scrollAnimation && _scrollAnimation.done) {
				_scrollAnimation.done.call(_instance, true);
			}

			_scrollAnimation = undefined;
		};

		/**
		 * Returns if an animation caused by animateTo is currently running.
		 */
		Skrollr.prototype.isAnimatingTo = function() {
			return !!_scrollAnimation;
		};

		Skrollr.prototype.isMobile = function() {
			return _isMobile;
		};

		Skrollr.prototype.setScrollTop = function(top, force) {
			_forceRender = (force === true);

			if(_isMobile) {
				_mobileOffset = Math.min(Math.max(top, 0), _maxKeyFrame);
			} else {
				window.scrollTo(0, top);
			}

			return _instance;
		};

		Skrollr.prototype.getScrollTop = function() {
			if(_isMobile) {
				return _mobileOffset;
			} else {
				return window.pageYOffset || documentElement.scrollTop || body.scrollTop || 0;
			}
		};

		Skrollr.prototype.getMaxScrollTop = function() {
			return _maxKeyFrame;
		};

		Skrollr.prototype.on = function(name, fn) {
			_listeners[name] = fn;

			return _instance;
		};

		Skrollr.prototype.off = function(name) {
			delete _listeners[name];

			return _instance;
		};

		Skrollr.prototype.destroy = function() {
			var cancelAnimFrame = polyfillCAF();
			cancelAnimFrame(_animFrame);
			_removeAllEvents();

			_updateClass(documentElement, [NO_SKROLLR_CLASS], [SKROLLR_CLASS, SKROLLR_DESKTOP_CLASS, SKROLLR_MOBILE_CLASS]);

			var skrollableIndex = 0;
			var skrollablesLength = _skrollables.length;

			for(; skrollableIndex < skrollablesLength; skrollableIndex++) {
				_reset(_skrollables[skrollableIndex].element);
			}

			documentElement.style.overflow = body.style.overflow = '';
			documentElement.style.height = body.style.height = '';

			if(_skrollrBody) {
				skrollr.setStyle(_skrollrBody, 'transform', 'none');
			}

			_instance = undefined;
			_skrollrBody = undefined;
			_listeners = undefined;
			_forceHeight = undefined;
			_maxKeyFrame = 0;
			_scale = 1;
			_constants = undefined;
			_mobileDeceleration = undefined;
			_direction = 'down';
			_lastTop = -1;
			_lastViewportWidth = 0;
			_lastViewportHeight = 0;
			_requestReflow = false;
			_scrollAnimation = undefined;
			_smoothScrollingEnabled = undefined;
			_smoothScrollingDuration = undefined;
			_smoothScrolling = undefined;
			_forceRender = undefined;
			_skrollableIdCounter = 0;
			_edgeStrategy = undefined;
			_isMobile = false;
			_mobileOffset = 0;
			_translateZ = undefined;
		};

		/*
			Private methods.
		*/

		var _initMobile = function() {
			var initialElement;
			var initialTouchY;
			var initialTouchX;
			var currentElement;
			var currentTouchY;
			var currentTouchX;
			var lastTouchY;
			var deltaY;

			var initialTouchTime;
			var currentTouchTime;
			var lastTouchTime;
			var deltaTime;

			_addEvent(documentElement, [EVENT_TOUCHSTART, EVENT_TOUCHMOVE, EVENT_TOUCHCANCEL, EVENT_TOUCHEND].join(' '), function(e) {
				var touch = e.changedTouches[0];

				currentElement = e.target;

				//We don't want text nodes.
				while(currentElement.nodeType === 3) {
					currentElement = currentElement.parentNode;
				}

				currentTouchY = touch.clientY;
				currentTouchX = touch.clientX;
				currentTouchTime = e.timeStamp;

				if(!rxTouchIgnoreTags.test(currentElement.tagName)) {
					e.preventDefault();
				}

				switch(e.type) {
					case EVENT_TOUCHSTART:
						//The last element we tapped on.
						if(initialElement) {
							initialElement.blur();
						}

						_instance.stopAnimateTo();

						initialElement = currentElement;

						initialTouchY = lastTouchY = currentTouchY;
						initialTouchX = currentTouchX;
						initialTouchTime = currentTouchTime;

						break;
					case EVENT_TOUCHMOVE:
						//Prevent default event on touchIgnore elements in case they don't have focus yet.
						if(rxTouchIgnoreTags.test(currentElement.tagName) && document.activeElement !== currentElement) {
							e.preventDefault();
						}

						deltaY = currentTouchY - lastTouchY;
						deltaTime = currentTouchTime - lastTouchTime;

						_instance.setScrollTop(_mobileOffset - deltaY, true);

						lastTouchY = currentTouchY;
						lastTouchTime = currentTouchTime;
						break;
					default:
					case EVENT_TOUCHCANCEL:
					case EVENT_TOUCHEND:
						var distanceY = initialTouchY - currentTouchY;
						var distanceX = initialTouchX - currentTouchX;
						var distance2 = distanceX * distanceX + distanceY * distanceY;

						//Check if it was more like a tap (moved less than 7px).
						if(distance2 < 49) {
							if(!rxTouchIgnoreTags.test(initialElement.tagName)) {
								initialElement.focus();

								//It was a tap, click the element.
								var clickEvent = document.createEvent('MouseEvents');
								clickEvent.initMouseEvent('click', true, true, e.view, 1, touch.screenX, touch.screenY, touch.clientX, touch.clientY, e.ctrlKey, e.altKey, e.shiftKey, e.metaKey, 0, null);
								initialElement.dispatchEvent(clickEvent);
							}

							return;
						}

						initialElement = undefined;

						var speed = deltaY / deltaTime;

						//Cap speed at 3 pixel/ms.
						speed = Math.max(Math.min(speed, 3), -3);

						var duration = Math.abs(speed / _mobileDeceleration);
						var targetOffset = speed * duration + 0.5 * _mobileDeceleration * duration * duration;
						var targetTop = _instance.getScrollTop() - targetOffset;

						//Relative duration change for when scrolling above bounds.
						var targetRatio = 0;

						//Change duration proportionally when scrolling would leave bounds.
						if(targetTop > _maxKeyFrame) {
							targetRatio = (_maxKeyFrame - targetTop) / targetOffset;

							targetTop = _maxKeyFrame;
						} else if(targetTop < 0) {
							targetRatio = -targetTop / targetOffset;

							targetTop = 0;
						}

						duration = duration * (1 - targetRatio);

						_instance.animateTo((targetTop + 0.5) | 0, {easing: 'outCubic', duration: duration});
						break;
				}
			});

			//Just in case there has already been some native scrolling, reset it.
			window.scrollTo(0, 0);
			documentElement.style.overflow = body.style.overflow = 'hidden';
		};

		/**
		 * Updates key frames which depend on others / need to be updated on resize.
		 * That is "end" in "absolute" mode and all key frames in "relative" mode.
		 * Also handles constants, because they may change on resize.
		 */
		var _updateDependentKeyFrames = function() {
			var viewportHeight = documentElement.clientHeight;
			var processedConstants = _processConstants();
			var skrollable;
			var element;
			var anchorTarget;
			var keyFrames;
			var keyFrameIndex;
			var keyFramesLength;
			var kf;
			var skrollableIndex;
			var skrollablesLength;
			var offset;
			var constantValue;

			//First process all relative-mode elements and find the max key frame.
			skrollableIndex = 0;
			skrollablesLength = _skrollables.length;

			for(; skrollableIndex < skrollablesLength; skrollableIndex++) {
				skrollable = _skrollables[skrollableIndex];
				element = skrollable.element;
				anchorTarget = skrollable.anchorTarget;
				keyFrames = skrollable.keyFrames;

				keyFrameIndex = 0;
				keyFramesLength = keyFrames.length;

				for(; keyFrameIndex < keyFramesLength; keyFrameIndex++) {
					kf = keyFrames[keyFrameIndex];

					offset = kf.offset;
					constantValue = processedConstants[kf.constant] || 0;

					kf.frame = offset;

					if(kf.isPercentage) {
						//Convert the offset to percentage of the viewport height.
						offset = offset * viewportHeight;

						//Absolute + percentage mode.
						kf.frame = offset;
					}

					if(kf.mode === 'relative') {
						_reset(element);

						kf.frame = _instance.relativeToAbsolute(anchorTarget, kf.anchors[0], kf.anchors[1]) - offset;

						_reset(element, true);
					}

					kf.frame += constantValue;

					//Only search for max key frame when forceHeight is enabled.
					if(_forceHeight) {
						//Find the max key frame, but don't use one of the data-end ones for comparison.
						if(!kf.isEnd && kf.frame > _maxKeyFrame) {
							_maxKeyFrame = kf.frame;
						}
					}
				}
			}

			//#133: The document can be larger than the maxKeyFrame we found.
			_maxKeyFrame = Math.max(_maxKeyFrame, _getDocumentHeight());

			//Now process all data-end keyframes.
			skrollableIndex = 0;
			skrollablesLength = _skrollables.length;

			for(; skrollableIndex < skrollablesLength; skrollableIndex++) {
				skrollable = _skrollables[skrollableIndex];
				keyFrames = skrollable.keyFrames;

				keyFrameIndex = 0;
				keyFramesLength = keyFrames.length;

				for(; keyFrameIndex < keyFramesLength; keyFrameIndex++) {
					kf = keyFrames[keyFrameIndex];

					constantValue = processedConstants[kf.constant] || 0;

					if(kf.isEnd) {
						kf.frame = _maxKeyFrame - kf.offset + constantValue;
					}
				}

				skrollable.keyFrames.sort(_keyFrameComparator);
			}
		};

		/**
		 * Calculates and sets the style properties for the element at the given frame.
		 * @param fakeFrame The frame to render at when smooth scrolling is enabled.
		 * @param actualFrame The actual frame we are at.
		 */
		var _calcSteps = function(fakeFrame, actualFrame) {
			//Iterate over all skrollables.
			var skrollableIndex = 0;
			var skrollablesLength = _skrollables.length;

			for(; skrollableIndex < skrollablesLength; skrollableIndex++) {
				var skrollable = _skrollables[skrollableIndex];
				var element = skrollable.element;
				var frame = skrollable.smoothScrolling ? fakeFrame : actualFrame;
				var frames = skrollable.keyFrames;
				var framesLength = frames.length;
				var firstFrame = frames[0];
				var lastFrame = frames[frames.length - 1];
				var beforeFirst = frame < firstFrame.frame;
				var afterLast = frame > lastFrame.frame;
				var firstOrLastFrame = beforeFirst ? firstFrame : lastFrame;
				var emitEvents = skrollable.emitEvents;
				var lastFrameIndex = skrollable.lastFrameIndex;
				var key;
				var value;

				//If we are before/after the first/last frame, set the styles according to the given edge strategy.
				if(beforeFirst || afterLast) {
					//Check if we already handled this edge case last time.
					//Note: using setScrollTop it's possible that we jumped from one edge to the other.
					if(beforeFirst && skrollable.edge === -1 || afterLast && skrollable.edge === 1) {
						continue;
					}

					//Add the skrollr-before or -after class.
					if(beforeFirst) {
						_updateClass(element, [SKROLLABLE_BEFORE_CLASS], [SKROLLABLE_AFTER_CLASS, SKROLLABLE_BETWEEN_CLASS]);

						//This handles the special case where we exit the first keyframe.
						if(emitEvents && lastFrameIndex > -1) {
							_emitEvent(element, firstFrame.eventType, _direction);
							skrollable.lastFrameIndex = -1;
						}
					} else {
						_updateClass(element, [SKROLLABLE_AFTER_CLASS], [SKROLLABLE_BEFORE_CLASS, SKROLLABLE_BETWEEN_CLASS]);

						//This handles the special case where we exit the last keyframe.
						if(emitEvents && lastFrameIndex < framesLength) {
							_emitEvent(element, lastFrame.eventType, _direction);
							skrollable.lastFrameIndex = framesLength;
						}
					}

					//Remember that we handled the edge case (before/after the first/last keyframe).
					skrollable.edge = beforeFirst ? -1 : 1;

					switch(skrollable.edgeStrategy) {
						case 'reset':
							_reset(element);
							continue;
						case 'ease':
							//Handle this case like it would be exactly at first/last keyframe and just pass it on.
							frame = firstOrLastFrame.frame;
							break;
						default:
						case 'set':
							var props = firstOrLastFrame.props;

							for(key in props) {
								if(hasProp.call(props, key)) {
									value = _interpolateString(props[key].value);

									//Set style or attribute.
									if(key.indexOf('@') === 0) {
										element.setAttribute(key.substr(1), value);
									} else {
										skrollr.setStyle(element, key, value);
									}
								}
							}

							continue;
					}
				} else {
					//Did we handle an edge last time?
					if(skrollable.edge !== 0) {
						_updateClass(element, [SKROLLABLE_CLASS, SKROLLABLE_BETWEEN_CLASS], [SKROLLABLE_BEFORE_CLASS, SKROLLABLE_AFTER_CLASS]);
						skrollable.edge = 0;
					}
				}

				//Find out between which two key frames we are right now.
				var keyFrameIndex = 0;

				for(; keyFrameIndex < framesLength - 1; keyFrameIndex++) {
					if(frame >= frames[keyFrameIndex].frame && frame <= frames[keyFrameIndex + 1].frame) {
						var left = frames[keyFrameIndex];
						var right = frames[keyFrameIndex + 1];

						for(key in left.props) {
							if(hasProp.call(left.props, key)) {
								var progress = (frame - left.frame) / (right.frame - left.frame);

								//Transform the current progress using the given easing function.
								progress = left.props[key].easing(progress);

								//Interpolate between the two values
								value = _calcInterpolation(left.props[key].value, right.props[key].value, progress);

								value = _interpolateString(value);

								//Set style or attribute.
								if(key.indexOf('@') === 0) {
									element.setAttribute(key.substr(1), value);
								} else {
									skrollr.setStyle(element, key, value);
								}
							}
						}

						//Are events enabled on this element?
						//This code handles the usual cases of scrolling through different keyframes.
						//The special cases of before first and after last keyframe are handled above.
						if(emitEvents) {
							//Did we pass a new keyframe?
							if(lastFrameIndex !== keyFrameIndex) {
								if(_direction === 'down') {
									_emitEvent(element, left.eventType, _direction);
								} else {
									_emitEvent(element, right.eventType, _direction);
								}

								skrollable.lastFrameIndex = keyFrameIndex;
							}
						}

						break;
					}
				}
			}
		};

		/**
		 * Renders all elements.
		 */
		var _render = function() {
			if(_requestReflow) {
				_requestReflow = false;
				_reflow();
			}

			//We may render something else than the actual scrollbar position.
			var renderTop = _instance.getScrollTop();

			//If there's an animation, which ends in current render call, call the callback after rendering.
			var afterAnimationCallback;
			var now = _now();
			var progress;

			//Before actually rendering handle the scroll animation, if any.
			if(_scrollAnimation) {
				//It's over
				if(now >= _scrollAnimation.endTime) {
					renderTop = _scrollAnimation.targetTop;
					afterAnimationCallback = _scrollAnimation.done;
					_scrollAnimation = undefined;
				} else {
					//Map the current progress to the new progress using given easing function.
					progress = _scrollAnimation.easing((now - _scrollAnimation.startTime) / _scrollAnimation.duration);

					renderTop = (_scrollAnimation.startTop + progress * _scrollAnimation.topDiff) | 0;
				}

				_instance.setScrollTop(renderTop, true);
			}
			//Smooth scrolling only if there's no animation running and if we're not forcing the rendering.
			else if(!_forceRender) {
				var smoothScrollingDiff = _smoothScrolling.targetTop - renderTop;

				//The user scrolled, start new smooth scrolling.
				if(smoothScrollingDiff) {
					_smoothScrolling = {
						startTop: _lastTop,
						topDiff: renderTop - _lastTop,
						targetTop: renderTop,
						startTime: _lastRenderCall,
						endTime: _lastRenderCall + _smoothScrollingDuration
					};
				}

				//Interpolate the internal scroll position (not the actual scrollbar).
				if(now <= _smoothScrolling.endTime) {
					//Map the current progress to the new progress using easing function.
					progress = easings.sqrt((now - _smoothScrolling.startTime) / _smoothScrollingDuration);

					renderTop = (_smoothScrolling.startTop + progress * _smoothScrolling.topDiff) | 0;
				}
			}

			//That's were we actually "scroll" on mobile.
			if(_isMobile && _skrollrBody) {
				//Set the transform ("scroll it").
				skrollr.setStyle(_skrollrBody, 'transform', 'translate(0, ' + -(_mobileOffset) + 'px) ' + _translateZ);
			}

			//Did the scroll position even change?
			if(_forceRender || _lastTop !== renderTop) {
				//Remember in which direction are we scrolling?
				_direction = (renderTop > _lastTop) ? 'down' : (renderTop < _lastTop ? 'up' : _direction);

				_forceRender = false;

				var listenerParams = {
					curTop: renderTop,
					lastTop: _lastTop,
					maxTop: _maxKeyFrame,
					direction: _direction
				};

				//Tell the listener we are about to render.
				var continueRendering = _listeners.beforerender && _listeners.beforerender.call(_instance, listenerParams);

				//The beforerender listener function is able the cancel rendering.
				if(continueRendering !== false) {
					//Now actually interpolate all the styles.
					_calcSteps(renderTop, _instance.getScrollTop());

					//Remember when we last rendered.
					_lastTop = renderTop;

					if(_listeners.render) {
						_listeners.render.call(_instance, listenerParams);
					}
				}

				if(afterAnimationCallback) {
					afterAnimationCallback.call(_instance, false);
				}
			}

			_lastRenderCall = now;
		};

		/**
		 * Parses the properties for each key frame of the given skrollable.
		 */
		var _parseProps = function(skrollable) {
			//Iterate over all key frames
			var keyFrameIndex = 0;
			var keyFramesLength = skrollable.keyFrames.length;

			for(; keyFrameIndex < keyFramesLength; keyFrameIndex++) {
				var frame = skrollable.keyFrames[keyFrameIndex];
				var easing;
				var value;
				var prop;
				var props = {};

				var match;

				while((match = rxPropValue.exec(frame.props)) !== null) {
					prop = match[1];
					value = match[2];

					easing = prop.match(rxPropEasing);

					//Is there an easing specified for this prop?
					if(easing !== null) {
						prop = easing[1];
						easing = easing[2];
					} else {
						easing = DEFAULT_EASING;
					}

					//Exclamation point at first position forces the value to be taken literal.
					value = value.indexOf('!') ? _parseProp(value) : [value.slice(1)];

					//Save the prop for this key frame with his value and easing function
					props[prop] = {
						value: value,
						easing: easings[easing]
					};
				}

				frame.props = props;
			}
		};

		/**
		 * Parses a value extracting numeric values and generating a format string
		 * for later interpolation of the new values in old string.
		 *
		 * @param val The CSS value to be parsed.
		 * @return Something like ["rgba(?%,?%, ?%,?)", 100, 50, 0, .7]
		 * where the first element is the format string later used
		 * and all following elements are the numeric value.
		 */
		var _parseProp = function(val) {
			var numbers = [];

			//One special case, where floats don't work.
			//We replace all occurences of rgba colors
			//which don't use percentage notation with the percentage notation.
			rxRGBAIntegerColor.lastIndex = 0;
			val = val.replace(rxRGBAIntegerColor, function(rgba) {
				return rgba.replace(rxNumericValue, function(n) {
					return n / 255 * 100 + '%';
				});
			});

			//Handle prefixing of "gradient" values.
			//For now only the prefixed value will be set. Unprefixed isn't supported anyway.
			if(theDashedCSSPrefix) {
				rxGradient.lastIndex = 0;
				val = val.replace(rxGradient, function(s) {
					return theDashedCSSPrefix + s;
				});
			}

			//Now parse ANY number inside this string and create a format string.
			val = val.replace(rxNumericValue, function(n) {
				numbers.push(+n);
				return '{?}';
			});

			//Add the formatstring as first value.
			numbers.unshift(val);

			return numbers;
		};

		/**
		 * Fills the key frames with missing left and right hand properties.
		 * If key frame 1 has property X and key frame 2 is missing X,
		 * but key frame 3 has X again, then we need to assign X to key frame 2 too.
		 *
		 * @param sk A skrollable.
		 */
		var _fillProps = function(sk) {
			//Will collect the properties key frame by key frame
			var propList = {};
			var keyFrameIndex;
			var keyFramesLength;

			//Iterate over all key frames from left to right
			keyFrameIndex = 0;
			keyFramesLength = sk.keyFrames.length;

			for(; keyFrameIndex < keyFramesLength; keyFrameIndex++) {
				_fillPropForFrame(sk.keyFrames[keyFrameIndex], propList);
			}

			//Now do the same from right to fill the last gaps

			propList = {};

			//Iterate over all key frames from right to left
			keyFrameIndex = sk.keyFrames.length - 1;

			for(; keyFrameIndex >= 0; keyFrameIndex--) {
				_fillPropForFrame(sk.keyFrames[keyFrameIndex], propList);
			}
		};

		var _fillPropForFrame = function(frame, propList) {
			var key;

			//For each key frame iterate over all right hand properties and assign them,
			//but only if the current key frame doesn't have the property by itself
			for(key in propList) {
				//The current frame misses this property, so assign it.
				if(!hasProp.call(frame.props, key)) {
					frame.props[key] = propList[key];
				}
			}

			//Iterate over all props of the current frame and collect them
			for(key in frame.props) {
				propList[key] = frame.props[key];
			}
		};

		/**
		 * Calculates the new values for two given values array.
		 */
		var _calcInterpolation = function(val1, val2, progress) {
			var valueIndex;
			var val1Length = val1.length;

			//They both need to have the same length
			if(val1Length !== val2.length) {
				throw 'Can\'t interpolate between "' + val1[0] + '" and "' + val2[0] + '"';
			}

			//Add the format string as first element.
			var interpolated = [val1[0]];

			valueIndex = 1;

			for(; valueIndex < val1Length; valueIndex++) {
				//That's the line where the two numbers are actually interpolated.
				interpolated[valueIndex] = val1[valueIndex] + ((val2[valueIndex] - val1[valueIndex]) * progress);
			}

			return interpolated;
		};

		/**
		 * Interpolates the numeric values into the format string.
		 */
		var _interpolateString = function(val) {
			var valueIndex = 1;

			rxInterpolateString.lastIndex = 0;

			return val[0].replace(rxInterpolateString, function() {
				return val[valueIndex++];
			});
		};

		/**
		 * Resets the class and style attribute to what it was before skrollr manipulated the element.
		 * Also remembers the values it had before reseting, in order to undo the reset.
		 */
		var _reset = function(elements, undo) {
			//We accept a single element or an array of elements.
			elements = [].concat(elements);

			var skrollable;
			var element;
			var elementsIndex = 0;
			var elementsLength = elements.length;

			for(; elementsIndex < elementsLength; elementsIndex++) {
				element = elements[elementsIndex];
				skrollable = _skrollables[element[SKROLLABLE_ID_DOM_PROPERTY]];

				//Couldn't find the skrollable for this DOM element.
				if(!skrollable) {
					continue;
				}

				if(undo) {
					//Reset class and style to the "dirty" (set by skrollr) values.
					element.style.cssText = skrollable.dirtyStyleAttr;
					_updateClass(element, skrollable.dirtyClassAttr);
				} else {
					//Remember the "dirty" (set by skrollr) class and style.
					skrollable.dirtyStyleAttr = element.style.cssText;
					skrollable.dirtyClassAttr = _getClass(element);

					//Reset class and style to what it originally was.
					element.style.cssText = skrollable.styleAttr;
					_updateClass(element, skrollable.classAttr);
				}
			}
		};

		/**
		 * Detects support for 3d transforms by applying it to the skrollr-body.
		 */
		var _detect3DTransforms = function() {
			_translateZ = 'translateZ(0)';
			skrollr.setStyle(_skrollrBody, 'transform', _translateZ);

			var computedStyle = getStyle(_skrollrBody);
			var computedTransform = computedStyle.getPropertyValue('transform');
			var computedTransformWithPrefix = computedStyle.getPropertyValue(theDashedCSSPrefix + 'transform');
			var has3D = (computedTransform && computedTransform !== 'none') || (computedTransformWithPrefix && computedTransformWithPrefix !== 'none');

			if(!has3D) {
				_translateZ = '';
			}
		};

		/**
		 * Set the CSS property on the given element. Sets prefixed properties as well.
		 */
		skrollr.setStyle = function(el, prop, val) {
			var style = el.style;

			//Camel case.
			prop = prop.replace(rxCamelCase, rxCamelCaseFn).replace('-', '');

			//Make sure z-index gets a <integer>.
			//This is the only <integer> case we need to handle.
			if(prop === 'zIndex') {
				if(isNaN(val)) {
					//If it's not a number, don't touch it.
					//It could for example be "auto" (#351).
					style[prop] = val;
				} else {
					//Floor the number.
					style[prop] = '' + (val | 0);
				}
			}
			//#64: "float" can't be set across browsers. Needs to use "cssFloat" for all except IE.
			else if(prop === 'float') {
				style.styleFloat = style.cssFloat = val;
			}
			else {
				//Need try-catch for old IE.
				try {
					//Set prefixed property if there's a prefix.
					if(theCSSPrefix) {
						style[theCSSPrefix + prop.slice(0,1).toUpperCase() + prop.slice(1)] = val;
					}

					//Set unprefixed.
					style[prop] = val;
				} catch(ignore) {}
			}
		};

		/**
		 * Cross browser event handling.
		 */
		var _addEvent = skrollr.addEvent = function(element, names, callback) {
			var intermediate = function(e) {
				//Normalize IE event stuff.
				e = e || window.event;

				if(!e.target) {
					e.target = e.srcElement;
				}

				if(!e.preventDefault) {
					e.preventDefault = function() {
						e.returnValue = false;
						e.defaultPrevented = true;
					};
				}

				return callback.call(this, e);
			};

			names = names.split(' ');

			var name;
			var nameCounter = 0;
			var namesLength = names.length;

			for(; nameCounter < namesLength; nameCounter++) {
				name = names[nameCounter];

				if(element.addEventListener) {
					element.addEventListener(name, callback, false);
				} else {
					element.attachEvent('on' + name, intermediate);
				}

				//Remember the events to be able to flush them later.
				_registeredEvents.push({
					element: element,
					name: name,
					listener: callback
				});
			}
		};

		var _removeEvent = skrollr.removeEvent = function(element, names, callback) {
			names = names.split(' ');

			var nameCounter = 0;
			var namesLength = names.length;

			for(; nameCounter < namesLength; nameCounter++) {
				if(element.removeEventListener) {
					element.removeEventListener(names[nameCounter], callback, false);
				} else {
					element.detachEvent('on' + names[nameCounter], callback);
				}
			}
		};

		var _removeAllEvents = function() {
			var eventData;
			var eventCounter = 0;
			var eventsLength = _registeredEvents.length;

			for(; eventCounter < eventsLength; eventCounter++) {
				eventData = _registeredEvents[eventCounter];

				_removeEvent(eventData.element, eventData.name, eventData.listener);
			}

			_registeredEvents = [];
		};

		var _emitEvent = function(element, name, direction) {
			if(_listeners.keyframe) {
				_listeners.keyframe.call(_instance, element, name, direction);
			}
		};

		var _reflow = function() {
			var pos = _instance.getScrollTop();

			//Will be recalculated by _updateDependentKeyFrames.
			_maxKeyFrame = 0;

			if(_forceHeight && !_isMobile) {
				//un-"force" the height to not mess with the calculations in _updateDependentKeyFrames (#216).
				body.style.height = '';
			}

			_updateDependentKeyFrames();

			if(_forceHeight && !_isMobile) {
				//"force" the height.
				body.style.height = (_maxKeyFrame + documentElement.clientHeight) + 'px';
			}

			//The scroll offset may now be larger than needed (on desktop the browser/os prevents scrolling farther than the bottom).
			if(_isMobile) {
				_instance.setScrollTop(Math.min(_instance.getScrollTop(), _maxKeyFrame));
			} else {
				//Remember and reset the scroll pos (#217).
				_instance.setScrollTop(pos, true);
			}

			_forceRender = true;
		};

		/*
		 * Returns a copy of the constants object where all functions and strings have been evaluated.
		 */
		var _processConstants = function() {
			var viewportHeight = documentElement.clientHeight;
			var copy = {};
			var prop;
			var value;

			for(prop in _constants) {
				value = _constants[prop];

				if(typeof value === 'function') {
					value = value.call(_instance);
				}
				//Percentage offset.
				else if((/p$/).test(value)) {
					value = (value.slice(0, -1) / 100) * viewportHeight;
				}

				copy[prop] = value;
			}

			return copy;
		};

		/*
		 * Returns the height of the document.
		 */
		var _getDocumentHeight = function() {
			var skrollrBodyHeight = (_skrollrBody && _skrollrBody.offsetHeight || 0);
			var bodyHeight = Math.max(skrollrBodyHeight, body.scrollHeight, body.offsetHeight, documentElement.scrollHeight, documentElement.offsetHeight, documentElement.clientHeight);

			return bodyHeight - documentElement.clientHeight;
		};

		/**
		 * Returns a string of space separated classnames for the current element.
		 * Works with SVG as well.
		 */
		var _getClass = function(element) {
			var prop = 'className';

			//SVG support by using className.baseVal instead of just className.
			if(window.SVGElement && element instanceof window.SVGElement) {
				element = element[prop];
				prop = 'baseVal';
			}

			return element[prop];
		};

		/**
		 * Adds and removes a CSS classes.
		 * Works with SVG as well.
		 * add and remove are arrays of strings,
		 * or if remove is ommited add is a string and overwrites all classes.
		 */
		var _updateClass = function(element, add, remove) {
			var prop = 'className';

			//SVG support by using className.baseVal instead of just className.
			if(window.SVGElement && element instanceof window.SVGElement) {
				element = element[prop];
				prop = 'baseVal';
			}

			//When remove is ommited, we want to overwrite/set the classes.
			if(remove === undefined) {
				element[prop] = add;
				return;
			}

			//Cache current classes. We will work on a string before passing back to DOM.
			var val = element[prop];

			//All classes to be removed.
			var classRemoveIndex = 0;
			var removeLength = remove.length;

			for(; classRemoveIndex < removeLength; classRemoveIndex++) {
				val = _untrim(val).replace(_untrim(remove[classRemoveIndex]), ' ');
			}

			val = _trim(val);

			//All classes to be added.
			var classAddIndex = 0;
			var addLength = add.length;

			for(; classAddIndex < addLength; classAddIndex++) {
				//Only add if el not already has class.
				if(_untrim(val).indexOf(_untrim(add[classAddIndex])) === -1) {
					val += ' ' + add[classAddIndex];
				}
			}

			element[prop] = _trim(val);
		};

		var _trim = function(a) {
			return a.replace(rxTrim, '');
		};

		/**
		 * Adds a space before and after the string.
		 */
		var _untrim = function(a) {
			return ' ' + a + ' ';
		};

		var _now = Date.now || function() {
			return +new Date();
		};

		var _keyFrameComparator = function(a, b) {
			return a.frame - b.frame;
		};

		/*
		 * Private variables.
		 */

		//Singleton
		var _instance;

		/*
			A list of all elements which should be animated associated with their the metadata.
			Exmaple skrollable with two key frames animating from 100px width to 20px:

			skrollable = {
				element: <the DOM element>,
				styleAttr: <style attribute of the element before skrollr>,
				classAttr: <class attribute of the element before skrollr>,
				keyFrames: [
					{
						frame: 100,
						props: {
							width: {
								value: ['{?}px', 100],
								easing: <reference to easing function>
							}
						},
						mode: "absolute"
					},
					{
						frame: 200,
						props: {
							width: {
								value: ['{?}px', 20],
								easing: <reference to easing function>
							}
						},
						mode: "absolute"
					}
				]
			};
		*/
		var _skrollables;

		var _skrollrBody;

		var _listeners;
		var _forceHeight;
		var _maxKeyFrame = 0;

		var _scale = 1;
		var _constants;

		var _mobileDeceleration;

		//Current direction (up/down).
		var _direction = 'down';

		//The last top offset value. Needed to determine direction.
		var _lastTop = -1;

		//The last time we called the render method (doesn't mean we rendered!).
		var _lastRenderCall = _now();

		//For detecting if it actually resized (#271).
		var _lastViewportWidth = 0;
		var _lastViewportHeight = 0;

		var _requestReflow = false;

		//Will contain data about a running scrollbar animation, if any.
		var _scrollAnimation;

		var _smoothScrollingEnabled;

		var _smoothScrollingDuration;

		//Will contain settins for smooth scrolling if enabled.
		var _smoothScrolling;

		//Can be set by any operation/event to force rendering even if the scrollbar didn't move.
		var _forceRender;

		//Each skrollable gets an unique ID incremented for each skrollable.
		//The ID is the index in the _skrollables array.
		var _skrollableIdCounter = 0;

		var _edgeStrategy;


		//Mobile specific vars. Will be stripped by UglifyJS when not in use.
		var _isMobile = false;

		//The virtual scroll offset when using mobile scrolling.
		var _mobileOffset = 0;

		//If the browser supports 3d transforms, this will be filled with 'translateZ(0)' (empty string otherwise).
		var _translateZ;

		//Will contain data about registered events by skrollr.
		var _registeredEvents = [];

		//Animation frame id returned by RequestAnimationFrame (or timeout when RAF is not supported).
		var _animFrame;

		//Expose skrollr as either a global variable or a require.js module
		if(typeof define === 'function' && define.amd) {
			define('skrollr', function () {
				return skrollr;
			});
		} else if (typeof module !== 'undefined' && module.exports) {
			module.exports = skrollr;
		} else {
			window.skrollr = skrollr;
		}

	}(window, document));



// Magnific Popup v0.9.9 by Dmitry Semenov
// http://bit.ly/magnific-popup#build=inline+image+gallery+retina+imagezoom+fastclick
(function(a){var b="Close",c="BeforeClose",d="AfterClose",e="BeforeAppend",f="MarkupParse",g="Open",h="Change",i="mfp",j="."+i,k="mfp-ready",l="mfp-removing",m="mfp-prevent-close",n,o=function(){},p=!!window.jQuery,q,r=a(window),s,t,u,v,w,x=function(a,b){n.ev.on(i+a+j,b)},y=function(b,c,d,e){var f=document.createElement("div");return f.className="mfp-"+b,d&&(f.innerHTML=d),e?c&&c.appendChild(f):(f=a(f),c&&f.appendTo(c)),f},z=function(b,c){n.ev.triggerHandler(i+b,c),n.st.callbacks&&(b=b.charAt(0).toLowerCase()+b.slice(1),n.st.callbacks[b]&&n.st.callbacks[b].apply(n,a.isArray(c)?c:[c]))},A=function(b){if(b!==w||!n.currTemplate.closeBtn)n.currTemplate.closeBtn=a(n.st.closeMarkup.replace("%title%",n.st.tClose)),w=b;return n.currTemplate.closeBtn},B=function(){a.magnificPopup.instance||(n=new o,n.init(),a.magnificPopup.instance=n)},C=function(){var a=document.createElement("p").style,b=["ms","O","Moz","Webkit"];if(a.transition!==undefined)return!0;while(b.length)if(b.pop()+"Transition"in a)return!0;return!1};o.prototype={constructor:o,init:function(){var b=navigator.appVersion;n.isIE7=b.indexOf("MSIE 7.")!==-1,n.isIE8=b.indexOf("MSIE 8.")!==-1,n.isLowIE=n.isIE7||n.isIE8,n.isAndroid=/android/gi.test(b),n.isIOS=/iphone|ipad|ipod/gi.test(b),n.supportsTransition=C(),n.probablyMobile=n.isAndroid||n.isIOS||/(Opera Mini)|Kindle|webOS|BlackBerry|(Opera Mobi)|(Windows Phone)|IEMobile/i.test(navigator.userAgent),t=a(document),n.popupsCache={}},open:function(b){s||(s=a(document.body));var c;if(b.isObj===!1){n.items=b.items.toArray(),n.index=0;var d=b.items,e;for(c=0;c<d.length;c++){e=d[c],e.parsed&&(e=e.el[0]);if(e===b.el[0]){n.index=c;break}}}else n.items=a.isArray(b.items)?b.items:[b.items],n.index=b.index||0;if(n.isOpen){n.updateItemHTML();return}n.types=[],v="",b.mainEl&&b.mainEl.length?n.ev=b.mainEl.eq(0):n.ev=t,b.key?(n.popupsCache[b.key]||(n.popupsCache[b.key]={}),n.currTemplate=n.popupsCache[b.key]):n.currTemplate={},n.st=a.extend(!0,{},a.magnificPopup.defaults,b),n.fixedContentPos=n.st.fixedContentPos==="auto"?!n.probablyMobile:n.st.fixedContentPos,n.st.modal&&(n.st.closeOnContentClick=!1,n.st.closeOnBgClick=!1,n.st.showCloseBtn=!1,n.st.enableEscapeKey=!1),n.bgOverlay||(n.bgOverlay=y("bg").on("click"+j,function(){n.close()}),n.wrap=y("wrap").attr("tabindex",-1).on("click"+j,function(a){n._checkIfClose(a.target)&&n.close()}),n.container=y("container",n.wrap)),n.contentContainer=y("content"),n.st.preloader&&(n.preloader=y("preloader",n.container,n.st.tLoading));var h=a.magnificPopup.modules;for(c=0;c<h.length;c++){var i=h[c];i=i.charAt(0).toUpperCase()+i.slice(1),n["init"+i].call(n)}z("BeforeOpen"),n.st.showCloseBtn&&(n.st.closeBtnInside?(x(f,function(a,b,c,d){c.close_replaceWith=A(d.type)}),v+=" mfp-close-btn-in"):n.wrap.append(A())),n.st.alignTop&&(v+=" mfp-align-top"),n.fixedContentPos?n.wrap.css({overflow:n.st.overflowY,overflowX:"hidden",overflowY:n.st.overflowY}):n.wrap.css({top:r.scrollTop(),position:"absolute"}),(n.st.fixedBgPos===!1||n.st.fixedBgPos==="auto"&&!n.fixedContentPos)&&n.bgOverlay.css({height:t.height(),position:"absolute"}),n.st.enableEscapeKey&&t.on("keyup"+j,function(a){a.keyCode===27&&n.close()}),r.on("resize"+j,function(){n.updateSize()}),n.st.closeOnContentClick||(v+=" mfp-auto-cursor"),v&&n.wrap.addClass(v);var l=n.wH=r.height(),m={};if(n.fixedContentPos&&n._hasScrollBar(l)){var o=n._getScrollbarSize();o&&(m.marginRight=o)}n.fixedContentPos&&(n.isIE7?a("body, html").css("overflow","hidden"):m.overflow="hidden");var p=n.st.mainClass;return n.isIE7&&(p+=" mfp-ie7"),p&&n._addClassToMFP(p),n.updateItemHTML(),z("BuildControls"),a("html").css(m),n.bgOverlay.add(n.wrap).prependTo(n.st.prependTo||s),n._lastFocusedEl=document.activeElement,setTimeout(function(){n.content?(n._addClassToMFP(k),n._setFocus()):n.bgOverlay.addClass(k),t.on("focusin"+j,n._onFocusIn)},16),n.isOpen=!0,n.updateSize(l),z(g),b},close:function(){if(!n.isOpen)return;z(c),n.isOpen=!1,n.st.removalDelay&&!n.isLowIE&&n.supportsTransition?(n._addClassToMFP(l),setTimeout(function(){n._close()},n.st.removalDelay)):n._close()},_close:function(){z(b);var c=l+" "+k+" ";n.bgOverlay.detach(),n.wrap.detach(),n.container.empty(),n.st.mainClass&&(c+=n.st.mainClass+" "),n._removeClassFromMFP(c);if(n.fixedContentPos){var e={marginRight:""};n.isIE7?a("body, html").css("overflow",""):e.overflow="",a("html").css(e)}t.off("keyup"+j+" focusin"+j),n.ev.off(j),n.wrap.attr("class","mfp-wrap").removeAttr("style"),n.bgOverlay.attr("class","mfp-bg"),n.container.attr("class","mfp-container"),n.st.showCloseBtn&&(!n.st.closeBtnInside||n.currTemplate[n.currItem.type]===!0)&&n.currTemplate.closeBtn&&n.currTemplate.closeBtn.detach(),n._lastFocusedEl&&a(n._lastFocusedEl).focus(),n.currItem=null,n.content=null,n.currTemplate=null,n.prevHeight=0,z(d)},updateSize:function(a){if(n.isIOS){var b=document.documentElement.clientWidth/window.innerWidth,c=window.innerHeight*b;n.wrap.css("height",c),n.wH=c}else n.wH=a||r.height();n.fixedContentPos||n.wrap.css("height",n.wH),z("Resize")},updateItemHTML:function(){var b=n.items[n.index];n.contentContainer.detach(),n.content&&n.content.detach(),b.parsed||(b=n.parseEl(n.index));var c=b.type;z("BeforeChange",[n.currItem?n.currItem.type:"",c]),n.currItem=b;if(!n.currTemplate[c]){var d=n.st[c]?n.st[c].markup:!1;z("FirstMarkupParse",d),d?n.currTemplate[c]=a(d):n.currTemplate[c]=!0}u&&u!==b.type&&n.container.removeClass("mfp-"+u+"-holder");var e=n["get"+c.charAt(0).toUpperCase()+c.slice(1)](b,n.currTemplate[c]);n.appendContent(e,c),b.preloaded=!0,z(h,b),u=b.type,n.container.prepend(n.contentContainer),z("AfterChange")},appendContent:function(a,b){n.content=a,a?n.st.showCloseBtn&&n.st.closeBtnInside&&n.currTemplate[b]===!0?n.content.find(".mfp-close").length||n.content.append(A()):n.content=a:n.content="",z(e),n.container.addClass("mfp-"+b+"-holder"),n.contentContainer.append(n.content)},parseEl:function(b){var c=n.items[b],d;c.tagName?c={el:a(c)}:(d=c.type,c={data:c,src:c.src});if(c.el){var e=n.types;for(var f=0;f<e.length;f++)if(c.el.hasClass("mfp-"+e[f])){d=e[f];break}c.src=c.el.attr("data-mfp-src"),c.src||(c.src=c.el.attr("href"))}return c.type=d||n.st.type||"inline",c.index=b,c.parsed=!0,n.items[b]=c,z("ElementParse",c),n.items[b]},addGroup:function(a,b){var c=function(c){c.mfpEl=this,n._openClick(c,a,b)};b||(b={});var d="click.magnificPopup";b.mainEl=a,b.items?(b.isObj=!0,a.off(d).on(d,c)):(b.isObj=!1,b.delegate?a.off(d).on(d,b.delegate,c):(b.items=a,a.off(d).on(d,c)))},_openClick:function(b,c,d){var e=d.midClick!==undefined?d.midClick:a.magnificPopup.defaults.midClick;if(!e&&(b.which===2||b.ctrlKey||b.metaKey))return;var f=d.disableOn!==undefined?d.disableOn:a.magnificPopup.defaults.disableOn;if(f)if(a.isFunction(f)){if(!f.call(n))return!0}else if(r.width()<f)return!0;b.type&&(b.preventDefault(),n.isOpen&&b.stopPropagation()),d.el=a(b.mfpEl),d.delegate&&(d.items=c.find(d.delegate)),n.open(d)},updateStatus:function(a,b){if(n.preloader){q!==a&&n.container.removeClass("mfp-s-"+q),!b&&a==="loading"&&(b=n.st.tLoading);var c={status:a,text:b};z("UpdateStatus",c),a=c.status,b=c.text,n.preloader.html(b),n.preloader.find("a").on("click",function(a){a.stopImmediatePropagation()}),n.container.addClass("mfp-s-"+a),q=a}},_checkIfClose:function(b){if(a(b).hasClass(m))return;var c=n.st.closeOnContentClick,d=n.st.closeOnBgClick;if(c&&d)return!0;if(!n.content||a(b).hasClass("mfp-close")||n.preloader&&b===n.preloader[0])return!0;if(b!==n.content[0]&&!a.contains(n.content[0],b)){if(d&&a.contains(document,b))return!0}else if(c)return!0;return!1},_addClassToMFP:function(a){n.bgOverlay.addClass(a),n.wrap.addClass(a)},_removeClassFromMFP:function(a){this.bgOverlay.removeClass(a),n.wrap.removeClass(a)},_hasScrollBar:function(a){return(n.isIE7?t.height():document.body.scrollHeight)>(a||r.height())},_setFocus:function(){(n.st.focus?n.content.find(n.st.focus).eq(0):n.wrap).focus()},_onFocusIn:function(b){if(b.target!==n.wrap[0]&&!a.contains(n.wrap[0],b.target))return n._setFocus(),!1},_parseMarkup:function(b,c,d){var e;d.data&&(c=a.extend(d.data,c)),z(f,[b,c,d]),a.each(c,function(a,c){if(c===undefined||c===!1)return!0;e=a.split("_");if(e.length>1){var d=b.find(j+"-"+e[0]);if(d.length>0){var f=e[1];f==="replaceWith"?d[0]!==c[0]&&d.replaceWith(c):f==="img"?d.is("img")?d.attr("src",c):d.replaceWith('<img src="'+c+'" class="'+d.attr("class")+'" />'):d.attr(e[1],c)}}else b.find(j+"-"+a).html(c)})},_getScrollbarSize:function(){if(n.scrollbarSize===undefined){var a=document.createElement("div");a.id="mfp-sbm",a.style.cssText="width: 99px; height: 99px; overflow: scroll; position: absolute; top: -9999px;",document.body.appendChild(a),n.scrollbarSize=a.offsetWidth-a.clientWidth,document.body.removeChild(a)}return n.scrollbarSize}},a.magnificPopup={instance:null,proto:o.prototype,modules:[],open:function(b,c){return B(),b?b=a.extend(!0,{},b):b={},b.isObj=!0,b.index=c||0,this.instance.open(b)},close:function(){return a.magnificPopup.instance&&a.magnificPopup.instance.close()},registerModule:function(b,c){c.options&&(a.magnificPopup.defaults[b]=c.options),a.extend(this.proto,c.proto),this.modules.push(b)},defaults:{disableOn:0,key:null,midClick:!1,mainClass:"",preloader:!0,focus:"",closeOnContentClick:!1,closeOnBgClick:!0,closeBtnInside:!0,showCloseBtn:!0,enableEscapeKey:!0,modal:!1,alignTop:!1,removalDelay:0,prependTo:null,fixedContentPos:"auto",fixedBgPos:"auto",overflowY:"auto",closeMarkup:'<button title="%title%" type="button" class="mfp-close">&times;</button>',tClose:"Close (Esc)",tLoading:"Loading..."}},a.fn.magnificPopup=function(b){B();var c=a(this);if(typeof b=="string")if(b==="open"){var d,e=p?c.data("magnificPopup"):c[0].magnificPopup,f=parseInt(arguments[1],10)||0;e.items?d=e.items[f]:(d=c,e.delegate&&(d=d.find(e.delegate)),d=d.eq(f)),n._openClick({mfpEl:d},c,e)}else n.isOpen&&n[b].apply(n,Array.prototype.slice.call(arguments,1));else b=a.extend(!0,{},b),p?c.data("magnificPopup",b):c[0].magnificPopup=b,n.addGroup(c,b);return c};var D="inline",E,F,G,H=function(){G&&(F.after(G.addClass(E)).detach(),G=null)};a.magnificPopup.registerModule(D,{options:{hiddenClass:"hide",markup:"",tNotFound:"Content not found"},proto:{initInline:function(){n.types.push(D),x(b+"."+D,function(){H()})},getInline:function(b,c){H();if(b.src){var d=n.st.inline,e=a(b.src);if(e.length){var f=e[0].parentNode;f&&f.tagName&&(F||(E=d.hiddenClass,F=y(E),E="mfp-"+E),G=e.after(F).detach().removeClass(E)),n.updateStatus("ready")}else n.updateStatus("error",d.tNotFound),e=a("<div>");return b.inlineElement=e,e}return n.updateStatus("ready"),n._parseMarkup(c,{},b),c}}});var I,J=function(b){if(b.data&&b.data.title!==undefined)return b.data.title;var c=n.st.image.titleSrc;if(c){if(a.isFunction(c))return c.call(n,b);if(b.el)return b.el.attr(c)||""}return""};a.magnificPopup.registerModule("image",{options:{markup:'<div class="mfp-figure"><div class="mfp-close"></div><figure><div class="mfp-img"></div><figcaption><div class="mfp-bottom-bar"><div class="mfp-title"></div><div class="mfp-counter"></div></div></figcaption></figure></div>',cursor:"mfp-zoom-out-cur",titleSrc:"title",verticalFit:!0,tError:'<a href="%url%">The image</a> could not be loaded.'},proto:{initImage:function(){var a=n.st.image,c=".image";n.types.push("image"),x(g+c,function(){n.currItem.type==="image"&&a.cursor&&s.addClass(a.cursor)}),x(b+c,function(){a.cursor&&s.removeClass(a.cursor),r.off("resize"+j)}),x("Resize"+c,n.resizeImage),n.isLowIE&&x("AfterChange",n.resizeImage)},resizeImage:function(){var a=n.currItem;if(!a||!a.img)return;if(n.st.image.verticalFit){var b=0;n.isLowIE&&(b=parseInt(a.img.css("padding-top"),10)+parseInt(a.img.css("padding-bottom"),10)),a.img.css("max-height",n.wH-b)}},_onImageHasSize:function(a){a.img&&(a.hasSize=!0,I&&clearInterval(I),a.isCheckingImgSize=!1,z("ImageHasSize",a),a.imgHidden&&(n.content&&n.content.removeClass("mfp-loading"),a.imgHidden=!1))},findImageSize:function(a){var b=0,c=a.img[0],d=function(e){I&&clearInterval(I),I=setInterval(function(){if(c.naturalWidth>0){n._onImageHasSize(a);return}b>200&&clearInterval(I),b++,b===3?d(10):b===40?d(50):b===100&&d(500)},e)};d(1)},getImage:function(b,c){var d=0,e=function(){b&&(b.img[0].complete?(b.img.off(".mfploader"),b===n.currItem&&(n._onImageHasSize(b),n.updateStatus("ready")),b.hasSize=!0,b.loaded=!0,z("ImageLoadComplete")):(d++,d<200?setTimeout(e,100):f()))},f=function(){b&&(b.img.off(".mfploader"),b===n.currItem&&(n._onImageHasSize(b),n.updateStatus("error",g.tError.replace("%url%",b.src))),b.hasSize=!0,b.loaded=!0,b.loadError=!0)},g=n.st.image,h=c.find(".mfp-img");if(h.length){var i=document.createElement("img");i.className="mfp-img",b.img=a(i).on("load.mfploader",e).on("error.mfploader",f),i.src=b.src,h.is("img")&&(b.img=b.img.clone()),i=b.img[0],i.naturalWidth>0?b.hasSize=!0:i.width||(b.hasSize=!1)}return n._parseMarkup(c,{title:J(b),img_replaceWith:b.img},b),n.resizeImage(),b.hasSize?(I&&clearInterval(I),b.loadError?(c.addClass("mfp-loading"),n.updateStatus("error",g.tError.replace("%url%",b.src))):(c.removeClass("mfp-loading"),n.updateStatus("ready")),c):(n.updateStatus("loading"),b.loading=!0,b.hasSize||(b.imgHidden=!0,c.addClass("mfp-loading"),n.findImageSize(b)),c)}}});var K,L=function(){return K===undefined&&(K=document.createElement("p").style.MozTransform!==undefined),K};a.magnificPopup.registerModule("zoom",{options:{enabled:!1,easing:"ease-in-out",duration:300,opener:function(a){return a.is("img")?a:a.find("img")}},proto:{initZoom:function(){var a=n.st.zoom,d=".zoom",e;if(!a.enabled||!n.supportsTransition)return;var f=a.duration,g=function(b){var c=b.clone().removeAttr("style").removeAttr("class").addClass("mfp-animated-image"),d="all "+a.duration/1e3+"s "+a.easing,e={position:"fixed",zIndex:9999,left:0,top:0,"-webkit-backface-visibility":"hidden"},f="transition";return e["-webkit-"+f]=e["-moz-"+f]=e["-o-"+f]=e[f]=d,c.css(e),c},h=function(){n.content.css("visibility","visible")},i,j;x("BuildControls"+d,function(){if(n._allowZoom()){clearTimeout(i),n.content.css("visibility","hidden"),e=n._getItemToZoom();if(!e){h();return}j=g(e),j.css(n._getOffset()),n.wrap.append(j),i=setTimeout(function(){j.css(n._getOffset(!0)),i=setTimeout(function(){h(),setTimeout(function(){j.remove(),e=j=null,z("ZoomAnimationEnded")},16)},f)},16)}}),x(c+d,function(){if(n._allowZoom()){clearTimeout(i),n.st.removalDelay=f;if(!e){e=n._getItemToZoom();if(!e)return;j=g(e)}j.css(n._getOffset(!0)),n.wrap.append(j),n.content.css("visibility","hidden"),setTimeout(function(){j.css(n._getOffset())},16)}}),x(b+d,function(){n._allowZoom()&&(h(),j&&j.remove(),e=null)})},_allowZoom:function(){return n.currItem.type==="image"},_getItemToZoom:function(){return n.currItem.hasSize?n.currItem.img:!1},_getOffset:function(b){var c;b?c=n.currItem.img:c=n.st.zoom.opener(n.currItem.el||n.currItem);var d=c.offset(),e=parseInt(c.css("padding-top"),10),f=parseInt(c.css("padding-bottom"),10);d.top-=a(window).scrollTop()-e;var g={width:c.width(),height:(p?c.innerHeight():c[0].offsetHeight)-f-e};return L()?g["-moz-transform"]=g.transform="translate("+d.left+"px,"+d.top+"px)":(g.left=d.left,g.top=d.top),g}}});var M=function(a){var b=n.items.length;return a>b-1?a-b:a<0?b+a:a},N=function(a,b,c){return a.replace(/%curr%/gi,b+1).replace(/%total%/gi,c)};a.magnificPopup.registerModule("gallery",{options:{enabled:!1,arrowMarkup:'<button title="%title%" type="button" class="mfp-arrow mfp-arrow-%dir%"></button>',preload:[0,2],navigateByImgClick:!0,arrows:!0,tPrev:"Previous (Left arrow key)",tNext:"Next (Right arrow key)",tCounter:"%curr% of %total%"},proto:{initGallery:function(){var c=n.st.gallery,d=".mfp-gallery",e=Boolean(a.fn.mfpFastClick);n.direction=!0;if(!c||!c.enabled)return!1;v+=" mfp-gallery",x(g+d,function(){c.navigateByImgClick&&n.wrap.on("click"+d,".mfp-img",function(){if(n.items.length>1)return n.next(),!1}),t.on("keydown"+d,function(a){a.keyCode===37?n.prev():a.keyCode===39&&n.next()})}),x("UpdateStatus"+d,function(a,b){b.text&&(b.text=N(b.text,n.currItem.index,n.items.length))}),x(f+d,function(a,b,d,e){var f=n.items.length;d.counter=f>1?N(c.tCounter,e.index,f):""}),x("BuildControls"+d,function(){if(n.items.length>1&&c.arrows&&!n.arrowLeft){var b=c.arrowMarkup,d=n.arrowLeft=a(b.replace(/%title%/gi,c.tPrev).replace(/%dir%/gi,"left")).addClass(m),f=n.arrowRight=a(b.replace(/%title%/gi,c.tNext).replace(/%dir%/gi,"right")).addClass(m),g=e?"mfpFastClick":"click";d[g](function(){n.prev()}),f[g](function(){n.next()}),n.isIE7&&(y("b",d[0],!1,!0),y("a",d[0],!1,!0),y("b",f[0],!1,!0),y("a",f[0],!1,!0)),n.container.append(d.add(f))}}),x(h+d,function(){n._preloadTimeout&&clearTimeout(n._preloadTimeout),n._preloadTimeout=setTimeout(function(){n.preloadNearbyImages(),n._preloadTimeout=null},16)}),x(b+d,function(){t.off(d),n.wrap.off("click"+d),n.arrowLeft&&e&&n.arrowLeft.add(n.arrowRight).destroyMfpFastClick(),n.arrowRight=n.arrowLeft=null})},next:function(){n.direction=!0,n.index=M(n.index+1),n.updateItemHTML()},prev:function(){n.direction=!1,n.index=M(n.index-1),n.updateItemHTML()},goTo:function(a){n.direction=a>=n.index,n.index=a,n.updateItemHTML()},preloadNearbyImages:function(){var a=n.st.gallery.preload,b=Math.min(a[0],n.items.length),c=Math.min(a[1],n.items.length),d;for(d=1;d<=(n.direction?c:b);d++)n._preloadItem(n.index+d);for(d=1;d<=(n.direction?b:c);d++)n._preloadItem(n.index-d)},_preloadItem:function(b){b=M(b);if(n.items[b].preloaded)return;var c=n.items[b];c.parsed||(c=n.parseEl(b)),z("LazyLoad",c),c.type==="image"&&(c.img=a('<img class="mfp-img" />').on("load.mfploader",function(){c.hasSize=!0}).on("error.mfploader",function(){c.hasSize=!0,c.loadError=!0,z("LazyLoadError",c)}).attr("src",c.src)),c.preloaded=!0}}});var O="retina";a.magnificPopup.registerModule(O,{options:{replaceSrc:function(a){return a.src.replace(/\.\w+$/,function(a){return"@2x"+a})},ratio:1},proto:{initRetina:function(){if(window.devicePixelRatio>1){var a=n.st.retina,b=a.ratio;b=isNaN(b)?b():b,b>1&&(x("ImageHasSize."+O,function(a,c){c.img.css({"max-width":c.img[0].naturalWidth/b,width:"100%"})}),x("ElementParse."+O,function(c,d){d.src=a.replaceSrc(d,b)}))}}}}),function(){var b=1e3,c="ontouchstart"in window,d=function(){r.off("touchmove"+f+" touchend"+f)},e="mfpFastClick",f="."+e;a.fn.mfpFastClick=function(e){return a(this).each(function(){var g=a(this),h;if(c){var i,j,k,l,m,n;g.on("touchstart"+f,function(a){l=!1,n=1,m=a.originalEvent?a.originalEvent.touches[0]:a.touches[0],j=m.clientX,k=m.clientY,r.on("touchmove"+f,function(a){m=a.originalEvent?a.originalEvent.touches:a.touches,n=m.length,m=m[0];if(Math.abs(m.clientX-j)>10||Math.abs(m.clientY-k)>10)l=!0,d()}).on("touchend"+f,function(a){d();if(l||n>1)return;h=!0,a.preventDefault(),clearTimeout(i),i=setTimeout(function(){h=!1},b),e()})})}g.on("click"+f,function(){h||e()})})},a.fn.destroyMfpFastClick=function(){a(this).off("touchstart"+f+" click"+f),c&&r.off("touchmove"+f+" touchend"+f)}}(),B()})(window.jQuery||window.Zepto)

/* -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- */
/* Begin Elixir theme specific javascript */
/* -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- */

// 'elixir' is the global object for the elixir RapidWeaver theme
var elixir = {};

// reduce potential conflicts with other scripts on the page
elixir.jQuery = jQuery.noConflict(true);
var $elixir = elixir.jQuery;

// Create unique object and namespace for theme functions
elixir.themeFunctions = {};

// Define a closure
elixir.themeFunctions = (function() {
    // When jQuery is used it will be available 
    // as $ and jQuery but only inside the closure.
    var jQuery = elixir.jQuery;
    var $ = jQuery;
	var $elixir = jQuery.noConflict();

		if ( $elixir.trim( $elixir('#breadcrumb').html() ).length ) {
        }

	function blogEntryTopper() {
		/* 
		
		-=-= BLOG ENTRY TOPPER =-=-
		
		DESCRIPTION: 	Handles the blog entry topper images. Finds image in blog entries with an ALT tag
						of 'blogEntryTopper' and then moves image to the top of the entry. The theme's 
						CSS autosizes the image to fit the blog entry's width.
						
		AUTHOR: Adam Shiver  /  Elixir Graphics
		VERSION: 1.0b
		DATE: May 9, 2011
		
		*/
	
			blogEntryTopperImg = $('.blog-entry img[alt^=blogEntryTopper]');
			blogEntryTopperImg.hide();
			blogEntryTopperImg.each(function() {
				/* Applies special class to the image */
				$(this).addClass('blogEntryTopperImg');  
				/* Moves topper image to the top of the blog entry and wraps it in a div with a class of blogEntryTopper_wrapper  */
				$(this).prependTo($(this).parent().parent()).show().wrap('<div class="blogEntryTopper_wrapper" />');
			});
	}

	function extraContent() {
		/*
			# ExtraContent (jQuery) #
			
			AUTHOR:	Adam Merrifield <http://adam.merrifield.ca>
					Giuseppe Caruso <http://www.bonsai-studio.net/>
			VERSION: r1.4.2
			DATE: 12-16-10 09:40
		
			USAGE:
			- be sure to include a copy of the jQuery libraray in the <head>
				before the inclusion of this function
			- noConflict mode is optional but highly recommended
			- call this script in the <head>
			- change the value of ecValue to match the number of ExtraContent
				areas in your theme
		*/
		$(document).ready(function(){
			var extraContent =  (function() {
				// change ecValue to suit your theme
				var ecValue = 2;
				for (i=1;i<=ecValue;i++)
				{
					$('#myExtraContent'+i+' script').remove();
					$('#myExtraContent'+i).appendTo('#extraContainer'+i).show();
				}
			})();
		});

		// Automatically show ExtraContent areas if they contain content.

		if ($('#myExtraContent1').length > 0) {
			$('#extraContent1').show();
		}

		if ($('#myExtraContent2').length > 0) {
			$('#extraContent2').show();
			$('#container').css({'margin-bottom':'40px'});
		}

	}

	function generalThemeFunctions() {	
		//
		// Display the Sidebar Title only if it is enabled and has content
		//
		if ($.trim( $('#sidebar_title').html() ).length ) {
		  $('#sidebar_title').show();
		}

		//
		// Display the Breadcrumb trail only if it is enabled and has content
		//
		if ( $.trim( $('#breadcrumb').html() ).length ) {
		  $('#breadcrumb_container').show();
    }

		//
		// Display the Breadcrumb trail only if it is enabled and has content
		//
	  $('.blog-entry').last().addClass('last-blog-entry');

    //
    // Move social badges to their appropriate locations.
    //
    $('a.myBadge').appendTo('#social_badges');

	}


	function navigation() {
		// 
		// Handles to opening and closing of the mobile navigation via a tobble button / bar
		// 
    $('#mobile_navigation_toggle').click(function(){
      $('#mobile_navigation').slideToggle(250);
    });

    $('#scroll_down_button').click(function(){
    	$('#navigation_stopper').ScrollTo({
			    duration: 700
			});
    });

    // 
    // Handles the Scroll Up button found in the footer area
    // 
    fade_in_height = $('header').height();
    fade_in_height = fade_in_height + 200;

		$(window).scroll(function(){
        if ($(this).scrollTop() > fade_in_height) {
            $('#scroll_up_button').fadeIn();
        } else {
            $('#scroll_up_button').fadeOut();
        }
    });

		$('#scroll_up_button').click(function(){
    	$('#navigation_stopper').ScrollTo({
			    duration: 700
			});
		});

		// 
    // Counts up navigation items and does the math, dividing them best it can
    // to make them all equal in width. Maxes out at 12 navigation itemes across.
    // This section does this same process for the main and sub navigation items.
    // 
    var navigation = $('#top_navigation');
    var navigation_top_ul = $('#top_navigation > ul');
    var navigation_first_li = navigation_top_ul.children();
    var navigation_count = navigation_first_li.length;

    var sub_navigation = $('#sub_navigation');
    var sub_navigation_top_ul = $('#sub_navigation > ul > li > ul');
    var sub_navigation_first_li = sub_navigation_top_ul.children();
    var sub_navigation_count = sub_navigation_first_li.length;
    
		if (navigation_count === 0) { $('#navigation_bar').hide(); }
		else if (navigation_count === 1) { navigation_first_li.css('width','100%'); }
		else if (navigation_count === 2) { navigation_first_li.css('width','50%'); }
		else if (navigation_count === 3) { navigation_first_li.css('width','33.33333%'); }
		else if (navigation_count === 4) { navigation_first_li.css('width','25%'); }
		else if (navigation_count === 5) { navigation_first_li.css('width','20%'); }
		else if (navigation_count === 6) { navigation_first_li.css('width','16.66666%'); }
		else if (navigation_count === 7) { navigation_first_li.css('width','14.28571%'); }
		else if (navigation_count === 8) { navigation_first_li.css('width','12.5%'); }
		else if (navigation_count === 9) { navigation_first_li.css('width','11.11111%'); }
		else if (navigation_count === 10) { navigation_first_li.css('width','10%'); }
		else if (navigation_count === 11) { navigation_first_li.css('width','9.09090%'); }
		else if (navigation_count === 12) { navigation_first_li.css('width','8.33333%'); }

		if (sub_navigation_count === 0) { $('#sub_navigation_bar').hide(); }
		else if (sub_navigation_count === 1) { sub_navigation_first_li.css('width','100%'); }
		else if (sub_navigation_count === 2) { sub_navigation_first_li.css('width','50%'); }
		else if (sub_navigation_count === 3) { sub_navigation_first_li.css('width','33.33333%'); }
		else if (sub_navigation_count === 4) { sub_navigation_first_li.css('width','25%'); }
		else if (sub_navigation_count === 5) { sub_navigation_first_li.css('width','20%'); }
		else if (sub_navigation_count === 6) { sub_navigation_first_li.css('width','16.66666%'); }
		else if (sub_navigation_count === 7) { sub_navigation_first_li.css('width','14.28571%'); }
		else if (sub_navigation_count === 8) { sub_navigation_first_li.css('width','12.5%'); }
		else if (sub_navigation_count === 9) { sub_navigation_first_li.css('width','11.11111%'); }
		else if (sub_navigation_count === 10) { sub_navigation_first_li.css('width','10%'); }
		else if (sub_navigation_count === 11) { sub_navigation_first_li.css('width','9.09090%'); }
		else if (sub_navigation_count === 12) { sub_navigation_first_li.css('width','8.33333%'); }


	}	
	
	
	function photoAlbum() {
    //
    // Hanldes caption spacing when image captions are turned on for thumbnails.
    //
		if ($('.thumbnail-wrap .thumbnail-caption').length > 0) {
			$('.thumbnail-wrap').css({'margin-bottom' : '80px'});
		}
	}


	$(document).ready(function() {
		extraContent();
		generalThemeFunctions();
		navigation();
    photoAlbum();
    blogEntryTopper();
	});	
	
})(elixir.themeFunctions);




/**
 * Utilites
 */
var elem = document.querySelector.bind(document);
window.on = window.addEventListener;
Element.prototype.on = Element.prototype.addEventListener;

/**
 * AnchorizeHandler
 */
var AnchorizeHandler = (function (window) {
	'use strict';

	function AnchorizeHandler (container) {
		this.container	= elem(container);
		this.tags		= ['h2', 'h3', 'h4', 'h5', 'h6'];
		this.anchorSign	= '§';
	}

	AnchorizeHandler.prototype.init = function () {
		this.getAll( this.tags );
	};

	AnchorizeHandler.prototype.getAll = function (list) {
		list.forEach(function (tag) {
			var elem = this.container.getElementsByTagName(tag);
			for (var i = elem.length; i--;) {
				this.createLink( elem[i] );
			}
		}.bind(this));
	};

	AnchorizeHandler.prototype.createLink = function (elem) {
		var link = document.createElement('a');
		link.href = '#'+ elem.getAttribute('id');
		link.textContent = this.anchorSign;
		link.classList.add('headline-anchor');
		elem.appendChild( link );
	};

	return AnchorizeHandler;
})(window);

/**
 * ArticleReadingTimeHandler
 */
var RoundNumber = (function (window) {
	'use strict';

	function ArticleReadingTimeHandler (container) {
		this.container	= elem(container);
		this.value = this.container ? this.container.innerHTML : '';
	}

	ArticleReadingTimeHandler.prototype.init = function () {
		this.container.innerHTML = Math.round(parseFloat(this.value));
	};

	return ArticleReadingTimeHandler;
})(window);

/**
 * ArticleScrollHandler
 */
var ArticleScrollHandler = function (event) {
	var HEADER_POSITION = 454;
	var scrollTop = document.body.scrollTop;
	var articleTOC = elem('.article__fixed');
	
	if (scrollTop >= HEADER_POSITION) {
		articleTOC.classList.add('is-fixed');
	} else {
		articleTOC.classList.remove('is-fixed');
	}
};

/**
 * ScrollToSection
 */
var ScrollToSection = (function (window) {
	'use strict';

	function ScrollToSection () {
		this.button = null;
		this.area = elem('body');
		this.position = 0;
		this.scrollToEvent = function (event) {
			event.preventDefault();
			this.area.scrollTop = this.position;
		};
	}

	ScrollToSection.prototype.onClick = function (btn) {
		this.button = elem(btn);
		this.button.on('click', this.scrollToEvent.bind(this) );
		return this;
	};

	ScrollToSection.prototype.moveElem = function (section) {
		this.area = elem(section);
		return this;
	};

	ScrollToSection.prototype.toPosition = function (pos) {
		this.position = pos;
		return this;
	};

	return ScrollToSection;
})(window);

/**
 * App init
 */
(function (window) {
	'use strict';

	/* Variables */
	var anchored = new AnchorizeHandler('.article__content');
	var readingTime = new RoundNumber('.heading__reading-time span');
	var upstairs = new ScrollToSection();

	/* If articlepage */
	if (elem('.content-article')) {
		anchored.init();
		readingTime.init();
		upstairs.onClick('.article__upstairs').moveElem('body').toPosition(0);

		/* EventHandler */
		window.on('scroll', ArticleScrollHandler);
	}

})(window);
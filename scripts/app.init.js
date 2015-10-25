/**
 * Utilites
 */
var elem = document.querySelector.bind(document);
window.on = window.addEventListener;
Element.prototype.on = Element.prototype.addEventListener;

var getOffset = function ( elem ) {
	var offsetTop = 0;
	do {
		if ( !isNaN( elem.offsetTop ) ) {
			offsetTop += elem.offsetTop;
		}
	} while( elem = elem.offsetParent );
	return offsetTop;
};

/**
 * ContentModifier
 */
var ContentModifier = (function (window) {
	'use strict';

	function ContentModifier (container) {
		this.container	= elem(container);
		this.tags = ['h2', 'h3', 'h4', 'h5', 'h6'];
		this.links = null;
		this.anchorSign = '§';
	}

	ContentModifier.prototype.init = function () {
		this.links = this.container.querySelectorAll('a');
		this.getAll( this.tags );
		this.addTarget( this.links );
	};

	ContentModifier.prototype.addTarget = function (list) {
		[].forEach.call(list, function (item) { 
			if (item.hostname !== location.hostname) {
				item.setAttribute('target', '_blank');
			}
		});
	};

	ContentModifier.prototype.getAll = function (list) {
		list.forEach(function (tag) {
			var elem = this.container.getElementsByTagName(tag);
			for (var i = elem.length; i--;) {
				this.createLink( elem[i] );
			}
		}.bind(this));
	};

	ContentModifier.prototype.createLink = function (elem) {
		var link = document.createElement('a');
		link.href = '#'+ elem.getAttribute('id');
		link.textContent = this.anchorSign;
		link.classList.add('headline-anchor');
		elem.appendChild( link );
	};

	return ContentModifier;
})(window);

/**
 * ArticleScrollHandler
 */
var ArticleScrollHandler = function (event) {
	var HEADER_POSITION = this;
	var scrollTop = document.body.scrollTop;
	var articleTOC = elem('.article__fixed');
	
	if (scrollTop >= HEADER_POSITION) {
		articleTOC.classList.add('is-fixed');
	} else {
		articleTOC.classList.remove('is-fixed');
	}
};

/**
 * SummaryAnchor
 */
var SummaryAnchor = (function (window) {
	'use strict';

	function SummaryAnchor (wrapper) {
		this.container = elem(wrapper);
		this.linkContent = 'Too Long; Didn\'t Read?';
	}

	SummaryAnchor.prototype.createAnchor = function (id) {
		var link = document.createElement('a');
		var icon = this.createIcon();
		link.href = '#' + id;
		link.textContent = this.linkContent;
		link.classList.add('link-gradient', 'heading__jump');

		link.appendChild(icon);
		this.container.appendChild(link);
		this.container.classList.add('has-tldr');
	};

	SummaryAnchor.prototype.createIcon = function () {
		var img = document.createElement('img');
		img.src = '/../assets/icons/arrow-down.svg';

		return img;
	};

	return SummaryAnchor;
})(window);

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
 * Timer
 */
var Timer = (function (window) {
	'use strict';
	
	function Timer (container) {
		this.elem = elem(container);
		this.date = new Date();
	}

	Timer.prototype.getYear = function () {
		this.elem.textContent = this.date.getFullYear();
	};

	return Timer;
})(window);

/**
 * App init
 */
(function (window) {
	'use strict';

	/* Variables */
	var isArticlePage = !!elem('.content-article');
	var tldrSection = elem('#tldr');
	var asideNav = null;
	var scrollBreakpoint = 0;

	/* Classes */
	var anchored = new ContentModifier('.content-body');
	var summarize = new SummaryAnchor('.content-heading');
	var currentYear = new Timer('.footer__year');

	currentYear.getYear();

	if (isArticlePage) {
		asideNav = elem('.aside-navigation');
		scrollBreakpoint = getOffset(asideNav) + asideNav.getBoundingClientRect().height;
		
		anchored.init();

		if (!!tldrSection) {
			summarize.createAnchor(tldrSection.id);
		}

		// EventHandler
		window.on('scroll', ArticleScrollHandler.bind(scrollBreakpoint));
	}
})(window);
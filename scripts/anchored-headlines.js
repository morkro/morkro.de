'use strict';

export default class AnchoredHeadline {
	constructor (container) {
		this.container	= container;
		this.tags = ['h2', 'h3', 'h4', 'h5', 'h6'];
		this.links = null;
		this.anchorSign = '§';
	}

	init () {
		this.links = this.container.querySelectorAll('a');
		this.getAll( this.tags );
		this.addTarget( this.links );
	}

	addTarget (list) {
		[].forEach.call(list, item => {
			if (item.hostname !== location.hostname) {
				item.setAttribute('target', '_blank');
			}
		});
	}

	getAll (list) {
		list.forEach(tag => {
			const elem = this.container.getElementsByTagName(tag);
			for (let i = elem.length; i--;) {
				this.createLink( elem[i] );
			}
		});
	}

	createLink (elem) {
		const link = document.createElement('a');
		const sign = document.createTextNode(this.anchorSign);
		link.href = `#${elem.getAttribute('id')}`;
		link.classList.add('headline-anchor');
		link.appendChild(sign);
		elem.appendChild(link);
	}
}
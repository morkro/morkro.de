const $ = document.querySelector.bind(document);

const getOffset = elem => {
	let offsetTop = 0;
	do {
		if ( !isNaN( elem.offsetTop ) ) {
			offsetTop += elem.offsetTop;
		}
	} while( elem = elem.offsetParent );
	return offsetTop;
};

export { $, getOffset };
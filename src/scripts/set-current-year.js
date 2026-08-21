const $node = document.querySelector('.footer-year')
if ($node) {
	$node.textContent = String(new Date().getFullYear())
}

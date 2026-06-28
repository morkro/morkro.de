export function maskBlockComments(css: string): string {
	return css.replace(
    /\/\*[\s\S]*?\*\//g,
    (comment) => comment.replace(/[^\n]/g, ' '))
}
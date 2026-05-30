const tagName = '[a-zA-Z][a-zA-Z0-9-]*'
const attrName = '[a-zA-Z_:][a-zA-Z0-9_.:-]*'
const attrValue = `(?:"[^"]*"|'[^']*'|[^\\s"'=<>\`]+)`
const attribute = `(?:\\s+${attrName}(?:\\s*=\\s*${attrValue})?)`

export const htmlOpenTagRegex   = new RegExp(`<${tagName}${attribute}*\\s*/?>`, 'y')
export const htmlCloseTagRegex  = new RegExp(`</${tagName}\\s*>`, 'y')
export const htmlCommentRegex   = /<!--[\s\S]*?-->/y
export const htmlCdataRegex     = /<!\[CDATA\[[\s\S]*?\]\]>/y
export const htmlDeclRegex      = /<![A-Z]+\s+[^>]*>/y
export const htmlProcInstRegex  = /<\?[\s\S]*?\?>/y

export const knownHtmlBlockTags = new Set([
  'address','article','aside','base','basefont','blockquote','body','caption',
  'center','col','colgroup','dd','details','dialog','dir','div','dl','dt',
  'fieldset','figcaption','figure','footer','form','frame','frameset','h1',
  'h2','h3','h4','h5','h6','head','header','hr','html','iframe','legend',
  'li','link','main','menu','menuitem','nav','noframes','ol','optgroup',
  'option','p','param','section','source','summary','table','tbody','td',
  'tfoot','th','thead','title','tr','track','ul'
])
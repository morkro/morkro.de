import { filterDate } from '#parser/liquid/filters.ts'

type JsonLd = Record<string, unknown>

type Site = {
	url: string
	author: string
	description: string
	email: string
}

type SocialProfile = {
	url?: string
	name?: string
}

type SocialNetworks = Record<string, SocialProfile>

type CollectionPost = {
	url?: string
	date: Date
	data: {
		title: string
		excerpt?: string
		external?: {
			url: string
			host: string
		}
	}
}

type ResumeExperience = {
	company: string
	title: string
	url?: string
}

type Resume = {
	experience?: ResumeExperience[]
}

type PageContext = {
	layout?: string
	title?: string
	excerpt?: string
	site: Site
	pageClass?: string | number
	socialnetworks: SocialNetworks
	resume?: Resume
	collections?: {
		posts?: CollectionPost[]
	}
	page: {
		url: string
		date?: Date
	}
	meta?: {
		description?: string
	}
}

const DEFAULT_IMAGE = '/assets/img/moritz-mountains.webp'

function personId (site: Site) {
	return `${site.url}/#person`
}

function websiteId (site: Site) {
	return `${site.url}/#website`
}

function absolute (site: Site, path: string) {
	return `${site.url}${path.startsWith('/') ? path : `/${path}`}`
}

function sameAs (social: SocialNetworks) {
	return Object.values(social).map(s => s.url).filter(Boolean)
}

function articleId (site: Site, postUrl: string) {
	return `${absolute(site, postUrl)}#article`
}

function person (site: Site, social: SocialNetworks, resume?: Resume): JsonLd {
	const currentRole = resume?.experience?.[0]
	const node: JsonLd = {
		'@type': 'Person',
		'@id': personId(site),
		name: site.author,
		url: absolute(site, '/is/'),
		email: site.email,
		image: absolute(site, DEFAULT_IMAGE),
		sameAs: sameAs(social),
	}

	if (currentRole) {
		node.jobTitle = currentRole.title
		node.worksFor = {
			'@type': 'Organization',
			name: currentRole.company,
			...(currentRole.url ? { url: currentRole.url } : {}),
		}
	}

	return node
}

function webSite (site: Site): JsonLd {
	return {
		'@type': 'WebSite',
		'@id': websiteId(site),
		url: absolute(site, '/'),
		name: site.author,
		description: site.description,
		publisher: { '@id': personId(site) },
	}
}

function blogPosting (ctx: PageContext): JsonLd {
	const node: JsonLd = {
		'@type': 'BlogPosting',
		'@id': `${ctx.page.url}#article`,
		headline: ctx.title,
		description: ctx.meta?.description ?? ctx.excerpt,
		author: { '@id': personId(ctx.site) },
		publisher: { '@id': personId(ctx.site) },
		mainEntityOfPage: {
			'@type': 'WebPage',
			'@id': ctx.page.url,
		},
		url: ctx.page.url,
		image: absolute(ctx.site, DEFAULT_IMAGE),
	}

	if (ctx.page.date) {
		node.datePublished = filterDate(ctx.page.date, 'rfc3339')
	}

	return node
}

function blogListing (ctx: PageContext): JsonLd[] {
	const posts = ctx.collections?.posts ?? []
	const itemListId = `${ctx.page.url}#itemlist`

	const itemList: JsonLd = {
		'@type': 'ItemList',
		'@id': itemListId,
		itemListElement: posts.map((post, index) => {
			const localUrl = post.url ? absolute(ctx.site, post.url) : undefined
			const item: JsonLd = {
				'@type': 'BlogPosting',
				headline: post.data.title,
				datePublished: filterDate(post.date, 'rfc3339'),
			}

			if (localUrl) {
				item['@id'] = articleId(ctx.site, post.url as string)
				item.url = localUrl
			}

			if (post.data.external?.url) {
				item.sameAs = post.data.external.url
			}

			return {
				'@type': 'ListItem',
				position: index + 1,
				item,
			}
		}),
	}

	const webpage: JsonLd = {
		'@type': 'CollectionPage',
		'@id': `${ctx.page.url}#webpage`,
		url: ctx.page.url,
		name: ctx.title,
		description: ctx.meta?.description,
		isPartOf: { '@id': websiteId(ctx.site) },
		mainEntity: { '@id': itemListId },
	}

	return [itemList, webpage]
}

function aboutPage (ctx: PageContext): JsonLd {
	return {
		'@type': 'ProfilePage',
		'@id': `${ctx.page.url}#webpage`,
		url: ctx.page.url,
		name: ctx.title,
		description: ctx.meta?.description,
		isPartOf: { '@id': websiteId(ctx.site) },
		mainEntity: { '@id': personId(ctx.site) },
	}
}

function webPage (ctx: PageContext): JsonLd {
	return {
		'@type': 'WebPage',
		'@id': `${ctx.page.url}#webpage`,
		url: ctx.page.url,
		name: ctx.title != null ? String(ctx.title) : undefined,
		description: ctx.meta?.description ?? ctx.site.description,
		isPartOf: { '@id': websiteId(ctx.site) },
	}
}

export function buildStructuredData (raw: Record<string, unknown>): JsonLd {
	const ctx = raw as PageContext
	const graph: JsonLd[] = [
		person(ctx.site, ctx.socialnetworks, ctx.resume),
		webSite(ctx.site),
	]

	if (ctx.layout === 'post') {
		graph.push(blogPosting(ctx))
	} else if (ctx.pageClass === 'blog') {
		graph.push(...blogListing(ctx))
	} else if (ctx.page.url.endsWith('/is/')) {
		graph.push(aboutPage(ctx))
	} else if (ctx.page.url !== `${ctx.site.url}/` && String(ctx.pageClass) !== '404') {
		graph.push(webPage(ctx))
	}

	return {
		'@context': 'https://schema.org',
		'@graph': graph,
	}
}

import { env } from "cloudflare:workers";


/* https://developers.cloudflare.com/workers/runtime-apis/html-rewriter/#element-handlers */

var GLOBAL_URL = new URL("https://feed.snapps.dev");

// blog object(s)
class BlogEntry {
	entryNum!: number
	id!: string
    title!: string
    summary!: string
    category!: Array<string>
    tags!: Array<string>
    published!: Date
    image!: string|null
	content!: string

	constructor(ENTRYDATA:any){

		this.entryNum = ENTRYDATA.rowid
		this.id = ENTRYDATA.id
		this.title = ENTRYDATA.title
		this.summary = ENTRYDATA.summary
		this.category = JSON.parse(ENTRYDATA.category)
		this.tags = JSON.parse(ENTRYDATA.tags)
		this.published = new Date(parseInt(ENTRYDATA.published))
		this.image = ENTRYDATA.image
		if(ENTRYDATA.content) this.content = ENTRYDATA.content
	}

	entryElement(){
		
		let out = ""


		// start it off

		out += `<a href="${GLOBAL_URL.protocol}//${GLOBAL_URL.host}/blog/${this.id}" class="blog-entry
		${this.category.includes("checkpoints")?" checkpoint":""}
		${this.tags.includes("nsfw")?" nsfw":""}">`

		// add info

		out += `<div class="entry-info">
				<span>${this.tags.includes("nsfw")?"🔞 - ":""}${this.title}</span>
				<span>${this.published.toLocaleString()}</span>
			</div>`

		out += `<div>`

		// add image?
		if (this.image && this.image != "https://snapps.dev/res/img/global/ckpt.gif"){
			out += `<img style="float:left;" src="${this.image}">`
		}

		// add summary

		out += `<span>${this.summary}</span></div>`

		// add metadata

		out+= `
			<div class="entry-meta">
			<span>${"📂 "+this.category}</span>
			<span>${"🔖 "+this.tags.join(", ")}</span>
			</div>`

		// close it
		out += "</a>"

		return out 
	}
}

// general page building
class NavBarHandler{
	element(element:any=[]){
		let navBarTemplate = `
		<div class="left">
			
		</div>
		<div class="center">
			<h1><a href="/">snapps feed</a></h1>
		</div>
		<div class="right"></div>`
		element.setInnerContent(navBarTemplate,{html:true})
	}
}

class CommentHandler {
	comments(comment:any=[]) {
		comment.remove()
	}
}

// home page building
class CategoryListHandler {
	categories:Array<string> = []
	element(element:any = []) {
		let out = ""
		this.categories.forEach(catagory=>{
			out += `<a>${catagory}</a>`
		})
		element.setInnerContent(out,{html:true})
	}
	constructor (CATEGORIES:Array<string>){
		this.categories = CATEGORIES
	}
}

class TagListHandler {
	tags:Array<string> = []
	element(element:any = []) {
		element.setInnerContent(this.tags.join("|"))
	}
	constructor (TAGS:Array<string>){
		this.tags = TAGS
	}
}

class EntryListHandler {
	entries:Array<BlogEntry> = []
	element(element:any = []) {
		let entryListLHTML = ""
		this.entries.forEach(entry=>{
			entryListLHTML += entry.entryElement()
		}) 
		element.setInnerContent(entryListLHTML,{html:true})
	}
	constructor (ENTRYS:Array<BlogEntry>){
		this.entries = ENTRYS
	}
}

class DontDragImageHandler {
	element(element:any = []) {
		element.setAttribute("draggable","false")
	}
}

// blog building
class BlogContentHandler {
	content:string = ""
	element(element:any = []) {
		element.setInnerContent(this.content,{html:true})
	}
	constructor (CONTENT:string){
		this.content = CONTENT
	}
}

class BlogHeaderHandler {
	blog:BlogEntry 
	element(element:any = []) {
		let headerTemplate = `
		${this.blog.title}</title>`

		element.setInnerContent(headerTemplate,{html:true})
	}
	constructor (BLOG:BlogEntry){
		this.blog = BLOG
	}
}

class BlogInfoHandler {
	blog:BlogEntry 
	element(element:any = []) {
		let titleTemplate = `
		<h1>${this.blog.title}</h1>
		<span>published: ${this.blog.published.toLocaleString()}</span>`

		element.setInnerContent(titleTemplate,{html:true})
	}
	constructor (BLOG:BlogEntry){
		this.blog = BLOG
	}
}

class BlogNavHandler {
	blog:BlogEntry

	chronoFirstEntry!:BlogEntry|null
	chronoPrevEntry!:BlogEntry|null
	chronoNextEntry!:BlogEntry|null
	chronoLatestEntry!:BlogEntry|null
	chronoElement!:string 

	seriesFirstEntry!:BlogEntry|null
	seriesPrevEntry!:BlogEntry|null
	seriesNextEntry!:BlogEntry|null
	seriesLatestEntry!:BlogEntry|null
	seriesElement!:string 

	
	element(element:any = []) {
		let out = ""

		out += this.chronoElement
		out += this.seriesElement

		element.setInnerContent(out,{html:true})
	}
	constructor (BLOG:BlogEntry){
		this.blog = BLOG
	}

	async init(){
		await this.getChrono()
		await this.getSeries()
	}

	async getChrono(){
		this.chronoFirstEntry = await getBlogByRow(1)
		this.chronoPrevEntry = await getBlogByRow(this.blog.entryNum - 1)
		this.chronoNextEntry = await getBlogByRow(this.blog.entryNum + 1)
		this.chronoLatestEntry = await getLatestBlog()

		this.chronoElement = "<div>"

		if(!(this.chronoFirstEntry)) this.chronoElement += `<div></div>`
		else if (this.chronoFirstEntry.entryNum == this.blog.entryNum) this.chronoElement += `<div></div>`
		else this.chronoElement += `<a href="/blog/${this.chronoFirstEntry.id}"><img src="/res/icons/first.svg"><span>first</span></a>`

		if(!(this.chronoPrevEntry)) this.chronoElement += `<div></div>`
		else if (this.chronoPrevEntry.entryNum == this.blog.entryNum) this.chronoElement += `<div></div>`
		else this.chronoElement += `<a href="/blog/${this.chronoPrevEntry.id}"><img src="/res/icons/prev.svg"><span>prev</span></a>`

		//label
		this.chronoElement += "<span>chronological</span>"

		if(!(this.chronoNextEntry)) this.chronoElement += `<div></div>`
		else if (this.chronoNextEntry.entryNum == this.blog.entryNum) this.chronoElement += `<div></div>`
		else this.chronoElement += `<a href="/blog/${this.chronoNextEntry.id}"><span>next</span><img src="/res/icons/next.svg"></a>`

		if(!(this.chronoLatestEntry)) this.chronoElement += `<div></div>`
		else if (this.chronoLatestEntry.entryNum == this.blog.entryNum) this.chronoElement += `<div></div>`
		else this.chronoElement += `<a href="/blog/${this.chronoLatestEntry.id}"><span>latest</span><img src="/res/icons/latest.svg"></a>`

		this.chronoElement += "</div>"
	}

	async getSeries(){
		this.seriesElement = ""
	}

}

// default export shid

export default {
	/**
	 * This is the standard fetch handler for a Cloudflare Worker
	 *
	 * @param request - The request submitted to the Worker from the client
	 * @param env - The interface to reference bindings declared in wrangler.jsonc
	 * @param ctx - The execution context of the Worker
	 * @returns The response to be sent back to the client
	 */
	async fetch(request, env, ctx): Promise<Response> {
		let url = new URL(request.url)
		GLOBAL_URL = url;
		let path = url.pathname.split("/")
		//console.log(url)
		
		let response = null
		switch (path[1]) {

			// run the feed
			case "feed.xml":
			case "feed.json":
			case "feed.atom":
				//console.log(url.searchParams)
				break;

			// webpage stuff
			case "":
				response = buildHomePage(await env.ASSETS.fetch(`${url.origin}/home.html`))
				break;
			case "blog":
				// if no blog specified; redirect to home
				if(!path[2]||path[2]=='') {
					const destinationURL = `${url.protocol}//${url.host}`;
					const statusCode = 301;
					return Response.redirect(destinationURL, statusCode)
				}

				response = buildBlogPage(await env.ASSETS.fetch(`${url.origin}/blog.html`),path[2])
				break;
			//check if file hit
			default:

				try {
					response = await env.ASSETS.fetch(`${url.origin}/${url.pathname}`)
					//console.log(response)
				
				} catch (error) {
					//response = await env.ASSETS.fetch(`${url.origin}/404.html`)

				}
				break;
		}


		if (response==null) return new Response("something has gone catastropically bad...") 
		return response
	},
} satisfies ExportedHandler<Env>;


async function buildBlogPage(page:any, blog_id:string) {
	// attempt to get blog data
	
	let requestedBlog:any=[]
	try {
		
		requestedBlog = await (await env.BLOG_DB.prepare(`SELECT ROWID,* FROM [entries] where [id]="${blog_id}"`).run()).results
		// console.log(requestedBlog)
	} catch (error) {
		console.log(error)
		// error getting page
		// 404?
		// other error?	
	}
	if (requestedBlog.length==0){} //return early

	let blog = new BlogEntry(requestedBlog[0])

	// generate metadata

	// touch up content
	blog.content = blog.content.replaceAll("/res/","https://snapps.dev/res/")

	// 
	let blogNav = new BlogNavHandler(blog)
	await blogNav.init()

	// --- build page ---
	let outHTML = new HTMLRewriter()
		.on("nav", new NavBarHandler)
		.on("article", new BlogContentHandler(blog.content))
		.on("title", new BlogHeaderHandler(blog))
		.on("#info", new BlogInfoHandler(blog))
		.on(".blog-nav", blogNav)
		.on("*",new CommentHandler)


	return outHTML.transform(page)
}

async function buildHomePage(page:any){
	// get entries
	var entriesFound:any = (await env.BLOG_DB.prepare(`SELECT rowid,[id],[title],[summary],[category],[tags],[published],[image] FROM [entries]`).run()).results
	//console.log(entriesFound)

	// --- arrange data ---
	let categories: Set<string> = new Set()
	let tags: Set<string> = new Set()
	let entries: Array<BlogEntry> = []

	for (const entry in entriesFound)  {
		entries.push(new BlogEntry(entriesFound[entry]))
		let tempCategories:Array<string> = JSON.parse(entriesFound[entry].category)
		tempCategories.forEach(category=>{categories.add(category)})
		let tempTags:Array<string> = JSON.parse(entriesFound[entry].tags)
		tempTags.forEach(tag=>{tags.add(tag)})
	}

	// --- build page ---
	let outHTML = new HTMLRewriter()
		.on("nav", new NavBarHandler)
		.on("#category-list",new CategoryListHandler([...categories]))
		.on("#tag-list",new TagListHandler([...tags]))
		.on("#blog-list",new EntryListHandler(entries.toReversed())) // the entries needs to be in reverse cronological order
		.on("img",new DontDragImageHandler)
		.on("*",new CommentHandler)

	return outHTML.transform(page)

}

// DB functions

async function getBlogById(id: string): Promise<BlogEntry|null> {
	try {
		let results = (await env.BLOG_DB.prepare(`SELECT rowid,[id],[title],[summary],[category],[tags],[published],[image] FROM [entries] where id = "${id}" `).run()).results
		if (results.length==0) return null
		else return new BlogEntry(results[0])
	} catch (error) {
		console.error(error)
		return null
	}
}

async function getBlogByRow(row: number): Promise<BlogEntry|null> {
	try {
		let results = (await env.BLOG_DB.prepare(`SELECT rowid,[id],[title],[summary],[category],[tags],[published],[image] FROM [entries] where rowid = ${row} `).run()).results
		if (results.length==0) return null
		else return new BlogEntry(results[0])
	} catch (error) {
		console.error(error)
		return null
	}
}

async function getLatestBlog(): Promise<BlogEntry|null> {
	try {
		let results = (await env.BLOG_DB.prepare(`SELECT rowid,[id],[title],[summary],[category],[tags],[published],[image] FROM [entries] order by rowid desc LIMIT 1 `).run()).results
		if (results.length==0) return null
		else return new BlogEntry(results[0])
	} catch (error) {
		console.error(error)
		return null
	}
}


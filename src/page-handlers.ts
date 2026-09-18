/**
 * what does this file do?
 * - fill/transforms the HTML page before delivered 
 * 
 * if you want to mess with how modules work,
 * this is the file
 * 
 * if you are trying to change the base layout of the page, this *may*
 * be the spot, but consider looking into the actual html files.
 */

import { env } from "cloudflare:workers";
import * as Blog from "./blog"

// general page building

/**
 * all that fancy embed stuff. make sure to execute fetchImage() before use!
 */
export class Head{

    title:string
    link:string
    summary:string
    image_link:string|null
    image_dim:[number,number] = [0,0]
    color:string|null
    discordComponent:string|null = null

    constructor (title:string,link:string,summary:string,image_link:string|null="https://cdn.snapps.dev/images/button.gif",color:string|null="#00bcd4"){
        this.title = title
        this.link = link
        this.summary = summary
        this.image_link = image_link==null?"https://cdn.snapps.dev/images/button.gif":image_link
        this.color=color = color==null?"#00bcd4":color


         
    }

    element(element:any = []) {
        let out =  `
<meta name="keywords" content="${this.summary}">
<meta property="og:title" content="${this.title}">
<meta property="og:type" content="article">
<meta property="og:url" content="${this.link}">
<meta property="og:image" content="${this.image_link}">
<meta property="og:image:width" content="${this.image_dim[0]}"><meta property="og:image:height" content="${this.image_dim[1]}">
<meta property="twitter:image:src" content="${this.image_link}">
<meta property="theme-color" content="${this.color}">
<meta property="og:description" content="${this.summary}">
<meta property="twitter:title" content="${this.title}">
<meta property="twitter:card" content="summary_large_image">
<title>${this.title}</title>
${this.discordComponent?this.discordComponent:""}
`
        element.append(out,{html:true})
    }

    /**
     * NEEDS TO EXECUTE BEFORE USING HANDLER. fetches the (metadata) of the embed image so that the image is
     * displayed correctly. essentially an initializer.
     * @returns - NOTHING, YOU GET NOTHING, GOOD DAY
     */
    async fetchImage():Promise<void>{
        if(this.image_link==null) {this.image_dim = [0,0]; return;}
        let image = await fetch(this.image_link, {
            cf: {
                image: {
                format: "json"
                }
            }
        });
        
        const metadata:any = await image.json();
        this.image_dim = [metadata.width,metadata.height];
        return;
    }

    buildDiscordComponents(jsonAddress?:string):void{
        this.discordComponent = `<link
  rel="discord:component-embed"
  type="application/json"
  href="${env.BLOG_INFO.ROOT}/discord/${jsonAddress?jsonAddress:""}"
>`
    }
}
export class NavBar{
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

export class Comment {
    comments(comment:any=[]) {
        comment.remove()
    }
}

// home page building
export class CategoryList {
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

export class TagList {
    tags:Array<string> = []
    element(element:any = []) {
        element.setInnerContent(this.tags.join("|"))
    }
    constructor (TAGS:Array<string>){
        this.tags = TAGS
    }
}

export class EntryList {
    entries:Array<Blog.Entry> = []
    element(element:any = []) {
        let entryListLHTML = ""
        this.entries.forEach(entry=>{
            entryListLHTML += entry.card()
        }) 
        element.setInnerContent(entryListLHTML,{html:true})
    }
    constructor (ENTRYS:Array<Blog.Entry>){
        this.entries = ENTRYS
    }
}

export class DontDragImage {
    element(element:any = []) {
        element.setAttribute("draggable","false")
    }
}

// blog building

/**
 * puts the content of the blog on da page
 */
export class BlogContent {
    content:string = ""
    element(element:any = []) {
        element.setInnerContent(this.content,{html:true})
    }
    constructor (CONTENT:string){
        this.content = CONTENT
    }
}

/** 
 * TODO: assimilate into Head handler.
 * just sets the title of the blog...
*/
export class BlogHeader {
    blog:Blog.Entry 
    element(element:any = []) {
        let headerTemplate = `
        ${this.blog.title}</title>`

        element.setInnerContent(headerTemplate,{html:true})
    }
    constructor (BLOG:Blog.Entry){
        this.blog = BLOG
    }
}

/**
 * some simple blog metadata to be displayed with the blog
 */
export  class BlogInfo {
    blog:Blog.Entry 
    element(element:any = []) {
        let titleTemplate = `
        <h1>${this.blog.title}</h1>
        <span>published: ${this.blog.published.toLocaleString()}</span><br>
        <span>syntax revision: ${this.blog.contentVer==1?`1 - <span style="color:var(--yellow)">⚠ features may be missing or broken!</span>`:this.blog.contentVer}</span>`

        element.setInnerContent(titleTemplate,{html:true})
    }
    constructor (BLOG:Blog.Entry){
        this.blog = BLOG
    }
}

/**
 * TODO: add series bar.
 * blog navigation bar to indulge the reader with more content.
 */
export class BlogNav {
    blog:Blog.Entry

    chronoFirstEntry!:Blog.Entry|null
    chronoPrevEntry!:Blog.Entry|null
    chronoNextEntry!:Blog.Entry|null
    chronoLatestEntry!:Blog.Entry|null
    chronoElement!:string 

    seriesFirstEntry!:Blog.Entry|null
    seriesPrevEntry!:Blog.Entry|null
    seriesNextEntry!:Blog.Entry|null
    seriesLatestEntry!:Blog.Entry|null
    seriesElement!:string 

    
    element(element:any = []) {
        let out = ""

        out += this.chronoElement
        out += this.seriesElement

        element.setInnerContent(out,{html:true})
    }
    constructor (BLOG:Blog.Entry){
        this.blog = BLOG
    }

    async init(){
        await this.getChrono()
        await this.getSeries()
    }

    async getChrono(){
        this.chronoFirstEntry = await Blog.Database.getByRow(1)
        this.chronoPrevEntry = await Blog.Database.getByRow(this.blog.entryNum - 1)
        this.chronoNextEntry = await Blog.Database.getByRow(this.blog.entryNum + 1)
        this.chronoLatestEntry = await Blog.Database.getLatest()

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

/**
 * blog table of contents
 */
export class BlogTOC {
    headers:string[][]
    
    element(element:any = []) {
    let out = ""

    this.headers.forEach((header)=>{
out+=`<h${header[1].length} class="blog-toc-link" onclick="scrollToElement('${header[0].toLowerCase().replaceAll(" ","-")}')">H${header[1].length}. ${header[0]}</h${header[1].length}>`
    })
        
    

    element.append(out,{html:true})
}
    constructor (headers:string[][]){
        this.headers = headers
    }
}


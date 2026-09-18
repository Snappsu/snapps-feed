/**
 * this file controls what a specific page should go through before being presented
 * to the user
 * 
 * this file works very closely with page-handlers.ts
 */

import { env } from "cloudflare:workers";
import * as Blog from "./blog"
import * as Feed from "./feed"
import * as Handlers from "./page-handlers"

/**
 * a container class for all the different pages that
 * need to be built
 */
export class Page {

    /**
     * builds the home page
     * @param page the requested page
     * @returns the final page content
     */
    static async home(page:any):Promise<Response>{

    // get entries
    var entriesFound:any = (await env.BLOG_DB.prepare(`SELECT rowid,[id],[title],[summary],[category],[tags],[published],[image] FROM [entries]`).run()).results
    //console.log(entriesFound)

    // --- arrange data ---
    let categories: Set<string> = new Set()
    let tags: Set<string> = new Set()
    let entries: Array<Blog.Entry> = []

    for (const entry in entriesFound)  {
        entries.push(new Blog.Entry(entriesFound[entry]))
        let tempCategories:Array<string> = JSON.parse(entriesFound[entry].category)
        tempCategories.forEach(category=>{categories.add(category)})
        let tempTags:Array<string> = JSON.parse(entriesFound[entry].tags)
        tempTags.forEach(tag=>{tags.add(tag)})
    }

let head = new Handlers.Head(env.BLOG_INFO.TITLE,env.BLOG_INFO.ROOT,env.BLOG_INFO.DESCRIPTION,"https://cdn.snapps.dev/images/buttonBIG.gif")
    await head.fetchImage()
    head.buildDiscordComponents()

    // --- build page ---
    let outHTML = new HTMLRewriter()
        .on("nav", new Handlers.NavBar)
        .on("#category-list",new Handlers.CategoryList([...categories]))
        .on("#tag-list",new Handlers.TagList([...tags]))
        .on("#blog-list",new Handlers.EntryList(entries.toReversed())) // the entries needs to be in reverse cronological order
        .on("img",new Handlers.DontDragImage)
        .on("*",new Handlers.Comment)
        .on("head", head)

    return outHTML.transform(page)
    }

    /**
     * builds the page for blog reader
     * @param page the requested page
     * @returns the final page content
     */
    static async blog(page:any, blog_id:string):Promise<Response>{
            
   
        try {
                
            let blog = await Blog.Database.getById(blog_id)

            if (blog==null) throw new Error ("blog not found!")

            // HACK: retroactively retrieves old content
            blog.content = blog.content.replaceAll("/res/","https://snapps.dev/res/")

            // get needed data
            let blogNav = new Handlers.BlogNav(blog)
            await blogNav.init()
            
            let head = new Handlers.Head(`${blog.tags.includes('nsfw')?"🔞 - ":""}${blog.title} - snapps' blog`,`https://feed.snapps.dev/blog/${blog.id}`,`${blog.published.toISOString()} - ${blog.summary}`,blog.image,blog.tags.includes('nsfw')?"#ff0080":null)
            await head.fetchImage()
            head.buildDiscordComponents(`blog/${blog_id}`)
            
            let headers:string[][] = []
            let headersFound = blog.content.matchAll(/^(#{1,3}) (.+)/gm)
            for (const match of headersFound) {
                headers.push([match[2],match[1]])
            }

            // --- build page ---
            let outHTML = new HTMLRewriter()
                .on("nav", new Handlers.NavBar)
                .on("article", new Handlers.BlogContent(blog.html()))  
                .on("#blog-toc-headers", new Handlers.BlogTOC(headers))
                .on("#info", new Handlers.BlogInfo(blog))
                .on(".blog-nav", blogNav)
                .on("*",new Handlers.Comment)
                .on("head", head)

            return outHTML.transform(page)
        } catch (error) {
            console.error(error)
            return await env.ASSETS.fetch(`${env.BLOG_INFO.ROOT}/404.html`)
        }
   
    }

    static async rssFeed():Promise<Response>{

        // create channel
        let name = `${env.BLOG_INFO.TITLE} - rss`
        let desc = env.BLOG_INFO.DESCRIPTION
        let link = env.BLOG_INFO.ROOT
        let lastChange:Date =  new Date(0); 
       

        // get blog entries
        let blogEntries:Blog.Entry[] = [] 
        var entriesFound:any = (await env.BLOG_DB.prepare(`SELECT rowid,*FROM [entries]`).run()).results
        entriesFound.forEach((entry:any)=>{
            let blog = new Blog.Entry(entry)
            if(blog.published > lastChange) lastChange = blog.published
            blogEntries.push(blog)
            
        })
        //console.log(blogEntries[0])
        

        // make channel
        let channel = new Feed.Channel(name,desc,link,blogEntries,lastChange)
        
        //build page
        let headers = new Headers()
        headers.append("content-type","application/xml")
        let response = new Response(channel.xml(),{headers:headers})
        return response
    }

    static async atomFeed():Promise<Response>{

        // create channel
        let name = `${env.BLOG_INFO.TITLE} - atom`
        let desc = env.BLOG_INFO.DESCRIPTION
        let link = env.BLOG_INFO.ROOT
        let lastChange:Date =  new Date(0); 
       

        // get blog entries
        let blogEntries:Blog.Entry[] = [] 
        var entriesFound:any = (await env.BLOG_DB.prepare(`SELECT rowid,*FROM [entries]`).run()).results
        entriesFound.forEach((entry:any)=>{
            let blog = new Blog.Entry(entry)
            if(blog.published > lastChange) lastChange = blog.published
            blogEntries.push(blog)
            
        })
        //console.log(blogEntries[0])
        

        // make channel
        let channel = new Feed.Channel(name,desc,link,blogEntries,lastChange)
        
        //build page
        let headers = new Headers()
        headers.append("content-type","application/atom")
        let response = new Response(channel.atom(),{headers:headers})
        return response
    }

    static async jsonFeed():Promise<Response>{

        // create channel
        let name = `${env.BLOG_INFO.TITLE} - json`
        let desc = env.BLOG_INFO.DESCRIPTION
        let link = env.BLOG_INFO.ROOT
        let lastChange:Date =  new Date(0); 
       

        // get blog entries
        let blogEntries:Blog.Entry[] = [] 
        var entriesFound:any = (await env.BLOG_DB.prepare(`SELECT rowid,*FROM [entries]`).run()).results
        entriesFound.forEach((entry:any)=>{
            let blog = new Blog.Entry(entry)
            if(blog.published > lastChange) lastChange = blog.published
            blogEntries.push(blog)
            
        })
        //console.log(blogEntries[0])
        

        // make channel
        let channel = new Feed.Channel(name,desc,link,blogEntries,lastChange)
        
        //build page
        let headers = new Headers()
        headers.append("content-type","application/json")
        let response = new Response(channel.json(),{headers:headers})
        return response
    }

    static async discordBlogEmbed(blog_id:string):Promise<Response>{
        
        try {
            // get blog
            let blog = await Blog.Database.getById(blog_id)
            if (blog==null) throw new Error ("blog not found!")
            // make page
                let headers = new Headers()
                headers.append("content-type","application/json")
                let response = new Response(blog.discordEmbed(),{headers:headers})
                return response
        } catch (error) {
            return Page.discordBaseEmbed()
        }
    }

    static async discordBaseEmbed(text?:string):Promise<Response>{
        
    let embed = {
        "component": {
                "type": 17,
                "spoiler": false,
                "accent_color": 1752220,
                "components": [
                    {
                        "type": 9,
                        "components": [
                            {
                            "type": 10,
                            "content": `# **[${env.BLOG_INFO.TITLE}](${env.BLOG_INFO.ROOT})**\n${env.BLOG_INFO.DESCRIPTION}`
                            }
                        ],
                        "accessory": {
                            "type": 2,
                            "style": 5,
                            "label": "Visit",
                            "url": env.BLOG_INFO.ROOT
                        }
                        },
                        {
                        "type": 14,
                        "divider": true,
                        "spacing": 1
                        },
                        {
                        "type": 12,
                        "items": [
                            {
                            "media": {
                                "url": "https://cdn.snapps.dev/images/buttonBIG.gif"
                            }
                            }
                        ]
                        },
                        {
                        "type": 14,
                        "divider": true
                        },
                        {
                        "type": 9,
                        "components": [
                            {
                            "type": 10,
                            "content": "## **About the Author**\nSome about-me stuffs..."
                            }
                        ],
                        "accessory": {
                            "type": 11,
                            "media": {
                            "url": "https://feed-staging.snapples64.workers.dev/res/images/me.png"
                            }
                        }
                    }
                ]
            }
    }

    let headers = new Headers()
    headers.append("content-type","application/json")
    let response = new Response(JSON.stringify(embed),{headers:headers})
    return response
    }

    
}


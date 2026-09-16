import { env } from "cloudflare:workers";
import * as Blog from './blog'

export class Channel{

    title:string;
    desc:string;
    link:string;
    items:Blog.Entry[];
    lastChange:Date = new Date(0);

    constructor(title:string,desc:string,link:string,entries:Blog.Entry[],lastChange:Date){
        this.title = title
        this.desc = desc
        this.link = link
        this.items = entries
        this.lastChange = lastChange
    }

    #buildItemsXML():string{
        let out = ""
        this.items.forEach((entry)=>{
            out +=
`<item>
<title>${entry.title}</title>
<link>${this.link}/blog/${entry.id}</link>
<description>${entry.summary}</description>
<guid>${entry.id}</guid>
<pubDate>${entry.published.toUTCString()}</pubDate>
<media:thumbnail url="${entry.image}" />
</item>`
        })
        
        return out
    }

    xml():string{
        let out = 
`<?xml version="1.0" encoding="UTF-8" ?>
<rss xmlns:media="https://www.rssboard.org/media-rss" version="2.0">
<channel>
<title>${this.title}</title>
<link>${this.link}</link>
<description>${this.desc}</description>
<language>en-us</language>
<webMaster>${env.BLOG_INFO.AUTHOR.EMAIL}</webMaster>
<lastBuildDate>${this.lastChange.toUTCString()}</lastBuildDate>
<category>Blog</category>
<image>
<url>https://cdn.snapps.dev/images/buttonBIG.gif</url>
<title>${this.title}</title>
<link>${this.link}</link>
</image>
${this.#buildItemsXML()}
</channel>
</rss>`
            return out
    }

    #buildItemsAtom():string{
        let out = ""
        this.items.forEach((entry)=>{
            out +=
`<entry>
<title>${entry.title}</title>
<id>${this.link}/blog/${entry.id}</id>
<updated>${entry.published.toISOString()}</updated>
<published>${entry.published.toISOString()}</published>
${entry.contentVer==1
?`<summary>Note: This blog is old and must be read via the blog site. Sorry!\nIn this blog:${entry.summary}</summary>
<link rel="alternate" href="${this.link}/blog/${entry.id}"/>`
:`<content type="text">${entry.text()}</content>`}
</entry>
`
        })
        
        return out
    }

    atom():string{
        let out = 
`<?xml version="1.0" encoding="UTF-8" ?>
<feed xmlns="http://www.w3.org/2005/Atom">
<title>${this.title}</title>
<link href="${this.link}"/>
<updated>${this.lastChange.toISOString()}</updated>
<author>
    <name>${env.BLOG_INFO.AUTHOR.NAME}</name>
    <email>${env.BLOG_INFO.AUTHOR.EMAIL}</email>
</author>
<id>${this.link}/</id>
<category term="Blog"/>
<icon>https://cdn.snapps.dev/images/embed-static.png</icon>
<logo>https://cdn.snapps.dev/images/buttonBIG.gif</logo>
<subtitle>${this.desc}</subtitle>
${this.#buildItemsAtom()}
</feed>`
            return out
    }

    json():string{
        let feed:any = {
            version:"https://jsonfeed.org/version/1.1",
            title:this.title,
            home_page_url:this.link,
            feed_url:this.link+"/json",
            description:this.desc,
            icon:"https://cdn.snapps.dev/images/embed-static.png",
            authors:[
                {
                    name:env.BLOG_INFO.AUTHOR.NAME
                }
            ],
            items: []
        }

        this.items.forEach((entry)=>{
            feed.items.push({
                id:entry.id,
                url:this.link+"/blog/"+entry.id,
                title:entry.title,
                content_text:entry.contentVer==1
?"Note: This blog is old and must be read via the blog site. Sorry!"
:entry.text(),
                summary:entry.summary,
                image:entry.image?entry.image:"https://cdn.snapps.dev/images/embed-static.png",
                date_published:entry.published.toISOString()
            })
        })
        return JSON.stringify(feed)
    }
    
}

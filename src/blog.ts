/**
 * all the important contents of a blog at a glance
 */

import { env } from "cloudflare:workers";

/**
 * the Command Conversion Matrix
 * keeps track of which versions has which commands
 * and how they should be converted
 */
var CCM:any = {
    'generic':{
        HEADER_1:{
            REGEX:/^#{1} (.+)/gm,
            HTML: (match:any,p1:any)=>{return `<h1 id="${p1.toLowerCase().replaceAll(" ","-")}" data-label="$1">${p1}</h1>`}
        }, 
        HEADER_2:{
            REGEX:/^#{2} (.+)/gm,
            HTML: (match:any,p1:any)=>{return `<h2 id="${p1.toLowerCase().replaceAll(" ","-")}">${p1}</h2>`}
        }, 
        HEADER_3:{
            REGEX:/^#{3} (.+)/gm,
            HTML: (match:any,p1:any)=>{return `<h3 id="${p1.toLowerCase().replaceAll(" ","-")}">${p1}</h3>`}
        }, 
        BOLD_ITALIC:{
            REGEX: /\*{3}(.+?)\*{3}/gm,
            HTML: "<b><i>$1</i></b>"
        },
        BOLD:{
            REGEX:/\*{2}(.+?)\*{2}/gm,
            HTML: "<b>$1</b>",
        },
        ITALIC:{
            REGEX: /(?<!\\)\*(.+?)\*/gm,
            HTML: "<i>$1</i>"
        },
        UNDERLINE:{
            REGEX: /__(.+?)__/gm,
            HTML: "<u>$1</u>"
        },
        IMAGE:{
            REGEX: /^!image\("([^"]+)(?:","([^"]*))?(?:","([^"]*))?\"\)/gm,
            HTML: `<a target="_blank" href="$1" title="$2"><img src="$1" class="$3"></a>`
        },
        /*
        EMBED:{
            REGEX: /\[(.+)\]\((.+\))/gm,
            HTML: `<a href="$2" target="_blank">$1</a>`
        },
        */
        LABELED_LINK:{
            REGEX: /\[([^\]]+)\]\(([^)]+)\)/gm,
            HTML: (match:any,p1:any,p2:any)=>{
                return `<a href="${p2}" target="_blank">${p1}</a>`}
        },
        RAW_LINK:{
            REGEX: / (?<!href=")(https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/gm,
            HTML: `<a href="$1" target="_blank">$1</a>`
        },
        BLOCKQUOTE:{
            REGEX: /(?<=\n)^(")(.+?)(")/gm,
            HTML: `<blockquote>\n$2\n</blockquote>`
        },
        COLLAPSEABLE_START:{
            REGEX: /^#> (.+)\n/gm,
            HTML: `<details><summary>$1</summary>`
        },
        COLLAPSEABLE_END:{
            REGEX: /^#<(?=\n)/gm,
            HTML: `</details>`
        },
        UNORDERED_LIST:{
            REGEX: /(?:\n?^\t*-.+)+/gm,
            HTML: function(match:any){
                let unorderedListItemRegex=/(\t*)- (.+)/gm
let listItems: { depth: number | undefined; cont: string | undefined; }[] = []; // depth, content

		[...match.matchAll(unorderedListItemRegex)].forEach((item)=>{
			listItems.push({depth:item[1]?.length,cont:item[2]})
		})

		// create list
		let listHTML = "<ul>"

		let depth = 0
		for (let index = 0; index < listItems.length; index++) {
			const item = listItems[index];

			// if something has gone catastrophically wrong somehow
			if (item===undefined||item.depth===undefined) return "";

			// if no diff
			if (item.depth==depth){
				listHTML+=`<li>${item.cont}</li>`
			}
			// if deeper
			else if (item.depth > depth){
				listHTML+=`<ul><li>${item.cont}</li>`
			}
			// if shallower
			else if (item.depth < depth){
				listHTML+=`</ul><li>${item.cont}</li>`
			}
		
			//set new depth
			depth = item.depth
		}

		// deal with remaining depth
		for (; depth > 0; depth--) {
			listHTML += "</ul>"
		}
		listHTML += "</ul>"
		
		return listHTML
            }
        },
        PARAGRAPH:{
            REGEX: /^([^<\n].+)/gm,
            HTML: "<p>$1</p>"
        }
       
    },
    2:{
        MUSIC_BUTTON:{
            REGEX: /!music\n\[(.+)\]\((.+)\)\n(.+)\n(.+)/gm,
            HTML: `<div onclick="playSong('$1')" class="song-btn"><span>click to play now!</span><span>$4 - $3</span></div>`
        },
        SOAPBOX_LINK :{
            REGEX: /!soapbox\("([^"]+)","([^"]+)"(?:,"([^"]+)")?\)/gm,
            HTML: (match:any, p1:any, p2:any, p3:any)=>{
                if(p3) return `<a class="soapbox-link" href="/blog/${p1}">${p3}</a>`
                else return `<a class="soapbox-link" href="/blog/${p1}">${p2}</a>`
            }
        }
    }
}

/**
 * a blog entry object
 */
export class Entry {
	entryNum!: number
	id!: string
    title!: string
    summary!: string
    category!: Array<string>
    tags!: Array<string>
    published!: Date
    image!: string|null
	content!: string
    contentVer!:number

    /**
     * 
     * @param ENTRYDATA - right from the database
     */
	constructor(ENTRYDATA:any){

		this.entryNum = ENTRYDATA.rowid
		this.id = ENTRYDATA.id
		this.title = ENTRYDATA.title
		this.summary = ENTRYDATA.summary
		this.category = JSON.parse(ENTRYDATA.category)
		this.tags = JSON.parse(ENTRYDATA.tags)
		this.published = new Date(parseInt(ENTRYDATA.published))
		this.image = ENTRYDATA.image
        this.contentVer = ENTRYDATA.content_ver
        this.content = ENTRYDATA.content
		if(ENTRYDATA.content) this.content = ENTRYDATA.content
	}

    isNSFW(){
        return this.tags.includes("nsfw")
    }

    link(){
        return `${env.BLOG_INFO.ROOT}/blog/${this.id}`
    }

    /**
     * builds the html string specifically for the blog reader to use
     * @returns said html string
     */
    html(){
        switch (this.contentVer) {
            case 1:
                return this.content
                break;
            default:
                let out = this.content 
                let commands = CCM[this.contentVer]
                for (const [command] of Object.entries(commands)) {
                    
                    try {
                        //console.log(out.match(commands[command].REGEX))
                        out = out.replaceAll(commands[command].REGEX, commands[command].HTML)
                    } catch (error) {

                    }
                }

                    for (const [command] of Object.entries(CCM['generic'])) {
                        //console.log(command)
                    try {
                        //console.log(out.match(CCM['generic'][command].REGEX))
                        out = out.replaceAll(CCM['generic'][command].REGEX, CCM['generic'][command].HTML)
                    } catch (error) {
                    }
                }

                return out
                break;
        }
    }

    /**
     * TODO: 
     * builds the text version of the blog for mor generic use
     * @returns blog text
     */
    text(){
        return this.content
    }

    /**
     * builds the card to be used for the entry list
     * @returns HTML string of the element
     */
    card(){
		
		let out = ""

		// start it off

		out += `<a href="${env.BLOG_INFO.ROOT}/blog/${this.id}" class="blog-entry
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

    discordEmbed(){
        let outline =   {
            "component": {
                "type": 17,
                "spoiler": false,
                "accent_color": this.isNSFW()?0xff2f00:parseInt(`0x${env.BLOG_INFO.COLOR}`, 16),
                "components": [
                    {
                    "type": 10,
                    "content": `# **[${env.BLOG_INFO.TITLE}](${env.BLOG_INFO.ROOT})**\n${env.BLOG_INFO.DESCRIPTION}`
                    },
                    {
                    "type": 14,
                    "divider": true,
                    "spacing": 1
                    },
                    {
                    "type": 9,
                    "components": [
                        {
                        "type": 10,
                        "content": `## [${this.isNSFW()?`🔞 NSFW - ${this}`:this.title}](${this.link()})\n${this.summary}`
                        }
                    ],
                    "accessory": {
                        "type": 2,
                        "style": 5,
                        "label": "Read Now",
                        "url": this.link()
                    }
                    },
                    {
                    "type": 12,
                    "items": [
                        {
                        "media": {
                            "url": this.image
                        }
                        }
                    ]
                    },
                    {
                    "type": 10,
                    "content": `-# Published: ${this.published}`
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
                        "content": `## **About the Author**\n${env.BLOG_INFO.AUTHOR.DESC}`
                        }
                    ],
                    "accessory": {
                        "type": 11,
                        "media": {
                        "url": env.BLOG_INFO.AUTHOR.ICON
                        }
                    }
                    }
                ]
            }
        }
        return JSON.stringify(outline)
    }
}

/**
 * blog database and database accessories
 */
export class Database {

    /**
     * get the blog with specified id
     * @param id - id of the blog to get
     * @returns - the raw database results
     */
    static async getById(id: string): Promise<Entry|null> {
        try {
            let results = (await env.BLOG_DB.prepare(`SELECT rowid,* FROM [entries] where id = "${id}" `).run()).results
            if (results.length==0) return null
            else return new Entry(results[0])
        } catch (error) {
            console.error(error)
            return null
        }
    }

    /**
     * get the blog on the specified row
     * @param - row the row number to query
     * @returns - the raw database results
     */
    static async getByRow(row: number): Promise<Entry|null> {
        try {
            let results = (await env.BLOG_DB.prepare(`SELECT rowid,* FROM [entries] where rowid = ${row} `).run()).results
            if (results.length==0) return null
            else return new Entry(results[0])
        } catch (error) {
            console.error(error)
            return null
        }
    }

    /**
     * gets the latest blog
     * @returns - the raw database results
     */
    static async getLatest(): Promise<Entry|null> {
        try {
            let results = (await env.BLOG_DB.prepare(`SELECT rowid,[id],[title],[summary],[category],[tags],[published],[image] FROM [entries] order by rowid desc LIMIT 1 `).run()).results
            if (results.length==0) return null
            else return new Entry(results[0])
        } catch (error) {
            console.error(error)
            return null
        }
    }


}

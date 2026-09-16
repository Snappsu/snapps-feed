import { env } from "cloudflare:workers";
import * as Blog from "./blog"
import * as Builder from "./page-building"


/* https://developers.cloudflare.com/workers/runtime-apis/html-rewriter/#element-handlers */

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
		console.log(request.headers)
		let url = new URL(request.url)
		let path = url.pathname.split("/")
		
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
				response = Builder.Page.home(await env.ASSETS.fetch(`${url.origin}/home.html`))
				break;
			case "blog":
				// if no blog specified; redirect to home
				if(!path[2]||path[2]=='') {
					const destinationURL = `${url.protocol}//${url.host}`;
					const statusCode = 301;
					return Response.redirect(destinationURL, statusCode)
				}

				response = Builder.Page.blog(await env.ASSETS.fetch(`${url.origin}/blog.html`),path[2])
				break;
			
			// retrofitting old feeds
			case "rss":
				response = Builder.Page.rssFeed()
				break;
			case "atom":
				response = Builder.Page.atomFeed()
				break;
			case "json":
				response = Builder.Page.jsonFeed()
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

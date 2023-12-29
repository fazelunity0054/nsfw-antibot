
import CrawlerConfig from './config.js';
import DastansFilter from './filters/dastans.js';
import { getCookieAndToken } from './antibot/cloudflare.js';
import {getSaveName, saveResponse} from './antibot/storageCache.js';
import fs from "fs";





const ContentFilters = [
    {
        name: "Dastans SSR",
        pathname: "/dastans",
        filter: DastansFilter
    }
]

/**
 * @param request {IncomingMessage}
 * @return {Promise<unknown>}
 */
export async function handleIncomeRequest(request) {
    request.cacahe = false;
    const urlObj = new URL(request.url);
    const cacheName = getSaveName(urlObj);
    const cachePath = process.cwd() + `/public/caches/buffer/${cacheName}.buffer`;
    const infoPath = process.cwd() + `/public/caches/info/${cacheName}.json`;
    const exists = fs.existsSync(cachePath) && fs.existsSync(infoPath);
    const valid = ()=>{
        if (urlObj.searchParams.has('cache')) return true;
        if (urlObj.searchParams.has('refetch')) return false;

        const info = JSON.parse(fs.readFileSync(infoPath).toString())
        const date = new Date(info.date);
        date.setDate(date.getDate() + 2);
        const now = new Date();

        return date > now;
    }

    const makeCacheResponse = () => {
        request.cache = true;
        const info = fs.readFileSync(infoPath)
        return new Response(
            fs.readFileSync(cachePath), JSON.parse(info.toString())
        )
    }

    if (exists && valid()) {
        console.log("HIT:",urlObj.pathname)
        return makeCacheResponse();
    }

    const headersArray = [];
    Object.entries(request.headers).forEach(([value, key]) => {
        if (!['cookie', 'set-cookie'].includes(key)) return;

        headersArray.push([key, value]);
    });
    const headers = Object.fromEntries(headersArray);
    const {token: cToken, cookie: cCookie} = await getCookieAndToken();
    headers.cookie = cCookie?.split?.(";")[0];
    let formData = new FormData();
    formData.append("token", cToken);
    formData.append("page", "0")

    const obj = new URL(request.url);
    const url = CrawlerConfig.url + obj.pathname + obj.search;
    return await forceFetch(url, {
        method: request.method,
        headers,
        body: obj.pathname.startsWith("/search") ? formData:null,
        mode: request.mode,
        referrer: url,
        referrerPolicy: "strict-origin-when-cross-origin",
        credentials: "include"
    });
}

export async function middleware(request) {
    let response = await handleIncomeRequest(request);
    let responseHeaders = {};

    if (response) {
        const appliedFilters = ContentFilters.filter(f => {
            try {
                return  f.pathname === new URL(response?.url ?? CrawlerConfig.url).pathname
            } catch{
                return false;
            }
        });

        response?.headers.forEach((value, key) => {
            responseHeaders[key] = value;
        });

        for (let appliedFilter of appliedFilters) {
            response = await appliedFilter.filter(response);
        }
    }
    let buffer = (await response?.arrayBuffer());
    if (!buffer) request.cache = true;

    const type = response.headers.get('content-type') ?? "";
    if (type.includes("html")) {
        const replacementUrl = new URL(CrawlerConfig.url);
        let source = Buffer.from(buffer).toString();
        source = source.replaceAll(CrawlerConfig.url, "");
        source = source.replaceAll(replacementUrl.host,"localhost");
        buffer = Buffer.from(source);
    }

    const res = new Response(buffer ?? "RETRY", {
        headers: responseHeaders,
        status: response?.status,
        statusText: response?.statusText
    });

    if (!request?.cache && (response.status > 100 && response.status < 400)) await saveResponse(request.url, res);

    return res;
}

export const config = {
    matcher: '/:path*',
}



export async function forceFetch(url, init = {}) {
    const {pathname, search} = new URL(url);

    if (pathname === "/pmnotiupdate") new Response(null, {
        status: 410
    })


    return await updateFetch(url, init);
}

export async function updateFetch(url, init) {
    const {pathname} = new URL(url)

    for (let i = 0; i < 5; i++) {
        try {
            return await new Promise((resolve, reject) => {
                fetch(url, init)
                    .then((response)=>{

                        resolve(response);
                    })
                    .catch((e) => {
                        console.log(`CATCH ON ${pathname} ${e?.message}`);
                        reject(e);
                        return true;
                    })
            })
        } catch (e) {}
    }

    console.log(`FAILED TO FETCH ${pathname}`);
}

export const runtime = 'nodejs';

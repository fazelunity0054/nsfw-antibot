import CrawlerConfig from '../config.js';
import { parse } from 'node-html-parser';
import { forceFetch } from '../middleware.js';
import * as fs from "fs";
import {updateFile} from "../utils/file.js";



export async function getCookieAndToken() {
    // if (1 === 1 /* TODO: Remove this before production */) return {
    //     cookie: "shsess=MTcwMzYyOTk1NnxEdi1CQkFFQ180SUFBUkFCRUFBQVhQLUNBQUVHYzNSeWFXNW5EQWNBQlhSdmEyVnVMbWRwZEdoMVlpNWpiMjB2YW05elpYQm9jM0IxY25KcFpYSXZZM055Wm1KaGJtRnVZUzVUZEhKcGJtZE5ZWERfZ3dRQkFRbFRkSEpwYm1kTllYQUJfNFFBQVF3QkRBQUFLUC1FSlFBQkFTOGdkbmN4U1c5ellXRk9aVVJHZEVORWNsWnhNbEpVWVd4d2VtNXBhbTVIWjBZPXwEU1oB8O20QapzRlnSgzO4VKhO3LF9C42kJwISJSjTWQ==; Path=/; Expires=Fri, 05 Jan 2024 22:32:36 GMT; Max-Age=864000; HttpOnly",
    //     token: "vw1IosaaNeDFtCDrVq2RTalpznijnGgF"
    // }

    const pre = getData().find((d) => !isExpired(d));
    if (pre) return pre;

    const response = await forceFetch(CrawlerConfig.url+"/dastans");

    if (response) {
        let cookie = response.headers.get('set-cookie')+"";

        const document = parse(await response.text());
        let token = document.getElementById("token")?.getAttribute("value")+"";
        let obj = {
            cookie,
            token
        };
        await saveData(obj);
        return obj;
    }
    console.log("ERR TOKEN")
}

/**
 *
 * @return {any[]}
 */
function getData() {
    const path = process.cwd()+"/public/data/tokens.data";
    return fs.existsSync(path) ? JSON.parse(fs.readFileSync(path)?.toString() ?? "[]") : [];
}

function isExpired(obj) {
    if (obj.date) {
        const date = new Date(obj.date);
        date.setHours(date.getHours() + 2);
        const now = new Date();
        return now > date;
    }

    return false;
}

async function saveData(obj) {
    obj.date = new Date().toLocaleString();
    const predata = getData();
    predata.push(obj);
    predata.filter(d => !isExpired(d));
    const file = new File([Buffer.from(JSON.stringify(predata,null,2))], "tokens.data", {
        type: "plain/text"
    })
    await updateFile(file, "/data/tokens.data","/data/tokens.data");
    console.log("SAVED")
}

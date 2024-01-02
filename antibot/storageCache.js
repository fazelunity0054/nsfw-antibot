import { updateFile } from '../utils/file.js';

const FOLDER = "/caches";

export function getSaveName({pathname, search}) {
    return pathname.replaceAll("/", "_")+"()"+search.replaceAll("&","_").replaceAll("?","_");
}

export async function saveResponse(url, response) {
    const urlObj = new URL(url);
    let {pathname, search} = urlObj;

    const saveName = getSaveName(urlObj);

    const buffer = await response.clone().arrayBuffer();
    const file = new File([Buffer.from(buffer)],saveName+".buffer", {
        type: response.headers.get('content-type')+""
    });

    const path = `${FOLDER}/buffer/${file.name}`
    await updateFile(file,path,path);

    let headers = {};
    response.headers.forEach((v, k) => {
        headers[k] = v;
    })

    const text = JSON.stringify({
        headers,
        status: response.status,
        date: new Date().toLocaleString()
    },null,2);



    const contentFile = new File([Buffer.from(text)],saveName+".json", {
        type: 'text/plain'
    });
    const contentPath = `${FOLDER}/info/${contentFile.name}`
    await updateFile(contentFile,contentPath,contentPath);
}

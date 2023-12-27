import { forceFetch, handleIncomeRequest } from '../middleware.js';
import { getCookieAndToken } from '../antibot/cloudflare.js';
import { parse } from 'node-html-parser';



export default async function DastansFilter(response) {

    const types = ["dastanbynewest","dastanbyoldest","dastanmstlks","dastanmstdslks","dastanmstvsts"];

    const url = new URL(response.url);

    const type = types.find((type) => url.searchParams.has(type));

    if (type) {
        const formData = new FormData();
        const {token, cookie} = await getCookieAndToken();
        formData.append("token", token);
        formData.append("page", url.searchParams.get('page') ?? "0");

        const newResponse = await forceFetch(`${url.origin}/search/${type}`, {
            headers: {
                cookie
            },
            body: formData,
            method: "POST",
            referrerPolicy: "strict-origin-when-cross-origin",
            credentials: "include"
        });
        const json = await newResponse?.json();
        const originText = await response.clone().text();
        const needReplace = renderDastans(json);

        const document = parse(originText);
        const table = document.querySelector(".table");
        if (table) {
            table.innerHTML = needReplace;
        }
        const title = document.querySelector('body div div.row h4 > strong');
        if (title) {
            title.innerHTML = getsortTitle(type);
        }

        return new Response(document.innerHTML, {
            headers: response.headers,
        })
    }

    return response;
}

const getsortTitle = (activeWindow) => {
    switch (activeWindow) {
        case "dastanbynewest":
            return "تازه‌ترین";

        case "dastanmstvsts":
            return "بیشترین بازدید";

        case "dastanmstlks":
            return "بیشترین لایک";

        case "dastanmstdslks":
            return "بیشترین دیسلایک";

        case "dastanbyoldest":
            return "قدیمی‌ترین";

        default:
            return "";
    }
};

export function renderDastans(dastansData) {

    if (dastansData.dastans && dastansData.dastans.length > 0) {
        var tableHTML = '<table class="table">' +
            '<thead>' +
            '<tr>' +
            '<th>نام داستان</th>' +
            '<th>برچسب</th>' +
            '<th>بازدیدها</th>' +
            '<th>👍</th>' +
            '<th>👎</th>' +
            '</tr>' +
            '</thead>' +
            '<tbody>';

        dastansData.dastans.forEach(function(d) {
            tableHTML += '<tr>' +
                '<td><a href="/dastan/' + d.slg + '">' + d.ttl + '</a></td>' +
                '<td>';

            if (d.tg3) {
                tableHTML += '<small><a href="/dastans/tag/' + d.tg3 + '">' + d.tg3 + '</a></small>, ';
            }
            if (d.tg2) {
                tableHTML += '<small><a href="/dastans/tag/' + d.tg2 + '">' + d.tg2 + '</a></small>, ';
            }
            if (d.tg1) {
                tableHTML += '<small><a href="/dastans/tag/' + d.tg1 + '">' + d.tg1 + '</a></small>, ';
            }

            tableHTML += '</td>' +
                '<td>' + d.vst + '</td>' +
                '<td>' + d.lks + '</td>' +
                '<td>' + d.dslk + '</td>' +
                '</tr>';
        });

        tableHTML += '</tbody></table>';

        return tableHTML;
    }

    return "";
}

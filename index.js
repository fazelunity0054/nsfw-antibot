import express from 'express';
import {middleware} from './middleware.js';

const app = express();
const PORT = process.env.PORT || 3000;
// in latest body-parser use like below.

// Custom middleware
app.use(async (req, res, next) => {
    try {
        const path = req.url;
        if (path.endsWith('update')) {
            res.end();
            return;
        }

        req.url = "http://localhost:3000" + path;
        const R =  await middleware(req); // get SOME RESPONSE type = Response
        R.headers.forEach((value, key) => {
            if (!['cookie', 'set-cookie', 'content-type'].includes(key)) return;
            try {
                res.setHeader(key, value);
            } catch {
            }
        })
        res.write(Buffer.from(await R.arrayBuffer()));
        res.status(res.statusCode);
        res.end()
    } catch (e) {
        console.error(e);
    }
});

// Example route
app.get('/', (req, res) => {
    res.send('Hello, World!');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

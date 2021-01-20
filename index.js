
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const fetch = require('node-fetch');
const crypto = require('crypto');
const { renameSync } = require('fs');
require('dotenv').config();

const app = new Koa();

// eslint-disable-next-line max-len
const channelSecret = process.env.CHANNEL_SECRET; // Channel secret string
const channelAccessToken = process.env.CHANNEL_ACCESS_TOKEN;


app.use(require('koa-static')('./image'));

app.use(bodyParser());

app.use(async (ctx, next) => {
    console.log(ctx.request.headers);
    console.log(ctx.request.body);
    console.log(ctx.request.origin);
    console.log(ctx.request.path);
    next();
});

app.use(async (ctx, next) => {
    const bodyStr = JSON.stringify(ctx.request.body);
    const signature = crypto
    .createHmac('SHA256', channelSecret)
    .update(bodyStr).digest('base64');
    if(ctx.request.headers['x-line-signature'] === signature) {
        ctx.response.status = 200;
        next();
    }else{
        ctx.response.status = 401;
    }
});


app.use(async (ctx) => {
    const replyToken = ctx.request.body.events?.[0].replyToken;
    const text = ctx.request.body.events?.[0].message?.text;
    console.log('replyToken & text');
    console.log(replyToken);
    console.log(ctx.request.body.events?.[0].message);
    if(replyToken && text) {
        let msg;
        switch(text) {
            case 'Ramen!':
                console.log('Ramen');
                let path = `https://${ctx.request.host}${getRamen(text)}`;
                console.log(path);
                msg = {
                    "type": "image",
                    "originalContentUrl": path,
                    "previewImageUrl": path+".preview",
                }
                replyMSG(replyToken, msg);
                ctx.response.status = 200;
                break;
            default:
                let reply = await getBullshit(text);
                msg = {
                    "type": "text",
                    "text": reply,
                }
                replyMSG(replyToken, msg);
                ctx.response.status = 200;
                break;
        }
    }else{
        ctx.body = 'Errrrrr';
        ctx.response.status = 404;
    }
});



function getRamen(text) {
    let i = new Date();
    i = i % 10;
    return `/${i}.jpg`;
}

async function getBullshit(text) {
    let bullshitContent = {
        Topic:' 俊俊很棒',
    };
    let bullshit = await fetch('https://api.howtobullshit.me/bullshit', {
        method: 'POST',
        heaeders: {
            'Content-Type': 'application//json',
        },
        body: JSON.stringify(bullshitContent),
    })
        .then(res => res.text())
        .then(r=>r);
    bullshit = bullshit.replace(/(&nbsp;|\<br\>)/g,'');
    if(/(GIN\ *GIN|俊\ *俊)/i.exec(text)) 
        bullshit = '噢, '+bullshit;
    else 
        bullshit = 'Puipui, 你是說「'+bullshit+'」嗎?';
    return bullshit;
}

async function replyMSG(replyToken, MSG) {
    const content = {
        replyToken: replyToken,
        messages:  [MSG],
    }
    fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: {
            'Content-Type' : 'application/json',
            'Authorization' : `Bearer ${channelAccessToken}`,
        },
        body: JSON.stringify(content),
    })
    .then(res => res.json())
    .then(j => console.log(j)); 
}

app.listen(process.env.PORT);
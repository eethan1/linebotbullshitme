
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const fetch = require('node-fetch');
const crypto = require('crypto');
require('dotenv').config();

const app = new Koa();

// eslint-disable-next-line max-len
const channelSecret = process.env.CHANNEL_SECRET; // Channel secret string
const channelAccessToken = process.env.CHANNEL_ACCESS_TOKEN;

app.use(bodyParser());

app.use(async (ctx, next) => {
    console.log(ctx.request.headers);
    console.log(ctx.request.body);
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
    if(replyToken && text) {
        reply(replyToken, text);
        ctx.response.status = 200;
    }
});

async function reply(replyToken, text) {
    let bullshitContent = {
        Topic:'GinGin 很厲害',
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
    if(/(GIN\ *GIN|俊俊)/i.exec(text)) 
        bullshit = 'A, '+bullshit;
    else 
        bullshit = '你是說「'+bullshit+'」嗎?';

    const content = {
        replyToken: replyToken,
        messages:  [{
            "type": "text",
            "text": bullshit,
        }],
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


app.listen(7130);
import { VercelRequest, VercelResponse } from '@vercel/node'
import chromium from 'chrome-aws-lambda'
import { Browser } from 'puppeteer-core'

interface Message {
  nickname: string
  avatar?: string
  content: string
}

export function render(messages: Message[], theme: string, width = 1600) {
  const realWidth = width / 2
  const colors = theme === 'dark'
    ? {
      color: 'white',
      message: '#0a061a',
      background: '#221f33',
    }
    : {
      color: 'black',
      message: '#fdfcff',
      background: '#f2f0fa',
    }
  const elements = messages.map(message => `
    <div class="message">
      <div class="avatar" ${
        !message.avatar
          ? '' 
          : `style="background-image: url(${message.avatar});"`
      }>${message.avatar ? '' : String(message.nickname[0]).toUpperCase()}</div>
      <div>
        <div class="name">${message.nickname}</div>
        <div class="content">${message.content}</div>
      </div>
    </div>
  `).join('')
  return `<!DOCTYPE html>
<html>

<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Noto+Sans+SC">
  <style>
    * {
      padding: 0;
      margin: 0;
      box-sizing: border-box;
      font-family: 'Noto Sans SC';
      color: ${colors.color};
    }

    body {
      transform: scale(2) translate(100%, 100%);
    }

    .container {
      background: ${colors.background};
      padding: 7px;
      width: ${realWidth}px;
      position: relative;
    }

    .header {
      width: 100%;
      height: 32px;
      display: flex;
      align-items: center;
    }

    .btns {
      position: absolute;
      display: grid;
      grid-auto-flow: column;
      grid-column-gap: 10px;
      left: 20px;
    }

    .btns > div {
      width: 15px;
      height: 15px;
      border-radius: 50%;
    }

    .title {
      width: 100%;
      height: 100%;
      text-align: center;
      line-height: 32px;
    }

    .message {
      display: grid;
      grid-template-columns: 64px auto;
      margin: 12px;
    }

    .avatar {
      border-radius: 50%;
      width: 48px;
      height: 48px;
      background-color: #cc0066;
      background-size: cover;
      background-repeat: no-repeat;
      text-align: center;
      line-height: 45px;
      font-size: 28px;
      color: white;
      margin: 8px;
    }

    .name {
      margin: 10px;
      font-weight: bold;
      font-size: 14px;
    }

    .content {
      float: left;
      margin-left: 10px;
      padding: 10px;
      background: ${colors.message};
      border-radius: 10px;
    }
  </style>
</head>

<body>
  <div class="container" id="container">
    <div class="header">
      <div class="btns">
        <div style="background: #ff5f56;"></div>
        <div style="background: #ffbd2e;"></div>
        <div style="background: #27c93f;"></div>
      </div>
      <div class="title">聊天记录</div>
    </div>
    ${elements}
  </div>
</body>

</html>`
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  let { messages, theme, width } = request.query
  if (Array.isArray(messages)) messages = messages[0]
  if (Array.isArray(theme)) theme = theme[0]
  if (Array.isArray(width)) width = width[0]
  let browser: Browser = null
  try {
    browser = await chromium.puppeteer.launch({
      args: chromium.args.concat('--disable-web-security'),
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
    const page = await browser.newPage()
    await page.setContent(render(JSON.parse(messages) || [], theme, parseInt(width) || undefined))
    await page.waitForNetworkIdle()
    const container = await page.waitForSelector('#container')
    response.setHeader('content-type', 'image/png')
    return response.end(await container.screenshot({
      encoding: 'binary'
    }));
  } finally {
    browser?.close()
  }
}
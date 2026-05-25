import type { GasApiFile } from '@/lib/gas/manifest-guard';
import type { Template, TemplateSummary } from './types';

const WEBAPP_MANIFEST: GasApiFile = {
  name: 'appsscript',
  type: 'JSON',
  source: JSON.stringify(
    {
      timeZone: 'Asia/Taipei',
      exceptionLogging: 'STACKDRIVER',
      runtimeVersion: 'V8',
      webapp: { executeAs: 'USER_DEPLOYING', access: 'ANYONE' },
    },
    null,
    2,
  ),
};

const LINEBOT_MANIFEST: GasApiFile = {
  name: 'appsscript',
  type: 'JSON',
  source: JSON.stringify(
    {
      timeZone: 'Asia/Taipei',
      exceptionLogging: 'STACKDRIVER',
      runtimeVersion: 'V8',
      webapp: { executeAs: 'USER_DEPLOYING', access: 'ANYONE' },
      oauthScopes: ['https://www.googleapis.com/auth/script.external_request'],
    },
    null,
    2,
  ),
};

const SHEETS_MANIFEST: GasApiFile = {
  name: 'appsscript',
  type: 'JSON',
  source: JSON.stringify(
    {
      timeZone: 'Asia/Taipei',
      exceptionLogging: 'STACKDRIVER',
      runtimeVersion: 'V8',
      webapp: { executeAs: 'USER_DEPLOYING', access: 'ANYONE' },
      oauthScopes: ['https://www.googleapis.com/auth/spreadsheets'],
    },
    null,
    2,
  ),
};

const TEMPLATES: Template[] = [
  {
    id: 'hello-webapp',
    name: 'Hello Web App',
    category: 'webapp',
    description: '最簡單的 Web App，用來測試部署流程是否正常。',
    requiredSettings: [],
    files: [
      WEBAPP_MANIFEST,
      {
        name: 'Code',
        type: 'SERVER_JS',
        source:
`function doGet() {
  return HtmlService.createHtmlOutput(
    '<h1>Hello from GAS Mobile Deployer</h1>'
    + '<p>部署時間：' + new Date().toLocaleString() + '</p>'
  );
}
`,
      },
    ],
  },

  {
    id: 'line-bot-echo',
    name: 'LINE Bot Echo',
    category: 'linebot',
    description: '收到 LINE 訊息後原樣回覆，用來驗證 webhook 接通。',
    postDeployHint:
`1. 複製上方 Web App URL。
2. 到 LINE Developers Console → 你的 Messaging API channel → Messaging API 設定。
3. Webhook URL 貼上剛複製的網址 → 開啟「Use webhook」。
4. 點「Verify」應顯示 Success。
5. 在 LINE 加你的官方帳號好友，傳訊息應收到 echo。`,
    requiredSettings: [
      {
        key: 'LINE_CHANNEL_ACCESS_TOKEN',
        label: 'LINE Channel Access Token',
        placeholder: '在 LINE Developers Console「Messaging API」分頁取得',
        type: 'password',
        required: true,
      },
    ],
    files: [
      LINEBOT_MANIFEST,
      {
        name: 'Code',
        type: 'SERVER_JS',
        source:
`const CHANNEL_ACCESS_TOKEN = '__LINE_CHANNEL_ACCESS_TOKEN__';

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    (body.events || []).forEach(handleEvent);
  } catch (err) {
    console.error(err);
  }
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return;
  reply(event.replyToken, event.message.text);
}

function reply(replyToken, text) {
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + CHANNEL_ACCESS_TOKEN },
    payload: JSON.stringify({
      replyToken: replyToken,
      messages: [{ type: 'text', text: text }],
    }),
    muteHttpExceptions: true,
  });
}
`,
      },
    ],
  },

  {
    id: 'sheets-webapp',
    name: 'Google Sheets Web App',
    category: 'sheets',
    description: '把 Google Sheets 變成一個讀寫網頁，doGet 顯示資料、doPost 寫入新列。',
    postDeployHint:
`1. 第一次開啟 Web App URL，Google 會要求授權存取試算表。
2. 確認試算表的存取權限，必要時把試算表分享給部署者帳號。
3. 想新增欄位可在試算表第一列加入；後端會自動讀取所有欄。`,
    requiredSettings: [
      {
        key: 'SHEET_ID',
        label: 'Google Sheet ID',
        placeholder: '從試算表網址 /d/<這段>/edit 複製',
        type: 'text',
        required: true,
        help: '範例 1A2B3C... 約 44 字元',
      },
      {
        key: 'SHEET_NAME',
        label: '分頁名稱',
        placeholder: '工作表1',
        type: 'text',
        required: true,
      },
    ],
    files: [
      SHEETS_MANIFEST,
      {
        name: 'Code',
        type: 'SERVER_JS',
        source:
`const SHEET_ID = '__SHEET_ID__';
const SHEET_NAME = '__SHEET_NAME__';

function getSheet() {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
}

function doGet() {
  const template = HtmlService.createTemplateFromFile('Index');
  template.rows = getSheet().getDataRange().getValues();
  return template.evaluate().setTitle('Sheet Web App');
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const row = Array.isArray(data.row) ? data.row : Object.values(data);
  getSheet().appendRow(row);
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
`,
      },
      {
        name: 'Index',
        type: 'HTML',
        source:
`<!DOCTYPE html>
<html>
  <head><meta charset="utf-8" /><title>Sheet</title>
    <style>body{font-family:sans-serif;padding:16px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px 10px;font-size:14px}th{background:#f5f5f5}</style>
  </head>
  <body>
    <h1>Sheet 內容</h1>
    <table>
      <? rows.forEach(function(r, i) { ?>
        <tr>
          <? r.forEach(function(c) { ?>
            <? if (i === 0) { ?><th><?= c ?></th><? } else { ?><td><?= c ?></td><? } ?>
          <? }); ?>
        </tr>
      <? }); ?>
    </table>
  </body>
</html>
`,
      },
    ],
  },

  {
    id: 'form-auto-reply',
    name: 'Google Form 自動回信',
    category: 'form',
    description:
      'Google 表單送出後自動寄信給填寫者。需要在表單上手動裝觸發器（程式碼註解內有步驟）。',
    postDeployHint:
`此模板不需要 Web App URL，要在 Apps Script 編輯器執行：
1. 打開 Apps Script 編輯器 → 左側「觸發條件」 → 新增觸發條件。
2. 函式選 onFormSubmit、事件來源選「來自表單」、事件類型選「提交表單時」。
3. 確認觸發條件後，填一次表單測試應收到回信。`,
    requiredSettings: [
      {
        key: 'REPLY_SUBJECT',
        label: '自動回信主旨',
        placeholder: '謝謝你的回覆',
        required: true,
      },
      {
        key: 'REPLY_BODY',
        label: '自動回信內容',
        placeholder: '我們已收到你的回覆，會在 3 個工作天內聯絡你。',
        required: true,
      },
      {
        key: 'EMAIL_FIELD_LABEL',
        label: '表單裡的 Email 欄位標題',
        placeholder: '電子郵件',
        required: true,
        help: '系統會用這個標題在回覆裡找對方信箱',
      },
    ],
    files: [
      {
        name: 'appsscript',
        type: 'JSON',
        source: JSON.stringify(
          {
            timeZone: 'Asia/Taipei',
            exceptionLogging: 'STACKDRIVER',
            runtimeVersion: 'V8',
            oauthScopes: [
              'https://www.googleapis.com/auth/forms.currentonly',
              'https://www.googleapis.com/auth/script.send_mail',
            ],
          },
          null,
          2,
        ),
      },
      {
        name: 'Code',
        type: 'SERVER_JS',
        source:
`const REPLY_SUBJECT = '__REPLY_SUBJECT__';
const REPLY_BODY = '__REPLY_BODY__';
const EMAIL_FIELD_LABEL = '__EMAIL_FIELD_LABEL__';

/**
 * 由表單提交觸發。請在編輯器手動建立觸發器：
 *   觸發條件 → 函式 onFormSubmit、事件類型「提交表單時」
 */
function onFormSubmit(e) {
  const responses = e.response.getItemResponses();
  let email = null;
  for (const r of responses) {
    if (r.getItem().getTitle().trim() === EMAIL_FIELD_LABEL) {
      email = String(r.getResponse()).trim();
      break;
    }
  }
  if (!email) {
    console.warn('No email field found');
    return;
  }
  MailApp.sendEmail({
    to: email,
    subject: REPLY_SUBJECT,
    body: REPLY_BODY,
  });
}
`,
      },
    ],
  },
];

export function listTemplates(): TemplateSummary[] {
  return TEMPLATES.map(({ id, name, category, description }) => ({ id, name, category, description }));
}

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

/** 把 source 內 __KEY__ 替換成使用者填寫的值。未填的欄位保留原樣 (__KEY__)。 */
export function applyTemplateSettings(
  files: GasApiFile[],
  settings: Record<string, string>,
): GasApiFile[] {
  return files.map((f) => {
    let src = f.source;
    for (const [key, val] of Object.entries(settings)) {
      // JSON 模板要先 escape，避免使用者填的字串內含 " 把 manifest 弄壞
      const safe = f.type === 'JSON' ? jsonEscape(val) : jsEscape(val);
      src = src.split(`__${key}__`).join(safe);
    }
    return { ...f, source: src };
  });
}

function jsEscape(s: string): string {
  // 使用者輸入會被插入字串字面值內，需要 escape 反斜線、單引號、換行
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}

function jsonEscape(s: string): string {
  return JSON.stringify(s).slice(1, -1);
}

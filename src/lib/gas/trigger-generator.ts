// Apps Script 觸發器 setup code generator
// 純函式，輸入 config，輸出可貼進 Code.gs 的 setupTriggers() 程式碼。

export type TimeUnit = 'minutes' | 'hours' | 'days' | 'weeks';
export type Weekday =
  | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY'
  | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export type TriggerConfig =
  | {
      kind: 'time';
      handler: string;
      // 每 N 分鐘 / 小時
      everyMinutes?: 1 | 5 | 10 | 15 | 30;
      everyHours?: number;       // 1~12
      // 或：每天 at hour
      dailyAtHour?: number;      // 0~23
      // 或：每週 weekday at hour
      weeklyOn?: Weekday;
      weeklyAtHour?: number;
    }
  | {
      kind: 'spreadsheet-edit' | 'spreadsheet-open' | 'spreadsheet-formsubmit' | 'spreadsheet-change';
      handler: string;
      spreadsheetId: string;
    }
  | {
      kind: 'form-submit';
      handler: string;
      formId: string;
    };

/** 產生「列出所有觸發器」helper —— 使用者在原生編輯器執行後在 logs 看結果。 */
export function generateListTriggersCode(): { handlerSkeleton: string; postInstallHint: string } {
  return {
    handlerSkeleton:
`// === GAS Mobile Deployer: trigger inspector (start) ===
/**
 * 列出此專案所有已安裝的觸發器。
 * 用法：在 Apps Script 編輯器函式下拉選 listTriggers → ▶
 * 結果會印在「執行記錄」分頁。
 */
function listTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  if (triggers.length === 0) {
    console.log('(沒有已安裝的觸發器)');
    return;
  }
  triggers.forEach(function (t, i) {
    console.log((i + 1) + '. handler=' + t.getHandlerFunction()
      + '  source=' + t.getTriggerSource()
      + '  eventType=' + t.getEventType()
      + '  id=' + t.getUniqueId());
  });
}
// === GAS Mobile Deployer: trigger inspector (end) ===
`,
    postInstallHint:
`已加入 listTriggers() helper。請：
1. 儲存。
2. 開 Apps Script 編輯器（底部「🔗 開啟原生編輯器」）。
3. 函式下拉選 listTriggers，按 ▶。
4. 切到「執行記錄」分頁看結果。

註：原生編輯器左側選單也有「觸發條件」可直接視覺化檢視與刪除。`,
  };
}

/** 產生「全部清除觸發器」helper —— 危險操作，需使用者親自執行。 */
export function generateClearAllTriggersCode(): { handlerSkeleton: string; postInstallHint: string } {
  return {
    handlerSkeleton:
`// === GAS Mobile Deployer: trigger cleaner (start) ===
/**
 * ⚠ 危險操作：刪除此專案「所有」觸發器（包含其他人裝的）。
 * 通常用在「我搞砸了，想全部重設」的情境。
 * 用法：在 Apps Script 編輯器函式下拉選 clearAllTriggers → ▶
 */
function clearAllTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function (t) { ScriptApp.deleteTrigger(t); });
  console.log('Deleted ' + triggers.length + ' trigger(s).');
}
// === GAS Mobile Deployer: trigger cleaner (end) ===
`,
    postInstallHint:
`已加入 clearAllTriggers() helper。⚠ 這會刪掉所有觸發器，請確認：
1. 儲存。
2. 開 Apps Script 編輯器，函式下拉選 clearAllTriggers，按 ▶。
3. 在「執行記錄」確認刪除數量。
4. 之後再用「+ 新增觸發器」重新安裝你要的。`,
  };
}

export type GeneratedCode = {
  setupFn: string;           // 整個 setupTriggers() 函式內容
  handlerSkeleton: string;   // event handler 函式骨架
  requiredScopes: string[];  // manifest oauthScopes 該補的
  postInstallHint: string;   // UI 給使用者看的下一步說明
};

export function generateTriggerCode(cfg: TriggerConfig): GeneratedCode {
  const handler = sanitizeFnName(cfg.handler);

  switch (cfg.kind) {
    case 'time': return generateTimeDriven(cfg, handler);
    case 'spreadsheet-edit':
    case 'spreadsheet-open':
    case 'spreadsheet-change':
    case 'spreadsheet-formsubmit':
      return generateSpreadsheetDriven(cfg, handler);
    case 'form-submit': return generateFormDriven(cfg, handler);
  }
}

function sanitizeFnName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9_$]/g, '').replace(/^[0-9]/, '_$&');
  return cleaned || 'myHandler';
}

function generateTimeDriven(
  cfg: Extract<TriggerConfig, { kind: 'time' }>,
  handler: string,
): GeneratedCode {
  let triggerExpr = '';
  let humanDesc = '';

  if (cfg.everyMinutes) {
    triggerExpr = `.timeBased().everyMinutes(${cfg.everyMinutes})`;
    humanDesc = `每 ${cfg.everyMinutes} 分鐘`;
  } else if (cfg.everyHours) {
    triggerExpr = `.timeBased().everyHours(${cfg.everyHours})`;
    humanDesc = `每 ${cfg.everyHours} 小時`;
  } else if (cfg.weeklyOn && cfg.weeklyAtHour != null) {
    triggerExpr = `.timeBased().onWeekDay(ScriptApp.WeekDay.${cfg.weeklyOn}).atHour(${cfg.weeklyAtHour})`;
    humanDesc = `每週 ${cfg.weeklyOn} 的 ${pad(cfg.weeklyAtHour)}:00`;
  } else {
    const hour = cfg.dailyAtHour ?? 7;
    triggerExpr = `.timeBased().atHour(${hour}).everyDays(1)`;
    humanDesc = `每天 ${pad(hour)}:00`;
  }

  const setupFn = wrapSetup(handler, `ScriptApp.newTrigger('${handler}')${triggerExpr}.create();`);
  const handlerSkeleton =
`/**
 * 時間觸發：${humanDesc}
 * 第一次需在 Apps Script 編輯器手動執行 setupTriggers() 一次來安裝。
 */
function ${handler}() {
  console.log('${handler} run at', new Date());
  // TODO: 在這裡寫你的邏輯
}
`;

  return {
    setupFn,
    handlerSkeleton,
    requiredScopes: ['https://www.googleapis.com/auth/script.scriptapp'],
    postInstallHint:
`觸發器已產生但尚未啟用。請：
1. 儲存（按「儲存」按鈕）。
2. 開 Apps Script 編輯器（用底部「開啟原生編輯器」按鈕）。
3. 在編輯器上方函式下拉選 setupTriggers，按 ▶ 執行一次。
4. 完成。之後系統會 ${humanDesc} 自動執行 ${handler}。

如需移除觸發器：到 Apps Script 編輯器 → 觸發條件 → 刪除。`,
  };
}

function generateSpreadsheetDriven(
  cfg: Extract<TriggerConfig, { kind: 'spreadsheet-edit' | 'spreadsheet-open' | 'spreadsheet-change' | 'spreadsheet-formsubmit' }>,
  handler: string,
): GeneratedCode {
  const eventMap = {
    'spreadsheet-edit': { method: 'onEdit', label: '編輯儲存格時' },
    'spreadsheet-open': { method: 'onOpen', label: '開啟試算表時' },
    'spreadsheet-change': { method: 'onChange', label: '結構改變時' },
    'spreadsheet-formsubmit': { method: 'onFormSubmit', label: '連結的表單送出時' },
  } as const;
  const { method, label } = eventMap[cfg.kind];

  const setupFn = wrapSetup(
    handler,
    `var ss = SpreadsheetApp.openById('${cfg.spreadsheetId.replace(/'/g, "\\'")}');\n  ` +
      `ScriptApp.newTrigger('${handler}').forSpreadsheet(ss).${method}().create();`,
  );

  const eventParam = cfg.kind === 'spreadsheet-formsubmit' || cfg.kind === 'spreadsheet-edit' ? 'e' : 'e';
  const handlerSkeleton =
`/**
 * 試算表觸發：${label}
 * 第一次需在 Apps Script 編輯器手動執行 setupTriggers() 一次來安裝。
 */
function ${handler}(${eventParam}) {
  ${cfg.kind === 'spreadsheet-formsubmit'
    ? `// e.values = ['時間戳記', '欄1值', '欄2值', ...]\n  // e.namedValues = { '欄1標題': ['值'], ... }\n  console.log(e.namedValues);`
    : cfg.kind === 'spreadsheet-edit'
    ? `// e.range, e.value, e.oldValue\n  console.log('edited:', e.range.getA1Notation(), '=', e.value);`
    : `console.log('${method} triggered');`}
  // TODO: 在這裡寫你的邏輯
}
`;

  return {
    setupFn,
    handlerSkeleton,
    requiredScopes: [
      'https://www.googleapis.com/auth/script.scriptapp',
      'https://www.googleapis.com/auth/spreadsheets',
    ],
    postInstallHint:
`觸發器已產生但尚未啟用。請：
1. 儲存（按「儲存」按鈕）。
2. 開 Apps Script 編輯器（底部「開啟原生編輯器」按鈕）。
3. 在編輯器上方函式下拉選 setupTriggers，按 ▶ 執行一次。
4. Google 會要求授權存取試算表，按授權。
5. 完成。之後 ${label}會自動執行 ${handler}。`,
  };
}

function generateFormDriven(
  cfg: Extract<TriggerConfig, { kind: 'form-submit' }>,
  handler: string,
): GeneratedCode {
  const setupFn = wrapSetup(
    handler,
    `var form = FormApp.openById('${cfg.formId.replace(/'/g, "\\'")}');\n  ` +
      `ScriptApp.newTrigger('${handler}').forForm(form).onFormSubmit().create();`,
  );
  const handlerSkeleton =
`/**
 * Google 表單觸發：表單送出時
 * 第一次需在 Apps Script 編輯器手動執行 setupTriggers() 一次來安裝。
 */
function ${handler}(e) {
  // e.response.getItemResponses() 取出每一題答案
  var responses = e.response.getItemResponses();
  for (var i = 0; i < responses.length; i++) {
    console.log(responses[i].getItem().getTitle(), ':', responses[i].getResponse());
  }
  // TODO: 在這裡寫你的邏輯
}
`;
  return {
    setupFn,
    handlerSkeleton,
    requiredScopes: [
      'https://www.googleapis.com/auth/script.scriptapp',
      'https://www.googleapis.com/auth/forms',
    ],
    postInstallHint:
`觸發器已產生但尚未啟用。請：
1. 儲存。
2. 開 Apps Script 編輯器，函式下拉選 setupTriggers，▶ 執行。
3. 授權後完成。之後表單送出時會執行 ${handler}。`,
  };
}

// 把多個觸發器設定合併進一個 setupTriggers 函式
function wrapSetup(handler: string, createExpr: string): string {
  return `// === 由 GAS Mobile Deployer 產生 ===
// 第一次安裝：在 Apps Script 編輯器手動執行一次 setupTriggers()
// 之後不需要再執行（除非要新增/移除觸發器）。
function setupTriggers() {
  // 先清掉同名舊觸發器，避免重複安裝
  var existing = ScriptApp.getProjectTriggers();
  for (var i = 0; i < existing.length; i++) {
    if (existing[i].getHandlerFunction() === '${handler}') {
      ScriptApp.deleteTrigger(existing[i]);
    }
  }
  ${createExpr}
  console.log('Trigger installed for ${handler}');
}
`;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** 注入帶有 marker 的程式碼塊到 source。若已存在同樣 marker 的塊，就取代而非堆疊。 */
export function injectMarkedBlock(currentSource: string, markerName: string, body: string): string {
  let out = currentSource;
  if (!out.endsWith('\n')) out += '\n';
  const startMark = `// === GAS Mobile Deployer: ${markerName} (start) ===`;
  const endMark = `// === GAS Mobile Deployer: ${markerName} (end) ===`;
  const rx = new RegExp(`${escapeReg(startMark)}[\\s\\S]*?${escapeReg(endMark)}\\n?`);
  const block = `${startMark}\n${body.trim()}\n${endMark}\n`;
  if (rx.test(out)) out = out.replace(rx, block);
  else out += '\n' + block;
  return out;
}

/** 注入 setupTriggers + handler skeleton。 */
export function injectIntoSource(currentSource: string, gen: GeneratedCode): string {
  return injectMarkedBlock(currentSource, 'trigger setup', `${gen.setupFn}\n${gen.handlerSkeleton}`);
}

/** 注入單一已 marker 化的 helper（listTriggers / clearAllTriggers 已自帶 marker，不要再包） */
export function injectRawHelper(currentSource: string, markerName: string, helperBlock: string): string {
  // helperBlock 內部已含 marker，先剝掉，交給 injectMarkedBlock 統一加
  const stripped = helperBlock
    .replace(/^\/\/ === GAS Mobile Deployer: [^\n]*\(start\) ===\n?/, '')
    .replace(/\/\/ === GAS Mobile Deployer: [^\n]*\(end\) ===\n?$/, '');
  return injectMarkedBlock(currentSource, markerName, stripped);
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

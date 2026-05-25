import type { GasApiFile, GasFileType } from './manifest-guard';

// UI 顯示名稱 ↔ API name 對照。集中於此，禁止散落各處。
// API: { name: "Code", type: "SERVER_JS" } ↔ UI: "Code.gs"
//      { name: "Index", type: "HTML"     } ↔ UI: "Index.html"
//      { name: "appsscript", type: "JSON" } ↔ UI: "appsscript.json"

export function extensionForType(type: GasFileType): string {
  switch (type) {
    case 'SERVER_JS':
      return '.gs';
    case 'HTML':
      return '.html';
    case 'JSON':
      return '.json';
  }
}

export function toDisplayName(file: { name: string; type: GasFileType }): string {
  if (file.type === 'JSON' && file.name === 'appsscript') return 'appsscript.json';
  return `${file.name}${extensionForType(file.type)}`;
}

export function fromDisplayName(displayName: string): { name: string; type: GasFileType } {
  if (displayName === 'appsscript.json') return { name: 'appsscript', type: 'JSON' };
  const dot = displayName.lastIndexOf('.');
  if (dot < 0) return { name: displayName, type: 'SERVER_JS' };
  const base = displayName.slice(0, dot);
  const ext = displayName.slice(dot).toLowerCase();
  switch (ext) {
    case '.gs':
    case '.js':
      return { name: base, type: 'SERVER_JS' };
    case '.html':
      return { name: base, type: 'HTML' };
    case '.json':
      return { name: base, type: 'JSON' };
    default:
      return { name: base, type: 'SERVER_JS' };
  }
}

export const DEFAULT_MANIFEST: GasApiFile = {
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

export const DEFAULT_CODE_GS: GasApiFile = {
  name: 'Code',
  type: 'SERVER_JS',
  source: `function doGet() {\n  return HtmlService.createHtmlOutput('Hello from GAS Mobile Deployer');\n}\n`,
};

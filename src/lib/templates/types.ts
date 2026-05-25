import type { GasApiFile } from '@/lib/gas/manifest-guard';

export type TemplateCategory = 'webapp' | 'linebot' | 'form' | 'sheets';

export type RequiredSetting = {
  key: string;          // 在模板 source 內以 __KEY__ 形式被替換
  label: string;
  placeholder?: string;
  type?: 'text' | 'password';
  required?: boolean;
  help?: string;
};

export type Template = {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  /** 部署成功後顯示的下一步提示，會接在通用文案後 */
  postDeployHint?: string;
  files: GasApiFile[];
  requiredSettings: RequiredSetting[];
};

export type TemplateSummary = Pick<Template, 'id' | 'name' | 'category' | 'description'>;

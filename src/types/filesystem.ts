export type FileType = 'file' | 'directory' | 'shortcut';

export interface FSNode {
  name: string;
  type: FileType;
  icon?: string;
  created: string;
  modified: string;
  size?: number;
  content?: string;
  children?: FSNode[];
  target?: string;
  readOnly?: boolean;
}

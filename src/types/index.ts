export interface StructuredError {
  code: string;
  message: string;
  recovery?: string[];
}

export interface WorkspaceContext {
  root: string;
  source: 'env' | 'arg' | 'mcpRoot' | 'cwd';
}

export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
export interface JsonObject {
  [key: string]: JsonValue;
}
export type JsonArray = JsonValue[];

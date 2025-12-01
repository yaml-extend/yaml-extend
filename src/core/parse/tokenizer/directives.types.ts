import { BasicState, RawToken } from "./tokenizerTypes.js";

export enum MainTokenTypes {
  STRING = "STRING",
  ARGS = "ARGS",
  EOF = "EOF",
}

export enum ArgsTokenTypes {
  KEY_VALUE = "KEY_VALUE",
  COMMA = "COMMA",
  EOF = "EOF",
}

export enum KeyValueTokenTypes {
  KEY = "KEY",
  EQUAL = "EQUAL",
  VALUE = "VALUE",
  EOF = "EOF",
}

export type MainTokenizerState = BasicState;

export type StringTokenizerState = BasicState;

export type ArgsTonizerState = BasicState;

export type KeyValueTokenizerState = BasicState & {
  afterEqual: boolean;
};

export type DirectiveToken = BasicState;

export type DirectiveMainToken = RawToken<string> & {
  type: MainTokenTypes;
  keyValueTokens?: DirectiveKeyValueToken[];
  argsMarkOpen?: RawToken<string>;
  argsMarkClose?: RawToken<string>;
};

export type DirectiveKeyValueToken = RawToken<string> & {
  type: KeyValueTokenTypes;
};

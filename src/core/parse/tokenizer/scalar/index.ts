import { tokenizeText } from "./text.js";
import { TempParseState } from "../../parseTypes.js";

//////////////

// Tokenizer is split into five steps as follows:
//  - first step is text tokenizer which devide input into: either $<Expr> or <Text> ${<Expr>} <Text>
//  - second step is expression tokenizer which takes every <Expr> token from previous step and tokenize it into: $[Path ...](<Args>) as <Type>
//  - third step is args tokenizer which takes <Args> token from previous step and tokenize it into: [<KeyValuePair> ,,,]
//  - fourth step is keyValue tokenizer which takges <KeyValuePair> token from previous step and tokenize it into: <Key>=<Value>
//  - fifth and last step includes passing the <value> token again to the text tokenizer, making a loop until text is fully resolved

/////////////

// main functions
export function tokenizeScalar(input: string, tempState: TempParseState) {
  return tokenizeText(input, undefined, tempState);
}

// This file has all the regex used in the lib. regex is used to capture and validate YAML string passed.

/** Regex to capture and verify YAML files paths. */
export const pathRegex =
  /^(?:[\/\\]|[A-Za-z]:[\/\\]|\.{1,2}[\/\\])?(?:[^\/\\\s]+[\/\\])*[^\/\\\s]+\.ya?ml$/;

/** Regex to capture directive end mark. */
export const dirEndRegex = /\n---\s*\n/;

/** Regex to capture tags. */
export const captureTagsRegex =
  /(?:^|\s)(!(?:[^\s\!]*!)?[^\s!\{\}\[\]]+)(?=\s|$)/g;

/** Regex to verify structure of the tag. */
export const tagsStrucRegex =
  /^!(?:[A-Za-z0-9\/\\_\-#*\.@$]*!)?([A-Za-z0-9\/\\_\-#*\.@$]+)(?:\(([A-Za-z0-9\/\\_\-#*\.@$]+)\))?$/;

/** Regex to capture error when invalid character is used inside regex. */
export const invalidTagCharRegex =
  /^!(?=[\s\S]*([^A-Za-z0-9\/\\_\-#*\.@$!()']))[\s\S]+$/;

/** Regex to capture if a path has .yaml or .yml in it or not. */
export const fileNameRegex = /.ya?ml$/;

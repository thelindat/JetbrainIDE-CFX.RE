export interface NativeParam {
  name: string;
  type: string;
}

export interface NativeDefinition {
  name: string;
  params: NativeParam[];
  results: string;
  description: string;
  examples: [];
  hash: string;
  ns: string;
  jhash: string;
  manualHash: boolean;
  return_type?: string;
  comment?: string;
  apiset?: string;
  aliases?: string[];
  old_names?: string[];
}

export function GetNativeType(type: string, input = false) {
  switch (type.toLowerCase()) {
    case "vector3":
    case "string":
    case "void":
      return type;

    case "char":
    case "char*":
      return "string";

    case "hash":
      return input ? "integer | string" : "integer";

    case "bool":
      return "boolean";

    case "object":
      return "table";

    case "func":
      return "function";

    case "float":
      return "number";

    case "uint":
    case "entity":
    case "player":
    case "decisionmaker":
    case "fireid":
    case "ped":
    case "vehicle":
    case "cam":
    case "cargenerator":
    case "group":
    case "train":
    case "pickup":
    case "object_1":
    case "weapon":
    case "interior":
    case "blip":
    case "texture":
    case "texturedict":
    case "coverpoint":
    case "camera":
    case "tasksequence":
    case "sphere":
    case "scrhandle":
    case "int":
    case "long":
    case "itemset":
    case "animscene":
    case "perschar":
    case "popzone":
    case "prompt":
    case "propset":
    case "volume":
      return "integer";

    default:
      return "any";
  }
}

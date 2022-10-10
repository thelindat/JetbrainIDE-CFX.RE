import { FilesBuilder } from "./files-builder";
import { stripIndents } from "common-tags";
import { NativeDefinition, NativeParam } from "./types";

interface TemplateObject {
  desc: string;
  ns: string;
  function: string;
}

/**
 * The [[ContentGenerate]] class allows to generate procedurally all the content necessary for the construction of templates
 */
export class ContentGenerate {
  /**
   * Instance of the object [[FilesBuilder]]
   */
  private filesBuilder: FilesBuilder;

  /**
   * Instance of a generated documentation
   */
  private generateDocs: string = "";

  /**
   * Template to generate documentation and shortcuts for native speakers
   *
   * @param description
   * @param param
   * @param returnType
   * @param _function
   *
   * @return template
   */
  private template = (
    description: string,
    param: string,
    returnType: string | string[],
    _function: string
  ) => `${description}${param || ""}${
    returnType !== "void"
      ? typeof returnType === "object"
        ? this.createMultipleReturnTypes(returnType)
        : `\n---@return ${returnType}`
      : ""
  }
${_function}

`;

  /**
   * Convert string array of return types to a single string with luadocs return types
   * @param types Array of types to convert
   * @returns string
   */
  private createMultipleReturnTypes = (types: string[]): string => {
    let returnTypes: string = "";

    for (let i = 0; i < types.length; i++) {
      if (types[i] === "void") continue;
      returnTypes +=
        returnTypes === "" ? `\n---@return ${types[i]}` : `, ${types[i]}`;
    }

    return returnTypes;
  };

  private buildTemplate = (templateObj: TemplateObject) => {
    let baseTemplate = stripIndents`
            ---${templateObj.desc}
        `;
  };

  /**
   * Builder allowing the instance of difference objects / utility values for the generation of the template as well as the update of the file to contain the native
   *
   * @param filesBuilder Class instance [[FilesBuilder]]
   */
  constructor(filesBuilder: FilesBuilder) {
    this.filesBuilder = filesBuilder;
  }

  private static ConvertNativeType(
    nativeType: string | string[]
  ): string | string[] {
    if (typeof nativeType === "object") {
      let newTypes: string[] = [];
      for (let i = 0; i < nativeType.length; i++) {
        const type: string = nativeType[i].toLowerCase();

        switch (type) {
          case "vector3":
          case "string":
          case "void":
            newTypes.push(type);
            break;

          case "char":
          case "char*":
            newTypes.push("string");
            break;

          case "ped":
          case "vehicle":
          case "entity":
          case "object_1":
          case "float":
          case "long":
          case "uint":
          case "int":
          case "player":
          case "blip":
          case "cam":
          case "fireid":
          case "blip":
          case "pickup":
          case "hash":
            newTypes.push("number");
            break;

          case "bool":
            newTypes.push("boolean");
            break;

          case "object":
            newTypes.push("table");
            break;

          case "func":
            newTypes.push("function");
            break;

          default:
            newTypes.push("any");
            break;
        }
      }
      return newTypes;
    } else {
      nativeType = nativeType.toLowerCase();

      switch (nativeType) {
        case "vector3":
        case "string":
        case "void":
          return nativeType;

        case "char":
        case "char*":
          return "string";

        case "ped":
        case "vehicle":
        case "entity":
        case "object_1":
        case "float":
        case "long":
        case "uint":
        case "int":
        case "player":
        case "blip":
        case "cam":
        case "fireid":
        case "blip":
        case "pickup":
          return "number";

        case "bool":
          return "boolean";

        case "object":
          return "table";

        case "func":
          return "function";

        case "hash":
          return "number | string"; // natives that accept Hash will call GetHashKey; this is also needed when using backticks

        default:
          return "any";
      }
    }
  }

  /**
   * Replace LUA Method to string for fix generating issue
   *
   * @param field
   */
  private fieldToReplace = (field: string): string => {
    switch (field) {
      case "end":
        return "_end";

      case "repeat":
        return "_repeat";

      default:
        return field;
    }
  };

  /**
   * Allows to generate the native template in a procedural way one by one
   *
   * @param data Request the result of the query to the API of the FiveM natives
   *
   * @return void
   */
  public generateTemplate = (data: JSON): void => {
    /**
     * Current count native build
     */
    let stats = {
      native: {
        total: 0,
        current: 0,
      },
    };

    for (const category in data)
      for (const _ in data[category]) {
        stats.native.total++;
      }

    for (const category in data)
      for (const native in data[category]) {
        /**
         * Shortcut of data[category][natives]
         */
        const jsonNative: NativeDefinition = data[category][native];

        /**
         * Generation of the native name
         */
        const nativeName: string = this.nativeName(jsonNative, native);

        /**
         * Convert pointers to the return types and remove the pointer symbol
         */
        const [newReturnTypes, newParams] = this.convertOutParams(jsonNative);

        jsonNative.params = newParams;

        /**
         * Returns parameters in different formats
         */
        const nativeParams: {
          luaDocs: string;
          params: string;
        } = this.nativeParams(jsonNative);

        const functionTemplate = `function ${nativeName}(${nativeParams.params}) end`;

        this.generateDocs = this.template(
          this.nativeDescription(jsonNative),
          nativeParams.luaDocs,
          ContentGenerate.ConvertNativeType(newReturnTypes),
          functionTemplate
        );

        this.filesBuilder.update(
          stats,
          category,
          this.generateDocs,
          nativeName
        );
      }
  };

  /**
   * Array containing all natives that have pointers that aren't a return type
   */
  // I didn't know what else to name it
  private nonReturnPointerNatives: string[] = [
    // Entity*
    "DELETE_ENTITY",
    "SET_ENTITY_AS_NO_LONGER_NEEDED",
    // Ped*
    "SET_PED_AS_NO_LONGER_NEEDED",
    "DELETE_PED",
    "REMOVE_PED_ELEGANTLY",
    // Vehicle*
    "SET_VEHICLE_AS_NO_LONGER_NEEDED",
    "DELETE_MISSION_TRAIN",
    "DELETE_VEHICLE",
    "SET_MISSION_TRAIN_AS_NO_LONGER_NEEDED",
    // Object*
    "DELETE_OBJECT",
    "SET_OBJECT_AS_NO_LONGER_NEEDED",
    // Vector3*
    "SET_PLAYER_WANTED_CENTRE_POSITION",
    "_START_SHAPE_TEST_SURROUNDING_COORDS",
    // Blip*
    "REMOVE_BLIP",
    //int*
    "SET_BIT",
    "CLEAR_BIT",
  ];

  /**
   * Check if the native name is in nonReturnPointerNatives
   * @param name Name of the native
   * @returns boolean
   */
  private isNonReturnPointerNative = (name: string): boolean => {
    return this.nonReturnPointerNatives.includes(name);
  };

  /**
   * Seperate the Object and object types used in different ways
   * @param type Type of the native parameter
   * @returns string
   */
  private seperateObjectTypes = (type: string): string => {
    return type.includes("Object") ? type.replace("Object", "object_1") : type;
  };

  /**
   * Returns the return types and params of the native with the pointers removed from the params and moved to the return types (except for non return pointer natives, which are defined in nonReturnPointerNatives or natives with the type "char")
   * @param data Data of the native to convert the params from
   * @returns Array<string[], NativeParam[]>
   */
  private convertOutParams = (
    data: NativeDefinition
  ): [string[], NativeParam[]] => {
    const params: NativeParam[] = data.params;
    const returnType: string = this.seperateObjectTypes(data.results);
    const newReturnTypes: string[] = [returnType];

    for (let i = 0; i < params.length; i++) {
      let type: string = this.seperateObjectTypes(params[i].type).toLowerCase();
      params[i].type = type;

      if (!type.includes("*")) continue;

      if (returnType === "void" && newReturnTypes[0] === returnType)
        newReturnTypes.shift();

      type = type.substring(0, type.length - 1);

      if (this.isNonReturnPointerNative(data.name) || type === "char") {
        params[i].type = type;
        continue;
      }

      newReturnTypes.push(type);
    }

    return [newReturnTypes, params];
  };

  /**
   * `nativeName` is used to format and generate the name of the native return by the FiveM api
   *
   * @param data Request the result of the query to the API of the FiveM natives
   * @param natives Request the result of the query to the API of the FiveM natives data[category]
   *
   * @return String
   */
  private nativeName = (data: any, natives: string): string => {
    if (data.name !== undefined || natives !== undefined)
      return (data.name || natives)
        .toLowerCase()
        .replace("0x", "n_0x")
        .replace(/_([a-z])/g, (_, bit: string) => bit.toUpperCase())
        .replace(/^([a-z])/, (_, bit: string) => bit.toUpperCase());
  };

  /**
   * "nativeParams" Is used to generate the parameters of the native wish and its LUA documentation.
   *
   * @param data Request the result of the query to the API of the FiveM natives
   *
   * @return JSON<String luaDocs, String params, String paramsWithType>
   */
  private nativeParams = (
    data: NativeDefinition
  ): { luaDocs: string; params: string } => {
    /**
     * "luaDocs" Allows to save the generation of LUA documentation and return it
     *
     * "params" Allows to save the generation of the native parameters and to return it.
     */
    let luaDocs: string = "",
      params: string = "";

    let paramPos = 0;
    for (let i = 0; i < data.params.length; i++) {
      const nativeParam = data.params[i];

      if (nativeParam.type.includes("*")) continue;

      const convNativeType = ContentGenerate.ConvertNativeType(
        nativeParam.type
      );

      luaDocs += `\n---@param ${this.fieldToReplace(
        nativeParam.name
      )} ${convNativeType}`;
      params +=
        (paramPos != 0 ? ", " : "") + this.fieldToReplace(nativeParam.name);
      paramPos++;
    }

    return { luaDocs: luaDocs, params: params };
  };

  /**
   * `nativeDescription` Allows to check if a description exists on the native wish and therefore returned a different result according to the natives
   *
   * @param data Request the result of the query to the API of the FiveM natives
   *
   * @return String Returns the description of the native or a prefect text indicating the lack of official description
   */
  private nativeDescription = ({
    description,
    hash,
  }: NativeDefinition): string => {
    let baseDesc = description
      ? description.replace(/^/gm, "--- ")
      : "--- This native does not have an official description.";

    // Attach natives url;
    baseDesc += `\n--- [Native Documentation](https://docs.fivem.net/natives/?_${hash})`;

    return baseDesc;
  };

  /**
   * `nativeUsage` Allows to automatically generate the native's usage pattern with all the details necessary for an instant understanding
   *
   * @param data Request the result of the query to the API of the FiveM natives
   * @param nativeParams Results generated from the nativeParams() function of the class [[ContentGenerate]]
   *
   * @return string Returns the predefined pattern
   */
  private nativeUsage = (data: any, nativeParams: string): string => {
    const template = (result, native, params) =>
      `${result} ${native}(${params});`;

    return template(data.results, data.name, nativeParams);
  };
}

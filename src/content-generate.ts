import { FilesBuilder } from "./files-builder";
import { stripIndents } from "common-tags";
import { NativeDefinition } from "./types";

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
    returnType: string,
    _function: string
  ) => `
${description}${param ? `${param}` : ""}${
    returnType !== "void" ? `\n---@return ${returnType}` : ""
  }
${_function}
`;

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

  private static ConvertNativeType(nativeType: string) {
    const discardPtr = (
      nativeType.charAt(nativeType.length - 1) === "*"
        ? nativeType.substring(0, nativeType.length - 1)
        : nativeType
    ).toLowerCase();

    switch (discardPtr) {
      case "vector3":
      case "string":
      case "void":
        return discardPtr;

      case "char":
        return "string";
      case "ped":
      case "vehicle":
      case "entity":
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
        return "number | string"

      default:
        return "any";
    }
  }

  /**
   * Replace LUA Method to string for fix generating issue
   *
   * @param field
   */
  private fieldToReplace = (field): string => {
    if (field === "end") return "end_";
    else if (field === "repeat") return "_repeat";
    else return field;
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
      for (const natives in data[category]) {
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
         * Returns parameters in different formats
         */
        const nativeParams: {
          luaDocs: string;
          params: string;
          paramsWithType: string;
        } = this.nativeParams(jsonNative);

        const functionTemplate = `function ${nativeName}(${
          this.nativeParams(jsonNative).params
        }) end`;

        this.generateDocs = this.template(
          this.nativeDescription(jsonNative),
          nativeParams.luaDocs,
          ContentGenerate.ConvertNativeType(jsonNative.results),
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
        .replace(/_([a-z])/g, (sub, bit) => bit.toUpperCase())
        .replace(/^([a-z])/, (sub, bit) => bit.toUpperCase());
  };

  /**
   * "nativeParams" Is used to generate the parameters of the native wish and its LUA documentation.
   *
   * @param data Request the result of the query to the API of the FiveM natives
   *
   * @return JSON<String luaDocs, String params>
   */
  private nativeParams = (
    data: NativeDefinition
  ): { luaDocs: string; params: string; paramsWithType: string } => {
    /**
     * "luaDocs" Allows to save the generation of LUA documentation and return it
     *
     * "params" Allows to save the generation of the native parameters and to return it.
     */
    let luaDocs: string = "",
      params: string = "",
      paramsWithType: string = "";

    for (let i = 0; i < data.params.length; i++) {
      const nativeParam = data.params[i];

      const convNativeType = ContentGenerate.ConvertNativeType(
        nativeParam.type
      );

      luaDocs += `\n---@param ${nativeParam.name} ${convNativeType}`;

      params += (i != 0 ? "," : "") + this.fieldToReplace(nativeParam.name);

      paramsWithType +=
        (i != 0 ? "," : "") +
        nativeParam.type +
        " " +
        this.fieldToReplace(data.params[i].name);
    }

    return { luaDocs: luaDocs, params: params, paramsWithType: paramsWithType };
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

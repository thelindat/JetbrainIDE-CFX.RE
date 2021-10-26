interface NativeParam {
  name: string
  type: string
}

export interface NativeDefinition {
  name: string
  params: NativeParam[]
  results: string
  description: string
  examples: []
  hash: string
  ns: string
  jhash: string
  manualHash: boolean
}

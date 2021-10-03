import { Deserialize, FieldOptions, Serialize } from './types'

export interface SerializationFunctions<TValue, TSerialized> {
  serialize: Serialize<TValue, TSerialized>
  deserialize: Deserialize<TValue, TSerialized>
}

export function getSerializationFunctions<TValue, TSerialized>(
  options: FieldOptions<TValue, TSerialized>
): SerializationFunctions<TValue, TSerialized> {
  const {
    serialize = (value) => value as unknown as TSerialized,
    deserialize = (value) => value as unknown as TValue,
  } = options

  return { serialize, deserialize }
}

import { getSerializationFunctions } from './serialization'
import { DefaultSerialized, FieldOptions, Shared } from './types'

export type Get<TValue> = () => Promise<TValue>
export type Set<TValue> = (value: TValue) => Promise<void>

export interface ReadonlyField<TValue> {
  get: Get<TValue>
}

export interface Field<TValue> extends ReadonlyField<TValue> {
  set: Set<TValue>
}

export interface FieldParams<TValue, TSerialized> {
  shared: Shared
  name: string
  options?: FieldOptions<TValue, TSerialized>
}

export function createReadonlyField<TValue, TSerialized = DefaultSerialized>(
  params: FieldParams<TValue, TSerialized>
): ReadonlyField<TValue> {
  const { shared, name, options = {} } = params
  const { deserialize } = getSerializationFunctions(options)

  const get: Get<TValue> = async () => {
    const value = await shared.request<TSerialized>({ method: 'get', url: name })
    return deserialize(value)
  }

  return {
    get,
  }
}

export function createField<TValue, TSerialized = DefaultSerialized>(
  params: FieldParams<TValue, TSerialized>
): Field<TValue> {
  const { shared, name, options = {} } = params
  const { serialize } = getSerializationFunctions(options)

  const readonlyField = createReadonlyField(params)

  const set: Set<TValue> = async (value) => {
    await shared.request({ method: 'put', url: name, data: serialize(value) })
  }

  return {
    ...readonlyField,
    set,
  }
}

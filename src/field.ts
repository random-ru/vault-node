import { Shared } from './types'

type Get<TValue> = () => Promise<TValue>
type Set<TValue> = (value: TValue) => Promise<void>

export type ReadonlyField<TValue> = {
  get: Get<TValue>
}

export type Field<TValue> = ReadonlyField<TValue> & {
  set: Set<TValue>
}

type FieldParams = {
  shared: Shared
  name: string
}

export function createReadonlyField<TValue>(params: FieldParams): ReadonlyField<TValue> {
  const { shared, name } = params

  return {
    get: () => shared.request({ method: 'get', url: name }),
  }
}

export function createField<TValue>(params: FieldParams): Field<TValue> {
  const { shared, name } = params

  return {
    ...createReadonlyField(params),
    set: (value) => shared.request({ method: 'put', url: name, data: value }),
  }
}

import { FieldParams, Get, Set } from './field'
import { getSerializationFunctions } from './serialization'
import { DefaultSerialized } from './types'

type Primitive = number | string | boolean
type PredicateOnly<TValue> = (value: TValue) => boolean
type Predicate<TValue> = TValue extends Primitive ? TValue | PredicateOnly<TValue> : PredicateOnly<TValue>

type GetOne<TValue> = (predicate: Predicate<TValue>) => Promise<TValue | null>
type AddOne<TValue> = (value: TValue) => Promise<TValue>
type UpdateOne<TValue> = (predicate: Predicate<TValue>, value: Partial<TValue>) => Promise<TValue | null>
type DeleteOne<TValue> = (predicate: Predicate<TValue>) => Promise<TValue | null>
type DeleteAll<TValue> = (predicate: Predicate<TValue>) => Promise<TValue[]>

export interface ReadonlyCollection<TValue> {
  get: Get<TValue[]>
  getOne: GetOne<TValue>
}

export interface Collection<TValue> extends ReadonlyCollection<TValue> {
  set: Set<TValue[]>
  addOne: AddOne<TValue>
  updateOne: UpdateOne<TValue>
  deleteOne: DeleteOne<TValue>
  deleteAll: DeleteAll<TValue>
}

function withPrimitives<TValue>(predicate: Predicate<TValue>): PredicateOnly<TValue> {
  const isCallback = typeof predicate === 'function'
  if (isCallback) return predicate
  return (value) => value === predicate
}

export function createReadonlyCollection<TValue, TSerialized = DefaultSerialized>(
  params: FieldParams<TValue, TSerialized>
): ReadonlyCollection<TValue> {
  const { name, shared, options = {} } = params
  const { deserialize } = getSerializationFunctions(options)

  const get: Get<TValue[]> = async () => {
    const values = await shared.request<TSerialized[]>({ method: 'get', url: name })
    return values.map(deserialize)
  }

  const getOne: GetOne<TValue> = async (predicate) => {
    const values = await get()
    return values.find(withPrimitives(predicate)) || null
  }

  return {
    get,
    getOne,
  }
}

export function createCollection<TValue, TSerialized = DefaultSerialized>(
  params: FieldParams<TValue, TSerialized>
): Collection<TValue> {
  const { name, shared, options = {} } = params
  const { serialize } = getSerializationFunctions(options)

  const readonlyCollection = createReadonlyCollection<TValue>(params)

  const set: Set<TValue[]> = async (values) => {
    const serialized = values.map(serialize)
    await shared.request({ method: 'put', url: name, data: serialized })
  }

  const addOne: AddOne<TValue> = async (value) => {
    const values = await readonlyCollection.get()
    await set(values.concat(value))
    return value
  }

  const updateOne: UpdateOne<TValue> = async (predicate, updates) => {
    const values = await readonlyCollection.get()
    let done = false
    let updated: TValue | null = null
    const newCollection = values.map((value) => {
      const matches = withPrimitives(predicate)(value)
      if (!matches || done) return value
      updated = { ...value, ...updates }
      done = true
      return updated
    })
    await set(newCollection)
    return updated
  }

  const deleteOne: DeleteOne<TValue> = async (predicate) => {
    const values = await readonlyCollection.get()
    let done = false
    let deleted: TValue | null = null
    const newCollection = values.filter((value) => {
      const matches = withPrimitives(predicate)(value)
      if (done) return true
      if (!matches) return true
      deleted = value
      done = true
      return false
    })
    await set(newCollection)
    return deleted
  }

  const deleteAll: DeleteAll<TValue> = async (predicate) => {
    const values = await readonlyCollection.get()
    const deleted: TValue[] = []
    const newCollection = values.filter((value) => {
      const matches = withPrimitives(predicate)(value)
      if (!matches) return true
      deleted.push(value)
      return false
    })
    await set(newCollection)
    return deleted
  }

  return {
    ...readonlyCollection,
    set,
    addOne,
    updateOne,
    deleteOne,
    deleteAll,
  }
}

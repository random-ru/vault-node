import { FieldParams } from './field'
import { getSerializationFunctions } from './serialization'
import { DefaultSerialized } from './types'

type Primitive = number | string | boolean
type PredicateOnly<TValue> = (value: TValue) => boolean
type Predicate<TValue> = TValue extends Primitive ? TValue | PredicateOnly<TValue> : PredicateOnly<TValue>

type GetAll<TValue> = (predicate?: Predicate<TValue>) => Promise<TValue[]>
type SetAll<TValue> = (values: TValue[]) => Promise<void>
type GetOne<TValue> = (predicate: Predicate<TValue>) => Promise<TValue | null>
type AddOne<TValue> = (value: TValue) => Promise<TValue>
type AddMultiple<TValue> = (values: TValue[]) => Promise<TValue[]>
type DeleteOne<TValue> = (predicate: Predicate<TValue>) => Promise<TValue | null>
type DeleteAll<TValue> = (predicate: Predicate<TValue>) => Promise<TValue[]>

type Updater<TValue> = Partial<TValue> | ((value: TValue) => Partial<TValue>)
type UpdateOne<TValue> = (predicate: Predicate<TValue>, updater: Updater<TValue>) => Promise<TValue | null>
type UpdateAll<TValue> = (predicate: Predicate<TValue>, updater: Updater<TValue>) => Promise<TValue[]>

export interface ReadonlyCollection<TValue> {
  getAll: GetAll<TValue>
  getOne: GetOne<TValue>
}

export interface Collection<TValue> extends ReadonlyCollection<TValue> {
  setAll: SetAll<TValue>
  addOne: AddOne<TValue>
  addMultiple: AddMultiple<TValue>
  updateOne: UpdateOne<TValue>
  updateAll: UpdateAll<TValue>
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

  const getAll: GetAll<TValue> = async (predicate) => {
    const values = await shared.request<TSerialized[]>({ method: 'get', url: name })
    if (!predicate) return values.map(deserialize)
    return values.map(deserialize).filter(withPrimitives(predicate))
  }

  const getOne: GetOne<TValue> = async (predicate) => {
    const values = await getAll()
    return values.find(withPrimitives(predicate)) || null
  }

  return {
    getAll,
    getOne,
  }
}

export function createCollection<TValue, TSerialized = DefaultSerialized>(
  params: FieldParams<TValue, TSerialized>
): Collection<TValue> {
  const { name, shared, options = {} } = params
  const { serialize } = getSerializationFunctions(options)

  const readonlyCollection = createReadonlyCollection<TValue>(params)

  const setAll: SetAll<TValue> = async (values) => {
    const serialized = values.map(serialize)
    await shared.request({ method: 'put', url: name, data: serialized })
  }

  const addOne: AddOne<TValue> = async (value) => {
    const values = await readonlyCollection.getAll()
    await setAll(values.concat(value))
    return value
  }

  const addMultiple: AddMultiple<TValue> = async (added) => {
    const values = await readonlyCollection.getAll()
    await setAll(values.concat(added))
    return added
  }

  const updateOne: UpdateOne<TValue> = async (predicate, updater) => {
    const values = await readonlyCollection.getAll()
    let done = false
    let updated: TValue | null = null
    const newCollection = values.map((value) => {
      const matches = withPrimitives(predicate)(value)
      if (!matches || done) return value
      const updates = typeof updater === 'function' ? updater(value) : updater
      updated = { ...value, ...updates }
      done = true
      return updated
    })
    await setAll(newCollection)
    return updated
  }

  const updateAll: UpdateAll<TValue> = async (predicate, updater) => {
    const values = await readonlyCollection.getAll()
    const updatedAll: TValue[] = []
    const newCollection = values.map((value) => {
      const matches = withPrimitives(predicate)(value)
      if (!matches) return value
      const updates = typeof updater === 'function' ? updater(value) : updater
      const updated = { ...value, ...updates }
      updatedAll.push(updated)
      return updated
    })
    await setAll(newCollection)
    return updatedAll
  }

  const deleteOne: DeleteOne<TValue> = async (predicate) => {
    const values = await readonlyCollection.getAll()
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
    await setAll(newCollection)
    return deleted
  }

  const deleteAll: DeleteAll<TValue> = async (predicate) => {
    const values = await readonlyCollection.getAll()
    const deleted: TValue[] = []
    const newCollection = values.filter((value) => {
      const matches = withPrimitives(predicate)(value)
      if (!matches) return true
      deleted.push(value)
      return false
    })
    await setAll(newCollection)
    return deleted
  }

  return {
    ...readonlyCollection,
    setAll,
    addOne,
    addMultiple,
    updateOne,
    updateAll,
    deleteOne,
    deleteAll,
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { createField, createReadonlyField, Field, ReadonlyField } from './field'
import { Shared } from './types'

type Primitive = number | string | boolean
type PredicateOnly<TSingle> = (value: TSingle) => boolean
type Predicate<TSingle> = TSingle extends Primitive ? TSingle | PredicateOnly<TSingle> : PredicateOnly<TSingle>

type GetOne<TSingle> = (predicate: Predicate<TSingle>) => Promise<TSingle | null>
type AddOne<TSingle> = (value: TSingle) => Promise<TSingle>
type UpdateOne<TSingle> = (predicate: Predicate<TSingle>, value: Partial<TSingle>) => Promise<TSingle | null>
type DeleteOne<TSingle> = (predicate: Predicate<TSingle>) => Promise<TSingle | null>

export type ReadonlyCollection<TSingle> = ReadonlyField<TSingle[]> & {
  getOne: GetOne<TSingle>
}

export type Collection<TSingle> = Field<TSingle[]> &
  ReadonlyCollection<TSingle> & {
    addOne: AddOne<TSingle>
    updateOne: UpdateOne<TSingle>
    deleteOne: DeleteOne<TSingle>
  }

interface FieldParams {
  shared: Shared
  name: string
}

function withPrimitives<TSingle>(predicate: Predicate<TSingle>): PredicateOnly<TSingle> {
  const isCallback = typeof predicate === 'function'
  if (isCallback) return predicate
  return (value) => value === predicate
}

export function createReadonlyCollection<TSingle>(params: FieldParams): ReadonlyCollection<TSingle> {
  const readonlyField = createReadonlyField<TSingle[]>(params)

  return {
    ...readonlyField,
    getOne: async (predicate) => {
      const values = await readonlyField.get()
      return values.find(withPrimitives(predicate)) || null
    },
  }
}

export function createCollection<TSingle>(params: FieldParams): Collection<TSingle> {
  const readonlyCollection = createReadonlyCollection<TSingle>(params)
  const field = createField<TSingle[]>(params)

  return {
    ...field,
    ...readonlyCollection,
    addOne: async (value) => {
      const values = await field.get()
      await field.set(values.concat(value))
      return value
    },
    updateOne: async (predicate, updates) => {
      const values = await field.get()
      let done = false
      let updated: TSingle | null = null
      const newCollection = values.map((value) => {
        const matches = withPrimitives(predicate)(value)
        if (!matches || done) return value
        updated = { ...value, ...updates }
        done = true
        return updated
      })
      await field.set(newCollection)
      return updated
    },
    deleteOne: async (predicate) => {
      const values = await field.get()
      let done = false
      let deleted: TSingle | null = null
      const newCollection = values.filter((value) => {
        const matches = withPrimitives(predicate)(value)
        if (!matches || done) return false
        deleted = value
        done = true
        return true
      })
      await field.set(newCollection)
      return deleted
    },
  }
}

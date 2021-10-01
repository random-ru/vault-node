/* eslint-disable @typescript-eslint/no-unused-vars  */

/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosRequestConfig } from 'axios'

export interface VaultConfig {
  space: string
  app: string
  spaceKey: string
  appKey: string
}

interface Shared {
  request: <TData extends unknown = void>(
    config: AxiosRequestConfig
  ) => Promise<TData>
}

type Get<TValue> = () => Promise<TValue>
type Set<TValue> = (value: TValue) => Promise<void>

type JsonPrimitive = number | string | boolean

type CollectionPredicate<TValue extends unknown[]> =
  TValue[number] extends JsonPrimitive
    ? TValue[number] | ((value: TValue[number]) => boolean)
    : (value: TValue[number]) => boolean

type DeleteOne<TValue extends unknown[]> = (
  predicate: CollectionPredicate<TValue>
) => Promise<void>
type UpdateOne<TValue extends unknown[]> = (
  predicate: CollectionPredicate<TValue>,
  partialValue: TValue[number] extends unknown[]
    ? TValue[number]
    : Partial<TValue[number]>
) => Promise<TValue[number]>
type AddOne<TValue extends unknown[]> = (value: TValue[number]) => Promise<void>

interface SingleField<TValue> {
  get: Get<TValue>
  set: Set<TValue>
}

type CollectionField<TValue extends unknown[]> = SingleField<TValue> & {
  addOne: AddOne<TValue>
  updateOne: UpdateOne<TValue>
  deleteOne: DeleteOne<TValue>
}

export type Field<TValue> = TValue extends unknown[]
  ? CollectionField<TValue>
  : SingleField<TValue>

export interface Vault {
  field: <TValue>(name: string, initialState: TValue) => Field<TValue>
}

export function createVault(config: VaultConfig): Vault {
  const { space, app, spaceKey, appKey } = config

  const instance = axios.create({
    baseURL: `https://vault.random.lgbt/@/${space}/${app}`,
    headers: { Authorization: `${spaceKey}.${appKey}` },
  })

  const request: Shared['request'] = (config) => {
    return instance(config).then(({ data }) => data)
  }

  const shared: Shared = {
    request,
  }

  return {
    field: (name, initialState) => createField({ name, initialState, shared }),
  }
}

interface FieldParams<TValue> {
  name: string
  initialState: TValue
  shared: Shared
}

function createSingleField<TValue>({
  name,
  initialState,
  shared,
}: FieldParams<TValue>): SingleField<TValue> {
  const { request } = shared

  const get: Get<TValue> = async () => {
    const current = await request<TValue>({ method: 'get', url: name })
    return current || initialState
  }

  const set: Set<TValue> = (value: TValue) =>
    request({ method: 'put', url: name, data: value })

  return { get, set }
}

function createCollectionField<TValue extends unknown[]>(
  params: FieldParams<TValue>
): CollectionField<TValue> {
  const { get, set } = createSingleField<TValue>(params)

  //////////////////////
  // ТС ПОШЕЛ В ПИЗДУ //
  //////////////////////

  const addOne: AddOne<TValue> = async (value) => {
    const values = await get()
    return set(values.concat(value) as TValue)
  }

  //////////////////////
  // ТС ПОШЕЛ В ПИЗДУ //
  //////////////////////

  const updateOne: UpdateOne<TValue> = async (predicate, partialValue) => {
    const values = await get()

    const updated = values.map((value: TValue[number]) => {
      const condition =
        typeof predicate === 'function' ? predicate(value) : value === predicate

      if (!condition) return value

      return Array.isArray(value)
        ? [...value, ...(partialValue as unknown[])]
        : Object.assign(value, partialValue)
    })

    return set(updated as TValue)
  }

  //////////////////////
  // ТС ПОШЕЛ В ПИЗДУ //
  //////////////////////

  const deleteOne: DeleteOne<TValue> = async (predicate) => {
    const values = await get()
    const updated = values.filter(
      typeof predicate === 'function' ? predicate : (item) => item !== predicate
    )
    return set(updated as TValue)
  }

  return {
    get,
    set,
    addOne,
    updateOne,
    deleteOne,
  }
}

function createField<
  TValue,
  TResult = TValue extends unknown[]
    ? CollectionField<TValue>
    : SingleField<TValue>
>(params: FieldParams<TValue>): TResult {
  //////////////////////
  // ТС ПОШЕЛ В ПИЗДУ //
  //////////////////////

  return Array.isArray(params.initialState)
    ? (createCollectionField(params as any) as unknown as TResult)
    : (createSingleField(params as any) as unknown as TResult)
}

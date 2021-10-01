/* eslint-disable @typescript-eslint/no-unused-vars  */

/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosError, AxiosRequestConfig } from 'axios'

export type ReadonlyVaultConfig = {
  space: string
  app: string
}

export type WritableVaultConfig = ReadonlyVaultConfig & {
  spaceKey: string
  appKey: string
}

export type VaultConfig = ReadonlyVaultConfig | WritableVaultConfig

type Shared = {
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

type GetOne<TValue extends unknown[]> = (
  predicate: CollectionPredicate<TValue>
) => Promise<TValue[number] | null>

type DeleteOne<TValue extends unknown[]> = (
  predicate: CollectionPredicate<TValue>
) => Promise<void>

type UpdateOne<TValue extends unknown[]> = (
  predicate: CollectionPredicate<TValue>,
  partialValue: TValue[number] extends unknown[]
    ? TValue[number]
    : Partial<TValue[number]>
) => Promise<TValue[number] | null>

type AddOne<TValue extends unknown[]> = (value: TValue[number]) => Promise<void>

type ReadonlySingleField<TValue> = {
  get: Get<TValue>
}

type SingleField<TValue> = ReadonlySingleField<TValue> & {
  set: Set<TValue>
}

type ReadonlyCollectionField<TValue extends unknown[]> =
  ReadonlySingleField<TValue> & {
    getOne: GetOne<TValue>
  }

type CollectionField<TValue extends unknown[]> = SingleField<TValue> &
  ReadonlyCollectionField<TValue> & {
    addOne: AddOne<TValue>
    updateOne: UpdateOne<TValue>
    deleteOne: DeleteOne<TValue>
  }

export type ReadonlyField<TValue> = TValue extends unknown[]
  ? ReadonlyCollectionField<TValue>
  : ReadonlySingleField<TValue>

export type Field<TValue> = TValue extends unknown[]
  ? CollectionField<TValue>
  : SingleField<TValue>

export type ReadonlyVault = {
  field: <TValue>(name: string, initialState: TValue) => Field<TValue>
}

export type Vault = ReadonlyVault & {
  field: <TValue>(name: string, initialState: TValue) => ReadonlyField<TValue>
}

function isWritableConfig(config: VaultConfig): config is WritableVaultConfig {
  return 'spaceKey' in config && 'appKey' in config
}

export class VaultException extends Error {
  constructor(message: string) {
    super(`[Vault] ${message}`)
  }
}

export class VaultBadRequestException extends Error {
  constructor(message: string) {
    super(`[Vault - BadRequest] ${message}`)
  }
}

export class VaultAccessDeniedException extends Error {
  constructor(message: string) {
    super(`[Vault - AccessDenied] ${message}`)
  }
}

function handleError(error: AxiosError<{ message: string }>) {
  switch (error.response?.status) {
    case 400:
      throw new VaultBadRequestException(error.response.data.message)
    case 418:
      throw new VaultAccessDeniedException(error.response.data.message)
    default:
      throw new VaultException(error.response?.data.message ?? error.message)
  }
}

export function createVault<TConfig extends VaultConfig>(
  config: TConfig
): TConfig extends ReadonlyVaultConfig ? ReadonlyVault : Vault {
  const { space, app } = config

  const axiosConfig: AxiosRequestConfig = {
    baseURL: `https://vault.random.lgbt/@/${space}/${app}`,
  }

  const isWritable = isWritableConfig(config)

  if (isWritable) {
    const { spaceKey, appKey } = config
    axiosConfig.headers = { Authorization: `${spaceKey}.${appKey}` }
  }

  const instance = axios.create(axiosConfig)

  const request: Shared['request'] = (config) => {
    return instance(config)
      .then(({ data }) => data)
      .catch(handleError)
  }

  const shared: Shared = {
    request,
  }

  const fieldFactory = isWritable ? createField : createReadonlyField

  return {
    field: (name, initialState) => fieldFactory({ name, initialState, shared }),
  }
}

type FieldParams<TValue> = {
  name: string
  initialState: TValue
  shared: Shared
}

function createReadonlySingleField<TValue>({
  name,
  initialState,
  shared,
}: FieldParams<TValue>): ReadonlySingleField<TValue> {
  const { request } = shared

  const get: Get<TValue> = async () => {
    const current = await request<TValue>({ method: 'get', url: name })
    return current || initialState
  }

  return { get }
}

function createSingleField<TValue>(
  params: FieldParams<TValue>
): SingleField<TValue> {
  const { name, shared } = params
  const { request } = shared

  const { get } = createReadonlySingleField(params)

  const set: Set<TValue> = (value: TValue) =>
    request({ method: 'put', url: name, data: value })

  return { get, set }
}

function createReadonlyCollectionField<TValue extends unknown[]>(
  params: FieldParams<TValue>
): ReadonlyCollectionField<TValue> {
  const { get } = createReadonlySingleField<TValue>(params)

  //////////////////////
  // ТС ПОШЕЛ В ПИЗДУ //
  //////////////////////

  const getOne: GetOne<TValue> = async (predicate) => {
    const values = await get()
    const value = values.find(
      typeof predicate === 'function' ? predicate : (item) => item !== predicate
    )
    return value || null
  }

  return {
    get,
    getOne,
  }
}

function createCollectionField<TValue extends unknown[]>(
  params: FieldParams<TValue>
): CollectionField<TValue> {
  const { set } = createSingleField<TValue>(params)
  const { get, getOne } = createReadonlyCollectionField<TValue>(params)

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

    let updatedValue: TValue[number] | null = null

    const updated = values.map((value: TValue[number]) => {
      const condition =
        typeof predicate === 'function' ? predicate(value) : value === predicate

      if (!condition) return value

      updatedValue = Array.isArray(value)
        ? [...value, ...(partialValue as unknown[])]
        : Object.assign(value, partialValue)

      return updatedValue
    })

    await set(updated as TValue)

    return updatedValue
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
    getOne,
    addOne,
    updateOne,
    deleteOne,
  }
}

function createReadonlyField<
  TValue,
  TResult = TValue extends unknown[]
    ? ReadonlyCollectionField<TValue>
    : ReadonlySingleField<TValue>
>(params: FieldParams<TValue>): TResult {
  //////////////////////
  // ТС ПОШЕЛ В ПИЗДУ //
  //////////////////////

  return Array.isArray(params.initialState)
    ? (createReadonlyCollectionField(params as any) as unknown as TResult)
    : (createReadonlySingleField(params as any) as unknown as TResult)
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

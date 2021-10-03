import { AxiosRequestConfig } from 'axios'

export interface ReadonlyVaultConfig {
  domain?: string
  space: string
  app: string
}

export interface WritableVaultConfig extends ReadonlyVaultConfig {
  spaceKey: string
  appKey: string
}

export type VaultConfig = ReadonlyVaultConfig | WritableVaultConfig

export interface Shared {
  request: <TData = void>(config: AxiosRequestConfig) => Promise<TData>
}

export type Serialize<TValue, TSerialized> = (value: TValue) => TSerialized
export type Deserialize<TValue, TSerialized> = (value: TSerialized) => TValue

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DefaultSerialized = any

export interface EmptyFieldOptions {
  [key: string]: unknown
}

export interface FieldOptions<TValue, TSerialized> {
  serialize?: Serialize<TValue, TSerialized>
  deserialize?: Deserialize<TValue, TSerialized>
}

import { AxiosRequestConfig } from 'axios'

export interface ReadonlyVaultConfig {
  domain?: string
  space: string
  app: string
}

export interface WritableVaultConfig {
  domain?: string
  space: string
  app: string
  spaceKey: string
  appKey: string
}

export type VaultConfig = ReadonlyVaultConfig | WritableVaultConfig

export interface Shared {
  request: <TData = void>(config: AxiosRequestConfig) => Promise<TData>
}

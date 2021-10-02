import { AxiosRequestConfig } from 'axios'

export type ReadonlyVaultConfig = {
  domain?: string
  space: string
  app: string
}

export type WritableVaultConfig = {
  domain?: string
  space: string
  app: string
  spaceKey: string
  appKey: string
}

export type VaultConfig = ReadonlyVaultConfig | WritableVaultConfig

export type Shared = {
  request: <TData = void>(config: AxiosRequestConfig) => Promise<TData>
}

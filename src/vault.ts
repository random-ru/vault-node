import axios, { AxiosRequestConfig } from 'axios'
import { Collection, createCollection, createReadonlyCollection, ReadonlyCollection } from './collection'
import { handleError } from './exceptions'
import { createField, createReadonlyField } from './field'
import { ReadonlyVaultConfig, Shared, VaultConfig, WritableVaultConfig } from './types'

type Field<T> = T
type ReadonlyField<T> = T

export type ReadonlyVault = {
  field: <TValue>(name: string) => Field<TValue>
  collection: <TSingle>(name: string) => Collection<TSingle>
}

export type Vault = ReadonlyVault & {
  field: <TValue>(name: string) => ReadonlyField<TValue>
  collection: <TSingle>(name: string) => ReadonlyCollection<TSingle>
}

function isReadonlyConfig(config: VaultConfig): config is WritableVaultConfig {
  const hasKeys = 'spaceKey' in config && 'appKey' in config
  return !hasKeys
}

export function createVault<TConfig extends VaultConfig>(
  config: TConfig
): TConfig extends ReadonlyVaultConfig ? ReadonlyVault : Vault {
  const { domain = 'https://vault.random.lgbt', space, app } = config

  const axiosConfig: AxiosRequestConfig = {
    baseURL: `${domain}/@/${space}/${app}`,
  }

  const isReadonly = isReadonlyConfig(config)

  if (isReadonly) {
    const { spaceKey, appKey } = config
    axiosConfig.headers = { Authorization: `${spaceKey}.${appKey}` }
  }

  const instance = axios.create(axiosConfig)

  const request: Shared['request'] = (config) =>
    instance(config)
      .then(({ data }) => data)
      .catch(handleError)

  const shared: Shared = {
    request,
  }

  if (isReadonly)
    return {
      field: (name) => createReadonlyField({ name, shared }),
      collection: (name) => createReadonlyCollection({ name, shared }),
    } as ReadonlyVault

  return {
    field: (name) => createField({ name, shared }),
    collection: (name) => createCollection({ name, shared }),
  } as Vault
}

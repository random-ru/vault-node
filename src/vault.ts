import axios, { AxiosRequestConfig } from 'axios'
import { Collection, createCollection, createReadonlyCollection, ReadonlyCollection } from './collection'
import { handleError } from './exceptions'
import { createField, createReadonlyField, Field, ReadonlyField } from './field'
import { ReadonlyVaultConfig, Shared, VaultConfig, WritableVaultConfig } from './types'

export interface ReadonlyVault {
  field: <TValue>(name: string) => ReadonlyField<TValue>
  collection: <TSingle>(name: string) => ReadonlyCollection<TSingle>
}

export interface Vault extends ReadonlyVault {
  field: <TValue>(name: string) => Field<TValue>
  collection: <TSingle>(name: string) => Collection<TSingle>
}

function isReadonlyConfig(config: VaultConfig): config is ReadonlyVaultConfig {
  const hasKeys = 'spaceKey' in config && 'appKey' in config
  return !hasKeys
}

export function createVault<TConfig extends WritableVaultConfig | ReadonlyVaultConfig>(
  config: TConfig
): TConfig extends WritableVaultConfig ? Vault : ReadonlyVault {
  const { domain = 'https://vault.random.lgbt', space, app } = config

  const axiosConfig: AxiosRequestConfig = {
    baseURL: `${domain}/@/${space}/${app}`,
  }

  const isReadonly = isReadonlyConfig(config)

  if (!isReadonly) {
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as ReadonlyVault as any

  return {
    field: (name) => createField({ name, shared }),
    collection: (name) => createCollection({ name, shared }),
  } as Vault
}

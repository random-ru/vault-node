import axios, { AxiosRequestConfig } from 'axios'
import { Collection, createCollection, createReadonlyCollection, ReadonlyCollection } from './collection'
import { handleError } from './exceptions'
import { createField, createReadonlyField, Field, ReadonlyField } from './field'
import { DefaultSerialized, FieldOptions, ReadonlyVaultConfig, Shared, VaultConfig, WritableVaultConfig } from './types'

export interface ReadonlyVault {
  field: <TValue, TSerialized = DefaultSerialized>(
    name: string,
    options?: FieldOptions<TValue, TSerialized>
  ) => ReadonlyField<TValue>
  collection: <TValue, TSerialized = DefaultSerialized>(
    name: string,
    options?: FieldOptions<TValue, TSerialized>
  ) => ReadonlyCollection<TValue>
}

export interface Vault extends ReadonlyVault {
  field: <TValue, TSerialized = DefaultSerialized>(
    name: string,
    options?: FieldOptions<TValue, TSerialized>
  ) => Field<TValue>
  collection: <TValue, TSerialized = DefaultSerialized>(
    name: string,
    options?: FieldOptions<TValue, TSerialized>
  ) => Collection<TValue>
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
      field: (name, options) => createReadonlyField({ name, shared, options }),
      collection: (name, options) => createReadonlyCollection({ name, shared, options }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as ReadonlyVault as any

  return {
    field: (name, options) => createField({ name, shared, options }),
    collection: (name, options) => createCollection({ name, shared, options }),
  } as Vault
}

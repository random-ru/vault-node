import test, { beforeEach } from 'ava'
import axios from 'axios'
import AxiosMockAdapter from 'axios-mock-adapter'
import { VaultBadRequestException, VaultAccessDeniedException, VaultException } from './exceptions'
import { Field } from './field'
import { createVault } from './vault'

const mock = new AxiosMockAdapter(axios)

const domain = 'https://vault.test'
const space = 'space'
const app = 'app'

const vault = createVault({
  domain,
  space,
  app,
  spaceKey: 'spaceKey',
  appKey: 'appKey',
})

const fields = {
  number: 'number',
}

let number: Field<number>

beforeEach(() => {
  number = vault.field<number>(fields.number)
})

test('exceptions / VaultBadRequestException', async (t) => {
  mock.onGet(`${domain}/@/${space}/${app}/${fields.number}`).reply(400, { message: '1488' })
  const error = await t.throwsAsync(number.get)
  t.true(error instanceof VaultBadRequestException)
  t.is(error.message, '[Vault - BadRequest] 1488')
})

test('exceptions / VaultAccessDeniedException', async (t) => {
  mock.onGet(`${domain}/@/${space}/${app}/${fields.number}`).reply(418, { message: '322' })
  const error = await t.throwsAsync(number.get)
  t.true(error instanceof VaultAccessDeniedException)
  t.is(error.message, '[Vault - AccessDenied] 322')
})

test('exceptions / VaultException', async (t) => {
  mock.onGet(`${domain}/@/${space}/${app}/${fields.number}`).reply(401, { message: '228' })
  const error = await t.throwsAsync(number.get)
  t.true(error instanceof VaultException)
  t.is(error.message, '[Vault] 228')
})

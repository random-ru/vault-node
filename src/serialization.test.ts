import test, { beforeEach } from 'ava'
import axios from 'axios'
import AxiosMockAdapter from 'axios-mock-adapter'
import { Collection, ReadonlyCollection } from './collection'
import { Field, ReadonlyField } from './field'
import { createVault } from './vault'

const mock = new AxiosMockAdapter(axios)

const domain = 'https://vault.test'
const space = 'space'
const app = 'app'

const readonlyVault = createVault({
  domain,
  space,
  app,
})

const vault = createVault({
  domain,
  space,
  app,
  spaceKey: 'spaceKey',
  appKey: 'appKey',
})

const fields = {
  readonlyNumber: 'readonlyNumber',
  readonlyNumbers: 'readonlyNumbers',
  number: 'number',
  numbers: 'numbers',
}

let readonlyNumber: ReadonlyField<number>
let readonlyNumbers: ReadonlyCollection<number>
let number: Field<number>
let numbers: Collection<number>

const SERIALIZATION = {
  serialize: String,
  deserialize: Number,
}

beforeEach(() => {
  readonlyNumber = readonlyVault.field<number, string>(fields.readonlyNumber, SERIALIZATION)
  readonlyNumbers = readonlyVault.collection<number, string>(fields.readonlyNumbers, SERIALIZATION)
  number = vault.field<number, string>(fields.number, SERIALIZATION)
  numbers = vault.collection<number, string>(fields.numbers, SERIALIZATION)
})

mock.onGet(`${domain}/@/${space}/${app}/${fields.readonlyNumber}`).reply(200, '1')
mock.onPut(`${domain}/@/${space}/${app}/${fields.readonlyNumber}`).reply(200)

mock.onGet(`${domain}/@/${space}/${app}/${fields.readonlyNumbers}`).reply(200, ['1', '2', '2', '3'])
mock.onPut(`${domain}/@/${space}/${app}/${fields.readonlyNumbers}`).reply(200)

mock.onGet(`${domain}/@/${space}/${app}/${fields.number}`).reply(200, '1')
mock.onPut(`${domain}/@/${space}/${app}/${fields.number}`).reply(200)

mock.onGet(`${domain}/@/${space}/${app}/${fields.numbers}`).reply(200, ['1', '2', '2', '3'])
mock.onPut(`${domain}/@/${space}/${app}/${fields.numbers}`).reply(200)

test('serialization / readonly field get', async (t) => {
  t.is(await readonlyNumber.get(), 1)
})

test('serialization / readonly field full-access methods', async (t) => {
  const methods = ['set']
  for (const method of methods) t.false(method in readonlyNumbers)
})

test('serialization / readonly collection getAll', async (t) => {
  t.deepEqual(await readonlyNumbers.getAll(), [1, 2, 2, 3])
})

test('serialization / readonly collection getAll with predicate', async (t) => {
  t.deepEqual(await readonlyNumbers.getAll(1), [1])
  t.deepEqual(await readonlyNumbers.getAll(2), [2, 2])
  t.deepEqual(await readonlyNumbers.getAll((number) => number % 2 === 1), [1, 3])
  t.deepEqual(await readonlyNumbers.getAll(4), [])
})

test('serialization / readonly collection getOne with predicate', async (t) => {
  t.is(await readonlyNumbers.getOne(3), 3)
  t.is(await readonlyNumbers.getOne((number) => number % 2 === 0), 2)
  t.is(await readonlyNumbers.getOne(4), null)
})

test('serialization / readonly collection full-access methods', async (t) => {
  const methods = ['setAll', 'addOne', 'addMultiple', 'updateOne', 'updateAll', 'deleteOne', 'deleteAll']
  for (const method of methods) t.false(method in readonlyNumbers)
})

test('serialization / field get', async (t) => {
  t.is(await number.get(), 1)
})

test('serialization / field set', async (t) => {
  await number.set(2)
  t.pass()
})

test('serialization / collection getAll', async (t) => {
  t.deepEqual(await numbers.getAll(), [1, 2, 2, 3])
})

test('serialization / collection getAll with predicate', async (t) => {
  t.deepEqual(await numbers.getAll(1), [1])
  t.deepEqual(await numbers.getAll(2), [2, 2])
  t.deepEqual(await numbers.getAll((number) => number % 2 === 1), [1, 3])
  t.deepEqual(await numbers.getAll(4), [])
})

test('serialization / collection getOne with predicate', async (t) => {
  t.deepEqual(await numbers.getOne(1), 1)
  t.deepEqual(await numbers.getOne(2), 2)
  t.deepEqual(await numbers.getOne((number) => number % 2 === 1), 1)
  t.is(await numbers.getOne(4), null)
})

test('serialization / collection setAll', async (t) => {
  await numbers.setAll([3, 2, 1])
  await numbers.setAll([])
  t.pass()
})

test('serialization / collection addOne', async (t) => {
  t.is(await numbers.addOne(4), 4)
})

test('serialization / collection addMultiple', async (t) => {
  t.deepEqual(await numbers.addMultiple([4, 5, 6]), [4, 5, 6])
  t.deepEqual(await numbers.addMultiple([]), [])
})

test('serialization / collection updateOne with predicate', async (t) => {
  t.is(await numbers.updateOne(2, 3), 3)
  t.is(await numbers.updateOne(2, (number) => number + 2), 4)
  t.is(await numbers.updateOne((number) => number === 3, 5), 5)
  t.is(
    await numbers.updateOne(
      (number) => number === 3,
      (number) => number * 3
    ),
    9
  )
  t.is(await numbers.updateOne(4, 5), null)
})

test('serialization / collection updateAll with predicate', async (t) => {
  t.deepEqual(await numbers.updateAll(2, 4), [4, 4])
  t.deepEqual(await numbers.updateAll((number) => number === 2, 4), [4, 4])
  t.deepEqual(await numbers.updateAll(4, 5), [])
})

test('serialization / collection deleteOne with predicate', async (t) => {
  t.is(await numbers.deleteOne(2), 2)
  t.is(await numbers.deleteOne((number) => number === 2), 2)
  t.is(await numbers.deleteOne((number) => number === 4), null)
})

test('serialization / collection deleteAll with predicate', async (t) => {
  t.deepEqual(await numbers.deleteAll(2), [2, 2])
  t.deepEqual(await numbers.deleteAll((number) => number === 2), [2, 2])
  t.deepEqual(await numbers.deleteAll(4), [])
})

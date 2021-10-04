# @random/vault

```sh
yarn add rnd-vault
```

## Creating the Vault instance

```ts
import { createVault } from 'rnd-vault'

// ReadOnly access
const vault = createVault({
  space: 'random',
  app: 'telegram-bot'
})

// Full access
const vault = createVault({
  space: 'random',
  app: 'telegram-bot',
  spaceKey: process.env.SPACE_KEY,
  appKey: process.env.APP_KEY,
})
```

## Fields

```ts
const admin = vault.field<Admin>('admin')

admin.get() // Promise<Admin>

// only with the full access
admin.set(admin) // Promise<void>
```

## Collections

```ts
const users = vault.collection<User>('users')

users.getAll() // Promise<User[]>
users.getOne(user => user.id === 123) // Promise<User | null>

// only with the full access
users.setAll(users) // Promise<void>
users.addOne(user) // Promise<User>
users.updateOne(user => user.id === 123, { age: 27 /* пажилой */ }) // Promise<User | null>
users.updateOne(user => user.id === 123, user => ({ age: user.age + 1 })) // Promise<User | null>
users.updateAll(user => user.id === 123, { age: 27 /* пажилые */ }) // Promise<User[]>
users.updateAll(user => user.id === 123, user => ({ age: user.age + 1 })) // Promise<User[]>
users.deleteOne(user => user.id === 321) // Promise<User | null>
users.deleteAll(user => user.id === 321) // Promise<User[]>
```

## Serialization

```ts
/*
 * In this example, the user ids are stored in the Vault as strings
 * We transform them to numbers using the 'deserialize' option
 * So, we can work with values in a form convenient for us
 * To transform them back to original form use the 'serialize' option
 */

/*
 * The first generic - target type (original value processed by 'deserialize')
 * The second generic - source type (original value from Vault and 'serialize' result)
 */
const userIds = vault.collection<number, string>('users', {
  serialize: String,
  deserialize: Number
})
```
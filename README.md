# @random/vault

```sh
yarn add rnd-vault
```

## Creating the Vault instance

```ts
import { createVault } from 'rnd-vault'

// ReadOnly access
const vault = createVault({ space: 'random', app: 'telegram-bot' })

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

// only with Full access
admin.set(admin) // Promise<void>
```

## Collections

```ts
const users = vault.collection<User>('users')

users.get() // Promise<User[]>
users.getOne(user => user.id === 123) // Promise<User | null>

// only with Full access
users.set(users) // Promise<void>
users.addOne(user) // Promise<void>
users.updateOne(user => user.id === 123, { age: 27 /* пажилой */ }) // Promise<User | null>
users.deleteOne(user => user.id === 321) // Promise<void>
```

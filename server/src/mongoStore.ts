import { MongoClient, ObjectId, type Collection } from 'mongodb'

import type { EmailStatus, MessageStore, StoredMessage } from './handler.js'

interface MongoStoreOptions {
  uri: string
  dbName: string
  collection: string
}

// Cached at module scope so warm serverless invocations reuse the same connection pool.
let clientPromise: Promise<MongoClient> | null = null
let indexesPromise: Promise<unknown> | null = null

function getClient(uri: string): Promise<MongoClient> {
  clientPromise ??= new MongoClient(uri, {
    appName: 'portfolio-contact-api',
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 5_000,
    connectTimeoutMS: 5_000,
  })
    .connect()
    .catch((error: unknown) => {
      clientPromise = null // allow the next request to retry
      throw error
    })
  return clientPromise
}

export function createMongoStore(options: MongoStoreOptions): MessageStore {
  async function getCollection(): Promise<Collection<StoredMessage>> {
    const client = await getClient(options.uri)
    const collection = client.db(options.dbName).collection<StoredMessage>(options.collection)

    // Idempotent; runs once per cold start.
    indexesPromise ??= collection
      .createIndexes([
        { key: { ipHash: 1, createdAt: -1 }, name: 'ipHash_createdAt' },
        { key: { createdAt: -1 }, name: 'createdAt' },
      ])
      .catch((error: unknown) => {
        indexesPromise = null
        throw error
      })
    await indexesPromise

    return collection
  }

  return {
    async countRecentByIp(ipHash: string, since: Date) {
      const collection = await getCollection()
      return collection.countDocuments({ ipHash, createdAt: { $gte: since } })
    },

    async save(message: StoredMessage) {
      const collection = await getCollection()
      const result = await collection.insertOne(message)
      return result.insertedId.toHexString()
    },

    async updateEmailStatus(id: string, status: EmailStatus) {
      const collection = await getCollection()
      await collection.updateOne({ _id: new ObjectId(id) }, { $set: { emailStatus: status } })
    },
  }
}

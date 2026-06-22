import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI as string;

// Cache the connection across hot reloads / serverless invocations so we don't
// open a new connection on every request.
type Cached = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

const globalForMongoose = global as unknown as { mongoose?: Cached };

const cached: Cached = globalForMongoose.mongoose ?? { conn: null, promise: null };
globalForMongoose.mongoose = cached;

export async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not set. Add it to .env.local (see .env.example).');
  }
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
      .then((m) => {
        console.log('DB Connected');
        return m;
      });
  }
  try {
    cached.conn = await cached.promise;
  } catch (error) {
    // A rejected promise stays cached otherwise, so every later request would
    // inherit this same failure. Clear it so the next request can reconnect.
    cached.promise = null;
    throw error;
  }
  return cached.conn;
}

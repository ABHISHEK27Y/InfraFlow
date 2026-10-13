import mongoose from "mongoose";

// Global cache to persist connection across hot reloads in Next.js
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached = global.mongooseCache || { conn: null, promise: null };

export async function connectDB() {
  const uriTemplate = process.env.MONGODB_URI;
  const password = process.env.MONGODB_PASSWD;
  if (!uriTemplate || (uriTemplate.includes("<password>") && !password)) {
    throw new Error("MongoDB is not configured. Set MONGODB_URI and, if needed, MONGODB_PASSWD.");
  }
  const uri = uriTemplate.replace("<password>", encodeURIComponent(password || ""));

  // Return existing connection if it exists
  if (cached.conn) return cached.conn;

  // If connection is not yet established, create a promise
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, {
        dbName: "infraflow",
        // Optional settings for production
        // useNewUrlParser: true,
        // useUnifiedTopology: true,
      })
      .then((mongoose) => mongoose)
      .catch((error) => {
        cached.promise = null;
        throw error;
      });
  }

  // Wait for connection and cache it
  cached.conn = await cached.promise;

  // Save the cached connection globally
  global.mongooseCache = cached;

  return cached.conn;
}

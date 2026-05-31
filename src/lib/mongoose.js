import mongoose from 'mongoose';

// Mongoose connection for Next.js. Cached on `global` so it survives hot
// reload in dev and is reused across serverless invocations in prod.
//
// Resilience: on corporate Windows boxes with aggressive AV, the
// mongodb-memory-server child process has been observed dying mid-session.
// When that happens the cached connection points at a port nobody's
// listening on anymore, and every subsequent request hangs for 30s before
// failing. We work around this with:
//   1. A 500ms ping probe before reusing a cached connection
//   2. `serverSelectionTimeoutMS` lowered from 30s to 5s
//   3. Mongoose disconnect/error listeners that invalidate the cache
//      so the next request triggers a fresh spawn instead of retrying a
//      dead handle.

let cached = global._mongooseCache;
if (!cached) {
  cached = global._mongooseCache = {
    conn: null,
    promise: null,
    memoryServer: null,
  };
}

function invalidate(reason) {
  if (cached.conn || cached.promise || cached.memoryServer) {
    console.warn(`[mongo] invalidating connection cache (${reason})`);
  }
  cached.conn = null;
  cached.promise = null;
  if (cached.memoryServer) {
    cached.memoryServer.stop().catch(() => {});
    cached.memoryServer = null;
  }
}

async function isAlive(conn) {
  if (conn?.connection?.readyState !== 1) return false;
  try {
    await Promise.race([
      conn.connection.db.admin().ping(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('ping timeout')), 500)
      ),
    ]);
    return true;
  } catch {
    return false;
  }
}

async function spawnMemoryServer() {
  let MongoMemoryServer;
  try {
    ({ MongoMemoryServer } = await import('mongodb-memory-server'));
  } catch {
    throw new Error(
      'MONGODB_URI is not set and `mongodb-memory-server` is not installed. ' +
        'Either set MONGODB_URI in .env.local or run ' +
        '`npm install --save-dev mongodb-memory-server`.'
    );
  }

  const path = await import('node:path');
  const fs = await import('node:fs');
  const dbPath = path.resolve(process.cwd(), '.mongo-data');
  if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath, { recursive: true });

  const server = await MongoMemoryServer.create({
    instance: {
      dbPath,
      storageEngine: 'wiredTiger',
      // Corporate AV scans mongod.exe on first execution; 60s is plenty.
      launchTimeout: 60_000,
    },
  });
  console.log(
    '[mongo] in-memory MongoDB ready at',
    server.getUri()
  );
  return server;
}

async function resolveUri() {
  const fromEnv = process.env.MONGODB_URI?.trim();
  if (fromEnv) return fromEnv;

  if (!cached.memoryServer) {
    cached.memoryServer = await spawnMemoryServer();
  }
  return cached.memoryServer.getUri();
}

export async function connectDB() {
  // Quick liveness check on the cached connection. If mongod is dead the
  // ping fails within 500ms and we'll reconnect, instead of pinning the
  // request for the full 5s selection timeout.
  if (cached.conn) {
    if (await isAlive(cached.conn)) return cached.conn;
    invalidate('cached connection failed health check');
  }

  if (!cached.promise) {
    cached.promise = resolveUri().then((uri) =>
      mongoose
        .connect(uri, {
          bufferCommands: false,
          serverSelectionTimeoutMS: 5_000,
        })
        .then((m) => {
          m.connection.once('disconnected', () =>
            invalidate('disconnected')
          );
          m.connection.once('error', (err) =>
            invalidate(`connection error: ${err?.message || err}`)
          );
          return m;
        })
    );
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
  return cached.conn;
}

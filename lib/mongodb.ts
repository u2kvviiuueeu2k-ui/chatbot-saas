import mongoose from 'mongoose';

// Cloudflare Workers では環境変数がリクエスト処理時にしか利用できないため、
// モジュール読み込み時ではなく呼び出し時に参照する。

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache;
}

const cached: MongooseCache = global.mongoose ?? { conn: null, promise: null };
global.mongoose = cached;

export async function connectDB() {
  const MONGODB_URI = process.env.MONGODB_URI ?? '';
  if (!MONGODB_URI) throw new Error('MONGODB_URI environment variable is not set');
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    // 接続文字列にDB名が含まれていなくても既存データ（chatbot_db）に繋がるよう明示指定する
    cached.promise = mongoose
      .connect(MONGODB_URI, { dbName: process.env.MONGODB_DB ?? 'chatbot_db' })
      .then((m) => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

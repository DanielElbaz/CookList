
import mongoose from 'mongoose';

function connectMongo(uri) {
  if (!uri) throw new Error('Missing MONGODB_URI');
  mongoose.set('strictQuery', true);
  return mongoose.connect(uri, { autoIndex: true });
}

export { connectMongo };


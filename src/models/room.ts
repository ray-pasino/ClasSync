import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  roomname: { type: String, required: true, unique: true },
  capacity: { type: Number, required: true },
});

const RoomModel = (mongoose.models.room ||
  mongoose.model('room', roomSchema)) as mongoose.Model<any>;

export default RoomModel;

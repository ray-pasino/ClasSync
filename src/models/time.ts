import mongoose from 'mongoose';

const timeSchema = new mongoose.Schema({
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
});

const TimeModel = (mongoose.models.time ||
  mongoose.model('time', timeSchema)) as mongoose.Model<any>;

export default TimeModel;

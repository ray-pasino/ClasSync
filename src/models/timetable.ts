import mongoose from 'mongoose';

const timetableSchema = new mongoose.Schema({
  name: { type: String, required: true },
  semester: { type: String, required: true },
  timetable: { type: Array, default: [] },
});

const TimetableModel = (mongoose.models.timetable ||
  mongoose.model('timetable', timetableSchema)) as mongoose.Model<any>;

export default TimetableModel;

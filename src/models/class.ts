import mongoose from 'mongoose';

const classSchema = new mongoose.Schema({
  className: { type: String, required: true },
  course: { type: String, required: true },
  semester: { type: String, required: true },
  meetings: { type: Number, required: true },
  population: { type: Number },
  unavailablerooms: { type: [String] },
});

const ClassModel = (mongoose.models.class ||
  mongoose.model('class', classSchema)) as mongoose.Model<any>;

export default ClassModel;

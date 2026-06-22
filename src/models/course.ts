import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  credithours: { type: Number, required: true },
});

const CourseModel = (mongoose.models.course ||
  mongoose.model('course', courseSchema)) as mongoose.Model<any>;

export default CourseModel;

import mongoose from 'mongoose';

// A single course a class (cohort) takes, with its own meetings-per-week.
const classCourseSchema = new mongoose.Schema(
  {
    course: { type: String, required: true },
    meetings: { type: Number, required: true, default: 1 },
  },
  { _id: false }
);

const classSchema = new mongoose.Schema({
  className: { type: String, required: true },
  // A class (cohort) can take several courses, each with its own meetings/week.
  courses: { type: [classCourseSchema], default: [] },
  // Legacy single-course fields — kept optional so older records still load and
  // schedule correctly. New records use `courses`.
  course: { type: String },
  meetings: { type: Number },
  semester: { type: String, required: true },
  // Academic level of the cohort (100/200/300/400). Optional, but when set it
  // distinguishes cohorts of the same programme and sharpens student matching.
  level: { type: Number },
  population: { type: Number },
  unavailablerooms: { type: [String] },
});

const ClassModel = (mongoose.models.class ||
  mongoose.model('class', classSchema)) as mongoose.Model<any>;

export default ClassModel;

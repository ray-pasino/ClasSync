import mongoose from 'mongoose';

// A change/cancellation alert raised by an admin against a class. Persisted so
// students and lecturers can see it in-app even if SMS is down or opted out.
const alertSchema = new mongoose.Schema(
  {
    // 'cancellation' also removes the class's sessions from the timetable;
    // 'change' and 'info' are announcements only.
    type: {
      type: String,
      enum: ['cancellation', 'change', 'info'],
      default: 'info',
    },
    className: { type: String, required: true },
    // Cohort level (100/200/300/400) when the alert targets a single level of
    // the programme; absent means it applies to the whole programme.
    level: { type: Number },
    semester: { type: String },
    message: { type: String, required: true },
    // Lecturer names teaching this class, resolved from the timetable at send
    // time. Used to surface the alert to the right lecturers and to SMS them.
    lecturerNames: { type: [String], default: [] },
    // SMS dispatch outcome, for the admin's confirmation and auditing.
    smsSent: { type: Boolean, default: false },
    smsCount: { type: Number, default: 0 },
    smsReason: { type: String },
  },
  { timestamps: true }
);

const AlertModel = (mongoose.models.alert ||
  mongoose.model('alert', alertSchema)) as mongoose.Model<any>;

export default AlertModel;

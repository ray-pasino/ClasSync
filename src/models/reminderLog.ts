import mongoose from 'mongoose';

// One record per class session per day that reminders have been sent for.
//
// The reminder endpoint is designed to be polled — a scheduler hitting it every
// few minutes will see the same upcoming session in its lead window on every
// run. The unique `key` is what stops that turning into one SMS per poll: the
// runner inserts the log *before* sending, so a duplicate-key error is the
// signal that another run (or another instance) already handled this session.
const reminderLogSchema = new mongoose.Schema({
  // `${dateKey}|${className}|${level}|${course}|${day}|${time}`
  key: { type: String, required: true, unique: true },
  dateKey: { type: String, required: true },
  className: { type: String },
  course: { type: String },
  day: { type: String },
  time: { type: String },
  studentCount: { type: Number, default: 0 },
  lecturerCount: { type: Number, default: 0 },
  smsSent: { type: Boolean, default: false },
  smsReason: { type: String },
  sentAt: { type: Date, default: Date.now },
});

// These are only useful for a couple of weeks of debugging; let Mongo reap them
// so the collection can't grow without bound.
reminderLogSchema.index({ sentAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 14 });

const ReminderLogModel = (mongoose.models.reminderlog ||
  mongoose.model('reminderlog', reminderLogSchema)) as mongoose.Model<any>;

export default ReminderLogModel;

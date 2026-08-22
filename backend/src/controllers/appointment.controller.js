const DoctorProfile  = require("../models/DoctorProfile");
const PatientProfile = require("../models/PatientProfile");
const Appointment    = require("../models/Appointment");
const LeaveDay       = require("../models/LeaveDay");
const SlotHold       = require("../models/SlotHold");
const User           = require("../models/User");
const { success, created, notFound, badRequest, forbidden } = require("../utils/response");
const asyncHandler   = require("../utils/asyncHandler");
const { generateAvailableSlots } = require("../utils/slots");
const { generatePreVisitSummary } = require("../services/llm.service");
const { queueNotification }       = require("../services/notification.service");
const { createCalendarEvent, deleteCalendarEvent, updateCalendarEvent } = require("../services/calendar.service");
const config = require("../config");

const searchDoctors = asyncHandler(async (req, res) => {
  const { specialisation, name, page=1, limit=12 } = req.query;
  const skip = (Number(page)-1)*Number(limit);
  const userQ = { role:"DOCTOR", isActive:true };
  if (name) { const r=new RegExp(name,"i"); userQ.$or=[{firstName:r},{lastName:r}]; }
  const users = await User.find(userQ).skip(skip).limit(Number(limit)).lean();
  const total = await User.countDocuments(userQ);
  const ids   = users.map(u=>u._id);
  const dpQ   = { userId:{ $in:ids }, isVerified:true };
  if (specialisation) dpQ.specialisation = new RegExp(specialisation,"i");
  const dps   = await DoctorProfile.find(dpQ).lean();
  const dpMap = Object.fromEntries(dps.map(d=>[d.userId.toString(),d]));
  const doctors = users.map(({password,...u})=>({ ...u, doctorProfile: dpMap[u._id.toString()] })).filter(d=>d.doctorProfile);
  return success(res,{ doctors, pagination:{ total:doctors.length, page:Number(page), limit:Number(limit), pages:Math.ceil(doctors.length/Number(limit)) } });
});

const getAvailableSlots = asyncHandler(async (req, res) => {
  const { doctorId, date } = req.query;
  if (!doctorId||!date) return badRequest(res,"doctorId and date required");
  const doctor = await DoctorProfile.findById(doctorId).lean();
  if (!doctor) return notFound(res,"Doctor not found");
  const leaveDate=new Date(date); leaveDate.setHours(0,0,0,0);
  if (await LeaveDay.findOne({ doctorProfileId:doctorId, date:leaveDate }))
    return success(res,{ slots:[], message:"Doctor is on leave" });
  const dayStart=new Date(date); dayStart.setHours(0,0,0,0);
  const dayEnd  =new Date(date); dayEnd.setHours(23,59,59,999);
  const [bookedApts, holds] = await Promise.all([
    Appointment.find({ doctorProfileId:doctorId, scheduledAt:{ $gte:dayStart,$lte:dayEnd }, status:{ $in:["CONFIRMED","PENDING"] } }).select("scheduledAt").lean(),
    SlotHold.find({ doctorProfileId:doctorId, scheduledAt:{ $gte:dayStart,$lte:dayEnd }, expiresAt:{ $gt:new Date() } }).select("scheduledAt").lean(),
  ]);
  const slots = generateAvailableSlots(doctor.workingHours, doctor.slotDuration, date, bookedApts.map(a=>a.scheduledAt), holds.map(h=>h.scheduledAt));
  return success(res,{ slots, slotDuration:doctor.slotDuration });
});

const holdSlot = asyncHandler(async (req, res) => {
  const { doctorId, scheduledAt } = req.body;
  await SlotHold.deleteMany({ expiresAt:{ $lt:new Date() } });
  const existing = await Appointment.findOne({ doctorProfileId:doctorId, scheduledAt:new Date(scheduledAt), status:{ $in:["CONFIRMED","PENDING"] } });
  if (existing) return badRequest(res,"Slot already booked");
  const expiresAt = new Date(Date.now()+config.SLOT_HOLD_TTL_MINUTES*60*1000);
  try {
    const hold = await SlotHold.findOneAndUpdate(
      { doctorProfileId:doctorId, scheduledAt:new Date(scheduledAt) },
      { patientUserId:req.user.id, expiresAt },
      { upsert:true, new:true, setDefaultsOnInsert:true }
    );
    return success(res,{ holdId:hold._id, expiresAt },"Slot held for 10 minutes");
  } catch(e) {
    if (e.code===11000) return badRequest(res,"Slot is no longer available");
    throw e;
  }
});

const bookAppointment = asyncHandler(async (req, res) => {
  const { doctorId, scheduledAt, symptoms } = req.body;
  let [patient, doctor] = await Promise.all([
    PatientProfile.findOne({ userId: req.user.id }).populate("userId", "email firstName lastName"),
    DoctorProfile.findById(doctorId).populate("userId", "email firstName lastName"),
  ]);
  
  if (!patient) {
    patient = await PatientProfile.create({ userId: req.user.id });
    patient = await PatientProfile.findById(patient._id).populate("userId", "email firstName lastName");
  }
  
  if (!doctor) return notFound(res, "Doctor not found");
  const slotTime = new Date(scheduledAt);
  const endTime  = new Date(slotTime.getTime() + (doctor.slotDuration || 30) * 60 * 1000);
  const leaveDate = new Date(slotTime);
  leaveDate.setHours(0, 0, 0, 0);

  if (await LeaveDay.findOne({ doctorProfileId: doctorId, date: leaveDate })) {
    return badRequest(res, "Doctor is on leave");
  }
  if (await Appointment.findOne({ doctorProfileId: doctorId, scheduledAt: slotTime, status: { $in: ["CONFIRMED", "PENDING"] } })) {
    return badRequest(res, "Slot already booked");
  }

  const appointment = await Appointment.create({
    doctorProfileId: doctorId,
    patientProfileId: patient._id,
    scheduledAt: slotTime,
    endsAt: endTime,
    status: "CONFIRMED",
    symptoms
  });

  await SlotHold.deleteOne({ doctorProfileId: doctorId, scheduledAt: slotTime });
  if (symptoms) generatePreVisitSummary(appointment._id.toString(), symptoms).catch(() => {});

  const pu = patient.userId, du = doctor.userId;
  if (pu && du) {
    queueNotification({
      appointmentId: appointment._id,
      recipientEmail: pu.email,
      recipientName: pu.firstName + " " + pu.lastName,
      type: "BOOKING_CONFIRMATION",
      subject: "Appointment Confirmed with Dr. " + du.firstName + " " + du.lastName,
      body: "Your appointment with Dr. " + du.firstName + " " + du.lastName + " is confirmed on " + slotTime.toLocaleString()
    }).catch(() => {});

    queueNotification({
      appointmentId: appointment._id,
      recipientEmail: du.email,
      recipientName: "Dr. " + du.firstName + " " + du.lastName,
      type: "BOOKING_CONFIRMATION",
      subject: "New Appointment: " + pu.firstName + " " + pu.lastName,
      body: "New appointment scheduled with " + pu.firstName + " " + pu.lastName + " on " + slotTime.toLocaleString()
    }).catch(() => {});

    createCalendarEvent(appointment._id.toString(), {
      patientUser: pu,
      doctorUser: du,
      scheduledAt: slotTime,
      endsAt: endTime,
      doctorSpecialisation: doctor.specialisation
    }).catch(() => {});
  }

  const full = await Appointment.findById(appointment._id)
    .populate({ path: "doctorProfileId",  populate: { path: "userId", select: "firstName lastName email" } })
    .populate({ path: "patientProfileId", populate: { path: "userId", select: "firstName lastName email" } });

  return created(res, full, "Appointment booked");
});

const getMyAppointments = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  let patient = await PatientProfile.findOne({ userId: req.user.id });
  if (!patient) {
    patient = await PatientProfile.create({ userId: req.user.id });
  }

  const q = { patientProfileId: patient._id };
  if (status) q.status = status;
  const [appointments, total] = await Promise.all([
    Appointment.find(q).skip(skip).limit(Number(limit)).sort({ scheduledAt: -1 })
      .populate({ path: "doctorProfileId", populate: { path: "userId", select: "firstName lastName email avatar" } })
      .populate("prescriptions").lean(),
    Appointment.countDocuments(q),
  ]);
  return success(res, { appointments, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } });
});

const getAppointmentById = asyncHandler(async (req, res) => {
  const apt = await Appointment.findById(req.params.id)
    .populate({ path:"doctorProfileId",  populate:{ path:"userId", select:"firstName lastName email avatar" } })
    .populate({ path:"patientProfileId", populate:{ path:"userId", select:"firstName lastName email avatar" } });
  if (!apt) return notFound(res,"Appointment not found");
  const docUserId = apt.doctorProfileId?.userId?._id?.toString();
  const patUserId = apt.patientProfileId?.userId?._id?.toString();
  const isP=req.user.role==="PATIENT"&&patUserId===req.user.id;
  const isD=req.user.role==="DOCTOR"&&docUserId===req.user.id;
  if (!isP&&!isD&&req.user.role!=="ADMIN") return forbidden(res,"Access denied");
  return success(res, apt);
});

const cancelAppointment = asyncHandler(async (req, res) => {
  const apt = await Appointment.findById(req.params.id)
    .populate({ path:"doctorProfileId",  populate:{ path:"userId", select:"firstName lastName email" } })
    .populate({ path:"patientProfileId", populate:{ path:"userId", select:"firstName lastName email" } });
  if (!apt)                          return notFound(res,"Appointment not found");
  if (apt.status==="CANCELLED")      return badRequest(res,"Already cancelled");
  if (apt.status==="COMPLETED")      return badRequest(res,"Cannot cancel completed appointment");
  const docUserId=apt.doctorProfileId?.userId?._id?.toString();
  const patUserId=apt.patientProfileId?.userId?._id?.toString();
  if (req.user.role==="PATIENT"&&patUserId!==req.user.id) return forbidden(res);
  if (req.user.role==="DOCTOR" &&docUserId!==req.user.id) return forbidden(res);
  await Appointment.updateOne({ _id:apt._id },{ status:"CANCELLED", cancelReason:req.body.cancelReason||"Cancelled" });
  if (apt.googleCalendarEventIdDoctor) deleteCalendarEvent(apt._id.toString()).catch(()=>{});
  return success(res,{},"Appointment cancelled");
});

const rescheduleAppointment = asyncHandler(async (req, res) => {
  const { newScheduledAt } = req.body;
  const apt = await Appointment.findById(req.params.id).populate({ path:"doctorProfileId", select:"slotDuration" });
  if (!apt) return notFound(res,"Appointment not found");
  if (["CANCELLED","COMPLETED"].includes(apt.status)) return badRequest(res,"Cannot reschedule");
  const slotTime=new Date(newScheduledAt);
  const endTime =new Date(slotTime.getTime()+apt.doctorProfileId.slotDuration*60*1000);
  if (await Appointment.findOne({ doctorProfileId:apt.doctorProfileId._id, scheduledAt:slotTime, status:{ $in:["CONFIRMED","PENDING"] }, _id:{ $ne:apt._id } })) return badRequest(res,"New slot already booked");
  const updated = await Appointment.findByIdAndUpdate(apt._id,{ scheduledAt:slotTime, endsAt:endTime, status:"CONFIRMED", rescheduledFrom:apt.scheduledAt.toISOString() },{ new:true });
  updateCalendarEvent(apt._id.toString(),{ scheduledAt:slotTime, endsAt:endTime }).catch(()=>{});
  return success(res, updated, "Rescheduled");
});

const submitSymptoms = asyncHandler(async (req, res) => {
  const { symptoms } = req.body;
  const apt = await Appointment.findById(req.params.id).populate({ path:"patientProfileId", select:"userId" });
  if (!apt) return notFound(res,"Appointment not found");
  if (apt.patientProfileId.userId.toString()!==req.user.id) return forbidden(res);
  await Appointment.updateOne({ _id:apt._id },{ symptoms });
  generatePreVisitSummary(apt._id.toString(), symptoms).catch(()=>{});
  return success(res,{},"Symptoms submitted");
});

module.exports = { searchDoctors, getAvailableSlots, holdSlot, bookAppointment, getMyAppointments, getAppointmentById, cancelAppointment, rescheduleAppointment, submitSymptoms };

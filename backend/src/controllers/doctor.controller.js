const DoctorProfile  = require("../models/DoctorProfile");
const PatientProfile = require("../models/PatientProfile");
const Appointment    = require("../models/Appointment");
const Prescription   = require("../models/Prescription");
const LeaveDay       = require("../models/LeaveDay");
const { success, created, notFound, badRequest, forbidden } = require("../utils/response");
const asyncHandler   = require("../utils/asyncHandler");
const { generatePostVisitSummary }     = require("../services/llm.service");
const { scheduleMedicationReminders }  = require("../services/reminder.service");

const getDoctorAppointments = asyncHandler(async (req, res) => {
  const { status, date, page=1, limit=10 } = req.query;
  const skip=(Number(page)-1)*Number(limit);
  const doctor = await DoctorProfile.findOne({ userId:req.user.id });
  if (!doctor) return notFound(res,"Doctor profile not found");
  const q = { doctorProfileId:doctor._id };
  if (status) q.status=status;
  if (date) { const d=new Date(date); q.scheduledAt={ $gte:new Date(d.setHours(0,0,0,0)), $lte:new Date(d.setHours(23,59,59,999)) }; }
  const [appointments,total] = await Promise.all([
    Appointment.find(q).skip(skip).limit(Number(limit)).sort({ scheduledAt:1 })
      .populate({ path:"patientProfileId", populate:{ path:"userId", select:"firstName lastName email phone avatar" } })
      .lean(),
    Appointment.countDocuments(q),
  ]);
  return success(res,{ appointments, pagination:{ total, page:Number(page), limit:Number(limit), pages:Math.ceil(total/Number(limit)) } });
});

const getTodaySchedule = asyncHandler(async (req, res) => {
  const doctor = await DoctorProfile.findOne({ userId:req.user.id });
  if (!doctor) return notFound(res,"Doctor profile not found");
  const today=new Date(); today.setHours(0,0,0,0);
  const todayEnd=new Date(); todayEnd.setHours(23,59,59,999);
  const appointments = await Appointment.find({ doctorProfileId:doctor._id, scheduledAt:{ $gte:today,$lte:todayEnd }, status:{ $in:["CONFIRMED","COMPLETED","PENDING"] } })
    .sort({ scheduledAt:1 })
    .populate({ path:"patientProfileId", populate:{ path:"userId", select:"firstName lastName email phone avatar" } })
    .lean();
  return success(res, appointments);
});

const submitPostVisitNotes = asyncHandler(async (req, res) => {
  const { clinicalNotes, prescriptions, followUpDate } = req.body;
  const doctor = await DoctorProfile.findOne({ userId:req.user.id });
  if (!doctor) return notFound(res,"Doctor profile not found");
  const apt = await Appointment.findById(req.params.id)
    .populate({ path:"patientProfileId", populate:{ path:"userId", select:"email firstName lastName" } })
    .populate({ path:"doctorProfileId",  populate:{ path:"userId", select:"firstName lastName" } });
  if (!apt) return notFound(res,"Appointment not found");
  if (apt.doctorProfileId._id.toString()!==doctor._id.toString()) return forbidden(res);
  if (apt.status==="CANCELLED") return badRequest(res,"Cannot update cancelled appointment");
  const createdRx = [];
  if (prescriptions?.length) {
    for (const p of prescriptions) {
      const rx = await Prescription.create({ appointmentId:apt._id, medicationName:p.medicationName, dosage:p.dosage, frequency:p.frequency, durationDays:p.durationDays, instructions:p.instructions });
      createdRx.push(rx);
    }
  }
  await Appointment.updateOne({ _id:apt._id },{ clinicalNotes, followUpDate:followUpDate?new Date(followUpDate):undefined, status:"COMPLETED", prescription:prescriptions?JSON.stringify(prescriptions):undefined });
  generatePostVisitSummary(apt._id.toString(), clinicalNotes, prescriptions||[]).catch(()=>{});
  if (createdRx.length) scheduleMedicationReminders(apt._id.toString(), createdRx, apt.patientProfileId).catch(()=>{});
  return success(res,{ prescriptions:createdRx },"Post-visit notes saved");
});

const updateDoctorProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, bio, specialisation, qualifications, experience, consultationFee, slotDuration, workingHours } = req.body;
  const user = await require("../models/User").findByIdAndUpdate(req.user.id,{ firstName, lastName, phone },{ new:true }).lean();
  const dp   = await DoctorProfile.findOneAndUpdate({ userId:req.user.id },{ bio, specialisation, qualifications, experience, consultationFee, slotDuration, workingHours },{ new:true });
  const { password, ...safe } = user;
  return success(res,{ ...safe, doctorProfile:dp },"Profile updated");
});

const getLeaveDays = asyncHandler(async (req, res) => {
  const doctor = await DoctorProfile.findOne({ userId:req.user.id });
  if (!doctor) return notFound(res,"Doctor profile not found");
  const leaves = await LeaveDay.find({ doctorProfileId:doctor._id, date:{ $gte:new Date() } }).sort({ date:1 });
  return success(res, leaves);
});

const getDoctorDashboard = asyncHandler(async (req, res) => {
  const doctor = await DoctorProfile.findOne({ userId:req.user.id });
  if (!doctor) return notFound(res,"Doctor profile not found");
  const today=new Date(); const weekStart=new Date(today); weekStart.setDate(today.getDate()-today.getDay());
  const todayStart=new Date(today); todayStart.setHours(0,0,0,0);
  const todayEnd  =new Date(today); todayEnd.setHours(23,59,59,999);
  const [todayCount,weekCount,totalCount,pendingCount,upcomingAppointments] = await Promise.all([
    Appointment.countDocuments({ doctorProfileId:doctor._id, scheduledAt:{ $gte:todayStart,$lte:todayEnd } }),
    Appointment.countDocuments({ doctorProfileId:doctor._id, scheduledAt:{ $gte:weekStart } }),
    Appointment.countDocuments({ doctorProfileId:doctor._id }),
    Appointment.countDocuments({ doctorProfileId:doctor._id, status:"PENDING" }),
    Appointment.find({ doctorProfileId:doctor._id, scheduledAt:{ $gte:new Date() }, status:{ $in:["CONFIRMED","PENDING"] } })
      .sort({ scheduledAt:1 }).limit(5)
      .populate({ path:"patientProfileId", populate:{ path:"userId", select:"firstName lastName avatar" } }).lean(),
  ]);
  return success(res,{ stats:{ todayCount,weekCount,totalCount,pendingCount }, upcomingAppointments });
});

module.exports = { getDoctorAppointments, getTodaySchedule, submitPostVisitNotes, updateDoctorProfile, getLeaveDays, getDoctorDashboard };

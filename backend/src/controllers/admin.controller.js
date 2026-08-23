const bcrypt = require("bcryptjs");
const User = require("../models/User");
const DoctorProfile = require("../models/DoctorProfile");
const PatientProfile = require("../models/PatientProfile");
const Appointment = require("../models/Appointment");
const LeaveDay = require("../models/LeaveDay");
const { success, created, notFound, badRequest } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");
const { queueNotification } = require("../services/notification.service");

const getDashboardStats = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [totalDoctors, totalPatients, totalAppointments, todayAppointments, recentAppointments] = await Promise.all([
    User.countDocuments({ role: "DOCTOR" }),
    User.countDocuments({ role: "PATIENT" }),
    Appointment.countDocuments(),
    Appointment.countDocuments({ scheduledAt: { $gte: today, $lt: tomorrow } }),
    Appointment.find().sort({ createdAt: -1 }).limit(10)
      .populate({ path: "doctorProfileId", populate: { path: "userId", select: "firstName lastName" } })
      .populate({ path: "patientProfileId", populate: { path: "userId", select: "firstName lastName" } })
      .lean()
  ]);

  const formattedRecent = recentAppointments.map(apt => {
    const pUser = apt.patientProfileId?.userId || apt.patient?.user || {};
    const dUser = apt.doctorProfileId?.userId || apt.doctor?.user || {};
    return {
      ...apt,
      id: apt._id?.toString() || apt.id,
      patient: {
        user: {
          firstName: pUser.firstName || (apt.patientName ? apt.patientName.split(' ')[0] : 'Rahul'),
          lastName: pUser.lastName || (apt.patientName ? apt.patientName.split(' ').slice(1).join(' ') : 'Sharma'),
          email: pUser.email || 'patient@healthsync.com'
        }
      },
      doctor: {
        user: {
          firstName: dUser.firstName || (apt.doctorName ? apt.doctorName.replace('Dr. ', '').split(' ')[0] : 'Emily'),
          lastName: dUser.lastName || (apt.doctorName ? apt.doctorName.replace('Dr. ', '').split(' ').slice(1).join(' ') : 'Williams'),
          email: dUser.email || 'dr.williams@healthsync.com'
        },
        specialisation: apt.doctorProfileId?.specialisation || 'General Practice'
      }
    };
  });

  return success(res, {
    stats: { totalDoctors, totalPatients, totalAppointments, todayAppointments },
    recentAppointments: formattedRecent
  });
});

const createDoctor = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, phone, specialisation, qualifications, experience, bio, consultationFee, slotDuration } = req.body;
  if (await User.findOne({ email })) return badRequest(res, "Email already registered");
  const user = await User.create({ email, password: await bcrypt.hash(password || "Doctor@123", 12), firstName, lastName, phone, role: "DOCTOR" });
  const dp = await DoctorProfile.create({ userId: user._id, specialisation: specialisation || "General", qualifications: qualifications || "", experience: experience || 0, bio, consultationFee: consultationFee || 0, slotDuration: slotDuration || 30, isVerified: true });
  const { password: _, ...safe } = user.toObject();
  return created(res, { ...safe, doctorProfile: dp }, "Doctor created");
});

const getDoctors = asyncHandler(async (req, res) => {
  const { search, specialisation, page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const q = { role: "DOCTOR" };
  if (search) {
    const r = new RegExp(search, "i");
    q.$or = [{ firstName: r }, { lastName: r }, { email: r }];
  }
  const [users, total] = await Promise.all([
    User.find(q).skip(skip).limit(Number(limit)).lean(),
    User.countDocuments(q)
  ]);
  const ids = users.map(u => u._id);
  const dpQ = { userId: { $in: ids } };
  if (specialisation) dpQ.specialisation = new RegExp(specialisation, "i");
  const dps = await DoctorProfile.find(dpQ).lean();
  const dpMap = Object.fromEntries(dps.map(d => [d.userId.toString(), d]));
  const doctors = users.map(({ password, ...u }) => ({ ...u, doctorProfile: dpMap[u._id.toString()] }));
  return success(res, { doctors, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } });
});

const updateDoctor = asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, specialisation, qualifications, experience, bio, consultationFee, slotDuration, isVerified } = req.body;
  const user = await User.findOneAndUpdate({ _id: req.params.id, role: "DOCTOR" }, { firstName, lastName, phone }, { new: true }).lean();
  if (!user) return notFound(res, "Doctor not found");
  const dp = await DoctorProfile.findOneAndUpdate({ userId: req.params.id }, { specialisation, qualifications, experience, bio, consultationFee, slotDuration, isVerified }, { new: true });
  const { password, ...safe } = user;
  return success(res, { ...safe, doctorProfile: dp });
});

const deleteDoctor = asyncHandler(async (req, res) => {
  const user = await User.findOneAndUpdate({ _id: req.params.id, role: "DOCTOR" }, { isActive: false });
  if (!user) return notFound(res, "Doctor not found");
  return success(res, {}, "Doctor deactivated");
});

const getDoctorById = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: "DOCTOR" }).lean();
  if (!user) return notFound(res, "Doctor not found");
  const dp = await DoctorProfile.findOne({ userId: user._id }).lean();
  const { password, ...safe } = user;
  return success(res, { ...safe, doctorProfile: dp });
});

const addLeaveDay = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  const { date, reason } = req.body;
  const doctor = await DoctorProfile.findOne({ userId: doctorId });
  if (!doctor) return notFound(res, "Doctor not found");
  const leaveDate = new Date(date);
  leaveDate.setHours(0, 0, 0, 0);
  if (await LeaveDay.findOne({ doctorProfileId: doctor._id, date: leaveDate })) return badRequest(res, "Leave already marked");
  const leave = await LeaveDay.create({ doctorProfileId: doctor._id, date: leaveDate, reason });
  const dayEnd = new Date(leaveDate);
  dayEnd.setHours(23, 59, 59, 999);
  const affected = await Appointment.find({ doctorProfileId: doctor._id, scheduledAt: { $gte: leaveDate, $lte: dayEnd }, status: { $in: ["CONFIRMED", "PENDING"] } })
    .populate({ path: "patientProfileId", populate: { path: "userId", select: "email firstName lastName" } });
  for (const apt of affected) {
    await Appointment.updateOne({ _id: apt._id }, { status: "CANCELLED", cancelReason: "Doctor on leave" });
    const pu = apt.patientProfileId?.userId;
    if (pu) queueNotification({ appointmentId: apt._id, recipientEmail: pu.email, recipientName: pu.firstName + " " + pu.lastName, type: "CANCELLATION", subject: "Appointment Cancelled", body: "Your appointment on " + leaveDate.toDateString() + " was cancelled - doctor on leave." }).catch(() => {});
  }
  return created(res, { leave, affectedCount: affected.length }, "Leave added");
});

const removeLeaveDay = asyncHandler(async (req, res) => {
  const leave = await LeaveDay.findById(req.params.leaveId);
  if (!leave) return notFound(res, "Leave not found");
  await leave.deleteOne();
  return success(res, {}, "Leave removed");
});

const getPatients = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const q = { role: "PATIENT" };
  if (search) {
    const r = new RegExp(search, "i");
    q.$or = [{ firstName: r }, { lastName: r }, { email: r }];
  }
  const [patients, total] = await Promise.all([
    User.find(q).skip(skip).limit(Number(limit)).lean(),
    User.countDocuments(q)
  ]);
  return success(res, { patients: patients.map(({ password, ...p }) => p), pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } });
});

const getAllAppointments = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const q = status ? { status } : {};
  const [appointments, total] = await Promise.all([
    Appointment.find(q)
      .skip(skip)
      .limit(Number(limit))
      .sort({ scheduledAt: -1 })
      .populate({ path: "doctorProfileId", populate: { path: "userId", select: "firstName lastName email" } })
      .populate({ path: "patientProfileId", populate: { path: "userId", select: "firstName lastName email" } })
      .lean(),
    Appointment.countDocuments(q)
  ]);

  const formattedAppointments = appointments.map(apt => {
    const pUser = apt.patientProfileId?.userId || apt.patient?.user || {};
    const dUser = apt.doctorProfileId?.userId || apt.doctor?.user || {};
    return {
      ...apt,
      id: apt._id?.toString() || apt.id,
      patient: {
        user: {
          firstName: pUser.firstName || (apt.patientName ? apt.patientName.split(' ')[0] : 'Rahul'),
          lastName: pUser.lastName || (apt.patientName ? apt.patientName.split(' ').slice(1).join(' ') : 'Sharma'),
          email: pUser.email || 'patient@healthsync.com'
        }
      },
      doctor: {
        user: {
          firstName: dUser.firstName || (apt.doctorName ? apt.doctorName.replace('Dr. ', '').split(' ')[0] : 'Emily'),
          lastName: dUser.lastName || (apt.doctorName ? apt.doctorName.replace('Dr. ', '').split(' ').slice(1).join(' ') : 'Williams'),
          email: dUser.email || 'dr.williams@healthsync.com'
        },
        specialisation: apt.doctorProfileId?.specialisation || 'General Practice'
      }
    };
  });

  return success(res, {
    appointments: formattedAppointments,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
  });
});

module.exports = {
  getDashboardStats,
  createDoctor,
  getDoctors,
  updateDoctor,
  deleteDoctor,
  getDoctorById,
  addLeaveDay,
  removeLeaveDay,
  getPatients,
  getAllAppointments
};

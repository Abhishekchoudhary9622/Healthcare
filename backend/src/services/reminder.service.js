const MedicationReminder = require("../models/MedicationReminder");
const Appointment        = require("../models/Appointment");
const { queueNotification } = require("./notification.service");
const { parseFrequencyToHours } = require("../utils/slots");
const logger = require("../config/logger");

const scheduleMedicationReminders = async (appointmentId, prescriptions, patientProfile) => {
  try {
    const docs = [];
    for (const p of prescriptions) {
      const hours = parseFrequencyToHours(p.frequency);
      const start = new Date(p.startDate||new Date());
      for (let day=0;day<p.durationDays;day++) {
        for (const h of hours) {
          const sf = new Date(start); sf.setDate(sf.getDate()+day); sf.setHours(h,0,0,0);
          if (sf>new Date()) docs.push({ prescriptionId:p._id, appointmentId, patientEmail:patientProfile.userId.email, patientName:patientProfile.userId.firstName+" "+patientProfile.userId.lastName, medicationName:p.medicationName, dosage:p.dosage, scheduledFor:sf });
        }
      }
    }
    if (docs.length) { await MedicationReminder.insertMany(docs); logger.info("Scheduled "+docs.length+" reminders"); }
  } catch(e) { logger.error("Reminder schedule error: "+e.message); }
};

const processDueMedicationReminders = async () => {
  const now=new Date(), end=new Date(now.getTime()+5*60*1000);
  const due = await MedicationReminder.find({ sent:false, scheduledFor:{ $gte:now,$lte:end } }).limit(100);
  for (const r of due) {
    try {
      await queueNotification({ appointmentId:r.appointmentId, recipientEmail:r.patientEmail, recipientName:r.patientName, type:"MEDICATION_REMINDER", subject:"Medication Reminder: "+r.medicationName, body:"Time to take "+r.medicationName+" "+r.dosage });
      await MedicationReminder.findByIdAndUpdate(r._id,{ sent:true, sentAt:new Date() });
    } catch(e) { logger.error("Reminder send error: "+e.message); }
  }
};

const processAppointmentReminders = async () => {
  const now=new Date();
  const in24h=new Date(now.getTime()+24*60*60*1000), in24hEnd=new Date(in24h.getTime()+5*60*1000);
  const in1h =new Date(now.getTime()+   60*60*1000), in1hEnd =new Date(in1h.getTime() +5*60*1000);
  const apts = await Appointment.find({ status:{ $in:["CONFIRMED","PENDING"] }, $or:[{ scheduledAt:{ $gte:in24h,$lte:in24hEnd } },{ scheduledAt:{ $gte:in1h,$lte:in1hEnd } }] })
    .populate({ path:"patientProfileId", populate:{ path:"userId", select:"email firstName lastName" } })
    .populate({ path:"doctorProfileId",  populate:{ path:"userId", select:"firstName lastName" } });
  for (const apt of apts) {
    const pu=apt.patientProfileId?.userId, du=apt.doctorProfileId?.userId;
    if (!pu) continue;
    const hrs=Math.round((apt.scheduledAt-now)/(60*60*1000));
    queueNotification({ appointmentId:apt._id, recipientEmail:pu.email, recipientName:pu.firstName+" "+pu.lastName, type:"APPOINTMENT_REMINDER", subject:"Appointment in "+hrs+" hour(s)", body:"Reminder: appointment with Dr. "+du?.firstName+" "+du?.lastName+" in "+hrs+" hour(s)" }).catch(()=>{});
  }
};

module.exports = { scheduleMedicationReminders, processDueMedicationReminders, processAppointmentReminders };

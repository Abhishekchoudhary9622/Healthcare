const { google } = require("googleapis");
const DoctorProfile = require("../models/DoctorProfile");
const Appointment   = require("../models/Appointment");
const logger = require("../config/logger");
const config = require("../config");

const oauth2Client = new google.auth.OAuth2(config.GOOGLE_CLIENT_ID, config.GOOGLE_CLIENT_SECRET, config.GOOGLE_REDIRECT_URI);
const calendar = google.calendar({ version:"v3", auth:oauth2Client });

const getAuthUrl = (userId) => oauth2Client.generateAuthUrl({ access_type:"offline", scope:["https://www.googleapis.com/auth/calendar.events"], state:userId, prompt:"consent" });

const handleCallback = async (code, userId) => {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  await DoctorProfile.findOneAndUpdate({ userId }, { googleTokens: tokens });
  return tokens;
};

const createCalendarEvent = async (appointmentId, { patientUser, doctorUser, scheduledAt, endsAt, doctorSpecialisation }) => {
  if (!config.GOOGLE_CLIENT_ID||!config.GOOGLE_CLIENT_SECRET) return;
  try {
    const event = { summary:"Medical Appointment - "+doctorSpecialisation, start:{ dateTime:new Date(scheduledAt).toISOString(), timeZone:"UTC" }, end:{ dateTime:new Date(endsAt).toISOString(), timeZone:"UTC" }, attendees:[{ email:patientUser.email },{ email:doctorUser.email }], reminders:{ useDefault:false, overrides:[{ method:"email", minutes:60 },{ method:"popup", minutes:30 }] } };
    const created = await calendar.events.insert({ calendarId:"primary", resource:event, sendUpdates:"all" });
    await Appointment.findByIdAndUpdate(appointmentId,{ googleCalendarEventIdDoctor:created.data.id, googleCalendarEventIdPatient:created.data.id });
    logger.info("Calendar event created: "+created.data.id);
  } catch(e) { logger.warn("Calendar event failed: "+e.message); }
};

const deleteCalendarEvent = async (appointmentId) => {
  if (!config.GOOGLE_CLIENT_ID) return;
  try {
    const apt = await Appointment.findById(appointmentId).select("googleCalendarEventIdDoctor");
    if (!apt?.googleCalendarEventIdDoctor) return;
    await calendar.events.delete({ calendarId:"primary", eventId:apt.googleCalendarEventIdDoctor, sendUpdates:"all" });
  } catch(e) { logger.warn("Calendar delete failed: "+e.message); }
};

const updateCalendarEvent = async (appointmentId, { scheduledAt, endsAt }) => {
  if (!config.GOOGLE_CLIENT_ID) return;
  try {
    const apt = await Appointment.findById(appointmentId).select("googleCalendarEventIdDoctor");
    if (!apt?.googleCalendarEventIdDoctor) return;
    await calendar.events.patch({ calendarId:"primary", eventId:apt.googleCalendarEventIdDoctor, resource:{ start:{ dateTime:new Date(scheduledAt).toISOString(), timeZone:"UTC" }, end:{ dateTime:new Date(endsAt).toISOString(), timeZone:"UTC" } }, sendUpdates:"all" });
  } catch(e) { logger.warn("Calendar update failed: "+e.message); }
};

module.exports = { getAuthUrl, handleCallback, createCalendarEvent, deleteCalendarEvent, updateCalendarEvent };

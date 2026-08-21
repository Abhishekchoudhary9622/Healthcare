const cron = require("node-cron");
const logger = require("../config/logger");
const { processDueMedicationReminders, processAppointmentReminders } = require("../services/reminder.service");
const { retryFailedNotifications } = require("../services/notification.service");
const SlotHold   = require("../models/SlotHold");
const RefreshToken = require("../models/RefreshToken");

const startScheduler = () => {
  cron.schedule("*/5 * * * *",  async () => { try { await processDueMedicationReminders(); } catch(e){ logger.error("MedReminder: "+e.message); } });
  cron.schedule("*/15 * * * *", async () => { try { await processAppointmentReminders();   } catch(e){ logger.error("AptReminder: "+e.message); } });
  cron.schedule("*/10 * * * *", async () => { try { await retryFailedNotifications();       } catch(e){ logger.error("Notif retry: "+e.message); } });
  cron.schedule("* * * * *",    async () => { try { const d=await SlotHold.deleteMany({ expiresAt:{ $lt:new Date() } }); if(d.deletedCount>0) logger.debug("Cleaned "+d.deletedCount+" slot holds"); } catch(e){} });
  cron.schedule("0 0 * * *",    async () => { try { const d=await RefreshToken.deleteMany({ expiresAt:{ $lt:new Date() } }); logger.info("Cleaned "+d.deletedCount+" refresh tokens"); } catch(e){} });
  logger.info("Background scheduler started");
};
module.exports = { startScheduler };

const Notification = require("../models/Notification");
const { sendEmail } = require("./email.service");
const logger = require("../config/logger");
const MAX_RETRIES = 3;
const RETRY_DELAYS = [0, 60000, 300000];

const queueNotification = async ({ appointmentId, recipientEmail, recipientName, type, subject, body }) => {
  try {
    const n = await Notification.create({ appointmentId, recipientEmail, recipientName, type, subject, body, status:"PENDING" });
    await processNotification(n);
  } catch(e) { logger.error("Failed to queue notification: "+e.message); }
};

const processNotification = async (n) => {
  try {
    await sendEmail({ to: n.recipientEmail, subject: n.subject, text: n.body });
    await Notification.findByIdAndUpdate(n._id,{ status:"SENT", sentAt:new Date(), $inc:{ attempts:1 } });
    logger.info("Notification sent: "+n._id);
  } catch(e) {
    const attempts = (n.attempts||0)+1;
    if (attempts>=MAX_RETRIES) {
      await Notification.findByIdAndUpdate(n._id,{ status:"FAILED", attempts, lastAttemptAt:new Date(), errorMessage:e.message });
    } else {
      await Notification.findByIdAndUpdate(n._id,{ status:"RETRYING", attempts, lastAttemptAt:new Date(), errorMessage:e.message });
      setTimeout(async()=>{ const fresh=await Notification.findById(n._id); if(fresh&&fresh.status==="RETRYING") await processNotification({...fresh.toObject(),attempts}); }, RETRY_DELAYS[attempts]||300000);
    }
  }
};

const retryFailedNotifications = async () => {
  const stale = await Notification.find({ status:{ $in:["RETRYING","PENDING"] }, attempts:{ $lt:MAX_RETRIES }, lastAttemptAt:{ $lt:new Date(Date.now()-5*60*1000) } }).limit(50);
  for (const n of stale) processNotification(n).catch(()=>{});
  if (stale.length>0) logger.info("Retrying "+stale.length+" notifications");
};

module.exports = { queueNotification, retryFailedNotifications };

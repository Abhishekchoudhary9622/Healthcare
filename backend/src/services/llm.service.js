const https = require("https");
const Appointment = require("../models/Appointment");
const logger = require("../config/logger");

// Uses Gemini REST API directly (works with AQ.* key format)
const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_HOST  = "generativelanguage.googleapis.com";

const callGemini = (prompt) => new Promise((resolve, reject) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) { reject(new Error("GEMINI_API_KEY not set")); return; }
  const body = JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] });
  const path = "/v1beta/models/" + GEMINI_MODEL + ":generateContent?key=" + key;
  const req = https.request(
    { hostname: GEMINI_HOST, path, method: "POST", headers: { "Content-Type": "application/json" } },
    (res) => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => {
        try {
          const json = JSON.parse(d);
          if (json.error) { reject(new Error(json.error.message)); return; }
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
          resolve(text);
        } catch(e) { reject(e); }
      });
    }
  );
  req.on("error", reject);
  req.write(body);
  req.end();
});

const parseJSON = (raw) => {
  const clean = raw.trim().replace(/```json/gi,"").replace(/```/g,"").trim();
  try { return JSON.parse(clean); }
  catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) { try { return JSON.parse(match[0]); } catch {} }
    return null;
  }
};

// Pre-Visit Summary
const generatePreVisitSummary = async (appointmentId, symptoms) => {
  try {
    const prompt = `You are a medical assistant AI. Analyse the patient symptoms and respond with ONLY a valid JSON object, no markdown:
{"urgencyLevel":"LOW","chiefComplaint":"one sentence","suggestedQuestions":["q1","q2","q3"],"summary":"2-3 sentence patient-friendly summary"}
Use urgencyLevel: LOW, MEDIUM, or HIGH only.
Symptoms: ${symptoms}`;

    const raw = await callGemini(prompt);
    const parsed = parseJSON(raw);

    if (!parsed) {
      logger.warn("Gemini returned invalid JSON, using mock for appointment " + appointmentId);
      return await saveMockPreVisit(appointmentId, symptoms);
    }

    await Appointment.findByIdAndUpdate(appointmentId, {
      preVisitSummary:    parsed.summary || "Patient reports: " + symptoms,
      urgencyLevel:       ["LOW","MEDIUM","HIGH"].includes(parsed.urgencyLevel) ? parsed.urgencyLevel : "MEDIUM",
      chiefComplaint:     parsed.chiefComplaint || "",
      suggestedQuestions: Array.isArray(parsed.suggestedQuestions) ? parsed.suggestedQuestions : [],
    });
    logger.info("Gemini pre-visit summary saved for " + appointmentId);
    return parsed;
  } catch (e) {
    logger.error("Gemini pre-visit error: " + e.message);
    await saveMockPreVisit(appointmentId, symptoms).catch(() => {});
    return null;
  }
};

// Post-Visit Summary
const generatePostVisitSummary = async (appointmentId, clinicalNotes, prescriptions = []) => {
  try {
    const rxText = prescriptions.length
      ? prescriptions.map(p => `${p.medicationName} ${p.dosage} ${p.frequency} for ${p.durationDays} days`).join("; ")
      : "No medications prescribed.";

    const prompt = `You are a medical communication specialist. Convert these clinical notes into a patient-friendly summary. Respond with ONLY valid JSON, no markdown:
{"summary":"2-3 paragraph patient-friendly explanation","medicationSchedule":"clear medication instructions","followUpSteps":["step1","step2","step3"],"warningSymptoms":["symptom1","symptom2"]}
Clinical Notes: ${clinicalNotes}
Prescriptions: ${rxText}`;

    const raw = await callGemini(prompt);
    const parsed = parseJSON(raw);

    if (!parsed) return await saveMockPostVisit(appointmentId, clinicalNotes, rxText);

    const full = [
      parsed.summary,
      "\n\nMedication Schedule:\n" + (parsed.medicationSchedule || rxText),
      "\n\nFollow-up Steps:\n" + (parsed.followUpSteps || []).map((s,i) => `${i+1}. ${s}`).join("\n"),
      parsed.warningSymptoms?.length ? "\n\nSeek immediate care if you experience:\n" + parsed.warningSymptoms.map(s=>`• ${s}`).join("\n") : ""
    ].join("");

    await Appointment.findByIdAndUpdate(appointmentId, { postVisitSummary: full });

    // Notify patient
    const apt = await Appointment.findById(appointmentId)
      .populate({ path: "patientProfileId", populate: { path: "userId", select: "email firstName lastName" } })
      .populate({ path: "doctorProfileId",  populate: { path: "userId", select: "firstName lastName" } });

    if (apt?.patientProfileId?.userId) {
      const pu = apt.patientProfileId.userId;
      const du = apt.doctorProfileId?.userId;
      const { queueNotification } = require("./notification.service");
      queueNotification({
        appointmentId,
        recipientEmail: pu.email,
        recipientName:  pu.firstName + " " + pu.lastName,
        type:    "POST_VISIT_SUMMARY",
        subject: "Your Visit Summary - Dr. " + (du ? du.firstName + " " + du.lastName : ""),
        body:    "Dear " + pu.firstName + ",\n\n" + full + "\n\nBest regards,\nHealthSync Team",
      }).catch(() => {});
    }

    logger.info("Gemini post-visit summary saved for " + appointmentId);
    return parsed;
  } catch (e) {
    logger.error("Gemini post-visit error: " + e.message);
    await saveMockPostVisit(appointmentId, clinicalNotes, "").catch(() => {});
    return null;
  }
};

// Fallbacks
const saveMockPreVisit = async (id, symptoms) => {
  const data = {
    urgencyLevel: "MEDIUM",
    chiefComplaint: "Patient reports: " + (symptoms || "").substring(0, 100),
    suggestedQuestions: ["When did these symptoms start?", "Have you taken any medication?", "Do you have known allergies?"],
    summary: "Patient has reported: " + symptoms + ". Please review before the appointment.",
  };
  await Appointment.findByIdAndUpdate(id, {
    preVisitSummary: data.summary, urgencyLevel: data.urgencyLevel,
    chiefComplaint: data.chiefComplaint, suggestedQuestions: data.suggestedQuestions,
  });
  return data;
};

const saveMockPostVisit = async (id, notes, rxText) => {
  const summary = "Based on your visit:\n\n" + (notes || "Please contact the clinic.") + "\n\nPrescribed: " + (rxText || "None") + "\n\nFollow the treatment plan and contact us if symptoms worsen.";
  await Appointment.findByIdAndUpdate(id, { postVisitSummary: summary });
  return summary;
};

module.exports = { generatePreVisitSummary, generatePostVisitSummary };
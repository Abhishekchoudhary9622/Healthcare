const Consultation = require('../models/Consultation');
const Appointment = require('../models/Appointment');
const logger = require('../config/logger');

// In-memory room participant tracking
const roomParticipants = new Map(); // roomId => Set of { socketId, userId, role, name }

function initSignalingSocket(io) {
  io.on('connection', (socket) => {
    logger.info(`[Signaling Socket] Client connected: ${socket.id}`);

    // 1. Join Consultation Room
    socket.on('join-room', async ({ roomId, userId, role, name }) => {
      try {
        socket.join(roomId);
        socket.roomId = roomId;
        socket.userId = userId;
        socket.userRole = role;
        socket.userName = name;

        if (!roomParticipants.has(roomId)) {
          roomParticipants.set(roomId, new Map());
        }
        const participants = roomParticipants.get(roomId);
        participants.set(userId, { socketId: socket.id, userId, role, name });

        logger.info(`[Signaling] User ${name} (${role}) joined room: ${roomId}`);

        // Update consultation status in MongoDB
        let consultation = await Consultation.findOne({ roomId });
        const now = new Date();

        if (consultation) {
          if (role === 'PATIENT' && !consultation.patientJoinedAt) {
            consultation.patientJoinedAt = now;
          }
          if (role === 'DOCTOR' && !consultation.doctorJoinedAt) {
            consultation.doctorJoinedAt = now;
          }

          // If both have joined and not already completed, mark ACTIVE
          const hasPatient = Array.from(participants.values()).some(p => p.role === 'PATIENT');
          const hasDoctor = Array.from(participants.values()).some(p => p.role === 'DOCTOR');

          if (hasPatient && hasDoctor && consultation.status !== 'COMPLETED') {
            consultation.status = 'ACTIVE';
            if (!consultation.startedAt) consultation.startedAt = now;
          } else if ((hasPatient || hasDoctor) && consultation.status === 'SCHEDULED') {
            consultation.status = 'WAITING';
          }
          await consultation.save();
        }

        // Inform other peer that someone joined
        socket.to(roomId).emit('user-joined', {
          socketId: socket.id,
          userId,
          role,
          name,
          participants: Array.from(participants.values())
        });

        // Send current room status back to joining socket
        socket.emit('room-ready', {
          roomId,
          participants: Array.from(participants.values()),
          consultation
        });

      } catch (err) {
        logger.error(`[Signaling] Error joining room ${roomId}: ${err.message}`);
        socket.emit('error', { message: 'Failed to join consultation room' });
      }
    });

    // 2. WebRTC Offer
    socket.on('offer', ({ roomId, offer, toUserId }) => {
      logger.info(`[Signaling] Relaying offer in ${roomId} from ${socket.userId}`);
      socket.to(roomId).emit('offer', {
        offer,
        fromUserId: socket.userId,
        fromSocketId: socket.id
      });
    });

    // 3. WebRTC Answer
    socket.on('answer', ({ roomId, answer, toUserId }) => {
      logger.info(`[Signaling] Relaying answer in ${roomId} from ${socket.userId}`);
      socket.to(roomId).emit('answer', {
        answer,
        fromUserId: socket.userId,
        fromSocketId: socket.id
      });
    });

    // 4. ICE Candidates
    socket.on('ice-candidate', ({ roomId, candidate }) => {
      socket.to(roomId).emit('ice-candidate', {
        candidate,
        fromUserId: socket.userId
      });
    });

    // 5. Media Toggle (Camera / Mic State broadcast)
    socket.on('toggle-media', ({ roomId, type, enabled }) => {
      socket.to(roomId).emit('peer-media-toggled', {
        userId: socket.userId,
        type, // 'audio' | 'video' | 'screen'
        enabled
      });
    });

    // 6. In-Call Real-Time Chat Message
    socket.on('send-message', async ({ roomId, text }) => {
      try {
        const msg = {
          senderId: socket.userId || 'anonymous',
          senderName: socket.userName || 'Participant',
          senderRole: socket.userRole || 'PATIENT',
          text,
          timestamp: new Date()
        };

        // Persist message in consultation
        await Consultation.updateOne(
          { roomId },
          { $push: { chatMessages: msg } }
        );

        io.to(roomId).emit('receive-message', msg);
      } catch (err) {
        logger.error(`[Signaling] Chat error in ${roomId}: ${err.message}`);
      }
    });

    // 7. End Consultation
    socket.on('end-consultation', async ({ roomId }) => {
      try {
        logger.info(`[Signaling] Consultation ended in room: ${roomId}`);
        const consultation = await Consultation.findOne({ roomId });
        if (consultation && consultation.status !== 'COMPLETED') {
          consultation.status = 'COMPLETED';
          consultation.endedAt = new Date();
          if (consultation.startedAt) {
            consultation.durationSeconds = Math.round((consultation.endedAt - consultation.startedAt) / 1000);
          }
          await consultation.save();

          // Update appointment status to COMPLETED
          await Appointment.updateOne(
            { _id: consultation.appointmentId },
            { status: 'COMPLETED' }
          );
        }

        io.to(roomId).emit('consultation-ended', {
          roomId,
          durationSeconds: consultation?.durationSeconds || 0
        });
      } catch (err) {
        logger.error(`[Signaling] End consultation error: ${err.message}`);
      }
    });

    // 8. Disconnect Cleanup
    socket.on('disconnect', () => {
      const { roomId, userId, userName, userRole } = socket;
      if (roomId && roomParticipants.has(roomId)) {
        const participants = roomParticipants.get(roomId);
        participants.delete(userId);
        if (participants.size === 0) {
          roomParticipants.delete(roomId);
        }

        logger.info(`[Signaling] User disconnected: ${userName} (${userRole}) from ${roomId}`);
        socket.to(roomId).emit('user-left', {
          userId,
          name: userName,
          role: userRole,
          remainingParticipants: participants ? Array.from(participants.values()) : []
        });
      }
    });
  });
}

module.exports = { initSignalingSocket };

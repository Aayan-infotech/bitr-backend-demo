import mongoose from "mongoose";
import Incident from '../models/reportIncidentModel.js';
import Class from '../models/classesAdminModel.js';

export const reportIncident = async (req, res) => {
  try {
    const { instructorId } = req.params;
    const { classId, description } = req.body;

    if (!classId || !instructorId || !description) {
      return res.status(400).json({
        success: false,
        message: 'classId, instructorId, and description are required',
      });
    }

    const cls = await Class.findById(classId);
    if (!cls) {
      return res.status(404).json({
        success: false,
        message: 'Class not found',
      });
    }

    const istNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

    const processedSessions = cls.sessions.map((session) => {
      const date = new Date(session.date);
      const [sh, sm] = session.startTime.split(':').map(Number);
      const [eh, em] = session.endTime.split(':').map(Number);

      const start = new Date(date);
      const end = new Date(date);
      start.setHours(sh, sm, 0, 0);
      end.setHours(eh, em, 0, 0);

      return {
        ...session.toObject(),
        start,
        end,
      };
    });

    let selectedSession = processedSessions.find(
      s => istNow >= s.start && istNow <= s.end
    );

    if (!selectedSession) {
      const pastSessions = processedSessions
        .filter(s => s.end < istNow)
        .sort((a, b) => b.end - a.end); 

      if (pastSessions.length > 0) {
        selectedSession = pastSessions[0];
      }
    }

    if (!selectedSession) {
      return res.status(400).json({
        success: false,
        message: 'No live or past session found for this class.',
      });
    }

    const existingIncident = await Incident.findOne({
      class: classId,
      sessionId: selectedSession._id,
      instructor: instructorId,
    });

    let incident;
    if (existingIncident) {
      existingIncident.description = description;
      existingIncident.updatedAt = new Date();
      incident = await existingIncident.save();
    } else {
      incident = new Incident({
        class: classId,
        sessionId: selectedSession._id,
        instructor: instructorId,
        description,
      });
      await incident.save();
    }

    res.status(201).json({
      success: true,
      message: existingIncident ? 'Incident updated' : 'Incident created',
      data: incident,
    });

  } catch (error) {
    console.error('Error reporting incident:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while reporting incident',
    });
  }
};

export const getIncidentsByClassId = async (req, res) => {
  try {
    const { classId } = req.params;

    const incidents = await Incident.find({ class: classId });

    res.status(200).json({
      success: true,
      message: `Incidents for class ${classId}`,
      data: incidents,
    });
  } catch (error) {
    console.error('Error fetching incidents by classId:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getIncidentsBySessionId = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const incidents = await Incident.find({ sessionId }).populate('instructor', 'name email');

    res.status(200).json({
      success: true,
      message: `Incidents for session ${sessionId}`,
      data: incidents,
    });
  } catch (error) {
    console.error('Error fetching incidents by sessionId:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getIncidentById = async (req, res) => {
  try {
    const { incidentId } = req.params;

    const incident = await Incident.findById(incidentId).populate('instructor', 'name email');

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Incident found',
      data: incident,
    });
  } catch (error) {
    console.error('Error fetching incident by ID:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateIncident = async (req, res) => {
  try {
    const { incidentId } = req.params;
    const { description } = req.body;

    const updated = await Incident.findByIdAndUpdate(
      incidentId,
      { description },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Incident updated',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating incident:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteIncident = async (req, res) => {
  try {
    const { incidentId } = req.params;

    const deleted = await Incident.findByIdAndDelete(incidentId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Incident deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting incident:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};



export default {
    reportIncident,
    getIncidentsByClassId,
    getIncidentsBySessionId,
    getIncidentById,
    updateIncident,
    deleteIncident

}
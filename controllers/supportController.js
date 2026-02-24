import SupportTicket from '../models/SupportTicket.js';
import SupportMessage from '../models/SupportMessage.js';
import User from '../models/User.js';
import { saveBufferLocally } from '../utils/localUploader.js';
import path from 'path';
import Location from '../models/locationModel.js';

const createTicket = async (req, res, next) => {
  try {
    const { subject, message } = req.body;
    const userId = req.params.userId;

    if (!subject || !message) {
      return next({ status: 400, message: 'Subject and message are required' });
    } 

    const userExists = await User.findById(userId);
    if (!userExists) {
      return next({ status: 404, message: 'User not found' });
    } 

    let attachment = null;
    let attachmentType = null;
    const files = Array.isArray(req.files) ? req.files : (req.files?.files || []);
    if (files && files.length > 0) {
      const { relPath } = await saveBufferLocally(files[0], 'support'); 
      attachment = relPath;
      const ext = path.extname(relPath).toLowerCase();
      attachmentType = ext === '.pdf' ? 'pdf'
        : ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext) ? 'image'
        : null; 
    }

    let ticket = await SupportTicket.findOne({ userId, subject });

    if (!ticket) {
      ticket = await SupportTicket.create({ userId, subject }); 

      const msg = await SupportMessage.create({
        ticketId: ticket._id,
        senderId: userId,
        message,
        attachment,
        attachmentType
      });

      const data = ticket.toObject ? ticket.toObject() : ticket;
      const messageData = msg.toObject ? msg.toObject() : msg;
      if (messageData.attachment) {
        messageData.attachment = toAbsoluteUrl(req, messageData.attachment);
      } 
      return res.status(201).json({
        success: true,
        message: 'Support ticket created',
        data: { ticket: data, firstMessage: messageData }
      }); 
    } else {
      const msg = await SupportMessage.create({
        ticketId: ticket._id,
        senderId: userId,
        message,
        attachment,
        attachmentType
      }); 

      const data = ticket.toObject ? ticket.toObject() : ticket;
      const messageData = msg.toObject ? msg.toObject() : msg;
      if (messageData.attachment) {
        messageData.attachment = toAbsoluteUrl(req, messageData.attachment);
      } 

      return res.status(200).json({
        success: true,
        message: 'Message added to existing ticket',
        data: { ticket: data, message: messageData }
      }); 
    }
  } catch (err) {
    console.error(err);
    return next({ status: 500, message: 'Internal server error' });
  }
};

const addMessage = async (req, res, next) => {
  try {
    const { ticketId, message, isAdmin } = req.body;
    const senderId = isAdmin ? "000000000000000000000000" : req.params.userId;

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) return next({ status: 404, message: 'Ticket not found' }); 

    if (ticket.status === "Closed") {
      return res.status(400).json({
        success: false,
        message: "Cannot add messages to a closed ticket."
      }); 
    }

    let attachment = null;
    let attachmentType = null;

    const files = Array.isArray(req.files) ? req.files : (req.files?.files || []);
    if (files && files.length > 0) {
      const { relPath } = await saveBufferLocally(files[0], 'support'); 
      attachment = relPath;
      const ext = path.extname(relPath).toLowerCase();
      attachmentType = ext === '.pdf' ? 'pdf'
        : ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext) ? 'image'
        : null; 
    }

    const msg = await SupportMessage.create({
      ticketId,
      senderId,
      message,
      attachment,
      attachmentType
    }); 

    const messageData = msg.toObject ? msg.toObject() : msg;
    if (messageData.attachment) {
      messageData.attachment = toAbsoluteUrl(req, messageData.attachment);
    } 

    return res.status(200).json({
      success: true,
      message: 'Message sent',
      data: messageData
    }); 
  } catch (err) {
    console.error(err);
    return next({ status: 500, message: 'Internal server error' });
  }
};


const getTicketMeta = async (req, res, next) => {
    try {
        const { ticketId } = req.params;
        const ticket = await SupportTicket.findById(ticketId).populate('userId', 'name profilePicture role location');
        if (!ticket) return next({ status: 404, message: 'Ticket not found' });

        let locationName = null;
        if (ticket.userId && ticket.userId.location) {
            const locationDoc = await Location.findById(ticket.userId.location);
            locationName = locationDoc ? locationDoc.location : null;
        }

        return res.status(200).json({
            success: true,
            data: {
                subject: ticket.subject,
                status: ticket.status,
                user: {
                    ...ticket.userId.toObject(),
                    location: locationName
                }
            }
        });
    } catch (err) {
        console.error(err);
        return next({ status: 500, message: 'Internal server error' });
    }
};

const getTicketThread = async (req, res, next) => {
    try {
        const { ticketId } = req.params;

        const messages = await SupportMessage.find({ ticketId })
            .sort({ createdAt: 1 })
            .populate('senderId', 'name role profilePicture location');

        const ticket = await SupportTicket.findById(ticketId);
        if (!ticket) return next({ status: 404, message: 'Ticket not found' });

        // Default admin sender object
        const adminSender = {
            _id: "",
            role: "admin",
            name: "Admin",
            profilePicture: "https://bucket3-k4f5b0l7.s3.amazonaws.com/5e263fd5-82ef-4e3d-8b01-ac5bb3984e96.webp",
            location: ""
        };

        return res.status(200).json({
            success: true,
            subject: ticket.subject,
            thread: messages.map(msg => ({
                message: msg.message,
                sender: (msg.senderId === null || (msg.senderId && msg.senderId._id === "000000000000000000000000"))
                    ? adminSender
                    : msg.senderId,
                attachment: msg.attachment,
                attachmentType: msg.attachmentType,
                createdAt: msg.createdAt
            }))
        });
    } catch (err) {
        console.error(err);
        return next({ status: 500, message: 'Internal server error' });
    }
};

const getTicketAll = async (req, res, next) => {
    try {
        const tickets = await SupportTicket.find().populate('userId', 'name email profilePicture role location');
        const results = [];

        for (const ticket of tickets) {
            let locationName = null;
            if (ticket.userId && ticket.userId.location) {
                const locationDoc = await Location.findById(ticket.userId.location);
                locationName = locationDoc ? locationDoc.location : null;
            }
            results.push({
                ticketId: ticket._id,
                subject: ticket.subject,
                status: ticket.status,
                user: {
                    ...ticket.userId?.toObject(),
                    location: locationName
                }
            });
        }

        return res.status(200).json({
            success: true,
            data: results
        });
    } catch (err) {
        console.error(err);
        return next({ status: 500, message: 'Internal server error' });
    }
};

const closeTicket = async (req, res, next) => {
    try {
        const { ticketId, ticketStatus } = req.params;
        const ticket = await SupportTicket.findById(ticketId);
        if (!ticket) {
            return res.status(404).json({ success: false, message: "Ticket not found" });
        }
        const allowedStatuses = ["Open", "Closed"];
        if (!allowedStatuses.includes(ticketStatus)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Allowed values are: ${allowedStatuses.join(", ")}`
            });
        }
        ticket.status = ticketStatus;
        await ticket.save();
        return res.status(200).json({ success: true, message: "Ticket closed successfully", data: ticket });
    } catch (err) {
        console.error(err);
        return next({ status: 500, message: 'Internal server error' });
    }
};

const getUserTickets = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id; 

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized: Invalid user session." });
    }

    const tickets = await SupportTicket.find({ userId })
      .populate('userId', 'name email profilePicture role location');

    const results = [];

    for (const ticket of tickets) {
      let locationName = null;
      if (ticket.userId && ticket.userId.location) {
        const locationDoc = await Location.findById(ticket.userId.location);
        locationName = locationDoc ? locationDoc.location : null;
      }

      results.push({
        ticketId: ticket._id,
        subject: ticket.subject,
        status: ticket.status,
        user: {
          ...ticket.userId?.toObject(),
          location: locationName
        }
      });
    }

    
    return res.status(200).json({
      success: true,
      data: results
    });
  } catch (err) {
    console.error("Error fetching user tickets:", err);
    return next({ status: 500, message: 'Internal server error' });
  }
};



export default {
    createTicket,
    addMessage,
    getTicketMeta,
    getTicketThread,
    getTicketAll,
    closeTicket,
    getUserTickets
};


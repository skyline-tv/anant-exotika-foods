const Lead = require('../models/Lead');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { successResponse } = require('../utils/apiResponse');
const { getPagination, buildPagination } = require('../utils/pagination');
const { safeSend, sendLeadEnquiryEmail } = require('../services/emailService');

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const phoneDigits = (value) => String(value || '').replace(/\D/g, '');

const createLead = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const message = String(req.body.message || '').trim();
  const occasion = String(req.body.occasion || '').trim();
  const digits = phoneDigits(req.body.phone);
  const local = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;

  if (name.length < 2) throw new AppError('Please enter your name.', 400);
  if (!/^[6-9]\d{9}$/.test(local)) throw new AppError('Please enter a valid mobile number.', 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError('Please enter a valid email address.', 400);
  if (!Lead.OCCASIONS.includes(occasion)) throw new AppError('Please choose an occasion.', 400);
  if (message.length > 400) throw new AppError('Please keep the note under 400 characters.', 400);

  const lead = await Lead.create({
    name,
    phone: local,
    email,
    occasion,
    message,
  });

  await safeSend(sendLeadEnquiryEmail, lead);

  successResponse(res, {
    statusCode: 201,
    message: 'Your details were received.',
    data: { lead: { id: lead._id, occasion: lead.occasion } },
  });
});

const listLeads = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};

  if (req.query.occasion && Lead.OCCASIONS.includes(req.query.occasion)) {
    filter.occasion = req.query.occasion;
  }

  if (req.query.search) {
    const regex = new RegExp(escapeRegex(req.query.search), 'i');
    filter.$or = [{ name: regex }, { email: regex }, { phone: regex }, { message: regex }];
  }

  const [leads, total] = await Promise.all([
    Lead.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Lead.countDocuments(filter),
  ]);

  successResponse(res, {
    message: 'Leads retrieved successfully',
    data: {
      leads,
      pagination: buildPagination({ page, limit, total }),
    },
  });
});

module.exports = { createLead, listLeads };

// Request-body schemas. Centralizing these (instead of ad-hoc `if` checks
// scattered through the routes) keeps validation rules in one auditable
// place and gives every route consistent, descriptive error messages.

const { z } = require('zod');

const clientFields = {
  businessName: z.string().trim().min(1, 'businessName is required').max(200),
  aboutText: z.string().trim().max(4000).optional().default(''),
  services: z.string().trim().max(4000).optional().default(''),
  faqs: z.string().trim().max(8000).optional().default(''),
  hours: z.string().trim().max(500).optional().default(''),
  bookingInfo: z.string().trim().max(1000).optional().default(''),
  contactEmail: z.string().trim().email('contactEmail must be a valid email').max(200).optional().or(z.literal('')).default(''),
  brandColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'brandColor must be a hex color like #d4ff00').optional().default('#d4ff00'),
  greeting: z.string().trim().max(300).optional().default('Hi 👋 how can we help?')
};

const createClientSchema = z.object(clientFields);

// Same fields, but every one of them optional (a PATCH-style update — only
// send what changed) and no defaults injected, so omitted fields are left
// untouched by the route handler instead of being reset to their default.
const updateClientSchema = z.object({
  businessName: clientFields.businessName.optional(),
  aboutText: z.string().trim().max(4000).optional(),
  services: z.string().trim().max(4000).optional(),
  faqs: z.string().trim().max(8000).optional(),
  hours: z.string().trim().max(500).optional(),
  bookingInfo: z.string().trim().max(1000).optional(),
  contactEmail: z.string().trim().email().max(200).optional().or(z.literal('')),
  brandColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  greeting: z.string().trim().max(300).optional()
});

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4000)
});

const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1, 'messages array is required').max(40, 'Conversation too long for this demo')
});

const leadSchema = z
  .object({
    name: z.string().trim().min(1, 'name is required').max(200),
    email: z.string().trim().email('email must be valid').max(200).optional().or(z.literal('')),
    phone: z.string().trim().max(60).optional().or(z.literal('')),
    message: z.string().trim().max(2000).optional().or(z.literal(''))
  })
  .refine((data) => Boolean(data.email) || Boolean(data.phone), {
    message: 'Either email or phone is required',
    path: ['email']
  });

// Formats a ZodError into a single readable string for API error responses.
function formatZodError(error) {
  return error.issues.map((issue) => issue.message).join('; ');
}

module.exports = {
  createClientSchema,
  updateClientSchema,
  chatRequestSchema,
  leadSchema,
  formatZodError
};

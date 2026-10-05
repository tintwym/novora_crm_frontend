import { z } from 'zod';
import { ACTIVITY_TYPES, DEAL_STAGES } from './deals';
import { TICKET_PRIORITIES } from './tickets';

/** Empty string or valid email */
export const optionalEmail = z
  .string()
  .trim()
  .refine((v) => v === '' || z.string().email().safeParse(v).success, {
    message: 'Enter a valid email address',
  });

/** Empty string or http(s) URL */
export const optionalUrl = z
  .string()
  .trim()
  .refine((v) => v === '' || /^https?:\/\/.+/i.test(v), {
    message: 'Enter a valid URL starting with http:// or https://',
  });

export const createContactSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120, 'Name is too long'),
    email: optionalEmail,
    phone: z.string().trim().max(40, 'Phone is too long'),
    title: z.string().trim().max(120, 'Title is too long'),
    accountId: z.string().optional(),
    source: z.string().optional(),
    tags: z.string().optional(),
    customKey: z.string().trim().max(60, 'Custom key is too long'),
    customValue: z.string().trim().max(500, 'Custom value is too long'),
  })
  .superRefine((data, ctx) => {
    if (data.customKey && !data.customValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Add a value for this custom field',
        path: ['customValue'],
      });
    }
    if (data.customValue && !data.customKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Add a key for this custom field',
        path: ['customKey'],
      });
    }
  });

export const createCompanySchema = z.object({
  name: z.string().trim().min(2, 'Company name must be at least 2 characters').max(200, 'Name is too long'),
  industry: z.string().trim().max(100, 'Industry is too long'),
  size: z.string().trim().max(50, 'Size is too long'),
  email: optionalEmail,
  phone: z.string().trim().max(40, 'Phone is too long'),
  website: optionalUrl,
});

export const createDealSchema = z.object({
  title: z.string().trim().min(2, 'Deal title must be at least 2 characters').max(200, 'Title is too long'),
  value: z
    .string()
    .trim()
    .refine((v) => v === '' || (!Number.isNaN(Number(v)) && Number(v) >= 0), {
      message: 'Value must be zero or greater',
    }),
  stage: z.enum(DEAL_STAGES, { errorMap: () => ({ message: 'Select a valid stage' }) }),
  closeDate: z.string().optional(),
  contactId: z.string().optional(),
  accountId: z.string().optional(),
  source: z.string().optional(),
});

export const createTicketSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(200, 'Title is too long'),
  description: z
    .string()
    .trim()
    .min(5, 'Description must be at least 5 characters')
    .max(5000, 'Description is too long'),
  priority: z.enum(TICKET_PRIORITIES, { errorMap: () => ({ message: 'Select a priority' }) }),
  contactId: z.string().optional(),
});

export const createActivitySchema = z
  .object({
    type: z.enum(ACTIVITY_TYPES, { errorMap: () => ({ message: 'Select an activity type' }) }),
    subject: z.string().trim().max(200, 'Subject is too long'),
    note: z.string().trim().max(5000, 'Note is too long'),
    dueAt: z.string().optional(),
    contactId: z.string().optional(),
    dealId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.contactId && !data.dealId) {
      const msg = 'Link this activity to a contact or a deal';
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg, path: ['contactId'] });
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg, path: ['dealId'] });
    }
  });

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type CreateDealInput = z.infer<typeof createDealSchema>;
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type CreateActivityInput = z.infer<typeof createActivitySchema>;

import { ForbiddenError, InvalidPayloadError } from '@directus/errors';
import { LeadWorkflowError, applyLeadWorkflowUpdate } from '../../../lead-workflow/lead-workflow.mjs';

export function registerLeadWorkflowHook({ filter }) {
  filter('leads.items.update', async (payload, meta, context) => {
    const actorId = context.accountability?.user;
    if (!actorId) throw new ForbiddenError({ reason: 'Only an authenticated salesperson can update a lead' });
    if (!Array.isArray(meta.keys) || meta.keys.length !== 1) throw new InvalidPayloadError({ reason: 'Lead updates must target exactly one record' });
    const current = await context.database('leads').whereIn('id', meta.keys).first();
    try {
      return applyLeadWorkflowUpdate({ current, input: payload, actorId });
    } catch (error) {
      if (error instanceof LeadWorkflowError && error.code === 'NOT_OWNER') throw new ForbiddenError({ reason: error.message });
      if (error instanceof LeadWorkflowError) throw new InvalidPayloadError({ reason: error.message });
      throw error;
    }
  });
}

export default registerLeadWorkflowHook;

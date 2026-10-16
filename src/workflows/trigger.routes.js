import fp from 'fastify-plugin';
import { listTriggersForWorkflow, createWorkflowTrigger, webhookTrigger } from './trigger.controller.js';

async function triggerRoutes(app) {
  app.get('/workflows/:workflowId/triggers', listTriggersForWorkflow);
  app.post('/workflows/:workflowId/triggers', createWorkflowTrigger);
  app.post('/triggers/:triggerId/webhook', webhookTrigger);
}

export default fp(triggerRoutes);

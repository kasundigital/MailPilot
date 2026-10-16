import { pool } from '../db.js';
import crypto from 'node:crypto';

export async function listWorkflows({ workspaceId }) {
  const [rows] = await pool.query(
    'SELECT * FROM workflows WHERE workspace_id = ? ORDER BY updated_at DESC',
    [workspaceId]
  );
  return rows;
}

export async function getWorkflowById(id) {
  const [rows] = await pool.query('SELECT * FROM workflows WHERE id = ?', [id]);
  return rows[0];
}

export async function createWorkflow({ workspaceId, name, description, definition, createdBy }) {
  const id = crypto.randomUUID();
  await pool.query(
    `INSERT INTO workflows (id, workspace_id, name, description, definition, created_by, status, version)
     VALUES (?, ?, ?, ?, ?, ?, 'draft', 1)`,
    [id, workspaceId, name, description, JSON.stringify(definition || {}), createdBy]
  );

  return getWorkflowById(id);
}

export async function updateWorkflow(id, { name, description, definition, status }) {
  const sets = [];
  const values = [];

  if (name !== undefined) {
    sets.push('name = ?');
    values.push(name);
  }
  if (description !== undefined) {
    sets.push('description = ?');
    values.push(description);
  }
  if (definition !== undefined) {
    sets.push('definition = ?');
    values.push(JSON.stringify(definition));
  }
  if (status !== undefined) {
    sets.push('status = ?');
    values.push(status);
  }

  if (!sets.length) return getWorkflowById(id);

  values.push(id);

  await pool.query(
    `UPDATE workflows SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    values
  );

  return getWorkflowById(id);
}

export async function publishWorkflow(id, { definition, createdBy }) {
  const workflow = await getWorkflowById(id);
  if (!workflow) throw new Error('Workflow not found');

  const nextVersion = Number(workflow.version || 1) + 1;
  const versionId = crypto.randomUUID();

  await pool.query(
    `INSERT INTO workflow_versions (id, workflow_id, version, definition, created_by)
     VALUES (?, ?, ?, ?, ?)`,
    [versionId, id, nextVersion, JSON.stringify(definition || workflow.definition), createdBy]
  );

  await pool.query(
    `UPDATE workflows SET definition = ?, version = ?, status = 'published', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [JSON.stringify(definition || workflow.definition), nextVersion, id]
  );

  return getWorkflowById(id);
}

export async function createWorkflowRun({ workflowId, workflowVersion, meta = {} }) {
  const id = crypto.randomUUID();
  await pool.query(
    `INSERT INTO workflow_runs (id, workflow_id, workflow_version, status, meta, started_at)
     VALUES (?, ?, ?, 'running', ?, CURRENT_TIMESTAMP)`,
    [id, workflowId, workflowVersion, JSON.stringify(meta || {})]
  );

  const [rows] = await pool.query('SELECT * FROM workflow_runs WHERE id = ?', [id]);
  return rows[0];
}

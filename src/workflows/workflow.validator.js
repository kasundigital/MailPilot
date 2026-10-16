export function validateWorkflowDefinition(definition) {
  if (!definition || typeof definition !== 'object') {
    throw new Error('Workflow definition must be an object');
  }

  if (!Array.isArray(definition.nodes)) {
    throw new Error('Workflow definition.nodes must be an array');
  }

  if (!Array.isArray(definition.edges)) {
    throw new Error('Workflow definition.edges must be an array');
  }

  const nodeKeys = new Set();
  for (const node of definition.nodes) {
    if (!node?.key || !node?.type) {
      throw new Error('Each workflow node must include key and type');
    }
    nodeKeys.add(node.key);
  }

  for (const edge of definition.edges) {
    if (!edge?.from || !edge?.to) {
      throw new Error('Each workflow edge must include from and to');
    }
    if (!nodeKeys.has(edge.from) || !nodeKeys.has(edge.to)) {
      throw new Error('Workflow edge references an unknown node');
    }
  }

  return true;
}

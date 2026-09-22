function assertProcessNodeIndex(index) {
  if (!Number.isInteger(index) || index < 0) throw new TypeError('Process node index must be a non-negative integer.');
}

// A process node is not a generic card: its anchor, connection label, and
// media role are all part of the manufacturing canvas contract.
export function createManufacturingProcessNode(index) {
  assertProcessNodeIndex(index);
  const displayIndex = index + 1;
  return {
    label: '',
    title: `新工艺节点 ${displayIndex}`,
    body: '',
    description: '',
    connection_label: '',
    anchor: 'auto',
    media_role: `process-node-${displayIndex}`,
    alt: '',
    href: '',
    sort_order: index
  };
}

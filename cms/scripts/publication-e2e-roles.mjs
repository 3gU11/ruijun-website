const roleAliases = Object.freeze({
  editor: ['内容编辑', 'Content editor', '鍐呭缂栬緫'],
  reviewer: ['审核管理', '品牌审核人员', '技术审核人员', 'Review manager', '鍝佺墝瀹℃牳浜哄憳'],
  publisher: ['发布人员', '审核管理', 'Publisher', '鍙戝竷浜哄憳']
});

function pickRole(roles, aliases, label) {
  const list = Array.isArray(roles) ? roles : [];
  const role = list.find((candidate) => candidate?.id && aliases.includes(candidate.name));
  if (!role) throw new Error(`${label} role is not configured`);
  return role.id;
}

export function resolvePublicationWorkflowRoles(roles) {
  const editorRoleId = pickRole(roles, roleAliases.editor, 'content editor');
  const reviewerRoleId = pickRole(roles, roleAliases.reviewer, 'reviewer');
  const publisherRoleId = pickRole(roles, roleAliases.publisher, 'publisher');
  return { editorRoleId, reviewerRoleId, publisherRoleId };
}

const footerColumns = Object.freeze([
  {
    title: '产品中心',
    links: [
      { label: '灵动切割工作站', href: '/product#workstation' },
      { label: 'FR-XS(auto)', href: '/product#auto' },
      { label: 'FR-XS(pro)', href: '/product#pro' },
      { label: 'FT-XS(pro)', href: '/product#ft' },
      { label: 'FR-Y', href: '/product#fr-y' },
      { label: 'FL-XS(pro)', href: '/product#fl' }
    ]
  },
  {
    title: '先进智造',
    links: [
      { label: 'CNC车间', href: '/manufacturing#cnc' },
      { label: '钣金车间', href: '/manufacturing#metal' },
      { label: '装配车间', href: '/manufacturing#assembly' }
    ]
  },
  {
    title: '关于我们',
    links: [
      { label: '荣誉资质认证', href: '/about#honor-title' },
      { label: '品牌发展历程', href: '/about#history' }
    ]
  }
]);

const footerDefaults = Object.freeze({
  purchase_label: '大批量采购',
  purchase_title: '你有量',
  purchase_subtitle: '我有价',
  purchase_phone: '15050166844',
  copyright: ''
});

const contactDefaults = Object.freeze({
  addresses: [
    '常熟工厂：江苏省苏州市常熟市沙家浜儒浜路78号',
    '昆山工厂：江苏省苏州市昆山市巴城苏杭路88号'
  ],
  domestic_phone: '13738375470',
  export_phone: '17751119936',
  domestic_email: 'ksrjjx@126.com',
  export_email: 'kylewuedm@gmail.com'
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function has(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function mergeLink(fallback, candidate) {
  const source = object(candidate);
  return {
    ...fallback,
    ...source,
    label: has(source, 'label') ? String(source.label ?? '') : fallback.label,
    href: has(source, 'href') ? String(source.href ?? '') : fallback.href
  };
}

function mergeColumns(value) {
  const source = list(value);
  return footerColumns.map((fallback, index) => {
    const candidate = object(source[index]);
    return {
      ...fallback,
      ...candidate,
      title: has(candidate, 'title') ? String(candidate.title ?? '') : fallback.title,
      sort_order: Number.isFinite(Number(candidate.sort_order)) ? Number(candidate.sort_order) : index,
      links: fallback.links.map((link, linkIndex) => mergeLink(link, list(candidate.links)[linkIndex]))
    };
  });
}

function mergeContacts(value) {
  const source = object(value);
  const addresses = list(source.addresses);
  return {
    ...contactDefaults,
    ...source,
    addresses: contactDefaults.addresses.map((fallback, index) => has(addresses, index) ? String(addresses[index] ?? '') : fallback),
    domestic_phone: has(source, 'domestic_phone')
      ? String(source.domestic_phone ?? '')
      : has(source, 'service_phone')
        ? String(source.service_phone ?? '')
        : contactDefaults.domestic_phone,
    export_phone: has(source, 'export_phone') ? String(source.export_phone ?? '') : contactDefaults.export_phone,
    domestic_email: has(source, 'domestic_email') ? String(source.domestic_email ?? '') : contactDefaults.domestic_email,
    export_email: has(source, 'export_email') ? String(source.export_email ?? '') : contactDefaults.export_email
  };
}

export function mergeVisualSiteSettingsDefaults(record) {
  const source = object(record);
  const footer = object(source.footer);
  return {
    ...clone(source),
    footer: {
      ...footerDefaults,
      ...footer,
      columns: mergeColumns(footer.columns)
    },
    contacts: mergeContacts(source.contacts)
  };
}

export function visualSiteSettingsPayload(record, fieldPath) {
  const source = mergeVisualSiteSettingsDefaults(record);
  const path = String(fieldPath || '').trim();
  if (/^footer\.(?:columns\.[0-2]\.(?:title|links\.[0-5]\.(?:label|href))|purchase_(?:label|title|subtitle|phone)|copyright)$/.test(path)) {
    return { footer: clone(source.footer) };
  }
  if (/^contacts\.(?:addresses\.[01]|domestic_phone|export_phone|domestic_email|export_email)$/.test(path)) {
    return { contacts: clone(source.contacts) };
  }
  if (/^footer\.(?:address_icon_asset|phone_icon_asset|email_icon_asset)$/.test(path)) {
    return { footer: clone(source.footer) };
  }
  if (/^brand\.(?:logo_asset|footer_logo_asset)$/.test(path)) {
    return { brand: clone(object(source.brand)) };
  }
  return null;
}

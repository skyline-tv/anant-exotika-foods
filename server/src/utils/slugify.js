const slugify = (text) => {
  return String(text || '')
    .toLowerCase()
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const ensureUniqueSlug = async (Model, source, excludeId = null) => {
  const base = slugify(source) || 'item';
  let slug = base;
  let suffix = 1;

  while (true) {
    const filter = { slug };
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }

    const exists = await Model.exists(filter);
    if (!exists) {
      return slug;
    }

    slug = `${base}-${suffix}`;
    suffix += 1;
  }
};

module.exports = {
  slugify,
  ensureUniqueSlug,
};

export function getParentId(category) {
  if (!category?.parentCategory) return null;
  return typeof category.parentCategory === 'object'
    ? category.parentCategory._id
    : category.parentCategory;
}

export function getParentCategories(categories = []) {
  return categories.filter((item) => !item.parentCategory);
}

export function getChildCategories(categories = [], parentId) {
  if (!parentId) return [];
  return categories.filter((item) => String(getParentId(item)) === String(parentId));
}

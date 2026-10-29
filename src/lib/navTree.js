// Walks the tree in config/navigation.js: a module's entries are `items`,
// a nested group's are `children`.
export function childrenOf(node) {
  return node.items ?? node.children ?? null;
}

// React Router matches "/aml/jobs/" as "/aml/jobs"; so must the sidebar.
function normalize(pathname) {
  return pathname.replace(/\/+$/, "") || "/";
}

/** The chain of nodes from a module down to the page at `pathname`, or []. */
export function findTrail(nodes, pathname) {
  const target = normalize(pathname);
  for (const node of nodes) {
    if (node.path === target) return [node];
    const kids = childrenOf(node);
    if (kids) {
      const trail = findTrail(kids, target);
      if (trail.length) return [node, ...trail];
    }
  }
  return [];
}

export function containsPath(node, pathname) {
  return findTrail([node], pathname).length > 1;
}

/**
 * The tree cut down to what matches `query`. A node whose own label
 * matches keeps all of its entries, so searching "AML" lists the module.
 */
export function filterNavigation(nodes, query) {
  const q = query.trim().toLowerCase();
  if (!q) return nodes;
  return nodes.flatMap((node) => {
    if (node.label.toLowerCase().includes(q)) return [node];
    const kids = childrenOf(node);
    if (!kids) return [];
    const matched = filterNavigation(kids, q);
    if (!matched.length) return [];
    return [node.items ? { ...node, items: matched } : { ...node, children: matched }];
  });
}

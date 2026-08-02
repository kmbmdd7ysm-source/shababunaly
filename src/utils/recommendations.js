export function recommend(
  products,
  { current = null, recent = [], wishlist = [], cart = [] } = {},
) {
  const seen = new Set([...(recent || []), ...(wishlist || []), ...(cart || []).map((x) => x.id)]);
  return products
    .filter((p) => p.id !== current?.id && p.availability !== 'sold-out')
    .map((p) => {
      let score = 0;
      if (current?.category === p.category) score += 6;
      if (current?.collection && current.collection === p.collection) score += 4;
      if (seen.has(p.id)) score += 3;
      if (p.bestSeller) score += 2;
      if (p.newArrival) score += 1;
      const tags = new Set(current?.tags || []);
      score += (p.tags || []).filter((t) => tags.has(t)).length * 2;
      return { p, score };
    })
    .sort((a, b) => b.score - a.score || String(a.p.id).localeCompare(String(b.p.id)))
    .map((x) => x.p);
}

function computeRanking(matches) {
  const base = new Map();
  for (const m of matches) {
    const a = m.jogadorAId;
    const b = m.jogadorBId;
    const ga = m.placarA;
    const gb = m.placarB;
    if (!base.has(a)) base.set(a, { id: a, P: 0, V: 0, E: 0, D: 0, GP: 0, GC: 0, SG: 0 });
    if (!base.has(b)) base.set(b, { id: b, P: 0, V: 0, E: 0, D: 0, GP: 0, GC: 0, SG: 0 });
    const ra = base.get(a);
    const rb = base.get(b);
    ra.GP += ga; ra.GC += gb; ra.SG = ra.GP - ra.GC;
    rb.GP += gb; rb.GC += ga; rb.SG = rb.GP - rb.GC;
    if (ga > gb) { ra.V += 1; ra.P += 3; rb.D += 1; }
    else if (ga < gb) { rb.V += 1; rb.P += 3; ra.D += 1; }
    else { ra.E += 1; rb.E += 1; ra.P += 1; rb.P += 1; }
  }
  const arr = Array.from(base.values());
  arr.sort((x, y) => {
    if (y.P !== x.P) return y.P - x.P;
    if (y.V !== x.V) return y.V - x.V;
    if (y.SG !== x.SG) return y.SG - x.SG;
    return 0;
  });
  const groups = new Map();
  for (const r of arr) {
    const key = `${r.P}|${r.V}|${r.SG}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  const result = [];
  for (const r of arr) {
    const key = `${r.P}|${r.V}|${r.SG}`;
    if (!groups.has(key)) continue;
    const group = groups.get(key);
    if (group.length === 1) {
      result.push(group[0]);
      groups.delete(key);
      continue;
    }
    const ids = new Set(group.map(g => g.id));
    const h2h = new Map();
    for (const id of ids) h2h.set(id, { id, P: 0, V: 0, SG: 0, GP: 0, GC: 0 });
    for (const m of matches) {
      const a = m.jogadorAId;
      const b = m.jogadorBId;
      if (!ids.has(a) || !ids.has(b)) continue;
      const ga = m.placarA;
      const gb = m.placarB;
      const ra = h2h.get(a);
      const rb = h2h.get(b);
      ra.GP += ga; ra.GC += gb; ra.SG = ra.GP - ra.GC;
      rb.GP += gb; rb.GC += ga; rb.SG = rb.GP - rb.GC;
      if (ga > gb) { ra.V += 1; ra.P += 3; }
      else if (ga < gb) { rb.V += 1; rb.P += 3; }
      else { ra.P += 1; rb.P += 1; }
    }
    group.sort((x, y) => {
      const hx = h2h.get(x.id);
      const hy = h2h.get(y.id);
      if (hy.P !== hx.P) return hy.P - hx.P;
      if (hy.V !== hx.V) return hy.V - hx.V;
      if (hy.SG !== hx.SG) return hy.SG - hx.SG;
      if (y.GP !== x.GP) return y.GP - x.GP;
      if (x.GC !== y.GC) return x.GC - y.GC;
      return String(x.id).localeCompare(String(y.id));
    });
    for (const g of group) result.push(g);
    groups.delete(key);
  }
  return result;
}

function computeStats(matches) {
  let bestAttack = null;
  let bestDefense = null;
  let biggestWin = null;
  const totals = new Map();
  for (const m of matches) {
    const a = m.jogadorAId, b = m.jogadorBId;
    const ga = m.placarA, gb = m.placarB;
    if (!totals.has(a)) totals.set(a, { GP: 0, GC: 0 });
    if (!totals.has(b)) totals.set(b, { GP: 0, GC: 0 });
    totals.get(a).GP += ga; totals.get(a).GC += gb;
    totals.get(b).GP += gb; totals.get(b).GC += ga;
    const diff = Math.abs(ga - gb);
    if (!biggestWin || diff > biggestWin.diff) biggestWin = { a, b, ga, gb, diff };
  }
  for (const [id, v] of totals.entries()) {
    if (!bestAttack || v.GP > bestAttack.val) bestAttack = { id, val: v.GP };
    if (!bestDefense || v.GC < bestDefense.val) bestDefense = { id, val: v.GC };
  }
  return { bestAttack, bestDefense, biggestWin };
}

export { computeRanking, computeStats };

// Strict, reusable input parsing for authenticated contact management.
export function contactIds(value) {
  const entries = typeof value === 'string' ? value.split(',') : value;
  if (!Array.isArray(entries) || entries.length < 1 || entries.length > 100) {
    throw new Error('Select between 1 and 100 contacts');
  }
  const ids = entries.map(item => {
    const text = String(item);
    if (!/^[1-9][0-9]*$/.test(text)) throw new Error('Invalid contact ID');
    const id = Number(text);
    if (!Number.isSafeInteger(id)) throw new Error('Invalid contact ID');
    return id;
  });
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate contact IDs');
  return ids;
}
export function contactTag(value) {
  if (typeof value !== 'string') throw new Error('A tag is required');
  const tag = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{0,31}$/.test(tag)) {
    throw new Error('Tag must have 1–32 letters, digits, underscores or hyphens');
  }
  return tag;
}
export function contactPageOptions(q={}) {
  const integer = (value, fallback, upper, name) => {
    if (value === undefined) return fallback;
    const text = String(value);
    if (!/^[1-9][0-9]*$/.test(text)) throw new Error('Invalid '+name);
    const n = Number(text);
    if (!Number.isSafeInteger(n) || n>upper) throw new Error('Invalid '+name);
    return n;
  };
  const page=integer(q.page,1,100000,'page');
  const pageSize=integer(q.pageSize,25,100,'page size');
  const query=String(q.search??'').trim();
  if (query.length>120) throw new Error('Search must be at most 120 characters');
  const status=q.status??'all';
  if (!['all','subscribed','unsubscribed'].includes(status)) throw new Error('Invalid contact status');
  const sort=q.sort??'recent';
  const sorts={recent:'c.id DESC',oldest:'c.id ASC',email:'c.email ASC, c.id ASC',status:'c.subscribed DESC, c.id DESC'};
  if (!(sort in sorts)) throw new Error('Invalid contact sort');
  let tag='';
  if (q.tag!==undefined && String(q.tag).trim()) tag=contactTag(q.tag);
  const clauses=[],params=[];
  if (query) { clauses.push('c.email LIKE ?'); params.push('%'+query+'%'); }
  if (status!=='all') { clauses.push('c.subscribed=?'); params.push(status==='subscribed'?1:0); }
  if (tag) { clauses.push('EXISTS (SELECT 1 FROM contact_tags ct WHERE ct.contact_id=c.id AND ct.tag=?)'); params.push(tag); }
  return {page,pageSize,sort,status,search:query,tag,where:clauses.length?' WHERE '+clauses.join(' AND '):'',params,orderBy:sorts[sort],offset:(page-1)*pageSize};
}

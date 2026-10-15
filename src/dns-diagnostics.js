import dns from 'node:dns/promises';

export function senderDomain(email) {
  if (typeof email !== 'string' || email.length > 254) return null;
  const match = /^[^@\s]+@([a-z0-9](?:[a-z0-9.-]*[a-z0-9])?)$/i.exec(email.trim());
  if (!match) return null;
  const domain = match[1].toLowerCase();
  if (domain.length > 253 || !domain.includes('.') || domain.split('.').some(label => !label || label.length > 63 || label.startsWith('-') || label.endsWith('-'))) return null;
  return domain;
}

export async function checkSenderDns(email, resolver = dns) {
  const domain = senderDomain(email);
  if (!domain) throw new TypeError('Invalid sender email');
  const lookup = async name => {
    try { return {records:(await resolver.resolveTxt(name)).map(parts => parts.join('')),error:null}; }
    catch (e) { return {records:[],error:['ENOTFOUND','ENODATA','ENODOMAIN','ENOTIMP','ESERVFAIL','ETIMEOUT','EREFUSED'].includes(e.code) ? e.code : 'DNS_ERROR'}; }
  };
  const [spfTxt,dmarcTxt] = await Promise.all([lookup(domain),lookup('_dmarc.'+domain)]);
  const spfRecords = spfTxt.records.filter(v => /^v=spf1(?:\s|$)/i.test(v));
  const dmarcRecords = dmarcTxt.records.filter(v => /^v=dmarc1(?:\s|;|$)/i.test(v));
  const dmarc = dmarcRecords[0] || null;
  const policy = dmarc?.match(/(?:^|;)\s*p\s*=\s*(none|quarantine|reject)(?:\s*;|\s*$)/i)?.[1]?.toLowerCase() || null;
  return {
    domain,
    spf:{status:spfTxt.error && !spfRecords.length ? 'unknown' : spfRecords.length===1?'present':spfRecords.length>1?'multiple':'missing',record:spfRecords[0]||null,error:spfTxt.error},
    dmarc:{status:dmarcTxt.error && !dmarcRecords.length ? 'unknown' : dmarcRecords.length===1?'present':dmarcRecords.length>1?'multiple':'missing',policy,record:dmarc,error:dmarcTxt.error},
    dkim:{status:'not_checked',reason:'DKIM requires a provider-specific selector; DNS checks alone cannot establish message signing or alignment.'},
    note:'DNS presence does not prove correct authentication, alignment, inbox delivery, or SMTP provider quotas.'
  };
}

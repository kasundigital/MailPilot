let csrfToken='';
const $=s=>document.querySelector(s);let accounts=[];
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(path,options={}){const headers={...(options.body!==undefined&&options.body!==null?{'Content-Type':'application/json'}:{}),...(csrfToken?{'csrf-token':csrfToken}:{}),...(options.headers||{})};const res=await fetch(path,{credentials:'same-origin',...options,headers});const data=await res.json().catch(()=>({}));if(!res.ok)throw Error(data.error||'Request failed');return data}
function alertText(t,error=false){const el=$('#notice');el.textContent=t;el.style.color=error?'#ff9999':'#9fd9ba'}
function values(form){return Object.fromEntries(new FormData(form).entries())}
async function show(page){document.querySelectorAll('.page').forEach(p=>p.hidden=p.id!==page);document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));$('#sectionSubtitle').textContent=({overview:'Campaign delivery and account performance at a glance.',smtp:'Configure providers and enforce sending limits.',contacts:'Permission-based audience management.',campaigns:'Monitor and control campaign deliveries.',editor:'Build and preview your HTML email.',settings:'Administrator identity, security, and backups.'})[page]||'';$('#heading').textContent=({overview:'Overview',smtp:'SMTP Accounts',contacts:'Contacts',campaigns:'Campaigns',editor:'Compose Email',settings:'Account Settings & Backups'})[page];try{if(page==='overview')await stats();if(page==='smtp'||page==='editor')await listAccounts();if(page==='contacts')await listContacts();if(page==='campaigns')await listCampaigns();if(page==='settings')await listBackups()}catch(e){alertText(e.message,true)}}

async function listBackups() {
  const { backups } = await api('/api/backups');
  const fmtSize = (b) => (b / 1024 / 1024).toFixed(2) + ' MB';
  $('#backupList').innerHTML = backups && backups.length ?
    '<div class="table-wrap"><table class="data-table"><thead><tr><th>File</th><th>Date</th><th>Size</th></tr></thead><tbody>' +
    backups.map(b => `<tr><td>${escapeHTML(b.filename)}</td><td>${new Date(b.timestamp).toLocaleString()}</td><td>${fmtSize(b.size)}</td></tr>`).join('') +
    '</tbody></table></div>' : '<div class="empty-state">No backups found.</div>';

  const select = $('#restoreBackupSelect');
  if (select) {
    select.innerHTML = '<option value="">Select a backup</option>' + (backups || []).map(b => `<option value="${escapeHTML(b.filename)}">${escapeHTML(b.filename)} - ${new Date(b.timestamp).toLocaleString()}</option>`).join('');
  }
}

if ($('#createBackupBtn')) {
  $('#createBackupBtn').addEventListener('click', async () => {
    try {
      $('#createBackupBtn').disabled = true;
      $('#createBackupBtn').textContent = 'Creating...';
      const res = await api('/api/backups', { method: 'POST' });
      alertText(`Backup created: ${res.filename}`);
      await listBackups();
    } catch (e) {
      alertText('Backup failed: ' + e.message, true);
    } finally {
      $('#createBackupBtn').disabled = false;
      $('#createBackupBtn').textContent = 'Create Backup';
    }
  });
}

if ($('#restoreBackupForm')) {
  $('#restoreBackupForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('#restoreBackupForm button');
    try {
      btn.disabled = true;
      btn.textContent = 'Restoring...';
      const data = values(e.target);
      data.dryRun = !!data.dryRun;
      const res = await api('/api/backups/restore', { method: 'POST', body: JSON.stringify(data) });
      const logs = $('#restoreLogs');
      logs.style.display = 'block';
      logs.textContent = (res.dryRun ? 'DRY RUN LOGS:\n' : 'RESTORE LOGS:\n') + res.logs.join('\n');
      alertText(res.dryRun ? 'Dry run completed.' : 'Restore completed. Refresh to see changes.');
    } catch (err) {
      alertText('Restore failed: ' + err.message, true);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Restore Backup';
    }
  });
}
async function stats(){
 const [d,campaigns]=await Promise.all([api('/api/stats'),api('/api/campaigns')]);
 const m=d.messages||{},c=d.contacts||{};
 const items=[['👥','Total Contacts',c.total],['♙','Active Subscribers',c.subscribed],['✈','Queued Emails',m.queued],['✉','Sent Emails',m.sent]];
 $('#cards').innerHTML=items.map(([glyph,label,v])=>'<div class="stat"><span class="stat-icon">'+glyph+'</span><div><small>'+label+'</small><b>'+Number(v||0).toLocaleString()+'</b><span class="stat-caption">Live campaign data</span></div></div>').join('');
 const sent=Number(m.sent||0),queued=Number(m.queued||0);
 $('#deliverySummary').innerHTML='<div class="delivery-metrics"><div><span>Sent</span><strong>'+sent.toLocaleString()+'</strong></div><div><span>Queued</span><strong>'+queued.toLocaleString()+'</strong></div></div><div class="delivery-progress" role="progressbar" aria-label="Sent share of sent and queued messages" aria-valuenow="'+(sent+queued?Math.round(100*sent/(sent+queued)):0)+'" aria-valuemin="0" aria-valuemax="100"><div style="width:'+(sent+queued?100*sent/(sent+queued):0)+'%"></div></div><p class="muted">Delivery totals, not estimated opens or clicks.</p>';
 $('#recentCampaigns').innerHTML=campaigns.length?'<div class="table-wrap"><table class="data-table"><thead><tr><th>Name</th><th>Status</th><th>Recipients</th><th>Sent</th><th>Created</th></tr></thead><tbody>'+campaigns.slice(0,6).map(x=>'<tr><td><strong>'+escapeHTML(x.name||x.subject)+'</strong><small>'+escapeHTML(x.subject)+'</small></td><td><span class="status-tag status-'+escapeHTML(x.status)+'">'+escapeHTML(x.status)+'</span></td><td>'+Number(x.audience_total||x.total||0).toLocaleString()+'</td><td>'+Number(x.sent||0).toLocaleString()+'</td><td>'+escapeHTML(x.created_at?new Date(x.created_at).toLocaleDateString():'—')+'</td></tr>').join('')+'</tbody></table></div>':'<div class="empty-state">No campaigns yet. Create a campaign to see it here.</div>';
}
async function listAccounts(){
 accounts=await api('/api/accounts');
 $('#accountSelect').innerHTML=accounts.map(x=>'<option value="'+escapeHTML(x.id)+'">'+escapeHTML(x.label)+'</option>').join('');
 $('#accountList').innerHTML=accounts.length?
 '<div class="table-wrap"><table class="data-table account-table"><thead><tr><th scope="col">Account</th><th scope="col">SMTP server</th><th scope="col">Rate limits</th><th scope="col" class="account-action-head">Actions</th></tr></thead><tbody>'+
 accounts.map(x=>'<tr><td><strong>'+escapeHTML(x.label)+'</strong><small>'+escapeHTML(x.from_email)+'</small></td><td>'+escapeHTML(x.host)+':'+escapeHTML(x.port)+'</td><td class="account-limits">'+escapeHTML(x.per_minute)+'/min · '+escapeHTML(x.per_hour)+'/hour · '+escapeHTML(x.per_day)+'/day</td><td><div class="account-actions"><button type="button" class="ghost" data-dns="'+escapeHTML(x.id)+'">Check DNS</button><button type="button" class="ghost" data-test="'+escapeHTML(x.id)+'">Test SMTP</button></div></td></tr>').join('')+
 '</tbody></table></div>':
 '<div class="empty-state account-empty"><strong>No SMTP accounts yet</strong><span>Add an account above to configure your first sender.</span></div>';
}
// Contacts view: server-side search, pagination and bounded page selections.
let contactPage=1,contactTotalPages=1,contactSelected=new Set(),contactSearchDelay;
function contactSelectionStatus(){
 const count=contactSelected.size;
 $('#contactSelectedCount').textContent=count+' selected';
 for(const id of ['contactBulkTag','contactBulkSuppress','contactBulkExport']) $('#'+id).disabled=count===0;
 const all=[...document.querySelectorAll('#contactList [data-contact-id]')];
 const selectAll=$('#contactSelectAll');
 if(selectAll){selectAll.checked=all.length>0&&all.every(c=>c.checked);selectAll.indeterminate=all.some(c=>c.checked)&&!selectAll.checked;}
}
async function listContacts(){
 const url=new URLSearchParams({
  page:String(contactPage),pageSize:'25',search:$('#contactSearch').value.trim(),
  status:$('#contactStatus').value,sort:$('#contactSort').value,tag:$('#contactTagFilter').value.trim()
 });
 $('#contactList').setAttribute('aria-busy','true');
 try{
  const response=await api('/api/contacts/page?'+url);
  contactTotalPages=response.pages;
  if(contactPage>response.pages){contactPage=response.pages;return await listContacts();}
  contactSelected.clear();
  const items=response.items;
  $('#contactList').innerHTML=items.length?
    '<div class="table-wrap"><table class="data-table contact-table"><thead><tr><th scope="col"><input id="contactSelectAll" type="checkbox" aria-label="Select all contacts on this page"></th><th scope="col">Email</th><th scope="col">Status</th><th scope="col">Tags</th><th scope="col">Consent source</th><th scope="col">Added</th></tr></thead><tbody>'+
    items.map(x=>'<tr><td><input type="checkbox" data-contact-id="'+escapeHTML(x.id)+'" aria-label="Select '+escapeHTML(x.email)+'"></td><td><strong>'+escapeHTML(x.email)+'</strong></td><td><span class="status-tag '+(x.subscribed?'status-sent':'status-draft')+'">'+(x.subscribed?'Subscribed':'Unsubscribed')+'</span></td><td>'+escapeHTML(x.tags||'—')+'</td><td>'+escapeHTML(x.consent_source||'—')+'</td><td>'+escapeHTML(x.created_at?String(x.created_at).slice(0,10):'—')+'</td></tr>').join('')+
    '</tbody></table></div>':
    '<div class="empty-state">No matching contacts found.</div>';
  $('#contactCount').textContent=response.total.toLocaleString()+' contacts';
  $('#contactPageLabel').textContent='Page '+response.page+' of '+response.pages;
  $('#contactPrev').disabled=contactPage<=1;
  $('#contactNext').disabled=contactPage>=response.pages;
  contactSelectionStatus();
 } finally {$('#contactList').removeAttribute('aria-busy');}
}
function contactFilterChanged(){contactPage=1;listContacts().catch(e=>alertText(e.message,true));}

// Campaigns view: filter and paginate REAL API rows; keep existing data-* actions.
let campaignRows=[], campaignQuery='', campaignStatus='all', campaignPage=0;
const CAMPAIGN_PAGE_SIZE=10;
const campaignNum=value=>{
 const n=Number(value);
 return Number.isFinite(n)?Math.max(0,n).toLocaleString():'—';
};
const campaignDate=value=>{
 if(!value)return '—';
 const parsed=new Date(value);
 return Number.isNaN(parsed.getTime())?'—':parsed.toLocaleDateString();
};
function campaignActions(x){
 const id=escapeHTML(x.id);
 return '<div class="campaign-actions">'+
  (x.status==='draft'||x.status==='paused'?'<button type="button" data-start="'+id+'">Start</button> ':'')+
  (x.status==='running'?'<button type="button" data-pause="'+id+'">Pause</button> ':'')+
  '<button type="button" class="ghost" data-duplicate="'+id+'">Duplicate</button>'+
  (x.status!=='running'?'<button type="button" class="danger" data-delete="'+id+'">Delete</button>':'')+
  '<button type="button" class="ghost" data-logs="'+id+'">Logs</button>'+
  '<button type="button" class="ghost" data-export-logs="'+id+'">Export CSV</button>'+
  '</div>';
}
function renderCampaignTable(){
 const matching=campaignRows.filter(x=>
  (campaignStatus==='all'||String(x.status||'').toLowerCase()===campaignStatus)&&
  [x.name,x.subject,x.account_name].some(v=>String(v||'').toLowerCase().includes(campaignQuery.toLowerCase()))
 );
 const totalPages=Math.max(1,Math.ceil(matching.length/CAMPAIGN_PAGE_SIZE));
 campaignPage=Math.max(0,Math.min(campaignPage,totalPages-1));
 const start=campaignPage*CAMPAIGN_PAGE_SIZE;
 const pageRows=matching.slice(start,start+CAMPAIGN_PAGE_SIZE);
 const tableBody=pageRows.map(x=>{
  const status=String(x.status||'unknown');
  const statusClass=status.toLowerCase().replace(/[^a-z0-9-]/g,'');
  const name=x.name||x.subject||'Untitled campaign';
  const secondary=x.name&&x.subject&&x.name!==x.subject?x.subject:(x.account_name||'');
  return '<tr>'+
   '<td class="campaign-name"><strong>'+escapeHTML(name)+'</strong><small>'+escapeHTML(secondary)+'</small></td>'+
   '<td><span class="status-tag status-'+statusClass+'">'+escapeHTML(status)+'</span></td>'+
   '<td class="numeric">'+campaignNum(x.audience_total??x.total)+'</td>'+
   '<td class="numeric">'+campaignNum(x.sent)+'</td>'+
   '<td>'+escapeHTML(campaignDate(x.created_at))+'</td>'+
   '<td>'+campaignActions(x)+'</td>'+
   '</tr>';
 }).join('');
 $('#campaignTableArea').innerHTML=pageRows.length
  ?'<div class="table-wrap"><table class="data-table campaign-table">'+
    '<thead><tr><th scope="col">CAMPAIGN</th><th scope="col">STATUS</th>'+
    '<th scope="col" class="numeric">RECIPIENTS</th><th scope="col" class="numeric">SENT</th>'+
    '<th scope="col">CREATED</th><th scope="col">ACTIONS</th></tr></thead>'+
    '<tbody>'+tableBody+'</tbody></table></div>'
  :'<div class="campaign-table-empty">'+(campaignRows.length?'No campaigns match your search or status filter.':'No campaigns yet. Create a campaign to begin.')+'</div>';
 const first=matching.length?start+1:0;
 const last=Math.min(start+pageRows.length,matching.length);
 $('#campaignPager').innerHTML=
  '<span class="campaign-count">Showing '+first+'–'+last+' of '+matching.length+' campaigns</span>'+
  '<div class="campaign-pagination-buttons">'+
  '<button type="button" class="ghost" data-campaign-page="prev"'+(campaignPage===0?' disabled':'')+'>← Previous</button>'+
  '<span>Page '+(campaignPage+1)+' of '+totalPages+'</span>'+
  '<button type="button" class="ghost" data-campaign-page="next"'+(campaignPage>=totalPages-1?' disabled':'')+'>Next →</button></div>';
}
async function listCampaigns(){
 const fetched=await api('/api/campaigns');
 campaignRows=Array.isArray(fetched)?fetched:[];
 const el=$('#campaignList');
 el.innerHTML='<div class="campaign-toolbar">'+
  '<label class="campaign-search" for="campaignSearch"><span>SEARCH CAMPAIGNS</span>'+
  '<input id="campaignSearch" type="search" placeholder="Search campaigns..." autocomplete="off"></label>'+
  '<label class="campaign-filter" for="campaignStatus"><span>STATUS</span>'+
  '<select id="campaignStatus"><option value="all">All statuses</option>'+
  '<option value="draft">Draft</option><option value="running">Running</option>'+
  '<option value="paused">Paused</option><option value="completed">Completed</option>'+
  '<option value="failed">Failed</option></select></label></div>'+
  '<div id="campaignTableArea"></div><div id="campaignPager" class="campaign-pagination"></div>';
 $('#campaignSearch').value=campaignQuery;
 $('#campaignStatus').value=campaignStatus;
 renderCampaignTable();
}
$('#campaignList').addEventListener('input',e=>{
 if(e.target.id!=='campaignSearch')return;
 campaignQuery=e.target.value;
 campaignPage=0;
 renderCampaignTable();
});
$('#campaignList').addEventListener('change',e=>{
 if(e.target.id!=='campaignStatus')return;
 campaignStatus=e.target.value;
 campaignPage=0;
 renderCampaignTable();
});
$('#campaignList').addEventListener('click',e=>{
 const pager=e.target.closest('[data-campaign-page]');
 if(!pager||pager.disabled)return;
 campaignPage+=pager.dataset.campaignPage==='next'?1:-1;
 renderCampaignTable();
});

$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();try{await api('/api/login',{method:'POST',body:JSON.stringify(values(e.target))});const me=await api('/api/me');csrfToken=me.csrfToken;$('#currentAdminEmail').textContent=me.email||'—';$('#auth').hidden=true;$('#app').hidden=false;await show('overview')}catch(err){$('#loginNotice').textContent=err.message}});
$('#exportContacts').onclick=async()=>{try{const response=await fetch('/api/contacts/export.csv',{credentials:'same-origin'});if(!response.ok)throw Error('Contact export failed');const blob=await response.blob();const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='mailpilot-contacts.csv';document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);alertText('Contact CSV exported.')}catch(err){alertText(err.message,true)}};
$('#logout').onclick=async()=>{
 const button=$('#logout');
 if(button.disabled)return;
 button.disabled=true;
 button.textContent='Signing out…';
 try{
   try{await api('/api/logout',{method:'POST'});}
   catch(error){
     // Refresh an expired CSRF token once, rather than leaving Sign out stuck.
     const me=await api('/api/me');
     csrfToken=me.csrfToken;
     await api('/api/logout',{method:'POST'});
   }
   csrfToken='';
   $('#app').hidden=true;
   $('#auth').hidden=false;
   $('#loginForm').reset();
   window.location.replace('/');
 }catch(error){
   alertText('Sign out failed: '+error.message,true);
   button.disabled=false;
   button.textContent='Sign out ↗';
 }
};
$('#changePasswordForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const fields=values(e.target);
  if(fields.newPassword!==fields.confirmPassword){alertText('New passwords do not match.',true);return}
  if(fields.newPassword.length<12){alertText('Use at least 12 characters.',true);return}
  if(!confirm('Change password and sign out all active sessions?'))return;
  try{
    await api('/api/me/password',{method:'POST',body:JSON.stringify({currentPassword:fields.currentPassword,newPassword:fields.newPassword})});
    csrfToken='';
    alert('Password updated. Sign in with your new password.');
    location.reload();
  }catch(err){alertText(err.message,true)}
});

document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>show(b.dataset.page));
const smtpForm=$('#smtpForm'),smtpTestButton=$('#smtpTestConnection'),smtpSaveButton=$('#smtpSaveAccount');
const smtpFeedback=$('#smtpTestFeedback');
let smtpTestSerial=0,smtpTestRunning=false;
function showSmtpTestFeedback(message,state='') {
 smtpFeedback.hidden=!message;
 smtpFeedback.className='smtp-test-feedback'+(state?' smtp-test-'+state:'');
 smtpFeedback.textContent=message;
}
smtpForm.addEventListener('input',e=>{
 if(['host','port','username','password','secure'].includes(e.target.name)){
  smtpTestSerial++;
  showSmtpTestFeedback('');
 }
});
smtpForm.addEventListener('change',e=>{
 if(e.target.name==='secure'){smtpTestSerial++;showSmtpTestFeedback('');}
});
smtpTestButton.addEventListener('click',async()=>{
 if(smtpTestRunning)return;
 const fields=['host','port','username','password'];
 for(const name of fields){
  const field=smtpForm.elements[name];
  if(!field.reportValidity())return;
 }
 const x=values(smtpForm);
 const serial=++smtpTestSerial;
 smtpTestRunning=true;
 smtpTestButton.disabled=true;
 smtpSaveButton.disabled=true;
 smtpTestButton.textContent='Testing connection…';
 showSmtpTestFeedback('Connecting securely to the SMTP server…','pending');
 try{
  const result=await api('/api/accounts/test-connection',{method:'POST',
    body:JSON.stringify({host:x.host,port:x.port,username:x.username,password:x.password,
      secure:smtpForm.elements.secure.checked})});
  if(serial===smtpTestSerial)
   showSmtpTestFeedback(result.message||'SMTP connection and authentication succeeded. No email was sent.','success');
 }catch(error){
  if(serial===smtpTestSerial)showSmtpTestFeedback(error.message,'error');
 }finally{
  smtpTestRunning=false;
  smtpTestButton.disabled=false;
  smtpSaveButton.disabled=false;
  smtpTestButton.textContent='Test connection';
 }
});
smtpForm.addEventListener('submit',async e=>{
 e.preventDefault();
 if(smtpTestRunning)return;
 const x=values(e.target);
 x.secure=e.target.elements.secure.checked;
 try{
  await api('/api/accounts',{method:'POST',body:JSON.stringify(x)});
  e.target.reset();
  smtpTestSerial++;
  showSmtpTestFeedback('');
  await listAccounts();
  alertText('SMTP account saved. Use Test SMTP in the configured accounts table to recheck later.');
 }catch(err){alertText(err.message,true)}
});
$('#contactSearch').addEventListener('input',()=>{
 clearTimeout(contactSearchDelay);
 contactSearchDelay=setTimeout(contactFilterChanged,250);
});
$('#contactTagFilter').addEventListener('input',()=>{
 clearTimeout(contactSearchDelay);
 contactSearchDelay=setTimeout(contactFilterChanged,250);
});
$('#contactStatus').addEventListener('change',contactFilterChanged);
$('#contactSort').addEventListener('change',contactFilterChanged);
$('#contactPrev').addEventListener('click',()=>{if(contactPage>1){contactPage--;listContacts().catch(e=>alertText(e.message,true));}});
$('#contactNext').addEventListener('click',()=>{if(contactPage<contactTotalPages){contactPage++;listContacts().catch(e=>alertText(e.message,true));}});
$('#contactList').addEventListener('change',event=>{
 const checkbox=event.target;
 if(checkbox.id==='contactSelectAll'){
  document.querySelectorAll('#contactList [data-contact-id]').forEach(input=>{
   input.checked=checkbox.checked;
   const id=Number(input.dataset.contactId);
   if(checkbox.checked)contactSelected.add(id);else contactSelected.delete(id);
  });
 }else if(checkbox.dataset.contactId){
  const id=Number(checkbox.dataset.contactId);
  if(checkbox.checked)contactSelected.add(id);else contactSelected.delete(id);
 }
 contactSelectionStatus();
});
async function contactBulkAction(action,tag){
 const ids=[...contactSelected];
 if(!ids.length)return;
 const d=await api('/api/contacts/bulk',{method:'POST',body:JSON.stringify({ids,action,...(tag?{tag}:{})})});
 alertText(action==='tag'?'Tag added to '+d.changed+' contact(s).':'Suppressed '+d.changed+' contact(s).');
 await listContacts();
}
$('#contactBulkTag').addEventListener('click',async()=>{
 const tag=prompt('Tag for selected contacts (letters, digits, underscores, hyphens):');
 if(tag===null)return;
 if(!/^[a-z0-9][a-z0-9_-]{0,31}$/i.test(tag.trim())){alertText('Use 1–32 letters, digits, underscores or hyphens.',true);return;}
 try{await contactBulkAction('tag',tag.trim());}catch(error){alertText(error.message,true);}
});
$('#contactBulkSuppress').addEventListener('click',async()=>{
 if(!contactSelected.size)return;
 if(!confirm('Suppress '+contactSelected.size+' selected contact(s)? They will not receive future campaigns. This cannot be undone here.'))return;
 try{await contactBulkAction('suppress');}catch(error){alertText(error.message,true);}
});
$('#contactBulkExport').addEventListener('click',async()=>{
 if(!contactSelected.size)return;
 try{
  const response=await fetch('/api/contacts/export.csv?ids='+encodeURIComponent([...contactSelected].join(',')),{credentials:'same-origin'});
  if(!response.ok)throw Error('Selected contact export failed');
  const blob=await response.blob();
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='mailpilot-selected-contacts.csv';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  alertText('Selected contacts exported.');
 }catch(error){alertText(error.message,true);}
});

$('#contactForm').addEventListener('submit',async e=>{e.preventDefault();const x=values(e.target);x.confirmConsent=e.target.elements.confirmConsent.checked;try{const d=await api('/api/contacts/import',{method:'POST',body:JSON.stringify(x)});alertText('Imported '+d.added+' new contacts; '+d.duplicates+' duplicates.');await listContacts()}catch(err){alertText(err.message,true)}});
$('#newCampaign').addEventListener('click',()=>{ $('#campaignForm').reset(); showWizardStep(1); $('#recipientEmailsLabel').hidden=true; updateCampaignReview(); show('editor'); });

function showWizardStep(stepNum) {
  document.querySelectorAll('.wizard-step').forEach(el => {
    el.hidden = String(el.dataset.step) !== String(stepNum);
  });
  $('#wizardProgress').textContent = `Step ${stepNum} of 5`;
}

document.querySelectorAll('.next-step').forEach(btn => {
  btn.addEventListener('click', e => {
    const currentStep = e.target.closest('.wizard-step');
    const inputs = currentStep.querySelectorAll('input, select, textarea');
    let valid = true;
    inputs.forEach(input => {
      if (!input.checkValidity()) {
        input.reportValidity();
        valid = false;
      }
    });
    if (!valid) return;

    if (String(currentStep.dataset.step) === '2') {
      const mode = $('#audienceMode').value;
      if (!mode) {
        alertText('Please select an audience.', true);
        return;
      }
      if (mode === 'selected') {
        const emails = $('#campaignForm').elements.recipientEmails.value;
        if (!emails.trim()) {
           alertText('Please enter at least one recipient email.', true);
           return;
        }
      }
    }

    showWizardStep(e.target.dataset.next);
  });
});

document.querySelectorAll('.prev-step').forEach(btn => {
  btn.addEventListener('click', e => {
    showWizardStep(e.target.dataset.prev);
  });
});

$('#audienceMode').addEventListener('change',()=>{
  $('#recipientEmailsLabel').hidden=$('#audienceMode').value!=='selected';
  updateCampaignReview();
});
function updateCampaignReview(){
  const x=values($('#campaignForm'));
  const count=String(x.recipientEmails||'').split(/[\s,;]+/).filter(Boolean).length;
  const target=x.audienceMode==='selected'?`${count} entered addresses (verified when saved)`:x.audienceMode==='all'?'All currently subscribed contacts (explicit choice)':'No audience selected';
  $('#campaignReview').textContent=`Sender: ${accounts.find(a=>String(a.id)===String(x.accountId))?.from_email||'Not set'} | Subject: ${x.subject||'Not set'} | Recipients: ${target} | Delivery: Draft only. No email will be sent now.`;
}
$('#campaignForm').addEventListener('input',updateCampaignReview);
$('#recipientEmailsLabel').hidden=true;
updateCampaignReview();
$('#campaignForm').addEventListener('submit',async e=>{e.preventDefault();try{const x=values(e.target);if(!x.audienceMode)throw Error('Choose recipients before saving');if(x.audienceMode==='all'&&!confirm('This campaign will target ALL subscribed contacts. Save as draft?'))return;const d=await api('/api/campaigns',{method:'POST',body:JSON.stringify(x)});alertText('Draft #'+d.id+' saved for '+d.recipientCount+' recipients. Open Campaigns to start.');await show('campaigns')}catch(err){alertText(err.message,true)}});
function syncHtmlPreview(){const input=$('#htmlInput');$('#preview').srcdoc=input.value;$('#htmlBytes').textContent=input.value.length.toLocaleString()+' characters'}
$('#htmlInput').addEventListener('input',syncHtmlPreview);
$('#htmlFile').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>900000){alertText('HTML file is too large (maximum 900 KB).',true);return}try{$('#htmlInput').value=await file.text();syncHtmlPreview();alertText('HTML template loaded. Review the source before saving.')}catch(err){alertText(err.message,true)}});

$('#sendTestEmailBtn').addEventListener('click', async () => {
  const x = values($('#campaignForm'));
  const testEmail = $('#testEmailInput').value;
  if (!testEmail || !x.accountId || !x.subject || !x.html) {
    alertText('Account, subject, HTML and test email are required for a test send.', true);
    return;
  }
  try {
    $('#sendTestEmailBtn').disabled = true;
    $('#sendTestEmailBtn').textContent = 'Sending...';
    await api('/api/campaigns/test-send', {
      method: 'POST',
      body: JSON.stringify({
        accountId: x.accountId,
        subject: x.subject,
        html: x.html,
        plain: x.plain,
        testEmail: testEmail
      })
    });
    alertText('Test email sent.');
  } catch (err) {
    alertText(err.message, true);
  } finally {
    $('#sendTestEmailBtn').disabled = false;
    $('#sendTestEmailBtn').textContent = 'Send test email';
  }
});
$('#pasteHtml').addEventListener('click',async()=>{try{const text=await navigator.clipboard.readText();if(!text)throw Error('Clipboard is empty');if(text.length>900000)throw Error('HTML exceeds 900 KB limit');$('#htmlInput').value=text;syncHtmlPreview();alertText('Pasted HTML from clipboard.')}catch(err){alertText('Clipboard access unavailable. Use Ctrl+V in the HTML source field. '+err.message,true)}});
$('#clearHtml').addEventListener('click',()=>{if(!$('#htmlInput').value||confirm('Clear the HTML editor?')){$('#htmlInput').value='';syncHtmlPreview()}});

document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;try{if(b.dataset.dns){const d=await api('/api/accounts/'+b.dataset.dns+'/dns');alertText(d.domain+' — SPF: '+d.spf.status+'; DMARC: '+d.dmarc.status+(d.dmarc.policy?' ('+d.dmarc.policy+')':'')+'; DKIM: requires a selector. DNS presence does not guarantee deliverability.')}if(b.dataset.test){const d=await api('/api/accounts/'+b.dataset.test+'/test',{method:'POST'});alertText(d.ok?'SMTP authentication successful':'SMTP failed')}if(b.dataset.start){if(!confirm('Start sending ONLY to the saved campaign audience? Review the audience size and SMTP settings first.'))return;try{
      await api('/api/campaigns/'+b.dataset.start+'/start',{method:'POST'})
    }catch(err){
      if(!err.message.includes('Legacy draft has no audience'))throw err;
      if(!confirm('This older draft has no saved audience. Send to ALL currently subscribed contacts?'))return;
      await api('/api/campaigns/'+b.dataset.start+'/start',{
        method:'POST',
        body:JSON.stringify({legacyAudience:'all'})
      })
    }
    await listCampaigns()}if(b.dataset.pause){await api('/api/campaigns/'+b.dataset.pause+'/pause',{method:'POST'});await listCampaigns()}if(b.dataset.duplicate){if(!confirm('Duplicate this campaign?'))return;await api('/api/campaigns/'+b.dataset.duplicate+'/duplicate',{method:'POST'});await listCampaigns()}if(b.dataset.delete){if(!confirm('Delete this campaign? This action cannot be undone.'))return;await api('/api/campaigns/'+b.dataset.delete,{method:'DELETE'});await listCampaigns()}if(b.dataset.exportLogs){const response=await fetch('/api/campaigns/'+b.dataset.exportLogs+'/messages/export.csv',{credentials:'same-origin'});if(!response.ok)throw Error('Campaign export failed');const blob=await response.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='mailpilot-campaign-'+b.dataset.exportLogs+'-messages.csv';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)}if(b.dataset.logs){const rows=await api('/api/campaigns/'+b.dataset.logs+'/messages');alertText(rows.slice(0,20).map(x=>x.email+' — '+x.status+(x.last_error?' — '+x.last_error:'')).join('\n')||'No deliveries yet')}}catch(err){alertText(err.message,true)}});
api('/api/me').then(me=>{csrfToken=me.csrfToken;$('#currentAdminEmail').textContent=me.email||'—';$('#auth').hidden=true;$('#app').hidden=false;show('overview')}).catch(()=>{});

// Appearance preference and dashboard navigation (no changes to mail delivery).
const setMailpilotTheme=theme=>{document.documentElement.dataset.theme=theme;document.querySelectorAll('#themeToggle,#headerThemeToggle').forEach(b=>b.setAttribute('aria-label','Current theme: '+theme+'. Switch theme'));};
try{setMailpilotTheme(localStorage.getItem('mailpilot-theme')||'light')}catch{setMailpilotTheme('light')}
function toggleMailpilotTheme(){const next=document.documentElement.dataset.theme==='dark'?'light':'dark';setMailpilotTheme(next);try{localStorage.setItem('mailpilot-theme',next)}catch{}}
$('#themeToggle').addEventListener('click',toggleMailpilotTheme);
$('#headerThemeToggle').addEventListener('click',toggleMailpilotTheme);
$('#headerNewCampaign').addEventListener('click',()=>$('#newCampaign').click());
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.go)));

// Version badge reads the real package version via the server, never hard-coded UI text.
api('/api/version').then(data=>{const el=$('#appVersion');if(el)el.textContent='v'+data.version;}).catch(()=>{});

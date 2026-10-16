let csrfToken='';
const $=s=>document.querySelector(s);let accounts=[];
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(path,options={}){const res=await fetch(path,{credentials:'same-origin',headers:{'Content-Type':'application/json',...(csrfToken?{'csrf-token':csrfToken}:{})},...options});const data=await res.json().catch(()=>({}));if(!res.ok)throw Error(data.error||'Request failed');return data}
function alertText(t,error=false){const el=$('#notice');el.textContent=t;el.style.color=error?'#ff9999':'#9fd9ba'}
function values(form){return Object.fromEntries(new FormData(form).entries())}
async function show(page){document.querySelectorAll('.page').forEach(p=>p.hidden=p.id!==page);document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));$('#sectionSubtitle').textContent=({overview:'Campaign delivery and account performance at a glance.',smtp:'Configure providers and enforce sending limits.',contacts:'Permission-based audience management.',campaigns:'Monitor and control campaign deliveries.',editor:'Build and preview your HTML email.',settings:'Administrator identity and security.'})[page]||'';$('#heading').textContent=({overview:'Overview',smtp:'SMTP Accounts',contacts:'Contacts',campaigns:'Campaigns',editor:'Compose Email',settings:'Account Settings'})[page];try{if(page==='overview')await stats();if(page==='smtp'||page==='editor')await listAccounts();if(page==='contacts')await listContacts();if(page==='campaigns')await listCampaigns()}catch(e){alertText(e.message,true)}}
async function stats(){const d=await api('/api/stats'),m=d.messages||{},c=d.contacts||{};$('#cards').innerHTML=[['Contacts',c.total],['Subscribed',c.subscribed],['Sent',m.sent],['Queued',m.queued]].map(([k,v])=>'<div class="stat"><small>'+k+'</small><b>'+Number(v||0).toLocaleString()+'</b></div>').join('')}
async function listAccounts(){accounts=await api('/api/accounts');$('#accountSelect').innerHTML=accounts.map(x=>'<option value="'+x.id+'">'+escapeHTML(x.label)+'</option>').join('');$('#accountList').innerHTML=accounts.length?accounts.map(x=>'<div class="row"><div><strong>'+escapeHTML(x.label)+'</strong><br><span>'+escapeHTML(x.from_email)+' • '+escapeHTML(x.host)+':'+x.port+' • '+x.per_minute+'/min, '+x.per_hour+'/h, '+x.per_day+'/day</span></div><button data-dns="'+x.id+'">Check DNS</button><button data-test="'+x.id+'">Test SMTP</button></div>').join(''):'No SMTP accounts yet.'}
async function listContacts(){const d=await api('/api/contacts');$('#contactList').innerHTML=d.map(x=>'<div class="row"><div>'+escapeHTML(x.email)+'</div><span>'+(x.subscribed?'Subscribed':'Unsubscribed')+'</span></div>').join('')||'No contacts yet.'}
async function listCampaigns(){const d=await api('/api/campaigns');$('#campaignList').innerHTML=d.map(x=>'<div class="row"><div><strong>'+escapeHTML(x.name||x.subject)+'</strong><br><span>'+escapeHTML(x.account_name)+' • '+x.sent+'/'+x.total+' sent • '+x.audience_total+' selected • '+escapeHTML(x.status)+'</span></div><div>'+(x.status==='draft'||x.status==='paused'?'<button data-start="'+x.id+'">Start</button> ':'')+(x.status==='running'?'<button data-pause="'+x.id+'">Pause</button>':'')+' <button class="ghost" data-duplicate="'+x.id+'">Duplicate</button> '+(x.status!=='running'?'<button class="ghost" data-delete="'+x.id+'">Delete</button>':'')+' <button class="ghost" data-logs="'+x.id+'">Logs</button> <button class="ghost" data-export-logs="'+x.id+'">Export CSV</button></div></div>').join('')||'No campaigns yet.'}
$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();try{await api('/api/login',{method:'POST',body:JSON.stringify(values(e.target))});const me=await api('/api/me');csrfToken=me.csrfToken;$('#currentAdminEmail').textContent=me.email||'—';$('#auth').hidden=true;$('#app').hidden=false;await show('overview')}catch(err){$('#loginNotice').textContent=err.message}});
$('#exportContacts').onclick=async()=>{try{const response=await fetch('/api/contacts/export.csv',{credentials:'same-origin'});if(!response.ok)throw Error('Contact export failed');const blob=await response.blob();const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='mailpilot-contacts.csv';document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);alertText('Contact CSV exported.')}catch(err){alertText(err.message,true)}};
$('#logout').onclick=async()=>{await api('/api/logout',{method:'POST'});location.reload()};
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
$('#smtpForm').addEventListener('submit',async e=>{e.preventDefault();const x=values(e.target);x.secure=e.target.elements.secure.checked;try{await api('/api/accounts',{method:'POST',body:JSON.stringify(x)});e.target.reset();await listAccounts();alertText('SMTP account saved. Test connection before sending.')}catch(err){alertText(err.message,true)}});
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
    // Check validation of inputs in this step
    const inputs = currentStep.querySelectorAll('input, select, textarea');
    let valid = true;
    inputs.forEach(input => {
      if (!input.checkValidity()) {
        input.reportValidity();
        valid = false;
      }
    });
    if (!valid) return;

    // Additional validation for Audience step
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

document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;try{if(b.dataset.dns){const d=await api('/api/accounts/'+b.dataset.dns+'/dns');alertText(d.domain+' — SPF: '+d.spf.status+'; DMARC: '+d.dmarc.status+(d.dmarc.policy?' ('+d.dmarc.policy+')':'')+'; DKIM: requires a selector. DNS presence does not guarantee deliverability.')}if(b.dataset.test){const d=await api('/api/accounts/'+b.dataset.test+'/test',{method:'POST'});alertText(d.ok?'SMTP authentication successful':'SMTP failed')}if(b.dataset.start){if(!confirm('Start sending ONLY to the saved campaign audience? Review the audience size and SMTP settings first.'))return;await api('/api/campaigns/'+b.dataset.start+'/start',{method:'POST'});await listCampaigns()}if(b.dataset.pause){await api('/api/campaigns/'+b.dataset.pause+'/pause',{method:'POST'});await listCampaigns()}if(b.dataset.duplicate){if(!confirm('Duplicate this campaign?'))return;await api('/api/campaigns/'+b.dataset.duplicate+'/duplicate',{method:'POST'});await listCampaigns()}if(b.dataset.delete){if(!confirm('Delete this campaign? This action cannot be undone.'))return;await api('/api/campaigns/'+b.dataset.delete,{method:'DELETE'});await listCampaigns()}if(b.dataset.exportLogs){const response=await fetch('/api/campaigns/'+b.dataset.exportLogs+'/messages/export.csv',{credentials:'same-origin'});if(!response.ok)throw Error('Campaign export failed');const blob=await response.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='mailpilot-campaign-'+b.dataset.exportLogs+'-messages.csv';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)}if(b.dataset.logs){const rows=await api('/api/campaigns/'+b.dataset.logs+'/messages');alertText(rows.slice(0,20).map(x=>x.email+' — '+x.status+(x.last_error?' — '+x.last_error:'')).join('\n')||'No deliveries yet')}}catch(err){alertText(err.message,true)}});
api('/api/me').then(me=>{csrfToken=me.csrfToken;$('#currentAdminEmail').textContent=me.email||'—';$('#auth').hidden=true;$('#app').hidden=false;show('overview')}).catch(()=>{});

const $=id=>document.getElementById(id);
const DB="mft-private-v1", STORE="vault";
let db,secret=null,data={transactions:[],loans:[],investments:[]},idleTimer;
const money=n=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n||0);
const today=new Date();$("tx-date").value=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
const enc=new TextEncoder(),dec=new TextDecoder();
function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>{db=r.result;res()};r.onerror=()=>rej(r.error)})}
function getVault(){return new Promise((res,rej)=>{const r=db.transaction(STORE).objectStore(STORE).get("main");r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error)})}
function putVault(v){return new Promise((res,rej)=>{const r=db.transaction(STORE,"readwrite").objectStore(STORE).put(v,"main");r.onsuccess=res;r.onerror=()=>rej(r.error)})}
function delVault(){return new Promise((res,rej)=>{const r=db.transaction(STORE,"readwrite").objectStore(STORE).delete("main");r.onsuccess=res;r.onerror=()=>rej(r.error)})}
function b64(a){return btoa(String.fromCharCode(...new Uint8Array(a)))}
function un64(s){return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
async function derive(pin,salt){const material=await crypto.subtle.importKey("raw",enc.encode(pin),"PBKDF2",false,["deriveKey"]);return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:600000,hash:"SHA-256"},material,{name:"AES-GCM",length:256},false,["encrypt","decrypt"])}
async function encryptData(){const iv=crypto.getRandomValues(new Uint8Array(12));const plain=enc.encode(JSON.stringify(data));const cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv},secret,plain);const old=await getVault();await putVault({salt:old.salt,iv:b64(iv),cipher:b64(cipher),version:1})}
async function decryptData(pin,v){const key=await derive(pin,un64(v.salt));const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:un64(v.iv)},key,un64(v.cipher));secret=key;data=JSON.parse(dec.decode(plain));data.transactions??=[];data.loans??=[];data.investments??=[]}
function showLock(isSetup){$("app").hidden=true;$("lock").hidden=false;$("pin").value="";$("pin-error").textContent="";$("lock-title").textContent=isSetup?"Set your 6-digit PIN":"Unlock My Finance";$("lock-help").textContent=isSetup?"Choose a unique six-digit PIN. Your records will be encrypted on this device. If you forget it, there is no recovery.":"Enter your six-digit PIN to decrypt your local financial records.";$("pin-button").textContent=isSetup?"Create secure vault":"Unlock"}
async function setup(pin){const salt=crypto.getRandomValues(new Uint8Array(16));secret=await derive(pin,salt);data={transactions:[],loans:[],investments:[]};await putVault({salt:b64(salt),iv:"",cipher:"",version:1});await encryptData();unlockUI()}
function unlockUI(){$("lock").hidden=true;$("app").hidden=false;render();resetIdle()}
function lockApp(){if($("app").hidden)return;secret=null;data={transactions:[],loans:[],investments:[]};clearTimeout(idleTimer);showLock(false)}
function resetIdle(){clearTimeout(idleTimer);idleTimer=setTimeout(lockApp,60000)}
["touchstart","touchend","click","keydown","scroll"].forEach(ev=>document.addEventListener(ev,()=>{if(!$("app").hidden)resetIdle()},{passive:true}));
let hiddenAt=0;
document.addEventListener("visibilitychange",()=>{
 if($("app").hidden)return;
 if(document.hidden){hiddenAt=Date.now();}
 else if(hiddenAt){if(Date.now()-hiddenAt>=60000)lockApp();else resetIdle();hiddenAt=0;}
});
$("pin-form").onsubmit=async e=>{e.preventDefault();const pin=$("pin").value;if(!/^\d{6}$/.test(pin)){$("pin-error").textContent="Enter exactly six digits.";return}const v=await getVault();try{if(!v)await setup(pin);else{await decryptData(pin,v);unlockUI()}}catch(err){secret=null;$("pin-error").textContent="Incorrect PIN or encrypted data could not be read."} };
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function addRow(host,title,meta,amount,remove){const el=document.createElement("div");el.className="item";el.innerHTML=`<div><strong>${esc(title)}</strong><div class="muted">${esc(meta)}</div></div><div class="amt">${esc(amount)} <button aria-label="Delete" style="border:0;background:none;color:#9aa3af">×</button></div>`;el.querySelector("button").onclick=async()=>{if(confirm("Delete this record?")){remove();await encryptData();render()}};host.append(el)}
function render(){const month=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}`;const tx=data.transactions.filter(x=>x.date.startsWith(month));const income=tx.filter(x=>x.type==="income").reduce((s,x)=>s+x.amount,0),expense=tx.filter(x=>x.type==="expense").reduce((s,x)=>s+x.amount,0);$("income").textContent=money(income);$("expense").textContent=money(expense);$("net").textContent=money(income-expense);
const tl=$("tx-list");tl.innerHTML="";if(!data.transactions.length)tl.textContent="No transactions yet.";data.transactions.slice().reverse().forEach((x,i)=>addRow(tl,x.note||x.category,`${x.date} · ${x.category}`,`${x.type==="income"?"+":"−"}${money(x.amount)}`,()=>data.transactions.splice(data.transactions.indexOf(x),1)));
const ll=$("loan-list");ll.innerHTML="";if(!data.loans.length)ll.textContent="No loans yet.";data.loans.forEach(x=>addRow(ll,x.name,`${x.rate}% interest · EMI ${money(x.emi)} · ${x.count} EMIs left`,money(x.balance),()=>data.loans.splice(data.loans.indexOf(x),1)));
const il=$("inv-list");il.innerHTML="";if(!data.investments.length)il.textContent="No investments yet.";data.investments.forEach(x=>addRow(il,x.name,`${x.type} · Invested ${money(x.cost)}`,`Value ${money(x.value)} (${x.value-x.cost>=0?"+":""}${money(x.value-x.cost)})`,()=>data.investments.splice(data.investments.indexOf(x),1)))}
$("tx-form").onsubmit=async e=>{e.preventDefault();data.transactions.push({type:document.querySelector('[name=type]:checked').value,amount:+$("tx-amount").value,category:$("tx-category").value,date:$("tx-date").value,note:$("tx-note").value.trim()});await encryptData();e.target.reset();$("tx-date").value=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;render()};
$("loan-form").onsubmit=async e=>{e.preventDefault();data.loans.push({name:$("loan-name").value,balance:+$("loan-balance").value,rate:+$("loan-rate").value,emi:+$("loan-emi").value,count:+$("loan-count").value});await encryptData();e.target.reset();render()};
$("inv-form").onsubmit=async e=>{e.preventDefault();data.investments.push({name:$("inv-name").value,cost:+$("inv-cost").value,value:+$("inv-value").value,type:$("inv-type").value});await encryptData();e.target.reset();render()};
document.querySelectorAll(".tab").forEach(btn=>btn.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===btn));document.querySelectorAll(".pane").forEach(p=>p.hidden=p.id!==btn.dataset.tab)});
$("lock-now").onclick=lockApp;
$("erase").onclick=async()=>{if(confirm("Permanently erase the encrypted vault on this iPhone? This cannot be undone.")){secret=null;data={transactions:[],loans:[],investments:[]};await delVault();showLock(true)}};
(async()=>{if(!window.crypto?.subtle||!window.isSecureContext){$("pin-error").textContent="Secure encryption requires this app to be opened from an HTTPS website in Safari.";return}await openDB();const v=await getVault();showLock(!v)})();

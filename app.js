'use strict';

const STORAGE_KEY = 'roozmarre_yaar_v1';
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
const localISODate = (value=new Date()) => {
  const d = value instanceof Date ? value : new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
};
const dateFromISO = iso => {
  if(!iso) return null;
  if(iso instanceof Date) return new Date(iso);
  if(String(iso).includes('T')) return new Date(iso);
  const [y,m,d] = String(iso).split('-').map(Number);
  return new Date(y,(m||1)-1,d||1,12,0,0,0);
};
const todayISO = () => localISODate(new Date());
const nowISO = () => new Date().toISOString();
const faDate = (d=new Date(), opts={}) => new Intl.DateTimeFormat('fa-IR-u-ca-persian',{weekday:'long',year:'numeric',month:'long',day:'numeric',...opts}).format(d);
const faNum = n => new Intl.NumberFormat('fa-IR').format(Number(n||0));
const money = n => `${faNum(n)} تومان`;
const formatGregorianISO = iso => { const d=dateFromISO(iso); return d ? `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}` : ''; };
const daysBetween = (a,b) => Math.floor((dateFromISO(b)-dateFromISO(a))/(86400000));
const startOfWeek = (date=new Date()) => { const d=new Date(date); const day=(d.getDay()+1)%7; d.setHours(0,0,0,0); d.setDate(d.getDate()-day); return d; };
const escapeHtml = s => String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));

const PERSIAN_MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
const PERSIAN_WEEKDAYS = ['ش','ی','د','س','چ','پ','ج'];
const jalaliFormatter = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn',{year:'numeric',month:'numeric',day:'numeric'});
const toPersianDigits = value => String(value).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
const normalizeDigits = value => String(value||'')
  .replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
  .replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
function isoToJalali(iso){
  const date=dateFromISO(iso);
  if(!date || Number.isNaN(date.getTime())) return null;
  const parts=Object.fromEntries(jalaliFormatter.formatToParts(date).filter(p=>['year','month','day'].includes(p.type)).map(p=>[p.type,Number(p.value)]));
  return {jy:parts.year,jm:parts.month,jd:parts.day};
}
function jalaliToISO(jy,jm,jd){
  jy=Number(jy);jm=Number(jm);jd=Number(jd);
  if(!jy||jm<1||jm>12||jd<1||jd>31) return null;
  const start=new Date(jy+621,2,1,12);
  const end=new Date(jy+622,3,1,12);
  for(let d=new Date(start); d<end; d.setDate(d.getDate()+1)){
    const j=isoToJalali(d);
    if(j && j.jy===jy && j.jm===jm && j.jd===jd) return localISODate(d);
  }
  return null;
}
function formatJalaliISO(iso){
  const j=isoToJalali(iso);
  return j ? toPersianDigits(`${j.jy}/${String(j.jm).padStart(2,'0')}/${String(j.jd).padStart(2,'0')}`) : '';
}
function parseJalaliText(text){
  const value=normalizeDigits(text).trim().replace(/[-.]/g,'/');
  const m=value.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if(!m) return null;
  const iso=jalaliToISO(Number(m[1]),Number(m[2]),Number(m[3]));
  return iso ? {iso,jy:Number(m[1]),jm:Number(m[2]),jd:Number(m[3])} : null;
}
function jalaliMonthLength(jy,jm){
  if(jm<=6) return 31;
  if(jm<=11) return 30;
  return jalaliToISO(jy,12,30) ? 30 : 29;
}

const initialState = () => ({
  profile:{name:'امیر', timezone:'Asia/Baku', theme:'light'},
  hygiene:[
    {id:uid(),title:'مسواک صبح',category:'personal',frequency:'daily',interval:1,time:'08:00',lastDone:null,active:true},
    {id:uid(),title:'مسواک شب',category:'personal',frequency:'daily',interval:1,time:'23:00',lastDone:null,active:true},
    {id:uid(),title:'فیس‌واش',category:'personal',frequency:'daily',interval:1,time:'21:30',lastDone:null,active:true},
    {id:uid(),title:'اصلاح صورت',category:'personal',frequency:'interval',interval:3,time:'20:00',lastDone:null,active:true},
    {id:uid(),title:'اصلاح موهای زائد',category:'personal',frequency:'interval',interval:7,time:'20:00',lastDone:null,active:true},
    {id:uid(),title:'جاروی منزل',category:'home',frequency:'interval',interval:3,time:'18:00',lastDone:null,active:true},
    {id:uid(),title:'نظافت کف منزل',category:'home',frequency:'interval',interval:7,time:'18:00',lastDone:null,active:true},
    {id:uid(),title:'شست‌وشوی لباس‌ها',category:'home',frequency:'interval',interval:3,time:'18:30',lastDone:null,active:true}
  ],
  routines:[
    {id:uid(),title:'شنا یا باشگاه',kind:'weeklyTarget',target:3,duration:60,time:'18:00',active:true,logs:[]},
    {id:uid(),title:'مطالعه کتاب',kind:'daily',target:1,duration:30,time:'21:30',active:true,logs:[]},
    {id:uid(),title:'ژورنالینگ',kind:'daily',target:1,duration:30,time:'22:15',active:true,logs:[]}
  ],
  books:[{id:uid(),title:'کتاب فعلی',currentPage:0,totalPages:0}],
  journal:[],
  inventory:[
    {id:uid(),name:'نان',cycle:'daily',status:'ok',lastChecked:null,price:0},
    {id:uid(),name:'آب معدنی',cycle:'daily',status:'low',lastChecked:null,price:0},
    {id:uid(),name:'میوه',cycle:'weekly',status:'low',lastChecked:null,price:0},
    {id:uid(),name:'سبزیجات',cycle:'weekly',status:'ok',lastChecked:null,price:0},
    {id:uid(),name:'برنج',cycle:'monthly',status:'ok',lastChecked:null,price:0},
    {id:uid(),name:'گوشت',cycle:'monthly',status:'low',lastChecked:null,price:0}
  ],
  shopping:[],
  expenses:[],
  bills:[],
  building:{
    units:[
      {id:uid(),name:'واحد ۱',resident:'خودم',balance:0},
      {id:uid(),name:'واحد ۲',resident:'مستأجر',balance:0},
      {id:uid(),name:'واحد ۳',resident:'مستأجر',balance:0}
    ],
    cleaning:[{id:uid(),title:'نظافت راه‌پله و ورودی',interval:30,lastDone:null,cost:0,active:true}],
    charges:[]
  },
  installments:[],
  customReminders:[],
  reminders:{enabled:false,lastSent:{}},
  meta:{createdAt:nowISO(),updatedAt:nowISO()}
});

let state = loadState();
let activeRoute = 'dashboard';
let homeTab = 'inventory';

function loadState(){
  try{ const raw=localStorage.getItem(STORAGE_KEY); return raw ? {...initialState(),...JSON.parse(raw)} : initialState(); }
  catch(e){ console.error(e); return initialState(); }
}
function saveState(){ state.meta.updatedAt=nowISO(); localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); $('#storageStatus').textContent='ذخیره شد • '+new Date().toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'}); }
function mutate(fn,msg){ fn(); saveState(); render(); if(msg) toast(msg); }
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>t.classList.remove('show'),2200); }

function isDoneToday(logs=[]){ return logs.some(l=>l.date===todayISO()); }
function dueHygiene(t){
  if(!t.active) return false;
  if(t.frequency==='daily') return t.lastDone!==todayISO();
  if(!t.lastDone) return true;
  return daysBetween(t.lastDone,todayISO())>=Number(t.interval||1);
}
function weekLogs(r){ const start=startOfWeek(); return (r.logs||[]).filter(l=>dateFromISO(l.date)>=start); }
function dueRoutine(r){
  if(!r.active) return false;
  if(r.kind==='daily') return !isDoneToday(r.logs);
  return weekLogs(r).length < Number(r.target||1);
}
function cycleDays(c){ return c==='daily'?1:c==='weekly'?7:c==='monthly'?30:Number(c)||1; }
function dueInventory(i){ return !i.lastChecked || daysBetween(i.lastChecked,todayISO())>=cycleDays(i.cycle); }
function dueBills(){ const today=dateFromISO(todayISO()); return state.bills.filter(b=>b.status!=='paid' && b.dueDate && dateFromISO(b.dueDate)>=new Date(today.getTime()-86400000) && dateFromISO(b.dueDate)<=new Date(today.getTime()+7*86400000)); }
function currentInstallmentDue(p){
  if(p.status==='settled' || p.paidCount>=p.count) return false;
  const next=dateFromISO(p.nextDueDate||todayISO());
  const limit=new Date(); limit.setDate(limit.getDate()+7);
  return next<=limit;
}
function activeCustomReminders(){ return (state.customReminders||[]).filter(r=>r.active!==false && r.status!=='done'); }
function dueCustomReminder(r){ return r.active!==false && r.status!=='done' && r.date && r.date<=todayISO(); }
function reminderStatus(r){
  if(r.status==='done') return ['انجام‌شده','green'];
  if(r.date<todayISO()) return ['عقب‌افتاده','red'];
  if(r.date===todayISO()) return ['امروز','amber'];
  return ['پیش‌رو','blue'];
}
function repeatLabel(value){ return value==='daily'?'روزانه':value==='weekly'?'هفتگی':value==='monthly'?'ماهانه':value==='yearly'?'سالانه':'بدون تکرار'; }
function calendarLabel(value){ return value==='gregorian'?'میلادی':'شمسی'; }
function addDaysISO(iso,days){ const d=dateFromISO(iso); d.setDate(d.getDate()+Number(days||0)); return localISODate(d); }
function addGregorianMonthsISO(iso,months){
  const d=dateFromISO(iso); const day=d.getDate(); d.setDate(1); d.setMonth(d.getMonth()+months); const max=new Date(d.getFullYear(),d.getMonth()+1,0).getDate(); d.setDate(Math.min(day,max)); return localISODate(d);
}
function addJalaliMonthsISO(iso,months){
  const j=isoToJalali(iso); if(!j)return iso; const index=(j.jm-1)+months; const jy=j.jy+Math.floor(index/12); const jm=((index%12)+12)%12+1; const normalizedYear=index<0&&index%12?jy-1:jy; const targetYear=index<0&&index%12?normalizedYear:jy; const jd=Math.min(j.jd,jalaliMonthLength(targetYear,jm)); return jalaliToISO(targetYear,jm,jd);
}
function nextReminderDate(r){
  if(r.repeat==='daily')return addDaysISO(r.date,1);
  if(r.repeat==='weekly')return addDaysISO(r.date,7);
  if(r.repeat==='monthly')return r.calendarType==='gregorian'?addGregorianMonthsISO(r.date,1):addJalaliMonthsISO(r.date,1);
  if(r.repeat==='yearly')return r.calendarType==='gregorian'?addGregorianMonthsISO(r.date,12):addJalaliMonthsISO(r.date,12);
  return r.date;
}
function dashboardTasks(){
  const tasks=[];
  state.hygiene.filter(dueHygiene).forEach(t=>tasks.push({id:t.id,module:'hygiene',title:t.title,meta:`بهداشت‌یار • ${t.time||''}`,done:false}));
  state.routines.filter(dueRoutine).forEach(r=>tasks.push({id:r.id,module:'routine',title:r.title,meta:r.kind==='weeklyTarget'?`روتین‌یار • ${weekLogs(r).length} از ${r.target} جلسه`:`روتین‌یار • ${r.duration} دقیقه`,done:false}));
  state.inventory.filter(dueInventory).forEach(i=>tasks.push({id:i.id,module:'inventory',title:`بررسی موجودی ${i.name}`,meta:`خانه‌یار • ${cycleLabel(i.cycle)}`,done:false}));
  dueBills().forEach(b=>tasks.push({id:b.id,module:'bill',title:`${b.title} • ${money(b.amount)}`,meta:`سررسید ${toFaShort(b.dueDate)}`,done:false}));
  state.installments.filter(currentInstallmentDue).forEach(p=>tasks.push({id:p.id,module:'installment',title:`قسط ${p.title}`,meta:`${money(p.installmentAmount)} • سررسید ${toFaShort(p.nextDueDate)}`,done:false}));
  activeCustomReminders().filter(dueCustomReminder).forEach(r=>tasks.push({id:r.id,module:'customReminder',title:r.title,meta:`یادآور • ${formatJalaliISO(r.date)} • ساعت ${r.time||'—'}`,done:false}));
  return tasks;
}
function cycleLabel(c){ return c==='daily'?'روزانه':c==='weekly'?'هفتگی':c==='monthly'?'ماهانه':`هر ${c} روز`; }
function statusLabel(s){ return s==='ok'?'موجود':s==='low'?'رو به اتمام':'تمام‌شده'; }
function toFaShort(date){ if(!date) return '—'; return new Intl.DateTimeFormat('fa-IR-u-ca-persian',{month:'short',day:'numeric'}).format(dateFromISO(date)); }
function formatDateTime(date){ return new Intl.DateTimeFormat('fa-IR-u-ca-persian',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(date)); }

function navigate(route){
  activeRoute=route;
  $$('.route').forEach(el=>el.classList.remove('active'));
  $(`#route-${route}`).classList.add('active');
  $$('[data-route]').forEach(b=>b.classList.toggle('active',b.dataset.route===route));
  render(); window.scrollTo({top:0,behavior:'smooth'});
}

function render(){
  renderDashboard(); renderHome(); renderInstallments(); renderCustomReminders(); renderHygiene(); renderRoutine(); renderSettings();
  bindDynamicEvents();
}

function pageHead(title,desc){ return `<div class="page-head"><div><div class="eyebrow">روزمره‌یار</div><h1>${title}</h1><p>${desc}</p></div><div class="date-chip">${faDate()}</div></div>`; }

function renderDashboard(){
  const tasks=dashboardTasks();
  const monthExpenses=state.expenses.filter(e=>e.date?.slice(0,7)===todayISO().slice(0,7)).reduce((s,e)=>s+Number(e.amount||0),0);
  const unpaidInstallments=state.installments.filter(p=>p.status!=='settled').reduce((s,p)=>s+(Math.max(0,p.count-p.paidCount)*Number(p.installmentAmount||0)),0);
  const weeklyRoutineTotal=state.routines.reduce((s,r)=>s+(r.kind==='weeklyTarget'?Number(r.target||0):7),0);
  const weeklyRoutineDone=state.routines.reduce((s,r)=>s+(r.kind==='weeklyTarget'?weekLogs(r).length:weekLogs(r).length),0);
  const routinePercent=weeklyRoutineTotal?Math.min(100,Math.round(weeklyRoutineDone/weeklyRoutineTotal*100)):0;
  $('#route-dashboard').innerHTML=`
    ${pageHead(`سلام ${escapeHtml(state.profile.name)} 👋`,'امروز چه چیزهایی باید انجام شود؟')}
    <div class="grid stats">
      <div class="stat"><small>کارهای امروز</small><strong>${faNum(tasks.length)}</strong></div>
      <div class="stat"><small>هزینه این ماه</small><strong class="money">${faNum(monthExpenses)}</strong></div>
      <div class="stat"><small>مانده اقساط</small><strong class="money">${faNum(unpaidInstallments)}</strong></div>
      <div class="stat"><small>پیشرفت روتین هفتگی</small><strong>${faNum(routinePercent)}٪</strong></div>
    </div>
    <div class="grid module-grid">
      ${moduleCard('خانه‌یار','موجودی، خرید، قبوض و ساختمان',state.inventory.filter(i=>i.status!=='ok').length,'قلم نیازمند توجه','home')}
      ${moduleCard('قسط‌یار','اقساط بانکی و BNPL',state.installments.filter(p=>p.status!=='settled').length,'تعهد فعال','installments')}
      ${moduleCard('یادآور','یادآوری‌های شخصی با تاریخ شمسی و میلادی',activeCustomReminders().length,'یادآور فعال','custom-reminders')}
      ${moduleCard('بهداشت‌یار','بهداشت شخصی و نظافت منزل',state.hygiene.filter(dueHygiene).length,'کار امروز','hygiene')}
      ${moduleCard('روتین‌یار','ورزش، مطالعه و ژورنالینگ',state.routines.filter(dueRoutine).length,'روتین باز','routine')}
    </div>
    <div class="grid layout-2">
      <div class="card">
        <div class="card-head"><h2>کارهای امروز</h2><button class="btn ghost" data-action="refresh">به‌روزرسانی</button></div>
        <div class="task-list">
          ${tasks.length?tasks.map(taskRow).join(''):'<div class="empty">همه کارهای امروز انجام شده‌اند 🎉</div>'}
        </div>
      </div>
      <div class="grid">
        <div class="card">
          <div class="card-head"><h3>اقدام سریع</h3></div>
          <div class="grid quick-grid">
            <button class="quick-card" data-quick="inventory"><b>کمبود جدید</b><span>افزودن به لیست خرید</span></button>
            <button class="quick-card" data-quick="expense"><b>ثبت هزینه</b><span>هزینه خانه یا خرید</span></button>
            <button class="quick-card" data-quick="installment"><b>قسط جدید</b><span>بانک یا BNPL</span></button>
            <button class="quick-card" data-quick="reminder"><b>یادآور جدید</b><span>تاریخ شمسی یا میلادی</span></button>
            <button class="quick-card" data-quick="journal"><b>ژورنال امروز</b><span>یادداشت روزانه</span></button>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3>پیشرفت این هفته</h3><span>${faNum(routinePercent)}٪</span></div>
          <div class="progress"><span style="width:${routinePercent}%"></span></div>
          <p class="item-sub">${faNum(weeklyRoutineDone)} ثبت از ${faNum(weeklyRoutineTotal)} هدف هفتگی</p>
        </div>
      </div>
    </div>`;
}
function moduleCard(title,desc,n,label,route){ return `<button class="card module-card" data-route="${route}" style="text-align:right"><h3>${title}</h3><p>${desc}</p><div class="big">${faNum(n)}</div><small>${label}</small></button>`; }
function taskRow(t){ return `<div class="task-row" data-task="${t.module}:${t.id}"><button class="task-check" data-complete="${t.module}:${t.id}" aria-label="انجام شد"></button><div><div class="task-title">${escapeHtml(t.title)}</div><div class="task-meta">${escapeHtml(t.meta)}</div></div><div class="task-actions"><button class="mini-btn" data-snooze="${t.module}:${t.id}">بعداً</button><button class="mini-btn primary" data-complete="${t.module}:${t.id}">انجام شد</button></div></div>`; }

function renderHome(){
  const tabs=[['inventory','موجودی'],['shopping','لیست خرید'],['bills','قبوض'],['building','ساختمان'],['expenses','هزینه‌ها']];
  $('#route-home').innerHTML=`${pageHead('خانه‌یار','مدیریت موجودی، خرید، قبوض، مستأجر و ساختمان')}
    <div class="tabs">${tabs.map(([k,l])=>`<button class="tab ${homeTab===k?'active':''}" data-home-tab="${k}">${l}</button>`).join('')}</div>
    ${homeTab==='inventory'?renderInventory():homeTab==='shopping'?renderShopping():homeTab==='bills'?renderBills():homeTab==='building'?renderBuilding():renderExpenses()}`;
}
function renderInventory(){ return `<div class="card"><div class="card-head"><h2>موجودی خانه</h2><button class="btn primary" data-add="inventory">افزودن قلم</button></div><div class="item-list">${state.inventory.map(i=>`<div class="item"><div class="item-main"><div class="item-title">${escapeHtml(i.name)}</div><div class="badges"><span class="badge blue">${cycleLabel(i.cycle)}</span><span class="badge ${i.status==='ok'?'green':i.status==='low'?'amber':'red'}">${statusLabel(i.status)}</span>${i.lastChecked?`<span class="badge">بررسی: ${toFaShort(i.lastChecked)}</span>`:''}</div></div><div class="item-actions"><button class="mini-btn" data-inv-status="${i.id}:ok">موجود</button><button class="mini-btn warn" data-inv-status="${i.id}:low">کم</button><button class="mini-btn" data-inv-status="${i.id}:out">تمام</button><button class="mini-btn" data-delete="inventory:${i.id}">حذف</button></div></div>`).join('')}</div></div>`; }
function renderShopping(){
  const total=state.shopping.filter(s=>!s.done).reduce((a,s)=>a+Number(s.price||0),0);
  return `<div class="grid layout-2"><div class="card"><div class="card-head"><h2>لیست خرید</h2><button class="btn primary" data-add="shopping">افزودن خرید</button></div><div class="item-list">${state.shopping.length?state.shopping.map(s=>`<div class="item ${s.done?'done':''}"><div class="item-main"><div class="item-title">${escapeHtml(s.name)} ${s.qty?`• ${escapeHtml(s.qty)}`:''}</div><div class="item-sub">${s.price?money(s.price):'قیمت ثبت نشده'}</div></div><div class="item-actions"><button class="mini-btn primary" data-buy="${s.id}">${s.done?'خرید شد':'ثبت خرید'}</button><button class="mini-btn" data-delete="shopping:${s.id}">حذف</button></div></div>`).join(''):'<div class="empty">لیست خرید خالی است.</div>'}</div></div><div class="card"><h3 class="section-title">برآورد خرید</h3><div class="stat"><small>مجموع اقلام باز</small><strong>${money(total)}</strong></div></div></div>`;
}
function renderBills(){ return `<div class="card"><div class="card-head"><h2>قبوض</h2><button class="btn primary" data-add="bill">ثبت قبض</button></div><div class="item-list">${state.bills.length?state.bills.map(b=>`<div class="item"><div class="item-main"><div class="item-title">${escapeHtml(b.title)} • ${money(b.amount)}</div><div class="item-sub">سررسید ${toFaShort(b.dueDate)} • مسئول: ${escapeHtml(b.owner||'خودم')}</div><div class="badges"><span class="badge ${b.status==='paid'?'green':'amber'}">${b.status==='paid'?'پرداخت شد':'در انتظار پرداخت'}</span>${b.tenant?'<span class="badge blue">برای مستأجر</span>':''}</div></div><div class="item-actions"><button class="mini-btn primary" data-bill-paid="${b.id}">پرداخت شد</button><button class="mini-btn" data-bill-share="${b.id}">متن ارسال</button><button class="mini-btn" data-delete="bill:${b.id}">حذف</button></div></div>`).join(''):'<div class="empty">هنوز قبضی ثبت نشده است.</div>'}</div></div>`; }
function renderBuilding(){
  return `<div class="grid layout-2"><div class="card"><div class="card-head"><h2>وضعیت واحدها</h2><button class="btn primary" data-add="charge">ثبت شارژ</button></div><div class="item-list">${state.building.units.map(u=>`<div class="item"><div><div class="item-title">${escapeHtml(u.name)} • ${escapeHtml(u.resident)}</div><div class="item-sub">مانده: ${money(u.balance)}</div></div><button class="mini-btn" data-unit-pay="${u.id}">ثبت پرداخت</button></div>`).join('')}</div></div><div class="card"><div class="card-head"><h2>نظافت ساختمان</h2><button class="btn primary" data-add="cleaning">افزودن برنامه</button></div><div class="item-list">${state.building.cleaning.map(c=>`<div class="item"><div><div class="item-title">${escapeHtml(c.title)}</div><div class="item-sub">هر ${faNum(c.interval)} روز • آخرین انجام: ${c.lastDone?toFaShort(c.lastDone):'ثبت نشده'}</div></div><button class="mini-btn primary" data-clean-done="${c.id}">انجام شد</button></div>`).join('')}</div></div></div>`;
}
function renderExpenses(){
  const total=state.expenses.reduce((s,e)=>s+Number(e.amount||0),0);
  return `<div class="grid layout-2"><div class="card"><div class="card-head"><h2>هزینه‌ها</h2><button class="btn primary" data-add="expense">ثبت هزینه</button></div><div class="item-list">${state.expenses.length?state.expenses.slice().reverse().map(e=>`<div class="item"><div><div class="item-title">${escapeHtml(e.title)} • ${money(e.amount)}</div><div class="item-sub">${toFaShort(e.date)} • ${escapeHtml(e.category||'سایر')}</div></div><button class="mini-btn" data-delete="expense:${e.id}">حذف</button></div>`).join(''):'<div class="empty">هنوز هزینه‌ای ثبت نشده است.</div>'}</div></div><div class="card"><h3 class="section-title">جمع هزینه ثبت‌شده</h3><div class="stat"><small>کل</small><strong>${money(total)}</strong></div></div></div>`;
}

function renderInstallments(){
  const active=state.installments.filter(p=>p.status!=='settled');
  const monthly=active.reduce((s,p)=>s+Number(p.installmentAmount||0),0);
  const remaining=active.reduce((s,p)=>s+Math.max(0,p.count-p.paidCount)*Number(p.installmentAmount||0),0);
  $('#route-installments').innerHTML=`${pageHead('قسط‌یار','اقساط بانکی، خرید قسطی، BNPL و اشتراک‌ها')}
    <div class="grid stats"><div class="stat"><small>تعهد فعال</small><strong>${faNum(active.length)}</strong></div><div class="stat"><small>پرداخت ماهانه</small><strong>${money(monthly)}</strong></div><div class="stat"><small>مانده کل</small><strong>${money(remaining)}</strong></div><div class="stat"><small>سررسید نزدیک</small><strong>${faNum(active.filter(currentInstallmentDue).length)}</strong></div></div>
    <div class="card"><div class="card-head"><h2>برنامه‌های پرداخت</h2><button class="btn primary" data-add="installment">افزودن قسط</button></div><div class="item-list">${state.installments.length?state.installments.map(p=>`<div class="item installment-card"><div><div class="item-title">${escapeHtml(p.title)} • ${escapeHtml(p.provider||'')}</div><div class="amount">${money(p.installmentAmount)}</div><div class="badges"><span class="badge blue">${faNum(p.paidCount)} از ${faNum(p.count)} پرداخت</span><span class="badge ${p.status==='settled'?'green':'amber'}">${p.status==='settled'?'تسویه شده':'فعال'}</span></div><div class="item-sub">سررسید بعدی: ${toFaShort(p.nextDueDate)} • مانده ${money(Math.max(0,p.count-p.paidCount)*p.installmentAmount)}</div></div><div class="item-actions"><button class="btn primary" data-pay-installment="${p.id}">ثبت پرداخت</button><button class="btn ghost" data-delete="installment:${p.id}">حذف</button></div></div>`).join(''):'<div class="empty">هنوز قسطی ثبت نشده است.</div>'}</div></div>`;
}

function renderCustomReminders(){
  const all=(state.customReminders||[]).slice().sort((a,b)=>`${a.status==='done'?1:0}${a.date||''}${a.time||''}`.localeCompare(`${b.status==='done'?1:0}${b.date||''}${b.time||''}`));
  const active=activeCustomReminders();
  const todayCount=active.filter(r=>r.date===todayISO()).length;
  const overdue=active.filter(r=>r.date<todayISO()).length;
  const upcoming=active.filter(r=>r.date>todayISO()).length;
  $('#route-custom-reminders').innerHTML=`${pageHead('یادآور','ثبت یادآوری شخصی با انتخاب تاریخ شمسی یا میلادی')}
    <div class="grid stats reminder-stats"><div class="stat"><small>امروز</small><strong>${faNum(todayCount)}</strong></div><div class="stat"><small>عقب‌افتاده</small><strong>${faNum(overdue)}</strong></div><div class="stat"><small>پیش‌رو</small><strong>${faNum(upcoming)}</strong></div><div class="stat"><small>کل یادآورها</small><strong>${faNum(all.length)}</strong></div></div>
    <div class="card"><div class="card-head"><div><h2>یادآوری‌های من</h2><p class="item-sub">هر تاریخ در هر دو تقویم نمایش داده می‌شود.</p></div><button class="btn primary" data-add="reminder">افزودن یادآور</button></div>
      <div class="item-list">${all.length?all.map(r=>{const [status,statusClass]=reminderStatus(r);return `<div class="item reminder-item ${r.status==='done'?'done':''}"><div class="item-main"><div class="item-title">${escapeHtml(r.title)}</div>${r.notes?`<div class="item-sub reminder-note">${escapeHtml(r.notes)}</div>`:''}<div class="dual-date-view"><span><b>شمسی:</b> ${formatJalaliISO(r.date)||'—'}</span><span><b>میلادی:</b> ${formatGregorianISO(r.date)||'—'}</span><span><b>ساعت:</b> ${escapeHtml(r.time||'—')}</span></div><div class="badges"><span class="badge ${statusClass}">${status}</span><span class="badge">${repeatLabel(r.repeat)}</span><span class="badge blue">مبنای تکرار: ${calendarLabel(r.calendarType)}</span></div></div><div class="item-actions">${r.status!=='done'?`<button class="mini-btn primary" data-reminder-done="${r.id}">انجام شد</button>`:''}<button class="mini-btn" data-edit-reminder="${r.id}">ویرایش</button><button class="mini-btn" data-delete="reminder:${r.id}">حذف</button></div></div>`;}).join(''):'<div class="empty">هنوز یادآوری ثبت نشده است.</div>'}</div>
    </div>`;
}

function renderHygiene(){
  const personal=state.hygiene.filter(t=>t.category==='personal');
  const home=state.hygiene.filter(t=>t.category==='home');
  $('#route-hygiene').innerHTML=`${pageHead('بهداشت‌یار','یادآوری ساده و دوره‌ای بهداشت شخصی و نظافت منزل')}
  <div class="toolbar"><button class="btn primary" data-add="hygiene">افزودن فعالیت</button></div>
  <div class="grid layout-2"><div class="card"><h2 class="section-title">بهداشت شخصی</h2>${hygieneList(personal)}</div><div class="card"><h2 class="section-title">نظافت منزل</h2>${hygieneList(home)}</div></div>`;
}
function hygieneList(list){ return `<div class="item-list">${list.map(t=>`<div class="item"><div><div class="item-title">${escapeHtml(t.title)}</div><div class="item-sub">${t.frequency==='daily'?'هر روز':`هر ${faNum(t.interval)} روز`} • ساعت ${t.time}</div><div class="badges"><span class="badge ${dueHygiene(t)?'amber':'green'}">${dueHygiene(t)?'موعد انجام':'انجام شده'}</span></div></div><div class="item-actions"><button class="mini-btn primary" data-hygiene-done="${t.id}">انجام شد</button><button class="mini-btn" data-delete="hygiene:${t.id}">حذف</button></div></div>`).join('')}</div>`; }

function renderRoutine(){
  const book=state.books[0];
  const journalToday=state.journal.find(j=>j.date===todayISO());
  $('#route-routine').innerHTML=`${pageHead('روتین‌یار','نظم در ورزش، مطالعه، ژورنالینگ و عادت‌های شخصی')}
    <div class="toolbar"><button class="btn primary" data-add="routine">افزودن روتین</button><button class="btn ghost" data-quick="journal">ژورنال امروز</button></div>
    <div class="grid layout-2">
      <div class="card"><h2 class="section-title">روتین‌های من</h2><div class="item-list">${state.routines.map(r=>`<div class="item"><div><div class="item-title">${escapeHtml(r.title)}</div><div class="item-sub">${r.kind==='weeklyTarget'?`${faNum(r.target)} بار در هفته`:'هر روز'} • ${faNum(r.duration)} دقیقه</div><div class="badges"><span class="badge blue">${r.kind==='weeklyTarget'?`${faNum(weekLogs(r).length)} از ${faNum(r.target)}`:isDoneToday(r.logs)?'امروز انجام شد':'امروز باقی مانده'}</span></div></div><div class="item-actions"><button class="mini-btn primary" data-routine-done="${r.id}">انجام شد</button><button class="mini-btn" data-delete="routine:${r.id}">حذف</button></div></div>`).join('')}</div></div>
      <div class="grid">
        <div class="card"><div class="card-head"><h3>مطالعه کتاب</h3><button class="mini-btn" data-edit-book>ویرایش</button></div><div class="item-title">${escapeHtml(book.title)}</div><div class="item-sub">صفحه ${faNum(book.currentPage)} از ${faNum(book.totalPages||0)}</div><div class="progress" style="margin-top:12px"><span style="width:${book.totalPages?Math.min(100,book.currentPage/book.totalPages*100):0}%"></span></div></div>
        <div class="card"><div class="card-head"><h3>ژورنال امروز</h3><button class="mini-btn primary" data-quick="journal">${journalToday?'ویرایش':'نوشتن'}</button></div>${journalToday?`<div class="journal-entry"><small>${formatDateTime(journalToday.createdAt)}</small><p>${escapeHtml(journalToday.text).slice(0,180)}${journalToday.text.length>180?'…':''}</p></div>`:'<div class="empty">هنوز چیزی برای امروز ننوشته‌ای.</div>'}</div>
      </div>
    </div>`;
}

function renderSettings(){
  $('#route-settings').innerHTML=`${pageHead('تنظیمات','مدیریت اطلاعات، اعلان‌ها و نسخه پشتیبان')}
    <div class="grid layout-2"><div class="card"><h2 class="section-title">پروفایل</h2><div class="form-grid"><div class="field"><label>نام</label><input id="profileName" value="${escapeHtml(state.profile.name)}"></div><div class="field"><label>منطقه زمانی</label><select id="profileTimezone"><option value="Asia/Baku" ${state.profile.timezone==='Asia/Baku'?'selected':''}>باکو</option><option value="Asia/Tehran" ${state.profile.timezone==='Asia/Tehran'?'selected':''}>تهران</option></select></div></div><button class="btn primary" data-save-profile style="margin-top:14px">ذخیره تنظیمات</button></div>
    <div class="card"><h2 class="section-title">نصب روی گوشی</h2><p class="item-sub">برای نصب استاندارد، اپ باید از یک آدرس HTTPS باز شده باشد.</p><button class="btn primary" data-install-app>${isStandalone()?'اپ نصب شده است':'نصب روزمره‌یار'}</button><div class="divider"></div><div class="notice">اگر دکمه نصب فعال نشد، صفحه را مستقیماً در Chrome یا Safari باز کن؛ نه داخل مرورگر داخلی پیام‌رسان.</div></div>
    <div class="card"><h2 class="section-title">اعلان مرورگر</h2><p class="item-sub">در نسخه فعلی، اعلان‌ها وقتی وب‌اپ باز است یا مرورگر اجازه اجرای آن را می‌دهد بررسی می‌شوند.</p><button class="btn ${state.reminders.enabled?'secondary':'primary'}" data-enable-notifications>${state.reminders.enabled?'اعلان فعال است':'فعال‌کردن اعلان'}</button><div class="divider"></div><div class="notice">برای اعلان کاملاً پس‌زمینه، بعداً وب‌اپ را به Supabase یا سرویس Push متصل می‌کنیم.</div></div>
    <div class="card"><h2 class="section-title">تقویم</h2><div class="item"><div><div class="item-title">تقویم شمسی و میلادی فعال است</div><div class="item-sub">در ماژول یادآور می‌توانی مبنای تاریخ را انتخاب کنی و هر دو تاریخ را کنار هم ببینی.</div></div><div class="badges"><span class="badge green">شمسی</span><span class="badge blue">میلادی</span></div></div><p class="item-sub" style="margin-top:12px">تاریخ‌ها در حافظه به‌صورت استاندارد ذخیره می‌شوند تا تبدیل بین دو تقویم دقیق بماند.</p></div>
    <div class="card"><h2 class="section-title">پشتیبان‌گیری</h2><div class="toolbar"><button class="btn primary" data-export>دانلود بکاپ</button><button class="btn ghost" data-import>بازیابی بکاپ</button></div><p class="item-sub">همه اطلاعات در مرورگر همین دستگاه ذخیره می‌شوند. بکاپ JSON را در جای امن نگه دار.</p></div>
    <div class="card"><h2 class="section-title">پاک‌سازی</h2><button class="btn danger" data-reset>بازنشانی کامل برنامه</button></div></div>`;
}

function bindDynamicEvents(){
  $$('[data-route]').forEach(b=>b.onclick=()=>navigate(b.dataset.route));
  $$('[data-home-tab]').forEach(b=>b.onclick=()=>{homeTab=b.dataset.homeTab;renderHome();bindDynamicEvents();});
  $$('[data-add]').forEach(b=>b.onclick=()=>openAddModal(b.dataset.add));
  $$('[data-quick]').forEach(b=>b.onclick=()=>quickAction(b.dataset.quick));
  $$('[data-complete]').forEach(b=>b.onclick=()=>completeTaskRef(b.dataset.complete));
  $$('[data-snooze]').forEach(b=>b.onclick=()=>snoozeTaskRef(b.dataset.snooze));
  $$('[data-inv-status]').forEach(b=>b.onclick=()=>setInventoryStatus(b.dataset.invStatus));
  $$('[data-buy]').forEach(b=>b.onclick=()=>buyItem(b.dataset.buy));
  $$('[data-bill-paid]').forEach(b=>b.onclick=()=>markBillPaid(b.dataset.billPaid));
  $$('[data-bill-share]').forEach(b=>b.onclick=()=>shareBill(b.dataset.billShare));
  $$('[data-unit-pay]').forEach(b=>b.onclick=()=>unitPayment(b.dataset.unitPay));
  $$('[data-clean-done]').forEach(b=>b.onclick=()=>mutate(()=>{const c=state.building.cleaning.find(x=>x.id===b.dataset.cleanDone);c.lastDone=todayISO();},'نظافت انجام‌شده ثبت شد.'));
  $$('[data-pay-installment]').forEach(b=>b.onclick=()=>payInstallment(b.dataset.payInstallment));
  $$('[data-hygiene-done]').forEach(b=>b.onclick=()=>completeHygiene(b.dataset.hygieneDone));
  $$('[data-routine-done]').forEach(b=>b.onclick=()=>completeRoutine(b.dataset.routineDone));
  $$('[data-reminder-done]').forEach(b=>b.onclick=()=>completeCustomReminder(b.dataset.reminderDone));
  $$('[data-edit-reminder]').forEach(b=>b.onclick=()=>openReminderModal(state.customReminders.find(r=>r.id===b.dataset.editReminder)));
  $$('[data-delete]').forEach(b=>b.onclick=()=>deleteItem(b.dataset.delete));
  $('[data-edit-book]')?.addEventListener('click',editBook);
  $('[data-save-profile]')?.addEventListener('click',saveProfile);
  $('[data-install-app]')?.addEventListener('click',installApp);
  $('[data-enable-notifications]')?.addEventListener('click',enableNotifications);
  $('[data-export]')?.addEventListener('click',exportBackup);
  $('[data-import]')?.addEventListener('click',()=>$('#importInput').click());
  $('[data-reset]')?.addEventListener('click',resetApp);
}

let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  if (document.querySelector('[data-install-app]')) renderSettings();
});
window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  toast('روزمره‌یار روی دستگاه نصب شد.');
});
function isStandalone(){
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}
async function installApp(){
  if(isStandalone()){ toast('اپ از قبل نصب شده است.'); return; }
  if(deferredInstallPrompt){
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    renderSettings();
    bindDynamicEvents();
    return;
  }
  const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  toast(isiOS ? 'در منوی Share گزینه Add to Home Screen را بزن.' : 'این صفحه باید از یک آدرس HTTPS در Chrome باز شود.');
}

function completeTaskRef(ref){ const [module,id]=ref.split(':'); if(module==='hygiene') completeHygiene(id); else if(module==='routine') completeRoutine(id); else if(module==='customReminder') completeCustomReminder(id); else if(module==='inventory'){mutate(()=>{const i=state.inventory.find(x=>x.id===id);i.lastChecked=todayISO();},'بررسی موجودی ثبت شد.');} else if(module==='bill') markBillPaid(id); else if(module==='installment') payInstallment(id); }
function completeHygiene(id){ mutate(()=>{const t=state.hygiene.find(x=>x.id===id);t.lastDone=todayISO();},'انجام شد ✓'); }
function completeRoutine(id){ mutate(()=>{const r=state.routines.find(x=>x.id===id);r.logs=r.logs||[];r.logs.push({id:uid(),date:todayISO(),doneAt:nowISO(),duration:r.duration});},'روتین انجام‌شده ثبت شد.'); }
function completeCustomReminder(id){ mutate(()=>{const r=state.customReminders.find(x=>x.id===id); if(!r)return; r.history=r.history||[]; r.history.push({date:todayISO(),doneAt:nowISO()}); r.lastDone=todayISO(); if(r.repeat==='once'){r.status='done';r.completedAt=nowISO();}else{let next=nextReminderDate(r);while(next<=todayISO()){r.date=next;next=nextReminderDate(r);}r.date=next;r.status='active';}},'یادآور انجام شد.'); }
function snoozeTaskRef(ref){ const [module,id]=ref.split(':'); if(module!=='customReminder'){toast('این مورد در مراجعه بعدی دوباره نمایش داده می‌شود.');return;} mutate(()=>{const r=state.customReminders.find(x=>x.id===id);if(!r)return;const [h,m]=String(r.time||'09:00').split(':').map(Number);const d=dateFromISO(r.date||todayISO());d.setHours(h||0,m||0,0,0);d.setHours(d.getHours()+1);r.date=localISODate(d);r.time=`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;},'یادآور یک ساعت به تعویق افتاد.'); }
function setInventoryStatus(ref){ const [id,status]=ref.split(':'); mutate(()=>{const i=state.inventory.find(x=>x.id===id);i.status=status;i.lastChecked=todayISO();if(status!=='ok'&&!state.shopping.some(s=>!s.done&&s.name===i.name))state.shopping.push({id:uid(),name:i.name,qty:'',price:i.price||0,done:false,createdAt:nowISO()});},status==='ok'?'موجودی تأیید شد.':'به لیست خرید اضافه شد.'); }
function buyItem(id){
  const s=state.shopping.find(x=>x.id===id); if(!s||s.done)return;
  promptAmount(`مبلغ خرید «${s.name}»`,s.price||0,amount=>mutate(()=>{s.done=true;s.price=amount;state.expenses.push({id:uid(),title:s.name,amount,date:todayISO(),category:'خرید خانه'});const inv=state.inventory.find(i=>i.name===s.name);if(inv){inv.status='ok';inv.lastChecked=todayISO();}},'خرید و هزینه ثبت شد.'));
}
function markBillPaid(id){ mutate(()=>{const b=state.bills.find(x=>x.id===id);b.status='paid';b.paidAt=nowISO();state.expenses.push({id:uid(),title:b.title,amount:b.amount,date:todayISO(),category:'قبوض'});},'قبض پرداخت‌شده ثبت شد.'); }
function shareBill(id){ const b=state.bills.find(x=>x.id===id); const text=`سلام، ${b.title} به مبلغ ${money(b.amount)} صادر شده است. مهلت پرداخت ${toFaShort(b.dueDate)} است. لطفاً پس از پرداخت اطلاع دهید.`; navigator.clipboard?.writeText(text); toast('متن قبض کپی شد.'); }
function unitPayment(id){ promptAmount('مبلغ پرداختی واحد',0,amount=>mutate(()=>{const u=state.building.units.find(x=>x.id===id);u.balance=Math.max(0,Number(u.balance)-amount);},'پرداخت واحد ثبت شد.')); }
function payInstallment(id){ const p=state.installments.find(x=>x.id===id); if(!p||p.status==='settled')return; promptAmount(`پرداخت قسط ${p.title}`,p.installmentAmount,amount=>mutate(()=>{p.payments=p.payments||[];p.payments.push({id:uid(),amount,date:todayISO()});p.paidCount=Math.min(p.count,Number(p.paidCount)+1);state.expenses.push({id:uid(),title:`قسط ${p.title}`,amount,date:todayISO(),category:'اقساط'});const next=dateFromISO(p.nextDueDate||todayISO());next.setMonth(next.getMonth()+1);p.nextDueDate=localISODate(next);if(p.paidCount>=p.count)p.status='settled';},'پرداخت قسط ثبت شد.')); }
function deleteItem(ref){ if(!confirm('این مورد حذف شود؟'))return; const [type,id]=ref.split(':'); mutate(()=>{ if(type==='inventory')state.inventory=state.inventory.filter(x=>x.id!==id); if(type==='shopping')state.shopping=state.shopping.filter(x=>x.id!==id); if(type==='bill')state.bills=state.bills.filter(x=>x.id!==id); if(type==='expense')state.expenses=state.expenses.filter(x=>x.id!==id); if(type==='installment')state.installments=state.installments.filter(x=>x.id!==id); if(type==='hygiene')state.hygiene=state.hygiene.filter(x=>x.id!==id); if(type==='routine')state.routines=state.routines.filter(x=>x.id!==id); if(type==='reminder')state.customReminders=state.customReminders.filter(x=>x.id!==id);},'حذف شد.'); }

function quickAction(type){ if(type==='inventory'){homeTab='shopping';navigate('home');setTimeout(()=>openAddModal('shopping'),50);} else if(type==='expense')openAddModal('expense'); else if(type==='installment'){navigate('installments');setTimeout(()=>openAddModal('installment'),50);} else if(type==='journal')openJournal(); else if(type==='reminder'){navigate('custom-reminders');setTimeout(()=>openReminderModal(),50);} }
function openAddModal(type){
  if(type==='reminder'){openReminderModal();return;}
  const forms={
    inventory:{title:'افزودن قلم موجودی',html:`${field('name','نام کالا')}${selectField('cycle','دوره بررسی',[['daily','روزانه'],['weekly','هفتگی'],['monthly','ماهانه'],['3','هر ۳ روز'],['14','هر ۱۴ روز']])}${selectField('status','وضعیت',[['ok','موجود'],['low','رو به اتمام'],['out','تمام‌شده']])}`},
    shopping:{title:'افزودن به لیست خرید',html:`${field('name','نام کالا')}${field('qty','مقدار یا تعداد')}${field('price','قیمت تقریبی','number')}`},
    expense:{title:'ثبت هزینه',html:`${field('title','عنوان هزینه')}${field('amount','مبلغ','number')}${selectField('category','دسته‌بندی',[['مواد غذایی','مواد غذایی'],['قبوض','قبوض'],['ساختمان','ساختمان'],['اقساط','اقساط'],['سایر','سایر']])}${jalaliDateField('date','تاریخ',todayISO())}`},
    bill:{title:'ثبت قبض',html:`${field('title','عنوان قبض')}${field('amount','مبلغ','number')}${jalaliDateField('dueDate','تاریخ سررسید')}${selectField('owner','مسئول پرداخت',[['خودم','خودم'],['مستأجر','مستأجر'],['مشترک','مشترک']])}${selectField('tenant','برای مستأجر ارسال می‌شود؟',[['','خیر'],['yes','بله']])}`},
    charge:{title:'ثبت شارژ ساختمان',html:`${field('amount','مبلغ شارژ هر واحد','number')}${field('title','عنوان دوره','text','شارژ ماهانه')}`},
    cleaning:{title:'برنامه نظافت',html:`${field('title','عنوان کار')}${field('interval','تکرار هر چند روز','number','30')}${field('cost','هزینه تقریبی','number','0')}`},
    installment:{title:'افزودن قسط',html:`${field('title','عنوان قسط')}${field('provider','بانک یا سرویس')}${selectField('type','نوع',[['bank','بانکی'],['bnpl','BNPL'],['purchase','خرید اقساطی'],['subscription','اشتراک']])}${field('installmentAmount','مبلغ هر قسط','number')}${field('count','تعداد کل اقساط','number')}${field('paidCount','تعداد پرداخت‌شده','number','0')}${jalaliDateField('nextDueDate','سررسید بعدی')}`},
    hygiene:{title:'افزودن فعالیت بهداشت‌یار',html:`${field('title','عنوان فعالیت')}${selectField('category','دسته',[['personal','بهداشت شخصی'],['home','نظافت منزل']])}${selectField('frequency','تکرار',[['daily','روزانه'],['interval','هر چند روز']])}${field('interval','فاصله روزها','number','1')}${field('time','ساعت یادآوری','time','20:00')}`},
    routine:{title:'افزودن روتین',html:`${field('title','عنوان روتین')}${selectField('kind','نوع',[['daily','روزانه'],['weeklyTarget','چند بار در هفته']])}${field('target','تعداد هدف هفتگی','number','1')}${field('duration','مدت هدف به دقیقه','number','30')}${field('time','ساعت یادآوری','time','20:00')}`}
  };
  const cfg=forms[type]; if(!cfg)return;
  openModal(cfg.title,cfg.html,values=>{
    if(type==='inventory')state.inventory.push({id:uid(),name:values.name,cycle:values.cycle,status:values.status,lastChecked:null,price:0});
    if(type==='shopping')state.shopping.push({id:uid(),name:values.name,qty:values.qty,price:Number(values.price||0),done:false,createdAt:nowISO()});
    if(type==='expense')state.expenses.push({id:uid(),title:values.title,amount:Number(values.amount||0),category:values.category,date:values.date||todayISO()});
    if(type==='bill')state.bills.push({id:uid(),title:values.title,amount:Number(values.amount||0),dueDate:values.dueDate,owner:values.owner,tenant:values.tenant==='yes',status:'unpaid'});
    if(type==='charge'){state.building.units.forEach(u=>u.balance=Number(u.balance)+Number(values.amount||0));state.building.charges.push({id:uid(),title:values.title,amount:Number(values.amount||0),date:todayISO()});}
    if(type==='cleaning')state.building.cleaning.push({id:uid(),title:values.title,interval:Number(values.interval||30),cost:Number(values.cost||0),lastDone:null,active:true});
    if(type==='installment')state.installments.push({id:uid(),title:values.title,provider:values.provider,type:values.type,installmentAmount:Number(values.installmentAmount||0),count:Number(values.count||1),paidCount:Number(values.paidCount||0),nextDueDate:values.nextDueDate,status:Number(values.paidCount||0)>=Number(values.count||1)?'settled':'active',payments:[]});
    if(type==='hygiene')state.hygiene.push({id:uid(),title:values.title,category:values.category,frequency:values.frequency,interval:Number(values.interval||1),time:values.time,lastDone:null,active:true});
    if(type==='routine')state.routines.push({id:uid(),title:values.title,kind:values.kind,target:Number(values.target||1),duration:Number(values.duration||30),time:values.time,active:true,logs:[]});
  });
}
function field(name,label,type='text',value=''){ return `<div class="field"><label>${label}</label><input name="${name}" type="${type}" value="${escapeHtml(value)}" ${['name','title','amount','installmentAmount'].includes(name)?'required':''}></div>`; }
function jalaliDateField(name,label,value=''){
  const view=isoToJalali(value||todayISO())||isoToJalali(todayISO());
  return `<div class="field jalali-field" data-jalali-field data-view-jy="${view.jy}" data-view-jm="${view.jm}">
    <label>${label} <span class="calendar-label">شمسی</span></label>
    <div class="jalali-input-wrap">
      <input type="text" class="jalali-display" data-jalali-display inputmode="numeric" placeholder="۱۴۰۵/۰۴/۲۷" value="${escapeHtml(formatJalaliISO(value))}" autocomplete="off">
      <input type="hidden" name="${name}" value="${escapeHtml(value)}" data-jalali-value>
      <button type="button" class="calendar-btn" data-jalali-toggle aria-label="بازکردن تقویم شمسی">تقویم</button>
    </div>
    <div class="jalali-calendar hidden" data-jalali-calendar></div>
  </div>`;
}
function selectField(name,label,options,selected=''){ return `<div class="field"><label>${label}</label><select name="${name}">${options.map(([v,l])=>`<option value="${v}" ${String(v)===String(selected)?'selected':''}>${l}</option>`).join('')}</select></div>`; }
function textareaField(name,label,value=''){ return `<div class="field full"><label>${label}</label><textarea name="${name}">${escapeHtml(value)}</textarea></div>`; }
function dualCalendarDateField(name,label,value=todayISO(),mode='jalali'){
  const view=isoToJalali(value||todayISO())||isoToJalali(todayISO());
  return `<div class="field full dual-date-field" data-dual-date-field data-mode="${mode}"><label>${label}</label><div class="calendar-mode-switch"><button type="button" data-calendar-mode="jalali" class="${mode==='jalali'?'active':''}">تقویم شمسی</button><button type="button" data-calendar-mode="gregorian" class="${mode==='gregorian'?'active':''}">تقویم میلادی</button></div><input type="hidden" name="${name}" value="${escapeHtml(value)}" data-dual-date-value><input type="hidden" name="calendarType" value="${mode}" data-calendar-mode-value><div data-calendar-panel="jalali" class="${mode==='jalali'?'':'hidden'}"><div class="jalali-field" data-jalali-field data-view-jy="${view.jy}" data-view-jm="${view.jm}"><div class="jalali-input-wrap"><input type="text" class="jalali-display" data-jalali-display inputmode="numeric" placeholder="۱۴۰۵/۰۴/۲۷" value="${escapeHtml(formatJalaliISO(value))}" autocomplete="off"><input type="hidden" value="${escapeHtml(value)}" data-jalali-value><button type="button" class="calendar-btn" data-jalali-toggle>تقویم</button></div><div class="jalali-calendar hidden" data-jalali-calendar></div></div></div><div data-calendar-panel="gregorian" class="${mode==='gregorian'?'':'hidden'}"><input type="date" class="gregorian-date-input" data-gregorian-display value="${escapeHtml(value)}"></div><div class="dual-date-preview" data-dual-date-preview></div></div>`;
}
function updateDualDatePreview(wrapper,iso){ const el=$('[data-dual-date-preview]',wrapper);el.innerHTML=iso?`<span>شمسی: <b>${formatJalaliISO(iso)}</b></span><span>میلادی: <b>${formatGregorianISO(iso)}</b></span>`:'تاریخی انتخاب نشده است.'; }
function syncDualDateField(wrapper,showError=true){ const mode=wrapper.dataset.mode;let iso='';if(mode==='jalali'){const jf=$('[data-jalali-field]',wrapper);if(!syncJalaliField(jf,showError))return false;iso=$('[data-jalali-value]',jf).value;}else{iso=$('[data-gregorian-display]',wrapper).value;if(!iso&&showError){$('[data-gregorian-display]',wrapper).reportValidity();return false;}}if(!iso)return false;$('[data-dual-date-value]',wrapper).value=iso;$('[data-calendar-mode-value]',wrapper).value=mode;const g=$('[data-gregorian-display]',wrapper);g.value=iso;const jf=$('[data-jalali-field]',wrapper);const j=isoToJalali(iso);$('[data-jalali-value]',jf).value=iso;$('[data-jalali-display]',jf).value=formatJalaliISO(iso);jf.dataset.viewJy=String(j.jy);jf.dataset.viewJm=String(j.jm);updateDualDatePreview(wrapper,iso);return true; }
function initDualDateFields(root){ $$('[data-dual-date-field]',root).forEach(wrapper=>{const choose=mode=>{syncDualDateField(wrapper,false);wrapper.dataset.mode=mode;$('[data-calendar-mode-value]',wrapper).value=mode;$$('[data-calendar-mode]',wrapper).forEach(b=>b.classList.toggle('active',b.dataset.calendarMode===mode));$$('[data-calendar-panel]',wrapper).forEach(p=>p.classList.toggle('hidden',p.dataset.calendarPanel!==mode));};$$('[data-calendar-mode]',wrapper).forEach(b=>b.onclick=()=>choose(b.dataset.calendarMode));$('[data-gregorian-display]',wrapper).onchange=()=>{const iso=$('[data-gregorian-display]',wrapper).value;if(iso){$('[data-dual-date-value]',wrapper).value=iso;updateDualDatePreview(wrapper,iso);}};updateDualDatePreview(wrapper,$('[data-dual-date-value]',wrapper).value);}); }
function syncAllDualDateFields(root){let valid=true;$$('[data-dual-date-field]',root).forEach(w=>{if(!syncDualDateField(w,false))valid=false;});if(!valid)toast('تاریخ یادآوری را انتخاب کن.');return valid;}
function syncJalaliField(field,showError=true){
  const display=$('[data-jalali-display]',field);
  const hidden=$('[data-jalali-value]',field);
  const text=display.value.trim();
  if(!text){ hidden.value=''; display.setCustomValidity(''); return true; }
  const parsed=parseJalaliText(text);
  if(!parsed){ hidden.value=''; display.setCustomValidity('تاریخ شمسی معتبر را به شکل ۱۴۰۵/۰۴/۲۷ وارد کن.'); if(showError)display.reportValidity(); return false; }
  hidden.value=parsed.iso;
  display.value=formatJalaliISO(parsed.iso);
  display.setCustomValidity('');
  field.dataset.viewJy=String(parsed.jy); field.dataset.viewJm=String(parsed.jm);
  return true;
}
function syncAllJalaliFields(root){
  let valid=true;
  $$('[data-jalali-field]',root).forEach(field=>{ if(!syncJalaliField(field,false))valid=false; });
  if(!valid) $('[data-jalali-display]:invalid',root)?.reportValidity();
  return valid;
}
function renderJalaliCalendar(field){
  const panel=$('[data-jalali-calendar]',field);
  const jy=Number(field.dataset.viewJy); const jm=Number(field.dataset.viewJm);
  const selectedISO=$('[data-jalali-value]',field).value;
  const selected=selectedISO?isoToJalali(selectedISO):null;
  const today=isoToJalali(todayISO());
  const firstISO=jalaliToISO(jy,jm,1);
  const firstDate=dateFromISO(firstISO);
  const offset=(firstDate.getDay()+1)%7;
  const count=jalaliMonthLength(jy,jm);
  const cells=[];
  for(let i=0;i<offset;i++)cells.push('<span class="jcal-empty"></span>');
  for(let day=1;day<=count;day++){
    const isSelected=selected&&selected.jy===jy&&selected.jm===jm&&selected.jd===day;
    const isToday=today&&today.jy===jy&&today.jm===jm&&today.jd===day;
    cells.push(`<button type="button" class="jcal-day ${isSelected?'selected':''} ${isToday?'today':''}" data-jcal-day="${day}">${toPersianDigits(day)}</button>`);
  }
  panel.innerHTML=`<div class="jcal-head"><button type="button" data-jcal-nav="-1" aria-label="ماه قبل">›</button><strong>${PERSIAN_MONTHS[jm-1]} ${toPersianDigits(jy)}</strong><button type="button" data-jcal-nav="1" aria-label="ماه بعد">‹</button></div><div class="jcal-weekdays">${PERSIAN_WEEKDAYS.map(d=>`<span>${d}</span>`).join('')}</div><div class="jcal-grid">${cells.join('')}</div><div class="jcal-footer"><button type="button" class="mini-btn" data-jcal-today>امروز</button><button type="button" class="mini-btn" data-jcal-clear>پاک‌کردن</button></div>`;
  $$('[data-jcal-nav]',panel).forEach(btn=>btn.onclick=()=>{
    let y=jy,m=jm+Number(btn.dataset.jcalNav);
    if(m<1){m=12;y--;} if(m>12){m=1;y++;}
    field.dataset.viewJy=String(y);field.dataset.viewJm=String(m);renderJalaliCalendar(field);
  });
  $$('[data-jcal-day]',panel).forEach(btn=>btn.onclick=()=>{
    const iso=jalaliToISO(jy,jm,Number(btn.dataset.jcalDay));
    $('[data-jalali-value]',field).value=iso;
    $('[data-jalali-display]',field).value=formatJalaliISO(iso);
    $('[data-jalali-display]',field).setCustomValidity('');
    panel.classList.add('hidden');
  });
  $('[data-jcal-today]',panel).onclick=()=>{
    const iso=todayISO(); const j=isoToJalali(iso);
    $('[data-jalali-value]',field).value=iso;$('[data-jalali-display]',field).value=formatJalaliISO(iso);
    field.dataset.viewJy=String(j.jy);field.dataset.viewJm=String(j.jm);panel.classList.add('hidden');
  };
  $('[data-jcal-clear]',panel).onclick=()=>{ $('[data-jalali-value]',field).value='';$('[data-jalali-display]',field).value='';panel.classList.add('hidden'); };
}
function initJalaliFields(root){
  $$('[data-jalali-field]',root).forEach(field=>{
    const panel=$('[data-jalali-calendar]',field);
    $('[data-jalali-toggle]',field).onclick=()=>{ $$('.jalali-calendar',root).forEach(p=>{if(p!==panel)p.classList.add('hidden');}); panel.classList.toggle('hidden'); if(!panel.classList.contains('hidden'))renderJalaliCalendar(field); };
    const display=$('[data-jalali-display]',field);
    display.onblur=()=>syncJalaliField(field,false);
    display.oninput=()=>display.setCustomValidity('');
  });
}
function openModal(title,html,onSubmit){
  const modal=$('#modal'); $('#modalTitle').textContent=title; $('#modalBody').innerHTML=`<div class="form-grid">${html}</div>`; initJalaliFields($('#modalBody')); initDualDateFields($('#modalBody')); modal.showModal();
  const form=$('#modalForm'); const handler=e=>{ if(e.submitter?.value==='cancel'){form.removeEventListener('submit',handler);return;} e.preventDefault(); if(!syncAllDualDateFields(form))return; if(!syncAllJalaliFields(form))return; const fd=new FormData(form); const values=Object.fromEntries(fd.entries()); if(!form.reportValidity())return; onSubmit(values); saveState(); modal.close(); render(); toast('ذخیره شد.'); form.removeEventListener('submit',handler); };
  form.addEventListener('submit',handler);
}
function openReminderModal(reminder=null){
  const r=reminder||{title:'',notes:'',date:todayISO(),time:'09:00',repeat:'once',calendarType:'jalali'};
  const html=`${field('title','عنوان یادآوری','text',r.title)}${field('time','ساعت یادآوری','time',r.time||'09:00')}${selectField('repeat','تکرار',[['once','بدون تکرار'],['daily','روزانه'],['weekly','هفتگی'],['monthly','ماهانه'],['yearly','سالانه']],r.repeat||'once')}${dualCalendarDateField('date','تاریخ یادآوری',r.date||todayISO(),r.calendarType||'jalali')}${textareaField('notes','توضیحات',r.notes||'')}`;
  openModal(reminder?'ویرایش یادآور':'افزودن یادآور',html,values=>{if(reminder){Object.assign(reminder,{title:values.title.trim(),notes:values.notes.trim(),date:values.date,time:values.time,repeat:values.repeat,calendarType:values.calendarType,status:'active',active:true,updatedAt:nowISO()});}else{state.customReminders=state.customReminders||[];state.customReminders.push({id:uid(),title:values.title.trim(),notes:values.notes.trim(),date:values.date,time:values.time,repeat:values.repeat,calendarType:values.calendarType,status:'active',active:true,history:[],createdAt:nowISO()});}});
}
function promptAmount(title,defaultValue,cb){ openModal(title,field('amount','مبلغ','number',defaultValue),v=>cb(Number(v.amount||0))); }
function openJournal(){ const existing=state.journal.find(j=>j.date===todayISO()); openModal('ژورنال امروز',`<div class="field full"><label>متن امروز</label><textarea name="text" required>${escapeHtml(existing?.text||'')}</textarea></div>`,v=>{ if(existing){existing.text=v.text;existing.updatedAt=nowISO();}else state.journal.push({id:uid(),date:todayISO(),text:v.text,createdAt:nowISO()}); }); }
function editBook(){ const b=state.books[0]; openModal('کتاب فعلی',`${field('title','نام کتاب','text',b.title)}${field('currentPage','صفحه فعلی','number',b.currentPage)}${field('totalPages','تعداد کل صفحات','number',b.totalPages)}`,v=>{b.title=v.title;b.currentPage=Number(v.currentPage||0);b.totalPages=Number(v.totalPages||0);}); }
function saveProfile(){ mutate(()=>{state.profile.name=$('#profileName').value.trim()||'امیر';state.profile.timezone=$('#profileTimezone').value;},'تنظیمات ذخیره شد.'); }

async function enableNotifications(){
  if(!('Notification' in window)){toast('مرورگر شما اعلان را پشتیبانی نمی‌کند.');return;}
  const result=await Notification.requestPermission();
  mutate(()=>state.reminders.enabled=result==='granted',result==='granted'?'اعلان فعال شد.':'مجوز اعلان داده نشد.');
}
function checkNotifications(){
  if(!state.reminders.enabled || Notification.permission!=='granted')return;
  const now=new Date(); const hhmm=now.toTimeString().slice(0,5); const tasks=[];
  state.hygiene.filter(t=>dueHygiene(t)&&t.time===hhmm).forEach(t=>tasks.push(t.title));
  state.routines.filter(r=>dueRoutine(r)&&r.time===hhmm).forEach(r=>tasks.push(r.title));
  activeCustomReminders().filter(r=>r.date===todayISO()&&r.time===hhmm).forEach(r=>tasks.push(r.title));
  if(!tasks.length)return;
  const key=`${todayISO()}_${hhmm}_${tasks.join('|')}`; if(state.reminders.lastSent[key])return;
  const title='روزمره‌یار'; const body=tasks.join(' • ');
  if(navigator.serviceWorker?.controller)navigator.serviceWorker.ready.then(reg=>reg.showNotification(title,{body,icon:'icons/icon-192.png'})); else new Notification(title,{body});
  state.reminders.lastSent[key]=nowISO();saveState();
}
function exportBackup(){ const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`roozmarre-backup-${todayISO()}.json`;a.click();URL.revokeObjectURL(url); }
$('#importInput').addEventListener('change',async e=>{ const file=e.target.files[0];if(!file)return;try{state=JSON.parse(await file.text());saveState();render();toast('بکاپ بازیابی شد.');}catch{toast('فایل بکاپ معتبر نیست.');}e.target.value='';});
function resetApp(){ if(confirm('همه اطلاعات پاک و برنامه به حالت اولیه برگردد؟')){state=initialState();saveState();render();toast('برنامه بازنشانی شد.');} }

let serviceWorkerRefreshing=false;
if('serviceWorker' in navigator){
  navigator.serviceWorker.addEventListener('controllerchange',()=>{ if(serviceWorkerRefreshing)return; serviceWorkerRefreshing=true; window.location.reload(); });
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.error));
}
setInterval(checkNotifications,30000);
render();

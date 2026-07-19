'use strict';

/*
 * اقدام‌یار V6
 * لایه ضد اهمال برای روزمره‌یار؛ کاملاً محلی و سازگار با معماری فعلی.
 */

const ACTION_REASONS = {
  forgot:'فراموش کردم',
  unclear:'کار مبهم بود',
  large:'کار بیش از حد بزرگ بود',
  energy:'انرژی نداشتم',
  wrongTime:'زمان مناسب نبود',
  anxiety:'اضطراب یا مقاومت داشتم',
  tools:'ابزار یا اطلاعات نداشتم',
  money:'امکان مالی نداشتم',
  other:'دلیل دیگر'
};
const ACTION_PRIORITIES = {critical:'حیاتی',important:'مهم',light:'سبک'};
const ACTION_ENERGIES = {low:'کم',medium:'متوسط',high:'زیاد'};
let actionTab='tasks';
let activeFocus=null;
let focusTimer=null;

function ensureActionState(){
  const defaults={
    tasks:[],inbox:[],deferLogs:[],focusSessions:[],thoughtParking:[],reviews:[],
    dailyPlans:{},snoozes:{},
    settings:{morningTime:'08:30',eveningTime:'22:30',defaultFocusMinutes:10}
  };
  state.action={...defaults,...(state.action||{}),settings:{...defaults.settings,...(state.action?.settings||{})}};
  ['tasks','inbox','deferLogs','focusSessions','thoughtParking','reviews'].forEach(k=>{if(!Array.isArray(state.action[k]))state.action[k]=[];});
  if(!state.action.dailyPlans||typeof state.action.dailyPlans!=='object')state.action.dailyPlans={};
  if(!state.action.snoozes||typeof state.action.snoozes!=='object')state.action.snoozes={};
  state.action.tasks=state.action.tasks.map(t=>({
    priority:'important',energy:'medium',estimateMinutes:15,actualMinutes:0,
    dueDate:todayISO(),time:'18:00',firstStep:'',minimumStep:'',ifTrigger:'',ifAction:'',
    status:'open',waitingOn:'',followUpDate:'',active:true,logs:[],deferCount:0,...t,
    logs:Array.isArray(t.logs)?t.logs:[]
  }));
  state.routines=state.routines.map(r=>({
    minimumTitle:r.minimumTitle||`فقط ${Math.min(5,Number(r.duration||5))} دقیقه شروع کن`,
    minimumDuration:Number(r.minimumDuration||Math.min(5,Number(r.duration||5))),
    firstStep:r.firstStep||'',ifTrigger:r.ifTrigger||'',ifAction:r.ifAction||'',...r
  }));
}

function todayPlan(date=todayISO()){
  ensureActionState();
  if(!state.action.dailyPlans[date])state.action.dailyPlans[date]={energy:'medium',critical:'',important:'',light:'',mustRemember:'',crisis:false,morningDone:false,eveningDone:false};
  return state.action.dailyPlans[date];
}
function refOf(module,id){return `${module}:${id}`;}
function splitRef(ref){const idx=String(ref||'').indexOf(':');return idx<0?[ref,'']:[ref.slice(0,idx),ref.slice(idx+1)];}
function nowMinutes(){const d=new Date();return d.getHours()*60+d.getMinutes();}
function hhmmMinutes(value='00:00'){const [h,m]=String(value).split(':').map(Number);return (h||0)*60+(m||0);}
function isSnoozed(ref){
  const s=state.action.snoozes?.[ref];if(!s)return false;
  if(s.untilDate>todayISO())return true;
  if(s.untilDate===todayISO()&&hhmmMinutes(s.untilTime||'23:59')>nowMinutes())return true;
  return false;
}
function clearRefMeta(ref){
  delete state.action.snoozes[ref];
  Object.values(state.action.dailyPlans||{}).forEach(p=>['critical','important','light'].forEach(k=>{if(p[k]===ref)p[k]='';}));
}
function prioritySlotForRef(ref,date=todayISO()){
  const p=todayPlan(date);return ['critical','important','light'].find(k=>p[k]===ref)||'';
}
function slotLabel(slot){return ACTION_PRIORITIES[slot]||'';}
function energyLabel(value){return ACTION_ENERGIES[value]||'متوسط';}
function reasonLabel(value){return ACTION_REASONS[value]||value||'ثبت نشده';}

function actionTaskDue(t){
  if(t.active===false||t.status==='done')return false;
  if(t.status==='waiting')return !!t.followUpDate&&t.followUpDate<=todayISO();
  return !!t.dueDate&&t.dueDate<=todayISO();
}
function actionTaskMeta(t){
  const due=t.status==='waiting'?t.followUpDate:t.dueDate;
  const bits=[t.status==='waiting'?`منتظر ${t.waitingOn||'دیگران'}`:'اقدام‌یار',due?`موعد ${formatJalaliISO(due)}`:'بدون موعد',`${t.estimateMinutes||15} دقیقه`,`انرژی ${energyLabel(t.energy)}`];
  return bits.join(' • ');
}
function actionTaskAsDashboard(t){return {id:t.id,module:'action',title:t.status==='waiting'?`پیگیری: ${t.title}`:t.title,meta:actionTaskMeta(t),done:false};}

const baseDashboardTasksV5=dashboardTasks;
dashboardTasks=function(){
  ensureActionState();
  const base=baseDashboardTasksV5();
  const extras=state.action.tasks.filter(actionTaskDue).map(actionTaskAsDashboard);
  let items=[...extras,...base].filter(t=>!isSnoozed(refOf(t.module,t.id)));
  const plan=todayPlan();
  const order={critical:0,important:1,light:2};
  items.sort((a,b)=>{
    const sa=prioritySlotForRef(refOf(a.module,a.id)),sb=prioritySlotForRef(refOf(b.module,b.id));
    if(sa||sb)return (order[sa]??9)-(order[sb]??9);
    return a.module==='action'?-1:b.module==='action'?1:0;
  });
  if(plan.crisis){
    const refs=[plan.critical,plan.important,plan.light].filter(Boolean);
    items=refs.map(r=>items.find(t=>refOf(t.module,t.id)===r)).filter(Boolean);
  }
  return items;
};

function resolveTaskRef(ref){
  const [module,id]=splitRef(ref);
  if(module==='action'){
    const t=state.action.tasks.find(x=>x.id===id);if(!t)return null;
    return {ref,module,id,title:t.title,notes:t.notes||'',firstStep:t.firstStep||t.minimumStep||'فقط فایل، وسیله یا صفحه مربوط را باز کن.',minimumStep:t.minimumStep||'فقط پنج دقیقه شروع کن.',estimate:Number(t.estimateMinutes||15),energy:t.energy||'medium',priority:t.priority||'important',time:t.time||'18:00',raw:t};
  }
  if(module==='hygiene'){
    const t=state.hygiene.find(x=>x.id===id);return t?{ref,module,id,title:t.title,firstStep:'وسایل لازم را بردار و فقط همین کار را شروع کن.',minimumStep:'نسخه خیلی کوچک: فقط یک دقیقه شروع کن.',estimate:5,energy:'low',priority:'light',time:t.time||'20:00',raw:t}:null;
  }
  if(module==='routine'){
    const r=state.routines.find(x=>x.id===id);return r?{ref,module,id,title:r.title,firstStep:r.firstStep||r.minimumTitle||'لباس یا وسیله لازم را آماده کن.',minimumStep:r.minimumTitle||`فقط ${r.minimumDuration||5} دقیقه انجام بده.`,estimate:Number(r.duration||30),energy:Number(r.duration||30)>40?'high':'medium',priority:'important',time:r.time||'20:00',raw:r}:null;
  }
  if(module==='inventory'){
    const i=state.inventory.find(x=>x.id===id);return i?{ref,module,id,title:`بررسی موجودی ${i.name}`,firstStep:`همین حالا محل نگهداری ${i.name} را نگاه کن.`,minimumStep:`فقط وضعیت ${i.name} را مشخص کن.`,estimate:2,energy:'low',priority:'light',time:i.time||'09:00',raw:i}:null;
  }
  if(module==='bill'){
    const b=state.bills.find(x=>x.id===id);return b?{ref,module,id,title:b.title,firstStep:'اپ بانک یا اطلاعات قبض را باز کن.',minimumStep:'فقط شناسه و مبلغ قبض را بررسی کن.',estimate:8,energy:'medium',priority:'critical',time:b.time||'09:00',raw:b}:null;
  }
  if(module==='installment'){
    const p=state.installments.find(x=>x.id===id);return p?{ref,module,id,title:`قسط ${p.title}`,firstStep:'اپ بانک یا سرویس پرداخت را باز کن.',minimumStep:'فقط موجودی حساب و مبلغ قسط را بررسی کن.',estimate:8,energy:'medium',priority:'critical',time:p.time||'09:00',raw:p}:null;
  }
  if(module==='customReminder'){
    const r=state.customReminders.find(x=>x.id===id);return r?{ref,module,id,title:r.title,notes:r.notes||'',firstStep:r.notes||'اولین حرکت فیزیکی مرتبط با این یادآوری را انجام بده.',minimumStep:'فقط دو دقیقه به آن بپرداز.',estimate:10,energy:'medium',priority:'important',time:r.time||'09:00',raw:r}:null;
  }
  return null;
}

function allCandidateRefs(){
  const refs=[];
  state.action.tasks.filter(t=>t.active!==false&&t.status!=='done').forEach(t=>refs.push(refOf('action',t.id)));
  baseDashboardTasksV5().forEach(t=>refs.push(refOf(t.module,t.id)));
  return [...new Set(refs)].filter(r=>resolveTaskRef(r)&&!isSnoozed(r));
}
function scoreRef(ref){
  const info=resolveTaskRef(ref);if(!info)return -9999;
  const slot=prioritySlotForRef(ref);let score=slot==='critical'?140:slot==='important'?105:slot==='light'?75:0;
  score+=info.priority==='critical'?65:info.priority==='important'?35:15;
  const plan=todayPlan();if(info.energy===plan.energy)score+=25;
  if(info.estimate<=10)score+=12;
  if(info.module==='action'){
    const t=info.raw;const due=t.status==='waiting'?t.followUpDate:t.dueDate;
    if(due&&due<todayISO())score+=70+Math.min(30,Math.abs(daysBetween(due,todayISO()))*3);
    else if(due===todayISO())score+=40;
    score+=Math.min(30,Number(t.deferCount||0)*5);
  }
  return score;
}
function chooseOneTask(){return allCandidateRefs().sort((a,b)=>scoreRef(b)-scoreRef(a))[0]||'';}

const baseBuildNotificationScheduleV5=buildNotificationSchedule;
buildNotificationSchedule=function(){
  ensureActionState();
  const entries=baseBuildNotificationScheduleV5();
  state.action.tasks.filter(t=>t.active!==false&&t.status!=='done').forEach(t=>{
    const dueDate=t.status==='waiting'?t.followUpDate:t.dueDate;
    if(!dueDate)return;
    entries.push({id:`action:${t.id}`,title:t.status==='waiting'?`زمان پیگیری ${t.title}`:t.title,body:t.firstStep||t.minimumStep||'فقط اولین قدم را شروع کن.',dueDate,time:t.time||'18:00',route:'action'});
  });
  entries.push({id:'action:morning-review',title:'مرور یک‌دقیقه‌ای صبح',body:'انرژی امروز و سه تعهد اصلی را مشخص کن.',dueDate:todayISO(),time:state.action.settings.morningTime||'08:30',route:'action'});
  entries.push({id:'action:evening-review',title:'بستن کوتاه روز',body:'کارهای باقی‌مانده را آگاهانه منتقل، کوچک یا حذف کن.',dueDate:todayISO(),time:state.action.settings.eveningTime||'22:30',route:'action'});
  return entries;
};

const baseTaskRowV5=taskRow;
taskRow=function(t){
  const ref=refOf(t.module,t.id);const slot=prioritySlotForRef(ref);
  return `<div class="task-row ${slot?`priority-${slot}`:''}" data-task="${ref}"><button class="task-check" data-complete="${ref}" aria-label="انجام شد"></button><div><div class="task-title">${escapeHtml(t.title)} ${slot?`<span class="badge ${slot==='critical'?'red':slot==='important'?'amber':'blue'}">${slotLabel(slot)}</span>`:''}</div><div class="task-meta">${escapeHtml(t.meta)}</div></div><div class="task-actions"><button class="mini-btn primary" data-start-task="${ref}">فقط شروعش کن</button><button class="mini-btn" data-plan-task="${ref}">امروز</button><button class="mini-btn" data-snooze="${ref}">بعداً</button><button class="mini-btn" data-complete="${ref}">انجام شد</button></div></div>`;
};

const baseRenderDashboardV5=renderDashboard;
renderDashboard=function(){
  ensureActionState();baseRenderDashboardV5();
  const route=$('#route-dashboard');if(!route)return;
  const plan=todayPlan();
  const head=$('.page-head',route);
  head?.insertAdjacentHTML('afterend',renderActionCockpit());
  const grid=$('.module-grid',route);
  grid?.insertAdjacentHTML('afterbegin',moduleCard('اقدام‌یار','تخلیه ذهن، شروع کار و تمرکز',state.action.tasks.filter(t=>t.status!=='done').length,'کار فعال','action'));
  const quick=$('.quick-grid',route);
  quick?.insertAdjacentHTML('afterbegin',`<button class="quick-card action-accent" data-action-command="capture"><b>تخلیه ذهن</b><span>هرچه در ذهن داری سریع ثبت کن</span></button><button class="quick-card" data-action-command="one"><b>الان فقط یک کار بده</b><span>انتخاب خودکار و شروع ساده</span></button><button class="quick-card" data-action-command="new-task"><b>کار جدید</b><span>با اولین قدم و نسخه کوچک</span></button><button class="quick-card" data-action-command="morning"><b>مرور صبح</b><span>انرژی و سه تعهد امروز</span></button>`);
};
function renderActionCockpit(){
  const p=todayPlan();
  const slots=['critical','important','light'].map(slot=>{
    const info=resolveTaskRef(p[slot]);return `<div class="top-task ${slot}"><small>${slotLabel(slot)}</small>${info?`<b>${escapeHtml(info.title)}</b><button class="mini-btn" data-start-task="${info.ref}">شروع</button>`:'<b>انتخاب نشده</b><button class="mini-btn" data-action-command="plan">انتخاب</button>'}</div>`;
  }).join('');
  return `<div class="action-cockpit card ${p.crisis?'crisis':''}"><div class="action-cockpit-head"><div><div class="eyebrow">اقدام‌یار</div><h2>${p.crisis?'حالت روز شلوغ فعال است':'ذهن خلوت، فقط قدم بعدی'}</h2><p>${p.crisis?'امروز فقط سه مورد ضروری نشان داده می‌شود.':'لازم نیست همه‌چیز را یکجا حل کنی.'}</p></div><div class="energy-picker"><span>انرژی امروز</span>${Object.entries(ACTION_ENERGIES).map(([k,l])=>`<button class="${p.energy===k?'active':''}" data-set-energy="${k}">${l}</button>`).join('')}</div></div><div class="action-primary-row"><button class="btn primary action-big" data-action-command="one">الان فقط یک کار بده</button><button class="btn secondary" data-action-command="capture">تخلیه ذهن</button><button class="btn ghost" data-action-command="focus-last">ادامه تمرکز</button><button class="btn ${p.crisis?'ghost':'danger'}" data-action-command="crisis">${p.crisis?'خروج از حالت شلوغ':'امروز از کنترل خارج شده'}</button></div><div class="top-three">${slots}</div>${p.mustRemember?`<div class="must-remember">نباید فراموش شود: <b>${escapeHtml(p.mustRemember)}</b></div>`:''}</div>`;
}

function renderAction(){
  ensureActionState();
  const route=$('#route-action');if(!route)return;
  const open=state.action.tasks.filter(t=>t.active!==false&&t.status==='open');
  const waiting=state.action.tasks.filter(t=>t.active!==false&&t.status==='waiting');
  const inbox=state.action.inbox.filter(i=>i.status!=='archived');
  route.innerHTML=`${pageHead('اقدام‌یار','برای تخلیه ذهن، کوچک‌کردن کار و شروع بدون فشار')}
    <div class="grid stats"><div class="stat"><small>کارهای باز</small><strong>${faNum(open.length)}</strong></div><div class="stat"><small>صندوق ذهن</small><strong>${faNum(inbox.length)}</strong></div><div class="stat"><small>منتظر دیگران</small><strong>${faNum(waiting.length)}</strong></div><div class="stat"><small>تمرکز این هفته</small><strong>${faNum(weeklyFocusMinutes())} دقیقه</strong></div></div>
    <div class="toolbar action-toolbar"><button class="btn primary" data-action-command="one">الان فقط یک کار بده</button><button class="btn secondary" data-action-command="capture">تخلیه ذهن</button><button class="btn ghost" data-action-command="new-task">کار جدید</button><button class="btn ghost" data-action-command="plan">سه تعهد امروز</button><button class="btn ghost" data-action-command="morning">مرور صبح</button><button class="btn ghost" data-action-command="evening">بستن روز</button></div>
    <div class="tabs">${[['tasks','کارها'],['inbox','صندوق ذهن'],['waiting','منتظر دیگران'],['reviews','مرورها'],['analysis','تحلیل ساده']].map(([k,l])=>`<button class="tab ${actionTab===k?'active':''}" data-action-tab="${k}">${l}</button>`).join('')}</div>
    ${actionTab==='tasks'?renderActionTasks():actionTab==='inbox'?renderMindInbox():actionTab==='waiting'?renderWaitingTasks():actionTab==='reviews'?renderReviews():renderActionAnalysis()}`;
}
function weeklyFocusMinutes(){const start=startOfWeek();return Math.round(state.action.focusSessions.filter(s=>new Date(s.startedAt)>=start).reduce((sum,s)=>sum+Number(s.actualMinutes||0),0));}
function actionTaskItem(t){
  const ref=refOf('action',t.id),slot=prioritySlotForRef(ref),done=t.status==='done';
  return `<div class="item action-task-item ${done?'done':''} ${t.active===false?'muted-item':''}"><div class="item-main"><div class="item-title">${escapeHtml(t.title)}</div><div class="item-sub">${actionTaskMeta(t)}</div>${t.firstStep?`<div class="next-step">قدم بعدی: ${escapeHtml(t.firstStep)}</div>`:''}${t.minimumStep?`<div class="minimum-step">نسخه کوچک: ${escapeHtml(t.minimumStep)}</div>`:''}${t.ifTrigger&&t.ifAction?`<div class="if-then">اگر ${escapeHtml(t.ifTrigger)}، آنگاه ${escapeHtml(t.ifAction)}</div>`:''}<div class="badges"><span class="badge ${t.priority==='critical'?'red':t.priority==='important'?'amber':'blue'}">${ACTION_PRIORITIES[t.priority]}</span><span class="badge">انرژی ${energyLabel(t.energy)}</span>${slot?`<span class="badge green">${slotLabel(slot)} امروز</span>`:''}${t.deferCount?`<span class="badge">${faNum(t.deferCount)} بار تعویق</span>`:''}</div></div><div class="item-actions">${!done?`<button class="mini-btn primary" data-start-task="${ref}">فقط شروعش کن</button><button class="mini-btn" data-plan-task="${ref}">اولویت امروز</button><button class="mini-btn" data-snooze="${ref}">بازبرنامه‌ریزی</button><button class="mini-btn" data-wait-task="${t.id}">منتظر دیگران</button><button class="mini-btn" data-complete="${ref}">انجام شد</button>`:''}<button class="mini-btn" data-edit-action-task="${t.id}">ویرایش</button><button class="mini-btn" data-delete-action-task="${t.id}">حذف</button></div></div>`;
}
function renderActionTasks(){
  const tasks=state.action.tasks.slice().sort((a,b)=>(a.status==='done')-(b.status==='done')||String(a.dueDate||'').localeCompare(String(b.dueDate||'')));
  return `<div class="card"><div class="card-head"><div><h2>کارهای اقدام‌یار</h2><p class="item-sub">کارها را با اولین قدم و نسخه کوچک تعریف کن.</p></div><button class="btn primary" data-action-command="new-task">افزودن کار</button></div><div class="item-list">${tasks.length?tasks.map(actionTaskItem).join(''):'<div class="empty">هنوز کاری ثبت نشده است.</div>'}</div></div>`;
}
function renderMindInbox(){
  const items=state.action.inbox.slice().reverse();
  return `<div class="card"><div class="card-head"><div><h2>صندوق تخلیه ذهن</h2><p class="item-sub">فعلاً فقط ثبت کن؛ دسته‌بندی را بعداً انجام بده.</p></div><button class="btn primary" data-action-command="capture">ثبت سریع</button></div><div class="item-list">${items.length?items.map(i=>`<div class="item ${i.status==='archived'?'muted-item':''}"><div class="item-main"><div class="item-title">${escapeHtml(i.text)}</div><div class="item-sub">${formatDateTime(i.createdAt)}${i.source==='focus'?' • ثبت‌شده وسط تمرکز':''}</div></div><div class="item-actions">${i.status!=='archived'?`<button class="mini-btn primary" data-inbox-process="task:${i.id}">تبدیل به کار</button><button class="mini-btn" data-inbox-process="reminder:${i.id}">یادآور</button><button class="mini-btn" data-inbox-process="shopping:${i.id}">خرید</button><button class="mini-btn" data-inbox-process="archive:${i.id}">بایگانی</button>`:''}<button class="mini-btn" data-inbox-process="delete:${i.id}">حذف</button></div></div>`).join(''):'<div class="empty">ذهنت فعلاً خالی است؛ عالیه.</div>'}</div></div>`;
}
function renderWaitingTasks(){
  const tasks=state.action.tasks.filter(t=>t.status==='waiting');
  return `<div class="card"><div class="card-head"><h2>منتظر دیگران</h2><button class="btn primary" data-action-command="new-task">ثبت مورد</button></div><div class="item-list">${tasks.length?tasks.map(t=>`<div class="item"><div><div class="item-title">${escapeHtml(t.title)}</div><div class="item-sub">منتظر: ${escapeHtml(t.waitingOn||'نامشخص')} • پیگیری ${t.followUpDate?formatJalaliISO(t.followUpDate):'بدون تاریخ'}</div></div><div class="item-actions"><button class="mini-btn primary" data-start-task="action:${t.id}">پیگیری الان</button><button class="mini-btn" data-edit-action-task="${t.id}">ویرایش</button><button class="mini-btn" data-release-wait="${t.id}">بازگشت به کارها</button><button class="mini-btn" data-complete="action:${t.id}">بسته شد</button></div></div>`).join(''):'<div class="empty">موردی در انتظار دیگران نیست.</div>'}</div></div>`;
}
function renderReviews(){
  const reviews=state.action.reviews.slice().reverse();
  return `<div class="grid layout-2"><div class="card"><div class="card-head"><h2>مرورهای ثبت‌شده</h2><div class="toolbar"><button class="mini-btn" data-action-command="morning">مرور صبح</button><button class="mini-btn" data-action-command="evening">بستن روز</button></div></div><div class="item-list">${reviews.length?reviews.map(r=>`<div class="item"><div><div class="item-title">${r.type==='morning'?'شروع روز':'پایان روز'} • ${formatJalaliISO(r.date)}</div><div class="item-sub">${escapeHtml(r.note||r.win||r.obstacle||'بدون یادداشت')}</div></div><span class="badge ${r.type==='morning'?'blue':'green'}">${r.type==='morning'?'صبح':'شب'}</span></div>`).join(''):'<div class="empty">هنوز مروری ثبت نشده است.</div>'}</div></div><div class="card"><h2 class="section-title">اصل مرور</h2><div class="notice">کار انجام‌نشده شکست نیست. در پایان روز درباره‌اش تصمیم بگیر: کوچک‌تر، جابه‌جا، حذف یا واگذار.</div></div></div>`;
}
function renderActionAnalysis(){
  const sessions=state.action.focusSessions;
  const complete=sessions.filter(s=>s.status==='completed');
  const estimated=complete.filter(s=>Number(s.estimateMinutes)>0&&Number(s.actualMinutes)>0);
  const accuracy=estimated.length?Math.round(estimated.reduce((sum,s)=>sum+Math.min(200,(s.actualMinutes/s.estimateMinutes)*100),0)/estimated.length):0;
  const reasonCounts={};state.action.deferLogs.forEach(l=>reasonCounts[l.reason]=(reasonCounts[l.reason]||0)+1);
  const topReasons=Object.entries(reasonCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const hours={};complete.forEach(s=>{const h=new Date(s.startedAt).getHours();hours[h]=(hours[h]||0)+1;});
  const bestHour=Object.entries(hours).sort((a,b)=>b[1]-a[1])[0]?.[0];
  const minimumCount=state.routines.reduce((sum,r)=>sum+(r.logs||[]).filter(l=>l.level==='minimum').length,0);
  return `<div class="grid"><div class="grid stats"><div class="stat"><small>جلسات تمرکز</small><strong>${faNum(sessions.length)}</strong></div><div class="stat"><small>دقایق تمرکز</small><strong>${faNum(Math.round(sessions.reduce((s,x)=>s+Number(x.actualMinutes||0),0)))}</strong></div><div class="stat"><small>نسبت زمان واقعی به تخمین</small><strong>${accuracy?`${faNum(accuracy)}٪`:'—'}</strong></div><div class="stat"><small>نسخه حداقلی روتین</small><strong>${faNum(minimumCount)}</strong></div></div><div class="grid layout-2"><div class="card"><h2 class="section-title">دلایل رایج تعویق</h2>${topReasons.length?`<div class="item-list">${topReasons.map(([r,n])=>`<div class="item"><span>${reasonLabel(r)}</span><b>${faNum(n)} بار</b></div>`).join('')}</div>`:'<div class="empty">هنوز داده‌ای ثبت نشده است.</div>'}</div><div class="card"><h2 class="section-title">الگوی شخصی</h2><div class="item-list"><div class="item"><span>بهترین ساعت شروع ثبت‌شده</span><b>${bestHour!==undefined?`${toPersianDigits(String(bestHour).padStart(2,'0'))}:۰۰`:'—'}</b></div><div class="item"><span>کارهای تکمیل‌شده اقدام‌یار</span><b>${faNum(state.action.tasks.filter(t=>t.status==='done').length)}</b></div><div class="item"><span>بازگشت بعد از تعویق</span><b>${faNum(state.action.tasks.filter(t=>t.status==='done'&&Number(t.deferCount)>0).length)}</b></div></div></div></div></div>`;
}

const baseRenderRoutineV5=renderRoutine;
renderRoutine=function(){
  ensureActionState();baseRenderRoutineV5();
  $$('#route-routine [data-routine-done]').forEach(btn=>{
    const id=btn.dataset.routineDone,r=state.routines.find(x=>x.id===id),item=btn.closest('.item');if(!r||!item)return;
    const sub=$('.item-sub',item);sub?.insertAdjacentHTML('afterend',`<div class="minimum-step">نسخه حداقلی: ${escapeHtml(r.minimumTitle)} • ${faNum(r.minimumDuration)} دقیقه</div>${r.ifTrigger&&r.ifAction?`<div class="if-then">اگر ${escapeHtml(r.ifTrigger)}، آنگاه ${escapeHtml(r.ifAction)}</div>`:''}`);
    btn.textContent='کامل انجام شد';
    btn.insertAdjacentHTML('afterend',`<button class="mini-btn" data-routine-minimum="${id}">حداقلی انجام شد</button><button class="mini-btn" data-start-task="routine:${id}">شروع تمرکز</button>`);
  });
};

const baseCompleteTaskRefV5=completeTaskRef;
completeTaskRef=function(ref){
  ensureActionState();
  const [module,id]=splitRef(ref);
  clearRefMeta(ref);
  if(module==='action'){
    mutate(()=>{const t=state.action.tasks.find(x=>x.id===id);if(!t)return;t.status='done';t.completedAt=nowISO();t.logs.push({type:'complete',at:nowISO()});},'کار انجام شد؛ مهم این است که برگشتی.');
    return;
  }
  baseCompleteTaskRefV5(ref);
};
const baseCompleteRoutineV5=completeRoutine;
completeRoutine=function(id){
  clearRefMeta(`routine:${id}`);
  mutate(()=>{const r=state.routines.find(x=>x.id===id);r.logs=r.logs||[];r.logs.push({id:uid(),date:todayISO(),doneAt:nowISO(),duration:r.duration,level:'full'});},'نسخه کامل روتین ثبت شد.');
};
function completeRoutineMinimum(id){
  clearRefMeta(`routine:${id}`);
  mutate(()=>{const r=state.routines.find(x=>x.id===id);r.logs=r.logs||[];r.logs.push({id:uid(),date:todayISO(),doneAt:nowISO(),duration:r.minimumDuration||5,level:'minimum'});},'نسخه حداقلی انجام شد؛ استمرار از کامل‌بودن مهم‌تر است.');
}

const baseSnoozeTaskRefV5=snoozeTaskRef;
snoozeTaskRef=function(ref){openRescheduleModal(ref);};
function openRescheduleModal(ref){
  const info=resolveTaskRef(ref);if(!info)return;
  const tomorrow=addDaysISO(todayISO(),1);
  const html=`${selectField('reason','دلیل جابه‌جایی',Object.entries(ACTION_REASONS), 'wrongTime')}${dualCalendarDateField('untilDate','تاریخ جدید',tomorrow,'jalali')}${field('untilTime','ساعت جدید','time',info.time||'18:00')}${textareaField('note','یادداشت کوتاه','')}`;
  openModal(`بازبرنامه‌ریزی «${info.title}»`,html,v=>{
    const [module,id]=splitRef(ref);
    state.action.snoozes[ref]={untilDate:v.untilDate,untilTime:v.untilTime,reason:v.reason,note:v.note,createdAt:nowISO()};
    state.action.deferLogs.push({id:uid(),ref,title:info.title,reason:v.reason,note:v.note,date:todayISO(),newDate:v.untilDate,createdAt:nowISO()});
    if(module==='action'){
      const t=state.action.tasks.find(x=>x.id===id);if(t){t.deferCount=Number(t.deferCount||0)+1;t.dueDate=v.untilDate;t.time=v.untilTime;t.logs.push({type:'defer',reason:v.reason,at:nowISO()});}
    }
  });
}

function openCaptureModal(prefill=''){
  openModal('تخلیه سریع ذهن',`${textareaField('text','هرچه در ذهنت هست بنویس',prefill)}<div class="notice full">فعلاً لازم نیست دسته‌بندی یا برنامه‌ریزی کنی؛ فقط از ذهنت خارجش کن.</div>`,v=>{const text=v.text.trim();if(!text)return;state.action.inbox.push({id:uid(),text,status:'open',source:'capture',createdAt:nowISO()});});
}
function openActionTaskModal(task=null,prefill='',onSaved=null){
  const t=task||{};
  const html=`${field('title','عنوان کار','text',t.title||prefill)}${textareaField('notes','توضیح',t.notes||'')}${dualCalendarDateField('dueDate','تاریخ اقدام',t.dueDate||todayISO(),'jalali')}${field('time','ساعت','time',t.time||'18:00')}${selectField('priority','اهمیت',[['critical','حیاتی'],['important','مهم'],['light','سبک']],t.priority||'important')}${selectField('energy','انرژی لازم',[['low','کم'],['medium','متوسط'],['high','زیاد']],t.energy||'medium')}${field('estimateMinutes','تخمین زمان به دقیقه','number',t.estimateMinutes||15)}${field('firstStep','اولین اقدام فیزیکی','text',t.firstStep||'')}${field('minimumStep','نسخه پنج‌دقیقه‌ای یا حداقلی','text',t.minimumStep||'')}${field('ifTrigger','اگر چه اتفاقی افتاد؟','text',t.ifTrigger||'')}${field('ifAction','آنگاه چه کاری انجام می‌دهم؟','text',t.ifAction||'')}${selectField('status','وضعیت',[['open','در دست انجام'],['waiting','منتظر دیگران'],['done','انجام‌شده']],t.status||'open')}${field('waitingOn','منتظر چه کسی؟','text',t.waitingOn||'')}${dualCalendarDateField('followUpDate','تاریخ پیگیری',t.followUpDate||t.dueDate||todayISO(),'jalali')}${activeField(t.active===false?'no':'yes')}`;
  openModal(task?'ویرایش کار':'کار جدید',html,v=>{
    const data={title:v.title.trim(),notes:v.notes.trim(),dueDate:v.dueDate,time:v.time,priority:v.priority,energy:v.energy,estimateMinutes:Number(v.estimateMinutes||15),firstStep:v.firstStep.trim(),minimumStep:v.minimumStep.trim(),ifTrigger:v.ifTrigger.trim(),ifAction:v.ifAction.trim(),status:v.status,waitingOn:v.waitingOn.trim(),followUpDate:v.followUpDate,active:v.active!=='no'};
    if(task)Object.assign(task,data,{updatedAt:nowISO()});else state.action.tasks.push({id:uid(),...data,actualMinutes:0,logs:[],deferCount:0,createdAt:nowISO()});if(typeof onSaved==='function')onSaved();
  });
}
function openRoutineModalEnhanced(r=null){
  const v=r||{};
  const html=`${field('title','عنوان روتین','text',v.title||'')}${selectField('kind','نوع',[['daily','روزانه'],['weeklyTarget','چند بار در هفته']],v.kind||'daily')}${field('target','تعداد هدف هفتگی','number',v.target||1)}${field('duration','مدت کامل به دقیقه','number',v.duration||30)}${field('minimumTitle','نسخه حداقلی','text',v.minimumTitle||'فقط پنج دقیقه شروع کن')}${field('minimumDuration','مدت نسخه حداقلی','number',v.minimumDuration||5)}${field('firstStep','اولین قدم','text',v.firstStep||'')}${field('ifTrigger','اگر چه اتفاقی افتاد؟','text',v.ifTrigger||'')}${field('ifAction','آنگاه چه می‌کنم؟','text',v.ifAction||'')}${field('time','ساعت یادآوری','time',v.time||'20:00')}${activeField(v.active===false?'no':'yes')}`;
  openModal(r?'ویرایش روتین':'افزودن روتین',html,values=>{
    const data={title:values.title.trim(),kind:values.kind,target:Number(values.target||1),duration:Number(values.duration||30),minimumTitle:values.minimumTitle.trim(),minimumDuration:Number(values.minimumDuration||5),firstStep:values.firstStep.trim(),ifTrigger:values.ifTrigger.trim(),ifAction:values.ifAction.trim(),time:values.time,active:values.active!=='no'};
    if(r)Object.assign(r,data);else state.routines.push({id:uid(),...data,logs:[]});
  });
}
function openWaitingModal(id){
  const t=state.action.tasks.find(x=>x.id===id);if(!t)return;
  openModal('انتقال به منتظر دیگران',`${field('waitingOn','منتظر چه کسی هستی؟','text',t.waitingOn||'')}${dualCalendarDateField('followUpDate','تاریخ پیگیری',t.followUpDate||addDaysISO(todayISO(),3),'jalali')}`,v=>{t.status='waiting';t.waitingOn=v.waitingOn.trim();t.followUpDate=v.followUpDate;});
}
function openPlanTaskModal(ref){
  const info=resolveTaskRef(ref);if(!info)return;
  const current=prioritySlotForRef(ref)||'important';
  openModal('جایگاه امروز',selectField('slot','این کار در کدام جایگاه باشد؟',[['critical','حیاتی'],['important','مهم'],['light','سبک'],['remove','حذف از سه تعهد']],current),v=>{const p=todayPlan();['critical','important','light'].forEach(k=>{if(p[k]===ref)p[k]='';});if(v.slot!=='remove')p[v.slot]=ref;});
}
function candidateOptions(selected=''){
  const options=[['','انتخاب نشده']];
  allCandidateRefs().forEach(ref=>{const i=resolveTaskRef(ref);if(i)options.push([ref,i.title]);});
  return options;
}
function openDailyPlanModal(){
  const p=todayPlan();
  const html=`${selectField('energy','انرژی امروز',[['low','کم'],['medium','متوسط'],['high','زیاد']],p.energy)}${selectField('critical','یک کار حیاتی',candidateOptions(),p.critical)}${selectField('important','یک کار مهم',candidateOptions(),p.important)}${selectField('light','یک کار سبک',candidateOptions(),p.light)}${field('mustRemember','چیزی که نباید فراموش شود','text',p.mustRemember||'')}`;
  openModal('سه تعهد امروز',html,v=>Object.assign(p,{energy:v.energy,critical:v.critical,important:v.important,light:v.light,mustRemember:v.mustRemember.trim()}));
}
function openMorningReview(){
  const p=todayPlan();
  const html=`${selectField('energy','انرژی امروز',[['low','کم'],['medium','متوسط'],['high','زیاد']],p.energy)}${selectField('critical','حیاتی',candidateOptions(),p.critical)}${selectField('important','مهم',candidateOptions(),p.important)}${selectField('light','سبک',candidateOptions(),p.light)}${field('mustRemember','امروز چه چیزی نباید فراموش شود؟','text',p.mustRemember||'')}${textareaField('note','یادداشت کوتاه صبح','')}`;
  openModal('مرور یک‌دقیقه‌ای صبح',html,v=>{Object.assign(p,{energy:v.energy,critical:v.critical,important:v.important,light:v.light,mustRemember:v.mustRemember.trim(),morningDone:true});state.action.reviews.push({id:uid(),type:'morning',date:todayISO(),energy:v.energy,note:v.note,createdAt:nowISO()});});
}
function openEveningReview(){
  const p=todayPlan();
  const tomorrow=addDaysISO(todayISO(),1);
  const html=`${textareaField('win','امروز چه چیزی خوب پیش رفت؟','')}${textareaField('obstacle','بزرگ‌ترین مانع چه بود؟','')}${selectField('carry','تعهدهای انجام‌نشده به فردا منتقل شوند؟',[['yes','بله، آگاهانه منتقل کن'],['no','خیر، فردا دوباره انتخاب می‌کنم']],'yes')}${field('firstStep','اولین قدم فردا','text','')}`;
  openModal('بستن سه‌دقیقه‌ای روز',html,v=>{p.eveningDone=true;state.action.reviews.push({id:uid(),type:'evening',date:todayISO(),win:v.win,obstacle:v.obstacle,firstStep:v.firstStep,createdAt:nowISO()});if(v.carry==='yes'){const next=todayPlan(tomorrow);['critical','important','light'].forEach(k=>{const ref=p[k];if(ref&&resolveTaskRef(ref))next[k]=ref;});next.mustRemember=v.firstStep.trim();}});
}
function toggleCrisisMode(){
  const p=todayPlan();
  if(p.crisis){mutate(()=>p.crisis=false,'حالت عادی برگشت.');return;}
  const refs=allCandidateRefs();
  const critical=refs.filter(r=>!['hygiene','routine'].includes(splitRef(r)[0])).sort((a,b)=>scoreRef(b)-scoreRef(a))[0]||refs[0]||'';
  const selfCare=refs.find(r=>splitRef(r)[0]==='hygiene')||refs.find(r=>splitRef(r)[0]==='routine')||'';
  const light=refs.filter(r=>r!==critical&&r!==selfCare).sort((a,b)=>(resolveTaskRef(a)?.estimate||99)-(resolveTaskRef(b)?.estimate||99))[0]||'';
  mutate(()=>Object.assign(p,{crisis:true,critical,important:selfCare,light}),'فقط سه مورد ضروری برای امروز نگه داشته شد.');
}

function prepareStart(ref){
  const info=resolveTaskRef(ref);if(!info){toast('این کار پیدا نشد.');return;}
  const html=`${selectField('barrier','الان چه چیزی مانع شروع است؟',[['none','فقط می‌خواهم شروع کنم'],...Object.entries(ACTION_REASONS)],'none')}${field('firstStep','فقط اولین قدم','text',info.firstStep)}${field('minutes','چند دقیقه فقط شروع کنیم؟','number',Math.min(info.estimate||10,state.action.settings.defaultFocusMinutes||10))}${field('estimate','فکر می‌کنی کل کار چند دقیقه طول می‌کشد؟','number',info.estimate||15)}`;
  openModal(`فقط شروع «${info.title}»`,html,v=>{
    if(v.barrier!=='none')state.action.deferLogs.push({id:uid(),ref,title:info.title,reason:v.barrier,date:todayISO(),kind:'startBarrier',createdAt:nowISO()});
    if(info.module==='action'){info.raw.firstStep=v.firstStep.trim();info.raw.estimateMinutes=Number(v.estimate||info.estimate);}
    setTimeout(()=>startFocus(ref,{firstStep:v.firstStep.trim(),minutes:Number(v.minutes||10),estimate:Number(v.estimate||info.estimate)}),120);
  });
}
function ensureFocusOverlay(){
  let el=$('#focusOverlay');if(el)return el;
  el=document.createElement('div');el.id='focusOverlay';el.className='focus-overlay hidden';document.body.appendChild(el);return el;
}
function startFocus(ref,opts={}){
  const info=resolveTaskRef(ref);if(!info)return;
  const minutes=Math.max(1,Number(opts.minutes||state.action.settings.defaultFocusMinutes||10));
  activeFocus={id:uid(),ref,title:info.title,firstStep:opts.firstStep||info.firstStep,minimumStep:info.minimumStep,startedAt:nowISO(),targetMinutes:minutes,estimateMinutes:Number(opts.estimate||info.estimate||minutes),parked:[]};
  const overlay=ensureFocusOverlay();overlay.classList.remove('hidden');renderFocusOverlay();
  clearInterval(focusTimer);focusTimer=setInterval(renderFocusOverlay,1000);
}
function elapsedFocusSeconds(){return activeFocus?Math.max(0,Math.floor((Date.now()-new Date(activeFocus.startedAt).getTime())/1000)):0;}
function renderFocusOverlay(){
  if(!activeFocus)return;
  const overlay=ensureFocusOverlay(),elapsed=elapsedFocusSeconds(),target=activeFocus.targetMinutes*60,remaining=Math.max(0,target-elapsed),progress=Math.min(100,elapsed/target*100);
  overlay.innerHTML=`<div class="focus-panel"><div class="focus-top"><span class="badge blue">حالت تمرکز تک‌کار</span><button class="icon-btn" data-focus-stop aria-label="بستن">×</button></div><div class="focus-content"><p class="focus-kicker">لازم نیست تمامش کنی؛ فقط همین قدم.</p><h1>${escapeHtml(activeFocus.title)}</h1><div class="focus-step">${escapeHtml(activeFocus.firstStep||'فقط شروع کن.')}</div><div class="focus-clock">${toPersianDigits(String(Math.floor(remaining/60)).padStart(2,'0'))}:${toPersianDigits(String(remaining%60).padStart(2,'0'))}</div><div class="progress"><span style="width:${progress}%"></span></div><p class="focus-support">فکر جدیدی آمد؟ ثبتش کن تا لازم نباشد آن را در ذهنت نگه داری.</p><div class="parking-input"><input data-focus-thought placeholder="فکر مزاحم یا کار دیگری که یادت آمد"><button class="btn secondary" data-focus-park>پارک کن</button></div><div class="focus-parked">${activeFocus.parked.map(x=>`<span>${escapeHtml(x)}</span>`).join('')}</div><div class="focus-actions"><button class="btn primary" data-focus-complete>انجام شد</button><button class="btn secondary" data-focus-minimum>برای امروز کافی بود</button><button class="btn ghost" data-focus-add5>۵ دقیقه دیگر</button><button class="btn ghost" data-focus-stop>توقف بدون شکست</button></div></div></div>`;
  $$('[data-focus-stop]',overlay).forEach(b=>b.onclick=()=>finishFocus(false,'stopped'));
  $('[data-focus-complete]',overlay).onclick=()=>finishFocus(true,'completed');
  $('[data-focus-minimum]',overlay).onclick=()=>finishFocus(false,'minimum');
  $('[data-focus-add5]',overlay).onclick=()=>{activeFocus.targetMinutes+=5;renderFocusOverlay();};
  $('[data-focus-park]',overlay).onclick=()=>parkFocusThought();
  $('[data-focus-thought]',overlay).onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();parkFocusThought();}};
  if(remaining===0&&!activeFocus.finishedSignal){activeFocus.finishedSignal=true;toast('زمان شروع تمام شد؛ ادامه یا توقف هر دو انتخاب معتبرند.');}
}
function parkFocusThought(){
  const input=$('[data-focus-thought]',$('#focusOverlay')),text=input?.value.trim();if(!text)return;
  activeFocus.parked.push(text);state.action.thoughtParking.push({id:uid(),text,focusId:activeFocus.id,createdAt:nowISO()});state.action.inbox.push({id:uid(),text,status:'open',source:'focus',createdAt:nowISO()});saveState();renderFocusOverlay();
}
function finishFocus(markDone,status){
  if(!activeFocus)return;
  clearInterval(focusTimer);const session={...activeFocus,status,endedAt:nowISO(),actualMinutes:Math.max(1,Math.round(elapsedFocusSeconds()/60))};
  state.action.focusSessions.push(session);
  const ref=activeFocus.ref;activeFocus=null;ensureFocusOverlay().classList.add('hidden');
  const info=resolveTaskRef(ref);
  if(info?.module==='action'){info.raw.actualMinutes=Number(info.raw.actualMinutes||0)+session.actualMinutes;info.raw.logs.push({type:'focus',minutes:session.actualMinutes,status,at:nowISO()});}
  saveState();
  if(markDone){completeTaskRef(ref);return;}
  if(status==='minimum'&&info?.module==='routine'){completeRoutineMinimum(info.id);return;}
  render();toast(status==='minimum'?'همین مقدار هم پیشرفت واقعی بود.':'جلسه ذخیره شد؛ توقف به معنی شکست نیست.');
}
function continueLastFocus(){
  const s=state.action.focusSessions.slice().reverse().find(x=>x.status!=='completed');if(s&&resolveTaskRef(s.ref))startFocus(s.ref,{firstStep:s.firstStep,minutes:5,estimate:s.estimateMinutes});else{const ref=chooseOneTask();ref?prepareStart(ref):toast('کار بازی برای شروع وجود ندارد.');}
}

function processInbox(command){
  const [kind,id]=splitRef(command),item=state.action.inbox.find(x=>x.id===id);if(!item)return;
  if(kind==='delete'){mutate(()=>state.action.inbox=state.action.inbox.filter(x=>x.id!==id),'حذف شد.');return;}
  if(kind==='archive'){mutate(()=>item.status='archived','بایگانی شد.');return;}
  if(kind==='shopping'){mutate(()=>{state.shopping.push({id:uid(),name:item.text,qty:'',price:0,done:false,createdAt:nowISO()});item.status='archived';},'به لیست خرید منتقل شد.');return;}
  if(kind==='task'){openActionTaskModal(null,item.text,()=>{item.status='archived';});return;}
  if(kind==='reminder'){
    const r={title:item.text,notes:'',date:todayISO(),time:new Date(Date.now()+3600000).toTimeString().slice(0,5),repeat:'once',calendarType:'jalali'};
    const html=`${field('title','عنوان یادآوری','text',r.title)}${field('time','ساعت یادآوری','time',r.time)}${dualCalendarDateField('date','تاریخ یادآوری',r.date,'jalali')}`;
    openModal('تبدیل به یادآور',html,v=>{state.customReminders.push({id:uid(),title:v.title,notes:'',date:v.date,time:v.time,repeat:'once',calendarType:v.calendarType,status:'active',active:true,history:[],createdAt:nowISO()});item.status='archived';});
  }
}

function handleActionCommand(command){
  if(command==='capture')openCaptureModal();
  else if(command==='new-task')openActionTaskModal();
  else if(command==='one'){const ref=chooseOneTask();ref?prepareStart(ref):toast('فعلاً کار بازی وجود ندارد.');}
  else if(command==='plan')openDailyPlanModal();
  else if(command==='morning')openMorningReview();
  else if(command==='evening')openEveningReview();
  else if(command==='crisis')toggleCrisisMode();
  else if(command==='focus-last')continueLastFocus();
}

function bindActionEvents(){
  $$('[data-action-command]').forEach(b=>b.onclick=()=>handleActionCommand(b.dataset.actionCommand));
  $$('[data-set-energy]').forEach(b=>b.onclick=()=>mutate(()=>todayPlan().energy=b.dataset.setEnergy,'سطح انرژی امروز ثبت شد.'));
  $$('[data-start-task]').forEach(b=>b.onclick=()=>prepareStart(b.dataset.startTask));
  $$('[data-plan-task]').forEach(b=>b.onclick=()=>openPlanTaskModal(b.dataset.planTask));
  $$('[data-action-tab]').forEach(b=>b.onclick=()=>{actionTab=b.dataset.actionTab;render();});
  $$('[data-edit-action-task]').forEach(b=>b.onclick=()=>openActionTaskModal(state.action.tasks.find(t=>t.id===b.dataset.editActionTask)));
  $$('[data-delete-action-task]').forEach(b=>b.onclick=()=>{if(confirm('این کار حذف شود؟'))mutate(()=>state.action.tasks=state.action.tasks.filter(t=>t.id!==b.dataset.deleteActionTask),'حذف شد.');});
  $$('[data-wait-task]').forEach(b=>b.onclick=()=>openWaitingModal(b.dataset.waitTask));
  $$('[data-release-wait]').forEach(b=>b.onclick=()=>mutate(()=>{const t=state.action.tasks.find(x=>x.id===b.dataset.releaseWait);t.status='open';t.waitingOn='';},'به فهرست کارها برگشت.'));
  $$('[data-inbox-process]').forEach(b=>b.onclick=()=>processInbox(b.dataset.inboxProcess));
  $$('[data-routine-minimum]').forEach(b=>b.onclick=()=>completeRoutineMinimum(b.dataset.routineMinimum));
  const addRoutine=$('[data-add="routine"]');if(addRoutine)addRoutine.onclick=()=>openRoutineModalEnhanced();
  $$('[data-edit^="routine:"]').forEach(b=>{const id=splitRef(b.dataset.edit)[1];b.onclick=()=>openRoutineModalEnhanced(state.routines.find(r=>r.id===id));});
}

const baseRenderV5=render;
render=function(){
  ensureActionState();baseRenderV5();renderAction();bindActionEvents();
};

const baseQuickActionV5=quickAction;
quickAction=function(type){if(type==='capture'||type==='task')handleActionCommand(type==='capture'?'capture':'new-task');else baseQuickActionV5(type);};

const baseResetAppV5=resetApp;
resetApp=function(){if(confirm('همه اطلاعات پاک و برنامه به حالت اولیه برگردد؟')){state=initialState();ensureActionState();saveState();render();toast('برنامه بازنشانی شد.');}};

// بازیابی بکاپ‌های قدیمی بدون action نیز ایمن می‌ماند.
$('#importInput')?.addEventListener('change',()=>setTimeout(()=>{ensureActionState();saveState();render();},80));

ensureActionState();
render();

function navigateFromHash(){const route=location.hash.replace(/^#/,'');if(route&&document.getElementById(`route-${route}`))navigate(route);}
window.addEventListener('hashchange',navigateFromHash);setTimeout(navigateFromHash,150);

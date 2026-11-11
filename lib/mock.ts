import schema from "./menu-fields.json";
const venues=[
 {id:2,name:"Q1 Demo · Центральный зал",timezone:"Asia/Almaty",permissions:{menu:true,analytics:true,translation:true},translation_limits:{jobs_per_month:20,chars_per_month:120000}},
 {id:3,name:"Q1 Demo · Терраса",timezone:"Asia/Almaty",permissions:{menu:true,analytics:true,translation:false},translation_limits:{}}
];
const list=(results:unknown[])=>({count:results.length,next:null,previous:null,results});
const menus=[
 {id:12,name:"Основное меню",currency:"KZT",source:"manual",is_active:true,is_qr_available:true,recommendation_scope:"isolated",sort_order:1,updated_at:"2026-11-06T12:10:00+05:00"},
 {id:13,name:"Бар и напитки",currency:"KZT",source:"manual",is_active:true,is_qr_available:true,recommendation_scope:"universal",sort_order:2,updated_at:"2026-11-06T12:10:00+05:00"},
 {id:14,name:"Завтраки",currency:"KZT",source:"iiko",is_active:true,is_qr_available:false,recommendation_scope:"isolated",sort_order:3,updated_at:"2026-11-06T12:10:00+05:00"},
];
const categories=[
 {id:30,menu:12,name_ru:"Горячие блюда",name_kk:"Ыстық тағамдар",name_en:"Hot dishes",is_active:true,sort_order:1,updated_at:"2026-11-06T12:10:00+05:00"},
 {id:31,menu:12,name_ru:"Салаты",name_kk:"Салаттар",name_en:"Salads",is_active:true,sort_order:2,updated_at:"2026-11-06T12:10:00+05:00"},
 {id:32,menu:13,name_ru:"Авторские напитки",name_kk:"",name_en:"Signature drinks",is_active:true,sort_order:1,updated_at:"2026-11-06T12:10:00+05:00"},
 {id:33,menu:14,name_ru:"Завтраки",name_kk:"",name_en:"",is_active:true,sort_order:1,updated_at:"2026-11-06T12:10:00+05:00"},
];
const items=[
 {id:101,menu:12,category:30,name_ru:"Паста с белыми грибами",name_kk:"Ақ саңырауқұлақты паста",name_en:"Porcini mushroom pasta",price:"4250.00",weight:"320.00",weight_unit:"г",kind:"dish",is_active:true,is_available:true,ai_priority:true,recommendation_enabled:true,updated_at:"2026-11-06T12:10:00+05:00"},
 {id:102,menu:12,category:30,name_ru:"Стейк из лосося",name_kk:"Албырт стейкі",name_en:"Salmon steak",price:"6850.00",weight:"260.00",weight_unit:"г",kind:"dish",is_active:true,is_available:true,ai_priority:false,recommendation_enabled:true,updated_at:"2026-11-06T12:10:00+05:00"},
 {id:103,menu:12,category:31,name_ru:"Цезарь с курицей",name_kk:"Тауық қосылған Цезарь",name_en:"Chicken Caesar",price:"3290.00",weight:"240.00",weight_unit:"г",kind:"dish",is_active:true,is_available:true,ai_priority:false,recommendation_enabled:true,updated_at:"2026-11-06T12:10:00+05:00"},
 {id:104,menu:13,category:32,name_ru:"Лавандовый лимонад",name_kk:"",name_en:"Lavender lemonade",price:"1890.00",weight:"400.00",weight_unit:"мл",kind:"drink",is_active:true,is_available:true,ai_priority:true,recommendation_enabled:true,updated_at:"2026-11-06T12:10:00+05:00"},
 {id:105,menu:13,category:32,name_ru:"Матча латте",name_kk:"Матча латте",name_en:"Matcha latte",price:"2100.00",weight:"350.00",weight_unit:"мл",kind:"drink",is_active:true,is_available:false,stop_reason:"Нет ингредиентов",ai_priority:false,recommendation_enabled:true,updated_at:"2026-11-06T12:10:00+05:00"},
 {id:106,menu:14,category:33,name_ru:"Сырники с ягодами",name_kk:"",name_en:"",price:"2790.00",weight:"220.00",weight_unit:"г",kind:"dish",is_active:true,is_available:true,updated_at:"2026-11-06T12:10:00+05:00"}
];
const modifierGroups=[{id:91,menu_item:101,name_ru:"Добавки",name_kk:"",name_en:"Add-ons",required:false,min_select:0,max_select:2,is_active:true,updated_at:"2026-11-06T12:10:00+05:00"}];
const modifiers=[{id:92,group:91,name_ru:"Дополнительный сыр",name_kk:"",name_en:"Extra cheese",price:"490.00",is_active:true,is_available:true,updated_at:"2026-11-06T12:10:00+05:00"}];
const synonyms=[{id:93,menu_item:101,lang:"ru",phrase:"паста с грибами",is_active:true,updated_at:"2026-11-06T12:10:00+05:00"}];
const resources:Record<string,Record<string,unknown>[]>={menus,categories,items,"modifier-groups":modifierGroups,modifiers,synonyms};
const names=["Айгерим О.","Данияр М.","Алина К.","Ерлан С.","Мадина Б."];
const basecalls=Array.from({length:35},(_,i)=>({
 id:530-i,created_at:new Date(Date.UTC(2026,10,9,10-i%11,42-i%40)).toISOString(),accepted_at:i%6===0?null:new Date(Date.UTC(2026,10,9,10-i%11,44-i%40)).toISOString(),closed_at:i%5===0?null:new Date(Date.UTC(2026,10,9,10-i%11,48-i%40)).toISOString(),
 status:["closed","arrived","closed","auto_closed","created","expired"][i%6],was_expired:i%7===0,expired_at:i%7===0?"2026-11-09T09:10:00Z":null,
 accepted_by:i%6===0?null:{id:11+i%5,full_name:names[i%5]},closed_by:null,shift_id:110+i%6,table_id:1+i%24,category_id:10,history_complete:i%9!==0,staff_at_creation:[],timing:{call_expire_minutes:5}
}));
const shifts=Array.from({length:15},(_,i)=>({id:110+i,staff_id:11+i%5,staff_name:names[i%5],opened_at:"2026-11-09T09:00:00+05:00",closed_at:i%5?"2026-11-09T19:00:00+05:00":null,closed_source:i%5?"manual":null,work_seconds:i%5?36000:14400,accepted_calls:6+i*2,closed_calls:5+i*2,accepted_expired_calls:i%3,acceptance_avg_seconds:78+i*9,acceptance_median_seconds:65+i*6,acceptance_p90_seconds:139+i*10,accepted_per_hour:1.6+i/12}));
const jobs=[{id:120,kind:"translation",status:"completed",processed:18,total:18,error:null,created_at:"2026-11-08T11:00:00+05:00"},{id:121,kind:"report_rebuild",status:"completed",processed:7,total:7,error:null,created_at:"2026-11-07T17:30:00+05:00"}];
const reports=Array.from({length:7},(_,i)=>({id:701+i,date:`2026-11-${String(8-i).padStart(2,"0")}`,calculation_version:7,calculated_at:"2026-11-09T09:20:00+05:00",payload:{summary:{calls_total:37+i}}}));
const iso=(d:Date)=>d.toISOString().slice(0,10);
const dateDays=(start:string,end:string)=>{let d=new Date(`${start}T00:00:00Z`);const endD=new Date(`${end}T00:00:00Z`);const dates:string[]=[];while(d<endD&&dates.length<366){dates.push(iso(d));d=new Date(d.getTime()+86400000)}return dates;};
function analytics(url:URL){
 const end=url.searchParams.get("end")||"2026-11-10";
 const start=url.searchParams.get("start")||"2026-11-03";
 const granularity=url.searchParams.get("granularity")||"day";
 const days=dateDays(start,end);
 const series=days.map((date,i)=>{
  const missing=days.length>3&&i===2;
  const partial=date==="2026-11-09";
  const n=18+(i*17)%33;
  const metrics=missing?null:{calls_total:n,calls_arrived:n-2,calls_closed:n-4,calls_auto_closed:2,calls_expired:3+(i%4),calls_open:4,reaction_avg_seconds:63+i%5*12,staff_hours:32+i%4*4,calls_per_staff_hour:1.1+i%4*.13,arrived_percent:95,expired_percent:7,closed_percent:92};
  return {date,state:missing?"missing":partial?"partial":"ready",metrics,guest:missing?null:{noncancelled_amount:String(68000+i*8100)+".00",orders:12+i%6},calculated_at:missing?null:"2026-11-09T10:00:00+05:00"};
 });
 const valid=series.filter(x=>x.metrics);
 const total=valid.reduce((s,x)=>s+(x.metrics?.calls_total||0),0);
 const arr=valid.reduce((s,x)=>s+(x.metrics?.calls_arrived||0),0);
 const cl=valid.reduce((s,x)=>s+(x.metrics?.calls_closed||0),0);
 const exp=valid.reduce((s,x)=>s+(x.metrics?.calls_expired||0),0);
 return {
  schema_version:1,calculation_version:7,venue:{id:2,name:venues[0].name,timezone:"Asia/Almaty"},period:{start,end_exclusive:end,granularity},
  freshness:{generated_at:"2026-11-09T10:10:00+05:00",oldest_calculated_at:"2026-11-09T09:50:00+05:00",newest_calculated_at:"2026-11-09T10:00:00+05:00",last_success_at:"2026-11-09T10:00:00+05:00",refresh_failed:false,expected_days:days.length,available_days:valid.length,missing_days:series.filter(x=>x.state==="missing").map(x=>x.date),complete:valid.length===days.length},
  summary:valid.length?{calls_total:total,calls_arrived:arr,calls_closed:cl,calls_auto_closed:valid.length*2,calls_expired:exp,calls_open:total-cl,reaction_avg_seconds:86,arrived_percent:total?100*arr/total:null,expired_percent:total?100*exp/total:null,closed_percent:total?100*cl/total:null,staff_hours:275,calls_per_staff_hour:total/275}:null,
  comparison:{comparable:false,summary:null,changes:{}},series,
  staff:names.map((name,i)=>({id:11+i,name,calls_arrived:32-i*4,calls_total:36-i*3,reaction_avg_seconds:69+i*19,staff_hours:52+i*3,calls_per_staff_hour:1.5-i*.15,calls_expired:i+1})),
  tables:Array.from({length:8},(_,i)=>({id:i+1,name:`Стол № ${String(i+1).padStart(2,"0")}`,hall_name:i>4?"Терраса":"Основной зал",calls_total:26-i*2,calls_arrived:24-i*2,calls_expired:i%3,reaction_avg_seconds:74+i*11})),
  categories:[{id:10,name:"Официант",calls_total:Math.round(total*.45)},{id:11,name:"Счёт",calls_total:Math.round(total*.3)},{id:20,name:"Помощь",calls_total:Math.round(total*.15)},{id:30,name:"Другое",calls_total:Math.round(total*.1)}],
  sources:[{id:"button",name:"QR-кнопка",calls_total:Math.round(total*.82)},{id:"app",name:"Приложение",calls_total:Math.round(total*.18)}],
  guest:{sessions:483,orders:147,noncancelled_orders:139,noncancelled_amount:"786540.00",average_order_amount:"5658.56",bill_requests:120,languages:[{lang:"ru",count:359},{lang:"kk",count:89},{lang:"en",count:35}],order_statuses:[],payment_preferences:[],products:[{id:101,name:"Паста с белыми грибами",quantity:34,amount:"144500.00"}]},
  complaints:{total:9,statuses:[],reasons:[{name:"Долгое ожидание",count:5},{name:"Качество блюда",count:4}]},orders:{opened:188,paid_closed_count:155,paid_closed_amount:"963200.00",statuses:[]},
  climate:{temperature:{count:128,avg:23.6,min:21.1,max:25.4},humidity:{count:128,avg:44.1,min:39,max:51}},
  quality:{invalid_reactions:1,open_shifts:2,calls_without_arrival_staff:3,overlapping_shift_seconds:0},notes:["Демо: все значения синтетические", "Автоматическое закрытие не подтверждает обслуживание"]
 };
}
export function mock(path:string[],url:URL,method:string){
 if (method!=="GET")return {status:403,body:{detail:"Демо-режим: записи в API отключены"}};
 if(path.length===1&&path[0]==="me")return {status:200,body:{id:1,email:"demo@mindtech.kz",full_name:"Демо-администратор",venues}};
 const [ven,vid,resource,id,action]=path;
 if(ven!=="venues"||!venues.some(x=>x.id===Number(vid)))return {status:404,body:{detail:"Заведение недоступно"}};
 if(resource==="schema")return {status:200,body:schema};
 if(resource==="analytics")return {status:200,body:analytics(url)};
 if(resource in resources){
  const all=resources[resource];
  if(id){const obj=all.find(x=>x.id===Number(id));return obj?{status:200,body:obj}:{status:404,body:{detail:"Не найдено"}};}
  let filtered=all;
  for(const filter of ["menu","category","menu_item","group"]){if(url.searchParams.has(filter))filtered=filtered.filter(x=>String(x[filter])===url.searchParams.get(filter));}
  return {status:200,body:list(filtered)};
 }
 if(resource==="calls"){
  if(id)return {status:200,body:basecalls.find(x=>x.id===Number(id))||null};
  let x=basecalls;
  if(url.searchParams.has("status")) x=x.filter(c=>c.status===url.searchParams.get("status"));
  return {status:200,body:list(x)};
 }
 if(resource==="shifts")return {status:200,body:id?shifts.find(x=>x.id===Number(id)):list(shifts)};
 if(resource==="jobs")return {status:200,body:id?jobs.find(x=>x.id===Number(id)):list(jobs)};
 if(resource==="reports")return {status:200,body:id?reports.find(x=>x.id===Number(id)):list(reports)};
 return {status:404,body:{detail:`Неизвестный путь ${resource}`}};
}

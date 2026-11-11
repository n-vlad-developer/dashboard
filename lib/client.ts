export type Rec=Record<string,any>;
export type Paginated={count:number;next:string|null;previous:string|null;results:Rec[]};
export class ApiError extends Error {constructor(public status:number,public detail:string){super(detail)}}
export async function api<T=any>(path:string, options:RequestInit={}){
 const response=await fetch(`/api/q1/${path.replace(/^\/+|\/+$/g,"")}`,{cache:"no-store",...options});
 const raw=await response.text();
 let value:any;try{value=raw?JSON.parse(raw):null}catch{value={detail:raw||"Неизвестная ошибка"}}
 if(!response.ok){
  const detail=typeof value?.detail==="string"?value.detail:JSON.stringify(value);
  throw new ApiError(response.status,detail||`Ошибка ${response.status}`);
 }
 return value as T;
}
export const formatInt=(x:any)=>typeof x==="number"&&Number.isFinite(x)?new Intl.NumberFormat("ru-RU").format(x):"—";
export const formatNum=(x:any,digits=1)=>typeof x==="number"&&Number.isFinite(x)?new Intl.NumberFormat("ru-RU",{maximumFractionDigits:digits}).format(x):"—";
export const formatTime=(s:any)=>typeof s==="number"&&Number.isFinite(s)?s>=3600?`${formatNum(s/3600)} ч`:s>=60?`${Math.floor(s/60)} мин ${Math.round(s%60)} с`:`${Math.round(s)} с`:"—";
export const formatHours=(x:any)=>typeof x==="number"?`${formatNum(x)} ч`:"—";
export const money=(x:any,currency?:string)=>x==null?"—":`${formatNum(Number(x),2)}${currency?` ${currency}`:""}`;
export function formatDateTime(x?:string|null){if(!x)return"—";const d=new Date(x);return Number.isNaN(d.getTime())?x:new Intl.DateTimeFormat("ru-RU",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(d)}
export function prettyError(e:unknown){return e instanceof Error?e.message:"Неизвестная ошибка";}
export function isoDay(date:Date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;}

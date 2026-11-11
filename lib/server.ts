import { NextResponse } from "next/server";
export const API_BASE=(process.env.Q1_API_BASE_URL||"https://api.mindtech.kz/api/dashboard").replace(/\/+$/g,"");
export const DEMO=process.env.NEXT_PUBLIC_DEMO_MODE==="true";
export function error(message:string,status=400){return NextResponse.json({detail:message},{status});}
export async function backend(path:string,init:RequestInit={}){
  const [pathname,query] = path.split("?",2);
  const upstreamUrl=`${API_BASE}/${pathname.replace(/^\/+|\/+$/g,"")}/${query?`?${query}`:""}`;
  return fetch(upstreamUrl,{cache:"no-store",...init});
}
export async function jsonUpstream(response:Response){
  const payload=await response.text();
  return new NextResponse(payload||null,{
    status:response.status,headers:{"Content-Type":response.headers.get("Content-Type")||"application/json; charset=utf-8", "Cache-Control":"no-store"}
  });
}

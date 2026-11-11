import { NextResponse } from "next/server";
import { DEMO, error } from "@/lib/server";
import { saveSession } from "@/lib/session";
export async function POST(){
  if(!DEMO)return error("Демо-режим отключён",403);
  try{await saveSession({demo:true});return NextResponse.json({ok:true});}
  catch{return error("Настройте SESSION_SECRET",500);}
}

import { NextResponse } from "next/server";
import { runInstagramDiscovery } from "@/features/discovery/instagram-ingestion";

export const dynamic="force-dynamic";
export const maxDuration=60;

function authorized(request:Request){
  const expected=process.env.CRON_SECRET?.trim();
  if(!expected)return false;
  const auth=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"").trim();
  return auth===expected||request.headers.get("x-cron-secret")===expected;
}

export async function GET(request:Request){
  if(!authorized(request))return NextResponse.json({error:"Unauthorized"},{status:401});
  try{const result=await runInstagramDiscovery(40);return NextResponse.json({ok:true,...result});}
  catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Discovery failed"},{status:500});}
}

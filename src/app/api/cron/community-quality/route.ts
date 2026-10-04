import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
export const runtime="nodejs";
export const dynamic="force-dynamic";
function authorized(request:Request){const secret=process.env.CRON_SECRET?.trim();return Boolean(secret&&request.headers.get("authorization")==="Bearer "+secret);}
export async function GET(request:Request){if(!authorized(request))return NextResponse.json({error:"Unauthorized"},{status:401});const{data,error}=await createAdminSupabaseClient().rpc("refresh_directory_quality",{p_limit:1000});if(error)return NextResponse.json({ok:false,error:"Quality batch failed."},{status:500});return NextResponse.json({ok:true,processed:Number(data??0),checkedAt:new Date().toISOString()});}

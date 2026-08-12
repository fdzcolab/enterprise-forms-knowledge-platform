import { NextResponse } from "next/server";
export async function GET(){return NextResponse.json({status:"ok",service:"enterprise-forms-knowledge-platform",time:new Date().toISOString()});}

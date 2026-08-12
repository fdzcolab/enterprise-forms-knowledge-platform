import Link from "next/link";
import { LayoutDashboard, FileText, ClipboardList, ShieldCheck, Search, Upload, Settings, LogOut, KeyRound } from "lucide-react";

const items = [
  ["/dashboard", LayoutDashboard, "داشبورد"],
  ["/forms", FileText, "فرم‌ها"],
  ["/submissions", ClipboardList, "ارسال‌های من"],
  ["/reviews", ShieldCheck, "بازبینی"],
  ["/knowledge", Search, "دانش و تحلیل"],
  ["/admin/imports", Upload, "ورود فرم"],
  ["/admin/api-clients", KeyRound, "API Clients"],
  ["/admin/settings", Settings, "تنظیمات"],
] as const;

export function AppNav() {
  return <aside className="sidebar">
    <div className="logo"><span>EFK</span><strong>فرم‌یار سازمانی</strong></div>
    <nav className="nav">{items.map(([href, Icon, label]) => <Link key={href} href={href}><Icon size={18}/>{label}</Link>)}</nav>
    <form action="/api/auth/sign-out" method="post" className="sidebar-bottom"><button className="link-button" type="submit"><LogOut size={18}/>خروج</button></form>
  </aside>;
}

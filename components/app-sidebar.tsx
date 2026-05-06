"use client";

import { useEffect, useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useNovels } from "@/lib/hooks";
import { useQTEngineStatus } from "@/lib/hooks/use-qt-engine";
import { supabase } from "@/lib/supabase";
import {
  BookOpenIcon,
  BrainIcon,
  DatabaseIcon,
  GitCompareArrowsIcon,
  GlobeIcon,
  HomeIcon,
  LibraryIcon,
  LoaderIcon,
  ServerIcon,
  ShieldCheckIcon,
  UploadIcon,
  SettingsIcon,
  ChevronRightIcon,
  LaptopIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const navConfig = [
  { title: "Trang chủ", href: "/dashboard", icon: HomeIcon },
  { title: "Thư viện", href: "/library", icon: LibraryIcon },
  { title: "Nhập sách", href: "/import", icon: UploadIcon },
  { title: "Convert Live", href: "/convert", icon: GitCompareArrowsIcon },
  { title: "Import Truyện", href: "/scraper", icon: GlobeIcon },
  { title: "Nhà cung cấp AI", href: "/settings/providers", icon: ServerIcon },
  {
    title: "Cài đặt AI",
    href: "/settings/ai-settings",
    icon: BrainIcon,
  },
  {
    title: "Tiện ích & Scripts",
    href: "/settings/scripts",
    icon: LaptopIcon,
  },
  {
    title: "Quản lý dữ liệu",
    href: "/settings/data",
    icon: DatabaseIcon,
  },
] as const;

export const miscNav = [
  { 
    title: "Nhóm Discord", 
    href: "https://discord.gg/ACrDEehgwt", 
    icon: (props: any) => (
      <svg
        role="img"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
      >
        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2758-3.68-.2758-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.3528 1.7354 4.637 2.7906 6.8742 3.486a.0797.0797 0 00.0856-.0277c.5252-.7172 1.0024-1.4847 1.4054-2.2965a.0776.0776 0 00-.0424-.1079c-.7507-.2853-1.4646-.6328-2.1466-1.0352a.0773.0773 0 01-.0079-.1278c.143-.1074.2861-.2188.4216-.3332a.0762.0762 0 01.0801-.0108c4.4371 2.0298 9.2488 2.0298 13.6332 0a.076.076 0 01.08-.0108c.1355.1144.2786.2258.4221.3332a.0772.0772 0 01-.0076.1278 12.6373 12.6373 0 01-2.1467 1.0352.0777.0777 0 00-.0422.1079c.4022.8117.8794 1.5793 1.4045 2.2965a.0797.0797 0 00.0856.0277c2.2452-.6954 4.5294-1.7506 6.8822-3.486a.0797.0797 0 00.0312-.0561c.5004-5.177-.8382-9.6739-3.5493-13.6604a.0612.0612 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.095 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.095 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
      </svg>
    )
  },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const novels = useNovels();
  const recentNovels = novels?.slice(0, 5);
  const isAdmin = true;

  const adminNavItem = {
    title: "Quản trị",
    href: "/admin",
    icon: ShieldCheckIcon,
  } as const;

  const mainNav = navConfig.filter(
    (item) => !item.href.startsWith("/settings"),
  );
  const settingsNav = navConfig.filter((item) =>
    item.href.startsWith("/settings"),
  );

  const [logoError, setLogoError] = useState(false);
  const sidebarNav = isAdmin ? [...mainNav, adminNavItem] : mainNav;

  return (
    <Sidebar collapsible="offcanvas" variant="sidebar">
      <SidebarHeader className="px-4 py-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 overflow-hidden mb-6"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary overflow-hidden relative">
            {!logoError ? (
              <Image
                src="/logo.png"
                alt="Logo"
                width={40}
                height={40}
                className="w-full h-full object-cover rounded-xl"
                onError={() => setLogoError(true)}
              />
            ) : (
              <BookOpenIcon className="size-6" />
            )}
          </div>
          <div className="flex flex-col gap-0.5 leading-none">
            <span className="font-heading text-lg font-bold tracking-tight text-sidebar-foreground">
              Thuyết Thư Các
            </span>
            <span className="text-xs text-sidebar-foreground/60">
              Kho tàng truyện chữ
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Điều hướng</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.title}
                    className="text-base font-medium py-2.5 h-auto"
                  >
                    <Link href={item.href}>
                      <item.icon className="size-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Tiểu thuyết gần đây</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {recentNovels && recentNovels.length > 0 ? (
                recentNovels.map((novel) => (
                  <SidebarMenuItem key={novel.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === `/novels/${novel.id}`}
                      tooltip={novel.title}
                      className="text-base font-medium py-2 h-auto"
                    >
                      <Link href={`/novels/${novel.id}`}>
                        <BookOpenIcon className="size-5" />
                        <span className="truncate">{novel.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              ) : (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="Chưa có tiểu thuyết"
                    className="text-sidebar-foreground/60"
                  >
                    <BookOpenIcon />
                    <span className="italic">Chưa có tiểu thuyết</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Cài đặt</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <Collapsible defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip="Cài đặt" className="text-base font-medium py-2.5 h-auto w-full justify-between">
                      <div className="flex items-center gap-2">
                        <SettingsIcon className="size-5" />
                        <span>Cài đặt hệ thống</span>
                      </div>
                      <ChevronRightIcon className="size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {settingsNav.map((item) => (
                        <SidebarMenuSubItem key={item.href}>
                          <SidebarMenuSubButton asChild isActive={pathname === item.href} className="text-sm py-2 h-auto">
                            <Link href={item.href}>
                              <item.icon className="size-4" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Cộng đồng</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {miscNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    className="text-base font-medium py-2.5 h-auto hover:text-blue-500 transition-colors"
                  >
                    <a href={item.href} target="_blank" rel="noreferrer">
                      <item.icon className="size-5" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <DictLoadingFooter />
      <SidebarRail />
    </Sidebar>
  );
}

const SOURCE_LABELS: Record<string, string> = {
  names: "Names",
  names2: "Names2",
  phienam: "Phiên âm",
  luatnhan: "Luật nhân",
  vietphrase: "VietPhrase",
};

function DictLoadingFooter() {
  const { phase, loadingSource, loadingPercent } = useQTEngineStatus();

  if (phase === "idle" || phase === "ready") return null;

  return (
    <SidebarFooter className="border-t px-3 py-2">
      {phase === "error" ? (
        <p className="text-xs text-red-500">Lỗi tải từ điển</p>
      ) : (
        <div className="space-y-1.5">
          {phase === "loading" && (
            <Progress value={loadingPercent} className="h-1.5" />
          )}
          <div className="flex items-center gap-2">
            <LoaderIcon className="size-3.5 shrink-0 animate-spin text-blue-500" />
            <span className="text-xs text-sidebar-foreground/70">
              {phase === "loading"
                ? `Đang tải ${SOURCE_LABELS[loadingSource] ?? loadingSource}...`
                : "Đang khởi tạo engine..."}
            </span>
            <span className="ml-auto text-xs text-sidebar-foreground/50">
              {phase === "loading" ? `${loadingPercent}%` : null}
            </span>
          </div>
        </div>
      )}
    </SidebarFooter>
  );
}

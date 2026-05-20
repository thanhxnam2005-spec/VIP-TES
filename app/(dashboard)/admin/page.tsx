"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { CrownIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import { revokeAllModelAssignmentsAction } from "@/app/actions/admin-models";

interface Profile {
  id: string;
  email: string;
  display_name: string;
  vip_until: string | null;
  admin_assigned_model: string | null;
  admin_model_quota: number;
}

export default function AdminPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [freeMode, setFreeMode] = useState(false);
  const [adminModelEnabled, setAdminModelEnabled] = useState(true);

  // Temporary state for the input field of each user
  const [vipDays, setVipDays] = useState<Record<string, string>>({});
  const [quotaInputs, setQuotaInputs] = useState<Record<string, string>>({});
  const [modelInputs, setModelInputs] = useState<Record<string, string>>({});
  const [availableModels, setAvailableModels] = useState<{id: string, name: string}[]>([]);

  // Admin Proxy Settings
  const [adminProxyUrl, setAdminProxyUrl] = useState("");
  const [adminProxyKey, setAdminProxyKey] = useState("");
  const [adminChatModel, setAdminChatModel] = useState("");
  const [scanning, setScanning] = useState(false);

  const handleScanModels = async () => {
    if (!adminProxyUrl || !adminProxyKey) {
      toast.error("Vui lòng nhập URL và API Key trước khi quét");
      return;
    }
    setScanning(true);
    const toastId = toast.loading("Đang quét model từ Proxy...");
    try {
      const res = await fetch("/api/admin/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proxyUrl: adminProxyUrl, proxyKey: adminProxyKey })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.data && Array.isArray(data.data)) {
          const models = data.data.map((m: any) => ({
            id: m.id,
            name: m.id.replace("gcli-", "").replace("假流式/", "[No Stream] ")
          }));
          setAvailableModels(models);
          toast.success(`Đã tìm thấy ${models.length} models`, { id: toastId });
        } else {
          toast.error("Không tìm thấy model nào", { id: toastId });
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || `Lỗi khi quét model: HTTP ${res.status}`, { id: toastId });
      }
    } catch (err) {
      toast.error("Lỗi kết nối", { id: toastId });
    }
    setScanning(false);
  };

  const loadData = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // We need the token to fetch models
    const { data: { session } } = await supabase.auth.getSession();
    
    const email = user?.email?.toLowerCase();
    const admins = [
      "nthanhnam2005@gmail.com",
      "thanhxnam2005@gmail.com"
    ];
    if (!admins.includes(email || "")) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    setIsAdmin(true);
    // Fetch dynamic models
    try {
      const res = await fetch("/api/admin/models");
      if (res.ok) {
        const data = await res.json();
        if (data && data.data && Array.isArray(data.data)) {
          const models = data.data.map((m: any) => ({
            id: m.id,
            name: m.id.replace("gcli-", "").replace("假流式/", "[No Stream] ")
          }));
          setAvailableModels(models);
        }
      } else {
        console.warn("Fetch models failed:", res.status);
      }
    } catch (err) {
      console.warn("Failed to load admin models", err);
    }

    // Load app settings
    const { data: allSettingsData } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["free_mode", "admin_proxy_url", "admin_proxy_key", "admin_model_enabled", "admin_chat_model"]);

    if (allSettingsData) {
      const freeModeSetting = allSettingsData.find(s => s.key === "free_mode");
      setFreeMode(freeModeSetting?.value === "true");

      const adminModelSetting = allSettingsData.find(s => s.key === "admin_model_enabled");
      setAdminModelEnabled(adminModelSetting?.value !== "false"); // default true

      const urlSetting = allSettingsData.find(s => s.key === "admin_proxy_url");
      if (urlSetting) setAdminProxyUrl(urlSetting.value);

      const keySetting = allSettingsData.find(s => s.key === "admin_proxy_key");
      if (keySetting) setAdminProxyKey(keySetting.value);

      const chatModelSetting = allSettingsData.find(s => s.key === "admin_chat_model");
      if (chatModelSetting) setAdminChatModel(chatModelSetting.value);
    }

    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("email");

    if (profilesError) {
      toast.error(profilesError.message);
    } else {
      setProfiles(profilesData as Profile[]);
    }



    setLoading(false);
  };

  const toggleFreeMode = async () => {
    const newValue = !freeMode ? "true" : "false";
    const toastId = toast.loading("Đang cập nhật chế độ Free Test...");
    const supabase = createClient();
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: "free_mode", value: newValue });

    if (error) {
      toast.error(`Lỗi: ${error.message}`, { id: toastId });
    } else {
      setFreeMode(!freeMode);
      toast.success(`Đã ${!freeMode ? "BẬT" : "TẮT"} chế độ Free Test cho toàn server!`, { id: toastId });
    }
  };

  const toggleAdminModel = async () => {
    const newValue = !adminModelEnabled ? "true" : "false";
    const toastId = toast.loading("Đang cập nhật trạng thái Admin Model...");
    const supabase = createClient();
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: "admin_model_enabled", value: newValue });

    if (error) {
      toast.error(`Lỗi: ${error.message}`, { id: toastId });
    } else {
      setAdminModelEnabled(!adminModelEnabled);
      toast.success(`Đã ${!adminModelEnabled ? "BẬT" : "TẮT"} cấp Model Admin cho toàn server!`, { id: toastId });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRevokeAllModels = async () => {
    if (!confirm("Bạn có chắc chắn muốn thu hồi tất cả model đã cấp cho người dùng không?")) return;
    const toastId = toast.loading("Đang thu hồi...");
    const res = await revokeAllModelAssignmentsAction();
    if (res.success) {
      toast.success("Đã thu hồi tất cả model!", { id: toastId });
      loadData();
    } else {
      toast.error(res.error || "Lỗi khi thu hồi", { id: toastId });
    }
  };

  const handleGrantVip = async (userId: string) => {
    const daysStr = vipDays[userId];
    const days = parseInt(daysStr, 10);
    if (isNaN(days) || days <= 0) {
      toast.error("Vui lòng nhập số ngày hợp lệ");
      return;
    }

    const newDate = new Date();
    newDate.setDate(newDate.getDate() + days);

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ vip_until: newDate.toISOString() })
      .eq("id", userId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Đã cấp VIP ${days} ngày cho người dùng!`);
      loadData();
    }
  };

  const handleGrantQuota = async (userId: string) => {
    const quotaStr = quotaInputs[userId];
    const quota = parseInt(quotaStr, 10);

    if (isNaN(quota) || quota < 0) {
      toast.error("Vui lòng nhập số lượt dịch hợp lệ");
      return;
    }

    const currentVnDate = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Ho_Chi_Minh"})).toDateString();

    const supabase = createClient();

    const { error } = await supabase
      .from("profiles")
      .update({ 
        admin_model_quota: quota,
        admin_daily_quota_limit: quota,
        admin_quota_last_reset: currentVnDate,
      })
      .eq("id", userId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Đã cập nhật lượt dịch thành ${quota} lượt!`);
      loadData();
    }
  };

  const handleRevokeVip = async (userId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ vip_until: null })
      .eq("id", userId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Đã thu hồi VIP");
      loadData();
    }
  };

  const handleAssignModel = async (userId: string) => {
    const modelId = modelInputs[userId];
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ admin_assigned_model: modelId || null })
      .eq("id", userId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(modelId ? `Đã cấp model "${modelId}" cho người dùng!` : "Đã thu hồi model!");
      loadData();
    }
  };

  const handleSaveAdminSettings = async () => {
    try {
      const { saveAdminSettingsAction } = await import("@/app/actions/admin-settings");
      const result = await saveAdminSettingsAction(adminProxyUrl, adminProxyKey);
      
      if (result.success) {
        toast.success("Đã lưu cấu hình Admin Proxy thành công!");
      } else {
        toast.error("Lỗi khi lưu cấu hình: " + result.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Đã xảy ra lỗi");
    }
  };

  if (loading) return <div className="p-8">Đang tải...</div>;

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-muted-foreground">Bạn không có quyền truy cập trang này.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CrownIcon className="w-6 h-6 text-yellow-500" />
          Khu vực Admin - Quản lý VIP
        </h1>
        <div className="flex items-center gap-3">
          <Button
            variant={freeMode ? "default" : "outline"}
            className={freeMode ? "bg-green-600 hover:bg-green-700 text-white" : "text-muted-foreground"}
            onClick={toggleFreeMode}
            title={freeMode ? "Chế độ Free đang BẬT. Ai cũng được xài VIP." : "Bật để cho phép mọi người xài VIP miễn phí"}
          >
            {freeMode ? "ĐANG BẬT FREE TEST TOÀN SERVER" : "Bật Free Test Toàn Server"}
          </Button>
          <Button
            variant={adminModelEnabled ? "default" : "outline"}
            className={adminModelEnabled ? "bg-blue-600 hover:bg-blue-700 text-white" : "text-muted-foreground"}
            onClick={toggleAdminModel}
            title={adminModelEnabled ? "Đang cấp phát model Admin cho người dùng." : "Bật để cấp model Admin"}
          >
            {adminModelEnabled ? "ĐANG CẤP MODEL ADMIN" : "Bật cấp Model Admin"}
          </Button>
            <div className="flex items-center gap-2">
              <Button onClick={loadData} variant="outline" size="sm">
                <RefreshCwIcon className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />
                Làm mới
              </Button>
              <Button onClick={handleRevokeAllModels} variant="destructive" size="sm">
                <Trash2Icon className="mr-2 size-4" />
                Thu hồi tất cả Model
              </Button>
            </div>
        </div>
      </div>

      <div className="bg-muted/30 border border-border p-6 rounded-lg space-y-4 mb-8">
        <h2 className="text-lg font-bold text-foreground">Cấu hình API Proxy Server (Dùng chung cho toàn hệ thống)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Base URL (API Endpoint)</label>
            <Input 
              value={adminProxyUrl} 
              onChange={e => setAdminProxyUrl(e.target.value)} 
              placeholder="VD: https://catiecli.sukaka.top/v1/chat/completions"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">API Key (Bearer Token)</label>
            <Input 
              value={adminProxyKey} 
              onChange={e => setAdminProxyKey(e.target.value)} 
              placeholder="Nhập API Key..."
              type="password"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Model cho Chat AI (toàn hệ thống)</label>
          <div className="flex items-center gap-2">
            {availableModels.length > 0 ? (
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={adminChatModel}
                onChange={e => setAdminChatModel(e.target.value)}
              >
                <option value="">-- Dùng cùng model dịch --</option>
                {availableModels.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            ) : (
              <Input
                value={adminChatModel}
                onChange={e => setAdminChatModel(e.target.value)}
                placeholder="Nhập model ID cho chat (bỏ trống = dùng model dịch)"
              />
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const supabase = createClient();
                const { error } = await supabase
                  .from("app_settings")
                  .upsert({ key: "admin_chat_model", value: adminChatModel });
                if (error) {
                  toast.error("Lỗi: " + error.message);
                } else {
                  toast.success(adminChatModel ? `Đã đặt model chat: ${adminChatModel}` : "Chat sẽ dùng model dịch");
                }
              }}
            >
              Lưu
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleScanModels}
              disabled={scanning}
            >
              {scanning ? <RefreshCwIcon className="mr-2 size-4 animate-spin" /> : <RefreshCwIcon className="mr-2 size-4" />}
              Quét Model
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Model này dùng cho AI Chat của toàn bộ người dùng. Bỏ trống = dùng model dịch đã cấp cho từng user.</p>
        </div>
        <Button onClick={handleSaveAdminSettings} variant="default">Lưu cấu hình Server</Button>
      </div>

      <div className="border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Tên nhân vật</TableHead>
              <TableHead>Trạng thái VIP</TableHead>
              <TableHead>Lượt Admin</TableHead>
              <TableHead>Model được cấp</TableHead>
              <TableHead>Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((p) => {
              const isVip = p.vip_until && new Date(p.vip_until) > new Date();
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.email}</TableCell>
                  <TableCell>{p.display_name || "Chưa có"}</TableCell>
                  <TableCell>
                    {isVip ? (
                      <span className="text-yellow-600 dark:text-yellow-500 font-medium">
                        VIP đến {new Date(p.vip_until!).toLocaleDateString("vi-VN")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Không có VIP</span>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold text-blue-600 dark:text-blue-400">
                    <div className="flex flex-col">
                      <span>{(p as any).admin_model_quota || 0} lượt</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          placeholder="Ngày VIP"
                          className="w-20 h-8 text-xs"
                          value={vipDays[p.id] || ""}
                          onChange={(e) => setVipDays({ ...vipDays, [p.id]: e.target.value })}
                        />
                        <Button
                          size="sm"
                          className="bg-yellow-500 hover:bg-yellow-600 text-white h-8 text-xs"
                          onClick={() => handleGrantVip(p.id)}
                        >
                          Cấp VIP
                        </Button>
                      </div>

                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            placeholder="Số lượt"
                            className="w-20 h-8 text-xs"
                            value={quotaInputs[p.id] || ""}
                            onChange={(e) => setQuotaInputs({ ...quotaInputs, [p.id]: e.target.value })}
                          />
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs flex-1"
                            onClick={() => handleGrantQuota(p.id)}
                          >
                            Cấp lượt dịch
                          </Button>
                        </div>
                      </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {availableModels.length > 0 ? (
                        <select
                          className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-w-[140px]"
                          value={modelInputs[p.id] ?? (p as any).admin_assigned_model ?? ""}
                          onChange={e => setModelInputs({ ...modelInputs, [p.id]: e.target.value })}
                        >
                          <option value="">-- Chưa cấp --</option>
                          {availableModels.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          placeholder="Model ID"
                          className="w-28 h-8 text-xs"
                          value={modelInputs[p.id] ?? (p as any).admin_assigned_model ?? ""}
                          onChange={e => setModelInputs({ ...modelInputs, [p.id]: e.target.value })}
                        />
                      )}
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white h-8 text-xs"
                        onClick={() => handleAssignModel(p.id)}
                      >
                        Cấp
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRevokeVip(p.id)}
                      disabled={!isVip}
                      className="h-8 text-xs"
                    >
                      Thu hồi VIP
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {profiles.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Chưa có người dùng nào.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>


    </div>
  );
}

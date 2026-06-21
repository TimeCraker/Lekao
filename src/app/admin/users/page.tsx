"use client";

import { useState, useEffect, useCallback } from "react";
import { EditIcon, ProfileIcon, CloseIcon, SearchIcon } from "@/components/icons";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  lekao_gift_coin: number;
  t_coin: number;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ role: "", name: "" });
  const [coinAmount, setCoinAmount] = useState(0);
  const [coinReason, setCoinReason] = useState("");
  const [resultMsg, setResultMsg] = useState("");

  const loadUsers = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    fetch(`/api/admin/users?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setUsers(d.users ?? []);
        setTotal(d.total ?? 0);
      });
  }, [page, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  function openEdit(u: User) {
    setEditUser(u);
    setEditForm({ role: u.role, name: u.name ?? "" });
    setCoinAmount(0);
    setCoinReason("");
    setResultMsg("");
  }

  async function saveEdit() {
    if (!editUser) return;
    const res = await fetch(`/api/admin/users/${editUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      setEditUser(null);
      loadUsers();
    } else {
      const d = await res.json();
      setResultMsg(d.error ?? "保存失败");
    }
  }

  async function adjustCoin() {
    if (!editUser || coinAmount === 0) return;
    const res = await fetch("/api/admin/tcoin/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: editUser.id,
        amount: coinAmount,
        reason: coinReason || "管理员调整",
      }),
    });
    const d = await res.json();
    if (res.ok) {
      setResultMsg(`成功！余额: ${d.balance} (赠送: ${d.lekao_gift_coin}, 充值: ${d.t_coin})`);
      loadUsers();
    } else {
      setResultMsg(d.error ?? "调整失败");
    }
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-ink">用户管理</h1>

      {/* Search */}
      <div className="relative max-w-sm">
        <input
          placeholder="搜索邮箱或姓名..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full rounded-lg border border-hairline bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-accent text-ink placeholder:text-ink-subtle"
        />
        <ProfileIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-hairline bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-xs text-ink-subtle">
              <th className="px-4 py-3 font-medium">邮箱</th>
              <th className="px-4 py-3 font-medium">姓名</th>
              <th className="px-4 py-3 font-medium">角色</th>
              <th className="px-4 py-3 font-medium">赠送币</th>
              <th className="px-4 py-3 font-medium">充值币</th>
              <th className="px-4 py-3 font-medium">注册时间</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className="border-b border-hairline hover:bg-canvas-alt/50"
              >
                <td className="px-4 py-2.5 text-ink">{u.email}</td>
                <td className="px-4 py-2.5 text-ink-muted">{u.name || "—"}</td>
                <td className="px-4 py-2.5">
                  {u.role === "admin" ? (
                    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700 font-medium">
                      Admin
                    </span>
                  ) : (
                    <span className="text-xs text-ink-subtle">User</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-ink">{u.lekao_gift_coin}</td>
                <td className="px-4 py-2.5 text-ink">{u.t_coin}</td>
                <td className="px-4 py-2.5 text-xs text-ink-subtle">
                  {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                </td>
                <td className="px-4 py-2.5">
                  <button
                    onClick={() => openEdit(u)}
                    className="rounded p-1.5 hover:bg-canvas-alt"
                  >
                    <EditIcon className="w-3.5 h-3.5 text-ink-muted" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded border border-hairline px-3 py-1 text-sm text-ink disabled:opacity-50"
          >
            上一页
          </button>
          <span className="text-sm text-ink-muted">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-hairline px-3 py-1 text-sm text-ink disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {editUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setEditUser(null)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-ink">编辑用户</h3>
              <button onClick={() => setEditUser(null)}>
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
            <p className="mb-4 text-sm text-ink-muted">{editUser.email}</p>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-ink-muted">姓名</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded border border-hairline bg-canvas px-3 py-1.5 text-sm text-ink"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-ink-muted">角色</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full rounded border border-hairline bg-canvas px-3 py-1.5 text-sm text-ink"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button
                onClick={saveEdit}
                className="w-full rounded-lg bg-accent-text py-2 text-sm font-medium text-white hover:bg-accent-hover"
              >
                保存修改
              </button>
            </div>

            <div className="mt-4 border-t border-hairline pt-4">
              <p className="mb-2 text-xs font-medium text-ink">
                T-Coin 调整（当前: {editUser.lekao_gift_coin + editUser.t_coin}，赠送: {editUser.lekao_gift_coin}，充值: {editUser.t_coin}）
              </p>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="数量（正加/负扣）"
                  value={coinAmount || ""}
                  onChange={(e) =>
                    setCoinAmount(parseInt(e.target.value) || 0)
                  }
                  className="flex-1 rounded border border-hairline bg-canvas px-3 py-1.5 text-sm text-ink"
                />
                <input
                  placeholder="原因"
                  value={coinReason}
                  onChange={(e) => setCoinReason(e.target.value)}
                  className="flex-1 rounded border border-hairline bg-canvas px-3 py-1.5 text-sm text-ink"
                />
              </div>
              <button
                onClick={adjustCoin}
                disabled={coinAmount === 0}
                className="mt-2 w-full rounded-lg bg-amber-500 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
              >
                调整 T-Coin
              </button>
              {resultMsg && (
                <p className="mt-2 text-sm text-ink">{resultMsg}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

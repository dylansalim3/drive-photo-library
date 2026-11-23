import { useState, useEffect, type FormEvent } from "react";
import {
  RiUserAddLine,
  RiUserLine,
  RiDeleteBinLine,
  RiLockPasswordLine,
} from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Chip } from "@/components/base/badges/chip";
import {
  changePassword,
  createAppUser,
  deleteAppUser,
  listAppUsers,
  type AppUser,
  type AuthStatus,
} from "@/api";

interface UserManagerSectionProps {
  status: AuthStatus;
}

export function UserManagerSection({ status }: UserManagerSectionProps) {
  const isAdmin = status.role === "admin";
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New User Form State
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin">("user");
  const [addingUser, setAddingUser] = useState(false);

  // Change Password Form State
  const [showChangePass, setShowChangePass] = useState(false);
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [changingPass, setChangingPass] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await listAppUsers();
      setUsers(data);
    } catch {
      // User might not have permission or offline
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword) return;
    setAddingUser(true);
    setError(null);
    setSuccess(null);
    try {
      await createAppUser(newUsername.trim(), newPassword, newRole);
      setSuccess(`User '${newUsername.trim()}' created successfully.`);
      setNewUsername("");
      setNewPassword("");
      setShowAddUser(false);
      void fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user.");
    } finally {
      setAddingUser(false);
    }
  };

  const handleDeleteUser = async (user: AppUser) => {
    if (!confirm(`Are you sure you want to delete user '${user.username}'?`)) return;
    setError(null);
    setSuccess(null);
    try {
      await deleteAppUser(user.id);
      setSuccess(`User '${user.username}' deleted.`);
      void fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user.");
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      setError("New passwords do not match.");
      return;
    }
    setChangingPass(true);
    setError(null);
    setSuccess(null);
    try {
      await changePassword(currentPass, newPass);
      setSuccess("Your password has been changed successfully.");
      setCurrentPass("");
      setNewPass("");
      setConfirmPass("");
      setShowChangePass(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setChangingPass(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-body-medium font-semibold text-text-primary">User Accounts</p>
          <p className="text-body-2-regular text-text-secondary">
            Manage who can log into this library
          </p>
        </div>
        {isAdmin && !showAddUser && (
          <Button
            variant="secondary"
            size="small"
            leadingIcon={RiUserAddLine}
            onClick={() => setShowAddUser(true)}
          >
            Add user
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-border-error-default bg-background-tertiary-error p-2.5 text-body-2-regular text-text-error-primary">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-lime-300 bg-lime-50 dark:border-lime-900/50 dark:bg-lime-950/30 p-2.5 text-body-2-regular text-lime-700 dark:text-lime-300">
          {success}
        </div>
      )}

      {/* Add User Inline Form */}
      {showAddUser && (
        <form
          onSubmit={handleCreateUser}
          className="flex flex-col gap-3 rounded-2xl border border-border-button-default bg-background-secondary-default p-3.5"
        >
          <p className="text-body-2-medium font-semibold text-text-primary">Add New Account</p>
          <Input
            label="Username"
            placeholder="e.g. alice"
            value={newUsername}
            onChange={setNewUsername}
            isRequired
          />
          <Input
            label="Password"
            type="password"
            placeholder="Min 6 characters"
            value={newPassword}
            onChange={setNewPassword}
            isRequired
          />
          <div className="flex items-center gap-2">
            <span className="text-caption-1-medium text-text-secondary">Role:</span>
            <button
              type="button"
              onClick={() => setNewRole("user")}
              className={`rounded-lg px-2.5 py-1 text-caption-1-medium transition-colors ${
                newRole === "user"
                  ? "bg-accent-500 text-white font-semibold"
                  : "bg-background-primary-default text-text-secondary hover:text-text-primary border border-border-button-default"
              }`}
            >
              Standard User
            </button>
            <button
              type="button"
              onClick={() => setNewRole("admin")}
              className={`rounded-lg px-2.5 py-1 text-caption-1-medium transition-colors ${
                newRole === "admin"
                  ? "bg-accent-500 text-white font-semibold"
                  : "bg-background-primary-default text-text-secondary hover:text-text-primary border border-border-button-default"
              }`}
            >
              Admin
            </button>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              size="small"
              onClick={() => {
                setShowAddUser(false);
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="small"
              type="submit"
              disabled={addingUser || !newUsername.trim() || newPassword.length < 6}
            >
              {addingUser ? "Adding…" : "Create account"}
            </Button>
          </div>
        </form>
      )}

      {/* Users List */}
      <div className="flex flex-col divide-y divide-border-button-default rounded-2xl border border-border-button-default bg-background-secondary-default overflow-hidden">
        {users.length === 0 && !loading ? (
          <div className="p-3 text-center text-caption-1-regular text-text-secondary">
            {status.username ? `${status.username} (active session)` : "1 user configured"}
          </div>
        ) : (
          users.map((user) => {
            const isSelf = user.username.toLowerCase() === (status.username ?? "").toLowerCase();
            return (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex size-7 items-center justify-center rounded-full bg-background-primary-default border border-border-button-default shrink-0 text-text-secondary">
                    <RiUserLine className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-body-2-medium font-medium text-text-primary">
                        {user.username}
                      </p>
                      {isSelf && (
                        <span className="text-[10px] rounded px-1.5 py-0.2 bg-background-primary-default text-text-tertiary border border-border-button-default font-normal">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-text-tertiary">
                      Joined {new Date(user.createdAt * 1000).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Chip variant="caption" color={user.role === "admin" ? "purple" : "soft"}>
                    {user.role}
                  </Chip>

                  {isAdmin && !isSelf && (
                    <Button
                      variant="ghost"
                      size="small"
                      iconOnly
                      leadingIcon={RiDeleteBinLine}
                      aria-label={`Delete ${user.username}`}
                      onClick={() => void handleDeleteUser(user)}
                    />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Change Password Collapsible */}
      <div className="pt-1">
        {!showChangePass ? (
          <Button
            variant="ghost"
            size="small"
            leadingIcon={RiLockPasswordLine}
            onClick={() => setShowChangePass(true)}
          >
            Change my password
          </Button>
        ) : (
          <form
            onSubmit={handleChangePassword}
            className="flex flex-col gap-2.5 rounded-2xl border border-border-button-default bg-background-secondary-default p-3.5"
          >
            <p className="text-body-2-medium font-semibold text-text-primary">Change Password</p>
            <Input
              label="Current password"
              type="password"
              value={currentPass}
              onChange={setCurrentPass}
              isRequired
            />
            <Input
              label="New password"
              type="password"
              placeholder="Min 6 characters"
              value={newPass}
              onChange={setNewPass}
              isRequired
            />
            <Input
              label="Confirm new password"
              type="password"
              value={confirmPass}
              onChange={setConfirmPass}
              isRequired
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="small"
                onClick={() => {
                  setShowChangePass(false);
                  setError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="small"
                type="submit"
                disabled={changingPass || !currentPass || newPass.length < 6 || newPass !== confirmPass}
              >
                {changingPass ? "Updating…" : "Update password"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

import { User } from "../../../types";
import { statusTone } from "../../../lib/statusTone";
import {
  TFBadge,
  TFCard,
  TFCardTitle,
  TFEmpty,
  TFSelect,
  TFTable,
  TFTBody,
  TFTd,
  TFTh,
  TFTHead,
  TFTr,
} from "../../../components/tf";

interface UsersProps {
  users: User[];
  onRoleChange: (id: number, role: string) => void;
}

const Users: React.FC<UsersProps> = ({ users, onRoleChange }) => {
  return (
    <TFCard padding="none">
      <div className="px-4 pt-4">
        <TFCardTitle className="mb-4">User Permissions</TFCardTitle>
      </div>
      <TFTable>
        <TFTHead>
          <TFTr>
            <TFTh>Email</TFTh>
            <TFTh>Name</TFTh>
            <TFTh>Role</TFTh>
            <TFTh>Joined</TFTh>
            <TFTh>Actions</TFTh>
          </TFTr>
        </TFTHead>
        <TFTBody>
          {users.map((u) => (
            <TFTr key={u.id}>
              <TFTd>{u.email}</TFTd>
              <TFTd>{u.name || "-"}</TFTd>
              <TFTd>
                <TFBadge tone={statusTone(u.role)}>{u.role}</TFBadge>
              </TFTd>
              <TFTd>{new Date(u.created_at).toLocaleDateString()}</TFTd>
              <TFTd>
                <TFSelect
                  size="sm"
                  className="max-w-[120px]"
                  value={u.role}
                  onChange={(e) => onRoleChange(u.id, e.target.value)}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </TFSelect>
              </TFTd>
            </TFTr>
          ))}
          {users.length === 0 && (
            <TFTr>
              <TFTd colSpan={5}>
                <TFEmpty>No users</TFEmpty>
              </TFTd>
            </TFTr>
          )}
        </TFTBody>
      </TFTable>
    </TFCard>
  );
};

export default Users;

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { gql } from "../../../api/client";
import { User } from "../../../types";
import { useAuth } from "../../../auth/AuthContext";
import UsersView from "./Users";

const USERS_QUERY = `query { users { id email name role created_at } }`;

const UPDATE_USER_ROLE_MUTATION = `
  mutation($id: Int!, $role: String!) {
    updateUserRole(id: $id, role: $role) { id role }
  }
`;

const UsersContainer: React.FC = () => {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => (await gql<{ users: User[] }>(USERS_QUERY)).users,
    enabled: isAdmin,
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) =>
      gql(UPDATE_USER_ROLE_MUTATION, { id, role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("Role updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isAdmin) return null;

  return (
    <UsersView
      users={users}
      onRoleChange={(id, role) => updateRole.mutate({ id, role })}
    />
  );
};

export default UsersContainer;

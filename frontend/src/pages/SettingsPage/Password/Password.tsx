import { Dispatch, SetStateAction } from "react";
import {
  TFButton,
  TFCard,
  TFCardTitle,
  TFField,
  TFInput,
} from "../../../components/tf";

interface PasswordProps {
  currentPassword: string;
  setCurrentPassword: Dispatch<SetStateAction<string>>;
  newPassword: string;
  setNewPassword: Dispatch<SetStateAction<string>>;
  confirmNewPassword: string;
  setConfirmNewPassword: Dispatch<SetStateAction<string>>;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
}

const Password: React.FC<PasswordProps> = ({
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmNewPassword,
  setConfirmNewPassword,
  onSubmit,
  submitting,
}) => {
  return (
    <form onSubmit={onSubmit}>
      <TFCard>
        <TFCardTitle className="mb-4">Change Password</TFCardTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TFField label="Current Password" required>
            <TFInput
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </TFField>
          <TFField label="New Password" required hint="Minimum 8 characters">
            <TFInput
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </TFField>
          <TFField label="Confirm New Password" required>
            <TFInput
              type="password"
              required
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
            />
          </TFField>
        </div>
        <TFButton
          type="submit"
          size="lg"
          className="mt-4"
          disabled={submitting}
        >
          {submitting ? "Saving…" : "Change Password"}
        </TFButton>
      </TFCard>
    </form>
  );
};

export default Password;

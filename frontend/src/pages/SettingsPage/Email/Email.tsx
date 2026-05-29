import { Dispatch, SetStateAction } from "react";
import {
  TFButton,
  TFCard,
  TFCardTitle,
  TFCheckbox,
  TFField,
  TFInput,
} from "../../../components/tf";

interface EmailProps {
  smtpHost: string;
  setSmtpHost: Dispatch<SetStateAction<string>>;
  smtpPort: string;
  setSmtpPort: Dispatch<SetStateAction<string>>;
  smtpUser: string;
  setSmtpUser: Dispatch<SetStateAction<string>>;
  smtpPass: string;
  setSmtpPass: Dispatch<SetStateAction<string>>;
  smtpSecure: boolean;
  setSmtpSecure: Dispatch<SetStateAction<boolean>>;
  smtpFromEmail: string;
  setSmtpFromEmail: Dispatch<SetStateAction<string>>;
  smtpFromName: string;
  setSmtpFromName: Dispatch<SetStateAction<string>>;
  onTestSmtp: () => void;
  testingSmtp: boolean;
}

const Email: React.FC<EmailProps> = ({
  smtpHost,
  setSmtpHost,
  smtpPort,
  setSmtpPort,
  smtpUser,
  setSmtpUser,
  smtpPass,
  setSmtpPass,
  smtpSecure,
  setSmtpSecure,
  smtpFromEmail,
  setSmtpFromEmail,
  smtpFromName,
  setSmtpFromName,
  onTestSmtp,
  testingSmtp,
}) => {
  return (
    <TFCard>
      <div className="flex items-center justify-between mb-4">
        <TFCardTitle>Email (SMTP)</TFCardTitle>
        <TFButton
          type="button"
          variant="link"
          size="sm"
          onClick={() => {
            setSmtpHost("smtp.gmail.com");
            setSmtpPort("587");
            setSmtpSecure(false);
          }}
        >
          Use Gmail
        </TFButton>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Configure SMTP to send invoices by email. For Gmail, use an App Password
        (Google Account &rarr; Security &rarr; App Passwords).
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TFField label="SMTP Host">
          <TFInput
            placeholder="smtp.gmail.com"
            value={smtpHost}
            onChange={(e) => setSmtpHost(e.target.value)}
          />
        </TFField>
        <TFField label="SMTP Port">
          <TFInput
            type="number"
            value={smtpPort}
            onChange={(e) => setSmtpPort(e.target.value)}
          />
        </TFField>
        <TFField label="Username / Email">
          <TFInput
            placeholder="you@gmail.com"
            value={smtpUser}
            onChange={(e) => setSmtpUser(e.target.value)}
          />
        </TFField>
        <TFField label="Password / App Password">
          <TFInput
            type="password"
            placeholder="App Password"
            value={smtpPass}
            onChange={(e) => setSmtpPass(e.target.value)}
          />
        </TFField>
        <TFField label="From Name">
          <TFInput
            placeholder="Your Name"
            value={smtpFromName}
            onChange={(e) => setSmtpFromName(e.target.value)}
          />
        </TFField>
        <TFField label="From Email">
          <TFInput
            placeholder="you@gmail.com"
            value={smtpFromEmail}
            onChange={(e) => setSmtpFromEmail(e.target.value)}
          />
        </TFField>
        <TFCheckbox
          id="smtp-secure"
          label="Use SSL/TLS (port 465). Uncheck for STARTTLS (port 587)."
          checked={smtpSecure}
          onChange={(e) => setSmtpSecure(e.target.checked)}
        />
      </div>
      <TFButton
        type="button"
        variant="secondary"
        onClick={onTestSmtp}
        disabled={testingSmtp}
        className="mt-4"
      >
        {testingSmtp ? "Testing..." : "Test Connection"}
      </TFButton>
    </TFCard>
  );
};

export default Email;

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { gql } from "../../../api/client";
import { UserSettings } from "../../../types";
import { TFButton } from "../../../components/tf";
import EmailView from "./Email";

const EMAIL_FIELDS =
  "id smtp_host smtp_port smtp_user smtp_pass smtp_secure smtp_from_email smtp_from_name";

const EMAIL_QUERY = `query { userSettings { ${EMAIL_FIELDS} } }`;

const UPDATE_EMAIL_MUTATION = `
  mutation($input: UpdateUserSettingsInput!) {
    updateUserSettings(input: $input) { ${EMAIL_FIELDS} }
  }
`;

const TEST_SMTP_MUTATION = `
  mutation($host: String!, $port: Int!, $user: String!, $pass: String!, $secure: Boolean!) {
    testSmtp(host: $host, port: $port, user: $user, pass: $pass, secure: $secure)
  }
`;

const EmailContainer: React.FC = () => {
  const qc = useQueryClient();
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [smtpFromEmail, setSmtpFromEmail] = useState("");
  const [smtpFromName, setSmtpFromName] = useState("");

  const { data: settings } = useQuery<UserSettings>({
    queryKey: ["userSettings"],
    queryFn: async () =>
      (await gql<{ userSettings: UserSettings }>(EMAIL_QUERY)).userSettings,
  });

  useEffect(() => {
    if (!settings) return;
    setSmtpHost(settings.smtp_host || "");
    setSmtpPort(String(settings.smtp_port || 587));
    setSmtpUser(settings.smtp_user || "");
    setSmtpPass(settings.smtp_pass || "");
    setSmtpSecure(settings.smtp_secure ?? true);
    setSmtpFromEmail(settings.smtp_from_email || "");
    setSmtpFromName(settings.smtp_from_name || "");
  }, [settings]);

  const save = useMutation({
    mutationFn: () =>
      gql(UPDATE_EMAIL_MUTATION, {
        input: {
          smtp_host: smtpHost || null,
          smtp_port: smtpPort ? Number(smtpPort) : null,
          smtp_user: smtpUser || null,
          smtp_pass: smtpPass || null,
          smtp_secure: smtpSecure,
          smtp_from_email: smtpFromEmail || null,
          smtp_from_name: smtpFromName || null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["userSettings"] });
      toast.success("Email settings saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const testSmtp = useMutation({
    mutationFn: async () => {
      await save.mutateAsync();
      return gql(TEST_SMTP_MUTATION, {
        host: smtpHost,
        port: Number(smtpPort) || 587,
        user: smtpUser,
        pass: smtpPass,
        secure: smtpSecure,
      });
    },
    onSuccess: () => toast.success("SMTP connection successful!"),
    onError: (e: Error) => toast.error(`SMTP test failed: ${e.message}`),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="space-y-6"
    >
      <EmailView
        smtpHost={smtpHost}
        setSmtpHost={setSmtpHost}
        smtpPort={smtpPort}
        setSmtpPort={setSmtpPort}
        smtpUser={smtpUser}
        setSmtpUser={setSmtpUser}
        smtpPass={smtpPass}
        setSmtpPass={setSmtpPass}
        smtpSecure={smtpSecure}
        setSmtpSecure={setSmtpSecure}
        smtpFromEmail={smtpFromEmail}
        setSmtpFromEmail={setSmtpFromEmail}
        smtpFromName={smtpFromName}
        setSmtpFromName={setSmtpFromName}
        onTestSmtp={() => testSmtp.mutate()}
        testingSmtp={testSmtp.isPending}
      />
      <TFButton type="submit" size="lg" disabled={save.isPending}>
        {save.isPending ? "Saving…" : "Save Settings"}
      </TFButton>
    </form>
  );
};

export default EmailContainer;

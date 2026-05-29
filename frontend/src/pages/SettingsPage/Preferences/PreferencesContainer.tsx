import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { gql } from "../../../api/client";
import { UserSettings } from "../../../types";
import { TFButton } from "../../../components/tf";
import PreferencesView from "./Preferences";

const PREFERENCES_FIELDS =
  "id show_earnings_on_timer resume_window_minutes default_due_days default_rate default_email_template";

const PREFERENCES_QUERY = `query { userSettings { ${PREFERENCES_FIELDS} } }`;

const UPDATE_PREFERENCES_MUTATION = `
  mutation($input: UpdateUserSettingsInput!) {
    updateUserSettings(input: $input) { ${PREFERENCES_FIELDS} }
  }
`;

const PreferencesContainer: React.FC = () => {
  const qc = useQueryClient();
  const [showEarningsOnTimer, setShowEarningsOnTimer] = useState(false);
  const [resumeWindowMinutes, setResumeWindowMinutes] = useState("60");
  const [defaultDueDays, setDefaultDueDays] = useState("30");
  const [defaultRate, setDefaultRate] = useState("");
  const [emailTemplate, setEmailTemplate] = useState("");

  const { data: settings } = useQuery<UserSettings>({
    queryKey: ["userSettings"],
    queryFn: async () =>
      (await gql<{ userSettings: UserSettings }>(PREFERENCES_QUERY))
        .userSettings,
  });

  useEffect(() => {
    if (!settings) return;
    setShowEarningsOnTimer(settings.show_earnings_on_timer ?? false);
    setResumeWindowMinutes(String(settings.resume_window_minutes ?? 60));
    setDefaultDueDays(String(settings.default_due_days ?? 30));
    setDefaultRate(
      settings.default_rate != null ? String(settings.default_rate) : "",
    );
    setEmailTemplate(settings.default_email_template || "");
  }, [settings]);

  const save = useMutation({
    mutationFn: () =>
      gql(UPDATE_PREFERENCES_MUTATION, {
        input: {
          show_earnings_on_timer: showEarningsOnTimer,
          resume_window_minutes: resumeWindowMinutes
            ? Math.max(1, Math.floor(Number(resumeWindowMinutes)))
            : 60,
          default_due_days: defaultDueDays ? Number(defaultDueDays) : null,
          default_rate: defaultRate.trim() === "" ? null : Number(defaultRate),
          default_email_template: emailTemplate || null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["userSettings"] });
      toast.success("Preferences saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="space-y-6"
    >
      <PreferencesView
        showEarningsOnTimer={showEarningsOnTimer}
        setShowEarningsOnTimer={setShowEarningsOnTimer}
        resumeWindowMinutes={resumeWindowMinutes}
        setResumeWindowMinutes={setResumeWindowMinutes}
        defaultDueDays={defaultDueDays}
        setDefaultDueDays={setDefaultDueDays}
        defaultRate={defaultRate}
        setDefaultRate={setDefaultRate}
        emailTemplate={emailTemplate}
        setEmailTemplate={setEmailTemplate}
      />
      <TFButton type="submit" size="lg" disabled={save.isPending}>
        {save.isPending ? "Saving…" : "Save Settings"}
      </TFButton>
    </form>
  );
};

export default PreferencesContainer;

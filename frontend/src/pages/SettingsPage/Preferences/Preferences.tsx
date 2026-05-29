import { Dispatch, SetStateAction } from "react";
import {
  TFCard,
  TFCardTitle,
  TFCheckbox,
  TFField,
  TFInput,
  TFTextarea,
} from "../../../components/tf";

interface PreferencesProps {
  showEarningsOnTimer: boolean;
  setShowEarningsOnTimer: Dispatch<SetStateAction<boolean>>;
  resumeWindowMinutes: string;
  setResumeWindowMinutes: Dispatch<SetStateAction<string>>;
  defaultDueDays: string;
  setDefaultDueDays: Dispatch<SetStateAction<string>>;
  defaultRate: string;
  setDefaultRate: Dispatch<SetStateAction<string>>;
  emailTemplate: string;
  setEmailTemplate: Dispatch<SetStateAction<string>>;
}

const Preferences: React.FC<PreferencesProps> = ({
  showEarningsOnTimer,
  setShowEarningsOnTimer,
  resumeWindowMinutes,
  setResumeWindowMinutes,
  defaultDueDays,
  setDefaultDueDays,
  defaultRate,
  setDefaultRate,
  emailTemplate,
  setEmailTemplate,
}) => {
  return (
    <div className="space-y-6">
      <TFCard>
        <TFCardTitle className="mb-4">Display</TFCardTitle>
        <TFCheckbox
          id="show-earnings"
          label="Show dollar amount on running timers"
          description="Display live earnings next to the elapsed time counter based on the project rate."
          checked={showEarningsOnTimer}
          onChange={(e) => setShowEarningsOnTimer(e.target.checked)}
        />
      </TFCard>

      <TFCard>
        <TFCardTitle className="mb-4">Timer</TFCardTitle>
        <TFField
          label="Resume Window (minutes)"
          hint="How long after a time entry ends you can still resume it. Default: 60 minutes."
          className="md:max-w-xs"
        >
          <TFInput
            type="number"
            min="1"
            step="1"
            value={resumeWindowMinutes}
            onChange={(e) => setResumeWindowMinutes(e.target.value)}
          />
        </TFField>
      </TFCard>

      <TFCard>
        <TFCardTitle className="mb-4">Invoice Defaults</TFCardTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TFField
            label="Default Due In (days)"
            hint='Set to 0 for "Upon Receipt"'
          >
            <TFInput
              type="number"
              min="0"
              value={defaultDueDays}
              onChange={(e) => setDefaultDueDays(e.target.value)}
            />
          </TFField>
          <TFField
            label="Default Hourly Rate"
            hint="Pre-fills new projects and acts as a fallback when a project's rate is 0. Leave blank to disable."
          >
            <TFInput
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 85.00"
              value={defaultRate}
              onChange={(e) => setDefaultRate(e.target.value)}
            />
          </TFField>
        </div>
        <div className="mt-4">
          <TFField
            label="Default Email Template"
            hint={
              <>
                Available variables:
                <br />
                {"{{client_name}}"}
                <br />
                {"{{client_first_name}}"}
                <br />
                {"{{client_last_name}}"}
                <br />
                {"{{invoice_number}}"}
                <br />
                {"{{total}}"}
                <br />
                {"{{due_date}}"}
                <br />
                {"{{your_name}}"}
              </>
            }
          >
            <TFTextarea
              className="h-40 font-mono"
              value={emailTemplate}
              onChange={(e) => setEmailTemplate(e.target.value)}
              placeholder={`Hi {{client_name}},\n\nPlease find attached invoice #{{invoice_number}} for \${{total}}.\n\nPayment is due {{due_date}}.\n\nThank you for your business!\n\n{{your_name}}`}
            />
          </TFField>
        </div>
      </TFCard>
    </div>
  );
};

export default Preferences;

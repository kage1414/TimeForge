import { Dispatch, SetStateAction } from "react";
import { TFCard, TFCardTitle, TFField, TFInput } from "../../../components/tf";

const SECTION_TITLES: Record<string, string> = {
  profile: "Profile",
  payment: "Payment",
  preferences: "Preferences",
  email: "Email",
  backups: "Backups",
  password: "Password",
  users: "Users",
};

function sectionFromPath(pathname: string): string {
  const m = pathname.match(/^\/settings(?:\/([^/]+))?\/?$/);
  const slug = m?.[1] || "profile";
  return SECTION_TITLES[slug] ? slug : "profile";
}

const SETTINGS_FIELDS =
  "id company first_name last_name email address1 address2 city state zip phone venmo cashapp paypal zelle default_due_days smtp_host smtp_port smtp_user smtp_pass smtp_secure smtp_from_email smtp_from_name default_email_template show_earnings_on_timer resume_window_minutes default_rate";

const SETTINGS_QUERY = `query { userSettings { ${SETTINGS_FIELDS} } }`;

const UPDATE_SETTINGS_MUTATION = `
  mutation($input: UpdateUserSettingsInput!) {
    updateUserSettings(input: $input) { ${SETTINGS_FIELDS} }
  }
`;

const USERS_QUERY = `query { users { id email name role created_at } }`;

interface ProfileProps {
  setCompany: Dispatch<SetStateAction<string>>;
  company?: string;
  setFirstName: Dispatch<SetStateAction<string>>;
  firstName?: string;
  setLastName: Dispatch<SetStateAction<string>>;
  lastName?: string;
  setEmail: Dispatch<SetStateAction<string>>;
  email?: string;
  setPhone: Dispatch<SetStateAction<string>>;
  phone?: string;
  setAddress1: Dispatch<SetStateAction<string>>;
  address1?: string;
  setAddress2: Dispatch<SetStateAction<string>>;
  address2?: string;
  setCity: Dispatch<SetStateAction<string>>;
  city?: string;
  setState: Dispatch<SetStateAction<string>>;
  state?: string;
  setZip: Dispatch<SetStateAction<string>>;
  zip?: string;
}

const Profile: React.FC<ProfileProps> = ({
  company,
  setCompany,
  setFirstName,
  firstName,
  setLastName,
  lastName,
  email,
  setEmail,
  phone,
  setPhone,
  address1,
  setAddress1,
  address2,
  setAddress2,
  city,
  setCity,
  state,
  setState,
  zip,
  setZip,
}) => {
  return (
    <TFCard>
      <TFCardTitle className="mb-4">Personal Details</TFCardTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TFField label="Company" className="md:col-span-2">
          <TFInput
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </TFField>
        <TFField label="First Name">
          <TFInput
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </TFField>
        <TFField label="Last Name">
          <TFInput
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </TFField>
        <TFField label="Email">
          <TFInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </TFField>
        <TFField label="Phone">
          <TFInput value={phone} onChange={(e) => setPhone(e.target.value)} />
        </TFField>
        <TFField label="Address Line 1">
          <TFInput
            value={address1}
            onChange={(e) => setAddress1(e.target.value)}
          />
        </TFField>
        <TFField label="Address Line 2">
          <TFInput
            value={address2}
            onChange={(e) => setAddress2(e.target.value)}
          />
        </TFField>
        <TFField label="City">
          <TFInput value={city} onChange={(e) => setCity(e.target.value)} />
        </TFField>
        <TFField label="State">
          <TFInput value={state} onChange={(e) => setState(e.target.value)} />
        </TFField>
        <TFField label="Zip">
          <TFInput value={zip} onChange={(e) => setZip(e.target.value)} />
        </TFField>
      </div>
    </TFCard>
  );
};

export default Profile;

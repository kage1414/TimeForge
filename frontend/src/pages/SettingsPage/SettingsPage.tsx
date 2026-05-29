import { useLocation } from "react-router-dom";
import BackupSettings from "../../components/BackupSettings";
import Profile from "./Profile";
import Payment from "./Payment";
import Preferences from "./Preferences";
import Email from "./Email";
import Password from "./Password";
import Users from "./Users";

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

export default function SettingsPage() {
  const location = useLocation();
  const section = sectionFromPath(location.pathname);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{SECTION_TITLES[section]}</h1>

      {section === "profile" && <Profile />}
      {section === "payment" && <Payment />}
      {section === "preferences" && <Preferences />}
      {section === "email" && <Email />}
      {section === "backups" && <BackupSettings />}
      {section === "password" && <Password />}
      {section === "users" && <Users />}
    </div>
  );
}

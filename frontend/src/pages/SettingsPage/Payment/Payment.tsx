import { Dispatch, SetStateAction } from "react";
import {
  TFCard,
  TFCardTitle,
  TFField,
  TFInput,
} from "../../../components/tf";

interface PaymentProps {
  venmo: string;
  setVenmo: Dispatch<SetStateAction<string>>;
  cashapp: string;
  setCashapp: Dispatch<SetStateAction<string>>;
  paypal: string;
  setPaypal: Dispatch<SetStateAction<string>>;
  zelle: string;
  setZelle: Dispatch<SetStateAction<string>>;
}

const Payment: React.FC<PaymentProps> = ({
  venmo,
  setVenmo,
  cashapp,
  setCashapp,
  paypal,
  setPaypal,
  zelle,
  setZelle,
}) => {
  return (
    <TFCard>
      <TFCardTitle className="mb-4">Online Payment Methods</TFCardTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TFField label="Venmo">
          <TFInput
            placeholder="@username"
            value={venmo}
            onChange={(e) => setVenmo(e.target.value)}
          />
        </TFField>
        <TFField label="Cash App">
          <TFInput
            placeholder="$cashtag"
            value={cashapp}
            onChange={(e) => setCashapp(e.target.value)}
          />
        </TFField>
        <TFField label="PayPal">
          <TFInput
            placeholder="email or username"
            value={paypal}
            onChange={(e) => setPaypal(e.target.value)}
          />
        </TFField>
        <TFField label="Zelle">
          <TFInput
            placeholder="email or phone"
            value={zelle}
            onChange={(e) => setZelle(e.target.value)}
          />
        </TFField>
      </div>
    </TFCard>
  );
};

export default Payment;

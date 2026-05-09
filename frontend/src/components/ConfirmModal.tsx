import { TFConfirm, type TFConfirmProps } from './tf';

// Backwards-compat shim so existing call sites keep working.
// New code should import { TFConfirm } from './tf' directly.
export type ConfirmModalProps = TFConfirmProps;

export default function ConfirmModal(props: TFConfirmProps) {
  return <TFConfirm {...props} />;
}

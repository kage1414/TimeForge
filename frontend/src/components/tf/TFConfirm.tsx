import { type ReactNode } from 'react';
import { TFButton, type TFButtonVariant } from './TFButton';
import {
  TFDialog,
  TFDialogBody,
  TFDialogContent,
  TFDialogFooter,
  TFDialogHeader,
  TFDialogTitle,
} from './TFDialog';

export interface TFConfirmProps {
  open: boolean;
  title?: ReactNode;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: TFButtonVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

export function TFConfirm({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
}: TFConfirmProps) {
  return (
    <TFDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <TFDialogContent size="sm">
        <TFDialogHeader>
          <TFDialogTitle>{title}</TFDialogTitle>
        </TFDialogHeader>
        <TFDialogBody>
          <p className="text-sm text-gray-600">{message}</p>
        </TFDialogBody>
        <TFDialogFooter>
          <TFButton variant="muted" onClick={onCancel}>
            {cancelLabel}
          </TFButton>
          <TFButton variant={confirmVariant} onClick={onConfirm}>
            {confirmLabel}
          </TFButton>
        </TFDialogFooter>
      </TFDialogContent>
    </TFDialog>
  );
}

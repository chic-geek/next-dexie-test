import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type AlertButtonProps = Omit<React.ComponentProps<typeof Button>, "onClick"> & {
  alertTitle?: string;
  alertDescription?: string;
  alertActionLabel?: string;
  onConfirm: () => void;
};

const AlertDialogDefaults = {
  alertDialogTitle: "Are you sure?",
  alertDialogDescription:
    "This action cannot be undone. This will permanently delete your account from our servers.",
  alertActionLabel: "Continue",
};

export function AlertButton({
  alertTitle = AlertDialogDefaults.alertDialogTitle,
  alertDescription = AlertDialogDefaults.alertDialogDescription,
  alertActionLabel = AlertDialogDefaults.alertActionLabel,
  onConfirm,
  children,
  ...buttonProps
}: AlertButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button {...buttonProps}>{children}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{alertTitle}</AlertDialogTitle>
          <AlertDialogDescription>{alertDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {alertActionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

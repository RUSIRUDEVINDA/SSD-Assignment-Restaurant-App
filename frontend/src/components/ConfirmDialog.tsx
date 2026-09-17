import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { CheckCircle2, XCircle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  successStyle?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title = "Are you sure?",
  description = "Please confirm your action.",
  confirmText = "Yes, Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
  successStyle = false,
}) => {
  return (
    <Dialog open={open} onOpenChange={v => !v && onCancel()}>
      <DialogContent className="max-w-md text-center p-4 rounded-xl shadow-2xl border-0">
        <DialogHeader>
          <div className="flex justify-center mb-1">
            {successStyle ? (
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            ) : (
              <XCircle className="h-10 w-10 text-yellow-400" />
            )}
          </div>
          <DialogTitle className="text-lg font-bold mb-1 text-gray-800">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="mb-4 text-gray-600 text-sm leading-relaxed">{description}</div>
        <DialogFooter className="flex flex-row gap-3 justify-center">
          <Button
            variant="ghost"
            onClick={onCancel}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100"
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            className={successStyle ? "bg-green-500 hover:bg-green-600 text-white font-bold px-5 py-2 rounded-lg" : "bg-yellow-400 hover:bg-yellow-500 text-white font-bold px-5 py-2 rounded-lg"}
            disabled={loading}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmDialog;
